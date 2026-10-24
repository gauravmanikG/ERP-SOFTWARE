package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;

public class MasterResponse {
    private Long id;
    private String code;
    private String description;
    private String category;
    private String unitOfMeasurement;
    private String storeName;

    public MasterResponse() {}

    public MasterResponse(Long id, String code, String description, String category, String unitOfMeasurement, String storeName) {
        this.id = id;
        this.code = code;
        this.description = description;
        this.category = category;
        this.unitOfMeasurement = unitOfMeasurement;
        this.storeName = storeName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getUnitOfMeasurement() {
        return unitOfMeasurement;
    }

    public void setUnitOfMeasurement(String unitOfMeasurement) {
        this.unitOfMeasurement = unitOfMeasurement;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }
}
