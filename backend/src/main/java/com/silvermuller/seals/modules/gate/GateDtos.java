package com.silvermuller.seals.modules.gate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request bodies of the gate API. Every quantity, time and identity is re-checked or set on the server. */
public final class GateDtos {

    private GateDtos() {}

    /** Answers "YES" or "NO" for each security check at the gate. */
    public record SecurityChecks(String vehicle, String driver, String vendor, String po, String invoice,
                                 String challan, String documents) {}

    /** One PO line on the vehicle, with the quantity the vendor's document declares. */
    public record LineRequest(String poNumber, String itemCode, BigDecimal declaredQty, String remarks) {}

    public record EntryRequest(
            String clientRequestId,
            String gateCode,
            String vehicleNumber,
            String vehicleType,
            String driverName,
            String driverMobile,
            String transporter,
            String vendorCode,
            Boolean multiVendor,
            String invoiceNo,
            LocalDate invoiceDate,
            String challanNo,
            LocalDate challanDate,
            String ewayBillNo,
            String lrNo,
            SecurityChecks checks,
            String securityRemarks,
            String remarks,
            Integer version,
            List<LineRequest> lines
    ) {}

    public record UnloadLine(Long lineId, BigDecimal unloadedQty, String remarks) {}

    public record UnloadRequest(List<UnloadLine> lines, String remarks) {}

    public record VerifyLine(Long lineId, BigDecimal acceptedQty, BigDecimal rejectedQty, BigDecimal holdQty,
                             String rejectReason, String holdReason) {}

    public record VerifyRequest(List<VerifyLine> lines, String remarks) {}

    /** Moves held quantity to accepted and/or rejected after inspection. */
    public record ReleaseHoldRequest(BigDecimal acceptQty, BigDecimal rejectQty, String remarks) {}

    public record ReasonRequest(String reason) {}

    public record AttachmentRequest(Long gateEntryId, String docType, String fileName, String contentType,
                                    String contentBase64) {}

    public record GateRequest(String gateCode, String gateName, String status) {}
}
