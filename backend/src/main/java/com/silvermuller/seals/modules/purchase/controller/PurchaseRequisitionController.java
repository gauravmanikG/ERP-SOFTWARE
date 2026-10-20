package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.model.PurchaseRequisition;
import com.silvermuller.seals.modules.purchase.service.PurchaseRequisitionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase/requisitions")
@CrossOrigin(origins = "*")
public class PurchaseRequisitionController {

    private final PurchaseRequisitionService prService;

    public PurchaseRequisitionController(PurchaseRequisitionService prService) {
        this.prService = prService;
    }

    @GetMapping
    public ResponseEntity<List<PurchaseRequisition>> getAllRequisitions() {
        return ResponseEntity.ok(prService.getAllRequisitions());
    }

    @GetMapping("/next-number")
    public ResponseEntity<Map<String, String>> getNextPrNumber() {
        return ResponseEntity.ok(Map.of("prNumber", prService.getNextPrNumber()));
    }

    @GetMapping("/{prNumber}")
    public ResponseEntity<PurchaseRequisition> getRequisition(@PathVariable String prNumber) {
        PurchaseRequisition pr = prService.getRequisitionByNumber(prNumber);
        if (pr == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pr);
    }

    @PostMapping
    public ResponseEntity<PurchaseRequisition> createOrUpdateRequisition(@RequestBody PurchaseRequisition pr) {
        return ResponseEntity.ok(prService.createOrUpdateRequisition(pr));
    }

    @PutMapping("/{prNumber}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable String prNumber,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "Approved");
        String reason = body.get("reason");
        String user = body.getOrDefault("user", "Authorizer");
        prService.updateStatus(prNumber, status, reason, user);
        return ResponseEntity.ok(Map.of("success", true, "prNumber", prNumber, "status", status));
    }

    @PutMapping("/{prNumber}/items/{itemCode}/ordered-qty")
    public ResponseEntity<Map<String, Object>> updateOrderedQty(
            @PathVariable String prNumber,
            @PathVariable String itemCode,
            @RequestBody Map<String, Object> body) {
        Object deltaObj = body.get("deltaOrderedQty");
        BigDecimal delta = deltaObj != null ? new BigDecimal(deltaObj.toString()) : BigDecimal.ZERO;
        prService.assertNoPoByPrAllocations(prNumber, itemCode);
        prService.updateItemOrderedQty(prNumber, itemCode, delta);
        return ResponseEntity.ok(Map.of("success", true, "prNumber", prNumber, "itemCode", itemCode));
    }

    @DeleteMapping("/{prNumber}")
    public ResponseEntity<Map<String, Object>> deleteRequisition(@PathVariable String prNumber) {
        prService.deleteRequisition(prNumber);
        return ResponseEntity.ok(Map.of("success", true, "prNumber", prNumber));
    }
}
