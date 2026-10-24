package com.silvermuller.seals.modules.purchase.jobwork;

import com.silvermuller.seals.modules.purchase.jobwork.JobWorkDtos.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
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
 * Job Work (subcontracting). Company stock moves through the existing inventory engine, so the
 * balances in the Inventory module always agree with job work. The job-worker-wise ledger tracks
 * which worker holds which quantity, and every posting runs in one transaction with its records.
 *
 * Identity and roles come from X-User-Name / X-User-Role (no login system yet).
 */
@Service
public class JobWorkService {

    public static class JobWorkException extends RuntimeException {
        private final HttpStatus status;

        public JobWorkException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() {
            return status;
        }
    }

    public record Actor(String name, String role) {}

    static final Set<String> ROLES = Set.of("CREATOR", "APPROVER", "STORE", "QUALITY", "ADMIN");
    static final Set<String> RATE_BASIS = Set.of("PER_PIECE", "PER_KG", "PER_BATCH", "PER_HOUR");
    static final Set<String> WORKER_STATUS = Set.of("ACTIVE", "INACTIVE", "BLOCKED");
    static final java.util.regex.Pattern GSTIN_FORMAT =
            java.util.regex.Pattern.compile("^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$");
    static final String EXTERNAL = "External Job Work";
    static final String QUALITY_HOLD = "Quality Hold";
    static final String REJECTION_STORE = "Rejection Store";
    static final String REWORK_STORE = "Rework-Burning";
    static final String SEND_TYPE = "Material Send for Job work";
    static final String TRANSFER_TYPE = "Material Transfer";
    static final int MAX_LIST = 200;

    private final JdbcTemplate jdbc;
    private final BigDecimal approvalLimit;

    public JobWorkService(JdbcTemplate jdbc,
                          @Value("${job-work.approval-limit:}") String approvalLimitRaw) {
        this.jdbc = jdbc;
        this.approvalLimit = (approvalLimitRaw == null || approvalLimitRaw.isBlank()) ? null : new BigDecimal(approvalLimitRaw.trim());
    }

    // ================================================================== identity

    public Actor actor(String name, String role) {
        if (name == null || name.isBlank()) throw new JobWorkException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        String r = (role == null || role.isBlank()) ? "CREATOR" : role.trim().toUpperCase(Locale.ROOT);
        if (!ROLES.contains(r)) throw new JobWorkException(HttpStatus.FORBIDDEN, "Unknown role: " + role);
        return new Actor(name.trim(), r);
    }

    static boolean has(Actor a, String... roles) {
        if ("ADMIN".equals(a.role())) return true;
        for (String r : roles) if (r.equals(a.role())) return true;
        return false;
    }

    static void require(Actor a, String... roles) {
        if (!has(a, roles)) throw new JobWorkException(HttpStatus.FORBIDDEN, "Role " + a.role() + " is not allowed to perform this action.");
    }

    // ================================================================== reference data

    public List<Map<String, Object>> operations() {
        return camelList(jdbc.queryForList("SELECT id, operation_name FROM public.job_work_operations WHERE status = 'ACTIVE' ORDER BY operation_name"));
    }

    public List<Map<String, Object>> locations() {
        return camelList(jdbc.queryForList("SELECT id, department_name, dept_code FROM public.department_master WHERE status = 'ACTIVE' ORDER BY department_name"));
    }

    public List<Map<String, Object>> categories() {
        return camelList(jdbc.queryForList("SELECT category_name FROM public.category_master ORDER BY category_name"));
    }

    /** Vendors that can still be onboarded as job workers. */
    public List<Map<String, Object>> vendorCandidates() {
        return camelList(jdbc.queryForList("SELECT supplier_code, supplier_name, gstin, state FROM public.supplier_master "
                + "WHERE status = 'ACTIVE' AND supplier_code NOT IN (SELECT supplier_code FROM public.job_workers) ORDER BY supplier_name LIMIT 500"));
    }

    // ================================================================== job workers

    @Transactional
    public Map<String, Object> createWorker(WorkerRequest r, Actor actor) {
        require(actor, "APPROVER");
        String supplierCode = blank(r.supplierCode());
        if (supplierCode == null) throw bad("Select a vendor from the Vendor Master.");
        List<Map<String, Object>> sup = jdbc.queryForList("SELECT * FROM public.supplier_master WHERE supplier_code = ?", supplierCode);
        if (sup.isEmpty()) throw bad("Vendor " + supplierCode + " was not found in the Vendor Master.");
        Map<String, Object> v = sup.get(0);
        if (!"ACTIVE".equalsIgnoreCase(str(v, "status"))) throw bad("Vendor " + supplierCode + " is not active.");
        Integer already = jdbc.queryForObject("SELECT COUNT(*) FROM public.job_workers WHERE supplier_code = ?", Integer.class, supplierCode);
        if (already != null && already > 0) throw conflict("Vendor " + supplierCode + " is already registered as a job worker.");
        String gstin = blank(str(v, "gstin"));
        if (gstin != null) {
            gstin = gstin.toUpperCase(Locale.ROOT);
            if (!GSTIN_FORMAT.matcher(gstin).matches()) throw bad("Vendor GSTIN " + gstin + " is not in a valid GSTIN format. Correct it in the Vendor Master first.");
            Integer dup = jdbc.queryForObject("SELECT COUNT(*) FROM public.job_workers WHERE gstin = ?", Integer.class, gstin);
            if (dup != null && dup > 0) throw conflict("GSTIN " + gstin + " is already used by another job worker.");
        }
        List<Long> ops = r.operationIds() == null ? List.of() : r.operationIds().stream().distinct().collect(Collectors.toList());
        if (ops.isEmpty()) throw bad("Select at least one approved job work operation.");
        for (Long op : ops) {
            if (jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_operations WHERE id = ?", Integer.class, op) == 0) throw bad("Operation " + op + " does not exist.");
        }
        int credit = r.creditDays() == null ? 30 : r.creditDays();
        if (credit < 0) throw bad("Credit days cannot be negative.");
        String code = String.format(Locale.ROOT, "JW-%04d", nextSeq());
        Map<String, Object> cols = new LinkedHashMap<>();
        cols.put("worker_code", code);
        cols.put("supplier_code", supplierCode);
        cols.put("legal_name", str(v, "supplier_name"));
        cols.put("contact_person", blank(r.contactPerson()) != null ? r.contactPerson().trim() : blank(str(v, "contact_person")));
        cols.put("phone", blank(r.phone()) != null ? r.phone().trim() : blank(str(v, "phone")));
        cols.put("email", blank(r.email()) != null ? r.email().trim() : blank(str(v, "email")));
        cols.put("registered_address", joinNonBlank(", ", str(v, "address"), str(v, "city"), str(v, "state"), str(v, "pincode")));
        cols.put("work_location", blank(r.workLocation()));
        cols.put("gstin", gstin);
        cols.put("pan", blank(str(v, "pan")));
        cols.put("payment_terms", blank(r.paymentTerms()) != null ? r.paymentTerms().trim() : blank(str(v, "payment_terms_id")));
        cols.put("credit_days", credit);
        cols.put("status", "ACTIVE");
        cols.put("created_by", actor.name());
        cols.put("modified_by", actor.name());
        long id = insertRow("public.job_workers", cols);
        for (Long op : ops) jdbc.update("INSERT INTO public.job_worker_operations (job_worker_id, operation_id) VALUES (?, ?)", id, op);
        history("WORKER", id, "CREATED", null, "ACTIVE", actor, "Vendor " + supplierCode + " onboarded as job worker");
        return workerDetails(id);
    }

    @Transactional
    public Map<String, Object> updateWorker(long id, WorkerRequest r, Actor actor) {
        require(actor, "APPROVER");
        Map<String, Object> w = lockWorker(id);
        String status = blank(r.status()) == null ? str(w, "status") : r.status().trim().toUpperCase(Locale.ROOT);
        if (!WORKER_STATUS.contains(status)) throw bad("Status must be ACTIVE, INACTIVE or BLOCKED.");
        if ("BLOCKED".equals(status) && blank(r.blockedReason()) == null) throw bad("Give the reason for blocking this job worker.");
        if (!"ACTIVE".equals(status) && !"BLOCKED".equals(status) && !"INACTIVE".equals(status)) throw bad("Invalid status.");
        if (r.operationIds() != null) {
            List<Long> ops = r.operationIds().stream().distinct().collect(Collectors.toList());
            if (ops.isEmpty()) throw bad("Keep at least one approved operation.");
            jdbc.update("DELETE FROM public.job_worker_operations WHERE job_worker_id = ?", id);
            for (Long op : ops) jdbc.update("INSERT INTO public.job_worker_operations (job_worker_id, operation_id) VALUES (?, ?)", id, op);
        }
        jdbc.update("UPDATE public.job_workers SET contact_person = COALESCE(?, contact_person), phone = COALESCE(?, phone), email = COALESCE(?, email), "
                        + "work_location = COALESCE(?, work_location), payment_terms = COALESCE(?, payment_terms), credit_days = COALESCE(?, credit_days), "
                        + "status = ?, blocked_reason = ?, modified_by = ?, modified_at = NOW() WHERE id = ?",
                blank(r.contactPerson()), blank(r.phone()), blank(r.email()), blank(r.workLocation()), blank(r.paymentTerms()),
                r.creditDays(), status, "BLOCKED".equals(status) ? blank(r.blockedReason()) : null, actor.name(), id);
        if (!status.equals(str(w, "status"))) history("WORKER", id, "STATUS_CHANGED", str(w, "status"), status, actor, r.reason() != null ? r.reason() : r.blockedReason());
        return workerDetails(id);
    }

    @Transactional
    public Map<String, Object> addRateContract(long workerId, RateContractRequest r, Actor actor) {
        require(actor, "APPROVER");
        Map<String, Object> w = lockWorker(workerId);
        if (!"ACTIVE".equals(str(w, "status"))) throw conflict("Only active job workers can have rate contracts.");
        if (r.operationId() == null) throw bad("Select the operation for this rate.");
        Integer approved = jdbc.queryForObject("SELECT COUNT(*) FROM public.job_worker_operations WHERE job_worker_id = ? AND operation_id = ?", Integer.class, workerId, r.operationId());
        if (approved == null || approved == 0) throw bad("This operation is not approved for this job worker.");
        String category = blank(r.itemCategory());
        if (category != null && jdbc.queryForObject("SELECT COUNT(*) FROM public.category_master WHERE category_name = ?", Integer.class, category) == 0) {
            throw bad("Category " + category + " is not in the category master.");
        }
        String basis = upper(r.rateBasis());
        if (basis == null || !RATE_BASIS.contains(basis)) throw bad("Rate basis must be PER_PIECE, PER_KG, PER_BATCH or PER_HOUR.");
        if (r.rate() == null || r.rate().signum() <= 0) throw bad("Rate must be greater than zero.");
        BigDecimal min = r.minQty() == null ? BigDecimal.ZERO : r.minQty();
        if (min.signum() < 0) throw bad("Minimum quantity cannot be negative.");
        if (r.effectiveFrom() == null || r.validUntil() == null) throw bad("Effective-from and valid-until dates are required.");
        if (r.validUntil().isBefore(r.effectiveFrom())) throw bad("Valid-until must be on or after the effective-from date.");
        Integer overlap = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.job_work_rate_contracts WHERE job_worker_id = ? AND operation_id = ? AND status = 'ACTIVE' "
                        + "AND COALESCE(item_category, '') = COALESCE(?, '') AND effective_from <= ? AND valid_until >= ?",
                Integer.class, workerId, r.operationId(), category, r.validUntil(), r.effectiveFrom());
        if (overlap != null && overlap > 0) {
            throw conflict("An active rate already covers this period for the same operation and category. Revoke it first so the revision is explicit.");
        }
        Map<String, Object> cols = new LinkedHashMap<>();
        cols.put("job_worker_id", workerId);
        cols.put("operation_id", r.operationId());
        cols.put("item_category", category);
        cols.put("rate_basis", basis);
        cols.put("rate", r.rate().setScale(2, RoundingMode.HALF_UP));
        cols.put("min_qty", min);
        cols.put("effective_from", r.effectiveFrom());
        cols.put("valid_until", r.validUntil());
        cols.put("status", "ACTIVE");
        cols.put("created_by", actor.name());
        long id = insertRow("public.job_work_rate_contracts", cols);
        history("WORKER", workerId, "RATE_ADDED", null, null, actor, "Rate contract " + id + ": " + r.rate() + " " + basis);
        return workerDetails(workerId);
    }

