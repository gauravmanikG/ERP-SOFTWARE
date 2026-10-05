package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;

public class DepartmentResponse {

    private Long id;
    private String name;
    private BigDecimal processSequence;

    public DepartmentResponse() {
    }

    public DepartmentResponse(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    public DepartmentResponse(Long id, String name, BigDecimal processSequence) {
        this.id = id;
        this.name = name;
        this.processSequence = processSequence;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getProcessSequence() {
        return processSequence;
    }

    public void setProcessSequence(BigDecimal processSequence) {
        this.processSequence = processSequence;
    }
}
