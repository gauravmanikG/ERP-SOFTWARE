package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class TransactionItemRequest {

    @NotNull(message = "Master ID is required")
    private Long masterId;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private BigDecimal quantity;

    private String remarks;

    @NotBlank(message = "Category of Item is required")
    private String category;


    public TransactionItemRequest() {
    }

    public TransactionItemRequest(Long masterId, BigDecimal quantity, String remarks) {
        this.masterId = masterId;
        this.quantity = quantity;
        this.remarks = remarks;
    }

    public TransactionItemRequest(Long masterId, BigDecimal quantity, String remarks, String category) {
        this.masterId = masterId;
        this.quantity = quantity;
        this.remarks = remarks;
        this.category = category;
    }

    public Long getMasterId() {
        return masterId;
    }

    public void setMasterId(Long masterId) {
        this.masterId = masterId;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
