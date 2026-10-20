package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "procurement_master", schema = "public")
public class ProcurementMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "procurement_type", nullable = false, unique = true)
    private String procurementType;

    @Column(name = "procurement_name")
    private String procurementName;

    @Column(name = "status")
    private String status = "ACTIVE";

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public ProcurementMaster() {}

    public ProcurementMaster(String procurementType, String procurementName) {
        this.procurementType = procurementType;
        this.procurementName = procurementName;
        this.status = "ACTIVE";
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getProcurementType() {
        return procurementType;
    }

    public void setProcurementType(String procurementType) {
        this.procurementType = procurementType;
    }

    public String getProcurementName() {
        return procurementName;
    }

    public void setProcurementName(String procurementName) {
        this.procurementName = procurementName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
