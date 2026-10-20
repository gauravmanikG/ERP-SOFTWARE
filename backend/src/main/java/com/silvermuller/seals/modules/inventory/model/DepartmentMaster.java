package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "department_master", schema = "public")
public class DepartmentMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "dept_number")
    private Integer deptNumber;

    @Column(name = "department_name", nullable = false, unique = true)
    private String departmentName;

    @Column(name = "process_sequence", nullable = false)
    private BigDecimal processSequence;

    @Column(name = "category")
    private String category;

    @Column(name = "status")
    private String status = "ACTIVE";

    @Column(name = "notes")
    private String notes;

    public DepartmentMaster() {}

    public DepartmentMaster(String departmentName, BigDecimal processSequence) {
        this.departmentName = departmentName;
        this.processSequence = processSequence;
    }

    public DepartmentMaster(String deptCode, Integer deptNumber, String departmentName, BigDecimal processSequence, String category, String status, String notes) {
        this.deptCode = deptCode;
        this.deptNumber = deptNumber;
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
