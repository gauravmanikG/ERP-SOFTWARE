package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.model.PurchaseOrder;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/purchase")
public class PurchaseProcessingController {

    private final PurchaseProcessingService purchaseService;

    public PurchaseProcessingController(PurchaseProcessingService purchaseService) {
        this.purchaseService = purchaseService;
    }

    /**
     * Get all generated PO records.
     */
    @GetMapping("/orders")
    public ResponseEntity<List<PurchaseOrder>> getAllOrders() {
        return ResponseEntity.ok(purchaseService.getAllPurchaseOrders());
    }

    /**
     * Get PO by ID or PO Number.
     */
    @GetMapping("/orders/{idOrNumber}")
    public ResponseEntity<?> getOrderByNumber(@PathVariable String idOrNumber) {
        return purchaseService.getPurchaseOrder(idOrNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get Delivery Schedule Lines for a PO (used by GRN).
     */
    @GetMapping("/orders/{poNumber}/schedules")
    public ResponseEntity<?> getDeliverySchedules(@PathVariable String poNumber) {
        return ResponseEntity.ok(purchaseService.getDeliverySchedules(poNumber));
    }

    /**
     * Save Delivery Schedule Lines for a PO.
     */
    @PostMapping("/orders/{poNumber}/schedules")
    public ResponseEntity<?> saveDeliverySchedules(
            @PathVariable String poNumber,
            @RequestBody List<PurchaseOrderDeliverySchedule> schedules) {
        purchaseService.saveDeliverySchedules(poNumber, schedules);
        return ResponseEntity.ok(Map.of("success", true, "poNumber", poNumber, "count", schedules.size()));
    }

    /**
     * Record receipt against a specific scheduled delivery lot (used by GRN).
     */
    @PostMapping("/orders/{poNumber}/receipt")
    public ResponseEntity<?> recordScheduleReceipt(
            @PathVariable String poNumber,
            @RequestBody Map<String, Object> body) {
        String itemCode = (String) body.get("itemCode");
        Integer lotNumber = body.get("lotNumber") != null ? Integer.parseInt(body.get("lotNumber").toString()) : 1;
        BigDecimal qty = body.get("receivedQty") != null ? new BigDecimal(body.get("receivedQty").toString()) : BigDecimal.ZERO;
        try {
            purchaseService.recordScheduleReceipt(poNumber, itemCode, lotNumber, qty);
        } catch (IllegalArgumentException ex) {
            // e.g. PO validity expired: quantities are not updated
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
        return ResponseEntity.ok(Map.of("success", true, "poNumber", poNumber, "lotNumber", lotNumber, "receivedQty", qty));
    }
}
