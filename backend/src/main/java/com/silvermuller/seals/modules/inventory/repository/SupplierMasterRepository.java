package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.SupplierMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierMasterRepository extends JpaRepository<SupplierMaster, Long> {

    List<SupplierMaster> findAllByOrderBySupplierCodeAsc();

    Optional<SupplierMaster> findBySupplierCode(String supplierCode);

    Optional<SupplierMaster> findBySupplierId(String supplierId);

    Optional<SupplierMaster> findByGstin(String gstin);

    List<SupplierMaster> findByStateIgnoreCase(String state);

    List<SupplierMaster> findByGstRegistrationTypeIgnoreCase(String gstRegistrationType);

    @Query("""
        SELECT s FROM SupplierMaster s
        WHERE LOWER(s.supplierName) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(s.supplierCode) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(COALESCE(s.contactPerson, '')) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(COALESCE(s.city, '')) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(COALESCE(s.state, '')) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(COALESCE(s.gstin, '')) LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY s.supplierCode ASC
    """)
    List<SupplierMaster> searchSuppliers(@Param("query") String query);
}
