package com.silvermuller.seals.modules.notifications.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "stock_alert_rule",
        uniqueConstraints = @UniqueConstraint(columnNames = {"item_code", "category_name", "department_name"})
)
public class StockAlertRule {

    public static final String ALL_DEPARTMENTS = "*";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_code", nullable = false)
    private String itemCode;

    @Column(name = "category_name", nullable = false)
    private String categoryName;

    @Column(name = "department_name", nullable = false)
    private String departmentName;

    @Column(name = "min_quantity", precision = 15, scale = 2)
    private BigDecimal minQuantity;

    @Column(name = "max_quantity", precision = 15, scale = 2)
    private BigDecimal maxQuantity;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public BigDecimal getMinQuantity() { return minQuantity; }
    public void setMinQuantity(BigDecimal minQuantity) { this.minQuantity = minQuantity; }
    public BigDecimal getMaxQuantity() { return maxQuantity; }
    public void setMaxQuantity(BigDecimal maxQuantity) { this.maxQuantity = maxQuantity; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public boolean appliesToAllDepartments() {
        return ALL_DEPARTMENTS.equals(departmentName);
    }
}
