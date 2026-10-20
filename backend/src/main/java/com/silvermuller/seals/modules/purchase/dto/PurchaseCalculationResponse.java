package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class PurchaseCalculationResponse {
    private List<PurchaseItemLine> items = new ArrayList<>();
    private List<VendorSummaryGroup> vendorGroups = new ArrayList<>();

    private BigDecimal grandGross = BigDecimal.ZERO;
    private BigDecimal grandDiscount = BigDecimal.ZERO;
    private BigDecimal grandTaxable = BigDecimal.ZERO;
    private BigDecimal grandTax = BigDecimal.ZERO;
    private BigDecimal grandCgst = BigDecimal.ZERO;
    private BigDecimal grandSgst = BigDecimal.ZERO;
    private BigDecimal grandIgst = BigDecimal.ZERO;
    private BigDecimal grandItemsTotal = BigDecimal.ZERO;
    private BigDecimal grandDelivery = BigDecimal.ZERO;
    private BigDecimal grandOtherCharges = BigDecimal.ZERO;
    private BigDecimal grandRoundOff = BigDecimal.ZERO;
    private BigDecimal grandTotal = BigDecimal.ZERO;

    public PurchaseCalculationResponse() {}

    public List<PurchaseItemLine> getItems() { return items; }
    public void setItems(List<PurchaseItemLine> items) { this.items = items; }

    public List<VendorSummaryGroup> getVendorGroups() { return vendorGroups; }
    public void setVendorGroups(List<VendorSummaryGroup> vendorGroups) { this.vendorGroups = vendorGroups; }

    public BigDecimal getGrandGross() { return grandGross; }
    public void setGrandGross(BigDecimal grandGross) { this.grandGross = grandGross; }

    public BigDecimal getGrandDiscount() { return grandDiscount; }
    public void setGrandDiscount(BigDecimal grandDiscount) { this.grandDiscount = grandDiscount; }

    public BigDecimal getGrandTaxable() { return grandTaxable; }
    public void setGrandTaxable(BigDecimal grandTaxable) { this.grandTaxable = grandTaxable; }

    public BigDecimal getGrandTax() { return grandTax; }
    public void setGrandTax(BigDecimal grandTax) { this.grandTax = grandTax; }

    public BigDecimal getGrandCgst() { return grandCgst; }
    public void setGrandCgst(BigDecimal grandCgst) { this.grandCgst = grandCgst; }

    public BigDecimal getGrandSgst() { return grandSgst; }
    public void setGrandSgst(BigDecimal grandSgst) { this.grandSgst = grandSgst; }

    public BigDecimal getGrandIgst() { return grandIgst; }
    public void setGrandIgst(BigDecimal grandIgst) { this.grandIgst = grandIgst; }

    public BigDecimal getGrandItemsTotal() { return grandItemsTotal; }
    public void setGrandItemsTotal(BigDecimal grandItemsTotal) { this.grandItemsTotal = grandItemsTotal; }

    public BigDecimal getGrandDelivery() { return grandDelivery; }
    public void setGrandDelivery(BigDecimal grandDelivery) { this.grandDelivery = grandDelivery; }

    public BigDecimal getGrandOtherCharges() { return grandOtherCharges; }
    public void setGrandOtherCharges(BigDecimal grandOtherCharges) { this.grandOtherCharges = grandOtherCharges; }

    public BigDecimal getGrandRoundOff() { return grandRoundOff; }
    public void setGrandRoundOff(BigDecimal grandRoundOff) { this.grandRoundOff = grandRoundOff; }

    public BigDecimal getGrandTotal() { return grandTotal; }
    public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }
}
