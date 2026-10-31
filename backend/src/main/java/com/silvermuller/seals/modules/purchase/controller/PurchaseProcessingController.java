package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.model.PurchaseOrder;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
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
     * Replace the delivery lots of a PO. Received quantities on the lots come from posted GRNs, never from this request.
     */
    @PostMapping("/orders/{poNumber}/schedules")
    public ResponseEntity<?> saveDeliverySchedules(
            @PathVariable String poNumber,
            @RequestBody List<PurchaseOrderDeliverySchedule> schedules) {
        purchaseService.saveDeliverySchedules(poNumber, schedules);
        return ResponseEntity.ok(Map.of("success", true, "poNumber", poNumber, "count", schedules.size()));
    }
}
