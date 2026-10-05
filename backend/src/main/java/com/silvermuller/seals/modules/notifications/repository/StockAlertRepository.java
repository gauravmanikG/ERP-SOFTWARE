package com.silvermuller.seals.modules.notifications.repository;

import com.silvermuller.seals.modules.notifications.model.StockAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface StockAlertRepository extends JpaRepository<StockAlert, Long> {
    List<StockAlert> findAllByOrderByCreatedAtDesc();

    long countByUnreadTrueAndResolvedFalse();

    long countByResolvedFalse();

    long countByResolvedTrue();

    Optional<StockAlert> findFirstByRuleIdAndDepartmentNameIgnoreCaseAndKindAndResolvedFalse(
            Long ruleId, String departmentName, String kind);

    List<StockAlert> findByRuleIdAndDepartmentNameIgnoreCaseAndResolvedFalse(Long ruleId, String departmentName);

    void deleteByRuleId(Long ruleId);

    @Query("""
            SELECT a FROM StockAlert a
            WHERE (CAST(:resolved AS boolean) IS NULL OR a.resolved = :resolved)
              AND (CAST(:unread AS boolean) IS NULL OR a.unread = :unread)
              AND (CAST(:item AS string) IS NULL OR LOWER(a.itemCode) LIKE :item)
              AND (CAST(:dept AS string) IS NULL OR LOWER(a.departmentName) LIKE :dept)
              AND (CAST(:fromTs AS timestamp) IS NULL OR a.createdAt >= :fromTs)
              AND (CAST(:toTs AS timestamp) IS NULL OR a.createdAt <= :toTs)
            ORDER BY a.createdAt DESC
            """)
    Page<StockAlert> search(
            @Param("resolved") Boolean resolved,
            @Param("unread") Boolean unread,
            @Param("item") String item,
            @Param("dept") String dept,
            @Param("fromTs") OffsetDateTime fromTs,
            @Param("toTs") OffsetDateTime toTs,
            Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("""
            DELETE FROM StockAlert a
            WHERE (CAST(:resolved AS boolean) IS NULL OR a.resolved = :resolved)
              AND (CAST(:unread AS boolean) IS NULL OR a.unread = :unread)
              AND (CAST(:item AS string) IS NULL OR LOWER(a.itemCode) LIKE :item)
              AND (CAST(:dept AS string) IS NULL OR LOWER(a.departmentName) LIKE :dept)
              AND (CAST(:fromTs AS timestamp) IS NULL OR a.createdAt >= :fromTs)
              AND (CAST(:toTs AS timestamp) IS NULL OR a.createdAt <= :toTs)
            """)
    int deleteMatching(
            @Param("resolved") Boolean resolved,
            @Param("unread") Boolean unread,
            @Param("item") String item,
            @Param("dept") String dept,
            @Param("fromTs") OffsetDateTime fromTs,
            @Param("toTs") OffsetDateTime toTs);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM StockAlert a WHERE a.resolved = true")
    int deleteAllResolved();

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM StockAlert a WHERE a.resolved = true AND a.updatedAt < :cutoff")
    int deleteResolvedOlderThan(@Param("cutoff") OffsetDateTime cutoff);
}
