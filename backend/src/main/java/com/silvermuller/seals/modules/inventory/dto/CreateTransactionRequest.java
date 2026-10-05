package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class CreateTransactionRequest {

    @NotNull(message = "Master ID is required")
    private Long masterId;

    @NotNull(message = "From Department ID is required")
    private Long departmentId;

    @NotNull(message = "To Department ID is required")
    private Long toDepartmentId;

    @NotBlank(message = "Transaction type is required (must match operation_master)")
    private String transactionType;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private BigDecimal quantity;

    private String remarks;

    @NotBlank(message = "Category of Item is required")
    private String category;

    public CreateTransactionRequest() {
    }

    public CreateTransactionRequest(Long masterId, Long departmentId, String transactionType, BigDecimal quantity, String remarks) {
        this.masterId = masterId;
        this.departmentId = departmentId;
        this.transactionType = transactionType;
        this.quantity = quantity;
        this.remarks = remarks;
    }

    public Long getMasterId() {
        return masterId;
    }

    public void setMasterId(Long masterId) {
        this.masterId = masterId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public Long getToDepartmentId() {
        return toDepartmentId;
    }

    public void setToDepartmentId(Long toDepartmentId) {
        this.toDepartmentId = toDepartmentId;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
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
