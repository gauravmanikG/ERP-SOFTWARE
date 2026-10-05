package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.OpeningBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OpeningBalanceRepository extends JpaRepository<OpeningBalance, Long> {
    List<OpeningBalance> findByItemCodeIgnoreCase(String itemCode);
    List<OpeningBalance> findByItemCodeIgnoreCaseAndCategoryNameIgnoreCase(String itemCode, String categoryName);
    List<OpeningBalance> findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(String itemCode, String categoryName, String departmentName);
    List<OpeningBalance> findByMainCode(String mainCode);
    List<OpeningBalance> findByDepartmentNameIgnoreCase(String departmentName);

    long countByCategoryNameIgnoreCase(String categoryName);

    List<OpeningBalance> findByCategoryNameIgnoreCase(String categoryName);

    void deleteByCategoryNameIgnoreCase(String categoryName);

    void deleteByItemCodeIgnoreCase(String itemCode);

    void deleteByDepartmentNameIgnoreCase(String departmentName);

    void deleteByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
            String itemCode, String categoryName, String departmentName);
}
