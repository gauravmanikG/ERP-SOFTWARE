package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CreateDepartmentRequest {

    @NotBlank(message = "Department name is required")
    private String departmentName;

    @NotNull(message = "Process sequence is required")
    private BigDecimal processSequence;

    public CreateDepartmentRequest() {
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public BigDecimal getProcessSequence() {
        return processSequence;
    }

    public void setProcessSequence(BigDecimal processSequence) {
        this.processSequence = processSequence;
    }
}
