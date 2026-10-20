package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CreateClubbingBatchRequest {
    private String batchName;
    private String notes;
    private String createdBy;
    private List<ClubbingItemRequest> items = new ArrayList<>();

    public String getBatchName() { return batchName; }
    public void setBatchName(String batchName) { this.batchName = batchName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public List<ClubbingItemRequest> getItems() { return items; }
    public void setItems(List<ClubbingItemRequest> items) { this.items = items; }

    public static class ClubbingItemRequest {
        private String itemCode;
        private String itemName;
        private String description;
        private String category;
        private String uom;
        private BigDecimal clubbedQty = BigDecimal.ZERO;
        private BigDecimal requestedQty;
        private BigDecimal estRate = BigDecimal.ZERO;
        private List<ItemAllocationRequest> allocations = new ArrayList<>();

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

        public BigDecimal getClubbedQty() {
            if (clubbedQty != null && clubbedQty.compareTo(BigDecimal.ZERO) > 0) return clubbedQty;
            if (requestedQty != null) return requestedQty;
            return BigDecimal.ZERO;
        }
        public void setClubbedQty(BigDecimal clubbedQty) { this.clubbedQty = clubbedQty; }

        public BigDecimal getRequestedQty() { return requestedQty != null ? requestedQty : clubbedQty; }
        public void setRequestedQty(BigDecimal requestedQty) { this.requestedQty = requestedQty; }

        public BigDecimal getEstRate() { return estRate; }
        public void setEstRate(BigDecimal estRate) { this.estRate = estRate; }

        public List<ItemAllocationRequest> getAllocations() { return allocations; }
        public void setAllocations(List<ItemAllocationRequest> allocations) { this.allocations = allocations; }
    }

    public static class ItemAllocationRequest {
        private Long prId;
        private String prNumber;
        private Long prItemId;
        private String itemCode;
        private BigDecimal allocateQty = BigDecimal.ZERO;

        public Long getPrId() { return prId; }
        public void setPrId(Long prId) { this.prId = prId; }

        public String getPrNumber() { return prNumber; }
        public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

        public Long getPrItemId() { return prItemId; }
        public void setPrItemId(Long prItemId) { this.prItemId = prItemId; }

        public String getItemCode() { return itemCode; }
        public void setItemCode(String itemCode) { this.itemCode = itemCode; }

        public BigDecimal getAllocateQty() { return allocateQty; }
        public void setAllocateQty(BigDecimal allocateQty) { this.allocateQty = allocateQty; }
    }
}
