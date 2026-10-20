package com.silvermuller.seals.modules.maintenance.repository;

import com.silvermuller.seals.modules.maintenance.model.MachineMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MachineMasterRepository extends JpaRepository<MachineMaster, Long> {

    List<MachineMaster> findAllByOrderBySerialNoAsc();

    Optional<MachineMaster> findByMachineNoIgnoreCase(String machineNo);

    @Query("SELECT m FROM MachineMaster m WHERE " +
           "(:dept IS NULL OR LOWER(m.department) = LOWER(:dept)) AND " +
           "(:cat IS NULL OR LOWER(m.category) = LOWER(:cat)) AND " +
           "(:status IS NULL OR LOWER(m.status) = LOWER(:status)) AND " +
           "(:query IS NULL OR " +
           " LOWER(m.machineNo) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(m.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(m.location) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(m.make) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(m.specification) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY m.serialNo ASC")
    List<MachineMaster> searchMachines(
            @Param("query") String query,
            @Param("dept") String dept,
            @Param("cat") String cat,
            @Param("status") String status
    );
}
