package com.silvermuller.seals.modules.notifications.repository;

import com.silvermuller.seals.modules.notifications.model.StockAlertRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StockAlertRuleRepository extends JpaRepository<StockAlertRule, Long> {
    List<StockAlertRule> findAllByOrderByCreatedAtDesc();

    List<StockAlertRule> findByItemCodeIgnoreCaseAndCategoryNameIgnoreCase(String itemCode, String categoryName);

    Optional<StockAlertRule> findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
            String itemCode, String categoryName, String departmentName);

    boolean existsByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
            String itemCode, String categoryName, String departmentName);
}
