package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Created;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Line;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Request;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import com.silvermuller.seals.modules.purchase.service.GoodsReceiptNoteService;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
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

/** Direct PO against an isolated database copy (set SMS_TEST_DATABASE_URL). See PoByPrIntegrationTest for the gate. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(named = "SMS_TEST_DATABASE_URL", matches = ".+")
class DirectPoIntegrationTest {

    private static final String VENDOR = "SUP-002";
    // PO date must be today or later (DirectPoService rejects past dates), so the fixture uses today.
    private static final LocalDate PO_DATE = LocalDate.now();
    private static final String TAG = "DP" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

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
    @Autowired DirectPoService direct;
    @Autowired VendorRateService rates;
    @Autowired PurchaseProcessingService purchaseProcessing;
    @Autowired GoodsReceiptNoteService grnService;

    private final List<String> pos = new ArrayList<>();
    private final List<Long> rateIds = new ArrayList<>();

    @BeforeAll
    void rate() {
        for (long item : new long[] {1611L, 1612L}) {
            Map<String, Object> r = rates.create(
                    // Effective today, so it is the vendor's current rate whatever older rates the database copy holds.
                    new VendorRateService.RateRequest(VENDOR, item, new BigDecimal("100"), PO_DATE), "it-direct");
            rateIds.add(((Number) r.get("id")).longValue());
        }
    }

    @AfterAll
    void cleanUp() {
        for (String po : pos) {
            jdbc.update("DELETE FROM public.grn_item_allocations WHERE grn_item_id IN (SELECT id FROM public.goods_receipt_note_items WHERE po_number = ?)", po);
            jdbc.update("DELETE FROM public.goods_receipt_note_items WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.goods_receipt_notes WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.po_revisions WHERE po_number = ?", po);
            jdbc.update("DELETE FROM public.purchase_orders WHERE po_number = ?", po);
        }
        for (Long id : rateIds) jdbc.update("DELETE FROM public.vendor_item_rates WHERE id = ?", id);
    }

    private Request request(Line... lines) {
        return new Request(VENDOR, PO_DATE, PO_DATE.plusDays(7), List.of(lines), "integration " + TAG,
                null, null, null, "Integration invoice to", "Integration ship to", null, "REF-" + TAG, null, null, "Integration test reason");
    }

    private Created create(Request r) {
        Created c = direct.create(r, "it-direct");
        pos.add(c.poNumber());
        return c;
    }

    private String origin(String po) {
        return jdbc.queryForObject("SELECT po_origin FROM public.purchase_orders WHERE po_number = ?", String.class, po);
    }

    private String status(String po) {
        return jdbc.queryForObject("SELECT status FROM public.purchase_orders WHERE po_number = ?", String.class, po);
    }

    private GoodsReceiptNote grn(String po, String challan, String item, String received, String accepted, String rejected) {
        GoodsReceiptNote g = new GoodsReceiptNote();
        g.setPoNumber(po);
        g.setVendorCode(VENDOR);
        g.setVendorName("A.V.SALES CORPORATION");
        g.setVendorChallanNo(challan);
        g.setStoreLocation("Main Store");
        g.setReceivedBy("it-direct");
        GoodsReceiptNoteItem it = new GoodsReceiptNoteItem();
        it.setItemCode(item);
        it.setItemName("Test " + item);
        it.setUom("PCS");
        it.setPoOrderedQty(BigDecimal.ZERO);
        it.setChallanQty(new BigDecimal(received));
        it.setReceivedQty(new BigDecimal(received));
        it.setAcceptedQty(new BigDecimal(accepted));
        it.setRejectedQty(new BigDecimal(rejected));
        it.setPendingInspectionQty(BigDecimal.ZERO);
        it.setUnitRate(new BigDecimal("100"));
        it.setTaxPercent(new BigDecimal("18"));
        g.setItems(List.of(it));
        return g;
    }

    @Test
    void directPoIsNumberedPricedTaxedAndMarkedDirect() {
        Created c = create(request(new Line("CON01-0001", new BigDecimal("3")), new Line("CON01-0002", new BigDecimal("2"))));

        assertTrue(c.poNumber().matches("PO-2026-\\d{5,}"));
        assertEquals("DIRECT", origin(c.poNumber()));
        assertEquals("STANDARD", jdbc.queryForObject("SELECT po_type FROM public.purchase_orders WHERE po_number = ?", String.class, c.poNumber()));
        // 3 x 100 + 2 x 100 = 500 taxable, 18 % GST = 90. SUP-002 (GSTIN 06...) is in our own state, Haryana (06),
        // so the 90 is split CGST 45 + SGST 45 with no IGST.
        assertEquals(0, new BigDecimal("500").compareTo(c.po().taxableAmount()));
        assertEquals(0, new BigDecimal("90").compareTo(c.po().totalTax()));
        assertEquals(0, new BigDecimal("45").compareTo(c.po().lines().stream().map(l -> l.cgstAmount()).reduce(BigDecimal.ZERO, BigDecimal::add)));
        assertEquals(0, new BigDecimal("45").compareTo(c.po().lines().stream().map(l -> l.sgstAmount()).reduce(BigDecimal.ZERO, BigDecimal::add)));
        assertEquals(0, BigDecimal.ZERO.compareTo(c.po().lines().stream().map(l -> l.igstAmount()).reduce(BigDecimal.ZERO, BigDecimal::add)));
        assertEquals(0, new BigDecimal("590").compareTo(c.po().grandTotal()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ?", Integer.class, c.poNumber()).intValue());
        assertEquals(PO_DATE.plusDays(7), jdbc.queryForObject("SELECT expected_delivery FROM public.purchase_orders WHERE po_number = ?", java.sql.Date.class, c.poNumber()).toLocalDate());
    }

    @Test
    void directPoNeverTouchesPurchaseRequisitionQuantities() {
        Integer before = jdbc.queryForObject("SELECT COALESCE(SUM(ordered_qty), 0)::int FROM public.purchase_requisition_items", Integer.class);
        create(request(new Line("CON01-0001", new BigDecimal("7"))));
        Integer after = jdbc.queryForObject("SELECT COALESCE(SUM(ordered_qty), 0)::int FROM public.purchase_requisition_items", Integer.class);
        assertEquals(before, after);
    }

    @Test
    void duplicateItemLinesAreMergedAndValidated() {
        Created c = create(request(new Line("CON01-0001", new BigDecimal("1")), new Line("CON01-0001", new BigDecimal("4"))));
        assertEquals(1, c.po().lines().size());
        assertEquals(0, new BigDecimal("5").compareTo(c.po().lines().get(0).quantity()));

        assertThrows(NewPoException.class, () -> direct.preview(request(new Line("CON01-0001", BigDecimal.ZERO))));
        assertThrows(NewPoException.class, () -> direct.preview(request(new Line("NO-SUCH-ITEM-" + TAG, new BigDecimal("1")))));
        // A PO date in the past is refused before rates are looked at, so "no rate" needs an item the vendor has never quoted.
        String unquoted = jdbc.queryForObject(
                "SELECT i.sms_new_part_no FROM public.item_master i JOIN public.hsn_tax_master h ON h.hsn_sac_code = i.hsn_code AND h.is_active "
                        + "WHERE i.sms_new_part_no IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vendor_item_rates r "
                        + "WHERE r.supplier_code = ? AND r.item_id = i.id) ORDER BY i.id LIMIT 1", String.class, VENDOR);
        NewPoException noRate = assertThrows(NewPoException.class,
                () -> direct.preview(new Request(VENDOR, PO_DATE, null, List.of(new Line(unquoted, BigDecimal.ONE)), null)));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, noRate.getStatus());
        assertTrue(noRate.getMessage().contains("No vendor rate"), noRate.getMessage());
        NewPoException pastDate = assertThrows(NewPoException.class,
                () -> direct.preview(new Request(VENDOR, PO_DATE.minusDays(1), null, List.of(new Line("CON01-0001", BigDecimal.ONE)), null)));
        assertEquals(HttpStatus.BAD_REQUEST, pastDate.getStatus());
    }

    @Test
    void directPoReceiptsAreAcceptedAgainstThePoButNeverAttributedToPrLines() {
        Created c = create(request(new Line("CON01-0002", new BigDecimal("10"))));
        grnService.saveOrPostGoodsReceiptNote(grn(c.poNumber(), "CH-DP-" + TAG, "CON01-0002", "10", "8", "2"), true);

        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM public.grn_item_allocations g JOIN public.goods_receipt_note_items gi ON gi.id = g.grn_item_id WHERE gi.po_number = ?", Integer.class, c.poNumber()).intValue());
        assertEquals("PARTIALLY RECEIVED", status(c.poNumber()), "2 rejected units do not close the 10-unit PO");
        // Only the 8 accepted units count: 2 more accepted units are still outstanding.
        assertThrows(RuntimeException.class, () -> grnService.saveOrPostGoodsReceiptNote(
                grn(c.poNumber(), "CH-DP2-" + TAG, "CON01-0002", "3", "3", "0"), true));
        grnService.saveOrPostGoodsReceiptNote(grn(c.poNumber(), "CH-DP3-" + TAG, "CON01-0002", "2", "2", "0"), true);
        assertEquals("COMPLETED", status(c.poNumber()));
    }

    @Test
    void directPoCancellationWorksWithoutReceiptsAndIsBlockedAfterAReceipt() {
        Created free = create(request(new Line("CON01-0001", new BigDecimal("2"))));
        purchaseProcessing.cancelPurchaseOrder(free.poNumber(), "it-direct", "not needed");
        assertEquals("CANCELLED", status(free.poNumber()));

        Created received = create(request(new Line("CON01-0001", new BigDecimal("2"))));
        grnService.saveOrPostGoodsReceiptNote(grn(received.poNumber(), "CH-DPC-" + TAG, "CON01-0001", "1", "1", "0"), true);
        assertThrows(ConflictException.class, () -> purchaseProcessing.cancelPurchaseOrder(received.poNumber(), "it-direct", "too late"));
        assertEquals("PARTIALLY RECEIVED", status(received.poNumber()));
    }

    @Test
    void directPosAreListedSeparatelyAndCarryTheirOrigin() {
        Created c = create(request(new Line("CON01-0001", new BigDecimal("1"))));
        boolean listed = direct.list().stream().anyMatch(r -> c.poNumber().equals(r.get("po_number")));
        assertTrue(listed);
        assertEquals("DIRECT", origin(c.poNumber()));
        assertTrue(purchaseProcessing.getPurchaseOrder(c.poNumber()).isPresent(), "a new PO must be visible to the existing PO screens");
    }
}
