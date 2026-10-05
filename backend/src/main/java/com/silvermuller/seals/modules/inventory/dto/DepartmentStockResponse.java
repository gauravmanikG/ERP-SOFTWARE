package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DepartmentStockResponse {

    private Long departmentId;
    private String departmentName;
    private List<ItemRow> items = new ArrayList<>();
    private BigDecimal totalOpening = BigDecimal.ZERO;
    private BigDecimal totalQuantity = BigDecimal.ZERO;

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

    public List<ItemRow> getItems() {
        return items;
    }

    public void setItems(List<ItemRow> items) {
        this.items = items;
    }

    public BigDecimal getTotalOpening() {
        return totalOpening;
    }

    public void setTotalOpening(BigDecimal totalOpening) {
        this.totalOpening = totalOpening;
    }

    public BigDecimal getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(BigDecimal totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public static class ItemRow {
        private String itemCode;
        private String itemName;
        private String category;
        private String unitOfMeasurement;
        private BigDecimal openingBalance;
        private BigDecimal quantity;

        public ItemRow() {}

        public ItemRow(String itemCode, String itemName, String category, String unitOfMeasurement,
                       BigDecimal openingBalance, BigDecimal quantity) {
            this.itemCode = itemCode;
            this.itemName = itemName;
            this.category = category;
            this.unitOfMeasurement = unitOfMeasurement;
            this.openingBalance = openingBalance;
            this.quantity = quantity;
        }

        public String getItemCode() { return itemCode; }
        public void setItemCode(String itemCode) { this.itemCode = itemCode; }
        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getUnitOfMeasurement() { return unitOfMeasurement; }
        public void setUnitOfMeasurement(String unitOfMeasurement) { this.unitOfMeasurement = unitOfMeasurement; }
        public BigDecimal getOpeningBalance() { return openingBalance; }
        public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }
        public BigDecimal getQuantity() { return quantity; }
        public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    }
}