    @Transactional
    public Map<String, Object> revokeRateContract(long contractId, ActionRequest req, Actor actor) {
        require(actor, "APPROVER");
        requireReason(req.comments(), "Revocation reason");
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.job_work_rate_contracts WHERE id = ? FOR UPDATE", contractId);
        if (rows.isEmpty()) throw notFound("Rate contract not found.");
        Map<String, Object> c = rows.get(0);
        if (!"ACTIVE".equals(str(c, "status"))) throw conflict("This rate contract is already revoked.");
        jdbc.update("UPDATE public.job_work_rate_contracts SET status = 'REVOKED' WHERE id = ?", contractId);
        history("WORKER", ((Number) c.get("job_worker_id")).longValue(), "RATE_REVOKED", null, null, actor, req.comments());
        return workerDetails(((Number) c.get("job_worker_id")).longValue());
    }

    public Map<String, Object> workerDetails(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.job_workers WHERE id = ?", id);
        if (rows.isEmpty()) throw notFound("Job worker " + id + " not found.");
        Map<String, Object> out = camel(rows.get(0));
        out.put("operations", camelList(jdbc.queryForList(
                "SELECT o.id, o.operation_name FROM public.job_worker_operations jo JOIN public.job_work_operations o ON o.id = jo.operation_id "
                        + "WHERE jo.job_worker_id = ? ORDER BY o.operation_name", id)));
        out.put("rateContracts", camelList(jdbc.queryForList(
                "SELECT rc.*, o.operation_name FROM public.job_work_rate_contracts rc JOIN public.job_work_operations o ON o.id = rc.operation_id "
                        + "WHERE rc.job_worker_id = ? ORDER BY rc.status, rc.effective_from DESC, rc.id DESC", id)));
        out.put("history", camelList(jdbc.queryForList("SELECT * FROM public.job_work_history WHERE entity_type = 'WORKER' AND entity_id = ? ORDER BY acted_at, id", id)));
        out.put("openOrders", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_orders WHERE job_worker_id = ? AND status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')", Integer.class, id));
        return out;
    }

    public List<Map<String, Object>> workerBalances(long workerId) {
        return camelList(jdbc.queryForList(
                "SELECT l.master_id, m.code AS item_code, l.category, SUM(l.qty) AS balance_qty FROM public.job_work_stock_ledger l "
                        + "JOIN public.master m ON m.id = l.master_id WHERE l.job_worker_id = ? GROUP BY l.master_id, m.code, l.category "
                        + "HAVING SUM(l.qty) <> 0 ORDER BY m.code", workerId));
    }

    public Map<String, Object> listWorkers(String q, String status, int page, int size) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (notBlank(q)) {
            conds.add("(LOWER(legal_name) LIKE ? OR LOWER(worker_code) LIKE ? OR LOWER(COALESCE(gstin,'')) LIKE ?)");
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(like); args.add(like); args.add(like);
        }
        if (notBlank(status)) { conds.add("status = ?"); args.add(status.trim().toUpperCase(Locale.ROOT)); }
        return pageOf("FROM public.job_workers" + where(conds) + " ORDER BY legal_name", "*", args, page, size);
    }

    // ================================================================== indents

    @Transactional
    public Map<String, Object> createIndent(IndentRequest r, Actor actor) {
        require(actor, "CREATOR", "APPROVER");
        if (notBlank(r.clientRequestId())) {
            List<Long> dup = jdbc.queryForList("SELECT id FROM public.job_work_indents WHERE client_request_id = ?", Long.class, r.clientRequestId().trim());
            if (!dup.isEmpty()) return indentDetails(dup.get(0), actor);
        }
        Prepared p = prepareIndent(r, null);
        String number = nextNumber("JWI");
        Map<String, Object> h = new LinkedHashMap<>(p.header());
        h.put("requester", actor.name());
        h.put("indent_number", number);
        h.put("client_request_id", blank(r.clientRequestId()));
        h.put("status", "DRAFT");
        h.put("version", 0);
        h.put("created_by", actor.name());
        h.put("modified_by", actor.name());
        long id = insertRow("public.job_work_indents", h);
        insertIndentLines(id, p.lines());
        history("INDENT", id, "CREATED", null, "DRAFT", actor, null);
        return indentDetails(id, actor);
    }

    @Transactional
    public Map<String, Object> updateIndent(long id, IndentRequest r, Actor actor) {
        Map<String, Object> row = lockRow("job_work_indents", id);
        String status = str(row, "status");
        if (!Set.of("DRAFT", "REJECTED").contains(status)) throw conflict("Only draft or rejected indents can be edited. Current status: " + status);
        requireCreatorOrApprover(actor, str(row, "created_by"));
        if (r.version() == null || !r.version().equals(row.get("version"))) throw conflict("This indent was changed by someone else. Reload and try again.");
        Prepared p = prepareIndent(r, id);
        Map<String, Object> h = new LinkedHashMap<>(p.header());
        h.put("requester", str(row, "requester"));
        h.put("status", "DRAFT");
        h.put("rejection_reason", null);
        h.put("version", ((Number) row.get("version")).intValue() + 1);
        h.put("modified_by", actor.name());
        h.put("modified_at", Timestamp.from(java.time.Instant.now()));
        updateRow("public.job_work_indents", id, h);
        jdbc.update("DELETE FROM public.job_work_indent_lines WHERE indent_id = ?", id);
        insertIndentLines(id, p.lines());
        history("INDENT", id, "EDITED", status, "DRAFT", actor, null);
        return indentDetails(id, actor);
    }

    @Transactional
    public Map<String, Object> submitIndent(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_indents", id);
        requireCreatorOrApprover(actor, str(row, "created_by"));
        String from = str(row, "status");
        if (!Set.of("DRAFT", "REJECTED").contains(from)) throw conflict("Only drafts can be submitted. Current status: " + from);
        return finishIndent(id, "SUBMITTED", "SUBMIT", from, actor, req.comments());
    }

