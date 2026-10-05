package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.CategoryMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryMasterRepository extends JpaRepository<CategoryMaster, Long> {
    List<CategoryMaster> findAllByOrderByIdAsc();

    java.util.Optional<CategoryMaster> findByCategoryNameIgnoreCase(String categoryName);
}
