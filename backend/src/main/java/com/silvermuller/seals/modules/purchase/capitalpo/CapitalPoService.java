package com.silvermuller.seals.modules.purchase.capitalpo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoDtos.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Capital Purchase Order (CAPEX). Uses capital_* tables plus asset_master for controlled fixed-asset
 * registration. Ordinary inventory tables are never written by this module.
 *
 * Identity and roles come from the X-User-Name / X-User-Role headers (no login system exists yet).
 */
@Service
public class CapitalPoService {

    public static class CapitalPoException extends RuntimeException {
        private final HttpStatus status;

        public CapitalPoException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() {
            return status;
        }
    }

    public record Actor(String name, String role) {}

    public record ListFilter(String poNumber, String vendor, String assetCategory, String department, String plant,
                             LocalDate poFrom, LocalDate poTo, LocalDate deliveryFrom, LocalDate deliveryTo,
                             String status, String receiptStatus, String installationStatus,
                             String commissioningStatus, String registrationStatus) {}

    private record Prepared(Map<String, Object> header, List<Map<String, Object>> lines, List<Map<String, Object>> charges) {}

    static final Set<String> ROLES = Set.of("CREATOR", "APPROVER", "RECEIVER", "ASSET_MANAGER", "ADMIN");
    static final Set<String> SCHEDULE_TYPES = Set.of("DELIVERY", "INSTALLATION", "COMMISSIONING", "PAYMENT");
    static final Set<String> PAYMENT_TRIGGERS = Set.of("ADVANCE", "DELIVERY", "INSTALLATION", "COMMISSIONING", "FINAL");
    static final Set<String> CONDITIONS = Set.of("GOOD", "DAMAGED", "PARTIAL");
    static final Set<String> INSPECTION = Set.of("NOT_REQUIRED", "PENDING", "PASSED", "FAILED");
    static final Set<String> DOC_TYPES = Set.of("OTHER", "QUOTATION", "TECH_SPEC", "APPROVAL", "RECEIPT", "COMPLETION", "INSPECTION",
            "INSTALLATION_EVIDENCE", "COMMISSIONING_EVIDENCE");
    static final Set<String> WARRANTY_START = Set.of("DELIVERY", "INSTALLATION", "COMMISSIONING");
    static final Set<String> ATTACHMENT_TYPES = Set.of("application/pdf", "image/png", "image/jpeg",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    static final Map<String, String> SORT_COLUMNS = Map.of(
            "poNumber", "po_number", "poDate", "po_date", "vendorName", "vendor_name", "grandTotal", "grand_total",
            "status", "status", "validityEnd", "validity_end", "expectedDeliveryDate", "expected_delivery_date",
            "createdAt", "created_at");
    static final long MAX_ATTACHMENT_BYTES = 5L * 1024 * 1024;
    static final BigDecimal HUNDRED = new BigDecimal("100");
    static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final BigDecimal approvalLimit;
    private final boolean allowDirectCreation;

    public CapitalPoService(JdbcTemplate jdbc, ObjectMapper objectMapper,
                            @Value("${capital-po.approval-limit:}") String approvalLimitRaw,
                            @Value("${capital-po.allow-direct-creation:true}") boolean allowDirectCreation) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.approvalLimit = (approvalLimitRaw == null || approvalLimitRaw.isBlank()) ? null : new BigDecimal(approvalLimitRaw.trim());
        this.allowDirectCreation = allowDirectCreation;
    }

    // ================================================================== identity

    public Actor actor(String name, String role) {
        if (name == null || name.isBlank()) throw new CapitalPoException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        String r = (role == null || role.isBlank()) ? "CREATOR" : role.trim().toUpperCase(Locale.ROOT);
        if (!ROLES.contains(r)) throw new CapitalPoException(HttpStatus.FORBIDDEN, "Unknown role: " + role);
        return new Actor(name.trim(), r);
    }

    private static boolean has(Actor a, String... roles) {
        if ("ADMIN".equals(a.role())) return true;
        for (String r : roles) if (r.equals(a.role())) return true;
        return false;
    }

    private static void require(Actor a, String... roles) {
        if (!has(a, roles)) throw new CapitalPoException(HttpStatus.FORBIDDEN, "Role " + a.role() + " is not allowed to perform this action.");
    }

    // ================================================================== meta

    public List<Map<String, Object>> categories(boolean activeOnly) {
        return jdbc.queryForList("SELECT name, treatment FROM public.capital_po_asset_categories "
                + (activeOnly ? "WHERE is_active = TRUE " : "") + "ORDER BY sort_order, name");
    }

