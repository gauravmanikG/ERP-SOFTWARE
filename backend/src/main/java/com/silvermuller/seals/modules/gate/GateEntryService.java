package com.silvermuller.seals.modules.gate;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.gate.GateDtos.*;
import com.silvermuller.seals.modules.purchase.model.PoValidity;
import com.silvermuller.seals.modules.purchase.service.DocumentNumbers;
import com.silvermuller.seals.modules.purchase.service.QuantityRules;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

import static com.silvermuller.seals.modules.gate.GateRows.*;

/**
 * Gate entry writes. A vehicle moves through its stages only by these actions (no free stage edit):
 * <pre>
 *   DRAFT --submit--> GATE_IN --start unloading--> UNLOADING --record unloading--> UNLOADED --verify--> VERIFIED --gate out--> EXITED
 *   DRAFT / GATE_IN --cancel--> CANCELLED          GATE_IN / UNLOADING --turn back--> TURNED_BACK --gate out--> EXITED
 * </pre>
 * Times (entry, unloading, verification, exit) are the server's. Every action is written to gate_entry_events.
 * Only verified accepted quantity is ever available for GRN (GateGrnLink).
 */
@Service
public class GateEntryService {

    /** Stages in which the vehicle is inside the premises (it has not gone out yet). */
    static final List<String> INSIDE = List.of("GATE_IN", "UNLOADING", "UNLOADED", "VERIFIED", "TURNED_BACK");
    private static final List<String> CHECK_NAMES = List.of("vehicle", "driver", "vendor", "po", "invoice", "challan", "documents");
    private static final Set<String> RECEIVABLE_PO = Set.of("APPROVED", "PARTIALLY RECEIVED");
    private static final Set<String> FILE_TYPES = Set.of("application/pdf", "image/png", "image/jpeg");
    private static final Set<String> DOC_TYPES = Set.of("INVOICE", "CHALLAN", "EWAY_BILL", "LR", "PHOTO", "OTHER");

    private final JdbcTemplate jdbc;
    private final GateSettings settings;
    private final GateQueryService queries;

    public GateEntryService(JdbcTemplate jdbc, GateSettings settings, GateQueryService queries) {
        this.jdbc = jdbc;
        this.settings = settings;
        this.queries = queries;
    }

    // ================================================================== draft

    /** Saves a new draft. A retried request with the same clientRequestId returns the entry already made. */
    @Transactional
    public Map<String, Object> create(EntryRequest r, String actor) {
        requireActor(actor);
        String key = blank(r.clientRequestId());
        if (key != null) {
            List<Long> existing = jdbc.queryForList("SELECT id FROM public.gate_entries WHERE client_request_id = ?", Long.class, key);
            if (!existing.isEmpty()) return queries.detail(existing.get(0));
        }
        Map<String, Object> cols = headerColumns(r);
        List<Map<String, Object>> lines = prepareLines(r.lines());
        if (cols.get("vendor_code") == null && !lines.isEmpty()) cols.put("vendor_code", lines.get(0).get("vendor_code"));
        cols.put("gate_entry_number", DocumentNumbers.next(jdbc, DocumentNumbers.Doc.GE));
        cols.put("client_request_id", key);
        cols.put("stage", "DRAFT");
        cols.put("created_by", actor);
        long id = insert("public.gate_entries", cols);
        insertLines(id, lines);
        event(id, "CREATED", null, "DRAFT", actor, null);
        return queries.detail(id);
    }

    /** Replaces a draft's header and lines. Only drafts can be edited; the version guards against two editors. */
    @Transactional
    public Map<String, Object> update(long id, EntryRequest r, String actor) {
        requireActor(actor);
        Map<String, Object> row = lock(id);
        if (!"DRAFT".equals(str(row, "stage"))) {
            throw new ConflictException(str(row, "gate_entry_number") + " is " + str(row, "stage")
                    + ". Only a draft can be edited; after Submit the entry is a record (cancel it or turn the vehicle back instead).");
        }
        if (r.version() != null && r.version() != ((Number) row.get("version")).intValue()) {
            throw new ConflictException(str(row, "gate_entry_number") + " was changed by someone else. Reload it and try again.");
        }
        Map<String, Object> cols = headerColumns(r);
        List<Map<String, Object>> lines = prepareLines(r.lines());
        if (cols.get("vendor_code") == null && !lines.isEmpty()) cols.put("vendor_code", lines.get(0).get("vendor_code"));
        cols.put("modified_by", actor);
        updateRow(id, cols);
        jdbc.update("UPDATE public.gate_entries SET version = version + 1, modified_at = NOW() WHERE id = ?", id);
        jdbc.update("DELETE FROM public.gate_entry_lines WHERE gate_entry_id = ?", id);
        insertLines(id, lines);
        event(id, "EDITED", "DRAFT", "DRAFT", actor, null);
        return queries.detail(id);
    }

