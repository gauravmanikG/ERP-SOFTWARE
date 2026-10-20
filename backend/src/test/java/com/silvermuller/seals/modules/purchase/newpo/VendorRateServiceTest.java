package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.RateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class VendorRateServiceTest {

    private static final LocalDate EFFECTIVE = LocalDate.of(2026, 10, 19);

    private static NewPoException rejected(VendorRateService svc, RateRequest r, String actor) {
        return assertThrows(NewPoException.class, () -> svc.create(r, actor));
    }

    @Test
    void zeroOrNegativePriceIsRejectedBeforeAnyDatabaseCall() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        VendorRateService svc = new VendorRateService(jdbc);

        NewPoException zero = rejected(svc, new RateRequest("SUP-002", 1L, BigDecimal.ZERO, EFFECTIVE), "asha");
        NewPoException negative = rejected(svc, new RateRequest("SUP-002", 1L, new BigDecimal("-5"), EFFECTIVE), "asha");

        assertEquals(HttpStatus.BAD_REQUEST, zero.getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, negative.getStatus());
        verifyNoInteractions(jdbc);
    }

    @Test
    void priceWithMoreThanTwoDecimalsIsRejected() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        NewPoException ex = rejected(new VendorRateService(jdbc),
                new RateRequest("SUP-002", 1L, new BigDecimal("25.005"), EFFECTIVE), "asha");
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verifyNoInteractions(jdbc);
    }

    @Test
    void missingEffectiveDateIsRejected() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        NewPoException ex = rejected(new VendorRateService(jdbc),
                new RateRequest("SUP-002", 1L, new BigDecimal("25"), null), "asha");
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verifyNoInteractions(jdbc);
    }

    @Test
    void missingActorIsUnauthorized() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        NewPoException ex = rejected(new VendorRateService(jdbc),
                new RateRequest("SUP-002", 1L, new BigDecimal("25"), EFFECTIVE), " ");
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        verifyNoInteractions(jdbc);
    }

    @Test
    void unknownVendorIsRejected() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        NewPoException ex = rejected(new VendorRateService(jdbc),
                new RateRequest("SUP-NOPE", 1L, new BigDecimal("25"), EFFECTIVE), "asha");
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("SUP-NOPE"));
    }

    @Test
    void inactiveVendorIsRejected() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(Map.of("status", "INACTIVE")));
        NewPoException ex = rejected(new VendorRateService(jdbc),
                new RateRequest("SUP-002", 1L, new BigDecimal("25"), EFFECTIVE), "asha");
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("not active"));
    }

    @Test
    void sameVendorItemAndDateIsRefusedInsteadOfOverwritten() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(Map.of("status", "ACTIVE")));
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(1, 1);
        NewPoException ex = rejected(new VendorRateService(jdbc),
                new RateRequest("SUP-002", 1L, new BigDecimal("25"), EFFECTIVE), "asha");
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(jdbc, never()).queryForObject(anyString(), eq(Long.class), any(Object[].class));
    }
}
