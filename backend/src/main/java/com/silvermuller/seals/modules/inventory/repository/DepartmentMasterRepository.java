package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.DepartmentMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentMasterRepository extends JpaRepository<DepartmentMaster, Long> {
    List<DepartmentMaster> findAllByOrderByProcessSequenceAsc();

    java.util.Optional<DepartmentMaster> findByDepartmentNameIgnoreCase(String departmentName);

    java.util.Optional<DepartmentMaster> findByDeptCode(String deptCode);

    /** Highest number used by a DPT-NNN code or a department number; new departments continue after it. */
    @Query(value = "SELECT COALESCE(MAX(GREATEST(COALESCE(CAST(SUBSTRING(dept_code FROM '^DPT-([0-9]+)$') AS INT), 0), " +
            "COALESCE(dept_number, 0))), 0) FROM public.department_master", nativeQuery = true)
    int highestDepartmentNumber();
}
