package com.silvermuller.seals.modules.purchase.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class RfqHeader {
    private Long id;
    private String rfqNumber;
    private LocalDate rfqDate;
    private LocalDate dueDate;
    private String prNumber;
    private String prDate;
    private String department;
    private String title;
    private String status; // OPEN, SENT_TO_VENDORS, QUOTES_RECEIVED, CLOSED
    private String selectedVendorsJson;
    private String deliveryLocation;
    private String paymentTerms;
    private String termsConditions;
    private String remarks;
    private String createdBy;
    private String createdAt;
    private String updatedAt;

    private List<RfqItem> items = new ArrayList<>();

    public RfqHeader() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRfqNumber() { return rfqNumber; }
    public void setRfqNumber(String rfqNumber) { this.rfqNumber = rfqNumber; }

    public LocalDate getRfqDate() { return rfqDate; }
    public void setRfqDate(LocalDate rfqDate) { this.rfqDate = rfqDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public String getPrDate() { return prDate; }
    public void setPrDate(String prDate) { this.prDate = prDate; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSelectedVendorsJson() { return selectedVendorsJson; }
    public void setSelectedVendorsJson(String selectedVendorsJson) { this.selectedVendorsJson = selectedVendorsJson; }

    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getTermsConditions() { return termsConditions; }
    public void setTermsConditions(String termsConditions) { this.termsConditions = termsConditions; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public List<RfqItem> getItems() { return items; }
    public void setItems(List<RfqItem> items) { this.items = items; }
}
