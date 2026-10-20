package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PriceHistoryDto {

    private String vendorName;
    private String vendorCode;
    private String itemCode;
    private String itemDescription;
    private String quotationNumber;
    private LocalDate quotationDate;
    private BigDecimal unitRate;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal deliveryCharges;
    private BigDecimal effectiveUnitCost;
    private String status;
    private String relatedPoNumber;
    private BigDecimal actualPurchaseRate;
    private Integer revisionNumber;

    public PriceHistoryDto() {}

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getItemDescription() { return itemDescription; }
    public void setItemDescription(String itemDescription) { this.itemDescription = itemDescription; }

    public String getQuotationNumber() { return quotationNumber; }
    public void setQuotationNumber(String quotationNumber) { this.quotationNumber = quotationNumber; }

    public LocalDate getQuotationDate() { return quotationDate; }
    public void setQuotationDate(LocalDate quotationDate) { this.quotationDate = quotationDate; }

    public BigDecimal getUnitRate() { return unitRate; }
    public void setUnitRate(BigDecimal unitRate) { this.unitRate = unitRate; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getDeliveryCharges() { return deliveryCharges; }
    public void setDeliveryCharges(BigDecimal deliveryCharges) { this.deliveryCharges = deliveryCharges; }

    public BigDecimal getEffectiveUnitCost() { return effectiveUnitCost; }
    public void setEffectiveUnitCost(BigDecimal effectiveUnitCost) { this.effectiveUnitCost = effectiveUnitCost; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRelatedPoNumber() { return relatedPoNumber; }
    public void setRelatedPoNumber(String relatedPoNumber) { this.relatedPoNumber = relatedPoNumber; }

    public BigDecimal getActualPurchaseRate() { return actualPurchaseRate; }
    public void setActualPurchaseRate(BigDecimal actualPurchaseRate) { this.actualPurchaseRate = actualPurchaseRate; }

    public Integer getRevisionNumber() { return revisionNumber; }
    public void setRevisionNumber(Integer revisionNumber) { this.revisionNumber = revisionNumber; }
}
