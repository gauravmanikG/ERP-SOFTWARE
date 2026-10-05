package com.silvermuller.seals.modules.notifications.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.List;

public class CreateStockAlertRuleRequest {

    @NotBlank(message = "Item code is required")
    private String itemCode;

    @NotBlank(message = "Category is required")
    private String category;

    private boolean allDepartments;

    private BigDecimal minQuantity;
    private BigDecimal maxQuantity;

    private List<DepartmentThresholdLine> departments;

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public boolean isAllDepartments() { return allDepartments; }
    public void setAllDepartments(boolean allDepartments) { this.allDepartments = allDepartments; }
    public BigDecimal getMinQuantity() { return minQuantity; }
    public void setMinQuantity(BigDecimal minQuantity) { this.minQuantity = minQuantity; }
    public BigDecimal getMaxQuantity() { return maxQuantity; }
    public void setMaxQuantity(BigDecimal maxQuantity) { this.maxQuantity = maxQuantity; }
    public List<DepartmentThresholdLine> getDepartments() { return departments; }
    public void setDepartments(List<DepartmentThresholdLine> departments) { this.departments = departments; }
}
