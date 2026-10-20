package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.model.RfqHeader;
import com.silvermuller.seals.modules.purchase.service.RfqService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/purchase/rfq")
public class RfqController {

    private final RfqService rfqService;

    public RfqController(RfqService rfqService) {
        this.rfqService = rfqService;
    }

    @GetMapping
    public ResponseEntity<List<RfqHeader>> getAllRfqs() {
        return ResponseEntity.ok(rfqService.getAllRfqs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRfqById(@PathVariable Long id) {
        return rfqService.getRfqById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-pr/{prNumber}")
    public ResponseEntity<List<RfqHeader>> getRfqsByPrNumber(@PathVariable String prNumber) {
        return ResponseEntity.ok(rfqService.getRfqsByPrNumber(prNumber));
    }

    @GetMapping("/next-number")
    public ResponseEntity<Map<String, String>> getNextRfqNumber() {
        return ResponseEntity.ok(Map.of("rfqNumber", rfqService.generateNextRfqNumber()));
    }

    @PostMapping
    public ResponseEntity<?> createOrUpdateRfq(@RequestBody RfqHeader rfq) {
        try {
            RfqHeader saved = rfqService.createOrUpdateRfq(rfq);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error creating RFQ: " + ex.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body != null ? body.get("status") : null;
        if (status == null || status.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }
        rfqService.updateStatus(id, status.trim());
        return ResponseEntity.ok(Map.of("success", true, "status", status));
    }
}