    @Transactional
    public Map<String, Object> approveIndent(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_indents", id);
        require(actor, "APPROVER");
        if (!"SUBMITTED".equals(str(row, "status"))) throw conflict("Only submitted indents can be approved.");
        if (!"ADMIN".equals(actor.role()) && actor.name().equalsIgnoreCase(str(row, "created_by"))) {
            throw new JobWorkException(HttpStatus.FORBIDDEN, "The requester cannot approve their own indent.");
        }
        return finishIndent(id, "APPROVED", "APPROVE", "SUBMITTED", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> rejectIndent(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_indents", id);
        require(actor, "APPROVER");
        if (!"SUBMITTED".equals(str(row, "status"))) throw conflict("Only submitted indents can be rejected.");
        requireReason(req.comments(), "Rejection reason");
        jdbc.update("UPDATE public.job_work_indents SET rejection_reason = ? WHERE id = ?", req.comments(), id);
        return finishIndent(id, "REJECTED", "REJECT", "SUBMITTED", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> cancelIndent(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_indents", id);
        String from = str(row, "status");
        if (!Set.of("DRAFT", "SUBMITTED").contains(from)) throw conflict("Only draft or submitted indents can be cancelled.");
        requireCreatorOrApprover(actor, str(row, "created_by"));
        requireReason(req.comments(), "Cancellation reason");
        return finishIndent(id, "CANCELLED", "CANCEL", from, actor, req.comments());
    }

    Map<String, Object> finishIndent(long id, String to, String action, String from, Actor actor, String comments) {
        jdbc.update("UPDATE public.job_work_indents SET status = ?, modified_by = ?, modified_at = NOW(), version = version + 1 WHERE id = ?", to, actor.name(), id);
        history("INDENT", id, action, from, to, actor, comments);
        return indentDetails(id, actor);
    }

    Prepared prepareIndent(IndentRequest r, Long existingId) {
        if (r.requestingDepartmentId() == null || jdbc.queryForObject("SELECT COUNT(*) FROM public.department_master WHERE id = ?", Integer.class, r.requestingDepartmentId()) == 0) {
            throw bad("Select the requesting department.");
        }
        if (r.sourceDepartmentId() == null || jdbc.queryForObject("SELECT COUNT(*) FROM public.department_master WHERE id = ?", Integer.class, r.sourceDepartmentId()) == 0) {
            throw bad("Select the source store / warehouse.");
        }
        if (notBlank(r.reason()) == false) throw bad("Give the reason for outsourcing this work.");
        LocalDate date = r.indentDate() == null ? today() : r.indentDate();
        if (date.isAfter(today())) throw bad("Indent date cannot be in the future.");
        if (r.requiredDispatchDate() != null && r.requiredReturnDate() != null && r.requiredReturnDate().isBefore(r.requiredDispatchDate())) {
            throw bad("Required return date must be on or after the required dispatch date.");
        }
        if (r.preferredJobWorkerId() != null && jdbc.queryForObject("SELECT COUNT(*) FROM public.job_workers WHERE id = ? AND status = 'ACTIVE'", Integer.class, r.preferredJobWorkerId()) == 0) {
            throw bad("The preferred job worker is not active.");
        }
        if (r.lines() == null || r.lines().isEmpty()) throw bad("Add at least one item to the indent.");
        List<Map<String, Object>> lines = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int no = 0;
        for (IndentLineRequest l : r.lines()) {
            no++;
            if (l.masterId() == null) throw bad("Line " + no + ": select an item.");
            Map<String, Object> m = masterRow(l.masterId(), no);
            if (l.requiredQty() == null || l.requiredQty().signum() <= 0) throw bad("Line " + no + ": required quantity must be greater than zero.");
            if (l.operationId() == null || jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_operations WHERE id = ?", Integer.class, l.operationId()) == 0) {
                throw bad("Line " + no + ": select the job work operation.");
            }
            if (!seen.add(l.masterId() + "|" + l.operationId())) throw bad("Line " + no + ": the same item and operation appear twice.");
            Map<String, Object> ln = new LinkedHashMap<>();
            ln.put("line_no", no);
            ln.put("master_id", l.masterId());
            ln.put("item_code", str(m, "code"));
            ln.put("item_name", str(m, "description"));
            ln.put("category", stockCategory(l.category(), m, no));
            ln.put("uom", str(m, "unit_of_measurement"));
            ln.put("required_qty", l.requiredQty());
            ln.put("operation_id", l.operationId());
            ln.put("remarks", blank(l.remarks()));
            lines.add(ln);
        }
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("indent_date", date);
        h.put("requesting_department_id", r.requestingDepartmentId());
        h.put("source_department_id", r.sourceDepartmentId());
        h.put("reason", r.reason().trim());
        h.put("required_dispatch_date", r.requiredDispatchDate());
        h.put("required_return_date", r.requiredReturnDate());
        h.put("production_ref", blank(r.productionRef()));
        h.put("preferred_job_worker_id", r.preferredJobWorkerId());
        h.put("estimated_cost", r.estimatedCost() == null ? BigDecimal.ZERO : r.estimatedCost());
        h.put("remarks", blank(r.remarks()));
        return new Prepared(h, lines, List.of());
    }

    void insertIndentLines(long id, List<Map<String, Object>> lines) {
        for (Map<String, Object> l : lines) {
            Map<String, Object> cols = new LinkedHashMap<>(l);
            cols.put("indent_id", id);
            insertRow("public.job_work_indent_lines", cols);
        }
    }

    /** Stock available at the source location right now, from the inventory engine. */
    BigDecimal available(long masterId, String category, long sourceDeptId) {
        return inventory.getDepartmentClosingBalance(masterId, category, sourceDeptId);
    }

    public Map<String, Object> indentDetails(long id, Actor actor) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT i.*, rd.department_name AS requesting_department, sd.department_name AS source_department, "
                        + "w.legal_name AS preferred_worker FROM public.job_work_indents i "
                        + "JOIN public.department_master rd ON rd.id = i.requesting_department_id "
                        + "JOIN public.department_master sd ON sd.id = i.source_department_id "
                        + "LEFT JOIN public.job_workers w ON w.id = i.preferred_job_worker_id WHERE i.id = ?", id);
        if (rows.isEmpty()) throw notFound("Indent " + id + " not found.");
        Map<String, Object> row = rows.get(0);
        Map<String, Object> out = camel(row);
        out.put("allowedActions", indentActions(row, actor));
        List<Map<String, Object>> lines = jdbc.queryForList(
                "SELECT l.*, o.operation_name FROM public.job_work_indent_lines l JOIN public.job_work_operations o ON o.id = l.operation_id "
                        + "WHERE l.indent_id = ? ORDER BY l.line_no", id);
        List<Map<String, Object>> outLines = new ArrayList<>();
        for (Map<String, Object> l : lines) {
            Map<String, Object> c = camel(l);
            BigDecimal avail = available(((Number) l.get("master_id")).longValue(), str(l, "category"), ((Number) row.get("source_department_id")).longValue());
            c.put("availableQty", avail);
            c.put("stockShortfall", ((BigDecimal) l.get("required_qty")).compareTo(avail) > 0);
            outLines.add(c);
        }
        out.put("lines", outLines);
        out.put("orders", camelList(jdbc.queryForList("SELECT id, jwo_number, status FROM public.job_work_orders WHERE indent_id = ? ORDER BY id", id)));
        out.put("history", historyOf("INDENT", id));
        out.put("attachments", attachmentsOf("INDENT", id));
        return out;
    }

    public Map<String, Object> listIndents(String q, String status, LocalDate from, LocalDate to, int page, int size) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (notBlank(q)) {
            conds.add("(LOWER(i.indent_number) LIKE ? OR LOWER(i.reason) LIKE ? OR EXISTS (SELECT 1 FROM public.job_work_indent_lines l WHERE l.indent_id = i.id AND LOWER(l.item_code) LIKE ?))");
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(like); args.add(like); args.add(like);
        }
        if (notBlank(status)) { conds.add("i.status = ?"); args.add(status.trim().toUpperCase(Locale.ROOT)); }
        if (from != null) { conds.add("i.indent_date >= ?"); args.add(from); }
        if (to != null) { conds.add("i.indent_date <= ?"); args.add(to); }
        Map<String, Object> out = pageOf("FROM public.job_work_indents i" + where(conds)
                + " ORDER BY i.indent_date DESC, i.id DESC", "i.id, i.indent_number, i.indent_date, i.status, i.reason, i.created_by, i.estimated_cost, "
                + "(SELECT STRING_AGG(l.item_code, ', ') FROM public.job_work_indent_lines l WHERE l.indent_id = i.id) AS items, "
                + "(SELECT COUNT(*) FROM public.job_work_orders o WHERE o.indent_id = i.id) AS order_count", args, page, size);
        List<Map<String, Object>> content = new ArrayList<>();
        for (Map<String, Object> c : castList(out.get("content"))) {
            c.put("allowedActions", indentActions(Map.of("status", c.get("status"), "created_by", c.get("createdBy") == null ? "" : c.get("createdBy")), null));
            content.add(c);
        }
        out.put("content", content);
        return out;
    }

    List<String> indentActions(Map<String, Object> row, Actor actor) {
        String s = str(row, "status");
        boolean approver = actor != null && has(actor, "APPROVER");
        boolean creatorish = actor != null && has(actor, "CREATOR", "APPROVER");
        boolean own = actor != null && actor.name().equalsIgnoreCase(str(row, "created_by")) && !"ADMIN".equals(actor.role());
        List<String> a = new ArrayList<>();
        if (Set.of("DRAFT", "REJECTED").contains(s) && creatorish) { a.add("EDIT"); a.add("SUBMIT"); }
        if ("SUBMITTED".equals(s) && approver && !own) { a.add("APPROVE"); a.add("REJECT"); }
        if (Set.of("DRAFT", "SUBMITTED").contains(s) && creatorish) a.add("CANCEL");
        if ("APPROVED".equals(s) && actor != null && has(actor, "APPROVER", "CREATOR")) a.add("CREATE_ORDER");
        return a;
    }

    // ================================================================== job work orders

    @Transactional
    public Map<String, Object> createOrder(OrderRequest r, Actor actor) {
        require(actor, "CREATOR", "APPROVER");
        if (notBlank(r.clientRequestId())) {
            List<Long> dup = jdbc.queryForList("SELECT id FROM public.job_work_orders WHERE client_request_id = ?", Long.class, r.clientRequestId().trim());
            if (!dup.isEmpty()) return orderDetails(dup.get(0), actor);
        }
        Prepared p = prepareOrder(r, null);
        String number = nextNumber("JWO");
        Map<String, Object> h = new LinkedHashMap<>(p.header());
        h.put("jwo_number", number);
        h.put("client_request_id", blank(r.clientRequestId()));
        h.put("status", "DRAFT");
        h.put("version", 0);
        h.put("created_by", actor.name());
        h.put("modified_by", actor.name());
        long id = insertRow("public.job_work_orders", h);
        insertOrderLines(id, p.lines());
        history("JWO", id, "CREATED", null, "DRAFT", actor, null);
        return orderDetails(id, actor);
    }

    @Transactional
    public Map<String, Object> updateOrder(long id, OrderRequest r, Actor actor) {
        Map<String, Object> row = lockRow("job_work_orders", id);
        String status = str(row, "status");
        if (!Set.of("DRAFT", "REJECTED").contains(status)) {
            throw conflict("Only draft or rejected orders can be edited. Approved orders are changed by a new order, so agreed rates cannot change silently.");
        }
        requireCreatorOrApprover(actor, str(row, "created_by"));
        if (r.version() == null || !r.version().equals(row.get("version"))) throw conflict("This order was changed by someone else. Reload and try again.");
        Prepared p = prepareOrder(r, id);
        Map<String, Object> h = new LinkedHashMap<>(p.header());
        h.put("status", "DRAFT");
        h.put("rejection_reason", null);
        h.put("version", ((Number) row.get("version")).intValue() + 1);
        h.put("modified_by", actor.name());
        h.put("modified_at", Timestamp.from(java.time.Instant.now()));
        updateRow("public.job_work_orders", id, h);
        jdbc.update("DELETE FROM public.job_work_order_lines WHERE jwo_id = ?", id);
        insertOrderLines(id, p.lines());
        history("JWO", id, "EDITED", status, "DRAFT", actor, null);
        return orderDetails(id, actor);
    }

    @Transactional
    public Map<String, Object> submitOrder(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_orders", id);
        requireCreatorOrApprover(actor, str(row, "created_by"));
        String from = str(row, "status");
        if (!Set.of("DRAFT", "REJECTED").contains(from)) throw conflict("Only drafts can be submitted. Current status: " + from);
        return finishOrder(id, "PENDING_APPROVAL", "SUBMIT", from, actor, req.comments());
    }

    @Transactional
    public Map<String, Object> approveOrder(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_orders", id);
        require(actor, "APPROVER");
        if (!"PENDING_APPROVAL".equals(str(row, "status"))) throw conflict("Only orders pending approval can be approved.");
        if (!"ADMIN".equals(actor.role()) && actor.name().equalsIgnoreCase(str(row, "created_by"))) {
            throw new JobWorkException(HttpStatus.FORBIDDEN, "The creator cannot approve their own job work order.");
        }
        BigDecimal est = (BigDecimal) row.get("estimated_charges");
        if (approvalLimit != null && !"ADMIN".equals(actor.role()) && est.compareTo(approvalLimit) > 0) {
            throw new JobWorkException(HttpStatus.FORBIDDEN, "Estimated charges " + est + " exceed the approval limit " + approvalLimit + " for role " + actor.role() + ".");
        }
        // A rate contract must still be valid when the order is approved, not only when it was drafted.
        for (Map<String, Object> l : jdbc.queryForList("SELECT l.line_no, rc.id, rc.valid_until, rc.status FROM public.job_work_order_lines l "
                + "LEFT JOIN public.job_work_rate_contracts rc ON rc.id = l.rate_contract_id WHERE l.jwo_id = ?", id)) {
            if (l.get("id") == null || !"ACTIVE".equals(str(l, "status")) || ld(l.get("valid_until")).isBefore(today())) {
                throw conflict("Line " + l.get("line_no") + ": its rate contract is no longer valid. Revise the order with a current rate.");
            }
        }
        return finishOrder(id, "APPROVED", "APPROVE", "PENDING_APPROVAL", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> rejectOrder(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_orders", id);
        require(actor, "APPROVER");
        if (!"PENDING_APPROVAL".equals(str(row, "status"))) throw conflict("Only orders pending approval can be rejected.");
        requireReason(req.comments(), "Rejection reason");
        jdbc.update("UPDATE public.job_work_orders SET rejection_reason = ? WHERE id = ?", req.comments(), id);
        return finishOrder(id, "REJECTED", "REJECT", "PENDING_APPROVAL", actor, req.comments());
    }

    @Transactional
    public Map<String, Object> cancelOrder(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_orders", id);
        String from = str(row, "status");
        requireReason(req.comments(), "Cancellation reason");
        if (!Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED").contains(from)) {
            throw conflict("A " + from + " order cannot be cancelled. Cancel its challans first, or close the order.");
        }
        if (Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED").contains(from)) requireCreatorOrApprover(actor, str(row, "created_by"));
        else require(actor, "APPROVER");
        if (sumLines(id, "dispatched_qty").signum() > 0) throw conflict("Material has been dispatched on this order. It cannot be cancelled.");
        jdbc.update("UPDATE public.job_work_orders SET cancel_reason = ? WHERE id = ?", req.comments(), id);
        return finishOrder(id, "CANCELLED", "CANCEL", from, actor, req.comments());
    }

    @Transactional
    public Map<String, Object> closeOrder(long id, ActionRequest req, Actor actor) {
        Map<String, Object> row = lockRow("job_work_orders", id);
        require(actor, "APPROVER");
        if (!"COMPLETED".equals(str(row, "status"))) throw conflict("Only completed orders can be closed. Current status: " + str(row, "status"));
        return finishOrder(id, "CLOSED", "CLOSE", "COMPLETED", actor, req.comments());
    }

    Map<String, Object> finishOrder(long id, String to, String action, String from, Actor actor, String comments) {
        jdbc.update("UPDATE public.job_work_orders SET status = ?, modified_by = ?, modified_at = NOW(), version = version + 1 WHERE id = ?", to, actor.name(), id);
        history("JWO", id, action, from, to, actor, comments);
        return orderDetails(id, actor);
    }

    Prepared prepareOrder(OrderRequest r, Long existingId) {
        if (r.jobWorkerId() == null) throw bad("Select the job worker.");
        Map<String, Object> w = lockWorkerReadOnly(r.jobWorkerId());
        if (!"ACTIVE".equals(str(w, "status"))) throw conflict("Job worker " + str(w, "legal_name") + " is " + str(w, "status") + ". Orders need an active worker.");
        if (r.requestingDepartmentId() == null || jdbc.queryForObject("SELECT COUNT(*) FROM public.department_master WHERE id = ?", Integer.class, r.requestingDepartmentId()) == 0) {
            throw bad("Select the requesting department.");
        }
        if (r.sourceDepartmentId() == null || jdbc.queryForObject("SELECT COUNT(*) FROM public.department_master WHERE id = ?", Integer.class, r.sourceDepartmentId()) == 0) {
            throw bad("Select the source store.");
        }
        LocalDate date = r.jwoDate() == null ? today() : r.jwoDate();
        if (date.isAfter(today())) throw bad("Order date cannot be in the future.");
        if (r.expectedReturnDate() != null && r.expectedReturnDate().isBefore(date)) throw bad("Expected return date cannot be before the order date.");
        if (r.expectedStartDate() != null && r.expectedCompletionDate() != null && r.expectedCompletionDate().isBefore(r.expectedStartDate())) {
            throw bad("Expected completion cannot be before the start date.");
        }
        Long indentId = r.indentId();
        Map<String, Object> indent = null;
        if (indentId != null) {
            List<Map<String, Object>> ii = jdbc.queryForList("SELECT * FROM public.job_work_indents WHERE id = ?", indentId);
            if (ii.isEmpty()) throw bad("Indent not found.");
            indent = ii.get(0);
            if (!"APPROVED".equals(str(indent, "status"))) throw conflict("Only approved indents can be turned into a job work order.");
        }
        if (r.lines() == null || r.lines().isEmpty()) throw bad("Add at least one item line.");
        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int no = 0;
        for (OrderLineRequest l : r.lines()) {
            no++;
            if (l.masterId() == null) throw bad("Line " + no + ": select an item.");
            Map<String, Object> m = masterRow(l.masterId(), no);
            if (l.operationId() == null || jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_operations WHERE id = ?", Integer.class, l.operationId()) == 0) {
                throw bad("Line " + no + ": select the operation.");
            }
            if (jdbc.queryForObject("SELECT COUNT(*) FROM public.job_worker_operations WHERE job_worker_id = ? AND operation_id = ?", Integer.class, r.jobWorkerId(), l.operationId()) == 0) {
                throw bad("Line " + no + ": this operation is not approved for " + str(w, "legal_name") + ".");
            }
            if (l.inputQty() == null || l.inputQty().signum() <= 0) throw bad("Line " + no + ": input quantity must be greater than zero.");
            BigDecimal expectedOut = l.expectedOutputQty() == null ? l.inputQty() : l.expectedOutputQty();
            if (expectedOut.signum() < 0) throw bad("Line " + no + ": expected output cannot be negative.");
            String category = stockCategory(l.category(), m, no);
            if (indent != null) {
                // Input cannot exceed the approved indent quantity across all live orders for that item and operation.
                List<Map<String, Object>> ir = jdbc.queryForList("SELECT required_qty FROM public.job_work_indent_lines WHERE indent_id = ? AND master_id = ? AND operation_id = ?",
                        indentId, l.masterId(), l.operationId());
                if (ir.isEmpty()) throw bad("Line " + no + ": this item and operation are not on the selected indent.");
                BigDecimal req = (BigDecimal) ir.get(0).get("required_qty");
                BigDecimal already = jdbc.queryForObject(
                        "SELECT COALESCE(SUM(ol.input_qty), 0) FROM public.job_work_order_lines ol JOIN public.job_work_orders o ON o.id = ol.jwo_id "
                                + "WHERE o.indent_id = ? AND ol.master_id = ? AND ol.operation_id = ? AND o.status NOT IN ('REJECTED','CANCELLED') AND o.id <> ?",
                        BigDecimal.class, indentId, l.masterId(), l.operationId(), existingId == null ? -1L : existingId);
                if (already.add(l.inputQty()).compareTo(req) > 0) {
                    throw bad("Line " + no + ": " + l.inputQty() + " exceeds the indent quantity remaining (" + req.subtract(already) + ").");
                }
            }
            // Rate comes from a valid contract only: never typed in and never silently applied when expired.
            Map<String, Object> rc = contractFor(r.jobWorkerId(), l.operationId(), category, date);
            if (rc == null) {
                throw bad("Line " + no + ": no active rate contract for this operation and category with " + str(w, "legal_name") + " on " + date + ". Ask an approver to add one.");
            }
            BigDecimal minQty = (BigDecimal) rc.get("min_qty");
            if (l.inputQty().compareTo(minQty) < 0) throw bad("Line " + no + ": the contract needs at least " + minQty + " per order.");
            BigDecimal rate = (BigDecimal) rc.get("rate");
            BigDecimal est = rate.multiply(l.inputQty()).setScale(2, RoundingMode.HALF_UP);
            total = total.add(est);
            Map<String, Object> ln = new LinkedHashMap<>();
            ln.put("line_no", no);
            ln.put("master_id", l.masterId());
            ln.put("item_code", str(m, "code"));
            ln.put("item_name", str(m, "description"));
            ln.put("category", category);
            ln.put("uom", str(m, "unit_of_measurement"));
            ln.put("operation_id", l.operationId());
            ln.put("input_qty", l.inputQty());
            ln.put("expected_output_qty", expectedOut);
            ln.put("rate_contract_id", rc.get("id"));
            ln.put("rate", rate);
            ln.put("rate_basis", str(rc, "rate_basis"));
            ln.put("est_charges", est);
            ln.put("remarks", blank(l.remarks()));
            lines.add(ln);
        }
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("indent_id", indentId);
        h.put("job_worker_id", r.jobWorkerId());
        h.put("jwo_date", date);
        h.put("requesting_department_id", r.requestingDepartmentId());
        h.put("source_department_id", r.sourceDepartmentId());
        h.put("expected_start_date", r.expectedStartDate());
        h.put("expected_completion_date", r.expectedCompletionDate());
        h.put("expected_return_date", r.expectedReturnDate());
        h.put("payment_terms", blank(r.paymentTerms()) != null ? r.paymentTerms().trim() : blank(str(w, "payment_terms")));
        h.put("quality_specs", blank(r.qualitySpecs()));
        h.put("delivery_terms", blank(r.deliveryTerms()));
        h.put("rejection_terms", blank(r.rejectionTerms()));
        h.put("remarks", blank(r.remarks()));
        h.put("estimated_charges", total.setScale(2, RoundingMode.HALF_UP));
        return new Prepared(h, lines, List.of());
    }

    void insertOrderLines(long id, List<Map<String, Object>> lines) {
        for (Map<String, Object> l : lines) {
            Map<String, Object> cols = new LinkedHashMap<>(l);
            cols.put("jwo_id", id);
            insertRow("public.job_work_order_lines", cols);
        }
    }

    /** Active contract for worker + operation + category (or any category) valid on the date. Most specific first. */
    Map<String, Object> contractFor(long workerId, long operationId, String category, LocalDate on) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM public.job_work_rate_contracts WHERE job_worker_id = ? AND operation_id = ? AND status = 'ACTIVE' "
                        + "AND effective_from <= ? AND valid_until >= ? AND (item_category IS NULL OR item_category = ?) "
                        + "ORDER BY (item_category IS NULL), effective_from DESC LIMIT 1", workerId, operationId, on, on, category);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> orderDetails(long id, Actor actor) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT o.*, w.legal_name AS worker_name, w.worker_code, rd.department_name AS requesting_department, sd.department_name AS source_department "
                        + "FROM public.job_work_orders o JOIN public.job_workers w ON w.id = o.job_worker_id "
                        + "JOIN public.department_master rd ON rd.id = o.requesting_department_id "
                        + "JOIN public.department_master sd ON sd.id = o.source_department_id WHERE o.id = ?", id);
        if (rows.isEmpty()) throw notFound("Job work order " + id + " not found.");
        Map<String, Object> row = rows.get(0);
        Map<String, Object> out = camel(row);
        out.put("allowedActions", orderActions(row, actor));
        out.put("validityExpired", false);
        List<Map<String, Object>> lines = jdbc.queryForList(
                "SELECT l.*, o.operation_name, (l.dispatched_qty + l.rework_redispatched_qty - l.received_qty - l.unused_returned_qty - l.written_off_qty) AS pending_with_worker, "
                        + "(l.input_qty - l.dispatched_qty) AS to_dispatch, (l.rework_qty - l.rework_redispatched_qty) AS rework_pending "
                        + "FROM public.job_work_order_lines l JOIN public.job_work_operations o ON o.id = l.operation_id WHERE l.jwo_id = ? ORDER BY l.line_no", id);
        List<Map<String, Object>> outLines = new ArrayList<>();
        for (Map<String, Object> l : lines) {
            Map<String, Object> c = camel(l);
            c.put("sourceAvailable", available(((Number) l.get("master_id")).longValue(), str(l, "category"),
                    ((Number) row.get("source_department_id")).longValue()));
            outLines.add(c);
        }
        out.put("lines", outLines);
        out.put("challans", listChallanRows("c.jwo_id = ?", List.of(id)));
        out.put("receipts", listReceiptRows("r.jwo_id = ?", List.of(id)));
        out.put("ledger", camelList(jdbc.queryForList(
                "SELECT l.* FROM public.job_work_stock_ledger l WHERE l.jwo_id = ? ORDER BY l.created_at, l.id", id)));
        out.put("history", historyOf("JWO", id));
        out.put("attachments", attachmentsOf("JWO", id));
        out.put("dispatchedTotal", sumLines(id, "dispatched_qty"));
        out.put("receivedTotal", sumLines(id, "received_qty"));
        return out;
    }

    public Map<String, Object> listOrders(String q, String status, Long workerId, LocalDate from, LocalDate to, String overdue, int page, int size) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (notBlank(q)) {
            conds.add("(LOWER(o.jwo_number) LIKE ? OR LOWER(w.legal_name) LIKE ? OR EXISTS (SELECT 1 FROM public.job_work_order_lines l WHERE l.jwo_id = o.id AND LOWER(l.item_code) LIKE ?))");
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(like); args.add(like); args.add(like);
        }
        if (notBlank(status)) { conds.add("o.status = ?"); args.add(status.trim().toUpperCase(Locale.ROOT)); }
        if (workerId != null) { conds.add("o.job_worker_id = ?"); args.add(workerId); }
        if (from != null) { conds.add("o.jwo_date >= ?"); args.add(from); }
        if (to != null) { conds.add("o.jwo_date <= ?"); args.add(to); }
        if ("true".equalsIgnoreCase(overdue)) {
            conds.add("o.expected_return_date < CURRENT_DATE AND o.status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')");
        }
        return pageOf("FROM public.job_work_orders o JOIN public.job_workers w ON w.id = o.job_worker_id" + where(conds) + " ORDER BY o.jwo_date DESC, o.id DESC",
                "o.id, o.jwo_number, o.jwo_date, o.status, o.expected_return_date, o.estimated_charges, o.created_by, w.legal_name AS worker_name, "
                        + "(SELECT STRING_AGG(l.item_code, ', ') FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS items, "
                        + "(SELECT COALESCE(SUM(l.input_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS input_total, "
                        + "(SELECT COALESCE(SUM(l.dispatched_qty + l.rework_redispatched_qty - l.received_qty - l.unused_returned_qty - l.written_off_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS pending_with_worker, "
                        + "(o.expected_return_date < CURRENT_DATE AND o.status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')) AS overdue", args, page, size);
    }

