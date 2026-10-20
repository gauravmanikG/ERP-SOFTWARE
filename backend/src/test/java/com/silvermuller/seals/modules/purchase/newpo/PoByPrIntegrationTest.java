package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import com.silvermuller.seals.modules.purchase.model.PurchaseRequisition;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatePoRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatedPo;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.LineRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PrLineStatus;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import com.silvermuller.seals.modules.purchase.service.GoodsReceiptNoteService;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
import com.silvermuller.seals.modules.purchase.service.PurchaseRequisitionService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import com.silvermuller.seals.modules.purchase.newpo.ProcurementMigrations;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;

/**
 * PO by PR against a real PostgreSQL database.
 *
 * Runs only when SMS_TEST_DATABASE_URL is set (for example jdbc:postgresql://localhost:5434/sms_seals_test).
 * Point it at a COPY of the ERP database, never at the live one: the tests create purchase requisitions,
 * vendor rates, POs and GRNs, and remove the rows they created when they finish.
 * SMS_TEST_DATABASE_USERNAME / SMS_TEST_DATABASE_PASSWORD default to postgres / postgres.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(named = "SMS_TEST_DATABASE_URL", matches = ".+")
class PoByPrIntegrationTest {

    private static final String VENDOR = "SUP-002";
    private static final long ITEM_CON01_0001 = 1611L;   // price 100 from the test rate
    private static final long ITEM_CON01_0002 = 1612L;   // price 100 from the test rate
    private static final String CODE_1 = "CON01-0001";
    private static final String CODE_2 = "CON01-0002";
    private static final LocalDate POS_DATE = LocalDate.of(2026, 10, 19);
    private static final String TAG = "IT" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", () -> System.getenv("SMS_TEST_DATABASE_URL"));
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_USERNAME", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("SMS_TEST_DATABASE_PASSWORD", "postgres"));
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired PoByPrService poByPr;
    @Autowired PurchaseRequisitionService prService;
    @Autowired PurchaseProcessingService purchaseProcessing;
    @Autowired GoodsReceiptNoteService grnService;
    @Autowired VendorRateService rates;
    @SpyBean PurchaseRequisitionService spiedPrService;

    private static final List<Long> RATE_IDS = Collections.synchronizedList(new ArrayList<>());
    private static final List<String> PR_NUMBERS = Collections.synchronizedList(new ArrayList<>());
    private static final List<String> PO_NUMBERS = Collections.synchronizedList(new ArrayList<>());
    private static final AtomicCounter COUNTER = new AtomicCounter();

    /** A PR created for one test: its number and the ids of its two items. */
    private record Pr(String number, long line1, long line2) {}

    @BeforeAll
    void rateForTheTests() {
        // Effective long before the test date, so every test prices against it. Removed in @AfterAll.
        for (long item : new long[] {ITEM_CON01_0001, ITEM_CON01_0002}) {
            Map<String, Object> rate = rates.create(
                    new VendorRateService.RateRequest(VENDOR, item, new BigDecimal("100"), LocalDate.of(1990, 1, 1)), "it-test");
            RATE_IDS.add(((Number) rate.get("id")).longValue());
        }
    }

    @AfterAll
    void cleanUp() {
        for (String po : PO_NUMBERS) {
            jdbc.update("DELETE FROM public.grn_item_allocations WHERE grn_item_id IN (SELECT id FROM public.goods_receipt_note_items WHERE po_number = ?)", po);
            jdbc.update("DELETE FROM public.goods_receipt_note_items WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.goods_receipt_notes WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.po_pr_allocations WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.purchase_orders WHERE po_number = ?", po);
        }
        for (String pr : PR_NUMBERS) {
            jdbc.update("DELETE FROM public.po_pr_allocations WHERE pr_number = ?", pr);
            jdbc.update("DELETE FROM public.purchase_requisition_items WHERE pr_number = ?", pr);
            jdbc.update("DELETE FROM public.purchase_requisitions WHERE pr_number = ?", pr);
        }
        for (String batch : CLUB_BATCHES) {
            jdbc.update("DELETE FROM public.pr_clubbing_allocations WHERE batch_id IN (SELECT id FROM public.pr_clubbing_batches WHERE batch_number = ?)", batch);
            jdbc.update("DELETE FROM public.pr_clubbing_batch_items WHERE batch_number = ?", batch);
            jdbc.update("DELETE FROM public.pr_clubbing_batches WHERE batch_number = ?", batch);
        }
        for (Long id : RATE_IDS) {
            jdbc.update("DELETE FROM public.vendor_item_rates WHERE id = ?", id);
        }
    }

    // ------------------------------------------------------------------ fixtures

    /** Creates an approved PR with two lines (50 of CON01-0001, 30 of CON01-0002). */
    private Pr newPr(String suffix) {
        String number = "PR-" + TAG + "-" + suffix + "-" + COUNTER.next();
        Long prId = jdbc.queryForObject(
                "INSERT INTO public.purchase_requisitions (pr_number, pr_date, status, requisitioner, department, created_by) " +
                "VALUES (?, ?, 'Approved', 'it-test', 'IT', 'it-test') RETURNING id", Long.class, number, java.sql.Date.valueOf(POS_DATE));
        long l1 = insertLine(prId, number, CODE_1, new BigDecimal("50"));
        long l2 = insertLine(prId, number, CODE_2, new BigDecimal("30"));
        PR_NUMBERS.add(number);
        return new Pr(number, l1, l2);
    }

    private long insertLine(long prId, String prNumber, String code, BigDecimal qty) {
        return jdbc.queryForObject(
                "INSERT INTO public.purchase_requisition_items (pr_id, pr_number, item_code, item_name, uom, req_qty, ordered_qty, remaining_qty, hsn_code, category) " +
                "VALUES (?, ?, ?, ?, 'PCS', ?, 0, ?, '84669390', 'FG') RETURNING id",
                Long.class, prId, prNumber, code, "Test " + code, qty, qty);
    }

    private CreatePoRequest request(String mode, LineRequest... lines) {
        return new CreatePoRequest(VENDOR, POS_DATE, mode, List.of(lines), "integration test");
    }

    private BigDecimal ordered(long prItemId) {
        return jdbc.queryForObject("SELECT ordered_qty FROM public.purchase_requisition_items WHERE id = ?", BigDecimal.class, prItemId);
    }

    private String prStatus(String prNumber) {
        return jdbc.queryForObject("SELECT status FROM public.purchase_requisitions WHERE pr_number = ?", String.class, prNumber);
    }

    private CreatedPo create(CreatePoRequest r) {
        CreatedPo po = poByPr.create(r, "it-test");
        PO_NUMBERS.add(po.poNumber());
        return po;
    }

    // ------------------------------------------------------------------ allocation and reservation

    @Test
    void fullOrderReservesEveryLineAndWritesHeaderAndAllocations() {
        Pr pr = newPr("FULL");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null), new LineRequest(pr.line2(), null)));

        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
        assertEquals(0, new BigDecimal("30").compareTo(ordered(pr.line2())));
        assertEquals("Fully Ordered", prStatus(pr.number()));

        assertEquals("APPROVED", jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, po.poNumber()));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ?", Integer.class, po.poNumber()));
        assertEquals(2, jdbc.queryForObject("SELECT json_array_length(details_json::json) FROM public.purchase_orders WHERE po_number = ?", Integer.class, po.poNumber()));
    }

    @Test
    void overOrderingIsRefusedAndWritesNothing() {
        Pr pr = newPr("OVER");
        NewPoException ex = assertThrows(NewPoException.class,
                () -> poByPr.create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("51"))), "it-test"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(ordered(pr.line1())));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE pr_number = ?", Integer.class, pr.number()));
    }

    @Test
    void repeatOrdersOnOneLineCannotExceedTheRemainingQuantity() {
        Pr pr = newPr("REPEAT");
        create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("30"))));
        create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("20"))));

        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
        assertThrows(NewPoException.class,
                () -> poByPr.create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("0.01"))), "it-test"));
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    // ------------------------------------------------------------------ transaction rollback

    @Test
    void failureAfterTheWritesRollsBackPoAllocationsAndPrQuantity() {
        Pr pr = newPr("ROLLBACK");
        String actor = "it-rollback-" + COUNTER.next();
        doThrow(new IllegalStateException("simulated failure after writes")).when(spiedPrService).recalculatePrStatus(anyString());

        assertThrows(IllegalStateException.class,
                () -> poByPr.create(request("FULL", new LineRequest(pr.line1(), null)), actor));

        assertEquals(0, BigDecimal.ZERO.compareTo(ordered(pr.line1())), "ordered quantity must roll back");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE pr_number = ?", Integer.class, pr.number()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_orders WHERE approved_by = ?", Integer.class, actor),
                "no PO header may remain from the rolled-back attempt");
        assertEquals("Approved", prStatus(pr.number()));
    }

    // ------------------------------------------------------------------ concurrency

    @Test
    void parallelOrdersOfTheSameLineNeverOrderMoreThanTheRequestedQuantity() throws Exception {
        Pr pr = newPr("RACE");
        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            results.add(pool.submit(() -> {
                start.await();
                try {
                    CreatedPo po = poByPr.create(request("FULL", new LineRequest(pr.line1(), null)), "it-race");
                    PO_NUMBERS.add(po.poNumber());
                    return 201;
                } catch (NewPoException ex) {
                    return ex.getStatus().value();
                }
            }));
        }
        start.countDown();
        int created = 0, refused = 0;
        for (Future<Integer> f : results) {
            int code = f.get(60, TimeUnit.SECONDS);
            if (code == 201) created++;
            else if (code == HttpStatus.CONFLICT.value()) refused++;
        }
        pool.shutdown();

        assertEquals(1, created, "exactly one order may take the 50 units");
        assertEquals(threads - 1, refused);
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    // ------------------------------------------------------------------ legacy quantity and legacy POs

    @Test
    void quantityOrderedOutsidePoByPrCountsAgainstRemainingAndIsReportedSeparately() {
        Pr pr = newPr("LEGACY");
        // Simulates a legacy workflow (no allocation row) having ordered 20 of line 2.
        jdbc.update("UPDATE public.purchase_requisition_items SET ordered_qty = 20, remaining_qty = 10 WHERE id = ?", pr.line2());

        create(request("FULL", new LineRequest(pr.line1(), null)));
        assertThrows(NewPoException.class,
                () -> poByPr.create(request("PARTIAL", new LineRequest(pr.line2(), new BigDecimal("11"))), "it-test"),
                "legacy ordered quantity must not be ordered again");
        create(request("PARTIAL", new LineRequest(pr.line2(), new BigDecimal("10"))));

        PrLineStatus line2 = poByPr.prLineStatuses(pr.number()).stream()
                .filter(s -> s.prItemId() == pr.line2()).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("30").compareTo(line2.orderedQty()));
        assertEquals(0, new BigDecimal("10").compareTo(line2.orderedThroughPoByPrQty()));
        assertEquals(0, new BigDecimal("20").compareTo(line2.orderedOutsidePoByPrQty()));
        assertEquals(0, BigDecimal.ZERO.compareTo(line2.remainingToOrderQty()));
    }

    @Test
    void existingPoWithoutAllocationsIsIdentifiedAsLegacy() {
        String legacyPo = jdbc.queryForObject(
                "SELECT p.po_number FROM public.purchase_orders p WHERE NOT EXISTS " +
                "(SELECT 1 FROM public.po_pr_allocations a WHERE a.po_number = p.po_number) ORDER BY p.created_at LIMIT 1", String.class);
        assertNotNull(legacyPo, "the test database must contain at least one legacy PO");

        Map<String, Object> detail = poByPr.poDetail(legacyPo);
        assertEquals("LEGACY", detail.get("origin"));
        assertEquals(List.of(), detail.get("allocations"));
    }

    // ------------------------------------------------------------------ GRN persistence

    @Test
    void postedGrnPersistsPoStatusAndReceiptsAreAttributedToThePrLine() {
        Pr pr = newPr("GRN");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));

        GoodsReceiptNote grn = new GoodsReceiptNote();
        grn.setPoNumber(po.poNumber());
        grn.setVendorCode(VENDOR);
        grn.setVendorName("A.V.SALES CORPORATION");
        grn.setVendorChallanNo("CH-" + TAG);
        grn.setStoreLocation("Main Store");
        grn.setReceivedBy("it-test");
        GoodsReceiptNoteItem it = new GoodsReceiptNoteItem();
        it.setItemCode(CODE_1);
        it.setItemName("Test " + CODE_1);
        it.setUom("PCS");
        it.setPoOrderedQty(new BigDecimal("50"));
        it.setChallanQty(new BigDecimal("50"));
        it.setReceivedQty(new BigDecimal("50"));
        it.setAcceptedQty(new BigDecimal("50"));
        it.setRejectedQty(BigDecimal.ZERO);
        it.setPendingInspectionQty(BigDecimal.ZERO);
        it.setUnitRate(new BigDecimal("100"));
        it.setTaxPercent(new BigDecimal("18"));
        grn.setItems(List.of(it));

        grnService.saveOrPostGoodsReceiptNote(grn, true);

        // The database is the record of the status ...
        assertEquals("COMPLETED", jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, po.poNumber()));
        // ... and the in-memory copy used by the PO screen follows it after commit.
        assertEquals("COMPLETED", purchaseProcessing.getPurchaseOrder(po.poNumber()).orElseThrow().getStatus());
        // Receipts are attributed to the PR line from the POSTED GRN lines.
        assertEquals(0, new BigDecimal("50").compareTo(poByPr.receivedForPrItem(pr.line1())));
        assertEquals("FULLY_RECEIVED", poByPr.prLineStatuses(pr.number()).stream()
                .filter(s -> s.prItemId() == pr.line1()).findFirst().orElseThrow().receivingStatus());
        // The PR itself stays open: its second line is not ordered.
        assertEquals("Partially Ordered", prStatus(pr.number()));
    }

    // ------------------------------------------------------------------ guards

    @Test
    void prWithPoByPrAllocationsCannotBeDeleted() {
        Pr pr = newPr("NODELETE");
        create(request("FULL", new LineRequest(pr.line1(), null)));

        assertThrows(ConflictException.class, () -> prService.deleteRequisition(pr.number()));

        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_requisitions WHERE pr_number = ?", Integer.class, pr.number()));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_requisition_items WHERE pr_number = ?", Integer.class, pr.number()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE pr_number = ?", Integer.class, pr.number()));
    }

    @Test
    void prWithPoByPrAllocationsCannotHaveItsItemsReplacedByAnEdit() {
        Pr pr = newPr("NOEDIT");
        create(request("FULL", new LineRequest(pr.line1(), null)));
        PurchaseRequisition current = prService.getRequisitionByNumber(pr.number());
        current.setRemarks("edited");

        assertThrows(ConflictException.class, () -> prService.createOrUpdateRequisition(current));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_requisition_items WHERE pr_number = ?", Integer.class, pr.number()));
    }

    @Test
    void prWithoutAllocationsIsDeletedAsBefore() {
        Pr pr = newPr("PLAIN");
        prService.deleteRequisition(pr.number());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.purchase_requisitions WHERE pr_number = ?", Integer.class, pr.number()));
        PR_NUMBERS.remove(pr.number());
    }

    @Test
    void poRaisedThroughPoByPrCannotBeCancelledByTheLegacyPath() {
        Pr pr = newPr("CANCEL");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));

        assertThrows(ConflictException.class, () -> purchaseProcessing.cancelPurchaseOrder(po.poNumber(), "it-test", "test"));

        assertEquals("APPROVED", jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, po.poNumber()));
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    @Test
    void manualOrderedQtyChangeIsRefusedOnlyForAllocatedLines() {
        Pr pr = newPr("MANUAL");
        create(request("FULL", new LineRequest(pr.line1(), null)));

        assertThrows(ConflictException.class, () -> prService.assertNoPoByPrAllocations(pr.number(), CODE_1));
        assertDoesNotThrow(() -> prService.assertNoPoByPrAllocations(pr.number(), CODE_2));
    }

    // ------------------------------------------------------------------ cancellation, receipts and status rules

    private GoodsReceiptNote grn(String po, String challan, String itemCode, BigDecimal qty) {
        GoodsReceiptNote g = new GoodsReceiptNote();
        g.setPoNumber(po);
        g.setVendorCode(VENDOR);
        g.setVendorName("A.V.SALES CORPORATION");
        g.setVendorChallanNo(challan);
        g.setStoreLocation("Main Store");
        g.setReceivedBy("it-test");
        GoodsReceiptNoteItem it = new GoodsReceiptNoteItem();
        it.setItemCode(itemCode);
        it.setItemName("Test " + itemCode);
        it.setUom("PCS");
        it.setPoOrderedQty(qty);
        it.setChallanQty(qty);
        it.setReceivedQty(qty);
        it.setAcceptedQty(qty);
        it.setRejectedQty(BigDecimal.ZERO);
        it.setPendingInspectionQty(BigDecimal.ZERO);
        it.setUnitRate(new BigDecimal("100"));
        it.setTaxPercent(new BigDecimal("18"));
        g.setItems(List.of(it));
        return g;
    }

    private String poStatus(String poNumber) {
        return jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, poNumber);
    }

    private int grnCount(String poNumber) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM public.goods_receipt_notes WHERE po_number = ?", Integer.class, poNumber);
    }

    @Test
    void cancellationReleasesExactlyTheReservedQuantityAndRetryReleasesNothingMore() {
        Pr pr = newPr("CANCEL-OK");
        CreatedPo po = create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("30"))));
        assertEquals(0, new BigDecimal("30").compareTo(ordered(pr.line1())));

        Map<String, Object> result = poByPr.cancel(po.poNumber(), "it-test", "wrong vendor");

        assertEquals("CANCELLED", result.get("status"));
        assertEquals("CANCELLED", poStatus(po.poNumber()));
        assertEquals(0, BigDecimal.ZERO.compareTo(ordered(pr.line1())));
        assertEquals("Approved", prStatus(pr.number()));
        assertEquals(0, new BigDecimal("30").compareTo(jdbc.queryForObject(
                "SELECT released_qty FROM public.po_pr_allocations WHERE po_number = ?", BigDecimal.class, po.poNumber())));

        NewPoException retry = assertThrows(NewPoException.class, () -> poByPr.cancel(po.poNumber(), "it-test", "again"));
        assertEquals(HttpStatus.CONFLICT, retry.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(ordered(pr.line1())), "a retried cancel must not release again");
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_revisions WHERE po_number = ?", Integer.class, po.poNumber()));

        // The released quantity can be ordered again.
        create(request("FULL", new LineRequest(pr.line1(), null)));
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    @Test
    void concurrentCancellationsReleaseTheQuantityOnce() throws Exception {
        Pr pr = newPr("CANCEL-RACE");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));
        ExecutorService pool = Executors.newFixedThreadPool(4);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            results.add(pool.submit(() -> {
                start.await();
                try {
                    poByPr.cancel(po.poNumber(), "it-race", "race");
                    return 200;
                } catch (NewPoException ex) {
                    return ex.getStatus().value();
                }
            }));
        }
        start.countDown();
        int ok = 0;
        for (Future<Integer> f : results) if (f.get(60, TimeUnit.SECONDS) == 200) ok++;
        pool.shutdown();

        assertEquals(1, ok, "exactly one cancellation may succeed");
        assertEquals(0, BigDecimal.ZERO.compareTo(ordered(pr.line1())));
    }

    @Test
    void cancellationIsRefusedOnceAnythingHasBeenReceived() {
        Pr pr = newPr("CANCEL-RCV");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));
        grnService.saveOrPostGoodsReceiptNote(grn(po.poNumber(), "CH-CR-" + TAG, CODE_1, new BigDecimal("20")), true);

        NewPoException ex = assertThrows(NewPoException.class, () -> poByPr.cancel(po.poNumber(), "it-test", "too late"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue("APPROVED".equals(poStatus(po.poNumber())) || "PARTIALLY RECEIVED".equals(poStatus(po.poNumber())));
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    @Test
    void receiptsAreAttributedToTheirAllocationWhenPosted() {
        Pr pr = newPr("ATTR");
        CreatedPo po = create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("20"))));
        grnService.saveOrPostGoodsReceiptNote(grn(po.poNumber(), "CH-AT-" + TAG, CODE_1, new BigDecimal("12")), true);

        assertEquals(1, jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.grn_item_allocations g JOIN public.po_pr_allocations a ON a.id = g.allocation_id " +
                "WHERE a.po_number = ? AND g.received_qty = 12", Integer.class, po.poNumber()));
        assertEquals(0, new BigDecimal("12").compareTo(poByPr.receivedForPrItem(pr.line1())));
    }

    @Test
    void overReceiptIsRefusedAndNothingIsPersisted() {
        Pr pr = newPr("OVERRCPT");
        CreatedPo po = create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("20"))));
        int before = grnCount(po.poNumber());

        assertThrows(RuntimeException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(grn(po.poNumber(), "CH-OR-" + TAG, CODE_1, new BigDecimal("25")), true));

        assertEquals(before, grnCount(po.poNumber()), "a refused GRN must not be stored");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.grn_item_allocations g JOIN public.po_pr_allocations a ON a.id = g.allocation_id WHERE a.po_number = ?", Integer.class, po.poNumber()));
    }

    @Test
    void receiptAgainstACancelledPoIsRefusedAndNothingIsPersisted() {
        Pr pr = newPr("RCPT-CANCELLED");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));
        poByPr.cancel(po.poNumber(), "it-test", "cancelled before receipt");
        int before = grnCount(po.poNumber());

        assertThrows(ConflictException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(grn(po.poNumber(), "CH-CX-" + TAG, CODE_1, new BigDecimal("10")), true));
        assertEquals(before, grnCount(po.poNumber()));
    }

    @Test
    void sameChallanCannotBePostedTwice() {
        Pr pr = newPr("DUPCH");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));
        String challan = "CH-DUP-" + TAG;
        grnService.saveOrPostGoodsReceiptNote(grn(po.poNumber(), challan, CODE_1, new BigDecimal("10")), true);

        assertThrows(ConflictException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(grn(po.poNumber(), challan, CODE_1, new BigDecimal("10")), true));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM public.goods_receipt_notes WHERE po_number = ? AND status = 'POSTED'", Integer.class, po.poNumber()));
    }

    @Test
    void postedGrnCannotBeChangedOrPostedAgain() {
        Pr pr = newPr("POSTED-GRN");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));
        GoodsReceiptNote saved = grnService.saveOrPostGoodsReceiptNote(grn(po.poNumber(), "CH-PG-" + TAG, CODE_1, new BigDecimal("10")), true);

        assertThrows(ConflictException.class, () -> grnService.saveOrPostGoodsReceiptNote(saved, true));
        assertEquals("POSTED", jdbc.queryForObject("SELECT status FROM public.goods_receipt_notes WHERE id = ?", String.class, saved.getId()));
    }

    @Test
    void legacyQuantityChangeCannotExceedTheRemainingQuantity() {
        Pr pr = newPr("LEGACY-CAP");
        assertThrows(ConflictException.class, () -> prService.updateItemOrderedQty(pr.number(), CODE_1, new BigDecimal("51")));
        assertEquals(0, BigDecimal.ZERO.compareTo(ordered(pr.line1())));
    }

    @Test
    void newOrderAndLegacyChangeRacingForTheLastUnitsCannotBothSucceed() throws Exception {
        Pr pr = newPr("MIXED-RACE");
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        Future<Integer> newFlow = pool.submit(() -> {
            start.await();
            try {
                CreatedPo po = poByPr.create(request("FULL", new LineRequest(pr.line1(), null)), "it-mixed");
                PO_NUMBERS.add(po.poNumber());
                return 201;
            } catch (NewPoException ex) {
                return ex.getStatus().value();
            }
        });
        Future<Integer> legacyFlow = pool.submit(() -> {
            start.await();
            try {
                prService.updateItemOrderedQty(pr.number(), CODE_1, new BigDecimal("50"));
                return 200;
            } catch (ConflictException ex) {
                return 409;
            }
        });
        start.countDown();
        int a = newFlow.get(60, TimeUnit.SECONDS), b = legacyFlow.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        assertEquals(1, (a == 201 ? 1 : 0) + (b == 200 ? 1 : 0), "exactly one of the two flows may take the 50 units");
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    @Test
    void amendingAPoByPrOrderIsRefusedAndNothingChanges() {
        Pr pr = newPr("AMEND");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));

        assertThrows(ConflictException.class,
                () -> purchaseProcessing.createPoAmendment(po.poNumber(), "it-test", "change qty", Map.<String, Object>of("quantity", 10)));
        assertEquals("APPROVED", poStatus(po.poNumber()));
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    // ------------------------------------------------------------------ database rules, numbering, reports

    @Autowired ProcurementMigrations migrations;
    @Autowired ProcurementReportService reports;

    private GoodsReceiptNote grnWith(String po, String challan, String itemCode, String received, String accepted, String rejected) {
        GoodsReceiptNote g = grn(po, challan, itemCode, new BigDecimal(received));
        GoodsReceiptNoteItem it = g.getItems().get(0);
        it.setAcceptedQty(new BigDecimal(accepted));
        it.setRejectedQty(new BigDecimal(rejected));
        return g;
    }

    @Test
    void releasedQuantityConstraintExistsAndRejectsAnOverRelease() {
        assertTrue(migrations.ensureReleasedQtyConstraint());
        assertEquals(1, jdbc.queryForObject(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'ck_po_pr_alloc_released'", Integer.class));

        Pr pr = newPr("CONSTRAINT");
        CreatedPo po = create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("10"))));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE public.po_pr_allocations SET released_qty = allocated_qty + 1 WHERE po_number = ?", po.poNumber()));
    }

    @Test
    void poNumbersComeFromTheDatabaseSequenceAndStayAheadOfExistingNumbers() throws Exception {
        // A stored PO with a high number, as if written by an earlier run or another instance.
        String highest = "PO-2026-" + (90000 + COUNTER.next());
        jdbc.update("INSERT INTO public.purchase_orders (id, po_number, po_date, vendor_code, vendor_name, status) VALUES (?, ?, '2026-10-19', ?, 'fixture', 'APPROVED')",
                "IT-" + TAG + "-" + highest, highest, VENDOR);
        PO_NUMBERS.add(highest);

        // Simulated restart: the sequence is re-aligned from the stored numbers, not from memory.
        migrations.ensurePoNumberSequence();
        String next = purchaseProcessing.reservePoNumber();
        long nextSeq = Long.parseLong(next.substring(8));
        assertTrue(nextSeq > Long.parseLong(highest.substring(8)), next + " must be above " + highest);
        assertTrue(next.matches("PO-2026-\\d{5,}"));

        // Concurrent reservations are all distinct.
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<String>> got = new ArrayList<>();
        for (int i = 0; i < 16; i++) got.add(pool.submit(() -> purchaseProcessing.reservePoNumber()));
        Set<String> distinct = new HashSet<>();
        try {
            for (Future<String> f : got) distinct.add(f.get(60, TimeUnit.SECONDS));
        } finally {
            pool.shutdown();
        }
        assertEquals(16, distinct.size());
    }

    @Test
    void twoPartialGrnsKeepAcceptedAndRejectedSeparateAndAttributeToTheLine() {
        Pr pr = newPr("TWO-GRN");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));

        // Only accepted goods fulfil the PO: 15 of the first 20 received fulfil it, the 5 rejected do not.
        grnService.saveOrPostGoodsReceiptNote(grnWith(po.poNumber(), "CH-2G-A-" + TAG, CODE_1, "20", "15", "5"), true);
        assertEquals(0, new BigDecimal("15").compareTo(poByPr.receivedForPrItem(pr.line1())));
        assertEquals("PARTIALLY RECEIVED", poStatus(po.poNumber()));

        // The PO stays open for the 5 accepted units still outstanding: no automatic closure, no automatic replacement.
        grnService.saveOrPostGoodsReceiptNote(grnWith(po.poNumber(), "CH-2G-B-" + TAG, CODE_1, "30", "30", "0"), true);
        assertEquals(0, new BigDecimal("45").compareTo(poByPr.receivedForPrItem(pr.line1())));
        assertEquals("PARTIALLY RECEIVED", poStatus(po.poNumber()));

        // A replacement receipt for the outstanding 5 accepted units completes the PO.
        grnService.saveOrPostGoodsReceiptNote(grnWith(po.poNumber(), "CH-2G-C-" + TAG, CODE_1, "5", "5", "0"), true);
        assertEquals(0, new BigDecimal("50").compareTo(poByPr.receivedForPrItem(pr.line1())));
        assertEquals("COMPLETED", poStatus(po.poNumber()));

        // Nothing more can be accepted: the PO line is complete.
        assertThrows(RuntimeException.class, () -> grnService.saveOrPostGoodsReceiptNote(
                grnWith(po.poNumber(), "CH-2G-D-" + TAG, CODE_1, "1", "1", "0"), true));

        List<Map<String, Object>> rows = reports.poVsPrVsGrn(po.poNumber(), null, null);
        assertEquals(1, rows.size());
        assertEquals(0, new BigDecimal("50").compareTo((BigDecimal) rows.get(0).get("receivedQty")));
        assertEquals(0, new BigDecimal("50").compareTo((BigDecimal) rows.get(0).get("acceptedQty")));
        assertEquals(0, new BigDecimal("5").compareTo((BigDecimal) rows.get(0).get("poLineRejectedQty")));
        assertEquals("RETAINED_NOT_RETURNED", rows.get(0).get("rejectedDisposition"));
        assertEquals(0, BigDecimal.ZERO.compareTo((BigDecimal) rows.get(0).get("pendingReceiptQty")));

        // The PO detail shows physical, accepted, rejected and outstanding separately.
        Map<String, Object> pos = poByPr.poDetail(po.poNumber());
        @SuppressWarnings("unchecked")
        Map<String, Object> pos0 = ((List<Map<String, Object>>) pos.get("receiptPosition")).stream()
                .filter(r -> CODE_1.equals(r.get("itemCode"))).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("55").compareTo((BigDecimal) pos0.get("physicallyReceivedQty")));
        assertEquals(0, new BigDecimal("50").compareTo((BigDecimal) pos0.get("acceptedQty")));
        assertEquals(0, new BigDecimal("5").compareTo((BigDecimal) pos0.get("rejectedQty")));
        assertEquals(0, BigDecimal.ZERO.compareTo((BigDecimal) pos0.get("outstandingAcceptedQty")));
        assertEquals("RETAINED_NOT_RETURNED", pos0.get("rejectedDisposition"));
    }

    @Test
    void rejectedOnlyReceiptKeepsThePoOpenAndStillBlocksCancellation() {
        Pr pr = newPr("REJECTED-ONLY");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));
        grnService.saveOrPostGoodsReceiptNote(grnWith(po.poNumber(), "CH-RJ-" + TAG, CODE_1, "10", "0", "10"), true);

        assertEquals(0, BigDecimal.ZERO.compareTo(poByPr.receivedForPrItem(pr.line1())), "rejected goods are not fulfilment");
        assertEquals("APPROVED", poStatus(po.poNumber()), "a fully rejected delivery must not close or advance the PO");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.grn_item_allocations g JOIN public.po_pr_allocations a ON a.id = g.allocation_id WHERE a.po_number = ?", Integer.class, po.poNumber()));
        // Rejected goods are physically in the store, so the PO cannot be cancelled.
        assertThrows(NewPoException.class, () -> poByPr.cancel(po.poNumber(), "it-test", "try"));
        assertEquals(0, new BigDecimal("50").compareTo(ordered(pr.line1())));
    }

    @Test
    void acceptedBackfillMigrationDerivesTheLegacyShareAndLocksTheColumn() {
        Pr pr = newPr("BACKFILL");
        CreatedPo po = create(request("FULL", new LineRequest(pr.line1(), null)));
        grnService.saveOrPostGoodsReceiptNote(grnWith(po.poNumber(), "CH-BF-" + TAG, CODE_1, "10", "6", "4"), true);
        // Simulate a row written before accepted_qty existed: physical share in received_qty, accepted_qty empty.
        jdbc.execute("ALTER TABLE public.grn_item_allocations ALTER COLUMN accepted_qty DROP NOT NULL");
        jdbc.update("UPDATE public.grn_item_allocations g SET accepted_qty = NULL, received_qty = 10 " +
                "FROM public.po_pr_allocations a WHERE a.id = g.allocation_id AND a.po_number = ?", po.poNumber());

        migrations.ensureAcceptedQtyOnAttributions();

        assertEquals(0, new BigDecimal("6").compareTo(jdbc.queryForObject(
                "SELECT g.accepted_qty FROM public.grn_item_allocations g JOIN public.po_pr_allocations a ON a.id = g.allocation_id WHERE a.po_number = ?",
                BigDecimal.class, po.poNumber())), "accepted share of the physical 10 when 6 of 10 were accepted");
        assertEquals("NO", jdbc.queryForObject(
                "SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grn_item_allocations' AND column_name = 'accepted_qty'", String.class));
    }

    @Test
    void poVsPrReportShowsOrderingReceiptAndLifecycleSeparately() {
        Pr pr = newPr("REPORT");
        CreatedPo po = create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("30"))));
        grnService.saveOrPostGoodsReceiptNote(grnWith(po.poNumber(), "CH-RP-" + TAG, CODE_1, "10", "10", "0"), true);

        Map<String, Object> line = reports.poVsPr(pr.number(), null, null).stream()
                .filter(r -> CODE_1.equals(r.get("itemCode"))).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("30").compareTo((BigDecimal) line.get("orderedQty")));
        assertEquals(0, new BigDecimal("10").compareTo((BigDecimal) line.get("receivedQty")));
        assertEquals(0, new BigDecimal("20").compareTo((BigDecimal) line.get("remainingToOrderQty")));
        assertEquals("PARTIALLY_ORDERED", line.get("lifecycle"));
        assertEquals("PARTIALLY_RECEIVED", poByPr.prLineStatuses(pr.number()).stream()
                .filter(s -> s.prItemId() == pr.line1()).findFirst().orElseThrow().receivingStatus());
    }

    @Test
    void legacyReconciliationListsLegacyPosWithoutInventingLinks() {
        int allocationsBefore = jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations", Integer.class);
        Map<String, Object> report = reports.legacyReconciliation();
        @SuppressWarnings("unchecked")
        Map<String, Integer> counts = (Map<String, Integer>) report.get("counts");
        Integer legacyPos = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.purchase_orders p WHERE NOT EXISTS (SELECT 1 FROM public.po_pr_allocations a WHERE a.po_number = p.po_number)",
                Integer.class);
        int reported = counts.getOrDefault("PO_WITHOUT_PR_ALLOCATION", 0) + counts.getOrDefault("PO_NAMES_PR_WITHOUT_ALLOCATION", 0);
        assertEquals(legacyPos, reported, "every legacy PO must be listed for review");
        // The report is read-only: it creates no allocation rows (no links are invented).
        assertEquals(allocationsBefore, (int) jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations", Integer.class));
    }

    // ------------------------------------------------------------------ PR -> PO -> GRN without batches or clubbing

    private static final List<String> CLUB_BATCHES = Collections.synchronizedList(new ArrayList<>());

    @Test
    void prToPoToGrnFlowNeedsNoBatchAndIgnoresClubbingRows() {
        Pr pr = newPr("NO-CLUB");
        long prId = jdbc.queryForObject("SELECT id FROM public.purchase_requisitions WHERE pr_number = ?", Long.class, pr.number());
        // A clubbing batch that contains this PR line, as the existing batch tab would create it.
        String batch = "CB-IT-" + TAG + "-" + COUNTER.next();
        CLUB_BATCHES.add(batch);
        long batchId = jdbc.queryForObject(
                "INSERT INTO public.pr_clubbing_batches (batch_number, batch_name, status) VALUES (?, 'it batch', 'DRAFT') RETURNING id", Long.class, batch);
        long batchItemId = jdbc.queryForObject(
                "INSERT INTO public.pr_clubbing_batch_items (batch_id, batch_number, item_code, uom, total_clubbed_qty, purchased_qty, remaining_qty, status) " +
                "VALUES (?, ?, ?, 'PCS', 50, 0, 50, 'OPEN') RETURNING id", Long.class, batchId, batch, CODE_1);
        jdbc.update("INSERT INTO public.pr_clubbing_allocations (batch_id, batch_item_id, pr_id, pr_number, pr_item_id, item_code, allocated_qty, purchased_qty, remaining_qty, status) " +
                "VALUES (?, ?, ?, ?, ?, ?, 50, 0, 50, 'ALLOCATED')", batchId, batchItemId, prId, pr.number(), pr.line1(), CODE_1);

        // The PR line is still offered with its full outstanding quantity: batch rows neither add nor remove quantity.
        PrLineStatus before = poByPr.prLineStatuses(pr.number()).stream().filter(s -> s.prItemId() == pr.line1()).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("50").compareTo(before.remainingToOrderQty()));
        assertEquals(0, BigDecimal.ZERO.compareTo(before.orderedQty()));

        // The PO is created directly from the PR line, without any batch step.
        CreatedPo po = create(request("PARTIAL", new LineRequest(pr.line1(), new BigDecimal("20"))));
        assertEquals(0, new BigDecimal("20").compareTo(ordered(pr.line1())));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ?", Integer.class, po.poNumber()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ? AND pr_item_id <> ?", Integer.class, po.poNumber(), pr.line1()));

        // The batch is untouched by the PO: nothing purchased, nothing reduced.
        assertEquals(0, new BigDecimal("0").compareTo(jdbc.queryForObject(
                "SELECT purchased_qty FROM public.pr_clubbing_allocations WHERE batch_id = ?", BigDecimal.class, batchId)));
        assertEquals(0, new BigDecimal("50").compareTo(jdbc.queryForObject(
                "SELECT remaining_qty FROM public.pr_clubbing_allocations WHERE batch_id = ?", BigDecimal.class, batchId)));

        // Receipt through the GRN is attributed to the PR line, not to the batch.
        grnService.saveOrPostGoodsReceiptNote(grnWith(po.poNumber(), "CH-NC-" + TAG, CODE_1, "20", "20", "0"), true);
        assertEquals(0, new BigDecimal("20").compareTo(poByPr.receivedForPrItem(pr.line1())));
        assertEquals(0, BigDecimal.ZERO.compareTo(jdbc.queryForObject(
                "SELECT purchased_qty FROM public.pr_clubbing_allocations WHERE batch_id = ?", BigDecimal.class, batchId)));
    }

    // Small thread-safe counter for unique suffixes.
    private static final class AtomicCounter {
        private final java.util.concurrent.atomic.AtomicInteger n = new java.util.concurrent.atomic.AtomicInteger();
        long next() {
            return n.incrementAndGet();
        }
    }
}