    // ================================================================== submit (vehicle in)

    /**
     * Submits a draft: the vehicle is now inside. Everything is checked here, the snapshots (PO qty, already received,
     * still due) are taken, and the server stamps the entry time. Warnings do not block; errors do.
     */
    @Transactional
    public Map<String, Object> submit(long id, String actor) {
        requireActor(actor);
        Map<String, Object> e = lock(id);
        String no = str(e, "gate_entry_number");
        if (!"DRAFT".equals(str(e, "stage"))) throw new ConflictException(no + " is already " + str(e, "stage") + ".");
        GateSettings.Config cfg = settings.get();
        List<String> warnings = new ArrayList<>();

        String vendor = str(e, "vendor_code");
        if (vendor == null) throw bad("Select the vendor.");
        Integer activeVendor = jdbc.queryForObject("SELECT COUNT(*) FROM public.supplier_master WHERE supplier_code = ? AND status = 'ACTIVE'", Integer.class, vendor);
        if (activeVendor == null || activeVendor == 0) throw bad("Vendor " + vendor + " is not an active vendor.");
        boolean multi = Boolean.TRUE.equals(e.get("multi_vendor"));
        if (multi && !cfg.multiVendorAllowed()) {
            throw bad("Multi-vendor deliveries are switched off in Gate Settings. Make one gate entry per vendor.");
        }
        if (blank(str(e, "invoice_no")) == null && blank(str(e, "challan_no")) == null) {
            throw bad("Enter the vendor's invoice number or delivery challan number.");
        }
        String eway = blank(str(e, "eway_bill_no"));
        if (eway != null && !eway.matches("\\d{12}")) throw bad("E-way bill number must be 12 digits.");
        String mobile = blank(str(e, "driver_mobile"));
        if (mobile != null && !mobile.matches("\\d{10}")) warnings.add("Driver mobile " + mobile + " is not 10 digits.");
        boolean anyNo = false;
        for (String c : CHECK_NAMES) {
            String v = str(e, "check_" + c);
            if (v == null) throw bad("Answer every security check (Yes or No). Missing: " + c + ".");
            if ("NO".equals(v)) anyNo = true;
        }
        if (anyNo && blank(str(e, "security_remarks")) == null) {
            throw bad("A security check is answered No. Write what was found in the security remarks.");
        }
        String invoice = blank(str(e, "invoice_no"));
        if (invoice != null) {
            List<String> dup = jdbc.queryForList(
                    "SELECT gate_entry_number FROM public.gate_entries WHERE id <> ? AND vendor_code = ? AND UPPER(TRIM(invoice_no)) = UPPER(?) "
                            + "AND stage NOT IN ('DRAFT','CANCELLED') AND turned_back_reason IS NULL", String.class, id, vendor, invoice);
            if (!dup.isEmpty()) {
                throw new ConflictException("Invoice " + invoice + " of vendor " + vendor + " was already brought in on " + dup.get(0)
                        + ". The same invoice cannot be received twice.");
            }
        }
        String vehicle = str(e, "vehicle_number");
        List<String> inside = jdbc.queryForList(
                "SELECT gate_entry_number FROM public.gate_entries WHERE vehicle_number = ? AND id <> ? AND stage IN ('GATE_IN','UNLOADING','UNLOADED','VERIFIED','TURNED_BACK')",
                String.class, vehicle, id);
        if (!inside.isEmpty()) {
            throw new ConflictException("Vehicle " + vehicle + " is already inside on " + inside.get(0) + ". Gate it out before a new entry.");
        }

        List<Map<String, Object>> lines = linesOf(id);
        if (lines.isEmpty()) throw bad("Add at least one PO with Add PO.");
        Map<String, Map<String, Object>> poCache = new HashMap<>();
        for (Map<String, Object> l : lines) {
            String po = str(l, "po_number");
            Map<String, Object> header = poCache.computeIfAbsent(po, this::receivablePo);
            String poVendor = str(header, "vendor_code");
            if (!vendor.equals(poVendor) && !(multi && cfg.multiVendorAllowed())) {
                throw bad("PO " + po + " belongs to vendor " + poVendor + " (" + str(header, "vendor_name") + "), not " + vendor
                        + ". Multi-vendor deliveries need the multi-vendor option.");
            }
            BigDecimal declared = dec(l, "declared_qty");
            if (declared.signum() <= 0) {
                throw bad("Line " + l.get("line_no") + " (" + str(l, "item_code") + "): declared quantity must be above zero. Remove lines that are not on this vehicle.");
            }
            String item = str(l, "item_code");
            Map<String, Object> pl = GateQuantities.poLine(jdbc, po, item);
            BigDecimal ordered = dec(pl, "quantity");
            BigDecimal prior = GateQuantities.postedGrn(jdbc, po, item);
            BigDecimal remaining = ordered.subtract(prior).subtract(GateQuantities.openAtGate(jdbc, po, item, lng(l, "id")));
            if (remaining.signum() < 0) remaining = BigDecimal.ZERO;
            if (declared.compareTo(remaining) > 0) {
                warnings.add("Line " + l.get("line_no") + " (" + item + " on " + po + "): declared " + plain(declared) + " is more than the "
                        + plain(remaining) + " still due. Only " + plain(cfg.overDeliveryTolerancePct()) + " % over the PO quantity can be accepted; reject or hold the rest at verification.");
            }
            jdbc.update("UPDATE public.gate_entry_lines SET po_ordered_qty = ?, prior_grn_qty = ?, remaining_at_entry_qty = ?, vendor_code = ? WHERE id = ?",
                    ordered, prior, remaining, poVendor, lng(l, "id"));
        }

        try {
            jdbc.update("UPDATE public.gate_entries SET stage = 'GATE_IN', entry_at = NOW(), submitted_by = ?, version = version + 1, "
                    + "modified_by = ?, modified_at = NOW() WHERE id = ?", actor, actor, id);
        } catch (DataIntegrityViolationException ex) {
            // The unique index on vehicles inside: someone submitted the same vehicle a moment ago.
            throw new ConflictException("Vehicle " + vehicle + " was just brought in on another gate entry. Gate it out before a new entry.");
        }
        event(id, "SUBMITTED", "DRAFT", "GATE_IN", actor, warnings.isEmpty() ? null : String.join(" ", warnings));
        return withWarnings(queries.detail(id), warnings);
    }

