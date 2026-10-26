package com.silvermuller.seals.modules.purchase.jobwork;

import com.silvermuller.seals.modules.purchase.jobwork.JobWorkDtos.*;
import com.silvermuller.seals.modules.purchase.jobwork.JobWorkService.Actor;
import com.silvermuller.seals.modules.purchase.jobwork.JobWorkService.JobWorkException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Reconciliation of job work material: scrap disposal, shortage and process-loss write-offs (each
 * approved by someone other than the requester), permissible loss per operation, and alerts.
 * Stock moves only for scrap disposal (Rejection Store -> Scrap Yard). A write-off reduces what the
 * job worker is shown as holding; no stock is created.
 */
@Service
public class JobWorkReconciliationService {

    static final Set<String> ADJ_TYPES = Set.of("SCRAP_DISPOSAL", "SHORTAGE", "PROCESS_LOSS");
    static final String REJECTION_STORE = "Rejection Store";
    static final String SCRAP_YARD = "Scrap Yard";

    private final JdbcTemplate jdbc;
    private final JobWorkService jw;

    public JobWorkReconciliationService(JdbcTemplate jdbc, JobWorkService jw) {
        this.jdbc = jdbc;
        this.jw = jw;
    }

    // ================================================================== permissible loss

    public List<Map<String, Object>> lossPolicies() {
        return JobWorkService.camelList(jdbc.queryForList(
                "SELECT p.id, p.operation_id, o.operation_name, p.category, p.permissible_pct, p.effective_from "
                        + "FROM public.job_work_loss_policy p JOIN public.job_work_operations o ON o.id = p.operation_id ORDER BY o.operation_name, p.category"));
    }

    @Transactional
    public Map<String, Object> saveLossPolicy(LossPolicyRequest r, Actor actor) {
        jw.actor(actor.name(), actor.role());
        if (!JobWorkService.has(actor, "APPROVER")) throw new JobWorkException(HttpStatus.FORBIDDEN, "Only an approver can set permissible loss.");
        if (r.operationId() == null || jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_operations WHERE id = ?", Integer.class, r.operationId()) == 0) {
            throw JobWorkService.bad("Select the operation.");
        }
        if (r.permissiblePct() == null || r.permissiblePct().signum() < 0 || r.permissiblePct().compareTo(new BigDecimal("100")) > 0) {
            throw JobWorkService.bad("Permissible loss must be between 0% and 100%.");
        }
        String category = JobWorkService.blank(r.category());
        int n = jdbc.update("UPDATE public.job_work_loss_policy SET permissible_pct = ?, effective_from = CURRENT_DATE WHERE operation_id = ? AND COALESCE(category, '') = COALESCE(?, '')",
                r.permissiblePct(), r.operationId(), category);
        if (n == 0) {
            jdbc.update("INSERT INTO public.job_work_loss_policy (operation_id, category, permissible_pct, created_by) VALUES (?,?,?,?)",
                    r.operationId(), category, r.permissiblePct(), actor.name());
        }
        return Map.of("saved", true);
    }

    /** Category-specific rule first, then the operation-wide rule, else zero. */
    BigDecimal permissiblePct(long operationId, String category) {
        List<BigDecimal> rows = jdbc.queryForList(
                "SELECT permissible_pct FROM public.job_work_loss_policy WHERE operation_id = ? AND (category IS NULL OR category = ?) ORDER BY (category IS NULL) LIMIT 1",
                BigDecimal.class, operationId, category == null ? "" : category);
        return rows.isEmpty() ? BigDecimal.ZERO : rows.get(0);
    }

    // ================================================================== reconciliation per order

