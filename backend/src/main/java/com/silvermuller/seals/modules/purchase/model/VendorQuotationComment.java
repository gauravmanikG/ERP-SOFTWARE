package com.silvermuller.seals.modules.purchase.model;

import java.time.OffsetDateTime;

public class VendorQuotationComment {

    private Long id;
    private Long quotationId;
    private String author;
    private String comment;
    private OffsetDateTime createdAt;

    public VendorQuotationComment() {}

    public VendorQuotationComment(Long quotationId, String author, String comment) {
        this.quotationId = quotationId;
        this.author = author;
        this.comment = comment;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
