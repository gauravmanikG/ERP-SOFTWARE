package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;

@Entity
@Table(name = "category_master", schema = "public")
public class CategoryMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_name", nullable = false, unique = true)
    private String categoryName;

    @Column(name = "bom_consumption")
    private String bomConsumption;

    @Column(name = "category_code")
    private String categoryCode;

    @Column(name = "short_code")
    private String shortCode;

    public CategoryMaster() {}

    public CategoryMaster(String categoryName, String bomConsumption, String categoryCode, String shortCode) {
        this.categoryName = categoryName;
        this.bomConsumption = bomConsumption;
        this.categoryCode = categoryCode;
        this.shortCode = shortCode;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public String getBomConsumption() {
        return bomConsumption;
    }

    public void setBomConsumption(String bomConsumption) {
        this.bomConsumption = bomConsumption;
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
}
