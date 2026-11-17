package com.silvermuller.seals.modules.gate;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.gate.GateDtos.*;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Created;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Line;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Request;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService;
import com.silvermuller.seals.modules.purchase.service.GoodsReceiptNoteService;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Gate entry end to end on an isolated copy of the database (set SMS_TEST_DATABASE_URL; backend\test-db.ps1 does it):
 * PO -> gate entry -> unloading -> verification -> pending GRN -> GRN, plus every rule that protects quantities.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(named = "SMS_TEST_DATABASE_URL", matches = ".+")
class GateEntryIntegrationTest {

    private static final String VENDOR = "SUP-002";
    private static final String OTHER_VENDOR = "SUP-001";
    private static final String ITEM = "CON01-0001";
    private static final String ITEM_2 = "CON01-0002";
    private static final LocalDate TODAY = LocalDate.now(GateRows.ZONE);
    private static final String TAG = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "X");
    private static final String ACTOR = "it-gate";

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        String url = System.getenv("SMS_TEST_DATABASE_URL");
        if (url.matches("(?i).*/sms_seals(\\?.*)?$")) {
            throw new IllegalStateException("Refusing to run tests against the live sms_seals database");
        }
        r.add("spring.datasource.url", () -> url);
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_USERNAME", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_PASSWORD", "postgres"));
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired GateEntryService gate;
    @Autowired GateQueryService queries;
    @Autowired GateSettings settings;
    @Autowired DirectPoService direct;
    @Autowired VendorRateService rates;
    @Autowired GoodsReceiptNoteService grnService;
    @Autowired PurchaseProcessingService purchaseProcessing;

    private final List<String> pos = new ArrayList<>();
    private final List<Long> entries = new ArrayList<>();
    private final List<Long> rateIds = new ArrayList<>();
    private int vehicleSeq = 0;

    @BeforeAll
    void setUp() {
        jdbc.update("DELETE FROM public.app_setting WHERE setting_key = ?", GateSettings.KEY);
        for (long item : new long[] {1611L, 1612L}) {
            Map<String, Object> r = rates.create(new VendorRateService.RateRequest(VENDOR, item, new BigDecimal("100"), TODAY), ACTOR);
            rateIds.add(((Number) r.get("id")).longValue());
        }
    }

    @AfterEach
    void gateNotRequired() {
        // Other test classes post GRNs without a gate entry: never leave the gate switched on.
        jdbc.update("DELETE FROM public.app_setting WHERE setting_key = ?", GateSettings.KEY);
    }

    @AfterAll
    void cleanUp() {
        for (String po : pos) {
            jdbc.update("DELETE FROM public.grn_item_allocations WHERE grn_item_id IN (SELECT id FROM public.goods_receipt_note_items WHERE po_number = ?)", po);
            jdbc.update("DELETE FROM public.goods_receipt_note_items WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.goods_receipt_notes WHERE po_number = ?", po);
        }
        for (Long id : entries) jdbc.update("DELETE FROM public.gate_entries WHERE id = ?", id);
        for (String po : pos) {
            jdbc.update("DELETE FROM public.po_revisions WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.purchase_orders WHERE po_number = ?", po);
        }
        for (Long id : rateIds) jdbc.update("DELETE FROM public.vendor_item_rates WHERE id = ?", id);
    }

    // ------------------------------------------------------------------ fixtures

    private String po(String qty) {
        Created c = direct.create(new Request(VENDOR, TODAY, TODAY.plusDays(3), List.of(new Line(ITEM, new BigDecimal(qty))), "gate it " + TAG,
                null, null, null, "Invoice to", "Ship to", null, "REF-" + TAG, null, null, "Gate integration test"), ACTOR);
        pos.add(c.poNumber());
        return c.poNumber();
    }

    private String vehicle() {
        return "HR" + TAG + (++vehicleSeq);
    }

    private static SecurityChecks allYes() {
        return new SecurityChecks("YES", "YES", "YES", "YES", "YES", "YES", "YES");
    }

    private EntryRequest request(String vehicle, String vendor, String invoice, List<LineRequest> lines) {
        return new EntryRequest(null, null, vehicle, "Truck", "Driver " + TAG, "9876543210", "TEST Transport", vendor, false,
                invoice, TODAY, "CH-" + invoice, TODAY, null, "LR-1", allYes(), null, null, null, lines);
    }

    private long draft(String po, String declared) {
        Map<String, Object> d = gate.create(request(vehicle(), VENDOR, "INV-" + TAG + "-" + (vehicleSeq + 1) + "-" + System.nanoTime() % 100000,
                List.of(new LineRequest(po, ITEM, new BigDecimal(declared), null))), ACTOR);
        long id = ((Number) d.get("id")).longValue();
        entries.add(id);
        return id;
    }

    private long lineId(long entryId) {
        return jdbc.queryForObject("SELECT id FROM public.gate_entry_lines WHERE gate_entry_id = ? ORDER BY line_no LIMIT 1", Long.class, entryId);
    }

    /** Draft -> submit -> unloading -> unloaded -> verified with the given split. */
    private long verified(String po, String declared, String unloaded, String accepted, String rejected, String hold) {
        long id = draft(po, declared);
        gate.submit(id, ACTOR);
        gate.startUnloading(id, ACTOR);
        long line = lineId(id);
        gate.recordUnloading(id, new UnloadRequest(List.of(new UnloadLine(line, new BigDecimal(unloaded), null)), null), ACTOR);
        gate.verify(id, new VerifyRequest(List.of(new VerifyLine(line, new BigDecimal(accepted), new BigDecimal(rejected), new BigDecimal(hold),
                "damaged", "awaiting QC")), null), ACTOR);
        return id;
    }

    private GoodsReceiptNote gateGrn(String po, Long entryId, String qty) {
        GoodsReceiptNote g = new GoodsReceiptNote();
        g.setPoNumber(po);
        g.setGateEntryId(entryId);
        g.setStoreLocation("Main Store");
        g.setReceivedBy(ACTOR);
        GoodsReceiptNoteItem it = new GoodsReceiptNoteItem();
        it.setItemCode(ITEM);
        it.setItemName("Test " + ITEM);
        it.setUom("PCS");
        it.setGateEntryLineId(entryId == null ? null : lineId(entryId));
        it.setAcceptedQty(new BigDecimal(qty));
        it.setReceivedQty(new BigDecimal(qty));
        it.setUnitRate(new BigDecimal("100"));
        it.setTaxPercent(new BigDecimal("18"));
        g.setItems(List.of(it));
        return g;
    }

    private GoodsReceiptNote plainGrn(String po, String challan, String qty) {
        GoodsReceiptNote g = gateGrn(po, null, qty);
        g.setVendorChallanNo(challan);
        return g;
    }

    private void requireGate(boolean on) {
        settings.save(Map.of("required", on));
    }

    private BigDecimal pendingGrn(long entryId) {
        return jdbc.queryForObject("SELECT SUM(accepted_qty - grn_posted_qty) FROM public.gate_entry_lines WHERE gate_entry_id = ?", BigDecimal.class, entryId);
    }

    private String poStatus(String po) {
        return jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, po);
    }

    private boolean inPendingList(long entryId) {
        return new GateGrnLink(jdbc, settings).pendingForGrn().stream().anyMatch(m -> ((Number) m.get("gateEntryId")).longValue() == entryId);
    }

    // ------------------------------------------------------------------ tests

    @Test
    void fullFlowWithPartialGrnsAndOnePercentTolerance() {
        String po = po("100");
        // 101 counted on a 100 PCS line: 1 % of 100 allows exactly 1 extra piece.
        long id = verified(po, "101", "101", "101", "0", "0");
        assertEquals("VERIFIED", queries.detail(id).get("stage"));
        assertTrue(inPendingList(id), "verified accepted quantity is pending GRN");

        requireGate(true);
        grnService.saveOrPostGoodsReceiptNote(gateGrn(po, id, "60"), true);
        assertEquals(0, new BigDecimal("41").compareTo(pendingGrn(id)));
        assertEquals("PARTIALLY RECEIVED", poStatus(po));
        // A second partial GRN from the same delivery (same challan) is allowed and completes the PO.
        GoodsReceiptNote second = grnService.saveOrPostGoodsReceiptNote(gateGrn(po, id, "41"), true);
        assertEquals(id, second.getGateEntryId());
        assertEquals(0, BigDecimal.ZERO.compareTo(pendingGrn(id)));
        assertEquals("COMPLETED", poStatus(po));
        assertFalse(inPendingList(id));
        // Nothing more can be received from this entry.
        assertThrows(IllegalArgumentException.class, () -> grnService.saveOrPostGoodsReceiptNote(gateGrn(po, id, "1"), true));
        assertEquals("COMPLETE", queries.detail(id).get("grnStatus"));
        gate.exit(id, null, ACTOR);
        assertEquals("EXITED", queries.detail(id).get("stage"));
        assertNotNull(queries.detail(id).get("exitAt"));
    }

    @Test
    void acceptingMoreThanPoPlusToleranceIsRefused() {
        String po = po("100");
        long id = draft(po, "105");
        gate.submit(id, ACTOR);
        gate.startUnloading(id, ACTOR);
        long line = lineId(id);
        gate.recordUnloading(id, new UnloadRequest(List.of(new UnloadLine(line, new BigDecimal("105"), null)), null), ACTOR);
        IllegalArgumentException over = assertThrows(IllegalArgumentException.class, () -> gate.verify(id,
                new VerifyRequest(List.of(new VerifyLine(line, new BigDecimal("102"), new BigDecimal("3"), BigDecimal.ZERO, "excess", null)), null), ACTOR));
        assertTrue(over.getMessage().contains("can still take"), over.getMessage());
        // The excess must go to Rejected or Hold: 101 accepted + 4 rejected is fine.
        gate.verify(id, new VerifyRequest(List.of(new VerifyLine(line, new BigDecimal("101"), new BigDecimal("4"), BigDecimal.ZERO, "excess", null)), null), ACTOR);
    }

    @Test
    void twoGateEntriesCannotTogetherAcceptMoreThanThePo() {
        String po = po("50");
        verified(po, "40", "40", "40", "0", "0");
        long second = draft(po, "20");
        gate.submit(second, ACTOR);
        gate.startUnloading(second, ACTOR);
        long line = lineId(second);
        gate.recordUnloading(second, new UnloadRequest(List.of(new UnloadLine(line, new BigDecimal("20"), null)), null), ACTOR);
        // 1 % of 50 PCS is 0.5, rounded down to 0: only 10 more can be accepted.
        assertThrows(IllegalArgumentException.class, () -> gate.verify(second,
                new VerifyRequest(List.of(new VerifyLine(line, new BigDecimal("11"), new BigDecimal("9"), BigDecimal.ZERO, "excess", null)), null), ACTOR));
        gate.verify(second, new VerifyRequest(List.of(new VerifyLine(line, new BigDecimal("10"), new BigDecimal("10"), BigDecimal.ZERO, "excess", null)), null), ACTOR);
    }

    @Test
    void draftAndUnverifiedEntriesAreNeverPendingForGrn() {
        String po = po("10");
        long draft = draft(po, "5");
        assertFalse(inPendingList(draft));
        gate.submit(draft, ACTOR);
        assertFalse(inPendingList(draft), "a vehicle inside but not verified gives nothing to GRN");
        requireGate(true);
        ConflictException notVerified = assertThrows(ConflictException.class, () -> grnService.saveOrPostGoodsReceiptNote(gateGrn(po, draft, "5"), true));
        assertTrue(notVerified.getMessage().contains("only after verification"), notVerified.getMessage());
    }

    @Test
    void unloadedMustEqualAcceptedPlusRejectedPlusHold() {
        String po = po("10");
        long id = draft(po, "10");
        gate.submit(id, ACTOR);
        gate.startUnloading(id, ACTOR);
        long line = lineId(id);
        gate.recordUnloading(id, new UnloadRequest(List.of(new UnloadLine(line, new BigDecimal("10"), null)), null), ACTOR);
        assertThrows(IllegalArgumentException.class, () -> gate.verify(id,
                new VerifyRequest(List.of(new VerifyLine(line, new BigDecimal("6"), new BigDecimal("2"), new BigDecimal("1"), "r", "h")), null), ACTOR));
        assertThrows(IllegalArgumentException.class, () -> gate.verify(id,
                new VerifyRequest(List.of(new VerifyLine(line, new BigDecimal("8"), new BigDecimal("2"), BigDecimal.ZERO, null, null)), null), ACTOR),
                "a rejected quantity needs a reason");
    }

    @Test
    void twoGrnsPostedAtOnceCannotReceiveMoreThanWasAccepted() throws Exception {
        String po = po("20");
        long id = verified(po, "20", "20", "20", "0", "0");
        requireGate(true);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<GoodsReceiptNote>> results = List.of(
                    pool.submit(() -> grnService.saveOrPostGoodsReceiptNote(gateGrn(po, id, "20"), true)),
                    pool.submit(() -> grnService.saveOrPostGoodsReceiptNote(gateGrn(po, id, "20"), true)));
            int ok = 0;
            for (Future<GoodsReceiptNote> f : results) {
                try { f.get(30, TimeUnit.SECONDS); ok++; } catch (ExecutionException ignored) { }
            }
            assertEquals(1, ok, "exactly one of the two GRNs may post");
        } finally {
            pool.shutdownNow();
        }
        assertEquals(0, new BigDecimal("20").compareTo(jdbc.queryForObject(
                "SELECT grn_posted_qty FROM public.gate_entry_lines WHERE gate_entry_id = ?", BigDecimal.class, id)));
    }

    @Test
    void gateRequiredRefusesAGrnWithoutGateEntryAndOldFlowStillWorksWhenOff() {
        String po = po("10");
        requireGate(true);
        ConflictException noGate = assertThrows(ConflictException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(plainGrn(po, "CH-NOGATE-" + TAG, "5"), true));
        assertTrue(noGate.getMessage().contains("gate"), noGate.getMessage());
        requireGate(false);
        grnService.saveOrPostGoodsReceiptNote(plainGrn(po, "CH-OLD-" + TAG, "5"), true);
        assertEquals("PARTIALLY RECEIVED", poStatus(po));
    }

    @Test
    void aVehicleCanBeInsideOnlyOnce() {
        String po = po("10");
        String truck = vehicle();
        long first = ((Number) gate.create(request(truck, VENDOR, "INV-V1-" + TAG, List.of(new LineRequest(po, ITEM, new BigDecimal("2"), null))), ACTOR).get("id")).longValue();
        entries.add(first);
        gate.submit(first, ACTOR);
        long second = ((Number) gate.create(request(truck.toLowerCase(Locale.ROOT).replace("hr", "hr-"), VENDOR, "INV-V2-" + TAG,
                List.of(new LineRequest(po, ITEM, new BigDecimal("2"), null))), ACTOR).get("id")).longValue();
        entries.add(second);
        assertThrows(ConflictException.class, () -> gate.submit(second, ACTOR), "same truck, written differently, is still the same truck");
        gate.turnBack(first, new ReasonRequest("wrong material"), ACTOR);
        gate.exit(first, null, ACTOR);
        gate.submit(second, ACTOR);
        assertEquals("GATE_IN", queries.detail(second).get("stage"));
    }

    @Test
    void submitChecksVendorInvoiceAndSecurity() {
        String po = po("10");
        long other = ((Number) gate.create(request(vehicle(), OTHER_VENDOR, "INV-OV-" + TAG, List.of(new LineRequest(po, ITEM, new BigDecimal("2"), null))), ACTOR).get("id")).longValue();
        entries.add(other);
        IllegalArgumentException vendor = assertThrows(IllegalArgumentException.class, () -> gate.submit(other, ACTOR));
        assertTrue(vendor.getMessage().contains("belongs to vendor"), vendor.getMessage());

        String invoice = "INV-DUP-" + TAG;
        long a = ((Number) gate.create(request(vehicle(), VENDOR, invoice, List.of(new LineRequest(po, ITEM, new BigDecimal("2"), null))), ACTOR).get("id")).longValue();
        entries.add(a);
        gate.submit(a, ACTOR);
        long b = ((Number) gate.create(request(vehicle(), VENDOR, invoice, List.of(new LineRequest(po, ITEM, new BigDecimal("2"), null))), ACTOR).get("id")).longValue();
        entries.add(b);
        assertThrows(ConflictException.class, () -> gate.submit(b, ACTOR), "the same vendor invoice cannot come in twice");

        EntryRequest noRemarks = new EntryRequest(null, null, vehicle(), null, null, null, null, VENDOR, false, "INV-SEC-" + TAG, TODAY, null, null,
                null, null, new SecurityChecks("YES", "NO", "YES", "YES", "YES", "YES", "YES"), null, null, null,
                List.of(new LineRequest(po, ITEM, new BigDecimal("2"), null)));
        long c = ((Number) gate.create(noRemarks, ACTOR).get("id")).longValue();
        entries.add(c);
        assertThrows(IllegalArgumentException.class, () -> gate.submit(c, ACTOR), "a No needs security remarks");
    }

    @Test
    void poCannotBeCancelledWhileItsMaterialIsAtTheGate() {
        String po = po("10");
        long id = draft(po, "10");
        gate.submit(id, ACTOR);
        assertThrows(ConflictException.class, () -> purchaseProcessing.cancelPurchaseOrder(po, ACTOR, "test"));
        gate.cancel(id, new ReasonRequest("entered by mistake"), ACTOR);
        purchaseProcessing.cancelPurchaseOrder(po, ACTOR, "test");
        assertEquals("CANCELLED", poStatus(po));
    }

    @Test
    void heldQuantityIsReleasedByQualityWithinThePoLimit() {
        String po = po("10");
        long id = verified(po, "10", "10", "6", "0", "4");
        long line = lineId(id);
        assertEquals(0, new BigDecimal("6").compareTo(pendingGrn(id)), "held quantity is not pending GRN");
        assertThrows(IllegalArgumentException.class, () -> gate.releaseHold(line, new ReleaseHoldRequest(new BigDecimal("5"), BigDecimal.ZERO, null), ACTOR));
        gate.releaseHold(line, new ReleaseHoldRequest(new BigDecimal("3"), new BigDecimal("1"), "1 cracked"), ACTOR);
        Map<String, Object> l = jdbc.queryForMap("SELECT accepted_qty, rejected_qty, hold_qty FROM public.gate_entry_lines WHERE id = ?", line);
        assertEquals(0, new BigDecimal("9").compareTo((BigDecimal) l.get("accepted_qty")));
        assertEquals(0, new BigDecimal("1").compareTo((BigDecimal) l.get("rejected_qty")));
        assertEquals(0, BigDecimal.ZERO.compareTo((BigDecimal) l.get("hold_qty")));
    }

    @Test
    void stagesMoveOnlyByTheirActions() {
        String po = po("10");
        long id = draft(po, "5");
        assertThrows(ConflictException.class, () -> gate.startUnloading(id, ACTOR), "a draft is not inside yet");
        assertThrows(ConflictException.class, () -> gate.exit(id, null, ACTOR));
        gate.submit(id, ACTOR);
        assertThrows(ConflictException.class, () -> gate.update(id, request(vehicle(), VENDOR, "X", List.of()), ACTOR), "a submitted entry cannot be edited");
        gate.startUnloading(id, ACTOR);
        assertThrows(ConflictException.class, () -> gate.cancel(id, new ReasonRequest("x"), ACTOR), "unloading has started");
        assertThrows(ConflictException.class, () -> gate.exit(id, null, ACTOR), "not verified yet");
        List<String> actions = new ArrayList<>();
        for (Object o : (List<?>) queries.detail(id).get("events")) actions.add(String.valueOf(((Map<?, ?>) o).get("action")));
        assertEquals(List.of("CREATED", "SUBMITTED", "UNLOADING_STARTED"), actions);
    }

    @Test
    void expectedArrivalsShowsTheOpenPoLineByDate() {
        String po = po("10");
        List<Map<String, Object>> rows = queries.expectedArrivalRows(null, po, null, null, false);
        assertEquals(1, rows.size());
        assertEquals(TODAY.plusDays(3).toString(), rows.get(0).get("expectedDate"));
        assertEquals("UPCOMING", rows.get(0).get("dueStatus"));
        assertEquals(0, new BigDecimal("10").compareTo((BigDecimal) rows.get(0).get("balanceQty")));
    }

    @Test
    void ceilingRoundsCountedUnitsDown() {
        assertEquals(0, new BigDecimal("101").compareTo(GateSettings.ceilingWithTolerance(new BigDecimal("100"), "PCS", BigDecimal.ONE)));
        assertEquals(0, new BigDecimal("50").compareTo(GateSettings.ceilingWithTolerance(new BigDecimal("50"), "PCS", BigDecimal.ONE)));
        assertEquals(0, new BigDecimal("50.50").compareTo(GateSettings.ceilingWithTolerance(new BigDecimal("50"), "KG", BigDecimal.ONE)));
    }
}
