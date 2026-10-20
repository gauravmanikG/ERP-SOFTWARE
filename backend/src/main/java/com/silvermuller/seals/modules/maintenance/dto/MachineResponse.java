package com.silvermuller.seals.modules.maintenance.dto;

import java.time.Instant;

public class MachineResponse {

    private Long id;

    @com.fasterxml.jackson.annotation.JsonProperty("sNo")
    private Integer sNo;

    private String machineNo;
    private String description;
    private String department;
    private String location;
    private String specification;
    private String capacity;
    private String make;
    private String remarks;
    private String category;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;

    public MachineResponse() {}

    public MachineResponse(Long id, Integer sNo, String machineNo, String description, String department, String location, String specification, String capacity, String make, String remarks, String category, String status, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.sNo = sNo;
        this.machineNo = machineNo;
        this.description = description;
        this.department = department;
        this.location = location;
        this.specification = specification;
        this.capacity = capacity;
        this.make = make;
        this.remarks = remarks;
        this.category = category;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("sNo")
    public Integer getSNo() {
        return sNo;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("sNo")
    public void setSNo(Integer sNo) {
        this.sNo = sNo;
    }

    public String getMachineNo() {
        return machineNo;
    }

    public void setMachineNo(String machineNo) {
        this.machineNo = machineNo;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getSpecification() {
        return specification;
    }

    public void setSpecification(String specification) {
        this.specification = specification;
    }

    public String getCapacity() {
        return capacity;
    }

    public void setCapacity(String capacity) {
        this.capacity = capacity;
    }

    public String getMake() {
        return make;
    }

    public void setMake(String make) {
        this.make = make;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
