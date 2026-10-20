package com.silvermuller.seals.modules.purchase.servicepo;

import com.silvermuller.seals.modules.purchase.servicepo.ServicePoCalculator.Input;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoCalculator.PricingMethod;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoCalculator.Result;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ServicePoCalculatorTest {

    private static final BigDecimal GST_18 = new BigDecimal("18");

    private static Input input(PricingMethod method, String qty, String rate, String fixed, String discType,
                               String discValue, String additional, BigDecimal gst, boolean intra) {
        return new Input(method,
                qty == null ? null : new BigDecimal(qty),
                rate == null ? null : new BigDecimal(rate),
                fixed == null ? null : new BigDecimal(fixed),
                discType, discValue == null ? BigDecimal.ZERO : new BigDecimal(discValue),
                additional == null ? BigDecimal.ZERO : new BigDecimal(additional),
                gst, BigDecimal.ZERO, intra,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    @Test
    void hourlyRateMultipliesQuantityAndSplitsIntraStateGst() {
        Result r = ServicePoCalculator.calculate(
                input(PricingMethod.HOURLY, "10", "250.50", null, "NONE", null, null, GST_18, true));

        assertEquals(new BigDecimal("2505.00"), r.basicAmount());
        assertEquals(new BigDecimal("2505.00"), r.taxableAmount());
        assertEquals(new BigDecimal("9.00"), r.cgstRate());
        assertEquals(new BigDecimal("225.45"), r.cgstAmount());
        assertEquals(new BigDecimal("225.45"), r.sgstAmount());
        assertEquals(BigDecimal.ZERO.setScale(2), r.igstAmount());
        assertEquals(new BigDecimal("450.90"), r.taxAmount());
        assertEquals(new BigDecimal("2955.90"), r.totalAmount());
    }

    @Test
    void interStateUsesIgstOnly() {
        Result r = ServicePoCalculator.calculate(
                input(PricingMethod.FIXED_PRICE, null, null, "10000", "NONE", null, null, GST_18, false));

        assertEquals(new BigDecimal("18.00"), r.igstRate());
        assertEquals(new BigDecimal("1800.00"), r.igstAmount());
        assertEquals(BigDecimal.ZERO.setScale(2), r.cgstAmount());
        assertEquals(BigDecimal.ZERO.setScale(2), r.sgstAmount());
        assertEquals(new BigDecimal("11800.00"), r.totalAmount());
    }

    @Test
    void percentDiscountAndAdditionalChargesAreTaxed() {
        Result r = ServicePoCalculator.calculate(
                input(PricingMethod.QUANTITY_RATE, "4", "1000", null, "PERCENT", "10", "500", GST_18, false));

        assertEquals(new BigDecimal("4000.00"), r.basicAmount());
        assertEquals(new BigDecimal("400.00"), r.discountAmount());
        assertEquals(new BigDecimal("4100.00"), r.taxableAmount());
        assertEquals(new BigDecimal("738.00"), r.igstAmount());
    }

    @Test
    void zeroRateTaxabilityProducesNoTax() {
        Result r = ServicePoCalculator.calculate(
                input(PricingMethod.FIXED_PRICE, null, null, "5000", "NONE", null, null, BigDecimal.ZERO, true));

        assertEquals(BigDecimal.ZERO.setScale(2), r.taxAmount());
        assertEquals(new BigDecimal("5000.00"), r.totalAmount());
    }

    @Test
    void advanceRetentionAndTdsAreCalculatedOnBackend() {
        Input in = new Input(PricingMethod.FIXED_PRICE, null, null, new BigDecimal("100000"),
                "NONE", BigDecimal.ZERO, BigDecimal.ZERO, GST_18, BigDecimal.ZERO, true,
                new BigDecimal("30"), new BigDecimal("5"), new BigDecimal("2"));
        Result r = ServicePoCalculator.calculate(in);

        assertEquals(new BigDecimal("118000.00"), r.totalAmount());
        assertEquals(new BigDecimal("35400.00"), r.advanceAmount());
        assertEquals(new BigDecimal("5900.00"), r.retentionAmount());
        assertEquals(new BigDecimal("2000.00"), r.tdsAmount());
    }

    @Test
    void rejectsNonPositiveQuantityAndRate() {
        IllegalArgumentException q = assertThrows(IllegalArgumentException.class, () ->
                ServicePoCalculator.calculate(input(PricingMethod.DAILY, "0", "100", null, "NONE", null, null, GST_18, true)));
        assertTrue(q.getMessage().contains("Quantity"));

        IllegalArgumentException rate = assertThrows(IllegalArgumentException.class, () ->
                ServicePoCalculator.calculate(input(PricingMethod.DAILY, "3", "-5", null, "NONE", null, null, GST_18, true)));
        assertTrue(rate.getMessage().contains("Rate"));
    }

    @Test
    void rejectsDiscountLargerThanBasicAndBadPercent() {
        assertThrows(IllegalArgumentException.class, () ->
                ServicePoCalculator.calculate(input(PricingMethod.FIXED_PRICE, null, null, "1000", "AMOUNT", "1500", null, GST_18, true)));
        assertThrows(IllegalArgumentException.class, () ->
                ServicePoCalculator.calculate(input(PricingMethod.FIXED_PRICE, null, null, "1000", "PERCENT", "120", null, GST_18, true)));
    }

    @Test
    void rejectsZeroFixedAmount() {
        assertThrows(IllegalArgumentException.class, () ->
                ServicePoCalculator.calculate(input(PricingMethod.MILESTONE, null, null, "0", "NONE", null, null, GST_18, true)));
    }

    @Test
    void moneyRoundsHalfUpToTwoDecimals() {
        assertEquals(new BigDecimal("1.01"), ServicePoCalculator.money(new BigDecimal("1.005")));
        assertEquals(new BigDecimal("2.00"), ServicePoCalculator.money(new BigDecimal("2")));
    }
}
