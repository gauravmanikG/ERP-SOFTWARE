package com.silvermuller.seals.modules.purchase.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public class PurchaseOrderDeliverySchedule {

    private Long id;
    private String poNumber;
    private String itemCode;
    private Integer lotNumber = 1;
    private LocalDate scheduledDate;
    private BigDecimal scheduledQty = BigDecimal.ZERO;
    private BigDecimal receivedQty = BigDecimal.ZERO;
    private BigDecimal balanceQty = BigDecimal.ZERO;
    private String destinationStore;
    private String status = "SCHEDULED"; // SCHEDULED, PARTIALLY_RECEIVED, COMPLETED, OVERDUE
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public PurchaseOrderDeliverySchedule() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public Integer getLotNumber() { return lotNumber; }
    public void setLotNumber(Integer lotNumber) { this.lotNumber = lotNumber; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public BigDecimal getScheduledQty() { return scheduledQty; }
    public void setScheduledQty(BigDecimal scheduledQty) { this.scheduledQty = scheduledQty; }

    public BigDecimal getReceivedQty() { return receivedQty; }
    public void setReceivedQty(BigDecimal receivedQty) { this.receivedQty = receivedQty; }

    public BigDecimal getBalanceQty() { return balanceQty; }
    public void setBalanceQty(BigDecimal balanceQty) { this.balanceQty = balanceQty; }

    public String getDestinationStore() { return destinationStore; }
    public void setDestinationStore(String destinationStore) { this.destinationStore = destinationStore; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
