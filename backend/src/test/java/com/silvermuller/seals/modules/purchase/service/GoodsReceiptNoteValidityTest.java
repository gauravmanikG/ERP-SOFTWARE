package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * GRN save/post must be refused for an expired PO before any GRN number, GRN row, item row or
 * received quantity is written. Uses mocks, so no database is needed.
 */
class GoodsReceiptNoteValidityTest {

    private JdbcTemplate jdbc;
    private PurchaseProcessingService purchaseService;
    private GoodsReceiptNoteService grnService;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        purchaseService = mock(PurchaseProcessingService.class);
        grnService = new GoodsReceiptNoteService(jdbc,
                mock(com.silvermuller.seals.modules.purchase.newpo.ReceiptAttributionService.class), purchaseService);
    }

    private static PurchaseOrder po(String poNumber, String validityDate) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId("ID-" + poNumber);
        po.setPoNumber(poNumber);
        po.setStatus("ISSUED");
        po.setValidityDate(validityDate);
        return po;
    }

    private static GoodsReceiptNote grnFor(String poNumber) {
        GoodsReceiptNoteItem item = new GoodsReceiptNoteItem();
        item.setItemCode("ITM-001");
        item.setReceivedQty(new BigDecimal("10"));
        item.setAcceptedQty(new BigDecimal("10"));
        item.setChallanQty(new BigDecimal("10"));
        item.setPoOrderedQty(new BigDecimal("10"));
        item.setUnitRate(BigDecimal.ONE);

        GoodsReceiptNote grn = new GoodsReceiptNote();
        grn.setPoNumber(poNumber);
        grn.setVendorChallanNo("CH-1");
        grn.setStoreLocation("Main Store");
        grn.setReceivedBy("Store Keeper");
        grn.setItems(List.of(item));
        return grn;
    }

    @Test
    void expiredPoBlocksPostingBeforeAnyWrite() {
        String yesterday = LocalDate.now().minusDays(1).toString();
        when(purchaseService.getPurchaseOrder("PO-2026-00201"))
                .thenReturn(Optional.of(po("PO-2026-00201", yesterday)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(grnFor("PO-2026-00201"), true));

        assertTrue(ex.getMessage().contains("expired"), ex.getMessage());
        assertTrue(ex.getMessage().contains("extended"), ex.getMessage());
        verifyNoInteractions(jdbc);
    }

    @Test
    void expiredPoBlocksSavingDraftToo() {
        String yesterday = LocalDate.now().minusDays(1).toString();
        when(purchaseService.getPurchaseOrder("PO-2026-00202"))
                .thenReturn(Optional.of(po("PO-2026-00202", yesterday)));

        assertThrows(IllegalArgumentException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(grnFor("PO-2026-00202"), false));
        verifyNoInteractions(jdbc);
    }

    @Test
    void validityIsCheckedBeforeGrnNumberIsGenerated() {
        String yesterday = LocalDate.now().minusDays(1).toString();
        when(purchaseService.getPurchaseOrder(anyString()))
                .thenReturn(Optional.of(po("PO-2026-00203", yesterday)));

        assertThrows(IllegalArgumentException.class,
                () -> grnService.saveOrPostGoodsReceiptNote(grnFor("PO-2026-00203"), true));
        // No GRN number sequence read, no row insert, no stock or received-quantity update
        verifyNoInteractions(jdbc);
    }

    @Test
    void poValidOnItsLastDayIsNotBlockedByValidityCheck() {
        String today = LocalDate.now().toString();
        when(purchaseService.getPurchaseOrder("PO-2026-00204"))
                .thenReturn(Optional.of(po("PO-2026-00204", today)));

        try {
            grnService.saveOrPostGoodsReceiptNote(grnFor("PO-2026-00204"), false);
        } catch (RuntimeException ex) {
            // Later stages may fail against the mocked database; the validity guard must not be the reason.
            assertFalse(String.valueOf(ex.getMessage()).contains("expired"), ex.getMessage());
        }
        assertFalse(mockingDetails(jdbc).getInvocations().isEmpty());
    }

    @Test
    void legacyPoWithoutValidityDateIsNotBlocked() {
        when(purchaseService.getPurchaseOrder("PO-2026-00100"))
                .thenReturn(Optional.of(po("PO-2026-00100", null)));

        try {
            grnService.saveOrPostGoodsReceiptNote(grnFor("PO-2026-00100"), false);
        } catch (RuntimeException ex) {
            assertFalse(String.valueOf(ex.getMessage()).contains("expired"), ex.getMessage());
        }
        assertFalse(mockingDetails(jdbc).getInvocations().isEmpty());
    }
}