    List<String> orderActions(Map<String, Object> row, Actor actor) {
        String s = str(row, "status");
        boolean creatorish = has(actor, "CREATOR", "APPROVER");
        boolean approver = has(actor, "APPROVER");
        boolean store = has(actor, "STORE");
        boolean own = actor.name().equalsIgnoreCase(str(row, "created_by")) && !"ADMIN".equals(actor.role());
        List<String> a = new ArrayList<>();
        if (Set.of("DRAFT", "REJECTED").contains(s) && creatorish) { a.add("EDIT"); a.add("SUBMIT"); }
        if ("PENDING_APPROVAL".equals(s) && approver && !own) { a.add("APPROVE"); a.add("REJECT"); }
        if (Set.of("DRAFT", "PENDING_APPROVAL", "REJECTED").contains(s) && creatorish) a.add("CANCEL");
        if ("APPROVED".equals(s) && approver) a.add("CANCEL");
        if ("COMPLETED".equals(s) && approver) a.add("CLOSE");
        if (Set.of("APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED").contains(s) && store) { a.add("CREATE_CHALLAN"); a.add("CREATE_RECEIPT"); }
        return a;
    }

    // ================================================================== challans (dispatch)

    @Transactional
    public Map<String, Object> createChallan(ChallanRequest r, Actor actor) {
        require(actor, "STORE");
        if (notBlank(r.clientRequestId())) {
            List<Long> dup = jdbc.queryForList("SELECT id FROM public.job_work_challans WHERE client_request_id = ?", Long.class, r.clientRequestId().trim());
            if (!dup.isEmpty()) return challanDetails(dup.get(0), actor);
        }
        if (r.jwoId() == null) throw bad("Select the job work order.");
        Map<String, Object> o = lockRow("job_work_orders", r.jwoId());
        String status = str(o, "status");
        if (!Set.of("APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED").contains(status)) {
            throw conflict("Material can be dispatched only on approved orders. Current status: " + status);
        }
        Map<String, Object> w = lockWorker(((Number) o.get("job_worker_id")).longValue());
        if (!"ACTIVE".equals(str(w, "status"))) throw conflict("Job worker is " + str(w, "status") + ". Dispatch is blocked.");
        if (r.lines() == null || r.lines().isEmpty()) throw bad("Add at least one line to the challan.");
        LocalDate date = r.challanDate() == null ? today() : r.challanDate();
        if (date.isAfter(today())) throw bad("Challan date cannot be in the future.");
        if (date.isBefore(ld(o.get("jwo_date")))) throw bad("Challan date cannot be before the order date.");
        if (!notBlank(r.authorizedBy())) throw bad("Enter the authorised person for this dispatch.");
        long sourceDept = r.reworkDispatch() ? departmentId(REWORK_STORE) : ((Number) o.get("source_department_id")).longValue();
        long externalDept = departmentId(EXTERNAL);
        Set<Long> seen = new HashSet<>();
        List<Map<String, Object>> lines = new ArrayList<>();
        int no = 0;
        for (ChallanLineRequest cl : r.lines()) {
            no++;
            if (cl.jwoLineId() == null || !seen.add(cl.jwoLineId())) throw bad("Line " + no + ": each order line can appear once per challan.");
            Map<String, Object> ol = jdbc.queryForList("SELECT * FROM public.job_work_order_lines WHERE id = ? AND jwo_id = ? FOR UPDATE", cl.jwoLineId(), r.jwoId())
                    .stream().findFirst().orElseThrow(() -> bad("A selected line is not on this order."));
            if (cl.qty() == null || cl.qty().signum() <= 0) throw bad("Line " + no + ": quantity must be greater than zero.");
            if (r.reworkDispatch()) {
                BigDecimal pendingRework = ((BigDecimal) ol.get("rework_qty")).subtract((BigDecimal) ol.get("rework_redispatched_qty"));
                if (cl.qty().compareTo(pendingRework) > 0) throw conflict("Line " + no + ": only " + pendingRework + " rework quantity is pending re-dispatch.");
            } else {
                BigDecimal toDispatch = ((BigDecimal) ol.get("input_qty")).subtract((BigDecimal) ol.get("dispatched_qty"));
                if (cl.qty().compareTo(toDispatch) > 0) {
                    throw conflict("Line " + no + ": " + cl.qty() + " exceeds the approved balance to dispatch (" + toDispatch + ").");
                }
            }
            lines.add(pair("line", ol, "qty", cl.qty(), "batch", blank(cl.batchNo()) == null ? "" : cl.batchNo().trim()));
        }
        String number = nextNumber("JWC");
        List<TransactionItemRequest> items = new ArrayList<>();
        for (Map<String, Object> l : lines) {
            Map<String, Object> ol = castMap(l.get("line"));
            items.add(item(((Number) ol.get("master_id")).longValue(), str(ol, "category"), (BigDecimal) l.get("qty"),
                    "Challan " + number + " " + str(ol, "item_code")));
        }
        // Stock is posted first: the engine refuses the whole batch if any line exceeds available stock.
        List<Long> txIds = postBatch(SEND_TYPE, sourceDept, externalDept, items, "Job work dispatch " + number);

        Map<String, Object> cols = new LinkedHashMap<>();
        cols.put("challan_number", number);
        cols.put("client_request_id", blank(r.clientRequestId()));
        cols.put("jwo_id", r.jwoId());
        cols.put("job_worker_id", ((Number) o.get("job_worker_id")).longValue());
        cols.put("challan_date", date);
        cols.put("source_department_id", sourceDept);
        cols.put("destination_location", blank(r.destinationLocation()) != null ? r.destinationLocation().trim() : str(w, "work_location"));
        cols.put("transporter", blank(r.transporter()));
        cols.put("vehicle_no", blank(r.vehicleNo()));
        cols.put("eway_bill_no", blank(r.ewayBillNo()));
        cols.put("purpose", blank(r.purpose()) != null ? r.purpose().trim() : "Job work outward");
        cols.put("authorized_by", r.authorizedBy().trim());
        cols.put("remarks", blank(r.remarks()));
        cols.put("status", "POSTED");
        cols.put("created_by", actor.name());
        cols.put("rework_dispatch", r.reworkDispatch());
        long challanId = insertRowIgnoringUnknown("public.job_work_challans", cols);
        for (int i = 0; i < lines.size(); i++) {
            Map<String, Object> l = lines.get(i);
            Map<String, Object> ol = castMap(l.get("line"));
            BigDecimal qty = (BigDecimal) l.get("qty");
            jdbc.update("INSERT INTO public.job_work_challan_lines (challan_id, jwo_line_id, master_id, category, batch_no, qty, inventory_transaction_id) VALUES (?,?,?,?,?,?,?)",
                    challanId, ol.get("id"), ol.get("master_id"), str(ol, "category"), blank((String) l.get("batch")), qty, txIds.get(i));
            if (r.reworkDispatch()) {
                jdbc.update("UPDATE public.job_work_order_lines SET rework_redispatched_qty = rework_redispatched_qty + ? WHERE id = ?", qty, ol.get("id"));
            } else {
                jdbc.update("UPDATE public.job_work_order_lines SET dispatched_qty = dispatched_qty + ? WHERE id = ?", qty, ol.get("id"));
            }
            ledger(((Number) o.get("job_worker_id")).longValue(), r.jwoId(), ((Number) ol.get("id")).longValue(), ((Number) ol.get("master_id")).longValue(),
                    str(ol, "category"), "SENT", qty, number, challanId, null, txIds.get(i), actor);
        }
        refreshOrderStatus(r.jwoId());
        history("CHALLAN", challanId, "DISPATCHED", null, "POSTED", actor, number + " · " + lines.size() + " line(s)");
        return challanDetails(challanId, actor);
    }

