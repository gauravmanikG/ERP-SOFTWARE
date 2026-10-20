package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class VendorSummaryGroup {
    private String vendorCode;
    private String vendorName;
    private String vendorGstin;
    private String vendorPan;
    private String contactPerson;
    private String phone;
    private String email;
    private String address;
    private String paymentTerms;

    private List<PurchaseItemLine> items = new ArrayList<>();
    private BigDecimal itemsGross = BigDecimal.ZERO;
    private BigDecimal totalDiscount = BigDecimal.ZERO;
    private BigDecimal taxableAmount = BigDecimal.ZERO;
    private BigDecimal totalTax = BigDecimal.ZERO;
    private BigDecimal cgstAmount = BigDecimal.ZERO;
    private BigDecimal sgstAmount = BigDecimal.ZERO;
    private BigDecimal igstAmount = BigDecimal.ZERO;
    private Boolean isInterState = false;
    private String taxSummaryText = "Intra-State (CGST + SGST)";
    private BigDecimal itemsTotal = BigDecimal.ZERO;
    private BigDecimal deliveryFreight = BigDecimal.ZERO;
    private BigDecimal otherCharges = BigDecimal.ZERO;
    private BigDecimal roundOff = BigDecimal.ZERO;
    private BigDecimal vendorTotal = BigDecimal.ZERO;
    private String poType;
    private List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule> deliverySchedules = new ArrayList<>();
    private List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderPaymentMilestone> paymentMilestones = new ArrayList<>();

    public VendorSummaryGroup() {}

    public BigDecimal getCgstAmount() { return cgstAmount != null ? cgstAmount : BigDecimal.ZERO; }
    public void setCgstAmount(BigDecimal cgstAmount) { this.cgstAmount = cgstAmount; }

    public BigDecimal getSgstAmount() { return sgstAmount != null ? sgstAmount : BigDecimal.ZERO; }
    public void setSgstAmount(BigDecimal sgstAmount) { this.sgstAmount = sgstAmount; }

    public BigDecimal getIgstAmount() { return igstAmount != null ? igstAmount : BigDecimal.ZERO; }
    public void setIgstAmount(BigDecimal igstAmount) { this.igstAmount = igstAmount; }

    public Boolean getIsInterState() { return isInterState; }
    public void setIsInterState(Boolean interState) { isInterState = interState; }

    public String getTaxSummaryText() { return taxSummaryText; }
    public void setTaxSummaryText(String taxSummaryText) { this.taxSummaryText = taxSummaryText; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }
    public String getVendorId() { return vendorCode; }
    public void setVendorId(String vendorId) { this.vendorCode = vendorId; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public String getVendorGstin() { return vendorGstin; }
    public void setVendorGstin(String vendorGstin) { this.vendorGstin = vendorGstin; }

    public String getVendorPan() { return vendorPan; }
    public void setVendorPan(String vendorPan) { this.vendorPan = vendorPan; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public List<PurchaseItemLine> getItems() { return items; }
    public void setItems(List<PurchaseItemLine> items) { this.items = items; }

    public BigDecimal getItemsGross() { return itemsGross; }
    public void setItemsGross(BigDecimal itemsGross) { this.itemsGross = itemsGross; }

    public BigDecimal getTotalDiscount() { return totalDiscount; }
    public void setTotalDiscount(BigDecimal totalDiscount) { this.totalDiscount = totalDiscount; }

    public BigDecimal getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(BigDecimal taxableAmount) { this.taxableAmount = taxableAmount; }

    public BigDecimal getTotalTax() { return totalTax; }
    public void setTotalTax(BigDecimal totalTax) { this.totalTax = totalTax; }

    public BigDecimal getItemsTotal() { return itemsTotal; }
    public void setItemsTotal(BigDecimal itemsTotal) { this.itemsTotal = itemsTotal; }

    public BigDecimal getDeliveryFreight() { return deliveryFreight; }
    public void setDeliveryFreight(BigDecimal deliveryFreight) { this.deliveryFreight = deliveryFreight; }

    public BigDecimal getOtherCharges() { return otherCharges; }
    public void setOtherCharges(BigDecimal otherCharges) { this.otherCharges = otherCharges; }

    public BigDecimal getRoundOff() { return roundOff; }
    public void setRoundOff(BigDecimal roundOff) { this.roundOff = roundOff; }

    public BigDecimal getVendorTotal() { return vendorTotal; }
    public void setVendorTotal(BigDecimal vendorTotal) { this.vendorTotal = vendorTotal; }

    public String getPoType() { return poType; }
    public void setPoType(String poType) { this.poType = poType; }

    public List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule> getDeliverySchedules() { return deliverySchedules; }
    public void setDeliverySchedules(List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule> deliverySchedules) { this.deliverySchedules = deliverySchedules; }

    public List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderPaymentMilestone> getPaymentMilestones() { return paymentMilestones; }
    public void setPaymentMilestones(List<com.silvermuller.seals.modules.purchase.model.PurchaseOrderPaymentMilestone> paymentMilestones) { this.paymentMilestones = paymentMilestones; }
}
