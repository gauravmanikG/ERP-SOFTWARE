package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    List<InventoryTransaction> findByMasterIdOrderByTransactionDateAscIdAsc(Long masterId);

    List<InventoryTransaction> findAllByOrderByTransactionDateDescIdDesc();

    boolean existsByReversedTransactionId(Long reversedTransactionId);

    Optional<InventoryTransaction> findByReversedTransactionId(Long reversedTransactionId);

    @Query("SELECT t.transactionNumber FROM InventoryTransaction t WHERE t.transactionType.id = :typeId ORDER BY t.id DESC LIMIT 1")
    Optional<String> findLatestTransactionNumberByTypeId(@Param("typeId") Long typeId);
}
