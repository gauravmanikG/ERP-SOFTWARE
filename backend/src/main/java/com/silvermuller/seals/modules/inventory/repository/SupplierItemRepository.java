package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.SupplierItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierItemRepository extends JpaRepository<SupplierItem, Long> {

    List<SupplierItem> findBySupplierId(Long supplierId);

    List<SupplierItem> findByItemId(Long itemId);

    Optional<SupplierItem> findBySupplierIdAndItemId(Long supplierId, Long itemId);

    void deleteBySupplierIdAndItemId(Long supplierId, Long itemId);

    @Query("SELECT COUNT(si) FROM SupplierItem si WHERE si.supplierId = ?1")
    long countBySupplierId(Long supplierId);

    @Query("SELECT COUNT(si) FROM SupplierItem si WHERE si.itemId = ?1")
    long countByItemId(Long itemId);
}
