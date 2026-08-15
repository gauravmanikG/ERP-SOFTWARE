package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class TransactionResponse {

    private Long id;
    private String transactionNumber;
    private String slipNumber;
    private String transactionType;
    private Long masterId;
    private String masterCode;
    private String masterDescription;
    private String category;
    private String unitOfMeasurement;
    private Long fromDepartmentId;
    private String fromDepartmentName;
    private Long toDepartmentId;
    private String toDepartmentName;
    private BigDecimal quantity;
    private OffsetDateTime transactionDate;
    private String remarks;
    private Long reversedTransactionId;
    private BigDecimal currentBalanceAfter;

    public TransactionResponse() {
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTransactionNumber() {
        return transactionNumber;
    }

    public void setTransactionNumber(String transactionNumber) {
        this.transactionNumber = transactionNumber;
    }

    public String getSlipNumber() {
        return slipNumber;
    }

    public void setSlipNumber(String slipNumber) {
        this.slipNumber = slipNumber;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public Long getMasterId() {
        return masterId;
    }

    public void setMasterId(Long masterId) {
        this.masterId = masterId;
    }

    public String getMasterCode() {
        return masterCode;
    }

    public void setMasterCode(String masterCode) {
        this.masterCode = masterCode;
    }

    public String getMasterDescription() {
        return masterDescription;
    }

    public void setMasterDescription(String masterDescription) {
        this.masterDescription = masterDescription;
    }

    public String getUnitOfMeasurement() {
        return unitOfMeasurement;
    }

    public void setUnitOfMeasurement(String unitOfMeasurement) {
        this.unitOfMeasurement = unitOfMeasurement;
    }

    public Long getFromDepartmentId() {
        return fromDepartmentId;
    }

    public void setFromDepartmentId(Long fromDepartmentId) {
        this.fromDepartmentId = fromDepartmentId;
    }

    public String getFromDepartmentName() {
        return fromDepartmentName;
    }

    public void setFromDepartmentName(String fromDepartmentName) {
        this.fromDepartmentName = fromDepartmentName;
    }

    public Long getToDepartmentId() {
        return toDepartmentId;
    }

    public void setToDepartmentId(Long toDepartmentId) {
        this.toDepartmentId = toDepartmentId;
    }

    public String getToDepartmentName() {
        return toDepartmentName;
    }

    public void setToDepartmentName(String toDepartmentName) {
        this.toDepartmentName = toDepartmentName;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public OffsetDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(OffsetDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public Long getReversedTransactionId() {
        return reversedTransactionId;
    }

    public void setReversedTransactionId(Long reversedTransactionId) {
        this.reversedTransactionId = reversedTransactionId;
    }

    public BigDecimal getCurrentBalanceAfter() {
        return currentBalanceAfter;
    }

    public void setCurrentBalanceAfter(BigDecimal currentBalanceAfter) {
        this.currentBalanceAfter = currentBalanceAfter;
    }
}
