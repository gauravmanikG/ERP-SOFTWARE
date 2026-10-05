package com.silvermuller.seals.modules.notifications.dto;

import java.math.BigDecimal;

public class DepartmentThresholdLine {
    private String departmentName;
    private BigDecimal minQuantity;
    private BigDecimal maxQuantity;

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public BigDecimal getMinQuantity() { return minQuantity; }
    public void setMinQuantity(BigDecimal minQuantity) { this.minQuantity = minQuantity; }
    public BigDecimal getMaxQuantity() { return maxQuantity; }
    public void setMaxQuantity(BigDecimal maxQuantity) { this.maxQuantity = maxQuantity; }
}
