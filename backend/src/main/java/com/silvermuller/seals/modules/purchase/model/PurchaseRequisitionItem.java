package com.silvermuller.seals.modules.purchase.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class PurchaseRequisitionItem {

    private Long id;
    @JsonAlias({"pr_id", "prId"})
    private Long prId;
    @JsonAlias({"pr_number", "prNumber"})
    private String prNumber;
    @JsonAlias({"item_code", "itemCode"})
    private String itemCode;
    /** Read-only for clients: the Item Master row the server resolved item_code to when the PR was saved. */
    private Long itemId;
    @JsonAlias({"item_name", "itemName"})
    private String itemName;
    private String description;
    private String uom;
    private String category = "FG";
    @JsonAlias({"req_qty", "reqQty", "quantity", "qty"})
    private BigDecimal reqQty = BigDecimal.ONE;
    @JsonAlias({"ordered_qty", "orderedQty"})
    private BigDecimal orderedQty = BigDecimal.ZERO;
    @JsonAlias({"remaining_qty", "remainingQty"})
    private BigDecimal remainingQty = null;
    /** Read-only for clients: quantity reserved in open vendor drafts. Never taken from a save request. */
    private BigDecimal draftedQty = BigDecimal.ZERO;
    @JsonAlias({"est_rate", "estRate", "rate", "price"})
    private BigDecimal estRate = BigDecimal.ZERO;
    @JsonAlias({"est_total", "estTotal", "total"})
    private BigDecimal estTotal = BigDecimal.ZERO;
    @JsonAlias({"hsn_code", "hsnCode", "hsn"})
    private String hsnCode;
    @JsonAlias({"drawing_no", "drawingNo"})
    private String drawingNo;
    @JsonAlias({"manufacturer_brand", "manufacturerBrand", "make"})
    private String manufacturerBrand;
    @JsonAlias({"required_by_date", "requiredByDate", "required_date", "requiredDate"})
    private java.time.LocalDate requiredByDate;
    private String remarks;
    private OffsetDateTime createdAt;

    public PurchaseRequisitionItem() {}

    public String getHsnCode() { return hsnCode; }
    public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }

    public String getDrawingNo() { return drawingNo; }
    public void setDrawingNo(String drawingNo) { this.drawingNo = drawingNo; }

    public String getManufacturerBrand() { return manufacturerBrand; }
    public void setManufacturerBrand(String manufacturerBrand) { this.manufacturerBrand = manufacturerBrand; }

    public java.time.LocalDate getRequiredByDate() { return requiredByDate; }
    public void setRequiredByDate(java.time.LocalDate requiredByDate) { this.requiredByDate = requiredByDate; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPrId() { return prId; }
    public void setPrId(Long prId) { this.prId = prId; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getUom() { return uom; }
    public void setUom(String uom) { this.uom = uom; }

    public BigDecimal getReqQty() { return reqQty; }
    public void setReqQty(BigDecimal reqQty) { this.reqQty = reqQty; }

    public BigDecimal getOrderedQty() { return orderedQty; }
    public void setOrderedQty(BigDecimal orderedQty) { this.orderedQty = orderedQty; }

    public BigDecimal getRemainingQty() { return remainingQty; }
    public void setRemainingQty(BigDecimal remainingQty) { this.remainingQty = remainingQty; }

    public BigDecimal getDraftedQty() { return draftedQty; }
    public void setDraftedQty(BigDecimal draftedQty) { this.draftedQty = draftedQty; }

    public BigDecimal getEstRate() { return estRate; }
    public void setEstRate(BigDecimal estRate) { this.estRate = estRate; }

    public BigDecimal getEstTotal() { return estTotal; }
    public void setEstTotal(BigDecimal estTotal) { this.estTotal = estTotal; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
