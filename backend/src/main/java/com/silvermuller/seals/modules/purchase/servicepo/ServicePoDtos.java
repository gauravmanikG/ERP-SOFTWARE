package com.silvermuller.seals.modules.purchase.servicepo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request payloads for the Service PO API. Totals and tax fields are intentionally absent: the backend computes them. */
public final class ServicePoDtos {

    private ServicePoDtos() {}

    public record ServicePoRequest(
            // Header
            String vendorCode,
            Long departmentId,
            String requester,
            String companyName,
            String companyGstin,
            String companyStateCode,
            String placeOfSupplyStateCode,
            String businessUnit,
            String serviceLocation,
            String prNumber,
            String quotationReference,
            String contractReference,
            String currency,
            LocalDate poDate,
            LocalDate validityStart,
            LocalDate validityEnd,
            LocalDate serviceStartDate,
            LocalDate serviceCompletionDate,
            String paymentTerms,
            String internalRemarks,
            String costCentre,
            BigDecimal estimatedBudget,
            // Service description & scope
            String serviceCategory,
            String serviceTitle,
            String scopeOfWork,
            String deliverables,
            String acceptanceCriteria,
            String slaTerms,
            String warrantyTerms,
            String exclusions,
            String specialInstructions,
            String relatedAssetId,
            String serviceFrequency,
            Integer numberOfVisits,
            String cancellationTerms,
            String termsAndConditions,
            // Pricing
            String pricingMethod,
            BigDecimal quantity,
            String unitOfMeasure,
            BigDecimal rate,
            BigDecimal fixedAmount,
            String discountType,
            BigDecimal discountValue,
            BigDecimal additionalCharges,
            // GST / SAC
            String sacCode,
            String gstTaxability,
            String nonGstReason,
            Boolean reverseCharge,
            BigDecimal advancePercent,
            BigDecimal retentionPercent,
            Boolean tdsApplicable,
            String tdsSection,
            BigDecimal tdsRate,
            // Optimistic lock for edits (required on update)
            Integer version,
            // Amendment reason (amend endpoint only)
            String reason
    ) {}

    public record MilestoneRequest(String description, LocalDate dueDate, BigDecimal amount) {}

    public record ScheduleRequest(
            Boolean enabled,
            String scheduleType,
            String frequency,
            Integer intervalCount,
            LocalDate startDate,
            LocalDate endDate,
            Integer occurrences,
            BigDecimal plannedQuantity,
            BigDecimal perOccurrenceAmount,
            List<MilestoneRequest> milestones
    ) {}

    public record AcceptanceRequest(
            Long scheduleId,
            LocalDate acceptanceDate,
            String serviceSummary,
            BigDecimal completedQuantity,
            BigDecimal completedHours,
            Integer completedVisits,
            String result,
            BigDecimal acceptedAmount,
            BigDecimal rejectedAmount,
            String remarks
    ) {}

    public record InvoiceRequest(
            Long acceptanceId,
            String invoiceNumber,
            LocalDate invoiceDate,
            BigDecimal taxableAmount,
            BigDecimal taxAmount,
            BigDecimal totalAmount
    ) {}

    /** Generic action body: approve/reject/hold/cancel/close use comments; extend uses newValidityEnd. */
    public record ActionRequest(String comments, LocalDate newValidityEnd) {}

    public record AttachmentRequest(String docType, String fileName, String contentType, String contentBase64) {}

    public record CategoryRequest(String name) {}
}
