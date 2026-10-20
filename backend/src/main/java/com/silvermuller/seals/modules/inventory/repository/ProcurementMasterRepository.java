package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.ProcurementMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcurementMasterRepository extends JpaRepository<ProcurementMaster, Long> {
    Optional<ProcurementMaster> findByProcurementTypeIgnoreCase(String procurementType);
    List<ProcurementMaster> findAllByOrderByIdAsc();
}
