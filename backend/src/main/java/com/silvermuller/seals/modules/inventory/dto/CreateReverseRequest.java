package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.NotNull;

public class CreateReverseRequest {

    @NotNull(message = "Target transaction ID to reverse is required")
    private Long targetTransactionId;

    private String remarks;

    public CreateReverseRequest() {
    }

    public CreateReverseRequest(Long targetTransactionId, String remarks) {
        this.targetTransactionId = targetTransactionId;
        this.remarks = remarks;
    }

    public Long getTargetTransactionId() {
        return targetTransactionId;
    }

    public void setTargetTransactionId(Long targetTransactionId) {
        this.targetTransactionId = targetTransactionId;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
