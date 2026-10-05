package com.silvermuller.seals.modules.inventory.dto;

import java.util.ArrayList;
import java.util.List;

public class MovementPlan {

    private String categoryClassification; // "MOULDED", "O_RING", "STANDARD"
    private String sourceDepartmentName;
    private String destinationDepartmentName;
    private String selectedItemCode;
    private String selectedCategory;
    private List<MovementItem> movements = new ArrayList<>();
    private boolean valid;
    private String validationError;

    public MovementPlan() {
    }

    public String getCategoryClassification() {
        return categoryClassification;
    }

    public void setCategoryClassification(String categoryClassification) {
        this.categoryClassification = categoryClassification;
    }

    public String getSourceDepartmentName() {
        return sourceDepartmentName;
    }

    public void setSourceDepartmentName(String sourceDepartmentName) {
        this.sourceDepartmentName = sourceDepartmentName;
    }

    public String getDestinationDepartmentName() {
        return destinationDepartmentName;
    }

    public void setDestinationDepartmentName(String destinationDepartmentName) {
        this.destinationDepartmentName = destinationDepartmentName;
    }

    public String getSelectedItemCode() {
        return selectedItemCode;
    }

    public void setSelectedItemCode(String selectedItemCode) {
        this.selectedItemCode = selectedItemCode;
    }

    public String getSelectedCategory() {
        return selectedCategory;
    }

    public void setSelectedCategory(String selectedCategory) {
        this.selectedCategory = selectedCategory;
    }

    public List<MovementItem> getMovements() {
        return movements;
    }

    public void setMovements(List<MovementItem> movements) {
        this.movements = movements;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getValidationError() {
        return validationError;
    }

    public void setValidationError(String validationError) {
        this.validationError = validationError;
    }
}
