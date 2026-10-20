package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;

public class DepartmentResponse {

    private Long id;
    private String deptCode;
    private Integer deptNumber;
    private String name;
    private String departmentName;
    private BigDecimal processSequence;
    private String category;
    private String status;
    private String notes;

    public DepartmentResponse() {
    }

    public DepartmentResponse(Long id, String name) {
        this.id = id;
        this.name = name;
        this.departmentName = name;
    }

    public DepartmentResponse(Long id, String name, BigDecimal processSequence) {
        this.id = id;
        this.name = name;
        this.departmentName = name;
        this.processSequence = processSequence;
    }

    public DepartmentResponse(Long id, String deptCode, Integer deptNumber, String departmentName, BigDecimal processSequence, String category, String status, String notes) {
        this.id = id;
        this.deptCode = deptCode;
        this.deptNumber = deptNumber;
        this.name = departmentName;
        this.departmentName = departmentName;
        this.processSequence = processSequence;
        this.category = category;
        this.status = status != null ? status : "ACTIVE";
        this.notes = notes;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
        this.departmentName = name;
    }

    public String getDepartmentName() {
        return departmentName != null ? departmentName : name;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
        this.name = departmentName;
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
