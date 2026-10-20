package com.silvermuller.seals.modules.purchase.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class VendorQuotationItem {

    private Long id;
    private Long quotationId;
    private Long prItemId;
    private Long itemId;
    @JsonAlias({"item_code", "itemCode"})
    private String itemCode;
    @JsonAlias({"item_description", "itemDescription", "description", "itemName", "item_name"})
    private String itemDescription;
    private String category = "FG";
    private String uom = "PCS";
    @JsonAlias({"quoted_quantity", "quotedQuantity", "quantity", "qty"})
    private BigDecimal quotedQuantity = BigDecimal.ONE;
    @JsonAlias({"unit_rate", "unitRate", "rate", "price"})
    private BigDecimal unitRate = BigDecimal.ZERO;
    private BigDecimal discountPercent = BigDecimal.ZERO;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private String taxType = "GST 18%";
    private BigDecimal taxPercent = new BigDecimal("18.00");
    private BigDecimal taxAmount = BigDecimal.ZERO;
    private BigDecimal additionalCharges = BigDecimal.ZERO;
    private BigDecimal lineTotal = BigDecimal.ZERO;
    private BigDecimal effectiveUnitCost = BigDecimal.ZERO;
    private OffsetDateTime createdAt;

    public VendorQuotationItem() {}

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }

    public Long getPrItemId() { return prItemId; }
    public void setPrItemId(Long prItemId) { this.prItemId = prItemId; }

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

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

    public BigDecimal getAdditionalCharges() { return additionalCharges; }
    public void setAdditionalCharges(BigDecimal additionalCharges) { this.additionalCharges = additionalCharges; }

    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }

    public BigDecimal getEffectiveUnitCost() { return effectiveUnitCost; }
    public void setEffectiveUnitCost(BigDecimal effectiveUnitCost) { this.effectiveUnitCost = effectiveUnitCost; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
