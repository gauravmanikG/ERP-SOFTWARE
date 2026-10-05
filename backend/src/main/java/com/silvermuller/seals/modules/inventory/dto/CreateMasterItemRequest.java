package com.silvermuller.seals.modules.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class CreateMasterItemRequest {

    @NotBlank(message = "Item name is required")
    private String itemName;

    @NotBlank(message = "Item code is required")
    private String itemCode;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Unit of measurement is required")
    private String unitOfMeasurement;

    @Valid
    private List<DepartmentOpeningLine> departmentOpenings;

    public CreateMasterItemRequest() {
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getUnitOfMeasurement() {
        return unitOfMeasurement;
    }

    public void setUnitOfMeasurement(String unitOfMeasurement) {
        this.unitOfMeasurement = unitOfMeasurement;
    }

    public List<DepartmentOpeningLine> getDepartmentOpenings() {
        return departmentOpenings;
    }

    public void setDepartmentOpenings(List<DepartmentOpeningLine> departmentOpenings) {
        this.departmentOpenings = departmentOpenings;
    }
}