    @Transactional
    public Map<String, Object> addCategory(CategoryRequest req, Actor actor) {
        require(actor, "APPROVER");
        String name = req.name() == null ? "" : req.name().trim();
        if (name.isEmpty() || name.length() > 150) throw bad("Category name is required (max 150 characters).");
        String treatment = req.treatment() == null || req.treatment().isBlank() ? "FIXED_ASSET" : req.treatment().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("FIXED_ASSET", "INVENTORY").contains(treatment)) throw bad("Treatment must be FIXED_ASSET or INVENTORY.");
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM public.capital_po_asset_categories WHERE parent_group = 'Assets' AND LOWER(name) = LOWER(?)", Integer.class, name);
        if (exists != null && exists > 0) throw new CapitalPoException(HttpStatus.CONFLICT, "Category already exists: " + name);
        jdbc.update("INSERT INTO public.capital_po_asset_categories (parent_group, name, treatment, sort_order) VALUES ('Assets', ?, ?, "
                + "(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.capital_po_asset_categories))", name, treatment);
        return Map.of("name", name, "treatment", treatment, "parentGroup", "Assets");
    }

    public List<Map<String, Object>> hsnCodes(String type) {
        return jdbc.queryForList("SELECT hsn_sac_code AS code, description, gst_rate AS \"gstRate\", cess_rate AS \"cessRate\" "
                + "FROM public.hsn_tax_master WHERE type = ? AND is_active = TRUE ORDER BY hsn_sac_code", type);
    }

    /** Validates and calculates a Capital PO without saving. The form uses it for live totals. */
    public Map<String, Object> preview(PoRequest req, Actor actor) {
        require(actor, "CREATOR", "APPROVER");
        return camel(prepare(req, actor, null).header());
    }

    /** Approved Capital PRs with the quantity still available to a new Capital PO, after other capital POs. */
    public List<Map<String, Object>> eligiblePrs() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> pr : jdbc.queryForList("SELECT pr_number, status, department FROM public.purchase_requisitions "
                + "WHERE pr_type = 'Capital Goods / Asset' AND status IN ('Approved', 'Partially Ordered') ORDER BY pr_date DESC, id DESC LIMIT 200")) {
            List<Map<String, Object>> items = new ArrayList<>();
            for (Map<String, Object> it : jdbc.queryForList(
                    "SELECT i.id, i.item_code, i.item_name, i.uom, (i.remaining_qty - COALESCE((SELECT SUM(l.quantity) FROM public.capital_po_lines l "
                            + "JOIN public.capital_purchase_orders p ON p.id = l.capital_po_id WHERE l.pr_item_id = i.id "
                            + "AND p.status NOT IN ('DRAFT', 'REJECTED', 'CANCELLED')), 0)) AS available_qty "
                            + "FROM public.purchase_requisition_items i WHERE i.pr_number = ? ORDER BY i.id", str(pr, "pr_number"))) {
                if (((BigDecimal) it.get("available_qty")).signum() > 0) items.add(camel(it));
            }
            if (!items.isEmpty()) {
                Map<String, Object> p = camel(pr);
                p.put("items", items);
                out.add(p);
            }
        }
        return out;
    }

    public Map<String, Object> policy() {
        return Map.of("allowDirectCreation", allowDirectCreation,
                "approvalLimit", approvalLimit == null ? "" : approvalLimit.toPlainString());
    }

    // ================================================================== create / update

    @Transactional
    public Map<String, Object> create(PoRequest req, Actor actor) {
        require(actor, "CREATOR", "APPROVER");
        if (notBlank(req.clientRequestId())) {
            List<Long> dup = jdbc.queryForList("SELECT id FROM public.capital_purchase_orders WHERE client_request_id = ?", Long.class, req.clientRequestId().trim());
            if (!dup.isEmpty()) return details(dup.get(0), actor); // duplicate submission: return the PO already created
        }
        Prepared p = prepare(req, actor, null);
        Map<String, Object> h = p.header();
        h.put("po_number", nextNumber("CPO"));
        h.put("client_request_id", blankToNull(req.clientRequestId()));
        h.put("status", "DRAFT");
        h.put("receipt_status", "NOT_RECEIVED");
        h.put("installation_status", "NOT_REQUIRED");
        h.put("commissioning_status", "NOT_REQUIRED");
        h.put("asset_registration_status", "NOT_REGISTERED");
        h.put("schedule_enabled", false);
        h.put("version", 0);
        h.put("created_by", actor.name());
        h.put("modified_by", actor.name());
        long id = insertRow("public.capital_purchase_orders", h);
        insertLines(id, p.lines());
        recomputeRollups(id);
        history(id, "CREATED", null, "DRAFT", actor, null);
        return details(id, actor);
    }

    @Transactional
    public Map<String, Object> update(long id, PoRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        String status = str(row, "status");
        if (!Set.of("DRAFT", "REJECTED").contains(status)) {
            throw new CapitalPoException(HttpStatus.CONFLICT, "Only draft or rejected Capital POs can be edited. Use an amendment for " + status + " POs.");
        }
        requireCreatorOrApprover(actor, row);
        if (req.version() == null || !req.version().equals(row.get("version"))) {
            throw new CapitalPoException(HttpStatus.CONFLICT, "This PO was changed by someone else. Reload and try again.");
        }
        Prepared p = prepare(req, actor, id);
        Map<String, Object> h = p.header();
        h.put("version", ((Integer) row.get("version")) + 1);
        h.put("modified_by", actor.name());
        h.put("modified_at", Timestamp.from(java.time.Instant.now()));
        h.put("status", "DRAFT");
        if (Boolean.TRUE.equals(row.get("schedule_enabled"))) {
            jdbc.update("DELETE FROM public.capital_po_schedules WHERE capital_po_id = ?", id);
            h.put("schedule_enabled", false);
            history(id, "SCHEDULE_CLEARED", status, "DRAFT", actor, "Lines were re-entered; re-enter the schedule.");
        }
        updateRow("public.capital_purchase_orders", id, h);
        jdbc.update("DELETE FROM public.capital_po_lines WHERE capital_po_id = ?", id);
        insertLines(id, p.lines());
        recomputeRollups(id);
        history(id, "EDITED", status, "DRAFT", actor, null);
        return details(id, actor);
    }

    // ================================================================== approval workflow

    @Transactional
    public Map<String, Object> submit(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        requireCreatorOrApprover(actor, row);
        String from = str(row, "status");
        if (!Set.of("DRAFT", "REJECTED").contains(from)) throw conflict("Only drafts can be submitted. Current status: " + from);
        ensureNotExpired(row);
        revalidatePrLinks(id, row);
        return finish(id, row, "PENDING_APPROVAL", "SUBMITTED", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> approve(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        if (!"PENDING_APPROVAL".equals(str(row, "status"))) throw conflict("Only POs pending approval can be approved.");
        if (!"ADMIN".equals(actor.role()) && actor.name().equalsIgnoreCase(str(row, "created_by"))) {
            throw new CapitalPoException(HttpStatus.FORBIDDEN, "The creator cannot approve their own Capital PO.");
        }
        BigDecimal total = (BigDecimal) row.get("grand_total");
        if (approvalLimit != null && !"ADMIN".equals(actor.role()) && total.compareTo(approvalLimit) > 0) {
            throw new CapitalPoException(HttpStatus.FORBIDDEN, "Total " + total + " exceeds the CAPEX approval limit " + approvalLimit + " for role " + actor.role() + ".");
        }
        return finish(id, row, "APPROVED", "APPROVE", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> reject(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        if (!"PENDING_APPROVAL".equals(str(row, "status"))) throw conflict("Only POs pending approval can be rejected.");
        requireReason(req.comments(), "Rejection reason");
        return finish(id, row, "REJECTED", "REJECT", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> issue(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        if (!"APPROVED".equals(str(row, "status"))) throw conflict("Only approved POs can be sent to the vendor.");
        ensureNotExpired(row);
        return finish(id, row, "SENT_TO_VENDOR", "SENT_TO_VENDOR", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> cancel(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        requireReason(req.comments(), "Cancellation reason");
        String from = str(row, "status");
        if (!Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED", "SENT_TO_VENDOR").contains(from)) {
            throw conflict("Cannot cancel a " + from + " Capital PO.");
        }
        if (Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED").contains(from)) requireCreatorOrApprover(actor, row);
        else require(actor, "APPROVER");
        if (((BigDecimal) sumLines(id, "received_qty")).signum() > 0) {
            throw conflict("Goods have been received against this PO. It cannot be cancelled; close it instead.");
        }
        jdbc.update("UPDATE public.capital_purchase_orders SET cancel_reason = ? WHERE id = ?", req.comments(), id);
        return finish(id, row, "CANCELLED", "CANCEL", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> close(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        if (!"SENT_TO_VENDOR".equals(str(row, "status"))) throw conflict("Only POs sent to the vendor can be closed.");
        if (!"FULLY_RECEIVED".equals(str(row, "receipt_status"))) requireReason(req.comments(), "Short-close reason (goods not fully received)");
        return finish(id, row, "CLOSED", "CLOSE", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> extendValidity(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        requireReason(req.comments(), "Extension reason");
        String status = str(row, "status");
        if (Set.of("DRAFT", "CANCELLED", "CLOSED").contains(status)) throw conflict("Validity cannot be extended for a " + status + " PO.");
        LocalDate oldEnd = ld(row.get("validity_end"));
        LocalDate newEnd = req.newValidityEnd();
        if (newEnd == null) throw bad("New validity end date is required.");
        if (!newEnd.isAfter(oldEnd)) throw bad("New validity end must be after the current end date " + oldEnd + ".");
        if (newEnd.isBefore(today())) throw bad("New validity end cannot be in the past.");
        jdbc.update("UPDATE public.capital_purchase_orders SET validity_end = ?, modified_by = ?, modified_at = NOW(), version = version + 1 WHERE id = ?",
                newEnd, actor.name(), id);
        jdbc.update("INSERT INTO public.capital_po_validity_history (capital_po_id, old_validity_end, new_validity_end, reason, changed_by) VALUES (?,?,?,?,?)",
                id, oldEnd, newEnd, req.comments(), actor.name());
        history(id, "VALIDITY_EXTENDED", status, status, actor, req.comments());
        return details(id, actor);
    }

    // ================================================================== amendments (approved values change only after re-approval)

    @Transactional
    public Map<String, Object> proposeAmendment(long id, PoRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "CREATOR", "APPROVER");
        String status = str(row, "status");
        if (!Set.of("APPROVED", "SENT_TO_VENDOR").contains(status)) throw conflict("Amendments are only for approved or sent POs. Current status: " + status);
        requireReason(req.reason(), "Amendment reason");
        Integer pending = jdbc.queryForObject("SELECT COUNT(*) FROM public.capital_po_amendments WHERE capital_po_id = ? AND status = 'PENDING'", Integer.class, id);
        if (pending != null && pending > 0) throw conflict("A pending amendment already exists for this PO. Approve or reject it first.");
        if (req.lines() == null || req.lines().stream().anyMatch(l -> l.lineNo() == null)) {
            throw bad("Every line in an amendment must carry its existing line number (lineNo).");
        }
        Prepared p = prepare(req, actor, id);
        Map<String, Object> changes = new LinkedHashMap<>();
        for (String key : List.of("grand_total", "taxable_total", "tax_total", "validity_end", "expected_delivery_date", "vendor_code")) {
            Object oldV = row.get(key), newV = p.header().get(key);
            if (!Objects.equals(normalize(oldV), normalize(newV))) changes.put(key, Map.of("old", String.valueOf(normalize(oldV)), "new", String.valueOf(normalize(newV))));
        }
        Map<Integer, Map<String, Object>> existing = existingLines(id);
        for (Map<String, Object> nl : p.lines()) {
            Map<String, Object> ol = existing.get((Integer) nl.get("line_no"));
            if (ol == null) { changes.put("line " + nl.get("line_no"), "added"); continue; }
            BigDecimal received = (BigDecimal) ol.get("received_qty");
            if (((BigDecimal) nl.get("quantity")).compareTo(received) < 0) {
                throw conflict("Line " + nl.get("line_no") + " cannot go below the already received quantity " + received + ".");
            }
            if (((BigDecimal) nl.get("unit_price")).compareTo((BigDecimal) ol.get("unit_price")) != 0
                    || ((BigDecimal) nl.get("quantity")).compareTo((BigDecimal) ol.get("quantity")) != 0) {
                changes.put("line " + nl.get("line_no"), Map.of("qty", String.valueOf(ol.get("quantity")) + " → " + nl.get("quantity"),
                        "unitPrice", String.valueOf(ol.get("unit_price")) + " → " + nl.get("unit_price")));
            }
        }
        for (Integer no : existing.keySet()) {
            if (p.lines().stream().noneMatch(l -> no.equals(l.get("line_no")))) {
                if (((BigDecimal) existing.get(no).get("received_qty")).signum() > 0) throw conflict("Line " + no + " has received goods and cannot be removed.");
                changes.put("line " + no, "removed");
            }
        }
        if (changes.isEmpty()) throw bad("No change detected in the amendment.");
        int rev = jdbc.queryForObject("SELECT COALESCE(MAX(revision_no), 0) + 1 FROM public.capital_po_amendments WHERE capital_po_id = ?", Integer.class, id);
        try {
            jdbc.update("INSERT INTO public.capital_po_amendments (capital_po_id, revision_no, status, reason, payload_json, changes_json, proposed_by) "
                    + "VALUES (?,?,'PENDING',?,?,?,?)", id, rev, req.reason().trim(), objectMapper.writeValueAsString(req),
                    objectMapper.writeValueAsString(changes), actor.name());
        } catch (JsonProcessingException e) {
            throw new CapitalPoException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store amendment: " + e.getMessage());
        }
        history(id, "AMENDMENT_PROPOSED", status, status, actor, "Revision " + rev + ": " + req.reason());
        return details(id, actor);
    }

    @Transactional
    public Map<String, Object> decideAmendment(long id, AmendmentDecision d, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "APPROVER");
        List<Map<String, Object>> am = jdbc.queryForList("SELECT * FROM public.capital_po_amendments WHERE id = ? AND capital_po_id = ? FOR UPDATE", d.amendmentId(), id);
        if (am.isEmpty()) throw notFound("Amendment not found for this PO.");
        Map<String, Object> a = am.get(0);
        if (!"PENDING".equals(str(a, "status"))) throw conflict("This amendment is already " + str(a, "status") + ".");
        if (!"ADMIN".equals(actor.role()) && actor.name().equalsIgnoreCase(str(a, "proposed_by"))) {
            throw new CapitalPoException(HttpStatus.FORBIDDEN, "The person who proposed the amendment cannot approve it.");
        }
        boolean approve = Boolean.TRUE.equals(d.approve());
        if (!approve) requireReason(d.comments(), "Rejection reason");
        jdbc.update("UPDATE public.capital_po_amendments SET status = ?, decided_by = ?, decided_at = NOW(), decision_comments = ? WHERE id = ?",
                approve ? "APPROVED" : "REJECTED", actor.name(), blankToNull(d.comments()), d.amendmentId());
        if (approve) {
            PoRequest payload;
            try {
                payload = objectMapper.readValue(str(a, "payload_json"), PoRequest.class);
            } catch (JsonProcessingException e) {
                throw new CapitalPoException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored amendment is unreadable: " + e.getMessage());
            }
            Prepared p = prepare(payload, actor, id);
            applyPrepared(id, row, p, actor);
            history(id, "AMENDMENT_APPROVED", str(row, "status"), str(row, "status"), actor, d.comments());
        } else {
            history(id, "AMENDMENT_REJECTED", str(row, "status"), str(row, "status"), actor, d.comments());
        }
        return details(id, actor);
    }

    private void applyPrepared(long id, Map<String, Object> row, Prepared p, Actor actor) {
        Map<String, Object> h = p.header();
        h.put("version", ((Integer) row.get("version")) + 1);
        h.put("modified_by", actor.name());
        h.put("modified_at", Timestamp.from(java.time.Instant.now()));
        h.put("status", row.get("status"));
        updateRow("public.capital_purchase_orders", id, h);
        Map<Integer, Map<String, Object>> existing = existingLines(id);
        for (Map<String, Object> nl : p.lines()) {
            Integer no = (Integer) nl.get("line_no");
            Map<String, Object> cols = new LinkedHashMap<>(nl);
            cols.remove("treatment");
            cols.remove("line_no");
            if (existing.containsKey(no)) {
                BigDecimal received = (BigDecimal) existing.get(no).get("received_qty");
                if (((BigDecimal) nl.get("quantity")).compareTo(received) < 0) {
                    throw conflict("Line " + no + " cannot go below the already received quantity " + received + ".");
                }
                // Installation / commissioning progress is owned by its own workflow; an amendment never resets it.
                for (String progress : List.of("installation_status", "installation_date", "installation_remarks",
                        "commissioning_status", "commissioning_date", "commissioning_remarks", "responsible_team")) {
                    cols.remove(progress);
                }
                updateRow("public.capital_po_lines", (Long) existing.get(no).get("id"), cols);
            } else {
                cols.put("capital_po_id", id);
                cols.put("line_no", no);
                insertRow("public.capital_po_lines", cols);
            }
        }
        for (Map.Entry<Integer, Map<String, Object>> e : existing.entrySet()) {
            boolean kept = p.lines().stream().anyMatch(l -> e.getKey().equals(l.get("line_no")));
            if (!kept) {
                if (((BigDecimal) e.getValue().get("received_qty")).signum() > 0) throw conflict("Line " + e.getKey() + " has received goods and cannot be removed.");
                jdbc.update("DELETE FROM public.capital_po_lines WHERE id = ?", e.getValue().get("id"));
            }
        }
        validatePaymentTotals(id, (BigDecimal) h.get("grand_total"));
        recomputeRollups(id);
    }

    // ================================================================== schedules

    @Transactional
    public Map<String, Object> saveSchedule(long id, ScheduleRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "CREATOR", "APPROVER");
        String status = str(row, "status");
        if (!Set.of("DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT_TO_VENDOR", "REJECTED").contains(status)) {
            throw conflict("Schedule cannot be changed for a " + status + " PO.");
        }
        jdbc.update("DELETE FROM public.capital_po_schedules WHERE capital_po_id = ?", id);
        if (!Boolean.TRUE.equals(req.enabled())) {
            jdbc.update("UPDATE public.capital_purchase_orders SET schedule_enabled = FALSE, modified_by = ?, modified_at = NOW() WHERE id = ?", actor.name(), id);
            history(id, "SCHEDULE_DISABLED", status, status, actor, null);
            return details(id, actor);
        }
        LocalDate poDate = ld(row.get("po_date"));
        LocalDate validityEnd = ld(row.get("validity_end"));
        BigDecimal grand = (BigDecimal) row.get("grand_total");
        List<ScheduleRow> rows = req.rows() == null ? List.of() : req.rows();
        if (rows.isEmpty()) throw bad("Add at least one schedule entry, or turn scheduling off.");
        Map<String, Integer> seq = new HashMap<>();
        Map<Integer, BigDecimal> plannedQtyByLine = new HashMap<>();
        BigDecimal paymentTotal = BigDecimal.ZERO;
        for (ScheduleRow s : rows) {
            String type = upper(s.scheduleType());
            if (!SCHEDULE_TYPES.contains(type)) throw bad("Schedule type must be DELIVERY, INSTALLATION, COMMISSIONING or PAYMENT.");
            Long lineId = null;
            if (!"PAYMENT".equals(type)) {
                if (s.lineNo() == null) throw bad(type + " entries must reference a line number.");
                Map<String, Object> line = lineByNo(id, s.lineNo());
                if (line == null) throw bad("Line " + s.lineNo() + " does not exist on this PO.");
                lineId = (Long) line.get("id");
                if ("INSTALLATION".equals(type) && !Boolean.TRUE.equals(line.get("installation_required"))) throw bad("Line " + s.lineNo() + " does not require installation.");
                if ("COMMISSIONING".equals(type) && !Boolean.TRUE.equals(line.get("commissioning_required"))) throw bad("Line " + s.lineNo() + " does not require commissioning.");
            }
            if (s.plannedDate() != null && (s.plannedDate().isBefore(poDate) || s.plannedDate().isAfter(validityEnd))) {
                throw bad("Planned date " + s.plannedDate() + " must be between the PO date and the validity end " + validityEnd + ".");
            }
            BigDecimal amount = s.plannedAmount() == null ? BigDecimal.ZERO : CapitalPoCalculator.money(s.plannedAmount());
            if (amount.signum() < 0) throw bad("Planned amount cannot be negative.");
            if ("DELIVERY".equals(type)) {
                if (s.plannedQty() == null || s.plannedQty().signum() <= 0) throw bad("Planned quantity for a delivery must be greater than zero.");
                if (s.plannedDate() == null) throw bad("Delivery date is required.");
                plannedQtyByLine.merge(s.lineNo(), s.plannedQty(), BigDecimal::add);
            }
            if (("INSTALLATION".equals(type) || "COMMISSIONING".equals(type)) && s.plannedDate() == null) throw bad(type + " date is required.");
            String trigger = null;
            if ("PAYMENT".equals(type)) {
                if (amount.signum() <= 0) throw bad("Payment milestone amount must be greater than zero.");
                trigger = upper(s.triggerEvent());
                if (trigger == null || !PAYMENT_TRIGGERS.contains(trigger)) throw bad("Payment trigger must be ADVANCE, DELIVERY, INSTALLATION, COMMISSIONING or FINAL.");
                paymentTotal = paymentTotal.add(amount);
            }
            int n = seq.merge(type, 1, Integer::sum);
            jdbc.update("INSERT INTO public.capital_po_schedules (capital_po_id, line_id, schedule_type, sequence_no, planned_date, planned_qty, "
                            + "planned_amount, trigger_event, description, responsible_department, responsible_contact) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    id, lineId, type, n, s.plannedDate(), s.plannedQty(), amount, trigger, blankToNull(s.description()),
                    blankToNull(s.responsibleDepartment()), blankToNull(s.responsibleContact()));
        }
        for (Map.Entry<Integer, BigDecimal> e : plannedQtyByLine.entrySet()) {
            BigDecimal lineQty = (BigDecimal) lineByNo(id, e.getKey()).get("quantity");
            if (e.getValue().compareTo(lineQty) > 0) throw bad("Planned delivery quantity for line " + e.getKey() + " (" + e.getValue() + ") exceeds the line quantity " + lineQty + ".");
        }
        if (paymentTotal.compareTo(grand) > 0) throw bad("Payment milestones (" + paymentTotal + ") exceed the PO total " + grand + ".");
        jdbc.update("UPDATE public.capital_purchase_orders SET schedule_enabled = TRUE, modified_by = ?, modified_at = NOW() WHERE id = ?", actor.name(), id);
        history(id, "SCHEDULE_SAVED", status, status, actor, rows.size() + " schedule entries");
        return details(id, actor);
    }

    private void validatePaymentTotals(long id, BigDecimal grand) {
        BigDecimal paid = jdbc.queryForObject("SELECT COALESCE(SUM(planned_amount), 0) FROM public.capital_po_schedules WHERE capital_po_id = ? AND schedule_type = 'PAYMENT'", BigDecimal.class, id);
        if (paid != null && paid.compareTo(grand) > 0) throw conflict("Existing payment milestones (" + paid + ") exceed the new PO total " + grand + ". Update the schedule first.");
    }

    // ================================================================== receipts (physical), inspection

    @Transactional
    public Map<String, Object> recordReceipt(long id, ReceiptRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "RECEIVER", "ASSET_MANAGER");
        if (!notBlank(req.idempotencyKey())) throw bad("Receipt submission key is missing; refresh and try again.");
        List<Long> dup = jdbc.queryForList("SELECT id FROM public.capital_po_receipts WHERE capital_po_id = ? AND idempotency_key = ?", Long.class, id, req.idempotencyKey().trim());
        if (!dup.isEmpty()) return details(id, actor); // duplicate submission: nothing new is written
        String status = str(row, "status");
        if (!"SENT_TO_VENDOR".equals(status)) throw conflict("Goods can be received only after the PO is sent to the vendor. Current status: " + status);
        ensureNotExpired(row);
        LocalDate today = today();
        LocalDate receiptDate = req.receiptDate() == null ? today : req.receiptDate();
        if (receiptDate.isAfter(today) || receiptDate.isBefore(ld(row.get("po_date")))) throw bad("Receipt date must be between the PO date and today.");
        if (!notBlank(req.deliveryChallanNo())) throw bad("Delivery challan number is required.");
        String condition = upper(req.receivedCondition());
        if (condition == null || !CONDITIONS.contains(condition)) throw bad("Received condition must be GOOD, DAMAGED or PARTIAL.");
        String insp = req.inspectionStatus() == null ? "NOT_REQUIRED" : upper(req.inspectionStatus());
        if (!INSPECTION.contains(insp)) throw bad("Invalid inspection status.");
        if (req.lines() == null || req.lines().isEmpty()) throw bad("Add at least one line to the receipt.");

        Set<Integer> seen = new HashSet<>();
        List<Object[]> plan = new ArrayList<>();
        for (ReceiptLine rl : req.lines()) {
            if (rl.lineNo() == null) throw bad("Each receipt line needs a PO line number.");
            if (!seen.add(rl.lineNo())) throw bad("Line " + rl.lineNo() + " appears twice in this receipt.");
            Map<String, Object> line = lineByNo(id, rl.lineNo());
            if (line == null) throw bad("Line " + rl.lineNo() + " does not exist on this PO.");
            BigDecimal qty = rl.qtyReceived();
            if (qty == null || qty.signum() <= 0) throw bad("Quantity received for line " + rl.lineNo() + " must be greater than zero.");
            BigDecimal ordered = (BigDecimal) line.get("quantity");
            BigDecimal received = (BigDecimal) line.get("received_qty");
            BigDecimal outstanding = ordered.subtract(received);
            if (qty.compareTo(outstanding) > 0) {
                throw conflict("Over-receiving blocked on line " + rl.lineNo() + ": ordered " + ordered + ", already received " + received
                        + ", outstanding " + outstanding + ", attempted " + qty + ".");
            }
            List<String> serials = parseSerials(rl.serialNumbers());
            if (!serials.isEmpty()) {
                int units = wholeUnits(qty, "Serial numbers on line " + rl.lineNo());
                if (serials.size() != units) throw bad("Line " + rl.lineNo() + ": enter one serial number per unit (" + units + " units, " + serials.size() + " serials).");
                if (new HashSet<>(serials).size() != serials.size()) throw bad("Duplicate serial numbers on line " + rl.lineNo() + ".");
                for (String s : serials) {
                    Integer used = jdbc.queryForObject("SELECT COUNT(*) FROM public.asset_master WHERE serial_number = ?", Integer.class, s);
                    if (used != null && used > 0) throw conflict("Serial number " + s + " is already registered as an asset.");
                }
            }
            plan.add(new Object[]{line, qty, String.join(",", serials)});
        }

        String number = nextNumber("CAR");
        jdbc.update("INSERT INTO public.capital_po_receipts (receipt_number, capital_po_id, idempotency_key, receipt_date, vendor_code, delivery_challan_no, "
                        + "invoice_reference, received_condition, inspection_status, remarks, received_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                number, id, req.idempotencyKey().trim(), receiptDate, str(row, "vendor_code"), req.deliveryChallanNo().trim(),
                blankToNull(req.invoiceReference()), condition, insp, blankToNull(req.remarks()), actor.name());
        long receiptId = jdbc.queryForObject("SELECT id FROM public.capital_po_receipts WHERE receipt_number = ?", Long.class, number);
        for (Object[] item : plan) {
            @SuppressWarnings("unchecked") Map<String, Object> line = (Map<String, Object>) item[0];
            BigDecimal qty = (BigDecimal) item[1];
            jdbc.update("INSERT INTO public.capital_po_receipt_lines (receipt_id, po_line_id, qty_received, serial_numbers) VALUES (?,?,?,?)",
                    receiptId, line.get("id"), qty, blankToNull((String) item[2]));
            jdbc.update("UPDATE public.capital_po_lines SET received_qty = received_qty + ? WHERE id = ?", qty, line.get("id"));
        }
        recomputeRollups(id);
        history(id, "RECEIPT_RECORDED", status, status, actor, number + " (" + plan.size() + " line(s))");
        return details(id, actor);
    }

    @Transactional
    public Map<String, Object> inspectReceipt(long id, long receiptId, InspectionRequest req, Actor actor) {
        lockRow(id);
        require(actor, "RECEIVER", "ASSET_MANAGER");
        String insp = upper(req.inspectionStatus());
        if (insp == null || !INSPECTION.contains(insp)) throw bad("Invalid inspection status.");
        int n = jdbc.update("UPDATE public.capital_po_receipts SET inspection_status = ?, remarks = COALESCE(?, remarks) WHERE id = ? AND capital_po_id = ?",
                insp, blankToNull(req.remarks()), receiptId, id);
        if (n == 0) throw notFound("Receipt not found for this PO.");
        history(id, "INSPECTION_" + insp, null, null, actor, req.remarks());
        return details(id, actor);
    }

    // ================================================================== installation & commissioning (separate from receipt)

    @Transactional
    public Map<String, Object> lineEvent(long id, int lineNo, String kind, LineEventRequest req, Actor actor) {
        lockRow(id);
        require(actor, "RECEIVER", "ASSET_MANAGER");
        Map<String, Object> line = lineByNo(id, lineNo);
        if (line == null) throw notFound("Line " + lineNo + " not found.");
        boolean install = "INSTALLATION".equals(kind);
        if (!Boolean.TRUE.equals(line.get(install ? "installation_required" : "commissioning_required"))) {
            throw bad("Line " + lineNo + " does not require " + (install ? "installation" : "commissioning") + ".");
        }
        if (((BigDecimal) line.get("received_qty")).signum() <= 0) throw conflict("Nothing has been received for line " + lineNo + " yet.");
        String current = str(line, install ? "installation_status" : "commissioning_status");
        if ("COMPLETED".equals(current)) throw conflict("This line is already marked completed.");
        String status = upper(req.status());
        if (!Set.of("IN_PROGRESS", "COMPLETED").contains(status)) throw bad("Status must be IN_PROGRESS or COMPLETED.");
        LocalDate eventDate = req.eventDate() == null ? today() : req.eventDate();
        if (eventDate.isAfter(today())) throw bad("Date cannot be in the future.");
        if ("COMPLETED".equals(status)) {
            // Evidence is specific to the activity: an installation certificate does not prove commissioning.
            String evidenceType = install ? "INSTALLATION_EVIDENCE" : "COMMISSIONING_EVIDENCE";
            Integer evidence = jdbc.queryForObject("SELECT COUNT(*) FROM public.capital_po_attachments WHERE capital_po_id = ? AND line_id = ? AND doc_type = ?",
                    Integer.class, id, line.get("id"), evidenceType);
            if (evidence == null || evidence == 0) {
                throw conflict("Upload " + (install ? "installation" : "commissioning") + " evidence for line " + lineNo + " before marking it completed.");
            }
        }
        String prefix = install ? "installation" : "commissioning";
        jdbc.update("UPDATE public.capital_po_lines SET " + prefix + "_status = ?, " + prefix + "_date = ?, " + prefix + "_remarks = ?, "
                + "responsible_team = COALESCE(?, responsible_team) WHERE id = ?", status, eventDate, blankToNull(req.remarks()),
                blankToNull(req.responsibleTeam()), line.get("id"));
        recomputeRollups(id);
        history(id, install ? "INSTALLATION_UPDATED" : "COMMISSIONING_UPDATED", null, null, actor, "Line " + lineNo + " → " + status);
        return details(id, actor);
    }

    // ================================================================== asset registration (controlled)

    @Transactional
    public Map<String, Object> registerAssets(long id, RegisterRequest req, Actor actor) {
        Map<String, Object> row = lockRow(id);
        require(actor, "ASSET_MANAGER");
        if (req.receiptLineId() == null) throw bad("Select the received line to register.");
        List<Map<String, Object>> rl = jdbc.queryForList(
                "SELECT rl.id AS receipt_line_id, rl.qty_received, rl.serial_numbers, r.inspection_status, l.* FROM public.capital_po_receipt_lines rl "
                        + "JOIN public.capital_po_receipts r ON r.id = rl.receipt_id JOIN public.capital_po_lines l ON l.id = rl.po_line_id "
                        + "WHERE rl.id = ? AND r.capital_po_id = ?", req.receiptLineId(), id);
        if (rl.isEmpty()) throw notFound("Receipt line not found for this PO.");
        Map<String, Object> r = rl.get(0);
        String insp = str(r, "inspection_status");
        if ("PENDING".equals(insp)) throw conflict("Inspection is pending for this receipt. Complete inspection before registering assets.");
        if ("FAILED".equals(insp)) throw conflict("Inspection failed for this receipt. Its goods cannot be registered as assets.");
        String category = str(r, "asset_category");
        String treatment = jdbc.queryForList("SELECT treatment FROM public.capital_po_asset_categories WHERE name = ? AND parent_group = 'Assets'", String.class, category)
                .stream().findFirst().orElse("FIXED_ASSET");
        if (!"FIXED_ASSET".equals(treatment)) throw conflict("Category " + category + " is treated as inventory under company policy; it is not registered as a fixed asset.");
        if (Boolean.TRUE.equals(r.get("installation_required")) && !"COMPLETED".equals(str(r, "installation_status"))) {
            throw conflict("Installation must be completed before this asset can be registered.");
        }
        if (Boolean.TRUE.equals(r.get("commissioning_required")) && !"COMPLETED".equals(str(r, "commissioning_status"))) {
            throw conflict("Commissioning must be completed before this asset can be registered.");
        }
        Integer already = jdbc.queryForObject("SELECT COUNT(*) FROM public.asset_master WHERE receipt_line_id = ?", Integer.class, req.receiptLineId());
        if (already != null && already > 0) throw conflict("Assets for this receipt line are already registered.");
        BigDecimal qty = (BigDecimal) r.get("qty_received");
        int units = wholeUnits(qty, "Assets");
        List<String> serials = parseSerials(req.serialNumbers());
        if (!serials.isEmpty() && serials.size() != units) throw bad("Enter one serial number per unit: " + units + " units, " + serials.size() + " serials.");
        if (new HashSet<>(serials).size() != serials.size()) throw bad("Duplicate serial numbers.");
        LocalDate today = today();
        try {
            for (int i = 1; i <= units; i++) {
                String code = nextAssetCode();
                jdbc.update("INSERT INTO public.asset_master (asset_code, asset_name, asset_category, asset_description, manufacturer, model_number, "
                                + "serial_number, plant_location, department_code, department_name, capital_po_id, capital_po_line_id, receipt_line_id, "
                                + "unit_no, capitalization_date, useful_life_years, warranty_months, warranty_start_condition, registered_by) "
                                + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        code, str(r, "asset_name"), category, str(r, "asset_description"), str(r, "manufacturer"), str(r, "model_number"),
                        serials.isEmpty() ? null : serials.get(i - 1), blankToNull(str(r, "delivery_location")) == null ? str(row, "plant_location") : str(r, "delivery_location"),
                        str(row, "department_code"), str(row, "department_name"), id, r.get("id"), req.receiptLineId(), i, today,
                        r.get("useful_life_years"), r.get("warranty_months"), str(r, "warranty_start_condition"), actor.name());
            }
        } catch (DuplicateKeyException ex) {
            throw conflict("Duplicate asset or serial number detected. Nothing was registered.");
        }
        recomputeRollups(id);
        history(id, "ASSET_REGISTERED", str(row, "status"), str(row, "status"), actor, units + " unit(s) registered from receipt line " + req.receiptLineId());
        return details(id, actor);
    }

    // ================================================================== attachments

    @Transactional
    public Map<String, Object> addAttachment(long id, AttachmentRequest req, Actor actor) {
        lockRow(id);
        String type = req.contentType() == null ? "" : req.contentType().trim().toLowerCase(Locale.ROOT);
        if (!ATTACHMENT_TYPES.contains(type)) throw bad("Unsupported file type. Allowed: PDF, PNG, JPEG, XLSX, DOCX.");
        String name = req.fileName() == null ? "" : req.fileName().replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        if (name.isEmpty() || name.length() > 255) throw bad("A valid file name is required.");
        if (!notBlank(req.contentBase64())) throw bad("File content is required.");
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(req.contentBase64().replaceAll("^data:[^,]*,", ""));
        } catch (IllegalArgumentException e) {
            throw bad("File content is not valid base64.");
        }
        if (bytes.length == 0 || bytes.length > MAX_ATTACHMENT_BYTES) throw bad("File must be between 1 byte and 5 MB.");
        String docType = req.docType() == null ? "OTHER" : upper(req.docType());
        if (!DOC_TYPES.contains(docType)) throw bad("Invalid document type.");
        Long lineId = null;
        if (req.lineNo() != null) {
            Map<String, Object> line = lineByNo(id, req.lineNo());
            if (line == null) throw bad("Line " + req.lineNo() + " does not exist on this PO.");
            lineId = (Long) line.get("id");
        }
        if (req.receiptId() != null) {
            Integer ok = jdbc.queryForObject("SELECT COUNT(*) FROM public.capital_po_receipts WHERE id = ? AND capital_po_id = ?", Integer.class, req.receiptId(), id);
            if (ok == null || ok == 0) throw bad("Receipt does not belong to this PO.");
        }
        jdbc.update("INSERT INTO public.capital_po_attachments (capital_po_id, line_id, receipt_id, doc_type, file_name, content_type, size_bytes, content, uploaded_by) "
                + "VALUES (?,?,?,?,?,?,?,?,?)", id, lineId, req.receiptId(), docType, name, type, bytes.length, bytes, actor.name());
        history(id, "ATTACHMENT_ADDED", null, null, actor, docType + ": " + name);
        return details(id, actor);
    }

    public Map<String, Object> attachment(long id, long attachmentId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT file_name, content_type, content FROM public.capital_po_attachments WHERE id = ? AND capital_po_id = ?", attachmentId, id);
        if (rows.isEmpty()) throw notFound("Attachment not found.");
        return rows.get(0);
    }

    // ================================================================== reads

    public Map<String, Object> list(ListFilter f, int page, int size, String sort, String dir, Actor actor) {
        List<String> conds = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        if (notBlank(f.poNumber())) { conds.add("LOWER(po_number) LIKE ?"); args.add("%" + f.poNumber().trim().toLowerCase(Locale.ROOT) + "%"); }
        if (notBlank(f.vendor())) { conds.add("(vendor_code = ? OR LOWER(vendor_name) LIKE ?)"); args.add(f.vendor().trim()); args.add("%" + f.vendor().trim().toLowerCase(Locale.ROOT) + "%"); }
        if (notBlank(f.assetCategory())) {
            conds.add("EXISTS (SELECT 1 FROM public.capital_po_lines l WHERE l.capital_po_id = capital_purchase_orders.id AND l.asset_category = ?)");
            args.add(f.assetCategory().trim());
        }
        if (notBlank(f.department())) { conds.add("department_name = ?"); args.add(f.department().trim()); }
        if (notBlank(f.plant())) { conds.add("plant_location = ?"); args.add(f.plant().trim()); }
        if (f.poFrom() != null) { conds.add("po_date >= ?"); args.add(f.poFrom()); }
        if (f.poTo() != null) { conds.add("po_date <= ?"); args.add(f.poTo()); }
        if (f.deliveryFrom() != null) { conds.add("expected_delivery_date >= ?"); args.add(f.deliveryFrom()); }
        if (f.deliveryTo() != null) { conds.add("expected_delivery_date <= ?"); args.add(f.deliveryTo()); }
        addEq(conds, args, "status", f.status());
        addEq(conds, args, "receipt_status", f.receiptStatus());
        addEq(conds, args, "installation_status", f.installationStatus());
        addEq(conds, args, "commissioning_status", f.commissioningStatus());
        addEq(conds, args, "asset_registration_status", f.registrationStatus());
        String where = conds.isEmpty() ? "" : " WHERE " + String.join(" AND ", conds);
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM public.capital_purchase_orders" + where, Integer.class, args.toArray());
        String column = SORT_COLUMNS.getOrDefault(sort, "po_date");
        String direction = "asc".equalsIgnoreCase(dir) ? "ASC" : "DESC";
        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add(safePage * safeSize);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, po_number, po_date, status, vendor_code, vendor_name, department_name, plant_location, pr_number, "
                        + "expected_delivery_date, validity_end, grand_total, receipt_status, installation_status, commissioning_status, "
                        + "asset_registration_status, created_by, created_at, version, "
                        + "(validity_end < CURRENT_DATE AND status NOT IN ('DRAFT','CANCELLED','CLOSED','REJECTED')) AS validity_expired, "
                        + "(SELECT STRING_AGG(DISTINCT l.asset_category, ', ') FROM public.capital_po_lines l WHERE l.capital_po_id = capital_purchase_orders.id) AS asset_categories, "
                        + "(SELECT STRING_AGG(l.asset_name, '; ' ORDER BY l.line_no) FROM public.capital_po_lines l WHERE l.capital_po_id = capital_purchase_orders.id) AS asset_summary, "
                        + "(SELECT COUNT(*) FROM public.capital_po_lines l WHERE l.capital_po_id = capital_purchase_orders.id) AS line_count, "
                        + "(SELECT a.status FROM public.capital_po_amendments a WHERE a.capital_po_id = capital_purchase_orders.id AND a.status = 'PENDING' LIMIT 1) AS pending_amendment_status "
                        + "FROM public.capital_purchase_orders" + where
                        + " ORDER BY " + column + " " + direction + ", id DESC LIMIT ? OFFSET ?", pageArgs.toArray());
        List<Map<String, Object>> content = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> c = camel(r);
            c.put("allowedActions", allowedActions(lockedCopy(r), actor));
            content.add(c);
        }
        int tot = total == null ? 0 : total;
        return Map.of("content", content, "page", safePage, "size", safeSize, "totalElements", tot,
                "totalPages", (int) Math.ceil(tot / (double) safeSize));
    }

    public Map<String, Object> details(long id, Actor actor) {
        Map<String, Object> row = headerRow(id);
        Map<String, Object> out = camel(row);
        out.put("pendingAmendmentStatus", row.get("pending_amendment_status"));
        out.put("allowedActions", allowedActions(row, actor));
        out.put("validityExpired", isExpired(row));
        out.put("lines", camelList(jdbc.queryForList("SELECT l.*, (l.quantity - l.received_qty) AS outstanding_qty FROM public.capital_po_lines l WHERE capital_po_id = ? ORDER BY line_no", id)));
        out.put("schedules", camelList(jdbc.queryForList("SELECT * FROM public.capital_po_schedules WHERE capital_po_id = ? ORDER BY schedule_type, sequence_no", id)));
        List<Map<String, Object>> receipts = camelList(jdbc.queryForList("SELECT * FROM public.capital_po_receipts WHERE capital_po_id = ? ORDER BY received_at, id", id));
        for (Map<String, Object> rc : receipts) {
            rc.put("lines", camelList(jdbc.queryForList(
                    "SELECT rl.id AS receipt_line_id, rl.qty_received, rl.serial_numbers, l.line_no, l.asset_name, l.id AS po_line_id, r.inspection_status "
                            + "FROM public.capital_po_receipt_lines rl JOIN public.capital_po_lines l ON l.id = rl.po_line_id "
                            + "JOIN public.capital_po_receipts r ON r.id = rl.receipt_id WHERE rl.receipt_id = ? ORDER BY l.line_no", toLong(rc.get("id")))));
        }
        out.put("receipts", receipts);
        out.put("assets", camelList(jdbc.queryForList("SELECT * FROM public.asset_master WHERE capital_po_id = ? ORDER BY asset_code", id)));
        out.put("history", camelList(jdbc.queryForList("SELECT * FROM public.capital_po_history WHERE capital_po_id = ? ORDER BY acted_at, id", id)));
        out.put("validityHistory", camelList(jdbc.queryForList("SELECT * FROM public.capital_po_validity_history WHERE capital_po_id = ? ORDER BY changed_at, id", id)));
        out.put("amendments", camelList(jdbc.queryForList(
                "SELECT id, revision_no, status, reason, changes_json, proposed_by, proposed_at, decided_by, decided_at, decision_comments "
                        + "FROM public.capital_po_amendments WHERE capital_po_id = ? ORDER BY revision_no", id)));
        out.put("attachments", camelList(jdbc.queryForList(
                "SELECT id, doc_type, line_id, receipt_id, file_name, content_type, size_bytes, uploaded_by, uploaded_at "
                        + "FROM public.capital_po_attachments WHERE capital_po_id = ? ORDER BY uploaded_at, id", id)));
        out.put("totals", Map.of(
                "outstandingQty", sumLines(id, "quantity").subtract(sumLines(id, "received_qty")),
                "receivedQty", sumLines(id, "received_qty")));
        return out;
    }

    public String printHtml(long id) {
        Map<String, Object> d = details(id, new Actor("print", "ADMIN"));
        StringBuilder sb = new StringBuilder();
        sb.append("<!doctype html><html><head><meta charset='utf-8'><title>").append(esc(d.get("poNumber"))).append("</title>")
          .append("<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}h1{font-size:18px;margin:0}")
          .append("h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #999}table{border-collapse:collapse;width:100%}")
          .append("td,th{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f2f2f2}.r{text-align:right}</style></head><body>");
        sb.append("<h1>CAPITAL PURCHASE ORDER (CAPEX)</h1><p>PO No: <b>").append(esc(d.get("poNumber"))).append("</b> &nbsp; Date: ")
          .append(esc(d.get("poDate"))).append(" &nbsp; Status: ").append(esc(d.get("status"))).append("</p>");
        sb.append("<h2>Vendor and delivery</h2><table>").append(row("Vendor", d.get("vendorName"))).append(row("GSTIN", d.get("vendorGstin")))
          .append(row("Address", d.get("vendorAddress"))).append(row("Plant / location", d.get("plantLocation")))
          .append(row("Delivery address", d.get("deliveryAddress"))).append(row("Expected delivery", d.get("expectedDeliveryDate")))
          .append(row("PO validity", d.get("validityEnd"))).append(row("PR reference", d.get("prNumber"))).append("</table>");
        sb.append("<h2>Assets</h2><table><tr><th>#</th><th>Category</th><th>Asset / description</th><th class='r'>Qty</th><th class='r'>Unit price</th>")
          .append("<th class='r'>Discount</th><th class='r'>Taxable</th><th class='r'>GST</th><th class='r'>Line total</th></tr>");
        for (Object o : (List<?>) d.get("lines")) {
            Map<?, ?> l = (Map<?, ?>) o;
            sb.append("<tr><td>").append(esc(l.get("lineNo"))).append("</td><td>").append(esc(l.get("assetCategory"))).append("</td><td><b>")
              .append(esc(l.get("assetName"))).append("</b><br>").append(esc(l.get("assetDescription"))).append("</td><td class='r'>")
              .append(esc(l.get("quantity"))).append(" ").append(esc(l.get("uom"))).append("</td><td class='r'>").append(money(l.get("unitPrice")))
              .append("</td><td class='r'>").append(money(l.get("discountAmount"))).append("</td><td class='r'>").append(money(l.get("taxableValue")))
              .append("</td><td class='r'>").append(money(l.get("gstAmount"))).append("</td><td class='r'>").append(money(l.get("lineTotal"))).append("</td></tr>");
        }
        sb.append("</table><h2>Totals</h2><table>").append(row("Taxable value", money(d.get("taxableTotal"))))
          .append(row("Additional charges (taxable)", money(d.get("chargesTaxable")))).append(row("CGST / SGST / IGST", money(d.get("cgstTotal")) + " / " + money(d.get("sgstTotal")) + " / " + money(d.get("igstTotal"))))
          .append(row("Total GST", money(d.get("taxTotal")))).append(row("Grand total", "<b>" + money(d.get("grandTotal")) + "</b> " + esc(d.get("currency"))))
          .append("</table>");
        sb.append("<h2>Terms</h2><table>").append(row("Payment terms", d.get("paymentTerms"))).append(row("Delivery terms", d.get("deliveryTerms")))
          .append(row("Warranty", d.get("warrantyTerms"))).append("</table>");
        sb.append("<p style='margin-top:40px'>Authorised signatory: ____________________</p></body></html>");
        return sb.toString();
    }

    // ================================================================== preparation & validation

    private Prepared prepare(PoRequest r, Actor actor, Long poId) {
        LocalDate today = today();
        Map<String, Object> h = new LinkedHashMap<>();

        // Vendor from Vendor Master (never trusted from the client)
        if (!notBlank(r.vendorCode())) throw bad("Select a vendor from the Vendor Master.");
        List<Map<String, Object>> vr = jdbc.queryForList("SELECT supplier_code, supplier_name, address, city, state, state_code, pincode, gstin, pan, status "
                + "FROM public.supplier_master WHERE supplier_code = ?", r.vendorCode().trim());
        if (vr.isEmpty()) throw bad("Vendor " + r.vendorCode() + " was not found in the Vendor Master.");
        Map<String, Object> v = vr.get(0);
        if (!"ACTIVE".equalsIgnoreCase(str(v, "status"))) throw bad("Vendor " + str(v, "supplier_code") + " is not active.");
        String gstin = blankToNull(str(v, "gstin"));
        String vendorState = blankToNull(str(v, "state_code"));
        if (vendorState == null && gstin != null && gstin.length() >= 2) vendorState = gstin.substring(0, 2);
        if (vendorState == null) throw bad("Vendor master has no state code for this vendor. Update the vendor before creating a PO.");
        h.put("vendor_code", str(v, "supplier_code"));
        h.put("vendor_name", str(v, "supplier_name"));
        h.put("vendor_address", joinNonBlank(", ", str(v, "address"), str(v, "city"), str(v, "state"), str(v, "pincode")));
        h.put("vendor_gstin", gstin);
        h.put("vendor_pan", blankToNull(str(v, "pan")));
        h.put("vendor_state", blankToNull(str(v, "state")));
        h.put("vendor_state_code", vendorState);

        // Company / place of supply / supply type
        String companyState = requireStateCode(r.companyStateCode(), "Company state code");
        String pos = notBlank(r.placeOfSupplyStateCode()) ? requireStateCode(r.placeOfSupplyStateCode(), "Place of supply state code") : companyState;
        boolean intra = vendorState.equals(pos);
        h.put("company_gstin", blankToNull(r.companyGstin()));
        h.put("company_state_code", companyState);
        h.put("place_of_supply_state_code", pos);
        h.put("supply_type", intra ? "INTRA" : "INTER");

        // Department from Department Master
        if (r.departmentId() == null) throw bad("Select the requesting department.");
        List<Map<String, Object>> dr = jdbc.queryForList("SELECT dept_code, department_name, status FROM public.department_master WHERE id = ?", r.departmentId());
        if (dr.isEmpty()) throw bad("Requesting department not found in Department Master.");
        if ("INACTIVE".equalsIgnoreCase(str(dr.get(0), "status"))) throw bad("Requesting department is inactive.");
        h.put("department_code", str(dr.get(0), "dept_code"));
        h.put("department_name", str(dr.get(0), "department_name"));
        h.put("requester", notBlank(r.requester()) ? r.requester().trim() : actor.name());
        if (!notBlank(r.plantLocation())) throw bad("Plant / location is required.");
        h.put("plant_location", r.plantLocation().trim());
        h.put("delivery_address", blankToNull(r.deliveryAddress()));
        h.put("currency", notBlank(r.currency()) ? r.currency().trim().toUpperCase(Locale.ROOT) : "INR");
        h.put("quotation_reference", blankToNull(r.quotationReference()));
        h.put("rfq_reference", blankToNull(r.rfqReference()));
        h.put("contract_reference", blankToNull(r.contractReference()));
        h.put("payment_terms", blankToNull(r.paymentTerms()));
        h.put("delivery_terms", blankToNull(r.deliveryTerms()));
        h.put("warranty_terms", blankToNull(r.warrantyTerms()));
        h.put("remarks", blankToNull(r.remarks()));

        // Dates
        LocalDate poDate = r.poDate() == null ? today : r.poDate();
        if (poDate.isAfter(today)) throw bad("PO date cannot be in the future.");
        if (r.validityEnd() == null) throw bad("PO validity date is required.");
        if (r.validityEnd().isBefore(poDate)) throw bad("PO validity date must be on or after the PO date.");
        if (r.expectedDeliveryDate() != null && r.expectedDeliveryDate().isBefore(poDate)) throw bad("Expected delivery date cannot be before the PO date.");
        h.put("po_date", poDate);
        h.put("validity_end", r.validityEnd());
        h.put("expected_delivery_date", r.expectedDeliveryDate());

        // PR link: eligible capital PR, or direct creation when company policy permits it
        if (notBlank(r.prNumber())) {
            List<Map<String, Object>> prs = jdbc.queryForList("SELECT pr_number, pr_type, status FROM public.purchase_requisitions WHERE pr_number = ?", r.prNumber().trim());
            if (prs.isEmpty()) throw bad("PR " + r.prNumber().trim() + " was not found.");
            Map<String, Object> pr = prs.get(0);
            if (!"Capital Goods / Asset".equalsIgnoreCase(str(pr, "pr_type"))) throw bad("PR " + r.prNumber().trim() + " is not a Capital Goods / Asset requisition.");
            if (!Set.of("Approved", "Partially Ordered").contains(str(pr, "status"))) throw bad("PR " + r.prNumber().trim() + " is " + str(pr, "status") + "; only approved PRs can be linked.");
            h.put("pr_number", str(pr, "pr_number"));
        } else {
            if (!allowDirectCreation) throw bad("Direct Capital PO creation is not permitted by company policy. Link an approved Capital PR.");
            h.put("pr_number", null);
        }

        // Additional charges: taxed at the rate of the SAC selected for them
        BigDecimal shipping = nz(r.shippingInstallationCharges());
        BigDecimal freight = nz(r.freightOtherCharges());
        if (shipping.signum() < 0 || freight.signum() < 0) throw bad("Charges cannot be negative.");
        BigDecimal chargesRate = BigDecimal.ZERO;
        String chargesSac = blankToNull(r.chargesSacCode());
        if (chargesSac != null) {
            List<Map<String, Object>> sac = jdbc.queryForList("SELECT gst_rate FROM public.hsn_tax_master WHERE hsn_sac_code = ? AND type = 'SERVICE' AND is_active = TRUE", chargesSac);
            if (sac.isEmpty()) throw bad("Charges SAC " + chargesSac + " is not an active SERVICE code in the Tax Master.");
            chargesRate = (BigDecimal) sac.get(0).get("gst_rate");
        } else if (shipping.add(freight).signum() > 0) {
            throw bad("Select the SAC code for freight / installation charges so the correct GST applies.");
        }
        CapitalPoCalculator.ChargeCalc cc = CapitalPoCalculator.charges(shipping.add(freight), chargesRate, intra);
        h.put("shipping_installation_charges", CapitalPoCalculator.money(shipping));
        h.put("freight_other_charges", CapitalPoCalculator.money(freight));
        h.put("charges_sac_code", chargesSac);
        h.put("charges_gst_rate", chargesRate);
        h.put("charges_taxable", cc.taxable());
        h.put("charges_gst_amount", cc.gstAmount());

        BigDecimal advPct = nz(r.advancePercent());
        if (advPct.signum() < 0 || advPct.compareTo(HUNDRED) > 0) throw bad("Advance percentage must be between 0 and 100.");
        h.put("advance_percent", advPct);

        // Lines
        if (r.lines() == null || r.lines().isEmpty()) throw bad("Add at least one asset line.");
        List<Map<String, Object>> lines = new ArrayList<>();
        Set<Integer> numbers = new HashSet<>();
        BigDecimal gross = BigDecimal.ZERO, disc = BigDecimal.ZERO, lineTaxable = BigDecimal.ZERO;
        BigDecimal cgst = cc.cgst(), sgst = cc.sgst(), igst = cc.igst(), gstLines = BigDecimal.ZERO;
        int next = 1;
        for (LineRequest lr : r.lines()) {
            int no = lr.lineNo() != null ? lr.lineNo() : next;
            next = Math.max(next, no) + 1;
            if (!numbers.add(no)) throw bad("Line number " + no + " is used twice.");
            Map<String, Object> l = lineFromRequest(lr, no, poDate, intra, poId);
            gross = gross.add((BigDecimal) l.remove("_gross"));
            disc = disc.add((BigDecimal) l.get("discount_amount"));
            lineTaxable = lineTaxable.add((BigDecimal) l.get("taxable_value"));
            cgst = cgst.add((BigDecimal) l.get("cgst_amount"));
            sgst = sgst.add((BigDecimal) l.get("sgst_amount"));
            igst = igst.add((BigDecimal) l.get("igst_amount"));
            gstLines = gstLines.add((BigDecimal) l.get("gst_amount"));
            lines.add(l);
        }
        BigDecimal taxableTotal = lineTaxable.add(cc.taxable());
        BigDecimal taxTotal = gstLines.add(cc.gstAmount());
        BigDecimal grand = CapitalPoCalculator.money(taxableTotal.add(taxTotal));
        h.put("lines_gross", CapitalPoCalculator.money(gross));
        h.put("lines_discount", CapitalPoCalculator.money(disc));
        h.put("lines_taxable", CapitalPoCalculator.money(lineTaxable));
        h.put("taxable_total", CapitalPoCalculator.money(taxableTotal));
        h.put("cgst_total", CapitalPoCalculator.money(cgst));
        h.put("sgst_total", CapitalPoCalculator.money(sgst));
        h.put("igst_total", CapitalPoCalculator.money(igst));
        h.put("tax_total", CapitalPoCalculator.money(taxTotal));
        h.put("grand_total", grand);
        h.put("advance_amount", CapitalPoCalculator.money(grand.multiply(advPct).divide(HUNDRED, 4, RoundingMode.HALF_UP)));
        h.put("amount_payable", grand);
        return new Prepared(h, lines, List.of());
    }

    static int wholeUnits(BigDecimal qty, String label) {
        try {
            return qty.intValueExact();
        } catch (ArithmeticException e) {
            throw bad(label + " need whole-unit quantities (received " + qty + ").");
        }
    }

    private Map<String, Object> lineFromRequest(LineRequest lr, int lineNo, LocalDate poDate, boolean intra, Long poId) {
        if (!notBlank(lr.assetCategory())) throw bad("Line " + lineNo + ": select an asset category.");
        List<Map<String, Object>> cat = jdbc.queryForList("SELECT name, treatment FROM public.capital_po_asset_categories WHERE parent_group = 'Assets' AND is_active = TRUE AND name = ?", lr.assetCategory().trim());
        if (cat.isEmpty()) throw bad("Line " + lineNo + ": category is not in the active Assets group.");
        if (!notBlank(lr.assetName())) throw bad("Line " + lineNo + ": asset name is required.");
        if (!notBlank(lr.assetDescription())) throw bad("Line " + lineNo + ": detailed asset description is required.");
        if (lr.quantity() == null || lr.quantity().signum() <= 0) throw bad("Line " + lineNo + ": quantity must be greater than zero.");
        if (!notBlank(lr.uom())) throw bad("Line " + lineNo + ": unit of measurement is required.");
        if (!notBlank(lr.hsnCode())) throw bad("Line " + lineNo + ": HSN code is required.");
        List<Map<String, Object>> hsn = jdbc.queryForList("SELECT hsn_sac_code, description, gst_rate FROM public.hsn_tax_master WHERE hsn_sac_code = ? AND type = 'GOODS' AND is_active = TRUE", lr.hsnCode().trim());
        if (hsn.isEmpty()) throw bad("Line " + lineNo + ": HSN " + lr.hsnCode().trim() + " is not an active GOODS code in the Tax Master.");
        if (lr.expectedDeliveryDate() != null && lr.expectedDeliveryDate().isBefore(poDate)) throw bad("Line " + lineNo + ": delivery date cannot be before the PO date.");
        int warranty = lr.warrantyMonths() == null ? 0 : lr.warrantyMonths();
        if (warranty < 0 || warranty > 240) throw bad("Line " + lineNo + ": warranty must be between 0 and 240 months.");
        String wsc = upper(lr.warrantyStartCondition());
        if (warranty > 0 && (wsc == null || !WARRANTY_START.contains(wsc))) throw bad("Line " + lineNo + ": choose when warranty starts (DELIVERY, INSTALLATION or COMMISSIONING).");
        if (lr.usefulLifeYears() != null && lr.usefulLifeYears() < 0) throw bad("Line " + lineNo + ": useful life cannot be negative.");
        Long prItemId = lr.prItemId();
        if (prItemId != null) checkPrItem(prItemId, lr.quantity(), lineNo, poId);

        BigDecimal rate = (BigDecimal) hsn.get(0).get("gst_rate");
        CapitalPoCalculator.LineCalc c = CapitalPoCalculator.line(lr.quantity(), lr.unitPrice(), lr.discountType(), lr.discountValue(), rate, intra);
        boolean install = Boolean.TRUE.equals(lr.installationRequired());
        boolean commission = Boolean.TRUE.equals(lr.commissioningRequired());
        Map<String, Object> l = new LinkedHashMap<>();
        l.put("line_no", lineNo);
        l.put("treatment", str(cat.get(0), "treatment"));
        l.put("asset_category", str(cat.get(0), "name"));
        l.put("asset_name", lr.assetName().trim());
        l.put("asset_description", lr.assetDescription().trim());
        l.put("asset_code_ref", blankToNull(lr.assetCodeRef()));
        l.put("manufacturer", blankToNull(lr.manufacturer()));
        l.put("model_number", blankToNull(lr.modelNumber()));
        l.put("technical_specs", blankToNull(lr.technicalSpecs()));
        l.put("quantity", lr.quantity());
        l.put("uom", lr.uom().trim());
        l.put("unit_price", CapitalPoCalculator.money(lr.unitPrice()));
        l.put("discount_type", lr.discountType() == null ? "NONE" : upper(lr.discountType()));
        l.put("discount_value", nz(lr.discountValue()));
        l.put("discount_amount", c.discount());
        l.put("taxable_value", c.taxable());
        l.put("hsn_code", hsn.get(0).get("hsn_sac_code"));
        l.put("hsn_description", hsn.get(0).get("description"));
        l.put("gst_rate", rate);
        l.put("cgst_amount", c.cgst());
        l.put("sgst_amount", c.sgst());
        l.put("igst_amount", c.igst());
        l.put("gst_amount", c.gstAmount());
        l.put("line_total", c.lineTotal());
        l.put("expected_delivery_date", lr.expectedDeliveryDate());
        l.put("delivery_location", blankToNull(lr.deliveryLocation()));
        l.put("installation_required", install);
        l.put("commissioning_required", commission);
        l.put("warranty_months", warranty);
        l.put("warranty_start_condition", warranty > 0 ? wsc : null);
        l.put("amc_required", Boolean.TRUE.equals(lr.amcRequired()));
        l.put("useful_life_years", lr.usefulLifeYears());
        l.put("remarks", blankToNull(lr.remarks()));
        l.put("pr_item_id", prItemId);
        l.put("responsible_team", blankToNull(lr.responsibleTeam()));
        l.put("installation_status", install ? "NOT_STARTED" : "NOT_REQUIRED");
        l.put("commissioning_status", commission ? "NOT_STARTED" : "NOT_REQUIRED");
        l.put("_gross", c.gross());
        return l;
    }

    /** PR item must belong to the PR, and the quantity must fit the PR's remaining quantity after other capital POs. */
    private void checkPrItem(long prItemId, BigDecimal qty, int lineNo, Long excludePoId) {
        List<Map<String, Object>> it = jdbc.queryForList("SELECT remaining_qty, pr_number FROM public.purchase_requisition_items WHERE id = ?", prItemId);
        if (it.isEmpty()) throw bad("Line " + lineNo + ": linked PR item was not found.");
        BigDecimal committed = jdbc.queryForObject(
                "SELECT COALESCE(SUM(l.quantity), 0) FROM public.capital_po_lines l JOIN public.capital_purchase_orders p ON p.id = l.capital_po_id "
                        + "WHERE l.pr_item_id = ? AND p.status NOT IN ('DRAFT','REJECTED','CANCELLED') AND p.id <> ?",
                BigDecimal.class, prItemId, excludePoId == null ? -1L : excludePoId);
        BigDecimal available = ((BigDecimal) it.get(0).get("remaining_qty")).subtract(committed == null ? BigDecimal.ZERO : committed);
        if (qty.compareTo(available) > 0) {
            throw bad("Line " + lineNo + ": quantity " + qty + " exceeds the PR's remaining quantity " + available + ".");
        }
    }

    private void revalidatePrLinks(long id, Map<String, Object> row) {
        for (Map<String, Object> l : jdbc.queryForList("SELECT line_no, quantity, pr_item_id FROM public.capital_po_lines WHERE capital_po_id = ? AND pr_item_id IS NOT NULL", id)) {
            checkPrItem(((Number) l.get("pr_item_id")).longValue(), (BigDecimal) l.get("quantity"), (Integer) l.get("line_no"), id);
        }
    }

    // ================================================================== rollups

    /** Recomputes receipt, installation, commissioning and asset-registration statuses from the line data. */
    private void recomputeRollups(long id) {
        List<Map<String, Object>> lines = jdbc.queryForList("SELECT * FROM public.capital_po_lines WHERE capital_po_id = ?", id);
        String receipt;
        boolean anyRecv = false, allRecv = !lines.isEmpty();
        for (Map<String, Object> l : lines) {
            BigDecimal rq = (BigDecimal) l.get("received_qty");
            if (rq.signum() > 0) anyRecv = true;
            if (rq.compareTo((BigDecimal) l.get("quantity")) < 0) allRecv = false;
        }
        receipt = allRecv ? "FULLY_RECEIVED" : anyRecv ? "PARTIALLY_RECEIVED" : "NOT_RECEIVED";
        String install = rollup(lines, "installation_required", "installation_status");
        String commission = rollup(lines, "commissioning_required", "commissioning_status");
        Integer registered = jdbc.queryForObject("SELECT COUNT(*) FROM public.asset_master WHERE capital_po_id = ?", Integer.class, id);
        BigDecimal received = sumLines(id, "received_qty");
        String reg;
        if (registered == null || registered == 0) reg = "NOT_REGISTERED";
        else if (received.compareTo(BigDecimal.valueOf(registered)) <= 0 && allRecv) reg = "REGISTERED";
        else reg = "PARTIALLY_REGISTERED";
        jdbc.update("UPDATE public.capital_purchase_orders SET receipt_status = ?, installation_status = ?, commissioning_status = ?, "
                + "asset_registration_status = ? WHERE id = ?", receipt, install, commission, reg, id);
    }

    static String rollup(List<Map<String, Object>> lines, String requiredKey, String statusKey) {
        List<Map<String, Object>> req = lines.stream().filter(l -> Boolean.TRUE.equals(l.get(requiredKey))).collect(Collectors.toList());
        if (req.isEmpty()) return "NOT_REQUIRED";
        if (req.stream().allMatch(l -> "COMPLETED".equals(l.get(statusKey)))) return "COMPLETED";
        if (req.stream().anyMatch(l -> "COMPLETED".equals(l.get(statusKey)) || "IN_PROGRESS".equals(l.get(statusKey)))) return "PARTIALLY_COMPLETED";
        return "PENDING";
    }

    // ================================================================== workflow helpers

    private Map<String, Object> finish(long id, Map<String, Object> row, String to, String action, Actor actor, String comments) {
        String from = str(row, "status");
        jdbc.update("UPDATE public.capital_purchase_orders SET status = ?, modified_by = ?, modified_at = NOW(), version = version + 1 WHERE id = ?",
                to, actor.name(), id);
        history(id, action, from, to, actor, comments);
        return details(id, actor);
    }

    private void ensureNotExpired(Map<String, Object> row) {
        if (isExpired(row)) {
            throw conflict("PO validity expired on " + ld(row.get("validity_end")) + ". Extend validity before continuing.");
        }
    }

    private boolean isExpired(Map<String, Object> row) {
        if (Set.of("DRAFT", "CANCELLED", "CLOSED", "REJECTED").contains(str(row, "status"))) return false;
        LocalDate end = ld(row.get("validity_end"));
        return end != null && end.isBefore(today());
    }

    private void requireCreatorOrApprover(Actor actor, Map<String, Object> row) {
        if (!has(actor, "CREATOR", "APPROVER")) throw new CapitalPoException(HttpStatus.FORBIDDEN, "Only the creator or an approver can change this PO.");
    }

    private List<String> allowedActions(Map<String, Object> row, Actor actor) {
        String s = str(row, "status");
        boolean creatorish = has(actor, "CREATOR", "APPROVER");
        boolean approver = has(actor, "APPROVER");
        boolean receiver = has(actor, "RECEIVER", "ASSET_MANAGER");
        boolean assetMgr = has(actor, "ASSET_MANAGER");
        boolean expired = isExpired(row);
        boolean received = !"NOT_RECEIVED".equals(str(row, "receipt_status"));
        boolean own = actor.name().equalsIgnoreCase(str(row, "created_by")) && !"ADMIN".equals(actor.role());
        boolean pendingAmendment = "PENDING".equals(str(row, "pending_amendment_status"));
        List<String> a = new ArrayList<>();
        if (Set.of("DRAFT", "REJECTED").contains(s) && creatorish) { a.add("EDIT"); a.add("SUBMIT"); }
        if ("PENDING_APPROVAL".equals(s) && approver && !own) { a.add("APPROVE"); a.add("REJECT"); }
        if ("APPROVED".equals(s) && approver) a.add("ISSUE");
        if (Set.of("APPROVED", "SENT_TO_VENDOR").contains(s) && creatorish && !pendingAmendment) a.add("PROPOSE_AMENDMENT");
        if (pendingAmendment && approver && !own) a.add("DECIDE_AMENDMENT");
        if (!Set.of("DRAFT", "CANCELLED", "CLOSED", "REJECTED").contains(s) && approver) a.add("EXTEND_VALIDITY");
        if (Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED", "SENT_TO_VENDOR").contains(s) && !received
                && (approver || (creatorish && Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED").contains(s)))) a.add("CANCEL");
        if ("SENT_TO_VENDOR".equals(s) && approver) a.add("CLOSE");
        if (Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED", "SENT_TO_VENDOR").contains(s) && creatorish) a.add("MANAGE_SCHEDULE");
        if ("SENT_TO_VENDOR".equals(s) && receiver && !expired) a.add("RECORD_RECEIPT");
        if (Set.of("SENT_TO_VENDOR", "CLOSED").contains(s) && receiver) { a.add("RECORD_INSTALLATION"); a.add("RECORD_COMMISSIONING"); }
        if (assetMgr && "SENT_TO_VENDOR".equals(s) || (assetMgr && "CLOSED".equals(s))) a.add("REGISTER_ASSET");
        a.add("ATTACH");
        return a;
    }

    private void history(long id, String action, String from, String to, Actor actor, String comments) {
        jdbc.update("INSERT INTO public.capital_po_history (capital_po_id, action, from_status, to_status, actor, actor_role, comments) VALUES (?,?,?,?,?,?,?)",
                id, action, from, to, actor.name(), actor.role(), blankToNull(comments));
    }

    // ================================================================== row access

    private Map<String, Object> headerRow(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT p.*, (SELECT a.status FROM public.capital_po_amendments a WHERE a.capital_po_id = p.id AND a.status = 'PENDING' LIMIT 1) AS pending_amendment_status "
                        + "FROM public.capital_purchase_orders p WHERE p.id = ?", id);
        if (rows.isEmpty()) throw notFound("Capital PO " + id + " not found.");
        return rows.get(0);
    }

    private Map<String, Object> lockRow(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.capital_purchase_orders WHERE id = ? FOR UPDATE", id);
        if (rows.isEmpty()) throw notFound("Capital PO " + id + " not found.");
        Map<String, Object> row = rows.get(0);
        row.put("pending_amendment_status", jdbc.queryForList("SELECT status FROM public.capital_po_amendments WHERE capital_po_id = ? AND status = 'PENDING' LIMIT 1", String.class, id)
                .stream().findFirst().orElse(null));
        return row;
    }

    /** Read-only copy used for list rows: lists already carry the receipt status needed for actions. */
    private Map<String, Object> lockedCopy(Map<String, Object> r) {
        Map<String, Object> c = new HashMap<>(r);
        return c;
    }

    private Map<String, Object> lineByNo(long id, int lineNo) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.capital_po_lines WHERE capital_po_id = ? AND line_no = ?", id, lineNo);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private Map<Integer, Map<String, Object>> existingLines(long id) {
        Map<Integer, Map<String, Object>> out = new LinkedHashMap<>();
        for (Map<String, Object> l : jdbc.queryForList("SELECT * FROM public.capital_po_lines WHERE capital_po_id = ? ORDER BY line_no", id)) {
            out.put((Integer) l.get("line_no"), l);
        }
        return out;
    }

    private BigDecimal sumLines(long id, String column) {
        BigDecimal v = jdbc.queryForObject("SELECT COALESCE(SUM(" + column + "), 0) FROM public.capital_po_lines WHERE capital_po_id = ?", BigDecimal.class, id);
        return v == null ? BigDecimal.ZERO : v;
    }

    private void insertLines(long id, List<Map<String, Object>> lines) {
        for (Map<String, Object> l : lines) {
            Map<String, Object> cols = new LinkedHashMap<>(l);
            cols.remove("treatment");
            cols.put("capital_po_id", id);
            cols.put("received_qty", BigDecimal.ZERO);
            insertRow("public.capital_po_lines", cols);
        }
    }

    private long insertRow(String table, Map<String, Object> cols) {
        String names = String.join(", ", cols.keySet());
        String marks = cols.keySet().stream().map(k -> "?").collect(Collectors.joining(", "));
        return jdbc.queryForObject("INSERT INTO " + table + " (" + names + ") VALUES (" + marks + ") RETURNING id", Long.class, cols.values().toArray());
    }

    private void updateRow(String table, long id, Map<String, Object> cols) {
        String sets = cols.keySet().stream().map(k -> k + " = ?").collect(Collectors.joining(", "));
        List<Object> args = new ArrayList<>(cols.values());
        args.add(id);
        jdbc.update("UPDATE " + table + " SET " + sets + " WHERE id = ?", args.toArray());
    }

    private String nextNumber(String prefix) {
        String seq = switch (prefix) {
            case "CPO" -> "capital_po_number_seq";
            case "CAR" -> "capital_receipt_number_seq";
            default -> throw new IllegalArgumentException(prefix);
        };
        Long n = jdbc.queryForObject("SELECT nextval('public." + seq + "')", Long.class);
        return String.format(Locale.ROOT, "%s-%d-%05d", prefix, today().getYear(), n);
    }

    private String nextAssetCode() {
        Long n = jdbc.queryForObject("SELECT nextval('public.asset_code_seq')", Long.class);
        return String.format(Locale.ROOT, "AST-%06d", n);
    }

    // ================================================================== small utilities

    static ZoneId zone() {
        return ZoneId.of("Asia/Kolkata");
    }

    static LocalDate today() {
        return LocalDate.now(zone());
    }

    private static CapitalPoException bad(String m) {
        return new CapitalPoException(HttpStatus.BAD_REQUEST, m);
    }

    private static CapitalPoException conflict(String m) {
        return new CapitalPoException(HttpStatus.CONFLICT, m);
    }

    private static CapitalPoException notFound(String m) {
        return new CapitalPoException(HttpStatus.NOT_FOUND, m);
    }

    private static void requireReason(String text, String label) {
        if (text == null || text.isBlank()) throw bad(label + " is required.");
    }

    private static String requireStateCode(String code, String label) {
        if (code == null || !code.trim().matches("\\d{2}")) throw bad(label + " must be a 2-digit GST state code.");
        return code.trim();
    }

    private static List<String> parseSerials(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split("[,\\n]")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
    }

    static String upper(String s) {
        return s == null || s.isBlank() ? null : s.trim().toUpperCase(Locale.ROOT);
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

    static long toLong(Object o) {
        return o instanceof Number n ? n.longValue() : Long.parseLong(String.valueOf(o));
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
        return Arrays.stream(parts).filter(CapitalPoService::notBlank).map(String::trim).collect(Collectors.joining(sep));
    }

    private static String esc(Object o) {
        if (o == null) return "";
        return String.valueOf(o).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String money(Object o) {
        return o == null ? "0.00" : new BigDecimal(String.valueOf(o)).setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String row(String label, Object value) {
        return "<tr><th>" + esc(label) + "</th><td>" + (value instanceof String s && s.startsWith("<b>") ? s : esc(value)) + "</td></tr>";
    }

    private static void addEq(List<String> conds, List<Object> args, String column, String value) {
        if (notBlank(value)) { conds.add(column + " = ?"); args.add(value.trim().toUpperCase(Locale.ROOT)); }
    }

    static Map<String, Object> camel(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : row.entrySet()) out.put(camelKey(e.getKey()), jsonValue(e.getValue()));
        return out;
    }

    static List<Map<String, Object>> camelList(List<Map<String, Object>> rows) {
        return rows.stream().map(CapitalPoService::camel).collect(Collectors.toList());
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
