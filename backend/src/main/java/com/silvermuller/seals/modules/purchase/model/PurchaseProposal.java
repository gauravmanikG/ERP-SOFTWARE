package com.silvermuller.seals.modules.purchase.model;

import com.silvermuller.seals.modules.purchase.dto.PurchaseItemLine;
import com.silvermuller.seals.modules.purchase.dto.VendorExtraCharges;
import com.silvermuller.seals.modules.purchase.dto.VendorSummaryGroup;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PurchaseProposal {
    private String id;
    private String proposalNumber;
    private String prNumber;
    private String prDate;
    private String department;
    private String requestedBy;
    private String requiredByDate;
    private String priority;
    private String purpose;
    private String remarks;
    
    // Status: DRAFT_PURCHASE_PROPOSAL, PENDING_PO_APPROVAL, APPROVED, REJECTED, CHANGES_REQUESTED
    private String status = "DRAFT_PURCHASE_PROPOSAL";

    private List<PurchaseItemLine> items = new ArrayList<>();
    private Map<String, VendorExtraCharges> vendorCharges = new HashMap<>();
    private List<VendorSummaryGroup> vendorGroups = new ArrayList<>();

    private BigDecimal grandGross = BigDecimal.ZERO;
    private BigDecimal grandDiscount = BigDecimal.ZERO;
    private BigDecimal grandTaxable = BigDecimal.ZERO;
    private BigDecimal grandTax = BigDecimal.ZERO;
    private BigDecimal grandDelivery = BigDecimal.ZERO;
    private BigDecimal grandOtherCharges = BigDecimal.ZERO;
    private BigDecimal grandRoundOff = BigDecimal.ZERO;
    private BigDecimal grandTotal = BigDecimal.ZERO;

    private String createdBy;
    private String createdAt;
    private String updatedBy;
    private String updatedAt;

    // Approval tracking
    private String approvedBy;
    private String approvedAt;

    // Rejection tracking
    private String rejectionReason;
    private String rejectedBy;
    private String rejectedAt;

    // Changes requested tracking
    private String changesComments;
    private String changesRequestedBy;
    private String changesRequestedAt;

    private List<String> generatedPoNumbers = new ArrayList<>();

    public PurchaseProposal() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

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

    public String getRequiredByDate() { return requiredByDate; }
    public void setRequiredByDate(String requiredByDate) { this.requiredByDate = requiredByDate; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<PurchaseItemLine> getItems() { return items; }
    public void setItems(List<PurchaseItemLine> items) { this.items = items; }

    public Map<String, VendorExtraCharges> getVendorCharges() { return vendorCharges; }
    public void setVendorCharges(Map<String, VendorExtraCharges> vendorCharges) { this.vendorCharges = vendorCharges; }

    public List<VendorSummaryGroup> getVendorGroups() { return vendorGroups; }
    public void setVendorGroups(List<VendorSummaryGroup> vendorGroups) { this.vendorGroups = vendorGroups; }

    public BigDecimal getGrandGross() { return grandGross; }
    public void setGrandGross(BigDecimal grandGross) { this.grandGross = grandGross; }

    public BigDecimal getGrandDiscount() { return grandDiscount; }
    public void setGrandDiscount(BigDecimal grandDiscount) { this.grandDiscount = grandDiscount; }

    public BigDecimal getGrandTaxable() { return grandTaxable; }
    public void setGrandTaxable(BigDecimal grandTaxable) { this.grandTaxable = grandTaxable; }

    public BigDecimal getGrandTax() { return grandTax; }
    public void setGrandTax(BigDecimal grandTax) { this.grandTax = grandTax; }

    public BigDecimal getGrandDelivery() { return grandDelivery; }
    public void setGrandDelivery(BigDecimal grandDelivery) { this.grandDelivery = grandDelivery; }

    public BigDecimal getGrandOtherCharges() { return grandOtherCharges; }
    public void setGrandOtherCharges(BigDecimal grandOtherCharges) { this.grandOtherCharges = grandOtherCharges; }

    public BigDecimal getGrandRoundOff() { return grandRoundOff; }
    public void setGrandRoundOff(BigDecimal grandRoundOff) { this.grandRoundOff = grandRoundOff; }

    public BigDecimal getGrandTotal() { return grandTotal; }
    public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getRejectedBy() { return rejectedBy; }
    public void setRejectedBy(String rejectedBy) { this.rejectedBy = rejectedBy; }

    public String getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(String rejectedAt) { this.rejectedAt = rejectedAt; }

    public String getChangesComments() { return changesComments; }
    public void setChangesComments(String changesComments) { this.changesComments = changesComments; }

    public String getChangesRequestedBy() { return changesRequestedBy; }
    public void setChangesRequestedBy(String changesRequestedBy) { this.changesRequestedBy = changesRequestedBy; }

    public String getChangesRequestedAt() { return changesRequestedAt; }
    public void setChangesRequestedAt(String changesRequestedAt) { this.changesRequestedAt = changesRequestedAt; }

    private String sourceQuotationNumber;
    private Long sourceQuotationId;

    public String getSourceQuotationNumber() { return sourceQuotationNumber; }
    public void setSourceQuotationNumber(String sourceQuotationNumber) { this.sourceQuotationNumber = sourceQuotationNumber; }
    public String getQuotationNumber() { return sourceQuotationNumber; }
    public void setQuotationNumber(String quotationNumber) { this.sourceQuotationNumber = quotationNumber; }

    public Long getSourceQuotationId() { return sourceQuotationId; }
    public void setSourceQuotationId(Long sourceQuotationId) { this.sourceQuotationId = sourceQuotationId; }

    public List<String> getGeneratedPoNumbers() { return generatedPoNumbers; }
    public void setGeneratedPoNumbers(List<String> generatedPoNumbers) { this.generatedPoNumbers = generatedPoNumbers; }

    private String vendorId;
    private String vendorName;

    public String getVendorId() { return vendorId; }
    public void setVendorId(String vendorId) { this.vendorId = vendorId; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    private Long clubbingBatchId;
    private String clubbingBatchNumber;

    public Long getClubbingBatchId() { return clubbingBatchId; }
    public void setClubbingBatchId(Long clubbingBatchId) { this.clubbingBatchId = clubbingBatchId; }

    public String getClubbingBatchNumber() { return clubbingBatchNumber; }
    public void setClubbingBatchNumber(String clubbingBatchNumber) { this.clubbingBatchNumber = clubbingBatchNumber; }
}
