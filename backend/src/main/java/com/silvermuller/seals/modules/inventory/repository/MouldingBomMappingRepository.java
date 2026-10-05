package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.MouldingBomMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MouldingBomMappingRepository extends JpaRepository<MouldingBomMapping, Long> {

    Optional<MouldingBomMapping> findByMouldedItemIdAndActiveTrue(Long mouldedItemId);

    Optional<MouldingBomMapping> findByMouldedItemCodeIgnoreCaseAndActiveTrue(String mouldedItemCode);
}