    @Transactional
    public Map<String, Object> cancelChallan(long id, ActionRequest req, Actor actor) {
        require(actor, "APPROVER");
        requireReason(req.comments(), "Reversal reason");
        Map<String, Object> c = lockRow("job_work_challans", id);
        if (!"POSTED".equals(str(c, "status"))) throw conflict("This challan is already " + str(c, "status") + ".");
        Integer receipts = jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_receipts WHERE challan_id = ?", Integer.class, id);
        if (receipts != null && receipts > 0) throw conflict("Receipts are recorded against this challan. Reverse the receipts first, or keep the challan.");
        long jwoId = ((Number) c.get("jwo_id")).longValue();
        boolean rework = Boolean.TRUE.equals(c.get("rework_dispatch"));
        Map<String, Object> o = lockRow("job_work_orders", jwoId);
        long workerId = ((Number) c.get("job_worker_id")).longValue();
        for (Map<String, Object> cl : jdbc.queryForList("SELECT * FROM public.job_work_challan_lines WHERE challan_id = ?", id)) {
            long lineId = ((Number) cl.get("jwo_line_id")).longValue();
            BigDecimal qty = (BigDecimal) cl.get("qty");
            Map<String, Object> ol = jdbc.queryForList("SELECT * FROM public.job_work_order_lines WHERE id = ? FOR UPDATE", lineId).get(0);
            BigDecimal afterDispatch = ((BigDecimal) ol.get("dispatched_qty")).subtract(rework ? BigDecimal.ZERO : qty);
            if (!rework && afterDispatch.add((BigDecimal) ol.get("rework_redispatched_qty")).compareTo(((BigDecimal) ol.get("received_qty")).add((BigDecimal) ol.get("unused_returned_qty"))) < 0) {
                throw conflict("Cannot reverse: material on this line has already come back. Reverse the receipts first.");
            }
            TransactionResponse rev = inventory.processReverse(reverseRequest(((Number) cl.get("inventory_transaction_id")).longValue(), "Reversal of challan " + str(c, "challan_number")));
            jdbc.update("UPDATE public.job_work_challan_lines SET reversal_transaction_id = ? WHERE id = ?", rev.getId(), cl.get("id"));
            if (rework) {
                jdbc.update("UPDATE public.job_work_order_lines SET rework_redispatched_qty = rework_redispatched_qty - ? WHERE id = ?", qty, lineId);
            } else {
                jdbc.update("UPDATE public.job_work_order_lines SET dispatched_qty = dispatched_qty - ? WHERE id = ?", qty, lineId);
            }
            ledger(workerId, jwoId, lineId, ((Number) cl.get("master_id")).longValue(), str(cl, "category"), "REVERSED_SENT", qty.negate(),
                    str(c, "challan_number"), id, null, rev.getId(), actor);
        }
        jdbc.update("UPDATE public.job_work_challans SET status = 'CANCELLED', cancel_reason = ? WHERE id = ?", req.comments(), id);
        refreshOrderStatus(jwoId);
        history("CHALLAN", id, "REVERSED", "POSTED", "CANCELLED", actor, req.comments());
        return challanDetails(id, actor);
    }

    public Map<String, Object> challanDetails(long id, Actor actor) {
        List<Map<String, Object>> rows = listChallanRows("c.id = ?", List.of(id));
        if (rows.isEmpty()) throw notFound("Challan " + id + " not found.");
        Map<String, Object> out = new LinkedHashMap<>(rows.get(0));
        out.put("lines", camelList(jdbc.queryForList(
                "SELECT cl.*, ol.item_code, ol.item_name, ol.uom, ol.line_no FROM public.job_work_challan_lines cl "
                        + "JOIN public.job_work_order_lines ol ON ol.id = cl.jwo_line_id WHERE cl.challan_id = ? ORDER BY ol.line_no", id)));
        out.put("allowedActions", actor == null ? List.of() : has(actor, "APPROVER") && "POSTED".equals(out.get("status")) ? List.of("CANCEL") : List.of());
        out.put("history", historyOf("CHALLAN", id));
        out.put("receivedAgainst", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_receipts WHERE challan_id = ?", Integer.class, id));
        return out;
    }

    List<Map<String, Object>> listChallanRows(String where, List<Object> args) {
        return camelList(jdbc.queryForList(
                "SELECT c.id, c.challan_number, c.challan_date, c.status, c.jwo_id, o.jwo_number, c.job_worker_id, w.legal_name AS worker_name, "
                        + "c.transporter, c.vehicle_no, c.eway_bill_no, c.purpose, c.authorized_by, c.destination_location, c.remarks, c.created_by, c.rework_dispatch, "
                        + "sd.department_name AS source_department, "
                        + "(SELECT COALESCE(SUM(cl.qty),0) FROM public.job_work_challan_lines cl WHERE cl.challan_id = c.id) AS total_qty, "
                        + "(SELECT COALESCE(SUM(rl.qty_received + rl.unused_returned_qty),0) FROM public.job_work_receipt_lines rl "
                        + "JOIN public.job_work_receipts r ON r.id = rl.receipt_id WHERE r.challan_id = c.id) AS returned_qty "
                        + "FROM public.job_work_challans c JOIN public.job_work_orders o ON o.id = c.jwo_id "
                        + "JOIN public.job_workers w ON w.id = c.job_worker_id JOIN public.department_master sd ON sd.id = c.source_department_id "
                        + "WHERE " + where + " ORDER BY c.challan_date DESC, c.id DESC", args.toArray()));
    }

    public Map<String, Object> listChallans(String q, String status, int page, int size) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (notBlank(q)) {
            conds.add("(LOWER(c.challan_number) LIKE ? OR LOWER(o.jwo_number) LIKE ? OR LOWER(w.legal_name) LIKE ?)");
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(like); args.add(like); args.add(like);
        }
        if (notBlank(status)) { conds.add("c.status = ?"); args.add(status.trim().toUpperCase(Locale.ROOT)); }
        return pageOf("FROM public.job_work_challans c JOIN public.job_work_orders o ON o.id = c.jwo_id JOIN public.job_workers w ON w.id = c.job_worker_id"
                + where(conds) + " ORDER BY c.challan_date DESC, c.id DESC", "c.id, c.challan_number, c.challan_date, c.status, o.jwo_number, w.legal_name AS worker_name, "
                + "(SELECT COALESCE(SUM(cl.qty),0) FROM public.job_work_challan_lines cl WHERE cl.challan_id = c.id) AS total_qty, c.eway_bill_no, c.transporter, c.vehicle_no", args, page, size);
    }

