package com.silvermuller.seals.modules.purchase.servicepo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoCalculator.PricingMethod;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoDtos.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service Purchase Order workflow. Uses only service_* tables and never touches
 * purchase_orders, goods_receipt_notes or inventory tables.
 *
 * Identity and roles come from the X-User-Name / X-User-Role request headers because the
 * ERP has no login system yet. Roles are enforced here, on the server.
 */
@Service
public class ServicePoService {

    public static class ServicePoException extends RuntimeException {
        private final HttpStatus status;

        public ServicePoException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() {
            return status;
        }
    }

    public record Actor(String name, String role) {}

    record ListFilter(String q, String vendorCode, String department, String category,
                      String status, String invoiceStatus, LocalDate fromDate, LocalDate toDate) {}

    record ScheduleRow(int seq, String type, LocalDate scheduledDate, LocalDate dueDate,
                       BigDecimal plannedQuantity, BigDecimal plannedAmount, String description) {}

    static final Set<String> ROLES = Set.of("CREATOR", "APPROVER", "ACCEPTOR", "FINANCE", "ADMIN");
    static final Set<String> SERVICE_FREQUENCIES = Set.of("ONE_TIME", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM");
    static final Set<String> RECURRENCE_FREQUENCIES = Set.of("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM");
    static final Set<String> SCHEDULE_TYPES = Set.of("ONE_TIME", "RECURRING", "MILESTONE");
    static final Set<String> TAXABILITY = Set.of("TAXABLE", "EXEMPT", "NIL_RATED", "NON_GST");
    static final Set<String> ACCEPTANCE_RESULTS = Set.of("ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED");
    static final Set<String> ATTACHMENT_TYPES = Set.of(
            "application/pdf", "image/png", "image/jpeg",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    static final Set<String> STATUSES = Set.of("DRAFT", "PENDING_APPROVAL", "APPROVED", "ISSUED", "PARTIALLY_FULFILLED",
            "FULFILLED", "ON_HOLD", "CANCELLED", "CLOSED");
    static final Map<String, String> SORT_COLUMNS = Map.of(
            "poNumber", "po_number", "poDate", "po_date", "vendorName", "vendor_name",
            "serviceCategory", "service_category", "totalAmount", "total_amount",
            "status", "status", "validityEnd", "validity_end", "createdAt", "created_at");

    static final long MAX_ATTACHMENT_BYTES = 5L * 1024 * 1024;
    static final int MAX_OCCURRENCES = 366;
    static final BigDecimal TOLERANCE = new BigDecimal("1.00");
    static final BigDecimal HUNDRED = new BigDecimal("100");

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final BigDecimal approvalLimit;

    public ServicePoService(JdbcTemplate jdbc, ObjectMapper objectMapper,
                            @Value("${service-po.approval-limit:}") String approvalLimitRaw) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.approvalLimit = (approvalLimitRaw == null || approvalLimitRaw.isBlank())
                ? null : new BigDecimal(approvalLimitRaw.trim());
    }

    // ------------------------------------------------------------------ identity & roles

    public Actor actor(String name, String role) {
        if (name == null || name.isBlank()) {
            throw new ServicePoException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        }
        String r = (role == null || role.isBlank()) ? "CREATOR" : role.trim().toUpperCase(Locale.ROOT);
        if (!ROLES.contains(r)) {
            throw new ServicePoException(HttpStatus.FORBIDDEN, "Unknown role: " + role);
        }
        return new Actor(name.trim(), r);
    }

    private static boolean has(Actor a, String... roles) {
        if ("ADMIN".equals(a.role())) return true;
        for (String r : roles) if (r.equals(a.role())) return true;
        return false;
    }

    private static void require(Actor a, String... roles) {
        if (!has(a, roles)) {
            throw new ServicePoException(HttpStatus.FORBIDDEN,
                    "Role " + a.role() + " is not allowed to perform this action.");
        }
    }

    // ------------------------------------------------------------------ meta

    public List<String> categories(boolean activeOnly) {
        String sql = "SELECT name FROM public.service_po_categories"
                + (activeOnly ? " WHERE is_active = TRUE" : "")
                + " ORDER BY sort_order, name";
        return jdbc.queryForList(sql, String.class);
    }

    public Map<String, Object> createCategory(CategoryRequest req, Actor actor) {
        require(actor, "APPROVER");
        String name = req.name() == null ? "" : req.name().trim();
        if (name.isEmpty() || name.length() > 150) {
            throw bad("Category name is required (max 150 characters).");
        }
        Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.service_po_categories WHERE parent_group = 'Service' AND LOWER(name) = LOWER(?)",
                Integer.class, name);
        if (exists != null && exists > 0) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Category already exists: " + name);
        }
        jdbc.update("INSERT INTO public.service_po_categories (parent_group, name, sort_order) "
                + "VALUES ('Service', ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.service_po_categories))", name);
        return Map.of("name", name, "parentGroup", "Service");
    }

    public List<Map<String, Object>> sacCodes() {
        return jdbc.queryForList(
                "SELECT hsn_sac_code AS code, description, gst_rate AS \"gstRate\", cgst_rate AS \"cgstRate\", "
                        + "sgst_rate AS \"sgstRate\", igst_rate AS \"igstRate\", cess_rate AS \"cessRate\" "
                        + "FROM public.hsn_tax_master WHERE type = 'SERVICE' AND is_active = TRUE ORDER BY hsn_sac_code");
    }

    // ------------------------------------------------------------------ create / update

    @Transactional
    public Map<String, Object> create(ServicePoRequest req, Actor actor) {
        require(actor, "CREATOR", "APPROVER");
        Map<String, Object> cols = prepareHeader(req, actor);
        String poNumber = nextPoNumber();
        cols.put("po_number", poNumber);
        cols.put("status", "DRAFT");
        cols.put("version", 0);
        cols.put("created_by", actor.name());
        cols.put("modified_by", actor.name());
        long id = insertRow("public.service_purchase_orders", cols);
        history(id, "CREATED", null, "DRAFT", actor, null);
        return details(id, actor);
    }

    @Transactional
    public Map<String, Object> update(long id, ServicePoRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        String status = str(row, "status");
        if (!"DRAFT".equals(status)) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "Only draft Service POs can be edited. Use Amendment for " + status + " POs.");
        }
        requireCreatorOrApprover(actor, row);
        if (req.version() == null || !req.version().equals(row.get("version"))) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "This PO was changed by someone else. Reload and try again.");
        }
        Map<String, Object> cols = prepareHeader(req, actor);
        validateSchedulesAgainstValue(id, (BigDecimal) cols.get("taxable_amount"));
        cols.put("version", ((Integer) row.get("version")) + 1);
        cols.put("modified_by", actor.name());
        cols.put("modified_at", Timestamp.from(java.time.Instant.now()));
        updateRow("public.service_purchase_orders", id, cols);
        history(id, "EDITED", "DRAFT", "DRAFT", actor, null);
        return details(id, actor);
    }

    // ------------------------------------------------------------------ workflow

    @Transactional
    public Map<String, Object> submit(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        requireCreatorOrApprover(actor, row);
        transition(row, "DRAFT", "PENDING_APPROVAL", "SUBMITTED", actor, req.comments());
        return finish(id, row, "PENDING_APPROVAL", "SUBMITTED", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> approve(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        if (!"ADMIN".equals(actor.role()) && actor.name().equalsIgnoreCase(str(row, "created_by"))) {
            throw new ServicePoException(HttpStatus.FORBIDDEN, "The creator cannot approve their own Service PO.");
        }
        BigDecimal total = (BigDecimal) row.get("total_amount");
        if (approvalLimit != null && !"ADMIN".equals(actor.role()) && total.compareTo(approvalLimit) > 0) {
            throw new ServicePoException(HttpStatus.FORBIDDEN,
                    "Total " + total + " exceeds the approval limit " + approvalLimit + " for role " + actor.role() + ".");
        }
        transition(row, "PENDING_APPROVAL", "APPROVED", "APPROVE", actor, req.comments());
        return finish(id, row, "APPROVED", "APPROVE", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> reject(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        requireReason(req.comments(), "Rejection reason");
        transition(row, "PENDING_APPROVAL", "DRAFT", "REJECT", actor, req.comments());
        return finish(id, row, "DRAFT", "REJECT", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> issue(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        transition(row, "APPROVED", "ISSUED", "ISSUED", actor, req.comments());
        ensureNotExpired(row);
        return finish(id, row, "ISSUED", "ISSUED", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> hold(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        requireReason(req.comments(), "Hold reason");
        String from = str(row, "status");
        if (!Set.of("APPROVED", "ISSUED", "PARTIALLY_FULFILLED").contains(from)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Cannot put a " + from + " PO on hold.");
        }
        return finish(id, row, "ON_HOLD", "HOLD", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> release(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        if (!"ON_HOLD".equals(str(row, "status"))) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Only ON_HOLD POs can be released.");
        }
        List<String> prev = jdbc.queryForList(
                "SELECT from_status FROM public.service_po_status_history "
                        + "WHERE service_po_id = ? AND to_status = 'ON_HOLD' ORDER BY id DESC LIMIT 1",
                String.class, id);
        String back = prev.isEmpty() || prev.get(0) == null ? "ISSUED" : prev.get(0);
        return finish(id, row, back, "RELEASE", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> close(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        requireReason(req.comments(), "Closure reason");
        String from = str(row, "status");
        if (!Set.of("ISSUED", "PARTIALLY_FULFILLED", "FULFILLED").contains(from)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Cannot close a " + from + " PO.");
        }
        return finish(id, row, "CLOSED", "CLOSE", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> cancel(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        requireReason(req.comments(), "Cancellation reason");
        String from = str(row, "status");
        if (!Set.of("DRAFT", "PENDING_APPROVAL", "APPROVED", "ISSUED", "ON_HOLD").contains(from)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Cannot cancel a " + from + " PO.");
        }
        if ("DRAFT".equals(from) || "PENDING_APPROVAL".equals(from)) {
            requireCreatorOrApprover(actor, row);
        } else {
            require(actor, "APPROVER");
        }
        if (((BigDecimal) row.get("accepted_amount")).signum() > 0) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "Service has already been accepted against this PO. Close it instead of cancelling.");
        }
        jdbc.update("UPDATE public.service_purchase_orders SET cancel_reason = ? WHERE id = ?", req.comments(), id);
        return finish(id, row, "CANCELLED", "CANCEL", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> extendValidity(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        requireReason(req.comments(), "Extension reason");
        String status = str(row, "status");
        if (Set.of("DRAFT", "CANCELLED", "CLOSED").contains(status)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Validity cannot be extended for a " + status + " PO.");
        }
        LocalDate newEnd = req.newValidityEnd();
        if (newEnd == null) throw bad("New validity end date is required.");
        LocalDate oldEnd = ld(row.get("validity_end"));
        if (!newEnd.isAfter(oldEnd)) {
            throw bad("New validity end must be after the current end date " + oldEnd + ".");
        }
        if (newEnd.isBefore(LocalDate.now(zone()))) {
            throw bad("New validity end cannot be in the past.");
        }
        jdbc.update("UPDATE public.service_purchase_orders SET validity_end = ?, modified_by = ?, modified_at = NOW(), "
                + "version = version + 1 WHERE id = ?", newEnd, actor.name(), id);
        jdbc.update("INSERT INTO public.service_po_validity_history (service_po_id, old_validity_end, new_validity_end, reason, changed_by) "
                + "VALUES (?,?,?,?,?)", id, oldEnd, newEnd, req.comments(), actor.name());
        history(id, "VALIDITY_EXTENDED", status, status, actor, req.comments());
        return details(id, actor);
    }

    /** Controlled amendment for approved POs: re-prices the PO, records a revision with before/after values. */
    @Transactional
    public Map<String, Object> amend(long id, ServicePoRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        String status = str(row, "status");
        if (!Set.of("APPROVED", "ISSUED", "PARTIALLY_FULFILLED").contains(status)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Only approved or issued POs can be amended. Current status: " + status);
        }
        requireReason(req.reason(), "Amendment reason");
        Map<String, Object> cols = prepareHeader(req, actor);
        BigDecimal newTaxable = (BigDecimal) cols.get("taxable_amount");
        BigDecimal accepted = (BigDecimal) row.get("accepted_amount");
        BigDecimal invoiced = (BigDecimal) row.get("invoiced_amount");
        if (newTaxable.compareTo(accepted) < 0 || newTaxable.compareTo(invoiced) < 0) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "Amended value " + newTaxable + " cannot be below already accepted (" + accepted
                            + ") or invoiced (" + invoiced + ") amounts.");
        }
        validateSchedulesAgainstValue(id, newTaxable);

        Map<String, Object> changes = new LinkedHashMap<>();
        for (String key : List.of("pricing_method", "quantity", "rate", "basic_amount", "discount_amount",
                "additional_charges", "taxable_amount", "gst_rate", "tax_amount", "total_amount", "validity_end",
                "service_completion_date", "sac_code", "vendor_code")) {
            Object oldV = row.get(key);
            Object newV = cols.get(key);
            if (!Objects.equals(normalize(oldV), normalize(newV))) {
                changes.put(key, Map.of("old", String.valueOf(normalize(oldV)), "new", String.valueOf(normalize(newV))));
            }
        }
        if (changes.isEmpty()) {
            throw bad("No commercial or validity change detected in the amendment.");
        }
        int nextRev = jdbc.queryForObject(
                "SELECT COALESCE(MAX(revision_number), 0) + 1 FROM public.service_po_revisions WHERE service_po_id = ?",
                Integer.class, id);
        try {
            jdbc.update("INSERT INTO public.service_po_revisions (service_po_id, revision_number, reason, changes_json, changed_by) "
                            + "VALUES (?,?,?,?,?)", id, nextRev, req.reason(), objectMapper.writeValueAsString(changes), actor.name());
        } catch (JsonProcessingException e) {
            throw new ServicePoException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not record revision: " + e.getMessage());
        }
        cols.put("version", ((Integer) row.get("version")) + 1);
        cols.put("modified_by", actor.name());
        cols.put("modified_at", Timestamp.from(java.time.Instant.now()));
        updateRow("public.service_purchase_orders", id, cols);
        history(id, "AMENDED", status, status, actor, req.reason());
        return details(id, actor);
    }

    // ------------------------------------------------------------------ schedules

    @Transactional
    public Map<String, Object> saveSchedule(long id, ScheduleRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "CREATOR", "APPROVER");
        String status = str(row, "status");
        if (!Set.of("DRAFT", "PENDING_APPROVAL", "APPROVED", "ISSUED").contains(status)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Schedule cannot be changed for a " + status + " PO.");
        }
        Integer accepted = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.service_po_acceptances WHERE service_po_id = ?", Integer.class, id);
        if (accepted != null && accepted > 0) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Schedule is locked because service acceptance has started.");
        }

        jdbc.update("DELETE FROM public.service_po_schedules WHERE service_po_id = ?", id);
        boolean enabled = Boolean.TRUE.equals(req.enabled());
        if (!enabled) {
            jdbc.update("UPDATE public.service_purchase_orders SET schedule_enabled = FALSE, schedule_type = NULL, "
                    + "modified_by = ?, modified_at = NOW() WHERE id = ?", actor.name(), id);
            history(id, "SCHEDULE_DISABLED", status, status, actor, null);
            return details(id, actor);
        }
        LocalDate validityEnd = ld(row.get("validity_end"));
        BigDecimal taxable = (BigDecimal) row.get("taxable_amount");
        List<ScheduleRow> rows = buildSchedules(req, taxable, validityEnd);
        for (ScheduleRow s : rows) {
            jdbc.update("INSERT INTO public.service_po_schedules (service_po_id, sequence_no, schedule_type, scheduled_date, "
                            + "due_date, planned_quantity, planned_amount, milestone_description) VALUES (?,?,?,?,?,?,?,?)",
                    id, s.seq(), s.type(), s.scheduledDate(), s.dueDate(), s.plannedQuantity(), s.plannedAmount(), s.description());
        }
        jdbc.update("UPDATE public.service_purchase_orders SET schedule_enabled = TRUE, schedule_type = ?, "
                + "modified_by = ?, modified_at = NOW() WHERE id = ?", upper(req.scheduleType()), actor.name(), id);
        history(id, "SCHEDULE_SAVED", status, status, actor, rows.size() + " planned rows");
        return details(id, actor);
    }

    // ------------------------------------------------------------------ service acceptance

    @Transactional
    public Map<String, Object> recordAcceptance(long id, AcceptanceRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "ACCEPTOR", "APPROVER");
        String status = str(row, "status");
        if (!Set.of("ISSUED", "PARTIALLY_FULFILLED").contains(status)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Service can be accepted only for issued POs. Current status: " + status);
        }
        ensureNotExpired(row);

        LocalDate today = LocalDate.now(zone());
        LocalDate poDate = ld(row.get("po_date"));
        LocalDate accDate = req.acceptanceDate() == null ? today : req.acceptanceDate();
        if (accDate.isAfter(today) || accDate.isBefore(poDate)) {
            throw bad("Acceptance date must be between the PO date " + poDate + " and today.");
        }
        if (req.serviceSummary() == null || req.serviceSummary().isBlank()) {
            throw bad("Describe the service performed.");
        }
        for (BigDecimal v : List.of(nz(req.completedQuantity()), nz(req.completedHours()))) {
            if (v.signum() < 0) throw bad("Completed quantity / hours cannot be negative.");
        }
        if (req.completedVisits() != null && req.completedVisits() < 0) throw bad("Completed visits cannot be negative.");

        String result = upper(req.result());
        if (!ACCEPTANCE_RESULTS.contains(result)) throw bad("Result must be ACCEPTED, PARTIALLY_ACCEPTED or REJECTED.");

        BigDecimal taxable = (BigDecimal) row.get("taxable_amount");
        BigDecimal accepted = (BigDecimal) row.get("accepted_amount");
        BigDecimal cap = taxable.subtract(accepted);
        Long scheduleId = req.scheduleId();
        if (scheduleId != null) {
            List<Map<String, Object>> sch = jdbc.queryForList(
                    "SELECT id, status, planned_amount FROM public.service_po_schedules WHERE id = ? AND service_po_id = ? FOR UPDATE",
                    scheduleId, id);
            if (sch.isEmpty()) throw bad("Schedule " + scheduleId + " does not belong to this PO.");
            if (!"PLANNED".equals(str(sch.get(0), "status"))) {
                throw new ServicePoException(HttpStatus.CONFLICT, "This occurrence / milestone has already been accepted.");
            }
            cap = ((BigDecimal) sch.get(0).get("planned_amount")).min(cap);
        }
        if (cap.signum() <= 0 && !"REJECTED".equals(result)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "No remaining value to accept on this PO.");
        }

        BigDecimal acceptedAmt;
        BigDecimal rejectedAmt;
        switch (result) {
            case "ACCEPTED" -> {
                acceptedAmt = req.acceptedAmount() != null ? req.acceptedAmount() : cap;
                rejectedAmt = BigDecimal.ZERO;
            }
            case "PARTIALLY_ACCEPTED" -> {
                if (req.acceptedAmount() == null || req.acceptedAmount().signum() <= 0) {
                    throw bad("Enter the accepted amount for a partial acceptance.");
                }
                acceptedAmt = req.acceptedAmount();
                rejectedAmt = req.rejectedAmount() != null ? req.rejectedAmount() : cap.subtract(acceptedAmt);
                if (acceptedAmt.compareTo(cap) >= 0) {
                    throw bad("Partial acceptance must be less than the remaining value " + cap + ". Use ACCEPTED instead.");
                }
                requireReason(req.remarks(), "Remarks for partial acceptance");
            }
            default -> {
                acceptedAmt = BigDecimal.ZERO;
                rejectedAmt = req.rejectedAmount() != null ? req.rejectedAmount() : cap;
                requireReason(req.remarks(), "Reason for rejection");
            }
        }
        acceptedAmt = ServicePoCalculator.money(acceptedAmt);
        rejectedAmt = ServicePoCalculator.money(rejectedAmt);
        if (acceptedAmt.signum() < 0 || rejectedAmt.signum() < 0) throw bad("Amounts cannot be negative.");
        if (acceptedAmt.compareTo(cap) > 0) {
            throw bad("Accepted amount " + acceptedAmt + " exceeds the remaining authorised value " + cap + ".");
        }

        String number = nextNumber("SEA");
        jdbc.update("INSERT INTO public.service_po_acceptances (acceptance_number, service_po_id, schedule_id, acceptance_date, "
                        + "service_performed, completed_quantity, completed_hours, completed_visits, accepted_amount, rejected_amount, "
                        + "result, remarks, accepted_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                number, id, scheduleId, accDate, req.serviceSummary().trim(), req.completedQuantity(), req.completedHours(),
                req.completedVisits(), acceptedAmt, rejectedAmt, result, req.remarks(), actor.name());

        if (!"REJECTED".equals(result)) {
            BigDecimal newAccepted = accepted.add(acceptedAmt);
            String newStatus = newAccepted.compareTo(taxable) >= 0 ? "FULFILLED" : "PARTIALLY_FULFILLED";
            jdbc.update("UPDATE public.service_purchase_orders SET accepted_amount = ?, status = ?, modified_by = ?, "
                    + "modified_at = NOW(), version = version + 1 WHERE id = ?", newAccepted, newStatus, actor.name(), id);
            if (scheduleId != null) {
                jdbc.update("UPDATE public.service_po_schedules SET status = 'COMPLETED', acceptance_status = ? WHERE id = ?",
                        "ACCEPTED".equals(result) ? "ACCEPTED" : "PARTIALLY_ACCEPTED", scheduleId);
            }
            if (!newStatus.equals(status)) {
                history(id, "STATUS_CHANGED", status, newStatus, actor, "Service acceptance " + number);
            }
        } else if (scheduleId != null) {
            jdbc.update("UPDATE public.service_po_schedules SET acceptance_status = 'REJECTED' WHERE id = ?", scheduleId);
        }
        history(id, "ACCEPTANCE_RECORDED", status, status, actor, number + " " + result + " " + acceptedAmt);
        return details(id, actor);
    }

    // ------------------------------------------------------------------ invoice verification

    @Transactional
    public Map<String, Object> recordInvoice(long id, InvoiceRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "FINANCE", "APPROVER");
        String status = str(row, "status");
        if (!Set.of("ISSUED", "PARTIALLY_FULFILLED", "FULFILLED", "CLOSED").contains(status)) {
            throw new ServicePoException(HttpStatus.CONFLICT, "Invoices can be recorded only against issued POs. Current status: " + status);
        }
        LocalDate today = LocalDate.now(zone());
        if (req.invoiceNumber() == null || req.invoiceNumber().isBlank() || req.invoiceNumber().length() > 100) {
            throw bad("Vendor invoice number is required (max 100 characters).");
        }
        if (req.invoiceDate() == null || req.invoiceDate().isAfter(today)) {
            throw bad("Invoice date is required and cannot be in the future.");
        }
        if (req.taxableAmount() == null || req.taxableAmount().signum() <= 0) {
            throw bad("Invoice taxable amount must be greater than zero.");
        }
        BigDecimal taxable = ServicePoCalculator.money(req.taxableAmount());
        BigDecimal poTaxable = (BigDecimal) row.get("taxable_amount");
        BigDecimal accepted = (BigDecimal) row.get("accepted_amount");
        BigDecimal invoiced = (BigDecimal) row.get("invoiced_amount");

        BigDecimal remaining = accepted.subtract(invoiced);
        if (taxable.compareTo(remaining) > 0) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "Invoice taxable value " + taxable + " exceeds accepted but un-invoiced service value " + remaining
                            + " (accepted " + accepted + ", invoiced " + invoiced + ", PO value " + poTaxable + ").");
        }
        if (req.acceptanceId() != null) {
            Integer ok = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM public.service_po_acceptances WHERE id = ? AND service_po_id = ? AND result <> 'REJECTED'",
                    Integer.class, req.acceptanceId(), id);
            if (ok == null || ok == 0) throw bad("Acceptance " + req.acceptanceId() + " is not a valid acceptance for this PO.");
        }

        // Tax must match the GST rate that was fixed on the PO (rates come from hsn_tax_master).
        BigDecimal gst = (BigDecimal) row.get("gst_rate");
        BigDecimal cess = (BigDecimal) row.get("cess_rate");
        BigDecimal expectedTax = taxable.multiply(gst.add(cess)).divide(HUNDRED, 2, java.math.RoundingMode.HALF_UP);
        BigDecimal tax = req.taxAmount() == null ? expectedTax : ServicePoCalculator.money(req.taxAmount());
        if (tax.subtract(expectedTax).abs().compareTo(TOLERANCE) > 0) {
            throw bad("Invoice tax " + tax + " does not match the PO GST rate " + gst + "% (+cess " + cess
                    + "%). Expected about " + expectedTax + ".");
        }
        BigDecimal total = taxable.add(tax);
        if (req.totalAmount() != null && req.totalAmount().subtract(total).abs().compareTo(TOLERANCE) > 0) {
            throw bad("Invoice total " + req.totalAmount() + " does not equal taxable + tax (" + total + ").");
        }

        String vendorCode = str(row, "vendor_code");
        Integer dup = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.service_po_invoices WHERE vendor_code = ? AND invoice_number = ?",
                Integer.class, vendorCode, req.invoiceNumber().trim());
        if (dup != null && dup > 0) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "Invoice " + req.invoiceNumber().trim() + " is already recorded for this vendor.");
        }

        jdbc.update("INSERT INTO public.service_po_invoices (service_po_id, acceptance_id, vendor_code, invoice_number, invoice_date, "
                        + "taxable_amount, tax_amount, total_amount, recorded_by) VALUES (?,?,?,?,?,?,?,?,?)",
                id, req.acceptanceId(), vendorCode, req.invoiceNumber().trim(), req.invoiceDate(), taxable, tax, total, actor.name());

        BigDecimal newInvoiced = invoiced.add(taxable);
        String invStatus = newInvoiced.compareTo(poTaxable) >= 0 ? "INVOICED"
                : (newInvoiced.signum() > 0 ? "PARTIALLY_INVOICED" : "NOT_INVOICED");
        jdbc.update("UPDATE public.service_purchase_orders SET invoiced_amount = ?, invoice_status = ?, modified_by = ?, "
                + "modified_at = NOW(), version = version + 1 WHERE id = ?", newInvoiced, invStatus, actor.name(), id);
        history(id, "INVOICE_RECORDED", status, status, actor, req.invoiceNumber().trim() + " taxable " + taxable);
        return details(id, actor);
    }

    // ------------------------------------------------------------------ attachments

    @Transactional
    public Map<String, Object> addAttachment(long id, AttachmentRequest req, Actor actor) {
        lockRow(id);
        String type = req.contentType() == null ? "" : req.contentType().trim().toLowerCase(Locale.ROOT);
        if (!ATTACHMENT_TYPES.contains(type)) {
            throw bad("Unsupported file type. Allowed: PDF, PNG, JPEG, XLSX, DOCX.");
        }
        String name = req.fileName() == null ? "" : req.fileName().replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        if (name.isEmpty() || name.length() > 255) throw bad("A valid file name is required.");
        if (req.contentBase64() == null || req.contentBase64().isBlank()) throw bad("File content is required.");
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(req.contentBase64().replaceAll("^data:[^,]*,", ""));
        } catch (IllegalArgumentException e) {
            throw bad("File content is not valid base64.");
        }
        if (bytes.length == 0 || bytes.length > MAX_ATTACHMENT_BYTES) {
            throw bad("File must be between 1 byte and 5 MB.");
        }
        String docType = "SERVICE_REPORT".equalsIgnoreCase(req.docType()) ? "SERVICE_REPORT" : "SUPPORTING";
        jdbc.update("INSERT INTO public.service_po_attachments (service_po_id, doc_type, file_name, content_type, size_bytes, content, uploaded_by) "
                + "VALUES (?,?,?,?,?,?,?)", id, docType, name, type, bytes.length, bytes, actor.name());
        history(id, "ATTACHMENT_ADDED", null, null, actor, docType + ": " + name);
        return details(id, actor);
    }

    public Map<String, Object> attachment(long id, long attachmentId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT file_name, content_type, content FROM public.service_po_attachments WHERE id = ? AND service_po_id = ?",
                attachmentId, id);
        if (rows.isEmpty()) throw notFound("Attachment " + attachmentId + " not found.");
        return rows.get(0);
    }

    // ------------------------------------------------------------------ reads

    /** Validates and calculates a draft without saving anything. Used by the form for live totals. */
    public Map<String, Object> preview(ServicePoRequest req, Actor actor) {
        require(actor, "CREATOR", "APPROVER");
        return camel(prepareHeader(req, actor));
    }

    public Map<String, Object> list(ListFilter f, int page, int size, String sort, String dir, Actor actor) {
        List<String> conds = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        if (notBlank(f.q())) {
            String like = "%" + f.q().trim().toLowerCase(Locale.ROOT) + "%";
            conds.add("(LOWER(po_number) LIKE ? OR LOWER(vendor_name) LIKE ? OR LOWER(service_title) LIKE ? "
                    + "OR LOWER(scope_of_work) LIKE ? OR LOWER(service_category) LIKE ?)");
            for (int i = 0; i < 5; i++) args.add(like);
        }
        if (notBlank(f.vendorCode())) { conds.add("vendor_code = ?"); args.add(f.vendorCode().trim()); }
        if (notBlank(f.department())) { conds.add("department_name = ?"); args.add(f.department().trim()); }
        if (notBlank(f.category())) { conds.add("service_category = ?"); args.add(f.category().trim()); }
        if (notBlank(f.status())) { conds.add("status = ?"); args.add(f.status().trim().toUpperCase(Locale.ROOT)); }
        if (notBlank(f.invoiceStatus())) { conds.add("invoice_status = ?"); args.add(f.invoiceStatus().trim().toUpperCase(Locale.ROOT)); }
        if (f.fromDate() != null) { conds.add("po_date >= ?"); args.add(f.fromDate()); }
        if (f.toDate() != null) { conds.add("po_date <= ?"); args.add(f.toDate()); }
        String where = conds.isEmpty() ? "" : " WHERE " + String.join(" AND ", conds);

        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM public.service_purchase_orders" + where, Integer.class, args.toArray());
        String column = SORT_COLUMNS.getOrDefault(sort, "po_date");
        String direction = "asc".equalsIgnoreCase(dir) ? "ASC" : "DESC";
        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add(safePage * safeSize);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, po_number, po_date, status, vendor_code, vendor_name, service_category, service_title, "
                        + "department_name, service_start_date, service_completion_date, validity_end, basic_amount, "
                        + "tax_amount, total_amount, accepted_amount, invoiced_amount, invoice_status, created_by, created_at, version, "
                        + "(validity_end < CURRENT_DATE AND status NOT IN ('DRAFT','CANCELLED','CLOSED')) AS validity_expired, "
                        + "taxable_amount "
                        + "FROM public.service_purchase_orders" + where
                        + " ORDER BY " + column + " " + direction + ", id DESC LIMIT ? OFFSET ?",
                pageArgs.toArray());
        int tot = total == null ? 0 : total;
        List<Map<String, Object>> content = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> c = camel(r);
            c.put("allowedActions", allowedActions(r, actor));
            content.add(c);
        }
        return Map.of(
                "content", content,
                "page", safePage,
                "size", safeSize,
                "totalElements", tot,
                "totalPages", (int) Math.ceil(tot / (double) safeSize));
    }

    public Map<String, Object> details(long id, Actor actor) {
        Map<String, Object> row = headerRow(id);
        Map<String, Object> out = camel(row);
        out.put("allowedActions", allowedActions(row, actor));
        out.put("validityExpired", isExpired(row));
        out.put("remainingToAccept", ((BigDecimal) row.get("taxable_amount")).subtract((BigDecimal) row.get("accepted_amount")));
        out.put("remainingToInvoice", ((BigDecimal) row.get("accepted_amount")).subtract((BigDecimal) row.get("invoiced_amount")));
        out.put("schedules", camelList(jdbc.queryForList(
                "SELECT * FROM public.service_po_schedules WHERE service_po_id = ? ORDER BY sequence_no", id)));
        out.put("acceptances", camelList(jdbc.queryForList(
                "SELECT * FROM public.service_po_acceptances WHERE service_po_id = ? ORDER BY accepted_at, id", id)));
        out.put("invoices", camelList(jdbc.queryForList(
                "SELECT * FROM public.service_po_invoices WHERE service_po_id = ? ORDER BY recorded_at, id", id)));
        out.put("history", camelList(jdbc.queryForList(
                "SELECT * FROM public.service_po_status_history WHERE service_po_id = ? ORDER BY acted_at, id", id)));
        out.put("validityHistory", camelList(jdbc.queryForList(
                "SELECT * FROM public.service_po_validity_history WHERE service_po_id = ? ORDER BY changed_at, id", id)));
        out.put("revisions", camelList(jdbc.queryForList(
                "SELECT * FROM public.service_po_revisions WHERE service_po_id = ? ORDER BY revision_number", id)));
        out.put("attachments", camelList(jdbc.queryForList(
                "SELECT id, doc_type, file_name, content_type, size_bytes, uploaded_by, uploaded_at "
                        + "FROM public.service_po_attachments WHERE service_po_id = ? ORDER BY uploaded_at, id", id)));
        return out;
    }

    /** Printable PO document. The browser's print dialog saves it as PDF. */
    public String printHtml(long id) {
        Map<String, Object> d = details(id, new Actor("print", "ADMIN"));
        StringBuilder sb = new StringBuilder();
        sb.append("<!doctype html><html><head><meta charset='utf-8'><title>").append(esc(d.get("poNumber"))).append("</title>")
          .append("<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}")
          .append("h1{font-size:18px;margin:0}h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #999}")
          .append("table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}")
          .append("th{background:#f2f2f2;width:28%}.r{text-align:right}</style></head><body>");
        sb.append("<h1>SERVICE PURCHASE ORDER</h1><p>PO No: <b>").append(esc(d.get("poNumber")))
          .append("</b> &nbsp; PO Date: ").append(esc(d.get("poDate"))).append(" &nbsp; Status: ").append(esc(d.get("status"))).append("</p>");
        sb.append("<h2>Vendor</h2><table>")
          .append(row("Vendor", d.get("vendorName"))).append(row("Address", d.get("vendorAddress")))
          .append(row("GSTIN", d.get("vendorGstin"))).append(row("State", d.get("vendorState") + " (" + d.get("vendorStateCode") + ")"))
          .append("</table>");
        sb.append("<h2>Service</h2><table>")
          .append(row("Category", d.get("serviceCategory"))).append(row("Title", d.get("serviceTitle")))
          .append(row("Scope of work", d.get("scopeOfWork"))).append(row("Deliverables", d.get("deliverables")))
          .append(row("Acceptance criteria", d.get("acceptanceCriteria"))).append(row("SLA", d.get("slaTerms")))
          .append(row("Exclusions", d.get("exclusions"))).append(row("Service period", d.get("serviceStartDate") + " to " + d.get("serviceCompletionDate")))
          .append(row("PO validity", d.get("validityStart") + " to " + d.get("validityEnd")))
          .append("</table>");
        sb.append("<h2>Commercial</h2><table>")
          .append(row("Pricing method", d.get("pricingMethod"))).append(row("Quantity x Rate", d.get("quantity") + " " + nullToEmpty(d.get("unitOfMeasure")) + " x " + d.get("rate")))
          .append(row("Basic amount", money(d.get("basicAmount")))).append(row("Discount", money(d.get("discountAmount"))))
          .append(row("Additional charges", money(d.get("additionalCharges")))).append(row("Taxable value", money(d.get("taxableAmount"))))
          .append(row("SAC", d.get("sacCode") + " " + nullToEmpty(d.get("sacDescription"))))
          .append(row("GST", d.get("supplyType") + " @ " + d.get("gstRate") + "% : CGST " + money(d.get("cgstAmount"))
                  + ", SGST " + money(d.get("sgstAmount")) + ", IGST " + money(d.get("igstAmount"))))
          .append(row("Total PO value", "<b>" + money(d.get("totalAmount")) + "</b> " + nullToEmpty(d.get("currency"))))
          .append(row("Payment terms", d.get("paymentTerms")))
          .append("</table>");
        sb.append("<h2>Terms</h2><table>")
          .append(row("Terms & conditions", d.get("termsAndConditions"))).append(row("Warranty", d.get("warrantyTerms")))
          .append(row("Cancellation / termination", d.get("cancellationTerms")))
          .append("</table>");
        sb.append("<h2>Approval history</h2><table>");
        for (Object h : (List<?>) d.get("history")) {
            Map<?, ?> m = (Map<?, ?>) h;
            sb.append("<tr><td>").append(esc(m.get("actedAt"))).append("</td><td>").append(esc(m.get("action")))
              .append("</td><td>").append(esc(m.get("actor"))).append(" (").append(esc(m.get("actorRole"))).append(")</td><td>")
              .append(esc(m.get("comments"))).append("</td></tr>");
        }
        sb.append("</table><p style='margin-top:40px'>Authorised signatory: ____________________</p></body></html>");
        return sb.toString();
    }

    // ------------------------------------------------------------------ GRN guard (used by Standard PO GRN paths)

    /** Service POs must never enter the GRN / goods-receipt flow. Called by GRN and receipt services. */
    public static void assertNotServicePo(JdbcTemplate jdbc, String poNumber) {
        if (poNumber == null || poNumber.isBlank()) return;
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.service_purchase_orders WHERE po_number = ?", Integer.class, poNumber.trim());
        if (n != null && n > 0) {
            throw new com.silvermuller.seals.common.exception.InvalidTransactionException(
                    "Service PO " + poNumber + " cannot use GRN / goods receipt. Record a Service Acceptance instead.");
        }
    }

    // ------------------------------------------------------------------ internals: header preparation

    private Map<String, Object> prepareHeader(ServicePoRequest r, Actor actor) {
        LocalDate today = LocalDate.now(zone());
        Map<String, Object> m = new LinkedHashMap<>();

        // Vendor: always read from Vendor Master, never trusted from the client.
        List<Map<String, Object>> vr = jdbc.queryForList(
                "SELECT supplier_code, supplier_name, address, city, state, state_code, pincode, gstin, pan, status "
                        + "FROM public.supplier_master WHERE supplier_code = ?", blankToNull(r.vendorCode()));
        if (vr.isEmpty()) throw bad("Select a vendor from the Vendor Master.");
        Map<String, Object> v = vr.get(0);
        if (!"ACTIVE".equalsIgnoreCase(str(v, "status"))) throw bad("Vendor " + str(v, "supplier_code") + " is not active.");
        String vendorStateCode = blankToNull(str(v, "state_code"));
        String gstin = blankToNull(str(v, "gstin"));
        if (vendorStateCode == null && gstin != null && gstin.length() >= 2) vendorStateCode = gstin.substring(0, 2);
        if (vendorStateCode == null) throw bad("Vendor master has no state code for this vendor. Update the vendor before creating a PO.");
        m.put("vendor_code", str(v, "supplier_code"));
        m.put("vendor_name", str(v, "supplier_name"));
        m.put("vendor_legal_name", str(v, "supplier_name"));
        // The Vendor Master address often already contains city/state/pincode; only append what is missing.
        String addr = blankToNull(str(v, "address"));
        String tail = joinNonBlank(", ", str(v, "city"), str(v, "state"), str(v, "pincode"));
        m.put("vendor_address", addr == null ? blankToNull(tail)
                : (tail.isEmpty() || addr.contains(tail) ? addr : addr + ", " + tail));
        m.put("vendor_gstin", gstin);
        m.put("vendor_pan", str(v, "pan"));
        m.put("vendor_state", str(v, "state"));
        m.put("vendor_state_code", vendorStateCode);

        // Company and place of supply
        String companyState = requireStateCode(r.companyStateCode(), "Company state code");
        String placeOfSupply = r.placeOfSupplyStateCode() == null || r.placeOfSupplyStateCode().isBlank()
                ? companyState : requireStateCode(r.placeOfSupplyStateCode(), "Place of supply state code");
        boolean intra = vendorStateCode.equals(placeOfSupply);
        m.put("company_name", blankToNull(r.companyName()));
        m.put("company_gstin", blankToNull(r.companyGstin()));
        m.put("company_state_code", companyState);
        m.put("place_of_supply_state_code", placeOfSupply);
        m.put("supply_type", intra ? "INTRA" : "INTER");

        // Department (Department Master)
        if (r.departmentId() == null) throw bad("Select a requesting department.");
        List<Map<String, Object>> dr = jdbc.queryForList(
                "SELECT dept_code, department_name, status FROM public.department_master WHERE id = ?", r.departmentId());
        if (dr.isEmpty()) throw bad("Requesting department not found in Department Master.");
        if ("INACTIVE".equalsIgnoreCase(str(dr.get(0), "status"))) throw bad("Requesting department is inactive.");
        m.put("department_code", str(dr.get(0), "dept_code"));
        m.put("department_name", str(dr.get(0), "department_name"));
        m.put("requester", notBlank(r.requester()) ? r.requester().trim() : actor.name());
        m.put("business_unit", blankToNull(r.businessUnit()));
        m.put("service_location", blankToNull(r.serviceLocation()));
        m.put("currency", notBlank(r.currency()) ? r.currency().trim().toUpperCase(Locale.ROOT) : "INR");
        m.put("cost_centre", blankToNull(r.costCentre()));
        m.put("estimated_budget", r.estimatedBudget());

        // Optional PR reference: must exist when supplied; direct creation is allowed.
        if (notBlank(r.prNumber())) {
            Integer prCount = jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_requisitions WHERE pr_number = ?",
                    Integer.class, r.prNumber().trim());
            if (prCount == null || prCount == 0) throw bad("PR number " + r.prNumber().trim() + " was not found.");
        }
        m.put("pr_number", blankToNull(r.prNumber()));
        m.put("quotation_reference", blankToNull(r.quotationReference()));
        m.put("contract_reference", blankToNull(r.contractReference()));
        m.put("payment_terms", blankToNull(r.paymentTerms()));
        m.put("internal_remarks", blankToNull(r.internalRemarks()));

        // Dates
        LocalDate poDate = r.poDate() == null ? today : r.poDate();
        if (poDate.isAfter(today)) throw bad("PO date cannot be in the future.");
        if (r.validityEnd() == null) throw bad("PO validity end date is required.");
        if (r.validityEnd().isBefore(poDate)) throw bad("PO validity end must be on or after the PO date.");
        if (r.validityStart() != null && r.validityStart().isAfter(r.validityEnd())) {
            throw bad("PO validity start must be on or before the validity end.");
        }
        if (r.serviceStartDate() != null && r.serviceCompletionDate() != null
                && r.serviceCompletionDate().isBefore(r.serviceStartDate())) {
            throw bad("Service completion date cannot be before the service start date.");
        }
        m.put("po_date", poDate);
        m.put("validity_start", r.validityStart());
        m.put("validity_end", r.validityEnd());
        m.put("service_start_date", r.serviceStartDate());
        m.put("service_completion_date", r.serviceCompletionDate());

        // Service description & scope (free text; category is a classification only)
        if (r.serviceCategory() == null || r.serviceCategory().isBlank()) throw bad("Select a service category.");
        Integer catCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.service_po_categories WHERE parent_group = 'Service' AND is_active = TRUE AND name = ?",
                Integer.class, r.serviceCategory().trim());
        if (catCount == null || catCount == 0) throw bad("Service category is not in the active Service group.");
        m.put("service_category", r.serviceCategory().trim());
        m.put("service_title", requireText(r.serviceTitle(), "Service title / description", 255));
        m.put("scope_of_work", requireText(r.scopeOfWork(), "Detailed scope of work", 10000));
        m.put("deliverables", blankToNull(r.deliverables()));
        m.put("acceptance_criteria", blankToNull(r.acceptanceCriteria()));
        m.put("sla_terms", blankToNull(r.slaTerms()));
        m.put("warranty_terms", blankToNull(r.warrantyTerms()));
        m.put("exclusions", blankToNull(r.exclusions()));
        m.put("special_instructions", blankToNull(r.specialInstructions()));
        m.put("related_asset_id", blankToNull(r.relatedAssetId()));
        String freq = notBlank(r.serviceFrequency()) ? upper(r.serviceFrequency()) : "ONE_TIME";
        if (!SERVICE_FREQUENCIES.contains(freq)) throw bad("Invalid service frequency.");
        m.put("service_frequency", freq);
        if (r.numberOfVisits() != null && r.numberOfVisits() < 0) throw bad("Number of visits cannot be negative.");
        m.put("number_of_visits", r.numberOfVisits());
        m.put("cancellation_terms", blankToNull(r.cancellationTerms()));
        m.put("terms_and_conditions", blankToNull(r.termsAndConditions()));

        // GST / SAC: rate and SAC description come from hsn_tax_master
        if (!notBlank(r.sacCode())) throw bad("SAC code is required.");
        List<Map<String, Object>> hsn = jdbc.queryForList(
                "SELECT hsn_sac_code, description, gst_rate, cess_rate FROM public.hsn_tax_master "
                        + "WHERE hsn_sac_code = ? AND type = 'SERVICE' AND is_active = TRUE", r.sacCode().trim());
        if (hsn.isEmpty()) throw bad("SAC " + r.sacCode().trim() + " is not an active SERVICE code in the Tax Master.");
        String taxability = notBlank(r.gstTaxability()) ? upper(r.gstTaxability()) : "TAXABLE";
        if (!TAXABILITY.contains(taxability)) throw bad("Invalid GST taxability.");
        boolean taxable = "TAXABLE".equals(taxability);
        if (!taxable && !notBlank(r.nonGstReason())) throw bad("Reason is required for exempt, nil-rated or non-GST supplies.");
        BigDecimal gstRate = taxable ? (BigDecimal) hsn.get(0).get("gst_rate") : BigDecimal.ZERO;
        BigDecimal cessRate = taxable ? nz((BigDecimal) hsn.get(0).get("cess_rate")) : BigDecimal.ZERO;
        m.put("sac_code", hsn.get(0).get("hsn_sac_code"));
        m.put("sac_description", hsn.get(0).get("description"));
        m.put("gst_taxability", taxability);
        m.put("non_gst_reason", taxable ? null : blankToNull(r.nonGstReason()));
        m.put("reverse_charge", Boolean.TRUE.equals(r.reverseCharge()));

        // TDS: only when Finance has configured it on the request (no hardcoded statutory rates)
        boolean tds = Boolean.TRUE.equals(r.tdsApplicable());
        if (tds && (!notBlank(r.tdsSection()) || r.tdsRate() == null)) {
            throw bad("TDS section and rate are required when TDS applies.");
        }
        m.put("tds_applicable", tds);
        m.put("tds_section", tds ? r.tdsSection().trim() : null);
        m.put("tds_rate", tds ? r.tdsRate() : BigDecimal.ZERO);

        // Pricing: calculated on the backend
        PricingMethod method = PricingMethod.parse(r.pricingMethod());
        boolean qty = method.isQuantityBased();
        ServicePoCalculator.Result res = ServicePoCalculator.calculate(new ServicePoCalculator.Input(
                method,
                qty ? r.quantity() : null,
                qty ? r.rate() : null,
                qty ? null : r.fixedAmount(),
                r.discountType(),
                nz(r.discountValue()),
                nz(r.additionalCharges()),
                gstRate,
                cessRate,
                intra,
                nz(r.advancePercent()),
                nz(r.retentionPercent()),
                tds ? r.tdsRate() : BigDecimal.ZERO));
        m.put("pricing_method", method.name());
        m.put("quantity", qty ? r.quantity() : null);
        m.put("unit_of_measure", qty ? blankToNull(r.unitOfMeasure()) : null);
        m.put("rate", qty ? r.rate() : null);
        m.put("basic_amount", res.basicAmount());
        m.put("discount_type", r.discountType() == null ? "NONE" : upper(r.discountType()));
        m.put("discount_value", nz(r.discountValue()));
        m.put("discount_amount", res.discountAmount());
        m.put("additional_charges", res.additionalCharges());
        m.put("taxable_amount", res.taxableAmount());
        m.put("gst_rate", res.gstRate());
        m.put("cgst_rate", res.cgstRate());
        m.put("cgst_amount", res.cgstAmount());
        m.put("sgst_rate", res.sgstRate());
        m.put("sgst_amount", res.sgstAmount());
        m.put("igst_rate", res.igstRate());
        m.put("igst_amount", res.igstAmount());
        m.put("cess_rate", res.cessRate());
        m.put("cess_amount", res.cessAmount());
        m.put("tax_amount", res.taxAmount());
        m.put("total_amount", res.totalAmount());
        m.put("advance_percent", nz(r.advancePercent()));
        m.put("advance_amount", res.advanceAmount());
        m.put("retention_percent", nz(r.retentionPercent()));
        m.put("retention_amount", res.retentionAmount());
        m.put("tds_amount", res.tdsAmount());
        return m;
    }

    private void validateSchedulesAgainstValue(long id, BigDecimal taxable) {
        BigDecimal planned = jdbc.queryForObject(
                "SELECT COALESCE(SUM(planned_amount), 0) FROM public.service_po_schedules WHERE service_po_id = ?",
                BigDecimal.class, id);
        if (planned != null && planned.compareTo(taxable) > 0) {
            throw bad("Planned schedule amounts (" + planned + ") exceed the PO value " + taxable
                    + ". Update the schedule first.");
        }
    }

    // ------------------------------------------------------------------ internals: schedule generation (pure)

    static List<ScheduleRow> buildSchedules(ScheduleRequest s, BigDecimal taxable, LocalDate validityEnd) {
        String type = upper(s.scheduleType());
        if (!SCHEDULE_TYPES.contains(type)) throw bad("Schedule type must be ONE_TIME, RECURRING or MILESTONE.");
        List<ScheduleRow> rows = new ArrayList<>();
        switch (type) {
            case "ONE_TIME" -> {
                LocalDate d = requireDate(s.startDate(), "Scheduled date is required for a one-time schedule.");
                checkInValidity(d, validityEnd);
                rows.add(new ScheduleRow(1, "ONE_TIME", d, d, s.plannedQuantity(), ServicePoCalculator.money(taxable),
                        "One-time service"));
            }
            case "RECURRING" -> {
                String freq = upper(s.frequency());
                if (!RECURRENCE_FREQUENCIES.contains(freq)) throw bad("Recurring schedule needs a frequency (DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY or CUSTOM).");
                int interval = s.intervalCount() == null ? 1 : s.intervalCount();
                if (interval < 1 || interval > 365) throw bad("Interval must be between 1 and 365.");
                LocalDate start = requireDate(s.startDate(), "Start date is required for a recurring schedule.");
                if (s.occurrences() == null && s.endDate() == null) {
                    throw bad("Provide either the number of occurrences or an end date.");
                }
                if (s.occurrences() != null && (s.occurrences() < 1 || s.occurrences() > MAX_OCCURRENCES)) {
                    throw bad("Number of occurrences must be between 1 and " + MAX_OCCURRENCES + ".");
                }
                List<LocalDate> dates = new ArrayList<>();
                for (int i = 0; ; i++) {
                    LocalDate d = nthDate(start, freq, interval, i);
                    if (s.occurrences() != null && dates.size() >= s.occurrences()) break;
                    if (s.endDate() != null && d.isAfter(s.endDate())) break;
                    if (dates.size() >= MAX_OCCURRENCES) throw bad("Too many occurrences (max " + MAX_OCCURRENCES + ").");
                    checkInValidity(d, validityEnd);
                    dates.add(d);
                }
                if (dates.isEmpty()) throw bad("The recurrence produces no occurrences.");
                int n = dates.size();
                BigDecimal perOcc = s.perOccurrenceAmount();
                BigDecimal running = BigDecimal.ZERO;
                for (int i = 0; i < n; i++) {
                    BigDecimal amt;
                    if (perOcc != null) {
                        if (perOcc.signum() <= 0) throw bad("Amount per occurrence must be greater than zero.");
                        amt = ServicePoCalculator.money(perOcc);
                    } else if (i < n - 1) {
                        amt = ServicePoCalculator.money(taxable.divide(BigDecimal.valueOf(n), 2, java.math.RoundingMode.DOWN));
                    } else {
                        amt = ServicePoCalculator.money(taxable.subtract(running)); // last row absorbs rounding
                    }
                    running = running.add(amt);
                    rows.add(new ScheduleRow(i + 1, "RECURRING", dates.get(i), dates.get(i), s.plannedQuantity(), amt,
                            "Occurrence " + (i + 1) + " of " + n));
                }
                if (running.compareTo(taxable) > 0) {
                    throw bad("Planned occurrence amounts (" + running + ") exceed the PO value " + taxable + ".");
                }
            }
            case "MILESTONE" -> {
                if (s.milestones() == null || s.milestones().isEmpty()) throw bad("Add at least one milestone.");
                BigDecimal sum = BigDecimal.ZERO;
                int seq = 1;
                for (MilestoneRequest ms : s.milestones()) {
                    if (ms.description() == null || ms.description().isBlank()) throw bad("Milestone description is required.");
                    LocalDate due = requireDate(ms.dueDate(), "Milestone due date is required.");
                    checkInValidity(due, validityEnd);
                    if (ms.amount() == null || ms.amount().signum() <= 0) throw bad("Milestone amount must be greater than zero.");
                    BigDecimal amt = ServicePoCalculator.money(ms.amount());
                    sum = sum.add(amt);
                    rows.add(new ScheduleRow(seq++, "MILESTONE", null, due, null, amt, ms.description().trim()));
                }
                if (sum.compareTo(taxable) > 0) {
                    throw bad("Milestone total " + sum + " exceeds the PO value " + taxable + ".");
                }
            }
            default -> throw bad("Unsupported schedule type.");
        }
        return rows;
    }

    static LocalDate nthDate(LocalDate start, String freq, int interval, int i) {
        return switch (freq) {
            case "DAILY", "CUSTOM" -> start.plusDays((long) i * interval);
            case "WEEKLY" -> start.plusWeeks((long) i * interval);
            case "MONTHLY" -> start.plusMonths((long) i * interval);
            case "QUARTERLY" -> start.plusMonths(3L * i * interval);
            case "YEARLY" -> start.plusYears((long) i * interval);
            default -> throw bad("Unsupported frequency: " + freq);
        };
    }

    private static void checkInValidity(LocalDate d, LocalDate validityEnd) {
        if (d.isAfter(validityEnd)) {
            throw bad("Date " + d + " falls after the PO validity end " + validityEnd + ".");
        }
    }

    // ------------------------------------------------------------------ internals: workflow helpers

    private void transition(Map<String, Object> row, String expectedFrom, String to, String action, Actor actor, String comments) {
        String from = str(row, "status");
        if (!expectedFrom.equals(from)) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "Action " + action + " needs status " + expectedFrom + " but the PO is " + from + ".");
        }
    }

    private Map<String, Object> finish(long id, Map<String, Object> row, String to, String action, Actor actor,
                                       String comments) {
        String from = str(row, "status");
        jdbc.update("UPDATE public.service_purchase_orders SET status = ?, modified_by = ?, modified_at = NOW(), "
                + "version = version + 1 WHERE id = ?", to, actor.name(), id);
        history(id, action, from, to, actor, comments);
        return details(id, actor);
    }

    private void ensureNotExpired(Map<String, Object> row) {
        if (isExpired(row)) {
            throw new ServicePoException(HttpStatus.CONFLICT,
                    "PO validity expired on " + ld(row.get("validity_end")) + ". Extend validity before continuing.");
        }
    }

    private boolean isExpired(Map<String, Object> row) {
        String status = str(row, "status");
        if (Set.of("DRAFT", "CANCELLED", "CLOSED").contains(status)) return false;
        LocalDate end = ld(row.get("validity_end"));
        return end != null && end.isBefore(LocalDate.now(zone()));
    }

    private void requireCreatorOrApprover(Actor actor, Map<String, Object> row) {
        if (has(actor, "CREATOR", "APPROVER")) return;
        throw new ServicePoException(HttpStatus.FORBIDDEN, "Only the creator or an approver can change this PO.");
    }

    private List<String> allowedActions(Map<String, Object> row, Actor actor) {
        String s = str(row, "status");
        boolean creatorish = has(actor, "CREATOR", "APPROVER");
        boolean approver = has(actor, "APPROVER");
        boolean acceptor = has(actor, "ACCEPTOR", "APPROVER");
        boolean finance = has(actor, "FINANCE", "APPROVER");
        boolean expired = isExpired(row);
        boolean hasAccepted = ((BigDecimal) row.get("accepted_amount")).signum() > 0;
        boolean ownSubmission = actor.name().equalsIgnoreCase(str(row, "created_by")) && !"ADMIN".equals(actor.role());
        List<String> a = new ArrayList<>();
        if ("DRAFT".equals(s) && creatorish) { a.add("EDIT"); a.add("SUBMIT"); }
        if ("PENDING_APPROVAL".equals(s) && approver && !ownSubmission) { a.add("APPROVE"); a.add("REJECT"); }
        if ("APPROVED".equals(s) && approver) a.add("ISSUE");
        if (Set.of("APPROVED", "ISSUED", "PARTIALLY_FULFILLED").contains(s) && approver) { a.add("AMEND"); a.add("HOLD"); }
        if (!Set.of("DRAFT", "CANCELLED", "CLOSED").contains(s) && approver) a.add("EXTEND_VALIDITY");
        if ("ON_HOLD".equals(s) && approver) a.add("RELEASE");
        if (Set.of("ISSUED", "PARTIALLY_FULFILLED", "FULFILLED").contains(s) && approver) a.add("CLOSE");
        if (Set.of("DRAFT", "PENDING_APPROVAL", "APPROVED", "ISSUED", "ON_HOLD").contains(s) && !hasAccepted
                && (approver || (creatorish && Set.of("DRAFT", "PENDING_APPROVAL").contains(s)))) a.add("CANCEL");
        if (Set.of("DRAFT", "PENDING_APPROVAL", "APPROVED", "ISSUED").contains(s) && creatorish) a.add("MANAGE_SCHEDULE");
        if (Set.of("ISSUED", "PARTIALLY_FULFILLED").contains(s) && acceptor && !expired) a.add("RECORD_ACCEPTANCE");
        if (Set.of("ISSUED", "PARTIALLY_FULFILLED", "FULFILLED", "CLOSED").contains(s) && finance) a.add("RECORD_INVOICE");
        a.add("ATTACH");
        return a;
    }

    private void history(long id, String action, String from, String to, Actor actor, String comments) {
        jdbc.update("INSERT INTO public.service_po_status_history (service_po_id, action, from_status, to_status, actor, actor_role, comments) "
                + "VALUES (?,?,?,?,?,?,?)", id, action, from, to, actor.name(), actor.role(), blankToNull(comments));
    }

    private Map<String, Object> headerRow(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.service_purchase_orders WHERE id = ?", id);
        if (rows.isEmpty()) throw notFound("Service PO " + id + " not found.");
        return rows.get(0);
    }

    private Map<String, Object> lockRow(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM public.service_purchase_orders WHERE id = ? FOR UPDATE", id);
        if (rows.isEmpty()) throw notFound("Service PO " + id + " not found.");
        return rows.get(0);
    }

    private String nextPoNumber() {
        return nextNumber("SPO");
    }

    private String nextNumber(String prefix) {
        Long n = jdbc.queryForObject("SELECT nextval('public.service_po_number_seq')", Long.class);
        return String.format(Locale.ROOT, "%s-%d-%05d", prefix, LocalDate.now(zone()).getYear(), n);
    }

    private long insertRow(String table, Map<String, Object> cols) {
        String names = String.join(", ", cols.keySet());
        String marks = cols.keySet().stream().map(k -> "?").collect(Collectors.joining(", "));
        return jdbc.queryForObject("INSERT INTO " + table + " (" + names + ") VALUES (" + marks + ") RETURNING id",
                Long.class, cols.values().toArray());
    }

    private void updateRow(String table, long id, Map<String, Object> cols) {
        String sets = cols.keySet().stream().map(k -> k + " = ?").collect(Collectors.joining(", "));
        List<Object> args = new ArrayList<>(cols.values());
        args.add(id);
        jdbc.update("UPDATE " + table + " SET " + sets + " WHERE id = ?", args.toArray());
    }

    // ------------------------------------------------------------------ internals: small utilities

    static ZoneId zone() {
        return ZoneId.of("Asia/Kolkata");
    }

    private static ServicePoException bad(String msg) {
        return new ServicePoException(HttpStatus.BAD_REQUEST, msg);
    }

    private static ServicePoException notFound(String msg) {
        return new ServicePoException(HttpStatus.NOT_FOUND, msg);
    }

    private static void requireReason(String text, String label) {
        if (text == null || text.isBlank()) throw bad(label + " is required.");
    }

    private static String requireText(String text, String label, int max) {
        if (text == null || text.isBlank()) throw bad(label + " is required.");
        String t = text.trim();
        if (t.length() > max) throw bad(label + " is too long (max " + max + " characters).");
        return t;
    }

    private static String requireStateCode(String code, String label) {
        if (code == null || !code.trim().matches("\\d{2}")) throw bad(label + " must be a 2-digit GST state code.");
        return code.trim();
    }

    private static LocalDate requireDate(LocalDate d, String msg) {
        if (d == null) throw bad(msg);
        return d;
    }

    static String upper(String s) {
        return s == null ? null : s.trim().toUpperCase(Locale.ROOT);
    }

    static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    static String blankToNull(String s) {
        return notBlank(s) ? s.trim() : null;
    }

    static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    static String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v == null ? null : String.valueOf(v);
    }

    static LocalDate ld(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate d) return d;
        if (o instanceof java.sql.Date d) return d.toLocalDate();
        if (o instanceof Timestamp t) return t.toInstant().atZone(zone()).toLocalDate();
        return LocalDate.parse(o.toString());
    }

    private static Object normalize(Object o) {
        if (o instanceof BigDecimal b) return b.stripTrailingZeros().toPlainString();
        if (o instanceof java.sql.Date d) return d.toLocalDate().toString();
        if (o instanceof LocalDate d) return d.toString();
        return o;
    }

    private static String joinNonBlank(String sep, String... parts) {
        return Arrays.stream(parts).filter(ServicePoService::notBlank).map(String::trim).collect(Collectors.joining(sep));
    }

    private static String esc(Object o) {
        if (o == null) return "";
        return String.valueOf(o).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String nullToEmpty(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static String money(Object o) {
        return o == null ? "0.00" : new BigDecimal(String.valueOf(o)).setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    private static String row(String label, Object value) {
        return "<tr><th>" + esc(label) + "</th><td>" + (value instanceof String s && s.startsWith("<b>") ? s : esc(value)) + "</td></tr>";
    }

    /** snake_case DB row -> camelCase JSON map; dates become ISO strings. */
    static Map<String, Object> camel(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : row.entrySet()) {
            out.put(camelKey(e.getKey()), jsonValue(e.getValue()));
        }
        return out;
    }

    static List<Map<String, Object>> camelList(List<Map<String, Object>> rows) {
        return rows.stream().map(ServicePoService::camel).collect(Collectors.toList());
    }

    private static Object jsonValue(Object v) {
        if (v instanceof java.sql.Date d) return d.toLocalDate().toString();
        if (v instanceof Timestamp t) return t.toInstant().toString();
        if (v instanceof byte[]) return null;
        return v;
    }

    private static String camelKey(String k) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : k.toCharArray()) {
            if (c == '_') { up = true; continue; }
            sb.append(up ? Character.toUpperCase(c) : c);
            up = false;
        }
        return sb.toString();
    }
}