    // ================================================================== unloading and verification

    @Transactional
    public Map<String, Object> startUnloading(long id, String actor) {
        requireActor(actor);
        Map<String, Object> e = lock(id);
        expectStage(e, "GATE_IN");
        jdbc.update("UPDATE public.gate_entries SET stage = 'UNLOADING', unloading_started_at = NOW(), version = version + 1, modified_by = ?, modified_at = NOW() WHERE id = ?", actor, id);
        event(id, "UNLOADING_STARTED", "GATE_IN", "UNLOADING", actor, null);
        return queries.detail(id);
    }

    /** Records the counted (unloaded) quantity of every line. Can be corrected until the entry is verified. */
    @Transactional
    public Map<String, Object> recordUnloading(long id, UnloadRequest r, String actor) {
        requireActor(actor);
        Map<String, Object> e = lock(id);
        String stage = str(e, "stage");
        if (!"UNLOADING".equals(stage) && !"UNLOADED".equals(stage)) {
            throw new ConflictException(str(e, "gate_entry_number") + " is " + stage + ". Start unloading first; after verification the count cannot change.");
        }
        List<Map<String, Object>> lines = linesOf(id);
        Map<Long, UnloadLine> given = byLine(r == null ? null : r.lines(), UnloadLine::lineId, lines);
        List<String> warnings = new ArrayList<>();
        for (Map<String, Object> l : lines) {
            UnloadLine u = given.get(lng(l, "id"));
            BigDecimal qty = u.unloadedQty();
            if (qty == null || qty.signum() < 0) throw bad("Line " + l.get("line_no") + ": enter the unloaded quantity (0 or more).");
            unitRule(qty, str(l, "uom"), "unloaded " + str(l, "item_code"));
            BigDecimal declared = dec(l, "declared_qty");
            if (qty.compareTo(declared) != 0) {
                warnings.add("Line " + l.get("line_no") + " (" + str(l, "item_code") + "): unloaded " + plain(qty) + " vs declared " + plain(declared)
                        + (qty.compareTo(declared) < 0 ? " (short " + plain(declared.subtract(qty)) + ")" : " (excess " + plain(qty.subtract(declared)) + ")") + ".");
            }
            jdbc.update("UPDATE public.gate_entry_lines SET unloaded_qty = ?, remarks = COALESCE(?, remarks) WHERE id = ?", qty, blank(u.remarks()), lng(l, "id"));
        }
        jdbc.update("UPDATE public.gate_entries SET stage = 'UNLOADED', unloaded_at = NOW(), unloaded_by = ?, version = version + 1, modified_by = ?, modified_at = NOW() WHERE id = ?",
                actor, actor, id);
        event(id, "UNLOADING_RECORDED", stage, "UNLOADED", actor, joinRemarks(r == null ? null : r.remarks(), warnings));
        return withWarnings(queries.detail(id), warnings);
    }

