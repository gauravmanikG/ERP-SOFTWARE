package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class CreateTransactionRequest {

    @NotNull(message = "Master ID is required")
    private Long masterId;

    @NotNull(message = "Department ID is required")
    private Long departmentId;

    @NotBlank(message = "Transaction type is required (ISSUE or RECEIPT)")
    private String transactionType;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private BigDecimal quantity;

    private String remarks;

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
}
