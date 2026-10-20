package com.silvermuller.seals.modules.purchase.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;

public class GoodsReceiptNoteItem {
    private Long id;
    private Long grnId;
    private String grnNumber;
    private String poNumber;
    @JsonAlias({"itemCode", "item_code"})
    private String itemCode;
    @JsonAlias({"itemName", "item_name"})
    private String itemName;
    private String description;
    private String category;
    private String uom;
    @JsonAlias({"poOrderedQty", "po_ordered_qty", "orderQty", "orderedQty"})
    private BigDecimal poOrderedQty = BigDecimal.ZERO;
    @JsonAlias({"priorReceivedQty", "prior_received_qty"})
    private BigDecimal priorReceivedQty = BigDecimal.ZERO;
    @JsonAlias({"balanceExpectedQty", "balance_expected_qty"})
    private BigDecimal balanceExpectedQty = BigDecimal.ZERO;
    @JsonAlias({"challanQty", "challan_qty"})
    private BigDecimal challanQty = BigDecimal.ZERO;
    @JsonAlias({"receivedQty", "received_qty"})
    private BigDecimal receivedQty = BigDecimal.ZERO;
    @JsonAlias({"acceptedQty", "accepted_qty"})
    private BigDecimal acceptedQty = BigDecimal.ZERO;
    @JsonAlias({"rejectedQty", "rejected_qty"})
    private BigDecimal rejectedQty = BigDecimal.ZERO;
    @JsonAlias({"pendingInspectionQty", "pending_inspection_qty"})
    private BigDecimal pendingInspectionQty = BigDecimal.ZERO;
    @JsonAlias({"rejectionReason", "rejection_reason"})
    private String rejectionReason;
    private String storageBin;
    @JsonAlias({"unitRate", "unit_rate", "rate", "price"})
    private BigDecimal unitRate = BigDecimal.ZERO;
    @JsonAlias({"taxPercent", "tax_percent"})
    private BigDecimal taxPercent = BigDecimal.ZERO;
    @JsonAlias({"itemTotal", "item_total"})
    private BigDecimal itemTotal = BigDecimal.ZERO;
    private String remarks;
    private String createdAt;

    public GoodsReceiptNoteItem() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGrnId() { return grnId; }
    public void setGrnId(Long grnId) { this.grnId = grnId; }

    public String getGrnNumber() { return grnNumber; }
    public void setGrnNumber(String grnNumber) { this.grnNumber = grnNumber; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

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

    public BigDecimal getPoOrderedQty() { return poOrderedQty; }
    public void setPoOrderedQty(BigDecimal poOrderedQty) { this.poOrderedQty = poOrderedQty; }

    public BigDecimal getPriorReceivedQty() { return priorReceivedQty; }
    public void setPriorReceivedQty(BigDecimal priorReceivedQty) { this.priorReceivedQty = priorReceivedQty; }

    public BigDecimal getBalanceExpectedQty() { return balanceExpectedQty; }
    public void setBalanceExpectedQty(BigDecimal balanceExpectedQty) { this.balanceExpectedQty = balanceExpectedQty; }

    public BigDecimal getChallanQty() { return challanQty; }
    public void setChallanQty(BigDecimal challanQty) { this.challanQty = challanQty; }

    public BigDecimal getReceivedQty() { return receivedQty; }
    public void setReceivedQty(BigDecimal receivedQty) { this.receivedQty = receivedQty; }

    public BigDecimal getAcceptedQty() { return acceptedQty; }
    public void setAcceptedQty(BigDecimal acceptedQty) { this.acceptedQty = acceptedQty; }

    public BigDecimal getRejectedQty() { return rejectedQty; }
    public void setRejectedQty(BigDecimal rejectedQty) { this.rejectedQty = rejectedQty; }

    public BigDecimal getPendingInspectionQty() { return pendingInspectionQty; }
    public void setPendingInspectionQty(BigDecimal pendingInspectionQty) { this.pendingInspectionQty = pendingInspectionQty; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getStorageBin() { return storageBin; }
    public void setStorageBin(String storageBin) { this.storageBin = storageBin; }

    public BigDecimal getUnitRate() { return unitRate; }
    public void setUnitRate(BigDecimal unitRate) { this.unitRate = unitRate; }

    public BigDecimal getTaxPercent() { return taxPercent; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }

    public BigDecimal getItemTotal() { return itemTotal; }
    public void setItemTotal(BigDecimal itemTotal) { this.itemTotal = itemTotal; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
