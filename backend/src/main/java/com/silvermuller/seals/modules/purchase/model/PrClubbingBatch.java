package com.silvermuller.seals.modules.purchase.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public class PrClubbingBatch {
    private Long id;
    private String batchNumber;
    private String batchName;
    private String status; // DRAFT, READY_FOR_PURCHASE, PARTIALLY_PURCHASED, FULLY_PURCHASED, CANCELLED
    private Integer totalItemsCount = 0;
    private BigDecimal totalClubbedQty = BigDecimal.ZERO;
    private BigDecimal purchasedQty = BigDecimal.ZERO;
    private BigDecimal remainingQty = BigDecimal.ZERO;
    private String notes;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<PrClubbingBatchItem> items = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public String getBatchName() { return batchName; }
    public void setBatchName(String batchName) { this.batchName = batchName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTotalItemsCount() { return totalItemsCount; }
    public void setTotalItemsCount(Integer totalItemsCount) { this.totalItemsCount = totalItemsCount; }

    public BigDecimal getTotalClubbedQty() { return totalClubbedQty; }
    public void setTotalClubbedQty(BigDecimal totalClubbedQty) { this.totalClubbedQty = totalClubbedQty; }

    public BigDecimal getPurchasedQty() { return purchasedQty; }
    public void setPurchasedQty(BigDecimal purchasedQty) { this.purchasedQty = purchasedQty; }

    public BigDecimal getRemainingQty() { return remainingQty; }
    public void setRemainingQty(BigDecimal remainingQty) { this.remainingQty = remainingQty; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<PrClubbingBatchItem> getItems() { return items; }
    public void setItems(List<PrClubbingBatchItem> items) { this.items = items; }
}