    /** One row per order: how much went out, came back, is still with the worker, and what was lost or scrapped. */
    public Map<String, Object> orders(String q, String status, boolean overdueOnly, int page, int size) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        conds.add("o.status NOT IN ('DRAFT','PENDING_APPROVAL','REJECTED','CANCELLED')");
        if (JobWorkService.notBlank(q)) {
            conds.add("(LOWER(o.jwo_number) LIKE ? OR LOWER(w.legal_name) LIKE ?)");
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(like); args.add(like);
        }
        if (JobWorkService.notBlank(status)) { conds.add("o.status = ?"); args.add(status.trim().toUpperCase(Locale.ROOT)); }
        if (overdueOnly) conds.add("o.expected_return_date < CURRENT_DATE AND o.status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')");
        String from = "FROM public.job_work_orders o JOIN public.job_workers w ON w.id = o.job_worker_id WHERE " + String.join(" AND ", conds);
        Integer total = jdbc.queryForObject("SELECT COUNT(*) " + from, Integer.class, args.toArray());
        int safeSize = Math.max(1, Math.min(size, 200));
        int safePage = Math.max(0, page);
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add(safePage * safeSize);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT o.id, o.jwo_number, o.status, o.expected_return_date, w.legal_name AS worker_name, "
                        + "(o.expected_return_date < CURRENT_DATE AND o.status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED')) AS overdue, "
                        + "(SELECT COALESCE(SUM(l.dispatched_qty + l.rework_redispatched_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS sent, "
                        + "(SELECT COALESCE(SUM(l.received_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS processed_back, "
                        + "(SELECT COALESCE(SUM(l.unused_returned_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS unused_back, "
                        + "(SELECT COALESCE(SUM(l.dispatched_qty + l.rework_redispatched_qty - l.received_qty - l.unused_returned_qty - l.written_off_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS with_worker, "
                        + "(SELECT COALESCE(SUM(l.written_off_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS written_off, "
                        + "(SELECT COALESCE(SUM(l.scrap_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS scrap, "
                        + "(SELECT COALESCE(SUM(l.rejected_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS rejected, "
                        + "(SELECT COALESCE(SUM(l.rework_qty - l.rework_redispatched_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS rework_pending, "
                        + "(SELECT COUNT(*) FROM public.job_work_adjustments a WHERE a.jwo_id = o.id AND a.status = 'PENDING') AS pending_adjustments "
                        + from + " ORDER BY o.jwo_date DESC, o.id DESC LIMIT ? OFFSET ?", pageArgs.toArray());
        int tot = total == null ? 0 : total;
        return new LinkedHashMap<>(Map.of("content", JobWorkService.camelList(rows), "page", safePage, "size", safeSize,
                "totalElements", tot, "totalPages", (int) Math.ceil(tot / (double) safeSize)));
    }

    /** Line-level reconciliation for one order. */
    public Map<String, Object> orderReconciliation(long jwoId, Actor actor) {
        Map<String, Object> o = jdbc.queryForList("SELECT o.*, w.legal_name AS worker_name FROM public.job_work_orders o "
                + "JOIN public.job_workers w ON w.id = o.job_worker_id WHERE o.id = ?", jwoId).stream().findFirst()
                .orElseThrow(() -> JobWorkService.notFound("Job work order not found."));
        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal withWorkerTotal = BigDecimal.ZERO, excessTotal = BigDecimal.ZERO;
        for (Map<String, Object> l : jdbc.queryForList("SELECT l.*, op.operation_name FROM public.job_work_order_lines l "
                + "JOIN public.job_work_operations op ON op.id = l.operation_id WHERE l.jwo_id = ? ORDER BY l.line_no", jwoId)) {
            long lineId = ((Number) l.get("id")).longValue();
            BigDecimal dispatched = (BigDecimal) l.get("dispatched_qty");
            BigDecimal rr = (BigDecimal) l.get("rework_redispatched_qty");
            BigDecimal rq = (BigDecimal) l.get("received_qty");
            BigDecimal uq = (BigDecimal) l.get("unused_returned_qty");
            BigDecimal wo = (BigDecimal) l.get("written_off_qty");
            BigDecimal withWorker = dispatched.add(rr).subtract(rq).subtract(uq).subtract(wo);
            BigDecimal rework = (BigDecimal) l.get("rework_qty");
            BigDecimal reworkPending = rework.subtract(rr);
            BigDecimal scrap = (BigDecimal) l.get("scrap_qty");
            BigDecimal scrapDisposed = adjSum(lineId, "SCRAP_DISPOSAL", "APPROVED");
            BigDecimal scrapReserved = adjSum(lineId, "SCRAP_DISPOSAL", "PENDING");
            BigDecimal processLoss = adjSum(lineId, "PROCESS_LOSS", "APPROVED");
            BigDecimal shortage = adjSum(lineId, "SHORTAGE", "APPROVED");
            BigDecimal writeOffReserved = adjSum(lineId, "PROCESS_LOSS", "PENDING").add(adjSum(lineId, "SHORTAGE", "PENDING"));
            BigDecimal pct = permissiblePct(((Number) l.get("operation_id")).longValue(), (String) l.get("category"));
            BigDecimal allowed = dispatched.multiply(pct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal actualLoss = processLoss.add(shortage);
            BigDecimal excess = actualLoss.subtract(allowed).max(BigDecimal.ZERO);
            withWorkerTotal = withWorkerTotal.add(withWorker);
            excessTotal = excessTotal.add(excess);
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("jwoLineId", lineId);
            out.put("lineNo", l.get("line_no"));
            out.put("itemCode", l.get("item_code"));
            out.put("itemName", l.get("item_name"));
            out.put("category", l.get("category"));
            out.put("operation", l.get("operation_name"));
            out.put("itemMasterId", l.get("item_master_id"));
            out.put("inputQty", l.get("input_qty"));
            out.put("dispatched", dispatched);
            out.put("reworkRedispatched", rr);
            out.put("processedBack", rq);
            out.put("unusedBack", uq);
            out.put("withWorker", withWorker);
            out.put("accepted", l.get("accepted_qty"));
            out.put("rejected", l.get("rejected_qty"));
            out.put("rework", rework);
            out.put("reworkPending", reworkPending);
            out.put("scrap", scrap);
            out.put("scrapDisposed", scrapDisposed);
            out.put("scrapReserved", scrapReserved);
            out.put("scrapRemaining", scrap.subtract(scrapDisposed).subtract(scrapReserved));
            out.put("writtenOff", wo);
            out.put("processLossApproved", processLoss);
            out.put("shortageApproved", shortage);
            out.put("writeOffRequested", writeOffReserved);
            out.put("permissiblePct", pct);
            out.put("allowedLoss", allowed);
            out.put("excessLoss", excess);
            out.put("status", withWorker.signum() == 0 && reworkPending.signum() == 0 ? "BALANCED" : (excess.signum() > 0 ? "EXCESS_LOSS" : "OPEN"));
            out.put("maxWriteOff", withWorker.subtract(writeOffReserved).max(BigDecimal.ZERO));
            lines.add(out);
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("jwoId", jwoId);
        res.put("jwoNumber", o.get("jwo_number"));
        res.put("status", o.get("status"));
        res.put("workerName", o.get("worker_name"));
        res.put("expectedReturnDate", o.get("expected_return_date") == null ? null : o.get("expected_return_date").toString());
        res.put("overdue", o.get("expected_return_date") != null && ((java.sql.Date) o.get("expected_return_date")).toLocalDate().isBefore(JobWorkService.today())
                && Set.of("APPROVED", "IN_PROGRESS", "PARTIALLY_RECEIVED").contains(o.get("status")));
        res.put("lines", lines);
        res.put("totalWithWorker", withWorkerTotal);
        res.put("totalExcessLoss", excessTotal);
        res.put("adjustments", JobWorkService.camelList(jdbc.queryForList(
                "SELECT a.*, m.code AS item_code FROM public.job_work_adjustments a JOIN public.item_master_lookup m ON m.id = a.item_master_id WHERE a.jwo_id = ? ORDER BY a.requested_at DESC, a.id DESC", jwoId)));
        res.put("allowedActions", List.of("REQUEST_ADJUSTMENT"));
        return res;
    }

    private BigDecimal adjSum(long jwoLineId, String type, String status) {
        BigDecimal v = jdbc.queryForObject("SELECT COALESCE(SUM(qty),0) FROM public.job_work_adjustments WHERE jwo_line_id = ? AND adjustment_type = ? AND status = ?",
                BigDecimal.class, jwoLineId, type, status);
        return v == null ? BigDecimal.ZERO : v;
    }

    // ================================================================== adjustments

    @Transactional
    public Map<String, Object> requestAdjustment(AdjustmentRequest r, Actor actor) {
        jw.actor(actor.name(), actor.role());
        if (!JobWorkService.has(actor, "STORE", "QUALITY", "APPROVER")) {
            throw new JobWorkException(HttpStatus.FORBIDDEN, "Role " + actor.role() + " cannot request reconciliation adjustments.");
        }
        String type = JobWorkService.upper(r.adjustmentType());
        if (type == null || !ADJ_TYPES.contains(type)) throw JobWorkService.bad("Type must be SCRAP_DISPOSAL, SHORTAGE or PROCESS_LOSS.");
        if (r.jwoLineId() == null) throw JobWorkService.bad("Select the order line.");
        if (!JobWorkService.notBlank(r.reason())) throw JobWorkService.bad("Give the reason for this adjustment. Losses are never adjusted silently.");
        if (r.qty() == null || r.qty().signum() <= 0) throw JobWorkService.bad("Quantity must be greater than zero.");
        Map<String, Object> line = jdbc.queryForList("SELECT l.*, o.status AS order_status, o.job_worker_id FROM public.job_work_order_lines l "
                + "JOIN public.job_work_orders o ON o.id = l.jwo_id WHERE l.id = ? FOR UPDATE", r.jwoLineId()).stream().findFirst()
                .orElseThrow(() -> JobWorkService.bad("Order line not found."));
        if (!Set.of("IN_PROGRESS", "PARTIALLY_RECEIVED", "COMPLETED").contains(JobWorkService.str(line, "order_status"))) {
            throw JobWorkService.conflict("Adjustments are raised on orders with material out. Order status: " + JobWorkService.str(line, "order_status"));
        }
        BigDecimal qty = r.qty();
        long lineId = r.jwoLineId();
        if (type.equals("SCRAP_DISPOSAL")) {
            BigDecimal scrap = (BigDecimal) line.get("scrap_qty");
            BigDecimal taken = adjSum(lineId, "SCRAP_DISPOSAL", "APPROVED").add(adjSum(lineId, "SCRAP_DISPOSAL", "PENDING"));
            if (qty.compareTo(scrap.subtract(taken)) > 0) {
                throw JobWorkService.conflict("Only " + scrap.subtract(taken) + " scrap is available to dispose on this line (scrap recorded " + scrap + ").");
            }
        } else {
            BigDecimal withWorker = ((BigDecimal) line.get("dispatched_qty")).add((BigDecimal) line.get("rework_redispatched_qty"))
                    .subtract((BigDecimal) line.get("received_qty")).subtract((BigDecimal) line.get("unused_returned_qty")).subtract((BigDecimal) line.get("written_off_qty"));
            BigDecimal reserved = adjSum(lineId, "SHORTAGE", "PENDING").add(adjSum(lineId, "PROCESS_LOSS", "PENDING"));
            if (qty.compareTo(withWorker.subtract(reserved)) > 0) {
                throw JobWorkService.conflict("Only " + withWorker.subtract(reserved) + " is still with the worker and not already under request.");
            }
        }
        String number = jw.nextNumber("ADJ");
        jdbc.update("INSERT INTO public.job_work_adjustments (adjustment_number, jwo_id, jwo_line_id, job_worker_id, item_master_id, category, adjustment_type, qty, reason, "
                        + "status, requested_by, requested_role) VALUES (?,?,?,?,?,?,?,?,?,'PENDING',?,?)",
                number, line.get("jwo_id"), lineId, line.get("job_worker_id"), line.get("item_master_id"), line.get("category"), type, qty, r.reason().trim(),
                actor.name(), actor.role());
        jw.history("JWO", ((Number) line.get("jwo_id")).longValue(), "ADJUSTMENT_REQUESTED", null, null, actor, number + " " + type + " " + qty);
        Long newId = jdbc.queryForObject("SELECT id FROM public.job_work_adjustments WHERE adjustment_number = ?", Long.class, number);
        return Map.of("id", newId, "adjustmentNumber", number, "status", "PENDING");
    }

    @Transactional
    public Map<String, Object> decideAdjustment(long id, DecisionRequest d, Actor actor) {
        jw.actor(actor.name(), actor.role());
        if (!JobWorkService.has(actor, "APPROVER")) throw new JobWorkException(HttpStatus.FORBIDDEN, "Only an approver can approve or reject adjustments.");
        Map<String, Object> a = jdbc.queryForList("SELECT * FROM public.job_work_adjustments WHERE id = ? FOR UPDATE", id).stream().findFirst()
                .orElseThrow(() -> JobWorkService.notFound("Adjustment not found."));
        if (!"PENDING".equals(JobWorkService.str(a, "status"))) throw JobWorkService.conflict("This adjustment is already " + JobWorkService.str(a, "status") + ".");
        if (!"ADMIN".equals(actor.role()) && actor.name().equalsIgnoreCase(JobWorkService.str(a, "requested_by"))) {
            throw new JobWorkException(HttpStatus.FORBIDDEN, "The person who requested the adjustment cannot approve it.");
        }
        long jwoId = ((Number) a.get("jwo_id")).longValue();
        long lineId = ((Number) a.get("jwo_line_id")).longValue();
        String type = JobWorkService.str(a, "adjustment_type");
        String number = JobWorkService.str(a, "adjustment_number");
        BigDecimal qty = (BigDecimal) a.get("qty");
        Map<String, Object> o = jdbc.queryForList("SELECT * FROM public.job_work_orders WHERE id = ? FOR UPDATE", jwoId).get(0);
        if (!d.approve()) {
            if (JobWorkService.blank(d.comments()) == null) throw JobWorkService.bad("Give the reason for rejecting.");
            jdbc.update("UPDATE public.job_work_adjustments SET status = 'REJECTED', decided_by = ?, decided_at = NOW(), decision_comments = ? WHERE id = ?",
                    actor.name(), d.comments().trim(), id);
            jw.history("JWO", jwoId, "ADJUSTMENT_REJECTED", null, null, actor, number + ": " + d.comments());
            return Map.of("status", "REJECTED");
        }
        Long txId = null;
        if (type.equals("SCRAP_DISPOSAL")) {
            // Inventory transaction posting removed - scrap disposal no longer posts to inventory
        } else {
            Map<String, Object> line = jdbc.queryForList("SELECT * FROM public.job_work_order_lines WHERE id = ? FOR UPDATE", lineId).get(0);
            BigDecimal withWorker = ((BigDecimal) line.get("dispatched_qty")).add((BigDecimal) line.get("rework_redispatched_qty"))
                    .subtract((BigDecimal) line.get("received_qty")).subtract((BigDecimal) line.get("unused_returned_qty")).subtract((BigDecimal) line.get("written_off_qty"));
            if (qty.compareTo(withWorker) > 0) {
                throw JobWorkService.conflict("Only " + withWorker + " is still with the worker; the adjustment can no longer be approved as requested.");
            }
            jw.ledger(((Number) a.get("job_worker_id")).longValue(), jwoId, lineId, ((Number) a.get("item_master_id")).longValue(),
                    JobWorkService.str(a, "category"), "WRITTEN_OFF", qty.negate(), number, null, null, null, actor);
            jdbc.update("UPDATE public.job_work_order_lines SET written_off_qty = written_off_qty + ? WHERE id = ?", qty, lineId);
        }
        jdbc.update("UPDATE public.job_work_adjustments SET status = 'APPROVED', decided_by = ?, decided_at = NOW(), decision_comments = ?, inventory_transaction_id = ? WHERE id = ?",
                actor.name(), JobWorkService.blank(d.comments()), txId, id);
        jw.history("JWO", jwoId, "ADJUSTMENT_APPROVED", null, null, actor, number + " " + type + " " + qty);
        jw.refreshOrderStatus(jwoId);
        return Map.of("status", "APPROVED");
    }

    public List<Map<String, Object>> adjustments(String status, String type, Long jwoId) {
        List<Object> args = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (JobWorkService.notBlank(status)) { conds.add("a.status = ?"); args.add(status.trim().toUpperCase(Locale.ROOT)); }
        if (JobWorkService.notBlank(type)) { conds.add("a.adjustment_type = ?"); args.add(type.trim().toUpperCase(Locale.ROOT)); }
        if (jwoId != null) { conds.add("a.jwo_id = ?"); args.add(jwoId); }
        return JobWorkService.camelList(jdbc.queryForList(
                "SELECT a.*, o.jwo_number, w.legal_name AS worker_name, m.code AS item_code, op.operation_name FROM public.job_work_adjustments a "
                        + "JOIN public.job_work_orders o ON o.id = a.jwo_id JOIN public.job_workers w ON w.id = a.job_worker_id "
                        + "JOIN public.item_master_lookup m ON m.id = a.item_master_id JOIN public.job_work_order_lines l ON l.id = a.jwo_line_id "
                        + "JOIN public.job_work_operations op ON op.id = l.operation_id"
                        + (conds.isEmpty() ? "" : " WHERE " + String.join(" AND ", conds)) + " ORDER BY a.requested_at DESC, a.id DESC LIMIT 300", args.toArray()));
    }

    // ================================================================== scrap register & alerts

    public List<Map<String, Object>> scrapRegister() {
        return JobWorkService.camelList(jdbc.queryForList(
                "SELECT o.jwo_number, w.legal_name AS worker_name, l.line_no, l.item_code, l.category, l.scrap_qty, "
                        + "COALESCE((SELECT SUM(a.qty) FROM public.job_work_adjustments a WHERE a.jwo_line_id = l.id AND a.adjustment_type = 'SCRAP_DISPOSAL' AND a.status = 'APPROVED'),0) AS disposed_qty, "
                        + "COALESCE((SELECT SUM(a.qty) FROM public.job_work_adjustments a WHERE a.jwo_line_id = l.id AND a.adjustment_type = 'SCRAP_DISPOSAL' AND a.status = 'PENDING'),0) AS pending_disposal_qty, "
                        + "(SELECT STRING_AGG(DISTINCT rl.defect_code, ', ') FROM public.job_work_receipt_lines rl WHERE rl.jwo_line_id = l.id AND rl.defect_code IS NOT NULL) AS defect_codes "
                        + "FROM public.job_work_order_lines l JOIN public.job_work_orders o ON o.id = l.jwo_id JOIN public.job_workers w ON w.id = o.job_worker_id "
                        + "WHERE l.scrap_qty > 0 ORDER BY o.jwo_date DESC, o.id DESC, l.line_no"));
    }

    public Map<String, Object> alerts() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("overdueWithWorker", JobWorkService.camelList(jdbc.queryForList(
                "SELECT o.id, o.jwo_number, w.legal_name AS worker_name, o.expected_return_date, "
                        + "(SELECT COALESCE(SUM(l.dispatched_qty + l.rework_redispatched_qty - l.received_qty - l.unused_returned_qty - l.written_off_qty),0) FROM public.job_work_order_lines l WHERE l.jwo_id = o.id) AS with_worker "
                        + "FROM public.job_work_orders o JOIN public.job_workers w ON w.id = o.job_worker_id "
                        + "WHERE o.expected_return_date < CURRENT_DATE AND o.status IN ('APPROVED','IN_PROGRESS','PARTIALLY_RECEIVED') ORDER BY o.expected_return_date")));
        out.put("unreconciledChallans", JobWorkService.camelList(jdbc.queryForList(
                "SELECT DISTINCT c.id, c.challan_number, o.jwo_number, w.legal_name AS worker_name, c.challan_date FROM public.job_work_challans c "
                        + "JOIN public.job_work_orders o ON o.id = c.jwo_id JOIN public.job_workers w ON w.id = c.job_worker_id "
                        + "JOIN public.job_work_challan_lines cl ON cl.challan_id = c.id JOIN public.job_work_order_lines ol ON ol.id = cl.jwo_line_id "
                        + "WHERE c.status = 'POSTED' AND ol.dispatched_qty + ol.rework_redispatched_qty - ol.received_qty - ol.unused_returned_qty - ol.written_off_qty > 0 "
                        + "ORDER BY c.challan_date")));
        out.put("pendingReworkLines", JobWorkService.camelList(jdbc.queryForList(
                "SELECT o.jwo_number, l.line_no, l.item_code, (l.rework_qty - l.rework_redispatched_qty) AS rework_pending FROM public.job_work_order_lines l "
                        + "JOIN public.job_work_orders o ON o.id = l.jwo_id WHERE l.rework_qty - l.rework_redispatched_qty > 0 ORDER BY o.jwo_number")));
        out.put("pendingApprovals", jdbc.queryForObject("SELECT COUNT(*) FROM public.job_work_adjustments WHERE status = 'PENDING'", Integer.class));
        List<Map<String, Object>> excess = new ArrayList<>();
        for (Map<String, Object> l : jdbc.queryForList("SELECT l.id, l.jwo_id, l.operation_id, l.category, l.dispatched_qty, o.jwo_number, l.item_code "
                + "FROM public.job_work_order_lines l JOIN public.job_work_orders o ON o.id = l.jwo_id WHERE l.written_off_qty > 0")) {
            long lineId = ((Number) l.get("id")).longValue();
            BigDecimal actual = adjSum(lineId, "PROCESS_LOSS", "APPROVED").add(adjSum(lineId, "SHORTAGE", "APPROVED"));
            BigDecimal allowed = ((BigDecimal) l.get("dispatched_qty")).multiply(permissiblePct(((Number) l.get("operation_id")).longValue(), (String) l.get("category")))
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            if (actual.compareTo(allowed) > 0) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("jwoNumber", l.get("jwo_number"));
                e.put("itemCode", l.get("item_code"));
                e.put("actualLoss", actual);
                e.put("allowedLoss", allowed);
                e.put("excess", actual.subtract(allowed));
                excess.add(e);
            }
        }
        out.put("excessLoss", excess);
        return out;
    }

    /** Request body for an adjustment. */
    public record AdjustmentRequest(Long jwoLineId, String adjustmentType, BigDecimal qty, String reason) {}

    /** Approve or reject an adjustment. */
    public record DecisionRequest(boolean approve, String comments) {}

    /** Permissible loss rule. */
    public record LossPolicyRequest(Long operationId, String category, BigDecimal permissiblePct) {}
}
