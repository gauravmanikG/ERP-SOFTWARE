package com.silvermuller.seals.modules.gate;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static com.silvermuller.seals.modules.gate.GateRows.*;

/** Gate reads: entry detail, registers, vehicles inside, dashboard, expected arrivals, receivable POs and reports. */
@Service
public class GateQueryService {

    private static final int MAX_PAGE = 200;
    private static final Map<String, String> WHY_HERE = Map.of(
            "GATE_IN", "At the gate, waiting to unload",
            "UNLOADING", "Unloading in progress",
            "UNLOADED", "Unloaded, waiting for quantity verification",
            "VERIFIED", "Verified, ready to go out",
            "TURNED_BACK", "Turned back, waiting to go out");

    private final JdbcTemplate jdbc;
    private final GateSettings settings;
    private final ObjectMapper mapper;

    public GateQueryService(JdbcTemplate jdbc, GateSettings settings, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.settings = settings;
        this.mapper = mapper;
    }

    // ================================================================== one entry

    public Map<String, Object> detail(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT e.*, g.gate_name, s.supplier_name AS vendor_name, s.gstin AS vendor_gstin, s.address AS vendor_address, s.city AS vendor_city, "
                        + "s.state AS vendor_state, s.contact_person AS vendor_contact, s.phone AS vendor_phone, s.email AS vendor_email "
                        + "FROM public.gate_entries e LEFT JOIN public.gate_master g ON g.gate_code = e.gate_code "
                        + "LEFT JOIN public.supplier_master s ON s.supplier_code = e.vendor_code WHERE e.id = ?", id);
        if (rows.isEmpty()) throw new ResourceNotFoundException("Gate entry " + id + " was not found.");
        Map<String, Object> e = rows.get(0);
        List<Map<String, Object>> lines = jdbc.queryForList(
                "SELECT l.*, (l.accepted_qty - l.grn_posted_qty) AS pending_grn_qty, po.vendor_name AS po_vendor_name, po.po_date "
                        + "FROM public.gate_entry_lines l JOIN public.purchase_orders po ON po.po_number = l.po_number "
                        + "WHERE l.gate_entry_id = ? ORDER BY l.line_no", id);
        BigDecimal accepted = BigDecimal.ZERO, posted = BigDecimal.ZERO, hold = BigDecimal.ZERO;
        for (Map<String, Object> l : lines) {
            accepted = accepted.add(dec(l, "accepted_qty"));
            posted = posted.add(dec(l, "grn_posted_qty"));
            hold = hold.add(dec(l, "hold_qty"));
        }
        String stage = str(e, "stage");
        Map<String, Object> out = camel(e);
        out.put("lines", camelList(lines));
        out.put("events", camelList(jdbc.queryForList(
                "SELECT action, from_stage, to_stage, actor, remarks, created_at FROM public.gate_entry_events WHERE gate_entry_id = ? ORDER BY id", id)));
        out.put("attachments", camelList(jdbc.queryForList(
                "SELECT id, doc_type, file_name, content_type, size_bytes, uploaded_by, uploaded_at FROM public.gate_entry_attachments WHERE gate_entry_id = ? ORDER BY id", id)));
        out.put("grns", camelList(jdbc.queryForList(
                "SELECT id, grn_number, grn_date, status, po_number, total_accepted_qty FROM public.goods_receipt_notes WHERE gate_entry_id = ? ORDER BY id", id)));
        out.put("grnStatus", grnStatus(stage, accepted, posted));
        out.put("totalHoldQty", hold);
        out.put("pendingGrnQty", accepted.subtract(posted));
        out.put("whyHere", WHY_HERE.get(stage));
        out.put("minutesInside", minutesInside(e));
        out.put("allowedActions", allowedActions(stage, hold, accepted.subtract(posted)));
        return out;
    }

    static String grnStatus(String stage, BigDecimal accepted, BigDecimal posted) {
        if (!"VERIFIED".equals(stage) && !"EXITED".equals(stage)) return "NOT_READY";
        if (accepted.signum() == 0) return "NOTHING_TO_RECEIVE";
        if (posted.compareTo(accepted) >= 0) return "COMPLETE";
        return posted.signum() == 0 ? "PENDING" : "PARTIAL";
    }

    static List<String> allowedActions(String stage, BigDecimal hold, BigDecimal pendingGrn) {
        List<String> a = new ArrayList<>();
        switch (stage) {
            case "DRAFT" -> a.addAll(List.of("EDIT", "SUBMIT", "CANCEL"));
            case "GATE_IN" -> a.addAll(List.of("START_UNLOADING", "TURN_BACK", "CANCEL", "PRINT_GATE_PASS"));
            case "UNLOADING" -> a.addAll(List.of("RECORD_UNLOADING", "TURN_BACK", "PRINT_GATE_PASS"));
            case "UNLOADED" -> a.addAll(List.of("RECORD_UNLOADING", "VERIFY", "PRINT_GATE_PASS"));
            case "VERIFIED" -> a.addAll(List.of("EXIT", "PRINT_GATE_PASS"));
            case "TURNED_BACK" -> a.addAll(List.of("EXIT", "PRINT_GATE_PASS"));
            case "EXITED" -> a.add("PRINT_GATE_PASS");
            default -> { }
        }
        if (("VERIFIED".equals(stage) || "EXITED".equals(stage)) && hold.signum() > 0) a.add("RELEASE_HOLD");
        if (("VERIFIED".equals(stage) || "EXITED".equals(stage)) && pendingGrn.signum() > 0) a.add("CREATE_GRN");
        return a;
    }

    private static Long minutesInside(Map<String, Object> e) {
        Object in = e.get("entry_at");
        if (!(in instanceof Timestamp t)) return null;
        Instant end = e.get("exit_at") instanceof Timestamp x ? x.toInstant() : Instant.now();
        return Duration.between(t.toInstant(), end).toMinutes();
    }

    // ================================================================== registers

    private static final String ENTRY_SUMMARY = "e.id, e.gate_entry_number, e.stage, e.gate_code, e.vehicle_number, e.vehicle_type, e.driver_name, "
            + "e.transporter, e.vendor_code, s.supplier_name AS vendor_name, e.invoice_no, e.challan_no, e.entry_at, e.exit_at, e.created_at, "
            + "e.created_by, e.submitted_by, e.turned_back_reason, e.cancel_reason, "
            + "(SELECT STRING_AGG(DISTINCT l.po_number, ', ') FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS po_numbers, "
            + "(SELECT COUNT(*) FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS line_count, "
            + "(SELECT COALESCE(SUM(l.declared_qty), 0) FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS declared_qty, "
            + "(SELECT COALESCE(SUM(l.unloaded_qty), 0) FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS unloaded_qty, "
            + "(SELECT COALESCE(SUM(l.accepted_qty), 0) FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS accepted_qty, "
            + "(SELECT COALESCE(SUM(l.rejected_qty), 0) FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS rejected_qty, "
            + "(SELECT COALESCE(SUM(l.hold_qty), 0) FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS hold_qty, "
            + "(SELECT COALESCE(SUM(l.grn_posted_qty), 0) FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id) AS grn_posted_qty";
    private static final String ENTRY_FROM = "FROM public.gate_entries e LEFT JOIN public.supplier_master s ON s.supplier_code = e.vendor_code";

    /** Gate Entry Register: every entry with filters and paging. Dates filter on the entry time (or creation for drafts). */
    public Map<String, Object> register(String q, String stage, LocalDate from, LocalDate to, String vendor, String po, int page, int size) {
        List<String> conds = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        if (blank(q) != null) {
            String like = "%" + q.trim().toUpperCase(Locale.ROOT) + "%";
            conds.add("(UPPER(e.gate_entry_number) LIKE ? OR e.vehicle_number LIKE ? OR UPPER(COALESCE(e.invoice_no,'')) LIKE ? "
                    + "OR UPPER(COALESCE(e.challan_no,'')) LIKE ? OR UPPER(COALESCE(s.supplier_name,'')) LIKE ?)");
            args.addAll(List.of(like, "%" + normaliseVehicle(q) + "%", like, like, like));
        }
        if (blank(stage) != null) { conds.add("e.stage = ?"); args.add(stage.trim().toUpperCase(Locale.ROOT)); }
        if (from != null) { conds.add("(COALESCE(e.entry_at, e.created_at) AT TIME ZONE 'Asia/Kolkata')::date >= ?"); args.add(java.sql.Date.valueOf(from)); }
        if (to != null) { conds.add("(COALESCE(e.entry_at, e.created_at) AT TIME ZONE 'Asia/Kolkata')::date <= ?"); args.add(java.sql.Date.valueOf(to)); }
        if (blank(vendor) != null) { conds.add("e.vendor_code = ?"); args.add(vendor.trim()); }
        if (blank(po) != null) { conds.add("EXISTS (SELECT 1 FROM public.gate_entry_lines l WHERE l.gate_entry_id = e.id AND l.po_number = ?)"); args.add(po.trim()); }
        return page(ENTRY_FROM + where(conds) + " ORDER BY COALESCE(e.entry_at, e.created_at) DESC, e.id DESC", ENTRY_SUMMARY, args, page, size);
    }

    /** Vehicles inside the premises right now, why each is here, and how long it has been inside. */
    public List<Map<String, Object>> inside() {
        int alertHours = settings.get().dwellAlertHours();
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT " + ENTRY_SUMMARY + " " + ENTRY_FROM
                + " WHERE e.stage IN ('GATE_IN','UNLOADING','UNLOADED','VERIFIED','TURNED_BACK') ORDER BY e.entry_at");
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = camel(r);
            Long minutes = minutesInside(r);
            m.put("whyHere", WHY_HERE.get(str(r, "stage")));
            m.put("minutesInside", minutes);
            m.put("dwellAlert", minutes != null && minutes > alertHours * 60L);
            out.add(m);
        }
        return out;
    }

    /** Vehicle Exit Register: vehicles that went out, with entry, exit and time inside. */
    public Map<String, Object> exits(String q, LocalDate from, LocalDate to, int page, int size) {
        List<String> conds = new ArrayList<>(List.of("e.stage = 'EXITED'"));
        List<Object> args = new ArrayList<>();
        if (blank(q) != null) {
            conds.add("(UPPER(e.gate_entry_number) LIKE ? OR e.vehicle_number LIKE ?)");
            args.add("%" + q.trim().toUpperCase(Locale.ROOT) + "%");
            args.add("%" + normaliseVehicle(q) + "%");
        }
        if (from != null) { conds.add("(e.exit_at AT TIME ZONE 'Asia/Kolkata')::date >= ?"); args.add(java.sql.Date.valueOf(from)); }
        if (to != null) { conds.add("(e.exit_at AT TIME ZONE 'Asia/Kolkata')::date <= ?"); args.add(java.sql.Date.valueOf(to)); }
        Map<String, Object> p = page(ENTRY_FROM + where(conds) + " ORDER BY e.exit_at DESC, e.id DESC",
                ENTRY_SUMMARY + ", e.exited_by, ROUND(EXTRACT(EPOCH FROM (e.exit_at - e.entry_at)) / 60) AS minutes_inside", args, page, size);
        return p;
    }

    // ================================================================== dashboard

    public Map<String, Object> dashboard() {
        GateSettings.Config cfg = settings.get();
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, Object> byStage = new LinkedHashMap<>();
        for (String s : List.of("DRAFT", "GATE_IN", "UNLOADING", "UNLOADED", "VERIFIED", "TURNED_BACK")) byStage.put(s, 0L);
        jdbc.query("SELECT stage, COUNT(*) AS n FROM public.gate_entries WHERE stage <> 'EXITED' AND stage <> 'CANCELLED' GROUP BY stage",
                rs -> { byStage.put(rs.getString("stage"), rs.getLong("n")); });
        out.put("byStage", byStage);
        out.put("vehiclesInside", jdbc.queryForObject("SELECT COUNT(*) FROM public.gate_entries WHERE stage IN ('GATE_IN','UNLOADING','UNLOADED','VERIFIED','TURNED_BACK')", Long.class));
        out.put("inToday", jdbc.queryForObject("SELECT COUNT(*) FROM public.gate_entries WHERE entry_at IS NOT NULL AND (entry_at AT TIME ZONE 'Asia/Kolkata')::date = ?", Long.class, java.sql.Date.valueOf(today())));
        out.put("outToday", jdbc.queryForObject("SELECT COUNT(*) FROM public.gate_entries WHERE exit_at IS NOT NULL AND (exit_at AT TIME ZONE 'Asia/Kolkata')::date = ?", Long.class, java.sql.Date.valueOf(today())));
        Map<String, Object> pending = jdbc.queryForMap(
                "SELECT COUNT(*) FILTER (WHERE l.accepted_qty > l.grn_posted_qty) AS pending_grn_lines, "
                        + "COALESCE(SUM(l.accepted_qty - l.grn_posted_qty), 0) AS pending_grn_qty, "
                        + "COUNT(*) FILTER (WHERE l.hold_qty > 0) AS hold_lines, COALESCE(SUM(l.hold_qty), 0) AS hold_qty, "
                        + "COALESCE(SUM(l.rejected_qty) FILTER (WHERE (e.verified_at AT TIME ZONE 'Asia/Kolkata')::date = ?), 0) AS rejected_today_qty "
                        + "FROM public.gate_entry_lines l JOIN public.gate_entries e ON e.id = l.gate_entry_id WHERE e.stage IN ('VERIFIED','EXITED')",
                java.sql.Date.valueOf(today()));
        out.putAll(camel(pending));
        out.put("avgTurnaroundMinutesToday", jdbc.queryForObject(
                "SELECT ROUND(AVG(EXTRACT(EPOCH FROM (exit_at - entry_at)) / 60)) FROM public.gate_entries WHERE stage = 'EXITED' AND (exit_at AT TIME ZONE 'Asia/Kolkata')::date = ?",
                BigDecimal.class, java.sql.Date.valueOf(today())));
        out.put("avgTurnaroundMinutes7Days", jdbc.queryForObject(
                "SELECT ROUND(AVG(EXTRACT(EPOCH FROM (exit_at - entry_at)) / 60)) FROM public.gate_entries WHERE stage = 'EXITED' AND exit_at >= NOW() - INTERVAL '7 days'",
                BigDecimal.class));
        List<Map<String, Object>> alerts = inside().stream().filter(m -> Boolean.TRUE.equals(m.get("dwellAlert"))).toList();
        out.put("dwellAlertHours", cfg.dwellAlertHours());
        out.put("dwellAlerts", alerts);
        int overdue = 0, dueToday = 0;
        for (Map<String, Object> r : expectedArrivalRows(null, null, null, null, false)) {
            if ("OVERDUE".equals(r.get("dueStatus"))) overdue++;
            if ("TODAY".equals(r.get("dueStatus"))) dueToday++;
        }
        out.put("arrivalsOverdue", overdue);
        out.put("arrivalsDueToday", dueToday);
        out.put("gateRequiredForGrn", cfg.required());
        return out;
    }

    // ================================================================== expected arrivals

    /**
     * Expected Arrivals, for planning only: date-wise delivery lots of open POs, lines that only have a PO or line date,
     * and lines with no date at all ("unscheduled"). Actual gate entries are never limited by these dates or quantities.
     */
    public Map<String, Object> expectedArrivals(LocalDate from, LocalDate to, String vendor, String po, Boolean includeUnscheduled, Boolean includeReceived) {
        List<Map<String, Object>> rows = expectedArrivalRows(vendor, po, from, to, Boolean.TRUE.equals(includeReceived));
        if (Boolean.FALSE.equals(includeUnscheduled)) rows.removeIf(r -> r.get("expectedDate") == null);
        Map<String, Map<String, Object>> byDate = new TreeMap<>();
        for (Map<String, Object> r : rows) {
            String key = r.get("expectedDate") == null ? "UNSCHEDULED" : String.valueOf(r.get("expectedDate"));
            Map<String, Object> d = byDate.computeIfAbsent(key, k -> new LinkedHashMap<>(Map.of("date", k, "lines", 0, "plannedQty", BigDecimal.ZERO, "balanceQty", BigDecimal.ZERO)));
            d.put("lines", (Integer) d.get("lines") + 1);
            d.put("plannedQty", ((BigDecimal) d.get("plannedQty")).add((BigDecimal) r.get("plannedQty")));
            d.put("balanceQty", ((BigDecimal) d.get("balanceQty")).add((BigDecimal) r.get("balanceQty")));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("rows", rows);
        out.put("byDate", new ArrayList<>(byDate.values()));
        return out;
    }

    List<Map<String, Object>> expectedArrivalRows(String vendor, String po, LocalDate from, LocalDate to, boolean includeReceived) {
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT p.po_number, p.po_date, p.vendor_code, p.vendor_name, p.expected_delivery, p.delivery_date, p.details_json, "
                        + "i.item_code, i.item_name, i.uom, i.quantity FROM public.purchase_orders p "
                        + "JOIN public.purchase_order_items i ON i.po_number = p.po_number "
                        + "WHERE UPPER(p.status) IN ('APPROVED','PARTIALLY RECEIVED')");
        if (blank(vendor) != null) { sql.append(" AND p.vendor_code = ?"); args.add(vendor.trim()); }
        if (blank(po) != null) { sql.append(" AND p.po_number = ?"); args.add(po.trim()); }
        List<Map<String, Object>> lines = jdbc.queryForList(sql + " ORDER BY p.po_number, i.line_no", args.toArray());
        if (lines.isEmpty()) return new ArrayList<>();

        Map<String, List<Map<String, Object>>> lots = new HashMap<>();
        for (Map<String, Object> s : jdbc.queryForList(
                "SELECT s.* FROM public.purchase_order_delivery_schedules s JOIN public.purchase_orders p ON p.po_number = s.po_number "
                        + "WHERE UPPER(p.status) IN ('APPROVED','PARTIALLY RECEIVED') ORDER BY s.lot_number")) {
            lots.computeIfAbsent(str(s, "po_number") + "\u0000" + str(s, "item_code"), k -> new ArrayList<>()).add(s);
        }
        Map<String, BigDecimal> received = new HashMap<>();
        jdbc.query("SELECT gi.po_number, gi.item_code, SUM(gi.accepted_qty) AS q FROM public.goods_receipt_note_items gi "
                + "JOIN public.goods_receipt_notes g ON g.id = gi.grn_id WHERE g.status = 'POSTED' GROUP BY gi.po_number, gi.item_code",
                rs -> { received.put(rs.getString("po_number") + "\u0000" + rs.getString("item_code"), rs.getBigDecimal("q")); });
        Map<String, BigDecimal> atGate = new HashMap<>();
        jdbc.query("SELECT l.po_number, l.item_code, SUM(CASE WHEN e.stage IN ('GATE_IN','UNLOADING','UNLOADED') THEN l.declared_qty "
                + "WHEN e.stage IN ('VERIFIED','EXITED') THEN l.accepted_qty - l.grn_posted_qty + l.hold_qty ELSE 0 END) AS q "
                + "FROM public.gate_entry_lines l JOIN public.gate_entries e ON e.id = l.gate_entry_id GROUP BY l.po_number, l.item_code",
                rs -> { atGate.put(rs.getString("po_number") + "\u0000" + rs.getString("item_code"), rs.getBigDecimal("q")); });

        LocalDate today = today();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> l : lines) {
            String key = str(l, "po_number") + "\u0000" + str(l, "item_code");
            BigDecimal ordered = dec(l, "quantity");
            BigDecimal rec = received.getOrDefault(key, BigDecimal.ZERO);
            BigDecimal gate = atGate.getOrDefault(key, BigDecimal.ZERO);
            List<Map<String, Object>> its = lots.getOrDefault(key, List.of());
            BigDecimal scheduled = BigDecimal.ZERO;
            for (Map<String, Object> s : its) scheduled = scheduled.add(dec(s, "scheduled_qty"));
            Map<String, Object> base = new LinkedHashMap<>();
            base.put("poNumber", str(l, "po_number"));
            base.put("poDate", str(l, "po_date"));
            base.put("vendorCode", str(l, "vendor_code"));
            base.put("vendorName", str(l, "vendor_name"));
            base.put("itemCode", str(l, "item_code"));
            base.put("itemName", str(l, "item_name"));
            base.put("uom", str(l, "uom"));
            base.put("orderedQty", ordered);
            base.put("scheduledTotalQty", scheduled);
            base.put("receivedQty", rec);
            base.put("atGateQty", gate);
            base.put("pendingQty", max0(ordered.subtract(rec)));
            if (!its.isEmpty()) {
                base.put("receivedBeyondScheduleQty", max0(rec.subtract(scheduled)));
                for (Map<String, Object> s : its) {
                    Map<String, Object> r = new LinkedHashMap<>(base);
                    r.put("type", "LOT");
                    r.put("lotNumber", s.get("lot_number"));
                    r.put("expectedDate", json(s.get("scheduled_date")));
                    r.put("plannedQty", dec(s, "scheduled_qty"));
                    r.put("lotReceivedQty", dec(s, "received_qty"));
                    r.put("balanceQty", dec(s, "balance_qty"));
                    out.add(r);
                }
                BigDecimal rest = ordered.subtract(scheduled);
                if (rest.signum() > 0) {
                    Map<String, Object> r = new LinkedHashMap<>(base);
                    r.put("type", "UNSCHEDULED_REST");
                    r.put("expectedDate", null);
                    r.put("plannedQty", rest);
                    r.put("lotReceivedQty", max0(rec.subtract(scheduled)).min(rest));
                    r.put("balanceQty", max0(rest.subtract(max0(rec.subtract(scheduled)))));
                    out.add(r);
                }
            } else {
                LocalDate date = lineExpectedDate(str(l, "details_json"), str(l, "item_code"));
                if (date == null) date = parseDate(l.get("expected_delivery"));
                if (date == null) date = parseDate(l.get("delivery_date"));
                Map<String, Object> r = new LinkedHashMap<>(base);
                r.put("type", date == null ? "UNSCHEDULED" : "PO_DATE");
                r.put("expectedDate", date == null ? null : date.toString());
                r.put("plannedQty", ordered);
                r.put("lotReceivedQty", rec);
                r.put("balanceQty", max0(ordered.subtract(rec)));
                out.add(r);
            }
        }
        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Map<String, Object> r : out) {
            BigDecimal balance = (BigDecimal) r.get("balanceQty");
            LocalDate d = r.get("expectedDate") == null ? null : LocalDate.parse(String.valueOf(r.get("expectedDate")));
            r.put("dueStatus", balance.signum() <= 0 ? "RECEIVED" : d == null ? "UNSCHEDULED" : d.isBefore(today) ? "OVERDUE" : d.isEqual(today) ? "TODAY" : "UPCOMING");
            r.put("daysLate", d != null && balance.signum() > 0 && d.isBefore(today) ? today.toEpochDay() - d.toEpochDay() : 0);
            if (!includeReceived && balance.signum() <= 0) continue;
            if (d != null && from != null && d.isBefore(from)) continue;
            if (d != null && to != null && d.isAfter(to)) continue;
            filtered.add(r);
        }
        filtered.sort(Comparator.comparing((Map<String, Object> r) -> r.get("expectedDate") == null ? "9999" : String.valueOf(r.get("expectedDate")))
                .thenComparing(r -> String.valueOf(r.get("poNumber"))).thenComparing(r -> String.valueOf(r.get("itemCode"))));
        return filtered;
    }

    private LocalDate lineExpectedDate(String detailsJson, String itemCode) {
        if (detailsJson == null || detailsJson.isBlank()) return null;
        try {
            List<?> items = mapper.readValue(detailsJson, List.class);
            for (Object o : items) {
                if (o instanceof Map<?, ?> m && itemCode.equals(String.valueOf(m.get("itemCode")))) {
                    return parseDate(m.get("expectedDeliveryDate"));
                }
            }
        } catch (Exception ignored) {
            // An unreadable PO detail only means no line date: the PO header date is used instead.
        }
        return null;
    }

    private static LocalDate parseDate(Object v) {
        if (v == null) return null;
        if (v instanceof java.sql.Date d) return d.toLocalDate();
        String s = String.valueOf(v).trim();
        if (s.length() < 10) return null;
        try {
            return LocalDate.parse(s.substring(0, 10));
        } catch (Exception e) {
            return null;
        }
    }

    // ================================================================== POs that can be added to a gate entry

    /** Open POs (optionally of one vendor) with what is still due per line, for the Add PO picker. */
    public List<Map<String, Object>> receivablePos(String vendor, String q) {
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT p.po_number, p.po_date, p.vendor_code, p.vendor_name, p.status, p.validity_date FROM public.purchase_orders p "
                + "WHERE UPPER(p.status) IN ('APPROVED','PARTIALLY RECEIVED') AND (p.validity_date IS NULL OR p.validity_date >= ?)");
        args.add(java.sql.Date.valueOf(today()));
        if (blank(vendor) != null) { sql.append(" AND p.vendor_code = ?"); args.add(vendor.trim()); }
        if (blank(q) != null) { sql.append(" AND UPPER(p.po_number) LIKE ?"); args.add("%" + q.trim().toUpperCase(Locale.ROOT) + "%"); }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> p : jdbc.queryForList(sql + " ORDER BY p.po_number DESC LIMIT 100", args.toArray())) {
            Map<String, Object> m = camel(p);
            m.put("lines", poLines(str(p, "po_number")));
            out.add(m);
        }
        return out;
    }

    /** Lines of one PO: ordered, already received (posted GRN), at the gate now, and still due. */
    public List<Map<String, Object>> poLines(String po) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT i.item_code, i.item_name, i.uom, i.quantity AS ordered_qty FROM public.purchase_order_items i WHERE i.po_number = ? ORDER BY i.line_no", po);
        if (rows.isEmpty()) throw new ResourceNotFoundException("PO " + po + " was not found or has no lines.");
        BigDecimal tol = settings.get().overDeliveryTolerancePct();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            String item = str(r, "item_code");
            BigDecimal ordered = dec(r, "ordered_qty");
            BigDecimal posted = GateQuantities.postedGrn(jdbc, po, item);
            BigDecimal open = GateQuantities.openAtGate(jdbc, po, item, null);
            BigDecimal inProcess = GateQuantities.declaredInProcess(jdbc, po, item);
            Map<String, Object> m = camel(r);
            m.put("poNumber", po);
            m.put("receivedQty", posted);
            m.put("acceptedAtGateQty", open);
            m.put("declaredInProcessQty", inProcess);
            m.put("remainingQty", max0(ordered.subtract(posted).subtract(open)));
            m.put("maxAcceptableQty", max0(GateSettings.ceilingWithTolerance(ordered, str(r, "uom"), tol).subtract(posted).subtract(open)));
            out.add(m);
        }
        return out;
    }

    // ================================================================== reports

    /** Gate Entry Report: one row per gate-entry line with every quantity, for screen and Excel export. */
    public List<Map<String, Object>> entryReport(LocalDate from, LocalDate to, String vendor, String stage) {
        List<String> conds = new ArrayList<>(List.of("e.stage <> 'DRAFT'"));
        List<Object> args = new ArrayList<>();
        if (from != null) { conds.add("(e.entry_at AT TIME ZONE 'Asia/Kolkata')::date >= ?"); args.add(java.sql.Date.valueOf(from)); }
        if (to != null) { conds.add("(e.entry_at AT TIME ZONE 'Asia/Kolkata')::date <= ?"); args.add(java.sql.Date.valueOf(to)); }
        if (blank(vendor) != null) { conds.add("e.vendor_code = ?"); args.add(vendor.trim()); }
        if (blank(stage) != null) { conds.add("e.stage = ?"); args.add(stage.trim().toUpperCase(Locale.ROOT)); }
        return camelList(jdbc.queryForList(
                "SELECT e.gate_entry_number, e.stage, e.gate_code, e.vehicle_number, e.vehicle_type, e.driver_name, e.transporter, e.vendor_code, "
                        + "s.supplier_name AS vendor_name, e.invoice_no, e.invoice_date, e.challan_no, e.eway_bill_no, e.lr_no, e.entry_at, e.verified_at, e.exit_at, "
                        + "ROUND(EXTRACT(EPOCH FROM (COALESCE(e.exit_at, NOW()) - e.entry_at)) / 60) AS minutes_inside, "
                        + "l.line_no, l.po_number, l.item_code, l.item_name, l.uom, l.po_ordered_qty, l.prior_grn_qty, l.remaining_at_entry_qty, l.declared_qty, "
                        + "l.unloaded_qty, l.accepted_qty, l.rejected_qty, l.hold_qty, l.grn_posted_qty, (l.accepted_qty - l.grn_posted_qty) AS pending_grn_qty, "
                        + "l.reject_reason, l.hold_reason, e.submitted_by, e.verified_by, e.exited_by "
                        + "FROM public.gate_entries e JOIN public.gate_entry_lines l ON l.gate_entry_id = e.id "
                        + "LEFT JOIN public.supplier_master s ON s.supplier_code = e.vendor_code"
                        + where(conds) + " ORDER BY e.entry_at DESC, e.id DESC, l.line_no", args.toArray()));
    }

    /** Vendor delivery quality: per vendor, what arrived at the gate and how much of it was accepted. */
    public List<Map<String, Object>> vendorPerformance(LocalDate from, LocalDate to) {
        List<String> conds = new ArrayList<>(List.of("e.stage IN ('VERIFIED','EXITED')", "e.turned_back_reason IS NULL"));
        List<Object> args = new ArrayList<>();
        if (from != null) { conds.add("(e.entry_at AT TIME ZONE 'Asia/Kolkata')::date >= ?"); args.add(java.sql.Date.valueOf(from)); }
        if (to != null) { conds.add("(e.entry_at AT TIME ZONE 'Asia/Kolkata')::date <= ?"); args.add(java.sql.Date.valueOf(to)); }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT l.vendor_code, MAX(s.supplier_name) AS vendor_name, COUNT(DISTINCT e.id) AS deliveries, COUNT(*) AS lines, "
                        + "SUM(l.declared_qty) AS declared_qty, SUM(l.unloaded_qty) AS unloaded_qty, SUM(l.accepted_qty) AS accepted_qty, "
                        + "SUM(l.rejected_qty) AS rejected_qty, SUM(l.hold_qty) AS hold_qty, "
                        + "COUNT(*) FILTER (WHERE l.unloaded_qty < l.declared_qty) AS short_lines, "
                        + "ROUND(AVG(EXTRACT(EPOCH FROM (e.exit_at - e.entry_at)) / 60) FILTER (WHERE e.exit_at IS NOT NULL)) AS avg_minutes_inside "
                        + "FROM public.gate_entry_lines l JOIN public.gate_entries e ON e.id = l.gate_entry_id "
                        + "LEFT JOIN public.supplier_master s ON s.supplier_code = l.vendor_code"
                        + where(conds) + " GROUP BY l.vendor_code ORDER BY MAX(s.supplier_name)", args.toArray());
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = camel(r);
            BigDecimal unloaded = dec(r, "unloaded_qty");
            m.put("acceptedPct", unloaded.signum() == 0 ? null : dec(r, "accepted_qty").multiply(BigDecimal.valueOf(100)).divide(unloaded, 1, RoundingMode.HALF_UP));
            m.put("rejectedPct", unloaded.signum() == 0 ? null : dec(r, "rejected_qty").multiply(BigDecimal.valueOf(100)).divide(unloaded, 1, RoundingMode.HALF_UP));
            out.add(m);
        }
        return out;
    }

    // ================================================================== gate pass, gates, settings

    /** Printable gate pass (HTML). Available once the entry is submitted. */
    public String gatePass(long id) {
        Map<String, Object> d = detail(id);
        String stage = String.valueOf(d.get("stage"));
        if ("DRAFT".equals(stage) || "CANCELLED".equals(stage)) {
            throw new ConflictException("A gate pass is printed after the entry is submitted (this one is " + stage + ").");
        }
        StringBuilder rows = new StringBuilder();
        for (Object o : (List<?>) d.get("lines")) {
            Map<?, ?> l = (Map<?, ?>) o;
            rows.append("<tr><td>").append(h(l.get("lineNo"))).append("</td><td>").append(h(l.get("poNumber"))).append("</td><td>")
                    .append(h(l.get("itemCode"))).append(" ").append(h(l.get("itemName"))).append("</td><td>").append(h(l.get("uom")))
                    .append("</td><td class='n'>").append(h(qty(l.get("declaredQty")))).append("</td><td class='n'>").append(h(qty(l.get("unloadedQty"))))
                    .append("</td><td class='n'>").append(h(qty(l.get("acceptedQty")))).append("</td></tr>");
        }
        return "<!doctype html><html><head><meta charset='utf-8'><title>Gate Pass " + h(d.get("gateEntryNumber")) + "</title>"
                + "<style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}h1{font-size:18px;margin:0}"
                + "table{border-collapse:collapse;width:100%;margin-top:10px}td,th{border:1px solid #999;padding:5px;text-align:left}"
                + ".n{text-align:right}.grid td{border:none;padding:2px 8px 2px 0}.sign{margin-top:48px;display:flex;justify-content:space-between}"
                + "@media print{button{display:none}}</style></head><body>"
                + "<button onclick='window.print()'>Print</button>"
                + "<h1>Silver Muller Seals — Gate Pass</h1><p><b>" + h(d.get("gateEntryNumber")) + "</b> · " + h(d.get("gateName")) + " · Stage: " + h(stage) + "</p>"
                + "<table class='grid'><tr><td>Vehicle</td><td><b>" + h(d.get("vehicleNumber")) + "</b> " + h(d.get("vehicleType")) + "</td>"
                + "<td>Driver</td><td>" + h(d.get("driverName")) + " " + h(d.get("driverMobile")) + "</td></tr>"
                + "<tr><td>Vendor</td><td>" + h(d.get("vendorCode")) + " " + h(d.get("vendorName")) + "</td><td>Transporter</td><td>" + h(d.get("transporter")) + "</td></tr>"
                + "<tr><td>Invoice</td><td>" + h(d.get("invoiceNo")) + " " + h(d.get("invoiceDate")) + "</td><td>Challan</td><td>" + h(d.get("challanNo")) + "</td></tr>"
                + "<tr><td>E-way bill</td><td>" + h(d.get("ewayBillNo")) + "</td><td>LR</td><td>" + h(d.get("lrNo")) + "</td></tr>"
                + "<tr><td>In</td><td>" + h(d.get("entryAt")) + "</td><td>Out</td><td>" + h(d.get("exitAt")) + "</td></tr></table>"
                + "<table><tr><th>#</th><th>PO</th><th>Item</th><th>UOM</th><th>Declared</th><th>Unloaded</th><th>Accepted</th></tr>" + rows + "</table>"
                + "<div class='sign'><span>Security</span><span>Store</span><span>Driver</span></div></body></html>";
    }

    public List<Map<String, Object>> gates() {
        return camelList(jdbc.queryForList("SELECT * FROM public.gate_master ORDER BY gate_code"));
    }

    // ================================================================== helpers

    private Map<String, Object> page(String fromWhere, String select, List<Object> args, int page, int size) {
        String countFrom = fromWhere.contains(" ORDER BY ") ? fromWhere.substring(0, fromWhere.indexOf(" ORDER BY ")) : fromWhere;
        Long total = jdbc.queryForObject("SELECT COUNT(*) " + countFrom, Long.class, args.toArray());
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE));
        int safePage = Math.max(0, page);
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add((long) safePage * safeSize);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT " + select + " " + fromWhere + " LIMIT ? OFFSET ?", pageArgs.toArray());
        long tot = total == null ? 0 : total;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", camelList(rows));
        out.put("page", safePage);
        out.put("size", safeSize);
        out.put("totalElements", tot);
        out.put("totalPages", (long) Math.ceil(tot / (double) safeSize));
        return out;
    }

    private static String where(List<String> conds) {
        return conds.isEmpty() ? "" : " WHERE " + String.join(" AND ", conds);
    }

    private static BigDecimal max0(BigDecimal v) {
        return v.signum() < 0 ? BigDecimal.ZERO : v;
    }

    private static String qty(Object v) {
        if (v == null) return "";
        return v instanceof BigDecimal b ? b.stripTrailingZeros().toPlainString() : String.valueOf(v);
    }

    private static String h(Object v) {
        if (v == null) return "";
        return String.valueOf(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