    /**
     * Splits every unloaded quantity into accepted, rejected and hold (they must add up to the unloaded quantity).
     * Accepted is limited to what the PO can still take, including the over-delivery tolerance and quantity already
     * accepted on other gate entries. The PO rows are locked first, so two verifications cannot use the same balance.
     */
    @Transactional
    public Map<String, Object> verify(long id, VerifyRequest r, String actor) {
        requireActor(actor);
        Map<String, Object> e = lock(id);
        expectStage(e, "UNLOADED");
        GateSettings.Config cfg = settings.get();
        List<Map<String, Object>> lines = linesOf(id);
        GateQuantities.lockPos(jdbc, lines.stream().map(l -> str(l, "po_number")).toList());
        Map<Long, VerifyLine> given = byLine(r == null ? null : r.lines(), VerifyLine::lineId, lines);
        for (Map<String, Object> l : lines) {
            VerifyLine v = given.get(lng(l, "id"));
            String label = "Line " + l.get("line_no") + " (" + str(l, "item_code") + ")";
            BigDecimal a = nz(v.acceptedQty()), rej = nz(v.rejectedQty()), hold = nz(v.holdQty());
            if (a.signum() < 0 || rej.signum() < 0 || hold.signum() < 0) throw bad(label + ": quantities cannot be negative.");
            String uom = str(l, "uom");
            unitRule(a, uom, "accepted " + str(l, "item_code"));
            unitRule(rej, uom, "rejected " + str(l, "item_code"));
            unitRule(hold, uom, "hold " + str(l, "item_code"));
            BigDecimal unloaded = dec(l, "unloaded_qty");
            if (a.add(rej).add(hold).compareTo(unloaded) != 0) {
                throw bad(label + ": accepted + rejected + hold = " + plain(a.add(rej).add(hold)) + ", but " + plain(unloaded) + " was unloaded. They must be equal.");
            }
            if (rej.signum() > 0 && blank(v.rejectReason()) == null) throw bad(label + ": give the reason for the rejected quantity.");
            if (hold.signum() > 0 && blank(v.holdReason()) == null) throw bad(label + ": give the reason for holding quantity (for example, awaiting quality inspection).");
            BigDecimal max = GateQuantities.maxAcceptable(jdbc, str(l, "po_number"), str(l, "item_code"), cfg.overDeliveryTolerancePct(), lng(l, "id"), dec(l, "grn_posted_qty"));
            if (a.compareTo(max) > 0) {
                throw bad(label + ": accepted " + plain(a) + " is more than PO " + str(l, "po_number") + " can still take (" + plain(max)
                        + ", including the " + plain(cfg.overDeliveryTolerancePct()) + " % tolerance). Put the rest under Rejected or Hold.");
            }
            jdbc.update("UPDATE public.gate_entry_lines SET accepted_qty = ?, rejected_qty = ?, hold_qty = ?, verified = TRUE, reject_reason = ?, hold_reason = ? WHERE id = ?",
                    a, rej, hold, blank(v.rejectReason()), blank(v.holdReason()), lng(l, "id"));
        }
        jdbc.update("UPDATE public.gate_entries SET stage = 'VERIFIED', verified_at = NOW(), verified_by = ?, version = version + 1, modified_by = ?, modified_at = NOW() WHERE id = ?",
                actor, actor, id);
        event(id, "VERIFIED", "UNLOADED", "VERIFIED", actor, blank(r == null ? null : r.remarks()));
        return queries.detail(id);
    }

