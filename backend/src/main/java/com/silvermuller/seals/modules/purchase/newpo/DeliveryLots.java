package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Standard delivery scheduling for a PO: an item's quantity can be split into lots, each due on a date.
 * The lots of one item may not add up to more than the PO quantity of that item.
 */
public final class DeliveryLots {

    private DeliveryLots() {}

    /** One scheduled lot: the quantity of an item due on a date. */
    public record Lot(String itemCode, LocalDate date, BigDecimal qty) {}

    /**
     * Checks the lots against the PO. Every lot needs an item on the PO, a date on or after the PO date and a quantity above zero.
     * Per item, the lots together may not exceed that item's PO quantity.
     */
    public static void validate(List<Lot> lots, Map<String, BigDecimal> poQtyByItem, LocalDate poDate) {
        if (lots == null || lots.isEmpty()) return;
        Map<String, BigDecimal> scheduled = new HashMap<>();
        for (Lot lot : lots) {
            if (lot == null || lot.itemCode() == null || lot.itemCode().isBlank()) {
                throw bad("Every schedule lot needs an item.");
            }
            String code = lot.itemCode().trim();
            if (lot.date() == null) throw bad("Every schedule lot for " + code + " needs a date.");
            if (lot.qty() == null || lot.qty().signum() <= 0) {
                throw bad("Scheduled quantity for " + code + " must be above zero.");
            }
            if (poDate != null && lot.date().isBefore(poDate)) {
                throw bad("A schedule date for " + code + " is before the PO date.");
            }
            scheduled.merge(code, lot.qty(), BigDecimal::add);
        }
        for (Map.Entry<String, BigDecimal> e : scheduled.entrySet()) {
            BigDecimal ordered = poQtyByItem.get(e.getKey());
            if (ordered == null) throw bad(e.getKey() + " is not on this PO, so it cannot be scheduled.");
            if (e.getValue().compareTo(ordered) > 0) {
                throw bad("Scheduled quantity for " + e.getKey() + " is " + e.getValue().stripTrailingZeros().toPlainString()
                        + ", more than the PO quantity of " + ordered.stripTrailingZeros().toPlainString() + ".");
            }
        }
    }

    /** Schedule rows for the PO, numbered per item in date order (lot 1 is the earliest). */
    public static List<PurchaseOrderDeliverySchedule> toRows(String poNumber, List<Lot> lots) {
        List<PurchaseOrderDeliverySchedule> rows = new ArrayList<>();
        if (lots == null) return rows;
        List<Lot> sorted = new ArrayList<>(lots);
        sorted.sort(Comparator.comparing((Lot l) -> l.itemCode().trim()).thenComparing(Lot::date));
        Map<String, Integer> lotNo = new HashMap<>();
        for (Lot lot : sorted) {
            String code = lot.itemCode().trim();
            int no = lotNo.merge(code, 1, Integer::sum);
            PurchaseOrderDeliverySchedule row = new PurchaseOrderDeliverySchedule();
            row.setPoNumber(poNumber);
            row.setItemCode(code);
            row.setLotNumber(no);
            row.setScheduledDate(lot.date());
            row.setScheduledQty(lot.qty());
            row.setReceivedQty(BigDecimal.ZERO);
            row.setBalanceQty(lot.qty());
            row.setStatus("SCHEDULED");
            rows.add(row);
        }
        return rows;
    }

    private static NewPoException bad(String message) {
        return new NewPoException(HttpStatus.BAD_REQUEST, message);
    }
}
