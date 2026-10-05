package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;

public class MovementItem {

    private String role; // "SOURCE" or "DESTINATION"
    private Long departmentId;
    private String departmentName;
    private Long masterId;
    private String itemCode;
    private String itemDescription;
    private String category;
    private BigDecimal quantityChange; // Negative for deduction (-798), positive for addition (+798)
    private BigDecimal availableBalanceBefore;
    private BigDecimal availableBalanceAfter;
    private String unitOfMeasurement;
    private String note;

    public MovementItem() {
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public Long getMasterId() {
        return masterId;
    }

    public void setMasterId(Long masterId) {
        this.masterId = masterId;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getItemDescription() {
        return itemDescription;
    }

    public void setItemDescription(String itemDescription) {
        this.itemDescription = itemDescription;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getQuantityChange() {
        return quantityChange;
    }

    public void setQuantityChange(BigDecimal quantityChange) {
        this.quantityChange = quantityChange;
    }

    public BigDecimal getAvailableBalanceBefore() {
        return availableBalanceBefore;
    }

    public void setAvailableBalanceBefore(BigDecimal availableBalanceBefore) {
        this.availableBalanceBefore = availableBalanceBefore;
    }

    public BigDecimal getAvailableBalanceAfter() {
        return availableBalanceAfter;
    }

    public void setAvailableBalanceAfter(BigDecimal availableBalanceAfter) {
        this.availableBalanceAfter = availableBalanceAfter;
    }

    public String getUnitOfMeasurement() {
        return unitOfMeasurement;
    }

    public void setUnitOfMeasurement(String unitOfMeasurement) {
        this.unitOfMeasurement = unitOfMeasurement;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
