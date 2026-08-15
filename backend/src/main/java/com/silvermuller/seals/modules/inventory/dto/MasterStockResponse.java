package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;

public class MasterStockResponse {

    private Long id;
    private String code;
    private String description;
    private String category;
    private String unitOfMeasurement;
    private BigDecimal openingBalance;
    private BigDecimal currentBalance;
    private String storeName;
    private java.util.Map<String, BigDecimal> deptBalances;

    public MasterStockResponse() {
    }

    public MasterStockResponse(Long id, String code, String description, String category, String unitOfMeasurement, BigDecimal openingBalance, BigDecimal currentBalance, String storeName) {
        this.id = id;
        this.code = code;
        this.description = description;
        this.category = category;
        this.unitOfMeasurement = unitOfMeasurement;
        this.openingBalance = openingBalance;
        this.currentBalance = currentBalance;
        this.storeName = storeName;
    }

    public MasterStockResponse(Long id, String code, String description, String category, String unitOfMeasurement, BigDecimal openingBalance, BigDecimal currentBalance, String storeName, java.util.Map<String, BigDecimal> deptBalances) {
        this(id, code, description, category, unitOfMeasurement, openingBalance, currentBalance, storeName);
        this.deptBalances = deptBalances;
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

    public BigDecimal getOpeningBalance() {
        return openingBalance;
    }

    public void setOpeningBalance(BigDecimal openingBalance) {
        this.openingBalance = openingBalance;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public java.util.Map<String, BigDecimal> getDeptBalances() {
        return deptBalances;
    }

    public void setDeptBalances(java.util.Map<String, BigDecimal> deptBalances) {
        this.deptBalances = deptBalances;
    }
}
