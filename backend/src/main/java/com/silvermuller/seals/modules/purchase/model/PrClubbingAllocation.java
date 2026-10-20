package com.silvermuller.seals.modules.purchase.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class PrClubbingAllocation {
    private Long id;
    private Long batchId;
    private Long batchItemId;
    private Long prId;
    private String prNumber;
    private Long prItemId;
    private String itemCode;
    private BigDecimal allocatedQty = BigDecimal.ZERO;
    private BigDecimal purchasedQty = BigDecimal.ZERO;
    private BigDecimal remainingQty = BigDecimal.ZERO;
    private String poId;
    private String poNumber;
    private String status = "ALLOCATED"; // ALLOCATED, PURCHASED, RELEASED
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public Long getBatchItemId() { return batchItemId; }
    public void setBatchItemId(Long batchItemId) { this.batchItemId = batchItemId; }

    public Long getPrId() { return prId; }
    public void setPrId(Long prId) { this.prId = prId; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public Long getPrItemId() { return prItemId; }
    public void setPrItemId(Long prItemId) { this.prItemId = prItemId; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public BigDecimal getAllocatedQty() { return allocatedQty; }
    public void setAllocatedQty(BigDecimal allocatedQty) { this.allocatedQty = allocatedQty; }

    public BigDecimal getPurchasedQty() { return purchasedQty; }
    public void setPurchasedQty(BigDecimal purchasedQty) { this.purchasedQty = purchasedQty; }

    public BigDecimal getRemainingQty() { return remainingQty; }
    public void setRemainingQty(BigDecimal remainingQty) { this.remainingQty = remainingQty; }

    public String getPoId() { return poId; }
    public void setPoId(String poId) { this.poId = poId; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
