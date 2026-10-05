package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateCategoryRequest {

    @NotBlank(message = "Category name is required")
    private String categoryName;

    private String categoryCode;
    private String shortCode;
    private String bomConsumption;

    public CreateCategoryRequest() {
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public void setCategoryCode(String categoryCode) {
        this.categoryCode = categoryCode;
    }

    public String getShortCode() {
        return shortCode;
    }

    public void setShortCode(String shortCode) {
        this.shortCode = shortCode;
    }

    public String getBomConsumption() {
        return bomConsumption;
    }

    public void setBomConsumption(String bomConsumption) {
        this.bomConsumption = bomConsumption;
    }
}
