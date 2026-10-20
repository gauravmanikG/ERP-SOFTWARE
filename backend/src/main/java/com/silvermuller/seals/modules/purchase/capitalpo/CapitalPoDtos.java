package com.silvermuller.seals.modules.purchase.capitalpo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request payloads for the Capital PO API. Totals and tax amounts are never accepted from the client. */
public final class CapitalPoDtos {

    private CapitalPoDtos() {}

    public record LineRequest(
            Integer lineNo,              // optional; required on amendments for existing lines
            String assetCategory,
            String assetName,
            String assetDescription,
            String assetCodeRef,
            String manufacturer,
            String modelNumber,
            String technicalSpecs,
            BigDecimal quantity,
            String uom,
            BigDecimal unitPrice,
            String discountType,
            BigDecimal discountValue,
            String hsnCode,
            LocalDate expectedDeliveryDate,
            String deliveryLocation,
            Boolean installationRequired,
            Boolean commissioningRequired,
            Integer warrantyMonths,
            String warrantyStartCondition,
            Boolean amcRequired,
            Integer usefulLifeYears,
            String remarks,
            Long prItemId,
            String responsibleTeam
    ) {}

    public record PoRequest(
            String vendorCode,
            Long departmentId,
            String requester,
            String companyGstin,
            String companyStateCode,
            String placeOfSupplyStateCode,
            String plantLocation,
            String deliveryAddress,
            String prNumber,
            String quotationReference,
            String rfqReference,
            String contractReference,
            String currency,
            LocalDate poDate,
            LocalDate validityEnd,
            LocalDate expectedDeliveryDate,
            String paymentTerms,
            String deliveryTerms,
            String warrantyTerms,
            String remarks,
            BigDecimal shippingInstallationCharges,
            BigDecimal freightOtherCharges,
            String chargesSacCode,
            BigDecimal advancePercent,
            String clientRequestId,
            Integer version,
            String reason,
            List<LineRequest> lines
    ) {}

    public record ScheduleRow(
            String scheduleType,         // DELIVERY / INSTALLATION / COMMISSIONING / PAYMENT
            Integer lineNo,              // required for DELIVERY, INSTALLATION, COMMISSIONING
            LocalDate plannedDate,
            BigDecimal plannedQty,
            BigDecimal plannedAmount,
            String triggerEvent,         // PAYMENT only
            String description,
            String responsibleDepartment,
            String responsibleContact
    ) {}

    public record ScheduleRequest(Boolean enabled, List<ScheduleRow> rows) {}

    public record ActionRequest(String comments, LocalDate newValidityEnd) {}

    public record ReceiptLine(Integer lineNo, BigDecimal qtyReceived, String serialNumbers) {}

    public record ReceiptRequest(
            String idempotencyKey,
            LocalDate receiptDate,
            String deliveryChallanNo,
            String invoiceReference,
            String receivedCondition,
            String inspectionStatus,
            String remarks,
            List<ReceiptLine> lines
    ) {}

    public record InspectionRequest(String inspectionStatus, String remarks) {}

    /** Installation / commissioning progress on one line. Kept separate from receipt status. */
    public record LineEventRequest(String status, LocalDate eventDate, String remarks, String responsibleTeam) {}

    public record RegisterRequest(Long receiptLineId, String serialNumbers, String comments) {}

    public record AttachmentRequest(String docType, Integer lineNo, Long receiptId, String fileName,
                                    String contentType, String contentBase64) {}

    public record CategoryRequest(String name, String treatment) {}

    public record AmendmentDecision(Long amendmentId, Boolean approve, String comments) {}
}
