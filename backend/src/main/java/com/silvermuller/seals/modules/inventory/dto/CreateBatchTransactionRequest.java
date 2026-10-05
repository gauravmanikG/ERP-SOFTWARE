package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class CreateBatchTransactionRequest {

    @NotBlank(message = "Transaction type is required (must match operation_master)")
    private String transactionType;

    @NotNull(message = "From Department ID is required")
    private Long fromDepartmentId;

    @NotNull(message = "To Department ID is required")
    private Long toDepartmentId;

    private String slipNumber; // Optional manual slip number entered by user

    private String remarks;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<TransactionItemRequest> items;

    public CreateBatchTransactionRequest() {
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public Long getFromDepartmentId() {
        return fromDepartmentId;
    }

    public void setFromDepartmentId(Long fromDepartmentId) {
        this.fromDepartmentId = fromDepartmentId;
    }

    public Long getToDepartmentId() {
        return toDepartmentId;
    }

    public void setToDepartmentId(Long toDepartmentId) {
        this.toDepartmentId = toDepartmentId;
    }

    public String getSlipNumber() {
        return slipNumber;
    }

    public void setSlipNumber(String slipNumber) {
        this.slipNumber = slipNumber;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public List<TransactionItemRequest> getItems() {
        return items;
    }

    public void setItems(List<TransactionItemRequest> items) {
        this.items = items;
    }
}
