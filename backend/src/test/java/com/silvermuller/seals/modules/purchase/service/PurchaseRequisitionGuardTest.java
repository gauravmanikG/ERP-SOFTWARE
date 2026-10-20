package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.common.exception.ConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.*;

/** Deletion and edit guards for PRs that PO by PR has allocated. No database: JdbcTemplate is mocked. */
class PurchaseRequisitionGuardTest {

    private static final String PR = "PR-2026-00031";

    /** Stubs the PR lookup, the allocation count (returns allocations) and records every update. */
    private static JdbcTemplate jdbcForPr(int allocations) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), eq(Long.class), any(Object[].class))).thenReturn(List.of(7L));
        when(jdbc.queryForObject(argThat((String s) -> s != null && s.contains("po_pr_allocations")), eq(Integer.class), any(Object[].class)))
                .thenReturn(allocations);
        return jdbc;
    }

    @Test
    void deleteIsRefusedWithConflictWhenPoByPrAllocationsExist() {
        JdbcTemplate jdbc = jdbcForPr(3);
        PurchaseRequisitionService svc = new PurchaseRequisitionService(jdbc);

        assertThrows(ConflictException.class, () -> svc.deleteRequisition(PR));
        verify(jdbc, never()).update(startsWith("DELETE"), any(Object[].class));
    }

    @Test
    void deleteOfPrWithoutAllocationsFollowsTheExistingPath() {
        JdbcTemplate jdbc = jdbcForPr(0);
        PurchaseRequisitionService svc = new PurchaseRequisitionService(jdbc);

        svc.deleteRequisition(PR);

        verify(jdbc).update(eq("DELETE FROM purchase_requisition_items WHERE pr_id = ?"), eq(7L));
        verify(jdbc).update(eq("DELETE FROM purchase_requisitions WHERE id = ?"), eq(7L));
    }

    @Test
    void manualOrderedQtyChangeIsRefusedForAnAllocatedLine() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(1);
        PurchaseRequisitionService svc = new PurchaseRequisitionService(jdbc);

        assertThrows(ConflictException.class, () -> svc.assertNoPoByPrAllocations(PR, "CON01-0001"));
    }

    @Test
    void manualOrderedQtyChangeIsAllowedWhenNothingWasAllocated() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(0);
        PurchaseRequisitionService svc = new PurchaseRequisitionService(jdbc);

        assertDoesNotThrow(() -> svc.assertNoPoByPrAllocations(PR, "CON01-0001"));
    }
}
