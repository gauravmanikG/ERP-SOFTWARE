package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class VendorAnalysisDto {

    private String vendorName;
    private String vendorCode;
    private long itemsQuotedCount;
    private long quotationsSubmittedCount;
    private long quotationsSelectedCount;
    private double selectionRatePercent;
    private String avgDeliveryTime;
    private String commonPaymentTerms;
    private BigDecimal totalQuotedAmount = BigDecimal.ZERO;
    private List<VendorQuotedItemSummary> items = new ArrayList<>();

    public VendorAnalysisDto() {}

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

    public long getItemsQuotedCount() { return itemsQuotedCount; }
    public void setItemsQuotedCount(long itemsQuotedCount) { this.itemsQuotedCount = itemsQuotedCount; }

    public long getQuotationsSubmittedCount() { return quotationsSubmittedCount; }
    public void setQuotationsSubmittedCount(long quotationsSubmittedCount) { this.quotationsSubmittedCount = quotationsSubmittedCount; }

    public long getQuotationsSelectedCount() { return quotationsSelectedCount; }
    public void setQuotationsSelectedCount(long quotationsSelectedCount) { this.quotationsSelectedCount = quotationsSelectedCount; }

    public double getSelectionRatePercent() { return selectionRatePercent; }
    public void setSelectionRatePercent(double selectionRatePercent) { this.selectionRatePercent = selectionRatePercent; }

    public String getAvgDeliveryTime() { return avgDeliveryTime; }
    public void setAvgDeliveryTime(String avgDeliveryTime) { this.avgDeliveryTime = avgDeliveryTime; }

    public String getCommonPaymentTerms() { return commonPaymentTerms; }
    public void setCommonPaymentTerms(String commonPaymentTerms) { this.commonPaymentTerms = commonPaymentTerms; }

    public BigDecimal getTotalQuotedAmount() { return totalQuotedAmount; }
    public void setTotalQuotedAmount(BigDecimal totalQuotedAmount) { this.totalQuotedAmount = totalQuotedAmount; }

    public List<VendorQuotedItemSummary> getItems() { return items; }
    public void setItems(List<VendorQuotedItemSummary> items) { this.items = items; }

    public static class VendorQuotedItemSummary {
        private String itemCode;
        private String itemDescription;
        private BigDecimal latestQuotedPrice;
        private BigDecimal previousQuotedPrice;
        private BigDecimal priceDifference;
        private BigDecimal priceDifferencePercent;

        public VendorQuotedItemSummary() {}

        public String getItemCode() { return itemCode; }
        public void setItemCode(String itemCode) { this.itemCode = itemCode; }

        public String getItemDescription() { return itemDescription; }
        public void setItemDescription(String itemDescription) { this.itemDescription = itemDescription; }

        public BigDecimal getLatestQuotedPrice() { return latestQuotedPrice; }
        public void setLatestQuotedPrice(BigDecimal latestQuotedPrice) { this.latestQuotedPrice = latestQuotedPrice; }

        public BigDecimal getPreviousQuotedPrice() { return previousQuotedPrice; }
        public void setPreviousQuotedPrice(BigDecimal previousQuotedPrice) { this.previousQuotedPrice = previousQuotedPrice; }

        public BigDecimal getPriceDifference() { return priceDifference; }
        public void setPriceDifference(BigDecimal priceDifference) { this.priceDifference = priceDifference; }

        public BigDecimal getPriceDifferencePercent() { return priceDifferencePercent; }
        public void setPriceDifferencePercent(BigDecimal priceDifferencePercent) { this.priceDifferencePercent = priceDifferencePercent; }
    }
}
