package com.silvermuller.seals.modules.purchase.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public class VendorQuotation {

    private Long id;
    private String quotationNumber;
    private Long vendorId;
    private String vendorCode;
    private String vendorName;
    private String vendorRefNo;
    private LocalDate quotationDate;
    private LocalDate validUntil;
    private String contactPerson;
    private String paymentTerms;
    private String deliveryTime;
    private String deliveryLocation;
    private BigDecimal subtotalAmount = BigDecimal.ZERO;
    private BigDecimal taxAmount = BigDecimal.ZERO;
    private BigDecimal deliveryCharges = BigDecimal.ZERO;
    private BigDecimal otherCharges = BigDecimal.ZERO;
    private BigDecimal finalAmount = BigDecimal.ZERO;
    private String status = "Draft"; // Draft, Submitted for Review, Under Evaluation, Selected for Purchase, Rejected, Expired
    private String selectionJustification;
    private String notes;
    private String documentName;
    private String documentUrl;
    private Integer revisionNumber = 1;
    private Boolean isLatest = true;
    private Long parentQuotationId;
    private Long prId;
    private String prNumber;
    private String createdBy = "Purchase Officer";
    private OffsetDateTime createdAt;
    private String updatedBy = "Purchase Officer";
    private OffsetDateTime updatedAt;
    private String approvedBy;
    private OffsetDateTime approvedAt;
    private String evaluationNotes;

    private List<VendorQuotationItem> items = new ArrayList<>();
    private List<VendorQuotationHistory> history = new ArrayList<>();
    private List<VendorQuotationComment> comments = new ArrayList<>();

    public VendorQuotation() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getQuotationNumber() { return quotationNumber; }
    public void setQuotationNumber(String quotationNumber) { this.quotationNumber = quotationNumber; }

    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public String getVendorRefNo() { return vendorRefNo; }
    public void setVendorRefNo(String vendorRefNo) { this.vendorRefNo = vendorRefNo; }

    public LocalDate getQuotationDate() { return quotationDate; }
    public void setQuotationDate(LocalDate quotationDate) { this.quotationDate = quotationDate; }

    public LocalDate getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }

    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }

    public BigDecimal getSubtotalAmount() { return subtotalAmount; }
    public void setSubtotalAmount(BigDecimal subtotalAmount) { this.subtotalAmount = subtotalAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getDeliveryCharges() { return deliveryCharges; }
    public void setDeliveryCharges(BigDecimal deliveryCharges) { this.deliveryCharges = deliveryCharges; }

    public BigDecimal getOtherCharges() { return otherCharges; }
    public void setOtherCharges(BigDecimal otherCharges) { this.otherCharges = otherCharges; }

    public BigDecimal getFinalAmount() { return finalAmount; }
    public void setFinalAmount(BigDecimal finalAmount) { this.finalAmount = finalAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSelectionJustification() { return selectionJustification; }
    public void setSelectionJustification(String selectionJustification) { this.selectionJustification = selectionJustification; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getDocumentName() { return documentName; }
    public void setDocumentName(String documentName) { this.documentName = documentName; }

    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }

    public Integer getRevisionNumber() { return revisionNumber; }
    public void setRevisionNumber(Integer revisionNumber) { this.revisionNumber = revisionNumber; }

    public Boolean getIsLatest() { return isLatest; }
    public void setIsLatest(Boolean isLatest) { this.isLatest = isLatest; }

    public Long getParentQuotationId() { return parentQuotationId; }
    public void setParentQuotationId(Long parentQuotationId) { this.parentQuotationId = parentQuotationId; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public OffsetDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(OffsetDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getEvaluationNotes() { return evaluationNotes; }
    public void setEvaluationNotes(String evaluationNotes) { this.evaluationNotes = evaluationNotes; }

    public Long getPrId() { return prId; }
    public void setPrId(Long prId) { this.prId = prId; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public List<VendorQuotationItem> getItems() { return items; }
    public void setItems(List<VendorQuotationItem> items) { this.items = items; }

    public List<VendorQuotationHistory> getHistory() { return history; }
    public void setHistory(List<VendorQuotationHistory> history) { this.history = history; }

    public List<VendorQuotationComment> getComments() { return comments; }
    public void setComments(List<VendorQuotationComment> comments) { this.comments = comments; }

    public Long getDaysUntilExpiry() {
        if (validUntil == null) return null;
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), validUntil);
    }

    public Boolean getIsExpiringSoon() {
        Long d = getDaysUntilExpiry();
        return d != null && d >= 0 && d <= 7 && !"Selected for Purchase".equalsIgnoreCase(status) && !"Rejected".equalsIgnoreCase(status) && !"Expired".equalsIgnoreCase(status);
    }

    public Boolean getIsExpired() {
        Long d = getDaysUntilExpiry();
        return d != null && d < 0;
    }
}