    /** Quality decision on held material: part or all of it becomes accepted and/or rejected. */
    @Transactional
    public Map<String, Object> releaseHold(long lineId, ReleaseHoldRequest r, String actor) {
        requireActor(actor);
        List<Map<String, Object>> found = jdbc.queryForList("SELECT gate_entry_id FROM public.gate_entry_lines WHERE id = ?", lineId);
        if (found.isEmpty()) throw new ResourceNotFoundException("Gate entry line " + lineId + " was not found.");
        long id = lng(found.get(0), "gate_entry_id");
        Map<String, Object> e = lock(id);
        String stage = str(e, "stage");
        if (!"VERIFIED".equals(stage) && !"EXITED".equals(stage)) throw new ConflictException("Held quantity can be released only after verification.");
        Map<String, Object> l0 = jdbc.queryForMap("SELECT po_number FROM public.gate_entry_lines WHERE id = ?", lineId);
        GateQuantities.lockPos(jdbc, List.of(str(l0, "po_number")));
        Map<String, Object> l = jdbc.queryForMap("SELECT * FROM public.gate_entry_lines WHERE id = ? FOR UPDATE", lineId);
        BigDecimal acc = nz(r == null ? null : r.acceptQty()), rej = nz(r == null ? null : r.rejectQty());
        BigDecimal hold = dec(l, "hold_qty");
        if (acc.signum() < 0 || rej.signum() < 0) throw bad("Quantities cannot be negative.");
        if (acc.add(rej).signum() == 0) throw bad("Enter the quantity to accept and/or reject.");
        if (acc.add(rej).compareTo(hold) > 0) throw bad("Only " + plain(hold) + " is on hold on this line.");
        unitRule(acc, str(l, "uom"), "accepted " + str(l, "item_code"));
        unitRule(rej, str(l, "uom"), "rejected " + str(l, "item_code"));
        if (rej.signum() > 0 && blank(r.remarks()) == null) throw bad("Give the reason for rejecting held quantity.");
        BigDecimal newAccepted = dec(l, "accepted_qty").add(acc);
        BigDecimal max = GateQuantities.maxAcceptable(jdbc, str(l, "po_number"), str(l, "item_code"), settings.get().overDeliveryTolerancePct(), lineId, dec(l, "grn_posted_qty"));
        if (newAccepted.compareTo(max) > 0) {
            throw bad("Accepting " + plain(acc) + " would take line " + str(l, "item_code") + " to " + plain(newAccepted) + ", more than PO "
                    + str(l, "po_number") + " can take (" + plain(max) + "). Reject the rest.");
        }
        jdbc.update("UPDATE public.gate_entry_lines SET accepted_qty = accepted_qty + ?, rejected_qty = rejected_qty + ?, hold_qty = hold_qty - ?, "
                + "reject_reason = CASE WHEN ? > 0 THEN COALESCE(?, reject_reason) ELSE reject_reason END WHERE id = ?",
                acc, rej, acc.add(rej), rej, blank(r.remarks()), lineId);
        jdbc.update("UPDATE public.gate_entries SET version = version + 1, modified_by = ?, modified_at = NOW() WHERE id = ?", actor, id);
        event(id, "HOLD_RELEASED", stage, stage, actor, "Line " + l.get("line_no") + " " + str(l, "item_code") + ": +" + plain(acc) + " accepted, +"
                + plain(rej) + " rejected" + (blank(r.remarks()) == null ? "" : ". " + r.remarks().trim()));
        return queries.detail(id);
    }

    // ================================================================== turn back, cancel, exit

    /** The vehicle is sent back without unloading (wrong material, documents missing...). It still has to gate out. */
    @Transactional
    public Map<String, Object> turnBack(long id, ReasonRequest r, String actor) {
        requireActor(actor);
        Map<String, Object> e = lock(id);
        String stage = str(e, "stage");
        if (!"GATE_IN".equals(stage) && !"UNLOADING".equals(stage)) {
            throw new ConflictException("Only a vehicle that has not been unloaded can be turned back. " + str(e, "gate_entry_number") + " is " + stage + ".");
        }
        String reason = requireReason(r, "Reason for turning the vehicle back");
        jdbc.update("UPDATE public.gate_entries SET stage = 'TURNED_BACK', turned_back_reason = ?, version = version + 1, modified_by = ?, modified_at = NOW() WHERE id = ?",
                reason, actor, id);
        event(id, "TURNED_BACK", stage, "TURNED_BACK", actor, reason);
        return queries.detail(id);
    }

    /** Cancels an entry made by mistake: a draft, or a submitted entry before unloading starts. */
    @Transactional
    public Map<String, Object> cancel(long id, ReasonRequest r, String actor) {
        requireActor(actor);
        Map<String, Object> e = lock(id);
        String stage = str(e, "stage");
        if (!"DRAFT".equals(stage) && !"GATE_IN".equals(stage)) {
            throw new ConflictException(str(e, "gate_entry_number") + " is " + stage
                    + ". Only a draft or an entry not yet being unloaded can be cancelled; turn the vehicle back instead.");
        }
        String reason = requireReason(r, "Cancellation reason");
        jdbc.update("UPDATE public.gate_entries SET stage = 'CANCELLED', cancel_reason = ?, version = version + 1, modified_by = ?, modified_at = NOW() WHERE id = ?",
                reason, actor, id);
        event(id, "CANCELLED", stage, "CANCELLED", actor, reason);
        return queries.detail(id);
    }

    /** Gate out: allowed once quantities are verified, or after the vehicle was turned back. The server stamps the time. */
    @Transactional
    public Map<String, Object> exit(long id, ReasonRequest r, String actor) {
        requireActor(actor);
        Map<String, Object> e = lock(id);
        String stage = str(e, "stage");
        if (!"VERIFIED".equals(stage) && !"TURNED_BACK".equals(stage)) {
            throw new ConflictException(str(e, "gate_entry_number") + " is " + stage
                    + ". A vehicle can go out after its quantities are verified, or after it was turned back.");
        }
        jdbc.update("UPDATE public.gate_entries SET stage = 'EXITED', exit_at = NOW(), exited_by = ?, version = version + 1, modified_by = ?, modified_at = NOW() WHERE id = ?",
                actor, actor, id);
        event(id, "EXITED", stage, "EXITED", actor, r == null ? null : blank(r.reason()));
        return queries.detail(id);
    }

