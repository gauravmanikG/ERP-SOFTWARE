package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.OperationMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OperationRepository extends JpaRepository<OperationMaster, Long> {
    Optional<OperationMaster> findByOperationName(String operationName);
    Optional<OperationMaster> findByOperationNameIgnoreCase(String operationName);
    List<OperationMaster> findAllByOrderByIdAsc();
}
