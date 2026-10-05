package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "department_master", schema = "public")
public class DepartmentMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "department_name", nullable = false, unique = true)
    private String departmentName;

    @Column(name = "process_sequence", nullable = false)
    private BigDecimal processSequence;

    public DepartmentMaster() {}

    public DepartmentMaster(String departmentName, BigDecimal processSequence) {
        this.departmentName = departmentName;
        this.processSequence = processSequence;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
