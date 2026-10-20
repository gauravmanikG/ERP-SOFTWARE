package com.silvermuller.seals.modules.purchase.model;

import java.time.OffsetDateTime;

public class VendorQuotationHistory {

    private Long id;
    private Long quotationId;
    private String action;
    private String actionBy;
    private OffsetDateTime actionAt;
    private String comments;
    private String detailsJson;

    public VendorQuotationHistory() {}

    public VendorQuotationHistory(Long quotationId, String action, String actionBy, String comments) {
        this.quotationId = quotationId;
        this.action = action;
        this.actionBy = actionBy;
        this.comments = comments;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActionBy() { return actionBy; }
    public void setActionBy(String actionBy) { this.actionBy = actionBy; }

    public OffsetDateTime getActionAt() { return actionAt; }
    public void setActionAt(OffsetDateTime actionAt) { this.actionAt = actionAt; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }
}
