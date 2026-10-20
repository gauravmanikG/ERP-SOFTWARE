package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;

public class PurchaseItemLine {
    private String itemCode;
    private String itemName;
    private String description;
    private String category;
    private String uom;
    private String vendorCode;
    private String vendorName;
    private BigDecimal quantity;
    private BigDecimal unitRate;
    private BigDecimal discountPercent;
    private BigDecimal manualDiscount;
    private String taxType; // "GST" or "IGST"
    private BigDecimal taxPercent; // 0, 5, 12, 18, 28
    private BigDecimal deliveryCharges;
    private BigDecimal otherCharges;
    private String expectedDeliveryDate;
    private String deliveryLocation;
    private String remarks;

    // HSN and Sub-Tax fields
    private String hsnCode;
    private String hsnDescription;
    private BigDecimal cgstRate = BigDecimal.ZERO;
    private BigDecimal cgstAmount = BigDecimal.ZERO;
    private BigDecimal sgstRate = BigDecimal.ZERO;
    private BigDecimal sgstAmount = BigDecimal.ZERO;
    private BigDecimal igstRate = BigDecimal.ZERO;
    private BigDecimal igstAmount = BigDecimal.ZERO;

    // Calculated fields populated by calculation engine
    private BigDecimal grossAmount;
    private BigDecimal discountAmount;
    private BigDecimal taxableAmount;
    private BigDecimal taxAmount;
    private BigDecimal itemTotal;

    public PurchaseItemLine() {
        this.quantity = BigDecimal.ZERO;
        this.unitRate = BigDecimal.ZERO;
        this.discountPercent = BigDecimal.ZERO;
        this.manualDiscount = BigDecimal.ZERO;
        this.taxPercent = BigDecimal.ZERO;
        this.deliveryCharges = BigDecimal.ZERO;
        this.otherCharges = BigDecimal.ZERO;
        this.grossAmount = BigDecimal.ZERO;
        this.discountAmount = BigDecimal.ZERO;
        this.taxableAmount = BigDecimal.ZERO;
        this.taxAmount = BigDecimal.ZERO;
        this.itemTotal = BigDecimal.ZERO;
        this.taxType = "GST";
        this.cgstRate = BigDecimal.ZERO;
        this.cgstAmount = BigDecimal.ZERO;
        this.sgstRate = BigDecimal.ZERO;
        this.sgstAmount = BigDecimal.ZERO;
        this.igstRate = BigDecimal.ZERO;
        this.igstAmount = BigDecimal.ZERO;
    }

    public String getHsnCode() { return hsnCode; }
    public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }

    public String getHsnDescription() { return hsnDescription; }
    public void setHsnDescription(String hsnDescription) { this.hsnDescription = hsnDescription; }

    public BigDecimal getCgstRate() { return cgstRate != null ? cgstRate : BigDecimal.ZERO; }
    public void setCgstRate(BigDecimal cgstRate) { this.cgstRate = cgstRate; }

    public BigDecimal getCgstAmount() { return cgstAmount != null ? cgstAmount : BigDecimal.ZERO; }
    public void setCgstAmount(BigDecimal cgstAmount) { this.cgstAmount = cgstAmount; }

    public BigDecimal getSgstRate() { return sgstRate != null ? sgstRate : BigDecimal.ZERO; }
    public void setSgstRate(BigDecimal sgstRate) { this.sgstRate = sgstRate; }

    public BigDecimal getSgstAmount() { return sgstAmount != null ? sgstAmount : BigDecimal.ZERO; }
    public void setSgstAmount(BigDecimal sgstAmount) { this.sgstAmount = sgstAmount; }

    public BigDecimal getIgstRate() { return igstRate != null ? igstRate : BigDecimal.ZERO; }
    public void setIgstRate(BigDecimal igstRate) { this.igstRate = igstRate; }

    public BigDecimal getIgstAmount() { return igstAmount != null ? igstAmount : BigDecimal.ZERO; }
    public void setIgstAmount(BigDecimal igstAmount) { this.igstAmount = igstAmount; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUom() { return uom; }
    public void setUom(String uom) { this.uom = uom; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public BigDecimal getQuantity() { return quantity != null ? quantity : BigDecimal.ZERO; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getUnitRate() { return unitRate != null ? unitRate : BigDecimal.ZERO; }
    public void setUnitRate(BigDecimal unitRate) { this.unitRate = unitRate; }

    public BigDecimal getDiscountPercent() { return discountPercent != null ? discountPercent : BigDecimal.ZERO; }
    public void setDiscountPercent(BigDecimal discountPercent) { this.discountPercent = discountPercent; }

    public BigDecimal getManualDiscount() { return manualDiscount != null ? manualDiscount : BigDecimal.ZERO; }
    public void setManualDiscount(BigDecimal manualDiscount) { this.manualDiscount = manualDiscount; }

    public String getTaxType() { return taxType; }
    public void setTaxType(String taxType) { this.taxType = taxType; }

    public BigDecimal getTaxPercent() { return taxPercent != null ? taxPercent : BigDecimal.ZERO; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }
    public BigDecimal getTaxRate() { return getTaxPercent(); }
    public void setTaxRate(BigDecimal taxRate) { this.taxPercent = taxRate; }

    public BigDecimal getDeliveryCharges() { return deliveryCharges != null ? deliveryCharges : BigDecimal.ZERO; }
    public void setDeliveryCharges(BigDecimal deliveryCharges) { this.deliveryCharges = deliveryCharges; }

    public BigDecimal getOtherCharges() { return otherCharges != null ? otherCharges : BigDecimal.ZERO; }
    public void setOtherCharges(BigDecimal otherCharges) { this.otherCharges = otherCharges; }

    public String getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public void setExpectedDeliveryDate(String expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }

    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public BigDecimal getGrossAmount() { return grossAmount; }
    public void setGrossAmount(BigDecimal grossAmount) { this.grossAmount = grossAmount; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(BigDecimal taxableAmount) { this.taxableAmount = taxableAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getItemTotal() { return itemTotal; }
    public void setItemTotal(BigDecimal itemTotal) { this.itemTotal = itemTotal; }

    private String sourceQuotationNumber;
    private Long sourceQuotationId;
    private Long prItemId;
    private String prNumber;

    public String getSourceQuotationNumber() { return sourceQuotationNumber; }
    public void setSourceQuotationNumber(String sourceQuotationNumber) { this.sourceQuotationNumber = sourceQuotationNumber; }

    public Long getSourceQuotationId() { return sourceQuotationId; }
    public void setSourceQuotationId(Long sourceQuotationId) { this.sourceQuotationId = sourceQuotationId; }

    public Long getPrItemId() { return prItemId; }
    public void setPrItemId(Long prItemId) { this.prItemId = prItemId; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    private Long clubbingBatchId;
    private String clubbingBatchNumber;
    private Long clubbingBatchItemId;

    public Long getClubbingBatchId() { return clubbingBatchId; }
    public void setClubbingBatchId(Long clubbingBatchId) { this.clubbingBatchId = clubbingBatchId; }

    public String getClubbingBatchNumber() { return clubbingBatchNumber; }
    public void setClubbingBatchNumber(String clubbingBatchNumber) { this.clubbingBatchNumber = clubbingBatchNumber; }

    public Long getClubbingBatchItemId() { return clubbingBatchItemId; }
    public void setClubbingBatchItemId(Long clubbingBatchItemId) { this.clubbingBatchItemId = clubbingBatchItemId; }
}
