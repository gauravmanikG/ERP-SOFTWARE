package com.silvermuller.seals.modules.purchase.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public class PurchaseRequisition {

    private Long id;
    @JsonAlias({"pr_number", "prNumber"})
    private String prNumber;
    @JsonAlias({"pr_date", "prDate"})
    private LocalDate prDate;
    @JsonAlias({"required_date", "requiredDate", "required_by_date", "requiredByDate"})
    private LocalDate requiredDate;
    private String requisitioner;
    private String department;
    /** Read-only for clients: the Department Master row of department, set by the server when the PR is saved. */
    private Long departmentId;
    private String store;
    @JsonAlias({"preferred_vendor", "preferredVendor", "vendor"})
    private String preferredVendor;
    private String priority; // Low, Normal, High, Urgent
    @JsonAlias({"requirement_type", "requirementType"})
    private String requirementType;
    @JsonAlias({"procurement_method", "procurementMethod"})
    private String procurementMethod; // Competitive Quotation, Direct Purchase, etc.
    private String purpose;
    private String remarks;
    private String status; // Draft, Submitted, Approved, Rejected, Partially Ordered, Fully Ordered, PO Generated, Cancelled
    @JsonAlias({"pr_type", "prType"})
    private String prType;
    @JsonAlias({"cost_center", "costCenter"})
    private String costCenter;
    @JsonAlias({"project_reference", "projectReference"})
    private String projectReference;
    @JsonAlias({"cancellation_reason", "cancellationReason"})
    private String cancellationReason;
    @JsonAlias({"created_by", "createdBy"})
    private String createdBy;
    private OffsetDateTime createdAt;
    private String approvedBy;
    private OffsetDateTime approvedAt;
    private String rejectionReason;
    private OffsetDateTime updatedAt;

    private List<PurchaseRequisitionItem> items = new ArrayList<>();
    private List<String> generatedPos = new ArrayList<>();

    public PurchaseRequisition() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public LocalDate getPrDate() { return prDate; }
    public void setPrDate(LocalDate prDate) { this.prDate = prDate; }

    public LocalDate getRequiredDate() { return requiredDate; }
    public void setRequiredDate(LocalDate requiredDate) { this.requiredDate = requiredDate; }

    public String getRequisitioner() { return requisitioner; }
    public void setRequisitioner(String requisitioner) { this.requisitioner = requisitioner; }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getStore() { return store; }
    public void setStore(String store) { this.store = store; }

    public String getPreferredVendor() { return preferredVendor; }
    public void setPreferredVendor(String preferredVendor) { this.preferredVendor = preferredVendor; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getRequirementType() { return requirementType; }
    public void setRequirementType(String requirementType) { this.requirementType = requirementType; }

    public String getProcurementMethod() { return procurementMethod; }
    public void setProcurementMethod(String procurementMethod) { this.procurementMethod = procurementMethod; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPrType() { return prType; }
    public void setPrType(String prType) { this.prType = prType; }

    public String getCostCenter() { return costCenter; }
    public void setCostCenter(String costCenter) { this.costCenter = costCenter; }

    public String getProjectReference() { return projectReference; }
    public void setProjectReference(String projectReference) { this.projectReference = projectReference; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public OffsetDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(OffsetDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<PurchaseRequisitionItem> getItems() { return items; }
    public void setItems(List<PurchaseRequisitionItem> items) { this.items = items; }

    public List<String> getGeneratedPos() { return generatedPos; }
    public void setGeneratedPos(List<String> generatedPos) { this.generatedPos = generatedPos; }
}
