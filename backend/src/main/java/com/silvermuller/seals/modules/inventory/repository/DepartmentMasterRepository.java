package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.DepartmentMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentMasterRepository extends JpaRepository<DepartmentMaster, Long> {
    List<DepartmentMaster> findAllByOrderByProcessSequenceAsc();

    java.util.Optional<DepartmentMaster> findByDepartmentNameIgnoreCase(String departmentName);
}
