package com.silvermuller.seals.modules.purchase.capitalpo;

import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoCalculator.ChargeCalc;
import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoCalculator.LineCalc;
import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoService.Actor;
import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoService.CapitalPoException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Capital PO calculation, rollup and identity rules. No database needed. */
class CapitalPoRulesTest {

    private static BigDecimal d(String v) {
        return new BigDecimal(v);
    }

    @Test
    void intraStateLineSplitsGstIntoCgstAndSgst() {
        // 2 machines x 150000, 10% discount, 18% GST, same state
        LineCalc c = CapitalPoCalculator.line(d("2"), d("150000"), "PERCENT", d("10"), d("18"), true);
        assertEquals(new BigDecimal("300000.00"), c.gross());
        assertEquals(new BigDecimal("30000.00"), c.discount());
        assertEquals(new BigDecimal("270000.00"), c.taxable());
        assertEquals(new BigDecimal("24300.00"), c.cgst());
        assertEquals(new BigDecimal("24300.00"), c.sgst());
        assertEquals(BigDecimal.ZERO.setScale(2), c.igst());
        assertEquals(new BigDecimal("48600.00"), c.gstAmount());
        assertEquals(new BigDecimal("318600.00"), c.lineTotal());
    }

    @Test
    void interStateLineUsesIgstOnly() {
        LineCalc c = CapitalPoCalculator.line(d("1"), d("50000"), "AMOUNT", d("2000"), d("18"), false);
        assertEquals(new BigDecimal("48000.00"), c.taxable());
        assertEquals(new BigDecimal("8640.00"), c.igst());
        assertEquals(BigDecimal.ZERO.setScale(2), c.cgst());
        assertEquals(new BigDecimal("56640.00"), c.lineTotal());
    }

    @Test
    void discountRulesAreEnforced() {
        assertThrows(IllegalArgumentException.class, () -> CapitalPoCalculator.line(d("1"), d("100"), "AMOUNT", d("101"), d("18"), true));
        assertThrows(IllegalArgumentException.class, () -> CapitalPoCalculator.line(d("1"), d("100"), "PERCENT", d("120"), d("18"), true));
        assertThrows(IllegalArgumentException.class, () -> CapitalPoCalculator.line(d("1"), d("100"), "BOGUS", d("1"), d("18"), true));
    }

    @Test
    void quantityAndRateValidation() {
        assertThrows(IllegalArgumentException.class, () -> CapitalPoCalculator.line(d("0"), d("100"), "NONE", null, d("18"), true));
        assertThrows(IllegalArgumentException.class, () -> CapitalPoCalculator.line(d("1"), d("-1"), "NONE", null, d("18"), true));
        assertThrows(IllegalArgumentException.class, () -> CapitalPoCalculator.line(d("1"), d("100"), "NONE", null, d("118"), true));
    }

    @Test
    void chargesAreTaxedAtTheirOwnRateAndSupplyType() {
        ChargeCalc intra = CapitalPoCalculator.charges(d("10000"), d("18"), true);
        assertEquals(new BigDecimal("900.00"), intra.cgst());
        assertEquals(new BigDecimal("11800.00"), intra.total());
        ChargeCalc inter = CapitalPoCalculator.charges(d("10000"), d("5"), false);
        assertEquals(new BigDecimal("500.00"), inter.igst());
        assertEquals(new BigDecimal("10500.00"), inter.total());
    }

    @Test
    void rollupReportsInstallationPendingPartialAndCompleted() {
        Map<String, Object> notStarted = Map.of("installation_required", true, "installation_status", "NOT_STARTED");
        Map<String, Object> inProgress = Map.of("installation_required", true, "installation_status", "IN_PROGRESS");
        Map<String, Object> done = Map.of("installation_required", true, "installation_status", "COMPLETED");
        Map<String, Object> noInstall = Map.of("installation_required", false, "installation_status", "NOT_REQUIRED");

        assertEquals("NOT_REQUIRED", CapitalPoService.rollup(List.of(noInstall), "installation_required", "installation_status"));
        assertEquals("PENDING", CapitalPoService.rollup(List.of(notStarted), "installation_required", "installation_status"));
        assertEquals("PARTIALLY_COMPLETED", CapitalPoService.rollup(List.of(done, notStarted), "installation_required", "installation_status"));
        assertEquals("PARTIALLY_COMPLETED", CapitalPoService.rollup(List.of(inProgress), "installation_required", "installation_status"));
        assertEquals("COMPLETED", CapitalPoService.rollup(List.of(done, done, noInstall), "installation_required", "installation_status"));
    }

    @Test
    void registrationRequiresWholeUnits() {
        assertEquals(3, CapitalPoService.wholeUnits(d("3"), "Assets"));
        assertThrows(CapitalPoException.class, () -> CapitalPoService.wholeUnits(d("2.5"), "Assets"));
    }

    @Test
    void identityMustBeAKnownRole() {
        CapitalPoService s = new CapitalPoService(null, null, "", true);
        assertEquals("CREATOR", s.actor("alice", null).role());
        assertEquals("APPROVER", s.actor("dan", "approver").role());
        CapitalPoException missing = assertThrows(CapitalPoException.class, () -> s.actor("", "CREATOR"));
        assertEquals(HttpStatus.UNAUTHORIZED, missing.getStatus());
        CapitalPoException unknown = assertThrows(CapitalPoException.class, () -> s.actor("x", "HACKER"));
        assertEquals(HttpStatus.FORBIDDEN, unknown.getStatus());
    }

    @Test
    void actorRecordIsPreserved() {
        Actor a = new CapitalPoService(null, null, "", false).actor("  Kiran ", "RECEIVER");
        assertEquals("Kiran", a.name());
        assertEquals("RECEIVER", a.role());
    }
}
