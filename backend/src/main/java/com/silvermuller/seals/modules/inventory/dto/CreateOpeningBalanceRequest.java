package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CreateOpeningBalanceRequest {

    @NotBlank(message = "Item code is required")
    private String itemCode;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Department is required")
    private String departmentName;

    @NotNull(message = "Opening balance is required")
    @DecimalMin(value = "0", message = "Opening balance cannot be negative")
    private BigDecimal openingBalance;

    public CreateOpeningBalanceRequest() {
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
}
