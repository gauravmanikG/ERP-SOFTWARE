package com.silvermuller.seals.modules.purchase.activity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.OffsetDateTime;

import java.util.*;

/**
 * "Who did what" for one core-purchase document (PR, vendor draft, PO or GRN) and the documents it is linked to:
 *
 *   PR  --po_draft_allocations-->  DRAFT  --po_pr_allocations-->  PO  --goods_receipt_notes-->  GRN
 *
 * Steps come from procurement_audit_log, whose actor is always the signed-in user (see ProcurementAudit).
 * Documents made before that log covered a step still show who created / approved them, read from the
 * document's own columns and marked {@code source = "record"}.
 *
 * Read-only.
 */
@Service
public class ProcurementActivityService {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_LINKED = 200;

    private final JdbcTemplate jdbc;

    public ProcurementActivityService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    record Linked(Set<String> prs, Set<String> drafts, Set<String> pos, Set<String> grns) {
        Set<String> all() {
            Set<String> s = new LinkedHashSet<>();
            s.addAll(prs); s.addAll(drafts); s.addAll(pos); s.addAll(grns);
            return s;
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> trail(String rawRef) {
        String ref = rawRef == null ? "" : rawRef.trim();
        if (ref.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A document number is required.");
        String type = typeOf(ref);
        if (type == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document " + ref + " was not found.");

        Linked linked = linked(type, ref);
        List<Map<String, Object>> events = new ArrayList<>();
        Set<String> refs = linked.all();
        Set<String> relevant = new HashSet<>(linked.prs());
        relevant.addAll(linked.pos());

        for (Map<String, Object> row : jdbc.queryForList(
                "SELECT id, entity_type, entity_ref, action, actor, details_json, created_at FROM public.procurement_audit_log " +
                "WHERE entity_ref = ANY(?) ORDER BY created_at, id",
                (Object) refs.toArray(new String[0]))) {
            String eType = String.valueOf(row.get("entity_type"));
            String eRef = String.valueOf(row.get("entity_ref"));
            String details = (String) row.get("details_json");
            // A vendor draft holds lines of many PRs: keep only its steps that touched these PRs / POs.
            if ("DRAFT".equals(eType) && !"CREATED".equals(row.get("action")) && !mentionsAny(details, relevant)) continue;
            // A PO made from a draft lists its lines; a PO number is unique, so all its own steps are kept.
            events.add(event(eType, eRef, String.valueOf(row.get("action")), String.valueOf(row.get("actor")),
                    row.get("created_at"), parse(details), "log"));
        }
        addRecordFallbacks(linked, events);
        events.sort(Comparator.comparing((Map<String, Object> e) -> String.valueOf(e.get("at"))));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ref", ref);
        out.put("type", type);
        out.put("summary", summary(type, ref, events));
        Map<String, Object> rel = new LinkedHashMap<>();
        rel.put("prs", linked.prs());
        rel.put("drafts", linked.drafts());
        rel.put("pos", linked.pos());
        rel.put("grns", linked.grns());
        out.put("linked", rel);
        out.put("events", events);
        return out;
    }

    // ------------------------------------------------------------------ links

    private String typeOf(String ref) {
        if (exists("SELECT COUNT(*) FROM public.purchase_requisitions WHERE pr_number = ?", ref)) return "PR";
        if (exists("SELECT COUNT(*) FROM public.po_drafts WHERE draft_number = ?", ref)) return "DRAFT";
        if (exists("SELECT COUNT(*) FROM public.purchase_orders WHERE po_number = ?", ref)) return "PO";
        if (exists("SELECT COUNT(*) FROM public.goods_receipt_notes WHERE grn_number = ?", ref)) return "GRN";
        // A deleted PR leaves only its audit rows.
        if (exists("SELECT COUNT(*) FROM public.procurement_audit_log WHERE entity_type = 'PR' AND entity_ref = ?", ref)) return "PR";
        return null;
    }

    private Linked linked(String type, String ref) {
        Set<String> prs = new LinkedHashSet<>(), drafts = new LinkedHashSet<>(), pos = new LinkedHashSet<>(), grns = new LinkedHashSet<>();
        switch (type) {
            case "PR" -> {
                prs.add(ref);
                drafts.addAll(strings("SELECT DISTINCT d.draft_number FROM public.po_draft_allocations a JOIN public.po_drafts d ON d.id = a.draft_id WHERE a.pr_number = ?", ref));
                pos.addAll(strings("SELECT DISTINCT po_number FROM public.po_pr_allocations WHERE pr_number = ?", ref));
            }
            case "DRAFT" -> {
                drafts.add(ref);
                prs.addAll(strings("SELECT DISTINCT a.pr_number FROM public.po_draft_allocations a JOIN public.po_drafts d ON d.id = a.draft_id WHERE d.draft_number = ?", ref));
                pos.addAll(strings("SELECT DISTINCT p.po_number FROM public.po_pr_allocations p JOIN public.po_draft_allocations a ON a.id = p.draft_allocation_id " +
                        "JOIN public.po_drafts d ON d.id = a.draft_id WHERE d.draft_number = ?", ref));
            }
            case "PO" -> {
                pos.add(ref);
                addPoLinks(ref, prs, drafts);
            }
            case "GRN" -> {
                grns.add(ref);
                String po = strings("SELECT po_number FROM public.goods_receipt_notes WHERE grn_number = ?", ref).stream().findFirst().orElse(null);
                if (po != null) {
                    pos.add(po);
                    addPoLinks(po, prs, drafts);
                }
            }
            default -> { }
        }
        if (!"GRN".equals(type) && !pos.isEmpty()) {
            grns.addAll(strings("SELECT grn_number FROM public.goods_receipt_notes WHERE po_number = ANY(?) ORDER BY id", (Object) pos.toArray(new String[0])));
        }
        return new Linked(cap(prs), cap(drafts), cap(pos), cap(grns));
    }

    private void addPoLinks(String po, Set<String> prs, Set<String> drafts) {
        prs.addAll(strings("SELECT DISTINCT pr_number FROM public.po_pr_allocations WHERE po_number = ?", po));
        prs.addAll(strings("SELECT pr_number FROM public.purchase_orders WHERE po_number = ? AND pr_number IS NOT NULL AND pr_number <> ''", po));
        drafts.addAll(strings("SELECT DISTINCT d.draft_number FROM public.po_pr_allocations p JOIN public.po_draft_allocations a ON a.id = p.draft_allocation_id " +
                "JOIN public.po_drafts d ON d.id = a.draft_id WHERE p.po_number = ?", po));
    }

    // ------------------------------------------------------------------ record fallbacks

    /** Who created / approved a document, from its own columns, when the log has no such step for it (older data). */
    private void addRecordFallbacks(Linked linked, List<Map<String, Object>> events) {
        for (String pr : linked.prs()) {
            for (Map<String, Object> r : jdbc.queryForList(
                    "SELECT created_by, created_at, approved_by, approved_at FROM public.purchase_requisitions WHERE pr_number = ?", pr)) {
                if (!hasStep(events, "PR", pr, "CREATED")) {
                    events.add(event("PR", pr, "CREATED", str(r.get("created_by")), r.get("created_at"), Map.of(), "record"));
                }
                if (r.get("approved_by") != null && !hasStep(events, "PR", pr, "STATUS_APPROVED")) {
                    events.add(event("PR", pr, "STATUS_APPROVED", str(r.get("approved_by")),
                            r.get("approved_at") != null ? r.get("approved_at") : r.get("created_at"), Map.of(), "record"));
                }
            }
        }
        for (String d : linked.drafts()) {
            if (hasStep(events, "DRAFT", d, "CREATED")) continue;
            for (Map<String, Object> r : jdbc.queryForList("SELECT created_by, created_at FROM public.po_drafts WHERE draft_number = ?", d)) {
                events.add(event("DRAFT", d, "CREATED", str(r.get("created_by")), r.get("created_at"), Map.of(), "record"));
            }
        }
        for (String po : linked.pos()) {
            if (hasStep(events, "PO", po, "CREATED")) continue;
            for (Map<String, Object> r : jdbc.queryForList(
                    "SELECT COALESCE(NULLIF(approved_by, ''), NULLIF(requested_by, '')) AS who, created_at FROM public.purchase_orders WHERE po_number = ?", po)) {
                events.add(event("PO", po, "CREATED", str(r.get("who")), r.get("created_at"), Map.of(), "record"));
            }
        }
        for (String g : linked.grns()) {
            if (hasStep(events, "GRN", g, "SAVED_DRAFT") || hasStep(events, "GRN", g, "POSTED")) continue;
            for (Map<String, Object> r : jdbc.queryForList(
                    "SELECT created_by, created_at, status, received_by FROM public.goods_receipt_notes WHERE grn_number = ?", g)) {
                Map<String, Object> details = new LinkedHashMap<>();
                if (r.get("received_by") != null) details.put("receivedBy", r.get("received_by"));
                events.add(event("GRN", g, "POSTED".equals(r.get("status")) ? "POSTED" : "SAVED_DRAFT",
                        str(r.get("created_by")), r.get("created_at"), details, "record"));
            }
        }
    }

    /** A created step is any log row that started the document (CREATED, CREATED_FROM_DRAFT ...). */
    private static boolean hasStep(List<Map<String, Object>> events, String type, String ref, String actionPrefix) {
        return events.stream().anyMatch(e -> type.equals(e.get("entityType")) && ref.equals(e.get("entityRef"))
                && String.valueOf(e.get("action")).startsWith(actionPrefix));
    }

    // ------------------------------------------------------------------ summary

    private static Map<String, Object> summary(String type, String ref, List<Map<String, Object>> events) {
        Map<String, Object> s = new LinkedHashMap<>();
        List<Map<String, Object>> own = events.stream()
                .filter(e -> type.equals(e.get("entityType")) && ref.equals(e.get("entityRef"))).toList();
        own.stream().filter(e -> isCreation(String.valueOf(e.get("action")))).findFirst().ifPresent(e -> {
            s.put("createdBy", e.get("actor"));
            s.put("createdAt", e.get("at"));
        });
        if (!own.isEmpty()) {
            Map<String, Object> last = own.get(own.size() - 1);
            s.put("lastAction", last.get("action"));
            s.put("lastActionBy", last.get("actor"));
            s.put("lastActionAt", last.get("at"));
        }
        own.stream().filter(e -> "STATUS_APPROVED".equals(e.get("action"))).reduce((a, b) -> b).ifPresent(e -> {
            s.put("approvedBy", e.get("actor"));
            s.put("approvedAt", e.get("at"));
        });
        own.stream().filter(e -> "STATUS_REJECTED".equals(e.get("action"))).reduce((a, b) -> b).ifPresent(e -> {
            s.put("rejectedBy", e.get("actor"));
            s.put("rejectedAt", e.get("at"));
        });
        return s;
    }

    private static boolean isCreation(String action) {
        return action.equals("CREATED") || action.equals("CREATED_FROM_DRAFT") || action.equals("SAVED_DRAFT")
                || action.equals("POSTED");
    }

    // ------------------------------------------------------------------ helpers

    private static Map<String, Object> event(String type, String ref, String action, String actor, Object at,
                                             Map<String, Object> details, String source) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("entityType", type);
        e.put("entityRef", ref);
        e.put("action", action);
        e.put("actor", actor == null || actor.isBlank() ? "Not recorded" : actor);
        e.put("at", iso(at));
        e.put("details", details == null ? Map.of() : details);
        e.put("source", source);
        return e;
    }

    private static String iso(Object at) {
        // Instant.toString is ISO-8601 in UTC, so events sort correctly as strings.
        if (at instanceof Timestamp ts) return ts.toInstant().toString();
        if (at instanceof OffsetDateTime odt) return odt.toInstant().toString();
        if (at instanceof java.time.Instant i) return i.toString();
        if (at instanceof java.time.LocalDateTime ldt) return ldt.atZone(java.time.ZoneId.systemDefault()).toInstant().toString();
        return at == null ? "" : at.toString();
    }

    private static boolean mentionsAny(String json, Set<String> refs) {
        if (json == null) return false;
        for (String r : refs) {
            if (json.contains("\"" + r + "\"")) return true;
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> parse(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return JSON.readValue(json, Map.class);
        } catch (Exception e) {
            return Map.of("raw", json);
        }
    }

    private boolean exists(String sql, String ref) {
        Integer n = jdbc.queryForObject(sql, Integer.class, ref);
        return n != null && n > 0;
    }

    private List<String> strings(String sql, Object... args) {
        return jdbc.queryForList(sql, String.class, args);
    }

    private static Set<String> cap(Set<String> s) {
        if (s.size() <= MAX_LINKED) return s;
        Set<String> out = new LinkedHashSet<>();
        for (String x : s) {
            if (out.size() >= MAX_LINKED) break;
            out.add(x);
        }
        return out;
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
