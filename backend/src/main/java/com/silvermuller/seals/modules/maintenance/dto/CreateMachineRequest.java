package com.silvermuller.seals.modules.maintenance.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateMachineRequest {

    @com.fasterxml.jackson.annotation.JsonProperty("sNo")
    @com.fasterxml.jackson.annotation.JsonAlias({"sno", "serialNo"})
    private Integer sNo;

    @NotBlank(message = "Machine number / code is required")
    private String machineNo;

    @NotBlank(message = "Description of machine is required")
    private String description;

    private String department;
    private String location;
    private String specification;
    private String capacity;
    private String make;
    private String remarks;
    private String category;
    private String status;

    public CreateMachineRequest() {}

    @com.fasterxml.jackson.annotation.JsonProperty("sNo")
    public Integer getSNo() {
        return sNo;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("sNo")
    @com.fasterxml.jackson.annotation.JsonAlias({"sno", "serialNo"})
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
}
