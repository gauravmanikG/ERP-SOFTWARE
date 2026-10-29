package com.silvermuller.seals.modules.purchase.jobwork;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request payloads for the Job Work API. Amounts and balances are calculated on the server. */
public final class JobWorkDtos {

    private JobWorkDtos() {}

    public record WorkerRequest(
            String supplierCode,
            String contactPerson,
            String phone,
            String email,
            String workLocation,
            List<Long> operationIds,
            String paymentTerms,
            Integer creditDays,
            String status,
            String blockedReason,
            String reason,
            String gstin,
            String pan,
            String registeredAddress
    ) {}

    public record RateContractRequest(
            Long operationId,
            String itemCategory,
            String rateBasis,
            BigDecimal rate,
            BigDecimal minQty,
            LocalDate effectiveFrom,
            LocalDate validUntil
    ) {}

    public record IndentLineRequest(
            Long masterId,
            BigDecimal requiredQty,
            Long operationId,
            String remarks,
            String category        // stock category the material is held under; defaults to the item master category
    ) {}

    public record IndentRequest(
            String clientRequestId,
            LocalDate indentDate,
            Long requestingDepartmentId,
            Long sourceDepartmentId,
            String reason,
            LocalDate requiredDispatchDate,
            LocalDate requiredReturnDate,
            String productionRef,
            Long preferredJobWorkerId,
            BigDecimal estimatedCost,
            String remarks,
            Integer version,
            List<IndentLineRequest> lines
    ) {}

    public record OrderLineRequest(
            Long indentLineNo,
            Long masterId,
            Long operationId,
            BigDecimal inputQty,
            BigDecimal expectedOutputQty,
            String remarks,
            String category
    ) {}

    public record OrderRequest(
            String clientRequestId,
            Long indentId,
            Long jobWorkerId,
            LocalDate jwoDate,
            Long requestingDepartmentId,
            Long sourceDepartmentId,
            LocalDate expectedStartDate,
            LocalDate expectedCompletionDate,
            LocalDate expectedReturnDate,
            String paymentTerms,
            String qualitySpecs,
            String deliveryTerms,
            String rejectionTerms,
            String remarks,
            Integer version,
            List<OrderLineRequest> lines
    ) {}

    public record ActionRequest(String comments) {}

    public record ChallanLineRequest(Long jwoLineId, BigDecimal qty, String batchNo) {}

    public record ChallanRequest(
            String clientRequestId,
            Long jwoId,
            LocalDate challanDate,
            boolean reworkDispatch,
            String destinationLocation,
            String transporter,
            String vehicleNo,
            String ewayBillNo,
            String purpose,
            String authorizedBy,
            String remarks,
            List<ChallanLineRequest> lines
    ) {}

    public record ReceiptLineRequest(Long jwoLineId, BigDecimal qtyReceived, BigDecimal unusedReturnedQty) {}

    public record ReceiptRequest(
            String idempotencyKey,
            Long jwoId,
            Long challanId,
            LocalDate receiptDate,
            String deliveryNoteNo,
            String remarks,
            List<ReceiptLineRequest> lines
    ) {}

    public record InspectionRequest(
            BigDecimal acceptedQty,
            BigDecimal rejectedQty,
            BigDecimal reworkQty,
            BigDecimal scrapQty,
            String defectCode,
            String remarks
    ) {}

    public record AttachmentRequest(String entityType, Long entityId, String docType, String fileName,
                                    String contentType, String contentBase64) {}
}
