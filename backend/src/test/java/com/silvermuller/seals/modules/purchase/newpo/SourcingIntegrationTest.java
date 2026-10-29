package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.masters.PurchaseOrderTerms;
import com.silvermuller.seals.modules.purchase.dto.PurchaseItemLine;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import com.silvermuller.seals.modules.purchase.model.PurchaseRequisition;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatePoRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.LineRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedPo;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.AssignLine;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.AssignRequest;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ConvertLine;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ConvertRequest;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ReleaseLine;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ReleaseRequest;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import com.silvermuller.seals.modules.purchase.service.GoodsReceiptNoteService;
import com.silvermuller.seals.modules.purchase.service.PurchaseRequisitionService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sourcing flow against a real PostgreSQL database, using the purchase-module example:
 *   PR-A / Moulding: safety gloves 80 pairs, PR-B / Maintainance: safety gloves 40 pairs, PR-C / Finance: copier paper 30 reams.
 *
 * Runs only when SMS_TEST_DATABASE_URL points at a COPY of the ERP database (never the live one). Each test creates
 * its own items, PRs, vendor links and rates, and everything created is removed afterwards.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(named = "SMS_TEST_DATABASE_URL", matches = ".+")
class SourcingIntegrationTest {

    private static final String VENDOR = "SUP-002";
    private static final String OTHER_VENDOR = "SUP-003";
    private static final String HSN = "84669390";
    private static final String TAG = "S" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
    private static final String USER = "it-buyer";

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", () -> System.getenv("SMS_TEST_DATABASE_URL"));
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_USERNAME", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_PASSWORD", "postgres"));
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired SourcingService sourcing;
    @Autowired ProcurementReportService reports;
    @Autowired PoByPrService poByPr;
    @Autowired PurchaseRequisitionService prService;
    @Autowired GoodsReceiptNoteService grnService;

    private final List<Long> itemIds = new ArrayList<>();
    private final List<String> prNumbers = new ArrayList<>();
    private int counter;

    /** One scenario: two fresh items (gloves in PAIRS, paper in REAMS) and the three example PRs. */
    private record Scenario(String gloves, String paper, String prA, long lineA, String prB, long lineB, String prC, long lineC) {}

    @BeforeAll
    void noOpenDraftsForTheTestVendors() {
        // Each vendor has at most one open draft; leftovers from another run would mix into these tests.
        Integer open = jdbc.queryForObject("SELECT COUNT(*) FROM public.po_drafts WHERE status = 'OPEN' AND vendor_code IN (?, ?)",
                Integer.class, VENDOR, OTHER_VENDOR);
        assertEquals(0, open, "The test database already has open drafts for " + VENDOR + " / " + OTHER_VENDOR);
    }

    @AfterAll
    void cleanUp() {
        List<Long> drafts = jdbc.queryForList("SELECT DISTINCT draft_id FROM public.po_draft_allocations WHERE item_code LIKE ?", Long.class, "IT" + TAG + "%");
        List<String> pos = jdbc.queryForList("SELECT DISTINCT po_number FROM public.po_pr_allocations WHERE item_code LIKE ?", String.class, "IT" + TAG + "%");
        for (String po : pos) {
            jdbc.update("DELETE FROM public.grn_item_allocations WHERE grn_item_id IN (SELECT id FROM public.goods_receipt_note_items WHERE po_number = ?)", po);
            jdbc.update("DELETE FROM public.goods_receipt_note_items WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.goods_receipt_notes WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.po_pr_allocations WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.purchase_orders WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.procurement_audit_log WHERE entity_ref = ?", po);
        }
        for (Long d : drafts) {
            String number = jdbc.queryForObject("SELECT draft_number FROM public.po_drafts WHERE id = ?", String.class, d);
            jdbc.update("DELETE FROM public.po_draft_allocations WHERE draft_id = ?", d);
            jdbc.update("DELETE FROM public.po_drafts WHERE id = ?", d);
            jdbc.update("DELETE FROM public.procurement_audit_log WHERE entity_ref = ?", number);
        }
        for (String pr : prNumbers) {
            jdbc.update("DELETE FROM public.purchase_requisition_items WHERE pr_number = ?", pr);
            jdbc.update("DELETE FROM public.purchase_requisitions WHERE pr_number = ?", pr);
            jdbc.update("DELETE FROM public.procurement_audit_log WHERE entity_ref = ?", pr);
        }
        for (Long id : itemIds) {
            jdbc.update("DELETE FROM public.vendor_item_rates WHERE item_id = ?", id);
            jdbc.update("DELETE FROM public.supplier_item WHERE item_id = ?", id);
            jdbc.update("DELETE FROM public.item_master WHERE id = ?", id);
        }
    }

    // ------------------------------------------------------------------ fixtures

    private Scenario scenario() {
        int n = ++counter;
        String gloves = "IT" + TAG + "-GLV-" + n;
        String paper = "IT" + TAG + "-PAP-" + n;
        long glovesId = item(gloves, "Safety gloves", "PAIRS");
        long paperId = item(paper, "A4 copier paper", "REAMS");
        link(VENDOR, glovesId, "50");
        link(VENDOR, paperId, "250");
        link(OTHER_VENDOR, glovesId, "55");

        String prA = pr("A" + n, "Moulding");
        String prB = pr("B" + n, "Maintainance");
        String prC = pr("C" + n, "Finance");
        return new Scenario(gloves, paper,
                prA, line(prA, gloves, "Safety gloves", "PAIRS", "80"),
                prB, line(prB, gloves, "Safety gloves", "PAIRS", "40"),
                prC, line(prC, paper, "A4 copier paper", "REAMS", "30"));
    }

    private long item(String code, String name, String uom) {
        Long id = jdbc.queryForObject(
                "INSERT INTO public.item_master (sms_new_part_no, description_size, hsn_code, uom, purchased_uom, category, group_name) " +
                "VALUES (?, ?, ?, ?, ?, 'Consumables', 'Consumables') RETURNING id", Long.class, code, name, HSN, uom, uom);
        itemIds.add(id);
        return id;
    }

    private void link(String vendor, long itemId, String price) {
        Long supplierId = jdbc.queryForObject("SELECT id FROM public.supplier_master WHERE supplier_code = ?", Long.class, vendor);
        jdbc.update("INSERT INTO public.supplier_item (supplier_id, item_id) VALUES (?, ?)", supplierId, itemId);
        jdbc.update("INSERT INTO public.vendor_item_rates (supplier_code, item_id, offered_unit_price, effective_from, created_by) VALUES (?, ?, ?, ?, 'it')",
                vendor, itemId, new BigDecimal(price), java.sql.Date.valueOf(LocalDate.of(2000, 1, 1)));
    }

    private String pr(String suffix, String department) {
        String number = "PR-" + TAG + "-" + suffix;
        jdbc.update("INSERT INTO public.purchase_requisitions (pr_number, pr_date, status, requisitioner, department, created_by) " +
                "VALUES (?, CURRENT_DATE, 'Approved', 'it', ?, 'it')", number, department);
        prNumbers.add(number);
        return number;
    }

    private long line(String prNumber, String code, String name, String uom, String qty) {
        Long prId = jdbc.queryForObject("SELECT id FROM public.purchase_requisitions WHERE pr_number = ?", Long.class, prNumber);
        return jdbc.queryForObject(
                "INSERT INTO public.purchase_requisition_items (pr_id, pr_number, item_code, item_name, uom, req_qty, ordered_qty, remaining_qty, hsn_code, category) " +
                "VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'Consumables') RETURNING id",
                Long.class, prId, prNumber, code, name, uom, new BigDecimal(qty), new BigDecimal(qty), HSN);
    }

    private BigDecimal col(String column, long prItemId) {
        return jdbc.queryForObject("SELECT " + column + " FROM public.purchase_requisition_items WHERE id = ?", BigDecimal.class, prItemId);
    }

    private static void assertQty(String expected, Object actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(new BigDecimal(String.valueOf(actual))), "expected " + expected + " but was " + actual);
    }

    private Map<String, Object> group(String itemCode) {
        return sourcing.clubbedDemand(itemCode, null).stream().filter(g -> itemCode.equals(g.get("itemCode"))).findFirst().orElse(null);
    }

    private String assignAll(String itemCode, String uom, String vendor) {
        return String.valueOf(sourcing.assign(new AssignRequest(itemCode, uom, vendor, null), USER).get("draftNumber"));
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Long> allocationIdsByPrLine(String draftNumber) {
        Map<Long, Long> out = new HashMap<>();
        for (Map<String, Object> l : (List<Map<String, Object>>) sourcing.conversionLines(draftNumber, null).get("lines")) {
            out.put(((Number) l.get("prItemId")).longValue(), ((Number) l.get("allocationId")).longValue());
        }
        return out;
    }

    private ConvertRequest convertRequest(ConvertLine... lines) {
        return new ConvertRequest(LocalDate.now(), List.of(lines), "integration test", null, null, null, null, null,
                "Test Invoice To", "Test Ship To", null, "REF-" + TAG, LocalDate.now());
    }

    private Map<String, Object> traceLine(String prNumber) {
        return reports.traceability(null, null, null, prNumber, null).stream()
                .filter(l -> prNumber.equals(l.get("prNumber"))).findFirst().orElseThrow();
    }

    private void closeOpenDrafts() {
        for (String vendor : List.of(VENDOR, OTHER_VENDOR)) {
            for (String d : jdbc.queryForList("SELECT draft_number FROM public.po_drafts WHERE status = 'OPEN' AND vendor_code = ?", String.class, vendor)) {
                sourcing.release(d, null, USER);
            }
        }
    }

    // ------------------------------------------------------------------ tests

    @Test
    void fullExampleFromPrToGrnKeepsEveryAllocationTraceable() {
        Scenario s = scenario();
        try {
            // 3. Clubbing: gloves 120 from two PRs, paper 30 from one. PR lines stay separate.
            Map<String, Object> gloves = group(s.gloves());
            assertQty("120", gloves.get("clubbedQty"));
            assertEquals(List.of(s.prA(), s.prB()), gloves.get("prNumbers"));
            assertQty("30", group(s.paper()).get("clubbedQty"));

            // 4. Suggestions: both linked vendors, cheapest first and recommended; nothing is created.
            Map<String, Object> sug = sourcing.vendorSuggestions(s.gloves(), "PAIRS");
            @SuppressWarnings("unchecked") List<Map<String, Object>> vendors = (List<Map<String, Object>>) sug.get("vendors");
            assertEquals(VENDOR, vendors.get(0).get("vendorCode"));
            assertQty("50", vendors.get(0).get("unitPrice"));
            assertEquals(true, vendors.get(0).get("recommended"));
            assertEquals(OTHER_VENDOR, vendors.get(1).get("vendorCode"));
            assertEquals(false, vendors.get(1).get("recommended"));
            assertQty("18", vendors.get(0).get("gstRatePercent"));

            // 5. Both items go to the same vendor: one draft, two items, PR allocations underneath.
            String draft = assignAll(s.gloves(), "PAIRS", VENDOR);
            assertEquals(draft, assignAll(s.paper(), "REAMS", VENDOR));
            assertTrue(draft.matches("DRAFT-\\d{4}-\\d{3,}"), draft);
            Map<String, Object> d = sourcing.draftDetail(draft);
            assertEquals(2, d.get("itemCount"));
            assertQty("13500", d.get("estimatedTotal"));                     // 120 x 50 + 30 x 250
            assertQty("80", col("drafted_qty", s.lineA()));
            assertNull(group(s.gloves()), "drafted demand is no longer ready for sourcing");

            // Reserved quantity cannot be drafted again or ordered elsewhere.
            assertThrows(NewPoException.class, () -> assignAll(s.gloves(), "PAIRS", OTHER_VENDOR));
            NewPoException direct = assertThrows(NewPoException.class, () -> poByPr.create(
                    new CreatePoRequest(VENDOR, LocalDate.now(), "PARTIAL", List.of(new LineRequest(s.lineA(), new BigDecimal("1"))), "direct"), USER));
            assertEquals(HttpStatus.CONFLICT, direct.getStatus());

            // 6. Convert: 50 of PR-A gloves, none of PR-B, all 30 of PR-C paper.
            Map<Long, Long> alloc = allocationIdsByPrLine(draft);
            Map<String, Object> result = sourcing.convert(draft, convertRequest(
                    new ConvertLine(alloc.get(s.lineA()), new BigDecimal("50"), null, null, null),
                    new ConvertLine(alloc.get(s.lineB()), BigDecimal.ZERO, null, null, null),
                    new ConvertLine(alloc.get(s.lineC()), new BigDecimal("30"), null, null, null)), USER);
            String po = String.valueOf(result.get("poNumber"));
            assertTrue(po.matches("PO-" + LocalDate.now().getYear() + "-\\d{5}"), po);

            assertQty("50", col("ordered_qty", s.lineA()));
            assertQty("30", col("drafted_qty", s.lineA()));
            assertQty("0", col("ordered_qty", s.lineB()));
            assertQty("40", col("drafted_qty", s.lineB()));
            assertQty("30", col("ordered_qty", s.lineC()));
            assertQty("0", col("drafted_qty", s.lineC()));
            @SuppressWarnings("unchecked") Map<String, Object> remaining = (Map<String, Object>) result.get("draft");
            assertEquals("OPEN", remaining.get("status"));
            assertQty("70", remaining.get("openQty"));
            assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ? AND draft_allocation_id IS NOT NULL", Integer.class, po));

            // 7. Ordering status per PR item; remaining to order includes what is still in the draft.
            Map<String, Object> a = traceLine(s.prA());
            assertEquals("PARTIALLY_ORDERED", a.get("orderingStatus"));
            assertQty("30", a.get("remainingToOrderQty"));
            assertQty("30", a.get("inDraftQty"));
            assertQty("50", a.get("awaitingReceiptQty"));
            assertEquals("IN_DRAFT", a.get("stage"));
            assertEquals("YET_TO_ORDER", traceLine(s.prB()).get("orderingStatus"));
            assertEquals("FULLY_ORDERED", traceLine(s.prC()).get("orderingStatus"));

            // 8. GRN: 20 of 50 gloves and all 30 reams.
            GoodsReceiptNote grn = grnService.saveOrPostGoodsReceiptNote(grn(po, "CH-" + TAG,
                    receiptLine(s.gloves(), "PAIRS", "20", "50"), receiptLine(s.paper(), "REAMS", "30", "250")), true);
            assertTrue(grn.getGrnNumber().matches("GRN-" + LocalDate.now().getYear() + "-\\d{5}"), grn.getGrnNumber());
            assertEquals("PARTIALLY RECEIVED", jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, po));

            a = traceLine(s.prA());
            assertQty("20", a.get("receivedQty"));
            assertQty("30", a.get("awaitingReceiptQty"));
            assertEquals("PARTIALLY_RECEIVED", a.get("receivingStatus"));
            assertEquals("PARTIALLY_ORDERED", a.get("orderingStatus"), "receiving never changes the ordering status");
            @SuppressWarnings("unchecked") List<Map<String, Object>> aPos = (List<Map<String, Object>>) a.get("purchaseOrders");
            assertEquals(po, aPos.get(0).get("poNumber"));
            assertEquals(draft, aPos.get(0).get("draftNumber"));
            @SuppressWarnings("unchecked") List<Map<String, Object>> aGrns = (List<Map<String, Object>>) aPos.get(0).get("grns");
            assertEquals(grn.getGrnNumber(), aGrns.get(0).get("grnNumber"));
            Map<String, Object> c = traceLine(s.prC());
            assertEquals("FULLY_RECEIVED", c.get("receivingStatus"));
            assertEquals("COMPLETED", c.get("stage"));

            // Flat export: 70 still to buy and 30 awaiting delivery are separate balances; totals are not doubled.
            List<Map<String, Object>> flat = reports.traceabilityFlat(null, null, s.gloves(), null, null);
            BigDecimal requested = BigDecimal.ZERO, ordered = BigDecimal.ZERO, received = BigDecimal.ZERO;
            for (Map<String, Object> r : flat) {
                if (r.get("requestedQty") != null) requested = requested.add(new BigDecimal(String.valueOf(r.get("requestedQty"))));
                if (r.get("orderedQty") != null) ordered = ordered.add(new BigDecimal(String.valueOf(r.get("orderedQty"))));
                if (r.get("receivedQty") != null) received = received.add(new BigDecimal(String.valueOf(r.get("receivedQty"))));
            }
            assertQty("120", requested);
            assertQty("50", ordered);
            assertQty("20", received);

            // Audit trail: the draft records assignment and conversion.
            List<String> actions = sourcing.audit(draft).stream().map(r -> String.valueOf(r.get("action"))).toList();
            assertTrue(actions.containsAll(List.of("CREATED", "ASSIGNED", "CONVERTED_TO_PO")), actions.toString());
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void remainingDraftQuantityCanBeReleasedAndGivenToAnotherVendor() {
        Scenario s = scenario();
        try {
            String draft = assignAll(s.gloves(), "PAIRS", VENDOR);
            Map<Long, Long> alloc = allocationIdsByPrLine(draft);

            sourcing.release(draft, new ReleaseRequest(List.of(new ReleaseLine(alloc.get(s.lineB()), null)), "cheaper elsewhere"), USER);
            assertQty("0", col("drafted_qty", s.lineB()));
            assertQty("40", group(s.gloves()).get("clubbedQty"));

            String other = assignAll(s.gloves(), "PAIRS", OTHER_VENDOR);
            assertNotEquals(draft, other);
            assertQty("40", col("drafted_qty", s.lineB()));
            assertQty("80", col("drafted_qty", s.lineA()));
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void conversionRefusesMoreThanTheDraftHoldsAndChangesNothing() {
        Scenario s = scenario();
        try {
            String draft = assignAll(s.gloves(), "PAIRS", VENDOR);
            Map<Long, Long> alloc = allocationIdsByPrLine(draft);

            NewPoException over = assertThrows(NewPoException.class, () -> sourcing.convert(draft,
                    convertRequest(new ConvertLine(alloc.get(s.lineA()), new BigDecimal("81"), null, null, null)), USER));
            assertEquals(HttpStatus.CONFLICT, over.getStatus());
            NewPoException none = assertThrows(NewPoException.class, () -> sourcing.convert(draft,
                    convertRequest(new ConvertLine(alloc.get(s.lineA()), BigDecimal.ZERO, null, null, null)), USER));
            assertEquals(HttpStatus.BAD_REQUEST, none.getStatus());
            NewPoException fraction = assertThrows(NewPoException.class, () -> sourcing.convert(draft,
                    convertRequest(new ConvertLine(alloc.get(s.lineA()), new BigDecimal("10.5"), null, null, null)), USER));
            assertEquals(HttpStatus.BAD_REQUEST, fraction.getStatus(), "PAIRS must be whole numbers");

            assertQty("80", col("drafted_qty", s.lineA()));
            assertQty("0", col("ordered_qty", s.lineA()));
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void previewPricesThePoButSavesNothing() {
        Scenario s = scenario();
        try {
            String draft = assignAll(s.gloves(), "PAIRS", VENDOR);
            Map<Long, Long> alloc = allocationIdsByPrLine(draft);
            Long posBefore = jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_orders", Long.class);

            PlannedPo planned = sourcing.preview(draft, convertRequest(new ConvertLine(alloc.get(s.lineA()), new BigDecimal("50"), null, null, null)));
            assertQty("2500", planned.taxableAmount());
            assertQty("450", planned.totalTax());

            assertEquals(posBefore, jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_orders", Long.class));
            assertQty("80", col("drafted_qty", s.lineA()));
            assertQty("0", col("ordered_qty", s.lineA()));
            assertQty("0", jdbc.queryForObject("SELECT converted_qty FROM public.po_draft_allocations WHERE id = ?", BigDecimal.class, alloc.get(s.lineA())));
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void vendorMustBeLinkedToTheItemAndHaveARate() {
        Scenario s = scenario();
        try {
            NewPoException notLinked = assertThrows(NewPoException.class, () -> assignAll(s.paper(), "REAMS", OTHER_VENDOR));
            assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, notLinked.getStatus());
            assertQty("0", col("drafted_qty", s.lineC()));
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void partialAssignmentReservesOnlyTheChosenQuantity() {
        Scenario s = scenario();
        try {
            sourcing.assign(new AssignRequest(s.gloves(), "PAIRS", VENDOR, List.of(new AssignLine(s.lineA(), new BigDecimal("30")))), USER);
            assertQty("30", col("drafted_qty", s.lineA()));
            assertQty("0", col("drafted_qty", s.lineB()));
            assertQty("90", group(s.gloves()).get("clubbedQty"));   // 50 left on PR-A + 40 on PR-B
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void prWithDraftedQuantityCannotBeEditedCancelledOrDeleted() {
        Scenario s = scenario();
        try {
            assignAll(s.paper(), "REAMS", VENDOR);
            PurchaseRequisition pr = prService.getRequisitionByNumber(s.prC());
            pr.setDepartment("Finance");
            pr.setStatus("Pending Approval");
            assertThrows(ConflictException.class, () -> prService.createOrUpdateRequisition(pr));
            assertThrows(ConflictException.class, () -> prService.updateStatus(s.prC(), "Cancelled", "test", USER));
            assertThrows(ConflictException.class, () -> prService.deleteRequisition(s.prC()));
            assertQty("30", col("drafted_qty", s.lineC()));
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void approvalOnlyMovesAPendingPr() {
        Scenario s = scenario();
        // An already approved PR cannot be approved again (the old code would overwrite any status).
        assertThrows(ConflictException.class, () -> prService.updateStatus(s.prA(), "Approved", null, USER));
        jdbc.update("UPDATE public.purchase_requisitions SET status = 'Pending Approval' WHERE pr_number = ?", s.prA());
        assertThrows(IllegalArgumentException.class, () -> prService.updateStatus(s.prA(), "Rejected", " ", USER));
        prService.updateStatus(s.prA(), "Approved", null, USER);
        assertEquals("Approved", jdbc.queryForObject("SELECT status FROM public.purchase_requisitions WHERE pr_number = ?", String.class, s.prA()));
        assertEquals(USER, jdbc.queryForObject("SELECT approved_by FROM public.purchase_requisitions WHERE pr_number = ?", String.class, s.prA()));
    }

    @Test
    void savedPoCarriesHeaderDueDatesAndTermNames() {
        Scenario s = scenario();
        try {
            String draft = assignAll(s.gloves(), "PAIRS", VENDOR);
            Map<Long, Long> alloc = allocationIdsByPrLine(draft);
            LocalDate due = LocalDate.now().plusDays(12);
            PurchaseOrderTerms terms = new PurchaseOrderTerms("MOP001", null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null, null, null);
            ConvertRequest req = new ConvertRequest(LocalDate.now(),
                    List.of(new ConvertLine(alloc.get(s.lineA()), new BigDecimal("10"), null, null, null, due)),
                    null, null, null, null, terms,
                    null, "Bill Party", "Ship Party", null, "REF-DUE-" + TAG, LocalDate.now());
            String po = String.valueOf(sourcing.convert(draft, req, USER).get("poNumber"));
            Map<String, Object> d = poByPr.poDetail(po);

            assertEquals("Bill Party", d.get("invoiceTo"));
            assertEquals("Ship Party", d.get("shipTo"));
            assertEquals(po, d.get("voucherNo"), "voucher number defaults to the PO number");
            assertEquals("REF-DUE-" + TAG, d.get("referenceNo"));
            @SuppressWarnings("unchecked") List<PurchaseItemLine> lines = (List<PurchaseItemLine>) d.get("lines");
            assertEquals(due.toString(), lines.get(0).getExpectedDeliveryDate(), "each PO line carries its due date");
            @SuppressWarnings("unchecked") Map<String, Object> names = (Map<String, Object>) d.get("termNames");
            assertEquals("Bank Transfer / NEFT", names.get("modeOfPayment"), "the PO shows the master name, not the code");
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void batchAssignIsAllOrNothing() {
        Scenario s = scenario();
        try {
            // The second request is invalid (OTHER_VENDOR is not linked to the paper), so the gloves must not be drafted either.
            assertThrows(NewPoException.class, () -> sourcing.assignBatch(List.of(
                    new AssignRequest(s.gloves(), "PAIRS", VENDOR, null),
                    new AssignRequest(s.paper(), "REAMS", OTHER_VENDOR, null)), USER));
            assertQty("0", col("drafted_qty", s.lineA()));
            assertQty("0", col("drafted_qty", s.lineC()));
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_drafts WHERE status = 'OPEN' AND vendor_code IN (?, ?)", Integer.class, VENDOR, OTHER_VENDOR));

            // The valid batch goes through in one piece, one draft per vendor.
            List<Map<String, Object>> drafts = sourcing.assignBatch(List.of(
                    new AssignRequest(s.gloves(), "PAIRS", VENDOR, null),
                    new AssignRequest(s.paper(), "REAMS", VENDOR, null)), USER);
            assertEquals(1, drafts.size());
            assertQty("80", col("drafted_qty", s.lineA()));
            assertQty("30", col("drafted_qty", s.lineC()));
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void linesWithoutAnActiveGstRateAreFlaggedBeforeConversion() {
        Scenario s = scenario();
        try {
            // The PR line has no HSN and the item's HSN has no active tax row.
            jdbc.update("UPDATE public.purchase_requisition_items SET hsn_code = NULL WHERE id = ?", s.lineC());
            jdbc.update("UPDATE public.item_master SET hsn_code = 'ZZ-NO-GST' WHERE sms_new_part_no = ?", s.paper());

            String draft = assignAll(s.paper(), "REAMS", VENDOR);
            Map<String, Object> d = sourcing.draftDetail(draft);
            assertEquals(List.of(s.paper()), d.get("missingTax"));
            assertTrue(String.valueOf(d.get("nextAction")).contains(s.paper()));

            @SuppressWarnings("unchecked") List<Map<String, Object>> lines = (List<Map<String, Object>>) sourcing.conversionLines(draft, null).get("lines");
            assertNotNull(lines.get(0).get("taxIssue"));
            // The server refuses it too if the screen is bypassed.
            Map<Long, Long> alloc = allocationIdsByPrLine(draft);
            assertThrows(NewPoException.class, () -> sourcing.convert(draft,
                    convertRequest(new ConvertLine(alloc.get(s.lineC()), new BigDecimal("30"), null, null, null)), USER));
            assertQty("30", col("drafted_qty", s.lineC()));
            assertQty("0", col("ordered_qty", s.lineC()));
        } finally {
            closeOpenDrafts();
        }
    }

    @Test
    void documentNumbersRestartEveryYearAndNeverRepeat() {
        int future = 2099;
        try {
            assertEquals("PO-2099-00001", com.silvermuller.seals.modules.purchase.service.DocumentNumbers.next(
                    jdbc, com.silvermuller.seals.modules.purchase.service.DocumentNumbers.Doc.PO, future));
            assertEquals("PO-2099-00002", com.silvermuller.seals.modules.purchase.service.DocumentNumbers.next(
                    jdbc, com.silvermuller.seals.modules.purchase.service.DocumentNumbers.Doc.PO, future));
            assertEquals("DRAFT-2099-001", com.silvermuller.seals.modules.purchase.service.DocumentNumbers.next(
                    jdbc, com.silvermuller.seals.modules.purchase.service.DocumentNumbers.Doc.DRAFT, future));
            // The current year's counter is untouched by another year's numbers.
            String peek = prService.getNextPrNumber();
            assertTrue(peek.startsWith("PR-" + LocalDate.now().getYear() + "-"), peek);
        } finally {
            jdbc.update("DELETE FROM public.document_number_counters WHERE year = ?", future);
        }
    }

    // ------------------------------------------------------------------ GRN helpers

    private GoodsReceiptNote grn(String po, String challan, GoodsReceiptNoteItem... items) {
        GoodsReceiptNote g = new GoodsReceiptNote();
        g.setPoNumber(po);
        g.setVendorCode(VENDOR);
        g.setVendorName("A.V.SALES CORPORATION");
        g.setVendorChallanNo(challan);
        g.setStoreLocation("Main Store");
        g.setReceivedBy("it-store");
        g.setGrnNumber("GRN-CLIENT-SENT-NUMBER");   // ignored: the server assigns the number
        g.setItems(List.of(items));
        return g;
    }

    private static GoodsReceiptNoteItem receiptLine(String itemCode, String uom, String qty, String rate) {
        BigDecimal q = new BigDecimal(qty);
        GoodsReceiptNoteItem it = new GoodsReceiptNoteItem();
        it.setItemCode(itemCode);
        it.setItemName(itemCode);
        it.setUom(uom);
        it.setPoOrderedQty(q);
        it.setChallanQty(q);
        it.setReceivedQty(q);
        it.setAcceptedQty(q);
        it.setRejectedQty(BigDecimal.ZERO);
        it.setPendingInspectionQty(BigDecimal.ZERO);
        it.setUnitRate(new BigDecimal(rate));
        it.setTaxPercent(new BigDecimal("18"));
        return it;
    }
}