    public String challanPrintHtml(long id) {
        Map<String, Object> c = challanDetails(id, null);
        StringBuilder sb = new StringBuilder();
        sb.append("<!doctype html><html><head><meta charset='utf-8'><title>").append(esc(c.get("challanNumber")))
          .append("</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px}table{border-collapse:collapse;width:100%}")
          .append("td,th{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#f2f2f2}h1{font-size:18px;margin:0}</style></head><body>");
        sb.append("<h1>JOB WORK DELIVERY CHALLAN</h1><p>Challan No: <b>").append(esc(c.get("challanNumber")))
          .append("</b> &nbsp; Date: ").append(esc(c.get("challanDate"))).append(" &nbsp; Against order: ").append(esc(c.get("jwoNumber"))).append("</p>");
        sb.append("<table><tr><th>To (job worker)</th><td>").append(esc(c.get("workerName"))).append(" — ").append(esc(c.get("destinationLocation"))).append("</td></tr>")
          .append("<tr><th>Dispatched from</th><td>").append(esc(c.get("sourceDepartment"))).append("</td></tr>")
          .append("<tr><th>Purpose</th><td>").append(esc(c.get("purpose"))).append("</td></tr>")
          .append("<tr><th>Transporter / vehicle</th><td>").append(esc(c.get("transporter"))).append(" / ").append(esc(c.get("vehicleNo"))).append("</td></tr>")
          .append("<tr><th>E-way bill no.</th><td>").append(esc(c.get("ewayBillNo") == null ? "Not provided" : c.get("ewayBillNo"))).append("</td></tr></table>");
        sb.append("<h3>Items</h3><table><tr><th>#</th><th>Item</th><th>Description</th><th>Category</th><th>Batch</th><th>Qty</th><th>UOM</th></tr>");
        int i = 0;
        for (Object o : (List<?>) c.get("lines")) {
            Map<?, ?> l = (Map<?, ?>) o;
            sb.append("<tr><td>").append(++i).append("</td><td>").append(esc(l.get("itemCode"))).append("</td><td>").append(esc(l.get("itemName")))
              .append("</td><td>").append(esc(l.get("category"))).append("</td><td>").append(esc(l.get("batchNo"))).append("</td><td>")
              .append(esc(l.get("qty"))).append("</td><td>").append(esc(l.get("uom"))).append("</td></tr>");
        }
        sb.append("</table><p>Authorised by: ").append(esc(c.get("authorizedBy"))).append("</p><p>Receiver signature: ____________________</p></body></html>");
        return sb.toString();
    }

    // ================================================================== receipts

    @Transactional
    public Map<String, Object> createReceipt(ReceiptRequest r, Actor actor) {
        require(actor, "STORE");
        if (blank(r.idempotencyKey()) == null) throw bad("Receipt submission key is missing; refresh and try again.");
        if (r.jwoId() == null) throw bad("Select the job work order.");
        List<Long> dup = jdbc.queryForList("SELECT id FROM public.job_work_receipts WHERE jwo_id = ? AND idempotency_key = ?", Long.class, r.jwoId(), r.idempotencyKey().trim());
        if (!dup.isEmpty()) return receiptDetails(dup.get(0), actor);
        Map<String, Object> o = lockRow("job_work_orders", r.jwoId());
        String status = str(o, "status");
        if (!Set.of("IN_PROGRESS", "PARTIALLY_RECEIVED").contains(status)) throw conflict("Receipts are recorded against orders in progress. Current status: " + status);
        LocalDate date = r.receiptDate() == null ? today() : r.receiptDate();
        if (date.isAfter(today()) || date.isBefore(ld(o.get("jwo_date")))) throw bad("Receipt date must be between the order date and today.");
        if (r.challanId() != null) {
            Map<String, Object> ch = jdbc.queryForList("SELECT * FROM public.job_work_challans WHERE id = ? AND jwo_id = ?", r.challanId(), r.jwoId())
                    .stream().findFirst().orElseThrow(() -> bad("The challan does not belong to this order."));
            if (!"POSTED".equals(str(ch, "status"))) throw conflict("The challan is not active.");
        }
        if (r.lines() == null || r.lines().isEmpty()) throw bad("Enter the received quantity for at least one line.");
        List<Map<String, Object>> plan = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        int no = 0;
        for (ReceiptLineRequest rl : r.lines()) {
            no++;
            if (rl.jwoLineId() == null || !seen.add(rl.jwoLineId())) throw bad("Line " + no + ": each order line can appear once per receipt.");
            Map<String, Object> ol = jdbc.queryForList("SELECT * FROM public.job_work_order_lines WHERE id = ? AND jwo_id = ? FOR UPDATE", rl.jwoLineId(), r.jwoId())
                    .stream().findFirst().orElseThrow(() -> bad("A selected line is not on this order."));
            BigDecimal got = nz(rl.qtyReceived());
            BigDecimal unused = nz(rl.unusedReturnedQty());
            if (got.signum() < 0 || unused.signum() < 0) throw bad("Line " + no + ": quantities cannot be negative.");
            if (got.signum() == 0 && unused.signum() == 0) throw bad("Line " + no + ": enter a quantity received or returned.");
            BigDecimal pending = ((BigDecimal) ol.get("dispatched_qty")).add((BigDecimal) ol.get("rework_redispatched_qty")).subtract((BigDecimal) ol.get("received_qty")).subtract((BigDecimal) ol.get("unused_returned_qty")).subtract((BigDecimal) ol.get("written_off_qty"));
            if (got.add(unused).compareTo(pending) > 0) {
                throw conflict("Over-receiving blocked on line " + ol.get("line_no") + ": " + pending + " is with the job worker, you entered " + got.add(unused) + ".");
            }
            plan.add(pair("line", ol, "got", got, "unused", unused));
        }
        String number = nextNumber("JWR");
        // Processed material moves from External Job Work into Quality Hold; unused material goes back to the store.
        long externalDept = departmentId(EXTERNAL);
        long qualityDept = departmentId(QUALITY_HOLD);
        List<TransactionItemRequest> recvItems = new ArrayList<>();
        List<TransactionItemRequest> unusedItems = new ArrayList<>();
        for (Map<String, Object> p : plan) {
            Map<String, Object> ol = castMap(p.get("line"));
            BigDecimal got = (BigDecimal) p.get("got");
            BigDecimal unused = (BigDecimal) p.get("unused");
            if (got.signum() > 0) recvItems.add(item(((Number) ol.get("master_id")).longValue(), str(ol, "category"), got, "Receipt " + number));
            if (unused.signum() > 0) unusedItems.add(item(((Number) ol.get("master_id")).longValue(), str(ol, "category"), unused, "Unused return " + number));
        }
        List<Long> recvTx = recvItems.isEmpty() ? List.of() : postBatch(TRANSFER_TYPE, externalDept, qualityDept, recvItems, "Job work receipt " + number);
        List<Long> unusedTx = unusedItems.isEmpty() ? List.of() : postBatch(TRANSFER_TYPE, externalDept, ((Number) o.get("source_department_id")).longValue(), unusedItems, "Unused material return " + number);

        Map<String, Object> cols = new LinkedHashMap<>();
        cols.put("receipt_number", number);
        cols.put("idempotency_key", r.idempotencyKey().trim());
        cols.put("jwo_id", r.jwoId());
        cols.put("challan_id", r.challanId());
        cols.put("job_worker_id", ((Number) o.get("job_worker_id")).longValue());
        cols.put("receipt_date", date);
        cols.put("delivery_note_no", blank(r.deliveryNoteNo()));
        cols.put("remarks", blank(r.remarks()));
        cols.put("received_by", actor.name());
        long receiptId = insertRow("public.job_work_receipts", cols);
        int ri = 0, ui = 0;
        for (Map<String, Object> p : plan) {
            Map<String, Object> ol = castMap(p.get("line"));
            BigDecimal got = (BigDecimal) p.get("got");
            BigDecimal unused = (BigDecimal) p.get("unused");
            Long rtx = got.signum() > 0 ? recvTx.get(ri++) : null;
            Long utx = unused.signum() > 0 ? unusedTx.get(ui++) : null;
            long lineId = ((Number) ol.get("id")).longValue();
            long masterId = ((Number) ol.get("master_id")).longValue();
            jdbc.update("INSERT INTO public.job_work_receipt_lines (receipt_id, jwo_line_id, master_id, category, qty_received, unused_returned_qty, inspection_status, receive_transaction_id, unused_transaction_id) "
                    + "VALUES (?,?,?,?,?,?,'PENDING',?,?)", receiptId, lineId, masterId, str(ol, "category"), got, unused, rtx, utx);
            jdbc.update("UPDATE public.job_work_order_lines SET received_qty = received_qty + ?, unused_returned_qty = unused_returned_qty + ? WHERE id = ?", got, unused, lineId);
            long workerId = ((Number) o.get("job_worker_id")).longValue();
            if (got.signum() > 0) ledger(workerId, r.jwoId(), lineId, masterId, str(ol, "category"), "RECEIVED", got.negate(), number, r.challanId(), receiptId, rtx, actor);
            if (unused.signum() > 0) ledger(workerId, r.jwoId(), lineId, masterId, str(ol, "category"), "RETURNED_UNUSED", unused.negate(), number, r.challanId(), receiptId, utx, actor);
        }
        refreshOrderStatus(r.jwoId());
        history("RECEIPT", receiptId, "RECEIVED", null, "PENDING_INSPECTION", actor, number);
        return receiptDetails(receiptId, actor);
    }

    @Transactional
    public Map<String, Object> inspectLine(long receiptLineId, InspectionRequest req, Actor actor) {
        require(actor, "QUALITY");
        Map<String, Object> rl = jdbc.queryForList("SELECT rl.*, r.jwo_id, r.receipt_number FROM public.job_work_receipt_lines rl "
                + "JOIN public.job_work_receipts r ON r.id = rl.receipt_id WHERE rl.id = ? FOR UPDATE", receiptLineId)
                .stream().findFirst().orElseThrow(() -> notFound("Receipt line not found."));
        if (!"PENDING".equals(str(rl, "inspection_status"))) throw conflict("This line has already been inspected. A line is inspected once; open a new receipt for further goods.");
        Map<String, Object> o = lockRow("job_work_orders", ((Number) rl.get("jwo_id")).longValue());
        BigDecimal qty = (BigDecimal) rl.get("qty_received");
        BigDecimal acc = nz(req.acceptedQty()), rej = nz(req.rejectedQty()), rew = nz(req.reworkQty()), scr = nz(req.scrapQty());
        for (BigDecimal v : List.of(acc, rej, rew, scr)) if (v.signum() < 0) throw bad("Quantities cannot be negative.");
        if (acc.add(rej).add(rew).add(scr).compareTo(qty) != 0) {
            throw bad("Accepted + rejected + rework + scrap (" + acc.add(rej).add(rew).add(scr) + ") must equal the received quantity " + qty + ". Nothing is adjusted silently.");
        }
        if ((rej.signum() > 0 || scr.signum() > 0 || rew.signum() > 0) && blank(req.defectCode()) == null) {
            throw bad("Give a defect code for rejected, rework or scrap quantities.");
        }
        long masterId = ((Number) rl.get("master_id")).longValue();
        String category = str(rl, "category");
        long sourceDept = ((Number) o.get("source_department_id")).longValue();
        long qualityDept = departmentId(QUALITY_HOLD);
        // Only inspected material leaves Quality Hold: accepted returns to store, rejected and scrap to Rejection Store, rework to Rework-Burning.
        if (acc.signum() > 0) postBatch(TRANSFER_TYPE, qualityDept, sourceDept, List.of(item(masterId, category, acc, "Accepted " + str(rl, "receipt_number"))), "Accepted after inspection " + str(rl, "receipt_number"));
        if (rej.add(scr).signum() > 0) postBatch(TRANSFER_TYPE, qualityDept, departmentId(REJECTION_STORE),
                List.of(item(masterId, category, rej.add(scr), "Rejected/scrap " + str(rl, "receipt_number"))), "Rejected/scrap " + str(rl, "receipt_number"));
        if (rew.signum() > 0) postBatch(TRANSFER_TYPE, qualityDept, departmentId(REWORK_STORE),
                List.of(item(masterId, category, rew, "Rework " + str(rl, "receipt_number"))), "Rework " + str(rl, "receipt_number"));

        jdbc.update("UPDATE public.job_work_receipt_lines SET inspection_status = 'INSPECTED', accepted_qty = ?, rejected_qty = ?, rework_qty = ?, "
                + "scrap_qty = ?, defect_code = ?, inspection_remarks = ?, inspected_by = ?, inspected_at = NOW() WHERE id = ?",
                acc, rej, rew, scr, blank(req.defectCode()), blank(req.remarks()), actor.name(), receiptLineId);
        jdbc.update("UPDATE public.job_work_order_lines SET accepted_qty = accepted_qty + ?, rejected_qty = rejected_qty + ?, rework_qty = rework_qty + ?, "
                + "scrap_qty = scrap_qty + ? WHERE id = ?", acc, rej, rew, scr, rl.get("jwo_line_id"));
        refreshOrderStatus(((Number) rl.get("jwo_id")).longValue());
        history("RECEIPT", ((Number) rl.get("receipt_id")).longValue(), "INSPECTED", "PENDING_INSPECTION", "INSPECTED", actor,
                "Line " + receiptLineId + ": acc " + acc + ", rej " + rej + ", rework " + rew + ", scrap " + scr);
        return receiptDetails(((Number) rl.get("receipt_id")).longValue(), actor);
    }

