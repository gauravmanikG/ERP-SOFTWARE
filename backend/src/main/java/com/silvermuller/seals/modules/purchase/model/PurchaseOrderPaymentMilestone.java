package com.silvermuller.seals.modules.purchase.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public class PurchaseOrderPaymentMilestone {

    private Long id;
    private Long poId;
    private String poNumber;
    private Integer milestoneSequence = 1;
    private String milestoneTitle;
    private String triggerEvent = "UPON_LOT_GRN"; // ON_PO_RELEASE, UPON_LOT_GRN, CREDIT_PERIOD, ADVANCE
    private Integer linkedLotNumber;
    private BigDecimal percentage;
    private BigDecimal milestoneAmount = BigDecimal.ZERO;
    private Integer creditDays = 15;
    private LocalDate dueDate;
    private String paymentStatus = "PENDING"; // PENDING, DUE, PAID, ON_HOLD
    private BigDecimal paidAmount = BigDecimal.ZERO;
    private OffsetDateTime paidAt;
    private OffsetDateTime createdAt;

    public PurchaseOrderPaymentMilestone() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPoId() { return poId; }
    public void setPoId(Long poId) { this.poId = poId; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

    public Integer getMilestoneSequence() { return milestoneSequence; }
    public void setMilestoneSequence(Integer milestoneSequence) { this.milestoneSequence = milestoneSequence; }

    public String getMilestoneTitle() { return milestoneTitle; }
    public void setMilestoneTitle(String milestoneTitle) { this.milestoneTitle = milestoneTitle; }

    public String getTriggerEvent() { return triggerEvent; }
    public void setTriggerEvent(String triggerEvent) { this.triggerEvent = triggerEvent; }

    public Integer getLinkedLotNumber() { return linkedLotNumber; }
    public void setLinkedLotNumber(Integer linkedLotNumber) { this.linkedLotNumber = linkedLotNumber; }

    public BigDecimal getPercentage() { return percentage; }
    public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }

    public BigDecimal getMilestoneAmount() { return milestoneAmount; }
    public void setMilestoneAmount(BigDecimal milestoneAmount) { this.milestoneAmount = milestoneAmount; }

    public Integer getCreditDays() { return creditDays; }
    public void setCreditDays(Integer creditDays) { this.creditDays = creditDays; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public OffsetDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(OffsetDateTime paidAt) { this.paidAt = paidAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
