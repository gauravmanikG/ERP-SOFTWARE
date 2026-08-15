package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionTypeRepository extends JpaRepository<TransactionType, Long> {
    Optional<TransactionType> findByTypeIgnoreCase(String type);
}
