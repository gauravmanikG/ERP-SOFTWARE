package com.silvermuller.seals.modules.maintenance.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "machine_master", schema = "public")
public class MachineMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "s_no")
    private Integer serialNo;

    @Column(name = "machine_no", nullable = false)
    private String machineNo;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "department")
    private String department;

    @Column(name = "location")
    private String location;

    @Column(name = "specification", columnDefinition = "TEXT")
    private String specification;

    @Column(name = "capacity")
    private String capacity;

    @Column(name = "make")
    private String make;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "category")
    private String category = "General";

    @Column(name = "status")
    private String status = "ACTIVE";

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public MachineMaster() {}

    public MachineMaster(Integer serialNo, String machineNo, String description, String department, String location, String specification, String capacity, String make, String remarks, String category, String status) {
        this.serialNo = serialNo;
        this.machineNo = machineNo;
        this.description = description;
        this.department = department;
        this.location = location;
        this.specification = specification;
        this.capacity = capacity;
        this.make = make;
        this.remarks = remarks;
        this.category = category;
        this.status = status != null ? status : "ACTIVE";
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(Integer serialNo) {
        this.serialNo = serialNo;
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
