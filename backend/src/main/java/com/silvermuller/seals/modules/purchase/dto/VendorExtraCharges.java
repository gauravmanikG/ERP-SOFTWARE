package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;

public class VendorExtraCharges {
    private BigDecimal deliveryFreight = BigDecimal.ZERO;
    private BigDecimal otherCharges = BigDecimal.ZERO;
    private BigDecimal roundOff = BigDecimal.ZERO;
    private String poType;
    private java.util.List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule> deliverySchedules = new java.util.ArrayList<>();
    private java.util.List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderPaymentMilestone> paymentMilestones = new java.util.ArrayList<>();

    public VendorExtraCharges() {}

    public VendorExtraCharges(BigDecimal deliveryFreight, BigDecimal otherCharges, BigDecimal roundOff) {
        this.deliveryFreight = deliveryFreight != null ? deliveryFreight : BigDecimal.ZERO;
        this.otherCharges = otherCharges != null ? otherCharges : BigDecimal.ZERO;
        this.roundOff = roundOff != null ? roundOff : BigDecimal.ZERO;
    }

    public BigDecimal getDeliveryFreight() {
        return deliveryFreight != null ? deliveryFreight : BigDecimal.ZERO;
    }
    public void setDeliveryFreight(BigDecimal deliveryFreight) {
        this.deliveryFreight = deliveryFreight;
    }

    public BigDecimal getOtherCharges() {
        return otherCharges != null ? otherCharges : BigDecimal.ZERO;
    }
    public void setOtherCharges(BigDecimal otherCharges) {
        this.otherCharges = otherCharges;
    }

    public BigDecimal getRoundOff() {
        return roundOff != null ? roundOff : BigDecimal.ZERO;
    }
    public void setRoundOff(BigDecimal roundOff) {
        this.roundOff = roundOff;
    }

    public String getPoType() {
        return poType;
    }
    public void setPoType(String poType) {
        this.poType = poType;
    }

    public java.util.List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule> getDeliverySchedules() {
        return deliverySchedules;
    }
    public void setDeliverySchedules(java.util.List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule> deliverySchedules) {
        this.deliverySchedules = deliverySchedules;
    }

    public java.util.List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderPaymentMilestone> getPaymentMilestones() {
        return paymentMilestones;
    }
    public void setPaymentMilestones(java.util.List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderPaymentMilestone> paymentMilestones) {
        this.paymentMilestones = paymentMilestones;
    }
}
