package com.silvermuller.seals.modules.purchase.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class PoValidityTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);

    @Test
    void poWithoutValidityDateIsNotSetAndNeverExpired() {
        assertEquals(PoValidity.NOT_SET, PoValidity.status(PoValidity.parse(null), TODAY));
        assertEquals(PoValidity.NOT_SET, PoValidity.status(PoValidity.parse("  "), TODAY));
        assertFalse(PoValidity.isExpired(null, TODAY));
    }

    @Test
    void poIsStillValidOnItsValidityDate() {
        LocalDate validity = TODAY;
        assertEquals(PoValidity.VALID, PoValidity.status(validity, TODAY));
        assertFalse(PoValidity.isExpired(validity, TODAY));
    }

    @Test
    void poExpiresTheDayAfterValidityDate() {
        LocalDate validity = TODAY.minusDays(1);
        assertEquals(PoValidity.EXPIRED, PoValidity.status(validity, TODAY));
        assertTrue(PoValidity.isExpired(validity, TODAY));
    }

    @Test
    void poIsValidBeforeValidityDate() {
        assertEquals(PoValidity.VALID, PoValidity.status(TODAY.plusDays(30), TODAY));
    }

    @Test
    void newValidityDateMustBeMandatoryAndNotInThePast() {
        assertThrows(IllegalArgumentException.class, () -> PoValidity.validateNewDate(null, TODAY));
        assertThrows(IllegalArgumentException.class, () -> PoValidity.validateNewDate(TODAY.minusDays(1), TODAY));
        assertDoesNotThrow(() -> PoValidity.validateNewDate(TODAY, TODAY));
        assertDoesNotThrow(() -> PoValidity.validateNewDate(TODAY.plusDays(1), TODAY));
    }

    @Test
    void blankRequiredValidityDateIsRejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> PoValidity.parseRequired(""));
        assertTrue(ex.getMessage().contains("mandatory"));
        assertThrows(IllegalArgumentException.class, () -> PoValidity.parseRequired("31-12-2026"));
        assertEquals(LocalDate.of(2026, 12, 31), PoValidity.parseRequired("2026-12-31"));
    }

    @Test
    void extensionMustBeLaterThanCurrentDate() {
        LocalDate current = TODAY.plusDays(10);
        assertDoesNotThrow(() -> PoValidity.validateExtension(current, current.plusDays(1), TODAY));
        assertThrows(IllegalArgumentException.class, () -> PoValidity.validateExtension(current, current, TODAY));
        assertThrows(IllegalArgumentException.class, () -> PoValidity.validateExtension(current, current.minusDays(1), TODAY));
    }

    @Test
    void expiredPoCanBeExtendedToAnyDateFromToday() {
        LocalDate expired = TODAY.minusDays(5);
        assertDoesNotThrow(() -> PoValidity.validateExtension(expired, TODAY, TODAY));
        assertThrows(IllegalArgumentException.class, () -> PoValidity.validateExtension(expired, TODAY.minusDays(1), TODAY));
    }

    @Test
    void legacyPoWithoutDateCanReceiveFirstValidityDate() {
        assertDoesNotThrow(() -> PoValidity.validateExtension(null, TODAY, TODAY));
    }

    @Test
    void assertNotExpiredNamesThePoAndAskForExtension() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> PoValidity.assertNotExpired("PO-2026-00201", "2026-10-14", TODAY));
        assertTrue(ex.getMessage().contains("PO-2026-00201"));
        assertTrue(ex.getMessage().contains("expired on 14-10-2026"));
        assertTrue(ex.getMessage().contains("extended"));
        assertDoesNotThrow(() -> PoValidity.assertNotExpired("PO-2026-00201", "2026-10-15", TODAY));
        assertDoesNotThrow(() -> PoValidity.assertNotExpired("PO-2026-00201", null, TODAY));
    }

    @Test
    void purchaseOrderReportsComputedValidityStatus() {
        PurchaseOrder po = new PurchaseOrder();
        assertEquals(PoValidity.NOT_SET, po.getValidityStatus());
        po.setValidityDate(LocalDate.now().minusDays(1).toString());
        assertEquals(PoValidity.EXPIRED, po.getValidityStatus());
        po.setValidityDate(LocalDate.now().plusDays(1).toString());
        assertEquals(PoValidity.VALID, po.getValidityStatus());
    }
}
