package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DepartmentWiseCbResponse {

    private String itemCode;
    private String description;
    private String category;
    private String unitOfMeasurement;
    private List<DepartmentBalanceRow> departments = new ArrayList<>();
    private BigDecimal totalOpening = BigDecimal.ZERO;
    private BigDecimal totalClosing = BigDecimal.ZERO;

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
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

    public List<DepartmentBalanceRow> getDepartments() {
        return departments;
    }

    public void setDepartments(List<DepartmentBalanceRow> departments) {
        this.departments = departments;
    }

    public BigDecimal getTotalOpening() {
        return totalOpening;
    }

    public void setTotalOpening(BigDecimal totalOpening) {
        this.totalOpening = totalOpening;
    }

    public BigDecimal getTotalClosing() {
        return totalClosing;
    }

    public void setTotalClosing(BigDecimal totalClosing) {
        this.totalClosing = totalClosing;
    }

    public static class DepartmentBalanceRow {
        private String departmentName;
        private BigDecimal openingBalance;
        private BigDecimal closingBalance;

        public DepartmentBalanceRow() {}

        public DepartmentBalanceRow(String departmentName, BigDecimal openingBalance, BigDecimal closingBalance) {
            this.departmentName = departmentName;
            this.openingBalance = openingBalance;
            this.closingBalance = closingBalance;
        }

        public String getDepartmentName() {
            return departmentName;
        }

        public void setDepartmentName(String departmentName) {
            this.departmentName = departmentName;
        }

        public BigDecimal getOpeningBalance() {
            return openingBalance;
        }

        public void setOpeningBalance(BigDecimal openingBalance) {
            this.openingBalance = openingBalance;
        }

        public BigDecimal getClosingBalance() {
            return closingBalance;
        }

        public void setClosingBalance(BigDecimal closingBalance) {
            this.closingBalance = closingBalance;
        }
    }
}
