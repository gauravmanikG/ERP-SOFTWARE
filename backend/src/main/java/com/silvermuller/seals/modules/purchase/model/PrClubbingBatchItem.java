package com.silvermuller.seals.modules.purchase.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public class PrClubbingBatchItem {
    private Long id;
    private Long batchId;
    private String batchNumber;
    private String itemCode;
    private String itemName;
    private String description;
    private String category;
    private String uom;
    private BigDecimal totalClubbedQty = BigDecimal.ZERO;
    private BigDecimal purchasedQty = BigDecimal.ZERO;
    private BigDecimal remainingQty = BigDecimal.ZERO;
    private BigDecimal estRate = BigDecimal.ZERO;
    private String status = "PENDING"; // PENDING, PARTIALLY_PURCHASED, FULLY_PURCHASED
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<PrClubbingAllocation> allocations = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

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

    public BigDecimal getTotalClubbedQty() { return totalClubbedQty; }
    public void setTotalClubbedQty(BigDecimal totalClubbedQty) { this.totalClubbedQty = totalClubbedQty; }

    public BigDecimal getPurchasedQty() { return purchasedQty; }
    public void setPurchasedQty(BigDecimal purchasedQty) { this.purchasedQty = purchasedQty; }

    public BigDecimal getRemainingQty() { return remainingQty; }
    public void setRemainingQty(BigDecimal remainingQty) { this.remainingQty = remainingQty; }

    public BigDecimal getEstRate() { return estRate; }
    public void setEstRate(BigDecimal estRate) { this.estRate = estRate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<PrClubbingAllocation> getAllocations() { return allocations; }
    public void setAllocations(List<PrClubbingAllocation> allocations) { this.allocations = allocations; }
}
