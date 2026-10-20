package com.silvermuller.seals.modules.purchase.model;

import com.silvermuller.seals.modules.purchase.dto.PurchaseItemLine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class PurchaseOrder {
    private String id;
    private String poNumber;
    private String poDate;
    private String proposalNumber;
    private String prNumber;
    private String prDate;
    private String department;
    private String requestedBy;

    // Vendor details
    private String vendorCode;
    private String vendorName;
    private String vendorGstin;
    private String vendorPan;
    private String contactPerson;
    private String phone;
    private String email;
    private String billingAddress;
    private String shippingAddress;
    private String paymentTerms;

    // Items and financial breakdown
    private List<PurchaseItemLine> items = new ArrayList<>();
    private BigDecimal itemsGross = BigDecimal.ZERO;
    private BigDecimal totalDiscount = BigDecimal.ZERO;
    private BigDecimal taxableAmount = BigDecimal.ZERO;
    private BigDecimal totalTax = BigDecimal.ZERO;
    private BigDecimal deliveryCharges = BigDecimal.ZERO;
    private BigDecimal otherCharges = BigDecimal.ZERO;
    private BigDecimal roundOff = BigDecimal.ZERO;
    private BigDecimal grandTotal = BigDecimal.ZERO;

    private String status = "APPROVED"; // APPROVED, ISSUED, COMPLETED, CANCELLED
    private String approvedBy;
    private String approvedAt;
    private String createdAt;
    private String deliveryDate;
    private String deliveryLocation;
    private String remarks;

    // Phase 1.5 Enterprise & Tax attributes
    private String poType = "STANDARD";
    private String incoterms = "FOR Destination";
    private String freightTerms = "Included in Price";
    private String deliveryMode = "Road Transport";
    private Integer creditPeriod = 30;
    private Integer revisionNumber = 0;
    private BigDecimal cgstTotal = BigDecimal.ZERO;
    private BigDecimal sgstTotal = BigDecimal.ZERO;
    private BigDecimal igstTotal = BigDecimal.ZERO;
    private Boolean isInterState = false;

    // Delivery Schedules & Payment Milestones for Planned POs
    private List<PurchaseOrderDeliverySchedule> deliverySchedules = new ArrayList<>();
    private List<PurchaseOrderPaymentMilestone> paymentMilestones = new ArrayList<>();

    // PO validity (yyyy-MM-dd). Null for POs created before validity was introduced.
    private String validityDate;

    public PurchaseOrder() {}

    public String getValidityDate() { return validityDate; }
    public void setValidityDate(String validityDate) { this.validityDate = validityDate; }

    /** VALID, EXPIRED or NOT_SET, computed from the validity date and today's date. */
    public String getValidityStatus() { return PoValidity.status(PoValidity.parse(validityDate), LocalDate.now()); }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

    public String getPoDate() { return poDate; }
    public void setPoDate(String poDate) { this.poDate = poDate; }

    public String getProposalNumber() { return proposalNumber; }
    public void setProposalNumber(String proposalNumber) { this.proposalNumber = proposalNumber; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public String getPrDate() { return prDate; }
    public void setPrDate(String prDate) { this.prDate = prDate; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

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

    public String getBillingAddress() { return billingAddress; }
    public void setBillingAddress(String billingAddress) { this.billingAddress = billingAddress; }

    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }

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

    public BigDecimal getDeliveryCharges() { return deliveryCharges; }
    public void setDeliveryCharges(BigDecimal deliveryCharges) { this.deliveryCharges = deliveryCharges; }

    public BigDecimal getOtherCharges() { return otherCharges; }
    public void setOtherCharges(BigDecimal otherCharges) { this.otherCharges = otherCharges; }

    public BigDecimal getRoundOff() { return roundOff; }
    public void setRoundOff(BigDecimal roundOff) { this.roundOff = roundOff; }

    public BigDecimal getGrandTotal() { return grandTotal; }
    public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }

    public String getDeliveryDate() { return deliveryDate; }
    public void setDeliveryDate(String deliveryDate) { this.deliveryDate = deliveryDate; }

    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }

    private String sourceQuotationNumber;
    private Long sourceQuotationId;

    public String getSourceQuotationNumber() { return sourceQuotationNumber; }
    public void setSourceQuotationNumber(String sourceQuotationNumber) { this.sourceQuotationNumber = sourceQuotationNumber; }

    public String getQuotationNumber() { return sourceQuotationNumber; }
    public void setQuotationNumber(String quotationNumber) { this.sourceQuotationNumber = quotationNumber; }

    public Long getSourceQuotationId() { return sourceQuotationId; }
    public void setSourceQuotationId(Long sourceQuotationId) { this.sourceQuotationId = sourceQuotationId; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    private Long clubbingBatchId;
    private String clubbingBatchNumber;

    public Long getClubbingBatchId() { return clubbingBatchId; }
    public void setClubbingBatchId(Long clubbingBatchId) { this.clubbingBatchId = clubbingBatchId; }

    public String getClubbingBatchNumber() { return clubbingBatchNumber; }
    public void setClubbingBatchNumber(String clubbingBatchNumber) { this.clubbingBatchNumber = clubbingBatchNumber; }

    public String getPoType() { return poType; }
    public void setPoType(String poType) { this.poType = poType; }

    public String getIncoterms() { return incoterms; }
    public void setIncoterms(String incoterms) { this.incoterms = incoterms; }

    public String getFreightTerms() { return freightTerms; }
    public void setFreightTerms(String freightTerms) { this.freightTerms = freightTerms; }

    public String getDeliveryMode() { return deliveryMode; }
    public void setDeliveryMode(String deliveryMode) { this.deliveryMode = deliveryMode; }

    public Integer getCreditPeriod() { return creditPeriod; }
    public void setCreditPeriod(Integer creditPeriod) { this.creditPeriod = creditPeriod; }

    public Integer getRevisionNumber() { return revisionNumber; }
    public void setRevisionNumber(Integer revisionNumber) { this.revisionNumber = revisionNumber; }

    public BigDecimal getCgstTotal() { return cgstTotal != null ? cgstTotal : BigDecimal.ZERO; }
    public void setCgstTotal(BigDecimal cgstTotal) { this.cgstTotal = cgstTotal; }

    public BigDecimal getSgstTotal() { return sgstTotal != null ? sgstTotal : BigDecimal.ZERO; }
    public void setSgstTotal(BigDecimal sgstTotal) { this.sgstTotal = sgstTotal; }

    public BigDecimal getIgstTotal() { return igstTotal != null ? igstTotal : BigDecimal.ZERO; }
    public void setIgstTotal(BigDecimal igstTotal) { this.igstTotal = igstTotal; }

    public Boolean getIsInterState() { return isInterState; }
    public void setIsInterState(Boolean interState) { isInterState = interState; }

    public List<PurchaseOrderDeliverySchedule> getDeliverySchedules() { return deliverySchedules; }
    public void setDeliverySchedules(List<PurchaseOrderDeliverySchedule> deliverySchedules) { this.deliverySchedules = deliverySchedules; }

    public List<PurchaseOrderPaymentMilestone> getPaymentMilestones() { return paymentMilestones; }
    public void setPaymentMilestones(List<PurchaseOrderPaymentMilestone> paymentMilestones) { this.paymentMilestones = paymentMilestones; }
}
