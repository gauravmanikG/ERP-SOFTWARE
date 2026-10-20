package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class RateComparisonDto {

    private Long quotationId;
    private String quotationNumber;
    private Long vendorId;
    private String vendorCode;
    private String vendorName;
    private LocalDate quotationDate;
    private LocalDate validUntil;
    private String paymentTerms;
    private String deliveryTime;
    private String itemCode;
    private String itemDescription;
    private String uom;
    private BigDecimal quotedQuantity;
    private BigDecimal unitRate;
    private BigDecimal discountPercent;
    private BigDecimal discountAmount;
    private String taxType;
    private BigDecimal taxPercent;
    private BigDecimal taxAmount;
    private BigDecimal itemAdditionalCharges;
    private BigDecimal quotationDeliveryCharges;
    private BigDecimal effectiveUnitCost;
    private BigDecimal calculatedTotalForRequestedQty;
    private BigDecimal previousPurchaseRate;
    private BigDecimal diffFromLowestPrice;
    private BigDecimal diffPercentFromLowest;
    private Boolean isLowestPrice = false;
    private String status;

    public RateComparisonDto() {}

    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }

    public String getQuotationNumber() { return quotationNumber; }
    public void setQuotationNumber(String quotationNumber) { this.quotationNumber = quotationNumber; }

    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public LocalDate getQuotationDate() { return quotationDate; }
    public void setQuotationDate(LocalDate quotationDate) { this.quotationDate = quotationDate; }

    public LocalDate getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getItemDescription() { return itemDescription; }
    public void setItemDescription(String itemDescription) { this.itemDescription = itemDescription; }

    public String getUom() { return uom; }
    public void setUom(String uom) { this.uom = uom; }

    public BigDecimal getQuotedQuantity() { return quotedQuantity; }
    public void setQuotedQuantity(BigDecimal quotedQuantity) { this.quotedQuantity = quotedQuantity; }

    public BigDecimal getUnitRate() { return unitRate; }
    public void setUnitRate(BigDecimal unitRate) { this.unitRate = unitRate; }

    public BigDecimal getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(BigDecimal discountPercent) { this.discountPercent = discountPercent; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public String getTaxType() { return taxType; }
    public void setTaxType(String taxType) { this.taxType = taxType; }

    public BigDecimal getTaxPercent() { return taxPercent; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getItemAdditionalCharges() { return itemAdditionalCharges; }
    public void setItemAdditionalCharges(BigDecimal itemAdditionalCharges) { this.itemAdditionalCharges = itemAdditionalCharges; }

    public BigDecimal getQuotationDeliveryCharges() { return quotationDeliveryCharges; }
    public void setQuotationDeliveryCharges(BigDecimal quotationDeliveryCharges) { this.quotationDeliveryCharges = quotationDeliveryCharges; }

    public BigDecimal getEffectiveUnitCost() { return effectiveUnitCost; }
    public void setEffectiveUnitCost(BigDecimal effectiveUnitCost) { this.effectiveUnitCost = effectiveUnitCost; }

    public BigDecimal getCalculatedTotalForRequestedQty() { return calculatedTotalForRequestedQty; }
    public void setCalculatedTotalForRequestedQty(BigDecimal calculatedTotalForRequestedQty) { this.calculatedTotalForRequestedQty = calculatedTotalForRequestedQty; }

    public BigDecimal getPreviousPurchaseRate() { return previousPurchaseRate; }
    public void setPreviousPurchaseRate(BigDecimal previousPurchaseRate) { this.previousPurchaseRate = previousPurchaseRate; }

    public BigDecimal getDiffFromLowestPrice() { return diffFromLowestPrice; }
    public void setDiffFromLowestPrice(BigDecimal diffFromLowestPrice) { this.diffFromLowestPrice = diffFromLowestPrice; }

    public BigDecimal getDiffPercentFromLowest() { return diffPercentFromLowest; }
    public void setDiffPercentFromLowest(BigDecimal diffPercentFromLowest) { this.diffPercentFromLowest = diffPercentFromLowest; }

    public Boolean getIsLowestPrice() { return isLowestPrice; }
    public void setIsLowestPrice(Boolean lowestPrice) { isLowestPrice = lowestPrice; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