    public Map<String, Object> receiptDetails(long id, Actor actor) {
        List<Map<String, Object>> rows = listReceiptRows("r.id = ?", List.of(id));
        if (rows.isEmpty()) throw notFound("Receipt " + id + " not found.");
        Map<String, Object> out = new LinkedHashMap<>(rows.get(0));
        out.put("lines", camelList(jdbc.queryForList(
                "SELECT rl.id AS receipt_line_id, rl.*, ol.line_no, ol.item_code, ol.item_name, ol.uom FROM public.job_work_receipt_lines rl "
                        + "JOIN public.job_work_order_lines ol ON ol.id = rl.jwo_line_id WHERE rl.receipt_id = ? ORDER BY ol.line_no", id)));
        out.put("history", historyOf("RECEIPT", id));
        out.put("allowedActions", List.of());
        return out;
    }

    List<Map<String, Object>> listReceiptRows(String where, List<Object> args) {
        return camelList(jdbc.queryForList(
                "SELECT r.id, r.receipt_number, r.receipt_date, r.jwo_id, o.jwo_number, r.challan_id, c.challan_number, r.job_worker_id, w.legal_name AS worker_name, "
                        + "r.delivery_note_no, r.remarks, r.received_by, "
                        + "(SELECT COALESCE(SUM(rl.qty_received),0) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id) AS received_qty, "
                        + "(SELECT COUNT(*) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id AND rl.inspection_status = 'PENDING') AS pending_inspection_lines "
                        + "FROM public.job_work_receipts r JOIN public.job_work_orders o ON o.id = r.jwo_id JOIN public.job_workers w ON w.id = r.job_worker_id "
                        + "LEFT JOIN public.job_work_challans c ON c.id = r.challan_id WHERE " + where + " ORDER BY r.receipt_date DESC, r.id DESC", args.toArray()));
    }

