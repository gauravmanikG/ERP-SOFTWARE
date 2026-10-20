package com.silvermuller.seals.modules.purchase.servicepo;

import com.silvermuller.seals.modules.purchase.servicepo.ServicePoDtos.MilestoneRequest;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoDtos.ScheduleRequest;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService.ServicePoException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Schedule generation rules and the "Service PO never enters GRN" guard. No database needed. */
class ServicePoScheduleAndGuardTest {

    private static final BigDecimal TAXABLE = new BigDecimal("12000.00");
    private static final LocalDate VALID_TO = LocalDate.of(2027, 12, 31);

    private static ScheduleRequest recurring(String freq, int interval, Integer occurrences, LocalDate end, BigDecimal perOcc) {
        return new ScheduleRequest(true, "RECURRING", freq, interval, LocalDate.of(2026, 11, 1), end,
                occurrences, new BigDecimal("1"), perOcc, null);
    }

    @Test
    void monthlyContractGeneratesPlannedOccurrencesWithoutDuplicates() {
        List<ServicePoService.ScheduleRow> rows = ServicePoService.buildSchedules(
                recurring("MONTHLY", 1, 12, null, null), TAXABLE, VALID_TO);

        assertEquals(12, rows.size());
        assertEquals(LocalDate.of(2026, 11, 1), rows.get(0).scheduledDate());
        assertEquals(LocalDate.of(2027, 10, 1), rows.get(11).scheduledDate());
        assertEquals(new BigDecimal("1000.00"), rows.get(0).plannedAmount());
        BigDecimal sum = rows.stream().map(ServicePoService.ScheduleRow::plannedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("12000.00"), sum);
        assertEquals(12, rows.stream().map(ServicePoService.ScheduleRow::seq).distinct().count());
    }

    @Test
    void recurrenceStopsAtEndDateWhenNoOccurrenceCountGiven() {
        List<ServicePoService.ScheduleRow> rows = ServicePoService.buildSchedules(
                recurring("WEEKLY", 2, null, LocalDate.of(2026, 12, 31), null), TAXABLE, VALID_TO);
        // 1 Nov, 15 Nov, 29 Nov, 13 Dec, 27 Dec
        assertEquals(5, rows.size());
        assertEquals(LocalDate.of(2026, 12, 27), rows.get(4).scheduledDate());
    }

    @Test
    void recurrenceBeyondValidityIsRejected() {
        ServicePoException ex = assertThrows(ServicePoException.class, () ->
                ServicePoService.buildSchedules(recurring("MONTHLY", 1, 6, null, null), TAXABLE, LocalDate.of(2026, 12, 31)));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("validity"));
    }

    @Test
    void perOccurrenceAmountCannotExceedPoValue() {
        assertThrows(ServicePoException.class, () ->
                ServicePoService.buildSchedules(recurring("MONTHLY", 1, 12, null, new BigDecimal("1100")), TAXABLE, VALID_TO));
    }

    @Test
    void recurringScheduleNeedsCountOrEndDate() {
        assertThrows(ServicePoException.class, () ->
                ServicePoService.buildSchedules(recurring("MONTHLY", 1, null, null, null), TAXABLE, VALID_TO));
    }

    @Test
    void milestonesMustNotExceedPoValue() {
        ScheduleRequest ok = new ScheduleRequest(true, "MILESTONE", null, null, null, null, null, null, null, List.of(
                new MilestoneRequest("Mobilisation", LocalDate.of(2026, 11, 10), new BigDecimal("4000")),
                new MilestoneRequest("Completion", LocalDate.of(2027, 1, 10), new BigDecimal("8000"))));
        List<ServicePoService.ScheduleRow> rows = ServicePoService.buildSchedules(ok, TAXABLE, VALID_TO);
        assertEquals(2, rows.size());
        assertEquals("Completion", rows.get(1).description());

        ScheduleRequest over = new ScheduleRequest(true, "MILESTONE", null, null, null, null, null, null, null, List.of(
                new MilestoneRequest("Everything", LocalDate.of(2026, 11, 10), new BigDecimal("12001"))));
        assertThrows(ServicePoException.class, () -> ServicePoService.buildSchedules(over, TAXABLE, VALID_TO));
    }

    @Test
    void oneTimeScheduleCoversWholeTaxableValue() {
        ScheduleRequest one = new ScheduleRequest(true, "ONE_TIME", null, null, LocalDate.of(2026, 11, 20), null,
                null, null, null, null);
        List<ServicePoService.ScheduleRow> rows = ServicePoService.buildSchedules(one, TAXABLE, VALID_TO);
        assertEquals(1, rows.size());
        assertEquals(TAXABLE, rows.get(0).plannedAmount());
    }

    @Test
    void grnGuardRefusesServicePoNumbers() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any())).thenReturn(1);

        com.silvermuller.seals.common.exception.InvalidTransactionException ex = assertThrows(
                com.silvermuller.seals.common.exception.InvalidTransactionException.class,
                () -> ServicePoService.assertNotServicePo(jdbc, "SPO-2026-00001"));
        assertTrue(ex.getMessage().contains("cannot use GRN"));
    }

    @Test
    void grnGuardAllowsStandardPoNumbers() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any())).thenReturn(0);

        assertDoesNotThrow(() -> ServicePoService.assertNotServicePo(jdbc, "PO-2026-00001"));
    }
}
