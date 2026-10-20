package com.silvermuller.seals.modules.purchase.service;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Pins the PR status rule that PO by PR relies on (recalculatePrStatus, extracted from updateItemOrderedQty). */
class PurchaseRequisitionStatusTest {

    private static final String PR = "PR-2026-00031";

    private static JdbcTemplate jdbcWithTotals(String requested, String ordered) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(argThat((String s) -> s != null && s.contains("SUM(req_qty)")), eq(BigDecimal.class), any(Object[].class)))
                .thenReturn(new BigDecimal(requested));
        when(jdbc.queryForObject(argThat((String s) -> s != null && s.contains("SUM(ordered_qty)")), eq(BigDecimal.class), any(Object[].class)))
                .thenReturn(new BigDecimal(ordered));
        return jdbc;
    }

    @Test
    void nothingOrderedMovesPrBackToApproved() {
        JdbcTemplate jdbc = jdbcWithTotals("100", "0");
        new PurchaseRequisitionService(jdbc).recalculatePrStatus(PR);
        verify(jdbc).update(contains("status = 'Approved'"), eq(PR));
    }

    @Test
    void partiallyOrderedWhenOrderedIsBelowRequested() {
        JdbcTemplate jdbc = jdbcWithTotals("400", "300");
        new PurchaseRequisitionService(jdbc).recalculatePrStatus(PR);
        verify(jdbc).update(contains("status = 'Partially Ordered'"), eq(PR));
    }

    @Test
    void fullyOrderedWhenOrderedReachesRequested() {
        JdbcTemplate jdbc = jdbcWithTotals("400", "400");
        new PurchaseRequisitionService(jdbc).recalculatePrStatus(PR);
        verify(jdbc).update(contains("status = 'Fully Ordered'"), eq(PR));
    }

    @Test
    void prWithNoRequestedQuantityIsLeftAlone() {
        JdbcTemplate jdbc = jdbcWithTotals("0", "0");
        new PurchaseRequisitionService(jdbc).recalculatePrStatus(PR);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
