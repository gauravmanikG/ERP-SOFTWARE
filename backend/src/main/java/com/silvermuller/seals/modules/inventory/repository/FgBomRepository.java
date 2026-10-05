package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.FgBomEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FgBomRepository extends JpaRepository<FgBomEntry, Long> {

    /**
     * Find FG BOM entry by the old item code (e.g. "103", "314", "40151").
     */
    Optional<FgBomEntry> findByOldCodeIgnoreCase(String oldCode);

    /**
     * Find FG BOM entry by SMS New Part Number (e.g. "945-05758").
     */
    Optional<FgBomEntry> findBySmsNewPartNoIgnoreCase(String smsNewPartNo);

    /**
     * Find all FG BOM entries that have a non-zero bom_count.
     */
    List<FgBomEntry> findByBomCountGreaterThan(Integer minCount);

    /**
     * Check if a BOM entry exists for a given old code.
     */
    boolean existsByOldCodeIgnoreCase(String oldCode);
}