    // ================================================================== attachments and gates

    @Transactional
    public Map<String, Object> addAttachment(AttachmentRequest r, String actor) {
        requireActor(actor);
        if (r == null || r.gateEntryId() == null) throw bad("Choose the gate entry to attach the file to.");
        Map<String, Object> e = lock(r.gateEntryId());
        if ("CANCELLED".equals(str(e, "stage"))) throw new ConflictException("Files cannot be added to a cancelled gate entry.");
        String type = r.contentType() == null ? "" : r.contentType().trim().toLowerCase(Locale.ROOT);
        if (!FILE_TYPES.contains(type)) throw bad("Unsupported file type. Allowed: PDF, PNG, JPEG.");
        String docType = upper(r.docType()) == null ? "OTHER" : upper(r.docType());
        if (!DOC_TYPES.contains(docType)) throw bad("Document type must be one of " + DOC_TYPES + ".");
        String name = r.fileName() == null ? "" : r.fileName().replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        if (name.isEmpty() || name.length() > 255) throw bad("A valid file name is required.");
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode((r.contentBase64() == null ? "" : r.contentBase64()).replaceAll("^data:[^,]*,", ""));
        } catch (IllegalArgumentException ex) {
            throw bad("File content is not valid base64.");
        }
        if (bytes.length == 0 || bytes.length > 5L * 1024 * 1024) throw bad("File must be between 1 byte and 5 MB.");
        Long attId = jdbc.queryForObject("INSERT INTO public.gate_entry_attachments (gate_entry_id, doc_type, file_name, content_type, size_bytes, content, uploaded_by) "
                + "VALUES (?,?,?,?,?,?,?) RETURNING id", Long.class, r.gateEntryId(), docType, name, type, bytes.length, bytes, actor);
        event(r.gateEntryId(), "ATTACHMENT_ADDED", str(e, "stage"), str(e, "stage"), actor, docType + ": " + name);
        return Map.of("id", attId, "fileName", name, "docType", docType, "sizeBytes", bytes.length);
    }

    public Map<String, Object> attachment(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT file_name, content_type, content FROM public.gate_entry_attachments WHERE id = ?", id);
        if (rows.isEmpty()) throw new ResourceNotFoundException("Attachment " + id + " was not found.");
        return rows.get(0);
    }

    @Transactional
    public Map<String, Object> createGate(GateRequest r) {
        String code = upper(r == null ? null : r.gateCode());
        if (code == null || !code.matches("[A-Z0-9_-]{2,30}")) throw bad("Gate code must be 2 to 30 letters, digits, - or _.");
        String name = blank(r.gateName());
        if (name == null) throw bad("Gate name is required.");
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM public.gate_master WHERE gate_code = ?", Integer.class, code);
        if (exists != null && exists > 0) throw new ConflictException("Gate " + code + " already exists.");
        Long id = jdbc.queryForObject("INSERT INTO public.gate_master (gate_code, gate_name) VALUES (?, ?) RETURNING id", Long.class, code, name);
        return camel(jdbc.queryForMap("SELECT * FROM public.gate_master WHERE id = ?", id));
    }

    @Transactional
    public Map<String, Object> updateGate(long id, GateRequest r) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.gate_master WHERE id = ? FOR UPDATE", id);
        if (rows.isEmpty()) throw new ResourceNotFoundException("Gate " + id + " was not found.");
        String name = blank(r == null ? null : r.gateName());
        String status = upper(r == null ? null : r.status());
        if (status != null && !Set.of("ACTIVE", "INACTIVE").contains(status)) throw bad("Status must be ACTIVE or INACTIVE.");
        if ("INACTIVE".equals(status) && str(rows.get(0), "gate_code").equals(settings.get().defaultGate())) {
            throw new ConflictException("Gate " + str(rows.get(0), "gate_code") + " is the default gate. Choose another default in Gate Settings first.");
        }
        jdbc.update("UPDATE public.gate_master SET gate_name = COALESCE(?, gate_name), status = COALESCE(?, status) WHERE id = ?", name, status, id);
        return camel(jdbc.queryForMap("SELECT * FROM public.gate_master WHERE id = ?", id));
    }

    // ================================================================== helpers

    private Map<String, Object> headerColumns(EntryRequest r) {
        if (r == null) throw bad("Gate entry details are missing.");
        String vehicle = normaliseVehicle(r.vehicleNumber());
        if (vehicle.isEmpty()) throw bad("Vehicle number is required.");
        if (vehicle.length() < 4 || vehicle.length() > 15) throw bad("Vehicle number " + r.vehicleNumber() + " does not look right (4 to 15 letters and digits).");
        String gate = upper(r.gateCode()) == null ? settings.get().defaultGate() : upper(r.gateCode());
        Integer activeGate = jdbc.queryForObject("SELECT COUNT(*) FROM public.gate_master WHERE gate_code = ? AND status = 'ACTIVE'", Integer.class, gate);
        if (activeGate == null || activeGate == 0) throw bad("Gate " + gate + " is not an active gate.");
        String vendor = blank(r.vendorCode());
        if (vendor != null) {
            Integer v = jdbc.queryForObject("SELECT COUNT(*) FROM public.supplier_master WHERE supplier_code = ?", Integer.class, vendor);
            if (v == null || v == 0) throw bad("Vendor " + vendor + " is not in the Vendor Master.");
        }
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("gate_code", gate);
        c.put("vehicle_number", vehicle);
        c.put("vehicle_type", blank(r.vehicleType()));
        c.put("driver_name", blank(r.driverName()));
        c.put("driver_mobile", blank(r.driverMobile()) == null ? null : r.driverMobile().replaceAll("\\s", ""));
        c.put("transporter", blank(r.transporter()));
        c.put("vendor_code", vendor);
        c.put("multi_vendor", Boolean.TRUE.equals(r.multiVendor()));
        c.put("invoice_no", blank(r.invoiceNo()));
        c.put("invoice_date", r.invoiceDate() == null ? null : java.sql.Date.valueOf(r.invoiceDate()));
        c.put("challan_no", blank(r.challanNo()));
        c.put("challan_date", r.challanDate() == null ? null : java.sql.Date.valueOf(r.challanDate()));
        c.put("eway_bill_no", blank(r.ewayBillNo()) == null ? null : r.ewayBillNo().replaceAll("\\s", ""));
        c.put("lr_no", blank(r.lrNo()));
        SecurityChecks s = r.checks();
        c.put("check_vehicle", yn(s == null ? null : s.vehicle(), "vehicle"));
        c.put("check_driver", yn(s == null ? null : s.driver(), "driver"));
        c.put("check_vendor", yn(s == null ? null : s.vendor(), "vendor"));
        c.put("check_po", yn(s == null ? null : s.po(), "PO"));
        c.put("check_invoice", yn(s == null ? null : s.invoice(), "invoice"));
        c.put("check_challan", yn(s == null ? null : s.challan(), "challan"));
        c.put("check_documents", yn(s == null ? null : s.documents(), "documents"));
        c.put("security_remarks", blank(r.securityRemarks()));
        c.put("remarks", blank(r.remarks()));
        return c;
    }

    /** Checks each PO line exists and is entered once; vendor, item name and UOM come from the PO, never the client. */
    private List<Map<String, Object>> prepareLines(List<LineRequest> in) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (in == null) return out;
        Set<String> seen = new HashSet<>();
        int no = 0;
        for (LineRequest l : in) {
            if (l == null) continue;
            no++;
            String po = blank(l.poNumber()), item = blank(l.itemCode());
            if (po == null || item == null) throw bad("Line " + no + ": choose the PO and the item.");
            if (!seen.add(po + "\u0000" + item)) throw bad("Item " + item + " of PO " + po + " is entered twice. Enter each PO line once.");
            List<Map<String, Object>> header = jdbc.queryForList("SELECT vendor_code FROM public.purchase_orders WHERE po_number = ?", po);
            if (header.isEmpty()) throw bad("PO " + po + " was not found.");
            Map<String, Object> pl = GateQuantities.poLine(jdbc, po, item);
            BigDecimal declared = nz(l.declaredQty());
            if (declared.signum() < 0) throw bad("Line " + no + ": declared quantity cannot be negative.");
            unitRule(declared, str(pl, "uom"), "declared " + item);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("line_no", no);
            m.put("po_number", po);
            m.put("item_code", item);
            m.put("item_name", str(pl, "item_name"));
            m.put("uom", str(pl, "uom"));
            m.put("vendor_code", str(header.get(0), "vendor_code"));
            m.put("declared_qty", declared);
            m.put("remarks", blank(l.remarks()));
            out.add(m);
        }
        return out;
    }

    /** The PO header, refused when nothing can be received against it. */
    private Map<String, Object> receivablePo(String po) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT po_number, status, vendor_code, vendor_name, validity_date FROM public.purchase_orders WHERE po_number = ?", po);
        if (rows.isEmpty()) throw bad("PO " + po + " was not found.");
        Map<String, Object> h = rows.get(0);
        String status = str(h, "status");
        if (status == null || !RECEIVABLE_PO.contains(status.toUpperCase(Locale.ROOT))) {
            throw new ConflictException("PO " + po + " is " + status + "; material cannot be received against it.");
        }
        ServicePoService.assertNotServicePo(jdbc, po);
        PoValidity.assertNotExpired(po, h.get("validity_date") == null ? null : String.valueOf(h.get("validity_date")), today());
        return h;
    }

    private void insertLines(long id, List<Map<String, Object>> lines) {
        for (Map<String, Object> l : lines) {
            Map<String, Object> cols = new LinkedHashMap<>(l);
            cols.put("gate_entry_id", id);
            insert("public.gate_entry_lines", cols);
        }
    }

    List<Map<String, Object>> linesOf(long id) {
        return jdbc.queryForList("SELECT * FROM public.gate_entry_lines WHERE gate_entry_id = ? ORDER BY line_no", id);
    }

    private Map<String, Object> lock(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM public.gate_entries WHERE id = ? FOR UPDATE", id);
        if (rows.isEmpty()) throw new ResourceNotFoundException("Gate entry " + id + " was not found.");
        return rows.get(0);
    }

    private static void expectStage(Map<String, Object> e, String stage) {
        if (!stage.equals(str(e, "stage"))) {
            throw new ConflictException(str(e, "gate_entry_number") + " is " + str(e, "stage") + "; this step needs " + stage + ".");
        }
    }

    /** Every line of the entry must be answered exactly once, and only lines of this entry. */
    private static <T> Map<Long, T> byLine(List<T> given, java.util.function.Function<T, Long> idOf, List<Map<String, Object>> lines) {
        Set<Long> ids = new HashSet<>();
        for (Map<String, Object> l : lines) ids.add(lng(l, "id"));
        Map<Long, T> out = new HashMap<>();
        for (T g : given == null ? List.<T>of() : given) {
            if (g == null) continue;
            Long id = idOf.apply(g);
            if (id == null || !ids.contains(id)) throw bad("Line " + id + " is not on this gate entry.");
            if (out.put(id, g) != null) throw bad("Line " + id + " is entered twice.");
        }
        if (out.size() != ids.size()) throw bad("Enter every line of the gate entry (" + ids.size() + " lines, " + out.size() + " given).");
        return out;
    }

    /** Whole numbers for counted units, at most 2 decimals otherwise; zero is always fine. */
    private static void unitRule(BigDecimal qty, String uom, String label) {
        if (qty == null || qty.signum() == 0) return;
        String problem = QuantityRules.check(qty, uom, label, false);
        if (problem != null) throw bad(problem);
    }

    private static String yn(String v, String name) {
        String u = upper(v);
        if (u == null) return null;
        if (Set.of("YES", "Y", "TRUE").contains(u)) return "YES";
        if (Set.of("NO", "N", "FALSE").contains(u)) return "NO";
        throw bad("Security check " + name + " must be Yes or No.");
    }

    private static String requireReason(ReasonRequest r, String label) {
        String reason = r == null ? null : blank(r.reason());
        if (reason == null) throw bad(label + " is required.");
        return reason;
    }

    private static String joinRemarks(String remarks, List<String> warnings) {
        List<String> parts = new ArrayList<>();
        if (blank(remarks) != null) parts.add(remarks.trim());
        parts.addAll(warnings);
        return parts.isEmpty() ? null : String.join(" ", parts);
    }

    private static Map<String, Object> withWarnings(Map<String, Object> detail, List<String> warnings) {
        Map<String, Object> out = new LinkedHashMap<>(detail);
        out.put("warnings", warnings);
        return out;
    }

    void event(long id, String action, String from, String to, String actor, String remarks) {
        jdbc.update("INSERT INTO public.gate_entry_events (gate_entry_id, action, from_stage, to_stage, actor, remarks) VALUES (?,?,?,?,?,?)",
                id, action, from, to, actor, remarks);
    }

    private long insert(String table, Map<String, Object> cols) {
        String names = String.join(", ", cols.keySet());
        String marks = String.join(", ", Collections.nCopies(cols.size(), "?"));
        return jdbc.queryForObject("INSERT INTO " + table + " (" + names + ") VALUES (" + marks + ") RETURNING id", Long.class, cols.values().toArray());
    }

    private void updateRow(long id, Map<String, Object> cols) {
        StringBuilder sets = new StringBuilder();
        for (String k : cols.keySet()) sets.append(sets.length() == 0 ? "" : ", ").append(k).append(" = ?");
        List<Object> args = new ArrayList<>(cols.values());
        args.add(id);
        jdbc.update("UPDATE public.gate_entries SET " + sets + " WHERE id = ?", args.toArray());
    }

    private static void requireActor(String actor) {
        if (actor == null || actor.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required.");
    }

    private static IllegalArgumentException bad(String message) {
        return new IllegalArgumentException(message);
    }
}
