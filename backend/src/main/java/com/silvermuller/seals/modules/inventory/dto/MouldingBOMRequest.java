package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class MouldingBOMRequest {

    @NotNull(message = "Source Department ID is required.")
    private Long fromDepartmentId;

    @NotNull(message = "Destination Department ID is required.")
    private Long toDepartmentId;

    private Long masterId;
    private String itemCode;

    @NotNull(message = "Category is required.")
    private String category;

    @NotNull(message = "Quantity is required.")
    @DecimalMin(value = "0.01", message = "Quantity must be greater than zero.")
    private BigDecimal quantity;

    private String slipNumber;
    private String remarks;

    public MouldingBOMRequest() {
    }

    public MouldingBOMRequest(Long fromDepartmentId, Long toDepartmentId, Long masterId, String itemCode, String category, BigDecimal quantity, String slipNumber, String remarks) {
        this.fromDepartmentId = fromDepartmentId;
        this.toDepartmentId = toDepartmentId;
        this.masterId = masterId;
        this.itemCode = itemCode;
        this.category = category;
        this.quantity = quantity;
        this.slipNumber = slipNumber;
        this.remarks = remarks;
    }

    public Long getFromDepartmentId() {
        return fromDepartmentId;
    }

    public void setFromDepartmentId(Long fromDepartmentId) {
        this.fromDepartmentId = fromDepartmentId;
    }

    public Long getToDepartmentId() {
        return toDepartmentId;
    }

    public void setToDepartmentId(Long toDepartmentId) {
        this.toDepartmentId = toDepartmentId;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public String getSlipNumber() {
        return slipNumber;
    }

    public void setSlipNumber(String slipNumber) {
        this.slipNumber = slipNumber;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
