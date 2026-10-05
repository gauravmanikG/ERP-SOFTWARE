package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "opening_balance", schema = "public")
public class OpeningBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "main_code", nullable = false, unique = true)
    private String mainCode;

    @Column(name = "item_code", nullable = false)
    private String itemCode;

    @Column(name = "category_name", nullable = false)
    private String categoryName;

    @Column(name = "department_name", nullable = false)
    private String departmentName = "Store";

    @Column(name = "opening_balance", nullable = false)
    private BigDecimal openingBalance = BigDecimal.ZERO;

    public OpeningBalance() {}

    public OpeningBalance(String mainCode, String itemCode, String categoryName, String departmentName, BigDecimal openingBalance) {
        this.mainCode = mainCode;
        this.itemCode = itemCode;
        this.categoryName = categoryName;
        this.departmentName = departmentName;
        this.openingBalance = openingBalance;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMainCode() {
        return mainCode;
    }

    public void setMainCode(String mainCode) {
        this.mainCode = mainCode;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
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