    public Map<String, Object> listReceipts(String q, String inspection, int page, int size) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (notBlank(q)) {
            conds.add("(LOWER(r.receipt_number) LIKE ? OR LOWER(o.jwo_number) LIKE ? OR LOWER(w.legal_name) LIKE ?)");
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(like); args.add(like); args.add(like);
        }
        if ("PENDING".equalsIgnoreCase(inspection)) conds.add("EXISTS (SELECT 1 FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id AND rl.inspection_status = 'PENDING')");
        if ("DONE".equalsIgnoreCase(inspection)) conds.add("NOT EXISTS (SELECT 1 FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id AND rl.inspection_status = 'PENDING')");
        return pageOf("FROM public.job_work_receipts r JOIN public.job_work_orders o ON o.id = r.jwo_id JOIN public.job_workers w ON w.id = r.job_worker_id"
                + where(conds) + " ORDER BY r.receipt_date DESC, r.id DESC", "r.id, r.receipt_number, r.receipt_date, o.jwo_number, w.legal_name AS worker_name, "
                + "(SELECT COALESCE(SUM(rl.qty_received),0) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id) AS received_qty, "
                + "(SELECT COUNT(*) FROM public.job_work_receipt_lines rl WHERE rl.receipt_id = r.id AND rl.inspection_status = 'PENDING') AS pending_inspection_lines, "
                + "r.received_by", args, page, size);
    }

    // ================================================================== stock ledger & dashboard

    public Map<String, Object> listLedger(Long workerId, Long jwoId, Long masterId, String q, int page, int size) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (workerId != null) { conds.add("l.job_worker_id = ?"); args.add(workerId); }
        if (jwoId != null) { conds.add("l.jwo_id = ?"); args.add(jwoId); }
        if (masterId != null) { conds.add("l.master_id = ?"); args.add(masterId); }
        if (notBlank(q)) { conds.add("(LOWER(l.reference_no) LIKE ? OR LOWER(m.code) LIKE ?)"); String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%"; args.add(like); args.add(like); }
        return pageOf("FROM public.job_work_stock_ledger l JOIN public.master m ON m.id = l.master_id JOIN public.job_workers w ON w.id = l.job_worker_id"
                + where(conds) + " ORDER BY l.created_at DESC, l.id DESC",
                "l.id, l.created_at, w.legal_name AS worker_name, m.code AS item_code, l.category, l.movement_type, l.qty, l.balance_after, l.reference_no, l.jwo_id, "
                        + "(SELECT o.jwo_number FROM public.job_work_orders o WHERE o.id = l.jwo_id) AS jwo_number", args, page, size);
    }

    /** Material with workers, overdue, pending returns, reconciliation, inspection and costs. */
    public Map<String, Object> dashboard() {
        Map<String, Object> d = new LinkedHashMap<>();
        Map<String, Object> byStatus = new LinkedHashMap<>();
        for (Map<String, Object> r : jdbc.queryForList("SELECT status, COUNT(*) AS n FROM public.job_work_orders GROUP BY status")) {
            byStatus.put(str(r, "status"), r.get("n"));
        }
        d.put("ordersByStatus", byStatus);
        d.put("totalOrders", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_orders", Integer.class));
        d.put("pendingIndentApprovals", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_indents WHERE status = 'SUBMITTED'", Integer.class));
        d.put("ordersPendingApproval", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_orders WHERE status = 'PENDING_APPROVAL'", Integer.class));
        d.put("materialWithWorkersQty", jdbc.queryForObject(
                "SELECT COALESCE(SUM(bal), 0) FROM (SELECT SUM(qty) AS bal FROM public.job_work_stock_ledger GROUP BY job_worker_id, master_id, category) t WHERE bal > 0", BigDecimal.class));
        d.put("overdueOrders", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_orders WHERE expected_return_date < CURRENT_DATE "
                + "AND status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')", Integer.class));
        d.put("pendingReturnOrders", jdbc.queryForObject("SELECT COUNT(DISTINCT jwo_id) FROM public.job_work_order_lines WHERE dispatched_qty + rework_redispatched_qty - received_qty - unused_returned_qty - written_off_qty > 0", Integer.class));
        d.put("openChallans", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_challans c WHERE c.status = 'POSTED' AND EXISTS (SELECT 1 FROM public.job_work_challan_lines cl "
                + "JOIN public.job_work_order_lines ol ON ol.id = cl.jwo_line_id WHERE cl.challan_id = c.id AND ol.dispatched_qty + ol.rework_redispatched_qty - ol.received_qty - ol.unused_returned_qty - ol.written_off_qty > 0)", Integer.class));
        d.put("receiptsAwaitingInspection", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_receipt_lines WHERE inspection_status = 'PENDING'", Integer.class));
        d.put("rejectedQty", sumCol("rejected_qty"));
        d.put("reworkQty", sumCol("rework_qty"));
        d.put("scrapQty", sumCol("scrap_qty"));
        d.put("reworkPendingQty", jdbc.queryForObject("SELECT COALESCE(SUM(rework_qty - rework_redispatched_qty),0) FROM public.job_work_order_lines", BigDecimal.class));
        d.put("costByWorker", camelList(jdbc.queryForList(
                "SELECT w.legal_name AS name, COALESCE(SUM(o.estimated_charges),0) AS amount, COUNT(o.id) AS orders FROM public.job_workers w "
                        + "LEFT JOIN public.job_work_orders o ON o.job_worker_id = w.id AND o.status NOT IN ('DRAFT','REJECTED','CANCELLED') GROUP BY w.legal_name ORDER BY amount DESC")));
        d.put("costByDepartment", camelList(jdbc.queryForList(
                "SELECT rd.department_name AS name, COALESCE(SUM(o.estimated_charges),0) AS amount, COUNT(o.id) AS orders FROM public.job_work_orders o "
                        + "JOIN public.department_master rd ON rd.id = o.requesting_department_id WHERE o.status NOT IN ('DRAFT','REJECTED','CANCELLED') "
                        + "GROUP BY rd.department_name ORDER BY amount DESC")));
        d.put("costByItem", camelList(jdbc.queryForList(
                "SELECT l.item_code AS name, COALESCE(SUM(l.est_charges),0) AS amount, COUNT(l.id) AS orders FROM public.job_work_order_lines l "
                        + "JOIN public.job_work_orders o ON o.id = l.jwo_id WHERE o.status NOT IN ('DRAFT','REJECTED','CANCELLED') GROUP BY l.item_code ORDER BY amount DESC LIMIT 10")));
        d.put("turnaroundByWorker", camelList(jdbc.queryForList(
                "SELECT w.legal_name AS name, ROUND(AVG(r.receipt_date - c.challan_date), 1) AS avg_days, COUNT(r.id) AS receipts FROM public.job_work_receipts r "
                        + "JOIN public.job_work_challans c ON c.id = r.challan_id JOIN public.job_workers w ON w.id = r.job_worker_id GROUP BY w.legal_name ORDER BY avg_days")));
        return d;
    }

    BigDecimal sumCol(String col) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(" + col + "),0) FROM public.job_work_order_lines", BigDecimal.class);
    }

    // ================================================================== status rules

    /** Recomputes the order status from its lines and inspections. Never sets COMPLETED while material is out. */
    void refreshOrderStatus(long jwoId) {
        Map<String, Object> o = jdbc.queryForList("SELECT status FROM public.job_work_orders WHERE id = ?", jwoId).get(0);
        String status = str(o, "status");
        if (!Set.of("APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED", "COMPLETED").contains(status)) return;
        List<Map<String, Object>> lines = jdbc.queryForList("SELECT * FROM public.job_work_order_lines WHERE jwo_id = ?", jwoId);
        BigDecimal dispatched = BigDecimal.ZERO, received = BigDecimal.ZERO;
        boolean allDone = true;
        for (Map<String, Object> l : lines) {
            BigDecimal dq = (BigDecimal) l.get("dispatched_qty");
            BigDecimal rq = (BigDecimal) l.get("received_qty");
            BigDecimal uq = (BigDecimal) l.get("unused_returned_qty");
            dispatched = dispatched.add(dq);
            received = received.add(rq);
            BigDecimal rework = ((BigDecimal) l.get("rework_qty")).subtract((BigDecimal) l.get("rework_redispatched_qty"));
            boolean lineDone = dq.compareTo((BigDecimal) l.get("input_qty")) == 0 && dq.add((BigDecimal) l.get("rework_redispatched_qty")).subtract(rq).subtract(uq).subtract((BigDecimal) l.get("written_off_qty")).signum() == 0 && rework.signum() == 0;
            if (!lineDone) allDone = false;
        }
        Integer pendingInspection = jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_receipt_lines rl JOIN public.job_work_receipts r ON r.id = rl.receipt_id "
                + "WHERE r.jwo_id = ? AND rl.inspection_status = 'PENDING'", Integer.class, jwoId);
        String next;
        if (allDone && (pendingInspection == null || pendingInspection == 0) && dispatched.signum() > 0) next = "COMPLETED";
        else if (received.signum() > 0) next = "PARTIALLY_RECEIVED";
        else if (dispatched.signum() > 0) next = "IN_PROGRESS";
        else next = "APPROVED";
        if (!next.equals(status)) {
            jdbc.update("UPDATE public.job_work_orders SET status = ?, modified_at = NOW() WHERE id = ?", next, jwoId);
            history("JWO", jwoId, "STATUS_CHANGED", status, next, new Actor("system", "ADMIN"), null);
        }
    }

    // ================================================================== inventory & ledger helpers

    long departmentId(String name) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM public.department_master WHERE department_name = ? AND status = 'ACTIVE'", Long.class, name);
        if (ids.isEmpty()) throw new JobWorkException(HttpStatus.INTERNAL_SERVER_ERROR, "Location '" + name + "' is missing from Department Master.");
        return ids.get(0);
    }

    TransactionItemRequest item(long masterId, String category, BigDecimal qty, String remarks) {
        TransactionItemRequest t = new TransactionItemRequest();
        t.setMasterId(masterId);
        t.setCategory(category);
        t.setQuantity(qty);
        t.setRemarks(remarks);
        return t;
    }

    /** Posts a batch through the inventory engine. Returns one transaction id per item, in order. */
    List<Long> postBatch(String type, long fromDept, long toDept, List<TransactionItemRequest> items, String remarks) {
        CreateBatchTransactionRequest req = new CreateBatchTransactionRequest();
        req.setTransactionType(type);
        req.setFromDepartmentId(fromDept);
        req.setToDepartmentId(toDept);
        req.setRemarks(remarks);
        req.setItems(items);
        List<TransactionResponse> res = inventory.processBatchTransaction(req);
        return res.stream().map(TransactionResponse::getId).collect(Collectors.toList());
    }

    CreateReverseRequest reverseRequest(long txId, String remarks) {
        CreateReverseRequest r = new CreateReverseRequest();
        r.setTargetTransactionId(txId);
        r.setRemarks(remarks);
        return r;
    }

    /** Job-worker-wise ledger. Locks the worker row so two postings for one worker cannot read the same balance. */
    void ledger(long workerId, long jwoId, long lineId, long masterId, String category, String movement, BigDecimal signedQty,
                        String ref, Long challanId, Long receiptId, Long invTxId, Actor actor) {
        jdbc.queryForObject("SELECT id FROM public.job_workers WHERE id = ? FOR UPDATE", Long.class, workerId);
        BigDecimal prev = jdbc.queryForObject("SELECT COALESCE(SUM(qty), 0) FROM public.job_work_stock_ledger WHERE job_worker_id = ? AND master_id = ? AND category = ?",
                BigDecimal.class, workerId, masterId, category);
        BigDecimal next = prev.add(signedQty);
        if (next.signum() < 0) throw conflict("Job worker balance would go negative for " + category + " (balance " + prev + ", movement " + signedQty + ").");
        jdbc.update("INSERT INTO public.job_work_stock_ledger (job_worker_id, jwo_id, jwo_line_id, master_id, category, movement_type, qty, balance_after, reference_no, "
                + "challan_id, receipt_id, inventory_transaction_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                workerId, jwoId, lineId, masterId, category, movement, signedQty, next, ref, challanId, receiptId, invTxId, actor.name());
    }

    // ================================================================== inspection of a job worker's stock: balances endpoint helper

    // ================================================================== history, attachments

    void history(String entity, long id, String action, String from, String to, Actor actor, String comments) {
        jdbc.update("INSERT INTO public.job_work_history (entity_type, entity_id, action, from_status, to_status, actor, actor_role, comments) VALUES (?,?,?,?,?,?,?,?)",
                entity, id, action, from, to, actor.name(), actor.role(), blank(comments));
    }

    List<Map<String, Object>> historyOf(String entity, long id) {
        return camelList(jdbc.queryForList("SELECT * FROM public.job_work_history WHERE entity_type = ? AND entity_id = ? ORDER BY acted_at, id", entity, id));
    }

    List<Map<String, Object>> attachmentsOf(String entity, long id) {
        return camelList(jdbc.queryForList("SELECT id, doc_type, file_name, content_type, size_bytes, uploaded_by, uploaded_at FROM public.job_work_attachments "
                + "WHERE entity_type = ? AND entity_id = ? ORDER BY uploaded_at, id", entity, id));
    }

    @Transactional
    public Map<String, Object> addAttachment(AttachmentRequest r, Actor actor) {
        String entity = upper(r.entityType());
        if (!Set.of("INDENT", "JWO", "CHALLAN", "RECEIPT", "WORKER").contains(entity) || r.entityId() == null) throw bad("Attach to an indent, order, challan, receipt or job worker.");
        String type = r.contentType() == null ? "" : r.contentType().trim().toLowerCase(Locale.ROOT);
        if (!Set.of("application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document").contains(type)) {
            throw bad("Unsupported file type. Allowed: PDF, PNG, JPEG, XLSX, DOCX.");
        }
        String name = r.fileName() == null ? "" : r.fileName().replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        if (name.isEmpty() || name.length() > 255) throw bad("A valid file name is required.");
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(nz(r.contentBase64()).replaceAll("^data:[^,]*,", ""));
        } catch (IllegalArgumentException e) {
            throw bad("File content is not valid base64.");
        }
        if (bytes.length == 0 || bytes.length > 5L * 1024 * 1024) throw bad("File must be between 1 byte and 5 MB.");
        jdbc.update("INSERT INTO public.job_work_attachments (entity_type, entity_id, doc_type, file_name, content_type, size_bytes, content, uploaded_by) VALUES (?,?,?,?,?,?,?,?)",
                entity, r.entityId(), blank(r.docType()) == null ? "OTHER" : upper(r.docType()), name, type, bytes.length, bytes, actor.name());
        history(entity, r.entityId(), "ATTACHMENT_ADDED", null, null, actor, name);
        return Map.of("ok", true);
    }

    public Map<String, Object> attachment(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT file_name, content_type, content FROM public.job_work_attachments WHERE id = ?", id);
        if (rows.isEmpty()) throw notFound("Attachment not found.");
        return rows.get(0);
    }

    // ================================================================== locks & small helpers

    Map<String, Object> lockRow(String table, long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public." + table + " WHERE id = ? FOR UPDATE", id);
        if (rows.isEmpty()) throw notFound(table + " " + id + " not found.");
        return rows.get(0);
    }

    Map<String, Object> lockWorker(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.job_workers WHERE id = ? FOR UPDATE", id);
        if (rows.isEmpty()) throw notFound("Job worker " + id + " not found.");
        return rows.get(0);
    }

    Map<String, Object> lockWorkerReadOnly(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.job_workers WHERE id = ?", id);
        if (rows.isEmpty()) throw bad("Job worker " + id + " not found.");
        return rows.get(0);
    }

    Map<String, Object> masterRow(long masterId, int lineNo) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id, code, description, category, unit_of_measurement FROM public.master WHERE id = ?", masterId);
        if (rows.isEmpty()) throw bad("Line " + lineNo + ": item " + masterId + " does not exist.");
        Map<String, Object> m = rows.get(0);
        if (blank(str(m, "category")) == null) throw bad("Line " + lineNo + ": item " + str(m, "code") + " has no category.");
        return m;
    }

    /** Stock category the material is held under. Defaults to the item master category; must exist in the category master. */
    String stockCategory(String requested, Map<String, Object> master, int lineNo) {
        String category = notBlank(requested) ? requested.trim() : str(master, "category");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM public.category_master WHERE category_name = ?", Integer.class, category) == 0) {
            throw bad("Line " + lineNo + ": category " + category + " is not in the category master.");
        }
        return category;
    }

    BigDecimal sumLines(long jwoId, String column) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(" + column + "), 0) FROM public.job_work_order_lines WHERE jwo_id = ?", BigDecimal.class, jwoId);
    }

    void requireCreatorOrApprover(Actor actor, String createdBy) {
        if (!has(actor, "CREATOR", "APPROVER")) throw new JobWorkException(HttpStatus.FORBIDDEN, "Only the creator or an approver can change this record.");
    }

    Map<String, Object> pageOf(String fromWhere, String select, List<Object> args, int page, int size) {
        String countFrom = fromWhere.contains(" ORDER BY ") ? fromWhere.substring(0, fromWhere.indexOf(" ORDER BY ")) : fromWhere;
        Integer total = jdbc.queryForObject("SELECT COUNT(*) " + countFrom, Integer.class, args.toArray());
        int safeSize = Math.max(1, Math.min(size, MAX_LIST));
        int safePage = Math.max(0, page);
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add(safePage * safeSize);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT " + select + " " + fromWhere + " LIMIT ? OFFSET ?", pageArgs.toArray());
        int tot = total == null ? 0 : total;
        return new LinkedHashMap<>(Map.of("content", camelList(rows), "page", safePage, "size", safeSize,
                "totalElements", tot, "totalPages", (int) Math.ceil(tot / (double) safeSize)));
    }

    /** Builds an ordered, mutable map from alternating key/value arguments. */
    static Map<String, Object> pair(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    static String where(List<String> conds) {
        return conds.isEmpty() ? "" : " WHERE " + String.join(" AND ", conds);
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> castList(Object o) {
        return (List<Map<String, Object>>) o;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> castMap(Object o) {
        return (Map<String, Object>) o;
    }

    long nextSeq() {
        return jdbc.queryForObject("SELECT nextval('public.job_work_number_seq')", Long.class);
    }

    String nextNumber(String prefix) {
        return String.format(Locale.ROOT, "%s-%d-%05d", prefix, today().getYear(), nextSeq());
    }

    long insertRow(String table, Map<String, Object> cols) {
        String names = String.join(", ", cols.keySet());
        String marks = cols.keySet().stream().map(k -> "?").collect(Collectors.joining(", "));
        return jdbc.queryForObject("INSERT INTO " + table + " (" + names + ") VALUES (" + marks + ") RETURNING id", Long.class, cols.values().toArray());
    }

    long insertRowIgnoringUnknown(String table, Map<String, Object> cols) {
        return insertRow(table, cols);
    }

    void updateRow(String table, long id, Map<String, Object> cols) {
        String sets = cols.keySet().stream().map(k -> k + " = ?").collect(Collectors.joining(", "));
        List<Object> args = new ArrayList<>(cols.values());
        args.add(id);
        jdbc.update("UPDATE " + table + " SET " + sets + " WHERE id = ?", args.toArray());
    }

    static ZoneId zone() {
        return ZoneId.of("Asia/Kolkata");
    }

    static LocalDate today() {
        return LocalDate.now(zone());
    }

    static JobWorkException bad(String m) {
        return new JobWorkException(HttpStatus.BAD_REQUEST, m);
    }

    static JobWorkException conflict(String m) {
        return new JobWorkException(HttpStatus.CONFLICT, m);
    }

    static JobWorkException notFound(String m) {
        return new JobWorkException(HttpStatus.NOT_FOUND, m);
    }

    static void requireReason(String text, String label) {
        if (text == null || text.isBlank()) throw bad(label + " is required.");
    }

    static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    static String blank(String s) {
        return notBlank(s) ? s.trim() : null;
    }

    static String upper(String s) {
        return notBlank(s) ? s.trim().toUpperCase(Locale.ROOT) : null;
    }

    static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    static String nz(String v) {
        return v == null ? "" : v;
    }

    static String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v == null ? null : String.valueOf(v);
    }

    static LocalDate ld(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate d) return d;
        if (o instanceof java.sql.Date d) return d.toLocalDate();
        return LocalDate.parse(o.toString());
    }

    static String joinNonBlank(String sep, String... parts) {
        return Arrays.stream(parts).filter(JobWorkService::notBlank).map(String::trim).collect(Collectors.joining(sep));
    }

    static String esc(Object o) {
        if (o == null) return "";
        return String.valueOf(o).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    static Map<String, Object> camel(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : row.entrySet()) out.put(camelKey(e.getKey()), jsonValue(e.getValue()));
        return out;
    }

    static List<Map<String, Object>> camelList(List<Map<String, Object>> rows) {
        return rows.stream().map(JobWorkService::camel).collect(Collectors.toList());
    }

    static Object jsonValue(Object v) {
        if (v instanceof java.sql.Date d) return d.toLocalDate().toString();
        if (v instanceof Timestamp t) return t.toInstant().toString();
        if (v instanceof byte[]) return null;
        return v;
    }

    static String camelKey(String k) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : k.toCharArray()) {
            if (c == '_') { up = true; continue; }
            sb.append(up ? Character.toUpperCase(c) : c);
            up = false;
        }
        return sb.toString();
    }

    /** Header map and line maps prepared by the validators, written in one transaction. */
    record Prepared(Map<String, Object> header, List<Map<String, Object>> lines, List<Map<String, Object>> extra) {}
}
