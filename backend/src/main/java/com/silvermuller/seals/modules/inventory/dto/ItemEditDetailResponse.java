package com.silvermuller.seals.modules.inventory.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ItemEditDetailResponse {

    private Long id;
    private String itemCode;
    private String itemName;
    private String description;
    private String category;
    private String unitOfMeasurement;
    private List<String> availableCategories = new ArrayList<>();
    private List<DepartmentOpeningLine> departmentOpenings = new ArrayList<>();

    public ItemEditDetailResponse() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
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

    public List<String> getAvailableCategories() {
        return availableCategories;
    }

    public void setAvailableCategories(List<String> availableCategories) {
        this.availableCategories = availableCategories;
    }

    public List<DepartmentOpeningLine> getDepartmentOpenings() {
        return departmentOpenings;
    }

    public void setDepartmentOpenings(List<DepartmentOpeningLine> departmentOpenings) {
        this.departmentOpenings = departmentOpenings;
    }
}
