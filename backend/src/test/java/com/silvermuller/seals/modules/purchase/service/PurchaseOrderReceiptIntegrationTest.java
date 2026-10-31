package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrder;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule;
import com.silvermuller.seals.modules.purchase.newpo.DeliveryLots;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Line;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Request;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * PO and GRN rules shared by every standard PO: receiving against cancelled POs, concurrent posting, GRN line checks,
 * draft GRNs, cancellation, reading POs without an in-memory copy, and delivery lots filled from posted GRNs.
 * Runs against an isolated database copy (set SMS_TEST_DATABASE_URL), never the live database.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(named = "SMS_TEST_DATABASE_URL", matches = ".+")
class PurchaseOrderReceiptIntegrationTest {

    private static final String VENDOR = "SUP-002";
    private static final String ITEM_A = "CON01-0001";
    private static final String ITEM_B = "CON01-0002";
    private static final LocalDate TODAY = LocalDate.now();
    private static final String TAG = "RC" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", () -> System.getenv("SMS_TEST_DATABASE_URL"));
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_USERNAME", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_PASSWORD", "postgres"));
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired DirectPoService direct;
    @Autowired VendorRateService rates;
    @Autowired PurchaseProcessingService purchaseProcessing;
    @Autowired GoodsReceiptNoteService grnService;
    @Autowired PlatformTransactionManager transactionManager;

    private final List<String> pos = new CopyOnWriteArrayList<>();
    private final List<Long> rateIds = new ArrayList<>();
    private int challans;

    @BeforeAll
    void rate() {
        for (long item : new long[] {1611L, 1612L}) {
            Map<String, Object> r = rates.create(
                    new VendorRateService.RateRequest(VENDOR, item, new BigDecimal("100"), LocalDate.of(1991, 1, 1)), "it-receipt");
            rateIds.add(((Number) r.get("id")).longValue());
        }
    }

    @AfterAll
    void cleanUp() {
        for (String po : pos) {
            jdbc.update("DELETE FROM public.grn_item_allocations WHERE grn_item_id IN (SELECT id FROM public.goods_receipt_note_items WHERE po_number = ?)", po);
            jdbc.update("DELETE FROM public.goods_receipt_note_items WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.goods_receipt_notes WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.purchase_order_payment_milestones WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.po_revisions WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.purchase_orders WHERE po_number = ?", po);
        }
        for (Long id : rateIds) jdbc.update("DELETE FROM public.vendor_item_rates WHERE id = ?", id);
    }

    // ------------------------------------------------------------------ fixtures

    private String po(String item, String qty, DeliveryLots.Lot... lots) {
        Request r = new Request(VENDOR, TODAY, TODAY.plusDays(30), List.of(new Line(item, new BigDecimal(qty))), "integration " + TAG,
                null, null, lots.length == 0 ? null : List.of(lots), "Invoice to", "Ship to", null, "REF-" + TAG, null, null, "receipt test");
        String poNumber = direct.create(r, "it-receipt").poNumber();
        pos.add(poNumber);
        return poNumber;
    }

    private static GoodsReceiptNoteItem line(String item, String accepted, String rejected) {
        GoodsReceiptNoteItem it = new GoodsReceiptNoteItem();
        it.setItemCode(item);
        it.setItemName("Test " + item);
        it.setUom("PCS");
        BigDecimal received = new BigDecimal(accepted).add(new BigDecimal(rejected));
        it.setChallanQty(received);
        it.setReceivedQty(received);
        it.setAcceptedQty(new BigDecimal(accepted));
        it.setRejectedQty(new BigDecimal(rejected));
        it.setPendingInspectionQty(BigDecimal.ZERO);
        it.setUnitRate(new BigDecimal("100"));
        return it;
    }

    private synchronized GoodsReceiptNote grn(String po, GoodsReceiptNoteItem... lines) {
        GoodsReceiptNote g = new GoodsReceiptNote();
        g.setPoNumber(po);
        g.setVendorCode(VENDOR);
        g.setVendorChallanNo("CH-" + TAG + "-" + (++challans));
        g.setStoreLocation("Main Store");
        g.setReceivedBy("it-receipt");
        g.setItems(new ArrayList<>(List.of(lines)));
        return g;
    }

    private GoodsReceiptNote post(String po, String item, String accepted) {
        return grnService.saveOrPostGoodsReceiptNote(grn(po, line(item, accepted, "0")), true);
    }

    private String status(String po) {
        return jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, po);
    }

    private int grnCount(String po) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM public.goods_receipt_notes WHERE po_number = ?", Integer.class, po);
    }

    private BigDecimal accepted(String po) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(gi.accepted_qty), 0) FROM public.goods_receipt_note_items gi "
                + "JOIN public.goods_receipt_notes g ON g.id = gi.grn_id WHERE g.status = 'POSTED' AND gi.po_number = ?", BigDecimal.class, po);
    }

    /** Lots of one item as "lot:received:status", in lot order. */
    private List<String> lots(String po, String item) {
        return jdbc.query("SELECT lot_number, received_qty, balance_qty, scheduled_qty, status FROM public.purchase_order_delivery_schedules "
                + "WHERE po_number = ? AND item_code = ? ORDER BY lot_number", (rs, n) -> {
                    assertEquals(0, rs.getBigDecimal("scheduled_qty").subtract(rs.getBigDecimal("received_qty")).compareTo(rs.getBigDecimal("balance_qty")),
                            "balance must be scheduled minus received");
                    return rs.getInt("lot_number") + ":" + rs.getBigDecimal("received_qty").stripTrailingZeros().toPlainString() + ":" + rs.getString("status");
                }, po, item);
    }

    private static PurchaseOrderDeliverySchedule lot(String item, LocalDate date, String qty) {
        PurchaseOrderDeliverySchedule s = new PurchaseOrderDeliverySchedule();
        s.setItemCode(item);
        s.setScheduledDate(date);
        s.setScheduledQty(new BigDecimal(qty));
        return s;
    }

    // ------------------------------------------------------------------ GRN against cancelled POs

    @Test
    void cancelledPoRefusesGrnPostingAndDraftsAndStaysCancelled() {
        String po = po(ITEM_A, "5");
        purchaseProcessing.cancelPurchaseOrder(po, "it-receipt", "not needed");

        ConflictException posted = assertThrows(ConflictException.class, () -> post(po, ITEM_A, "5"));
        assertTrue(posted.getMessage().contains("cancelled"), posted.getMessage());
        assertThrows(ConflictException.class, () -> grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "1", "0")), false));

        assertEquals("CANCELLED", status(po));
        assertEquals(0, grnCount(po));
    }

    @Test
    void grnForUnknownPoIsRefused() {
        GoodsReceiptNote g = grn("PO-NOT-THERE-" + TAG, line(ITEM_A, "1", "0"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> grnService.saveOrPostGoodsReceiptNote(g, true));
        assertTrue(ex.getMessage().contains("was not found"), ex.getMessage());
    }

    // ------------------------------------------------------------------ concurrent posting

    /**
     * Two saved drafts posted at the same time. A new GRN takes a GRN number, and that counter row stays locked until
     * commit, which happens to queue new GRNs; a draft keeps its number, so only the PO lock can stop this race.
     */
    @Test
    void twoDraftsPostedAtTheSameTimeCannotReceiveMoreThanThePoQuantity() throws Exception {
        String po = po(ITEM_A, "10");
        List<GoodsReceiptNote> drafts = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            GoodsReceiptNote saved = grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "10", "0")), false);
            GoodsReceiptNote toPost = grn(po, line(ITEM_A, "10", "0"));
            toPost.setId(saved.getId());
            toPost.setVendorChallanNo(saved.getVendorChallanNo());
            drafts.add(toPost);
        }
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Future<GoodsReceiptNote>> results = new ArrayList<>();
        try {
            // Hold the PO row so both postings are in flight together, then let them go at once.
            new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
                jdbc.queryForList("SELECT status FROM public.purchase_orders WHERE po_number = ? FOR UPDATE", po);
                for (GoodsReceiptNote d : drafts) {
                    results.add(pool.submit(() -> grnService.saveOrPostGoodsReceiptNote(d, true)));
                }
                waitUntilBlockedOnLocks(2);
            });
            int succeeded = 0;
            List<Throwable> failures = new ArrayList<>();
            for (Future<GoodsReceiptNote> f : results) {
                try {
                    f.get(30, TimeUnit.SECONDS);
                    succeeded++;
                } catch (ExecutionException e) {
                    failures.add(e.getCause());
                }
            }
            assertEquals(1, succeeded, "exactly one of the two GRNs may post");
            assertEquals(1, failures.size());
            assertInstanceOf(IllegalArgumentException.class, failures.get(0));
            assertTrue(failures.get(0).getMessage().contains("exceeds the PO outstanding balance"), failures.get(0).getMessage());
            assertEquals(0, new BigDecimal("10").compareTo(accepted(po)));
            assertEquals("COMPLETED", status(po));
        } finally {
            pool.shutdownNow();
        }
    }

    private void waitUntilBlockedOnLocks(int sessions) {
        long deadline = System.currentTimeMillis() + 15_000;
        while (System.currentTimeMillis() < deadline) {
            Integer waiting = jdbc.queryForObject("SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() "
                    + "AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()", Integer.class);
            if (waiting != null && waiting >= sessions) return;
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        fail("The two GRN postings never both waited on the PO lock.");
    }

    // ------------------------------------------------------------------ GRN line checks

    @Test
    void theSameItemOnTwoLinesIsRefusedSoItCannotDoubleTheReceipt() {
        String po = po(ITEM_A, "10");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> grnService.saveOrPostGoodsReceiptNote(
                grn(po, line(ITEM_A, "10", "0"), line(ITEM_A, "10", "0")), true));
        assertTrue(ex.getMessage().contains("more than one GRN line"), ex.getMessage());
        assertEquals(0, grnCount(po));
        assertEquals("APPROVED", status(po));
    }

    @Test
    void negativeQuantitiesAreRefusedOnEveryQuantityField() {
        String po = po(ITEM_A, "10");
        post(po, ITEM_A, "4");
        for (int field = 0; field < 5; field++) {
            GoodsReceiptNoteItem it = line(ITEM_A, "1", "0");
            BigDecimal minus = new BigDecimal("-1");
            switch (field) {
                case 0 -> it.setChallanQty(minus);
                case 1 -> it.setReceivedQty(minus);
                case 2 -> it.setAcceptedQty(minus);
                case 3 -> it.setRejectedQty(minus);
                default -> it.setPendingInspectionQty(minus);
            }
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> grnService.saveOrPostGoodsReceiptNote(grn(po, it), true), "field " + field);
            assertTrue(ex.getMessage().contains("cannot be negative"), ex.getMessage());
        }
        // A negative accepted quantity would have lowered the received total and reopened the PO.
        assertEquals(0, new BigDecimal("4").compareTo(accepted(po)));
        assertEquals(1, grnCount(po));
    }

    @Test
    void aGrnThatReceivesNothingCannotBePostedButCanBeSavedAsDraft() {
        String po = po(ITEM_A, "10");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "0", "0")), true));
        assertTrue(ex.getMessage().contains("Nothing was received"), ex.getMessage());

        GoodsReceiptNote draft = grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "0", "0")), false);
        assertEquals("DRAFT", draft.getStatus());
    }

    @Test
    void aFullyRejectedDeliveryPostsButDoesNotMoveThePo() {
        String po = po(ITEM_A, "10");
        grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "0", "3")), true);
        assertEquals("APPROVED", status(po));
        assertEquals(0, BigDecimal.ZERO.compareTo(accepted(po)));
    }

    @Test
    void theGrnHeaderTakesVendorAndPoFactsFromThePoNotFromTheClient() {
        String po = po(ITEM_A, "10");
        GoodsReceiptNote g = grn(po, line(ITEM_A, "1", "0"));
        g.setVendorCode("SUP-FAKE");
        g.setVendorName("Someone Else");
        g.setVendorGstin("27FAKE0000F1Z5");
        g.setPoDate("1999-01-01");
        g.setPrNumber("PR-FAKE");
        long id = grnService.saveOrPostGoodsReceiptNote(g, true).getId();

        Map<String, Object> stored = jdbc.queryForMap("SELECT po_date, pr_number, vendor_code, vendor_name, vendor_gstin FROM public.goods_receipt_notes WHERE id = ?", id);
        Map<String, Object> onPo = jdbc.queryForMap("SELECT po_date, pr_number, vendor_code, vendor_name, vendor_gstin FROM public.purchase_orders WHERE po_number = ?", po);
        assertEquals(onPo, stored);
        assertEquals(VENDOR, stored.get("vendor_code"));
    }

    @Test
    void anItemThatIsNotOnThePoIsRefused() {
        String po = po(ITEM_A, "10");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> post(po, ITEM_B, "1"));
        assertTrue(ex.getMessage().contains("is not on PO"), ex.getMessage());
    }

    @Test
    void theDatabaseItselfRefusesNegativeQuantitiesAndRepeatedItems() {
        String po = po(ITEM_A, "10");
        long grnId = post(po, ITEM_A, "2").getId();
        assertViolates("ck_grn_items_qty_non_negative", () -> jdbc.update(
                "UPDATE public.goods_receipt_note_items SET accepted_qty = -1 WHERE grn_id = ?", grnId));
        assertViolates("uq_grn_items_grn_item", () -> jdbc.update(
                "INSERT INTO public.goods_receipt_note_items (grn_id, grn_number, po_number, item_code, item_name) "
                        + "SELECT grn_id, grn_number, po_number, item_code, item_name FROM public.goods_receipt_note_items WHERE grn_id = ?", grnId));
    }

    /** The statement must be refused by exactly this constraint, not by some other rule. */
    private static void assertViolates(String constraint, org.junit.jupiter.api.function.Executable statement) {
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class, statement);
        assertTrue(ex.getMessage().contains(constraint), ex.getMessage());
    }

    // ------------------------------------------------------------------ draft GRNs

    @Test
    void aDraftKeepsItsNumberAndCanBePostedLater() {
        String po = po(ITEM_A, "10");
        GoodsReceiptNote draft = grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "3", "0")), false);
        GoodsReceiptNote again = grn(po, line(ITEM_A, "6", "0"));
        again.setId(draft.getId());
        again.setGrnNumber("GRN-TYPED-BY-CLIENT");
        GoodsReceiptNote posted = grnService.saveOrPostGoodsReceiptNote(again, true);

        assertEquals(draft.getGrnNumber(), posted.getGrnNumber());
        assertEquals("POSTED", posted.getStatus());
        assertEquals(1, posted.getItems().size());
        assertEquals(0, new BigDecimal("6").compareTo(accepted(po)));
        assertEquals("PARTIALLY RECEIVED", status(po));
    }

    @Test
    void aDraftCannotBeMovedToAnotherPo() {
        String poA = po(ITEM_A, "10");
        String poB = po(ITEM_A, "10");
        GoodsReceiptNote draft = grnService.saveOrPostGoodsReceiptNote(grn(poA, line(ITEM_A, "3", "0")), false);

        GoodsReceiptNote moved = grn(poB, line(ITEM_A, "3", "0"));
        moved.setId(draft.getId());
        ConflictException ex = assertThrows(ConflictException.class, () -> grnService.saveOrPostGoodsReceiptNote(moved, true));
        assertTrue(ex.getMessage().contains("belongs to PO " + poA), ex.getMessage());

        assertEquals(poA, jdbc.queryForObject("SELECT po_number FROM public.goods_receipt_notes WHERE id = ?", String.class, draft.getId()));
        assertEquals(List.of(poA), jdbc.queryForList("SELECT DISTINCT po_number FROM public.goods_receipt_note_items WHERE grn_id = ?", String.class, draft.getId()));
        assertEquals(0, grnCount(poB));
    }

    @Test
    void aPostedGrnCannotBeChangedAndAnUnknownGrnIdIsRefused() {
        String po = po(ITEM_A, "10");
        GoodsReceiptNote posted = post(po, ITEM_A, "2");
        GoodsReceiptNote edit = grn(po, line(ITEM_A, "1", "0"));
        edit.setId(posted.getId());
        assertThrows(ConflictException.class, () -> grnService.saveOrPostGoodsReceiptNote(edit, false));

        GoodsReceiptNote ghost = grn(po, line(ITEM_A, "1", "0"));
        ghost.setId(-1L);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> grnService.saveOrPostGoodsReceiptNote(ghost, false));
        assertTrue(ex.getMessage().contains("was not found"), ex.getMessage());
    }

    // ------------------------------------------------------------------ cancellation

    @Test
    void cancelWritesTheDatabaseOnceAndRefusesASecondCancel() {
        String po = po(ITEM_A, "3");
        PurchaseOrder cancelled = purchaseProcessing.cancelPurchaseOrder(po, "it-receipt", "duplicate order");
        assertEquals("CANCELLED", cancelled.getStatus());
        assertEquals("CANCELLED", status(po));
        String remarks = jdbc.queryForObject("SELECT remarks FROM public.purchase_orders WHERE po_number = ?", String.class, po);
        assertTrue(remarks.endsWith("Cancelled by it-receipt: duplicate order"), remarks);

        assertThrows(IllegalArgumentException.class, () -> purchaseProcessing.cancelPurchaseOrder(po, "it-receipt", "again"));
        assertEquals(remarks, jdbc.queryForObject("SELECT remarks FROM public.purchase_orders WHERE po_number = ?", String.class, po),
                "a refused cancel must not append to the remarks");
        assertThrows(IllegalArgumentException.class, () -> purchaseProcessing.cancelPurchaseOrder("PO-NOT-THERE-" + TAG, "it-receipt", null));
    }

    @Test
    void cancelWaitsForAGrnBeingPostedAndIsThenRefused() throws Exception {
        String po = po(ITEM_A, "5");
        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            List<Future<?>> cancel = new ArrayList<>();
            new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
                // The GRN joins this transaction, so the PO stays locked until it commits; the cancel has to wait.
                post(po, ITEM_A, "1");
                cancel.add(pool.submit(() -> purchaseProcessing.cancelPurchaseOrder(po, "it-receipt", "racing")));
                waitUntilBlockedOnLocks(1);
            });
            ExecutionException ex = assertThrows(ExecutionException.class, () -> cancel.get(0).get(30, TimeUnit.SECONDS));
            assertInstanceOf(ConflictException.class, ex.getCause());
            assertEquals("PARTIALLY RECEIVED", status(po));
        } finally {
            pool.shutdownNow();
        }
    }

    // ------------------------------------------------------------------ reading POs (no in-memory copy)

    @Test
    void posAreReadFreshFromTheDatabaseByNumberIdOrAnyCase() {
        String po = po(ITEM_A, "2");
        jdbc.update("UPDATE public.purchase_orders SET remarks = ? WHERE po_number = ?", "changed outside the service " + TAG, po);

        PurchaseOrder byNumber = purchaseProcessing.getPurchaseOrder(po).orElseThrow();
        assertEquals("changed outside the service " + TAG, byNumber.getRemarks(), "no stale copy may be served");
        assertEquals(po, purchaseProcessing.getPurchaseOrder(byNumber.getId()).orElseThrow().getPoNumber());
        assertEquals(po, purchaseProcessing.getPurchaseOrder(po.toLowerCase()).orElseThrow().getPoNumber());
        assertEquals(1, byNumber.getItems().size());
        assertNotNull(byNumber.getDeliverySchedules());

        assertTrue(purchaseProcessing.getPurchaseOrder(null).isEmpty());
        assertTrue(purchaseProcessing.getPurchaseOrder("PO-NOT-THERE-" + TAG).isEmpty());

        List<PurchaseOrder> all = purchaseProcessing.getAllPurchaseOrders();
        assertTrue(all.stream().anyMatch(p -> po.equals(p.getPoNumber())));
        for (int i = 1; i < all.size(); i++) {
            assertTrue(all.get(i - 1).getPoNumber().compareTo(all.get(i).getPoNumber()) > 0, "newest first, no duplicates");
        }
    }

    @Test
    void pendingReceiptListAndGrnListUseTheRightTotalsAndLines() {
        String po = po(ITEM_A, "10");
        post(po, ITEM_A, "4");
        grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "5", "0")), false); // a draft does not count

        Map<String, Object> pending = grnService.getPendingPurchaseOrdersForReceipt().stream()
                .filter(p -> po.equals(p.get("poNumber"))).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("4").compareTo((BigDecimal) pending.get("totalReceivedQty")));
        assertEquals(0, new BigDecimal("6").compareTo((BigDecimal) pending.get("totalBalanceQty")));

        List<GoodsReceiptNote> grns = grnService.getGoodsReceiptNotesByPoNumber(po);
        assertEquals(2, grns.size());
        for (GoodsReceiptNote g : grns) {
            assertEquals(1, g.getItems().size());
            assertEquals(g.getId(), g.getItems().get(0).getGrnId());
        }
        GoodsReceiptNote fromAll = grnService.getAllGoodsReceiptNotes().stream()
                .filter(g -> g.getId().equals(grns.get(0).getId())).findFirst().orElseThrow();
        assertEquals(grns.get(0).getItems().get(0).getId(), fromAll.getItems().get(0).getId());

        purchaseProcessing.cancelPurchaseOrder(po(ITEM_A, "1"), "it-receipt", "hidden from pending");
        assertTrue(grnService.getPendingPurchaseOrdersForReceipt().stream().noneMatch(p -> "CANCELLED".equals(p.get("status"))));
    }

    // ------------------------------------------------------------------ delivery lots

    @Test
    void postedGrnsFillDeliveryLotsInLotOrder() {
        String po = po(ITEM_A, "10",
                new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(5), new BigDecimal("4")),
                new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(10), new BigDecimal("6")));
        assertEquals(List.of("1:0:SCHEDULED", "2:0:SCHEDULED"), lots(po, ITEM_A));

        post(po, ITEM_A, "5");
        assertEquals(List.of("1:4:COMPLETED", "2:1:PARTIALLY_RECEIVED"), lots(po, ITEM_A));

        grnService.saveOrPostGoodsReceiptNote(grn(po, line(ITEM_A, "0", "2")), true); // rejected goods fill nothing
        assertEquals(List.of("1:4:COMPLETED", "2:1:PARTIALLY_RECEIVED"), lots(po, ITEM_A));

        post(po, ITEM_A, "5");
        assertEquals(List.of("1:4:COMPLETED", "2:6:COMPLETED"), lots(po, ITEM_A));
    }

    @Test
    void savingLotsIgnoresReceivedQuantitiesSentByTheClientAndRenumbersByDate() {
        String po = po(ITEM_A, "10");
        post(po, ITEM_A, "3");
        PurchaseOrderDeliverySchedule late = lot(ITEM_A, TODAY.plusDays(9), "5");
        late.setLotNumber(7);
        late.setReceivedQty(new BigDecimal("999"));
        late.setStatus("COMPLETED");
        PurchaseOrderDeliverySchedule early = lot(ITEM_A, TODAY.plusDays(2), "5");
        early.setLotNumber(7);
        early.setDestinationStore("Store 2");

        purchaseProcessing.saveDeliverySchedules(po, List.of(late, early));

        assertEquals(List.of("1:3:PARTIALLY_RECEIVED", "2:0:SCHEDULED"), lots(po, ITEM_A));
        assertEquals("Store 2", jdbc.queryForObject("SELECT destination_store FROM public.purchase_order_delivery_schedules "
                + "WHERE po_number = ? AND lot_number = 1", String.class, po));
    }

    @Test
    void invalidLotsAreRefusedAndTheOldScheduleIsKept() {
        String po = po(ITEM_A, "10", new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(3), new BigDecimal("10")));
        post(po, ITEM_A, "6");
        List<String> before = lots(po, ITEM_A);

        assertThrows(IllegalArgumentException.class, () -> purchaseProcessing.saveDeliverySchedules(po,
                List.of(lot(ITEM_A, TODAY.plusDays(3), "5"))), "lots below what was already received");
        assertThrows(NewPoException.class, () -> purchaseProcessing.saveDeliverySchedules(po,
                List.of(lot(ITEM_A, TODAY.plusDays(3), "8"), lot(ITEM_A, TODAY.plusDays(4), "3"))), "lots above the PO quantity");
        assertThrows(NewPoException.class, () -> purchaseProcessing.saveDeliverySchedules(po,
                List.of(lot(ITEM_A, TODAY.plusDays(3), "10"), lot(ITEM_B, TODAY.plusDays(3), "1"))), "item not on the PO");
        assertThrows(NewPoException.class, () -> purchaseProcessing.saveDeliverySchedules(po,
                List.of(lot(ITEM_A, TODAY.plusDays(3), "0"))), "zero quantity");
        assertThrows(NewPoException.class, () -> purchaseProcessing.saveDeliverySchedules(po,
                List.of(lot(ITEM_A, TODAY.minusDays(1), "10"))), "date before the PO date");
        assertThrows(NewPoException.class, () -> purchaseProcessing.saveDeliverySchedules(po,
                List.of(lot(ITEM_A, null, "10"))), "no date");
        assertThrows(NewPoException.class, () -> purchaseProcessing.saveDeliverySchedules(po,
                Arrays.asList(lot(ITEM_A, TODAY.plusDays(3), "10"), null)), "empty lot");

        assertEquals(before, lots(po, ITEM_A));
    }

    @Test
    void lotsCannotBeChangedOnCancelledCompletedOrUnknownPos() {
        String cancelled = po(ITEM_A, "2");
        purchaseProcessing.cancelPurchaseOrder(cancelled, "it-receipt", "not needed");
        assertThrows(ConflictException.class, () -> purchaseProcessing.saveDeliverySchedules(cancelled, List.of(lot(ITEM_A, TODAY, "2"))));

        String completed = po(ITEM_A, "2");
        post(completed, ITEM_A, "2");
        assertThrows(ConflictException.class, () -> purchaseProcessing.saveDeliverySchedules(completed, List.of(lot(ITEM_A, TODAY, "2"))));

        assertThrows(ResourceNotFoundException.class,
                () -> purchaseProcessing.saveDeliverySchedules("PO-NOT-THERE-" + TAG, List.of(lot(ITEM_A, TODAY, "2"))));
    }

    @Test
    void anEmptyScheduleClearsTheLots() {
        String po = po(ITEM_A, "4", new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(1), new BigDecimal("4")));
        purchaseProcessing.saveDeliverySchedules(po, List.of());
        assertEquals(List.of(), lots(po, ITEM_A));
        purchaseProcessing.saveDeliverySchedules(po, null);
        assertEquals(List.of(), lots(po, ITEM_A));
    }

    @Test
    void aMilestoneLinkedToALotBecomesDueOnceThatLotReceivesGoods() {
        String po = po(ITEM_A, "10",
                new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(1), new BigDecimal("5")),
                new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(2), new BigDecimal("5")));
        String insert = "INSERT INTO public.purchase_order_payment_milestones (po_number, milestone_sequence, milestone_title, "
                + "trigger_event, linked_lot_number, milestone_amount, payment_status) VALUES (?, ?, ?, 'On Lot Delivery', ?, 100, 'PENDING')";
        jdbc.update(insert, po, 1, "Lot 1", 1);
        jdbc.update(insert, po, 2, "Lot 2", 2);

        post(po, ITEM_A, "2");
        assertEquals(List.of("DUE", "PENDING"), jdbc.queryForList("SELECT payment_status FROM public.purchase_order_payment_milestones "
                + "WHERE po_number = ? ORDER BY milestone_sequence", String.class, po));
    }

    @Test
    void recomputingLotsTwiceChangesNothing() {
        String po = po(ITEM_A, "10", new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(1), new BigDecimal("10")));
        post(po, ITEM_A, "3");
        Timestamp stamp = jdbc.queryForObject("SELECT updated_at FROM public.purchase_order_delivery_schedules WHERE po_number = ?", Timestamp.class, po);
        purchaseProcessing.syncScheduleReceipts(po);
        purchaseProcessing.syncScheduleReceipts(po);
        assertEquals(stamp, jdbc.queryForObject("SELECT updated_at FROM public.purchase_order_delivery_schedules WHERE po_number = ?", Timestamp.class, po),
                "a lot that already matches its GRNs is not rewritten");
        assertEquals(List.of("1:3:PARTIALLY_RECEIVED"), lots(po, ITEM_A));
    }

    @Test
    void theDatabaseRefusesALotReceivingMoreThanScheduledOrARepeatedLotNumber() {
        String po = po(ITEM_A, "10", new DeliveryLots.Lot(ITEM_A, TODAY.plusDays(1), new BigDecimal("4")));
        assertViolates("ck_po_sched_qty", () -> jdbc.update(
                "UPDATE public.purchase_order_delivery_schedules SET received_qty = 5 WHERE po_number = ?", po));
        assertViolates("uq_po_sched_lot", () -> jdbc.update(
                "INSERT INTO public.purchase_order_delivery_schedules (po_number, item_code, lot_number, scheduled_date, scheduled_qty, balance_qty) "
                        + "VALUES (?, ?, 1, CURRENT_DATE, 1, 1)", po, ITEM_A));
    }
}
