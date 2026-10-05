package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class DepartmentOpeningLine {

    @NotBlank(message = "Department is required for opening balance")
    private String departmentName;

    @NotNull(message = "Opening balance is required")
    @DecimalMin(value = "0", message = "Opening balance cannot be negative")
    private BigDecimal openingBalance;

    private BigDecimal closingBalance;

    public DepartmentOpeningLine() {
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
