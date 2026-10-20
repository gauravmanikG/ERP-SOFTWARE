package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CreateDepartmentRequest {

    private String deptCode;
    private Integer deptNumber;

    @NotBlank(message = "Department name is required")
    private String departmentName;

    @NotNull(message = "Process sequence is required")
    private BigDecimal processSequence;

    private String category;
    private String status = "ACTIVE";
    private String notes;

    public CreateDepartmentRequest() {
    }

    public String getDeptCode() {
        return deptCode;
    }

    public void setDeptCode(String deptCode) {
        this.deptCode = deptCode;
    }

    public Integer getDeptNumber() {
        return deptNumber;
    }

    public void setDeptNumber(Integer deptNumber) {
        this.deptNumber = deptNumber;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
