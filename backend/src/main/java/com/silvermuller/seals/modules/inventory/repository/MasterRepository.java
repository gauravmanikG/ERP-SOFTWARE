package com.silvermuller.seals.modules.inventory.repository;

import com.silvermuller.seals.modules.inventory.model.Master;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface MasterRepository extends JpaRepository<Master, Long> {
    List<Master> findAllByOrderByIdAsc();

    Optional<Master> findByCodeIgnoreCase(String code);

    long countByCategoryIgnoreCase(String category);

    List<Master> findByCategoryIgnoreCase(String category);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Master m WHERE m.id = :id")
    Optional<Master> findByIdForUpdate(@Param("id") Long id);
}

