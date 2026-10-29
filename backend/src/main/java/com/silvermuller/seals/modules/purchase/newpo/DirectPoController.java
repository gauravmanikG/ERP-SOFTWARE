package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Created;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Line;
import com.silvermuller.seals.modules.purchase.newpo.DirectPoService.Request;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedPo;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Direct PO endpoints. Separate from PO by PR; no PR is read or changed here. */
@RestController
@RequestMapping("/api/new-po/direct")
public class DirectPoController {

    private final DirectPoService directPo;
    private final com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService purchaseProcessing;

    public DirectPoController(DirectPoService directPo,
                              com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService purchaseProcessing) {
        this.directPo = directPo;
        this.purchaseProcessing = purchaseProcessing;
    }

    /** Body: vendorCode, poDate, expectedDeliveryDate, lines [{itemCode, quantity, dueOn}], remarks, PO Terms and printed header. */
    public record Body(String vendorCode, LocalDate poDate, LocalDate expectedDeliveryDate, List<Line> lines, String remarks,
                       java.math.BigDecimal deliveryFreight,
                       com.silvermuller.seals.modules.masters.PurchaseOrderTerms terms,
                       List<DeliveryLots.Lot> schedules,
                       String invoiceTo, String shipTo, String voucherNo, String referenceNo,
                       java.math.BigDecimal otherCharges, java.math.BigDecimal roundOff, String directReason) {
        Request toRequest() {
            return new Request(vendorCode, poDate, expectedDeliveryDate, lines, remarks, deliveryFreight, terms, schedules,
                    invoiceTo, shipTo, voucherNo, referenceNo, otherCharges, roundOff, directReason);
        }
    }

    /** The number the next Direct PO will get. Read only: nothing is reserved until the PO is created. */
    @GetMapping("/next-number")
    public Map<String, String> nextNumber() {
        return Map.of("poNumber", purchaseProcessing.peekPoNumber());
    }

    @PostMapping("/preview")
    public PlannedPo preview(@RequestBody Body body) {
        return directPo.preview(body.toRequest());
    }

    @PostMapping("/purchase-orders")
    public ResponseEntity<Created> create(@RequestBody Body body,
                                          @RequestHeader(value = "X-User-Name", required = false) String user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(directPo.create(body.toRequest(), user));
    }

    @GetMapping("/purchase-orders")
    public List<Map<String, Object>> list() {
        return directPo.list();
    }

    /** Cancels a Direct PO through the shared PO cancellation (receipts block it; no PR quantity is involved). */
    @PostMapping("/purchase-orders/{poNumber}/cancel")
    public Object cancel(@PathVariable String poNumber,
                         @RequestBody(required = false) Map<String, String> body,
                         @RequestHeader(value = "X-User-Name", required = false) String user) {
        String reason = body == null || body.get("reason") == null ? "Cancelled" : body.get("reason");
        return purchaseProcessing.cancelPurchaseOrder(poNumber, user, reason);
    }
}
