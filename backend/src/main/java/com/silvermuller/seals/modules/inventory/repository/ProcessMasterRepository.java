package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.ProcessMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcessMasterRepository extends JpaRepository<ProcessMaster, Long> {
    Optional<ProcessMaster> findByProcessCodeIgnoreCase(String processCode);
    List<ProcessMaster> findAllByOrderByIdAsc();
}
