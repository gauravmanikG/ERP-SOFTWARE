package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.dto.ConsolidatedEligibleItemDto;
import com.silvermuller.seals.modules.purchase.dto.CreateClubbingBatchRequest;
import com.silvermuller.seals.modules.purchase.model.PrClubbingBatch;
import com.silvermuller.seals.modules.purchase.service.PrClubbingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase/clubbing")
@CrossOrigin(origins = "*")
public class PrClubbingController {

    private final PrClubbingService clubbingService;

    public PrClubbingController(PrClubbingService clubbingService) {
        this.clubbingService = clubbingService;
    }

    /**
     * Get consolidated eligible requirements grouped by itemCode and UOM.
     */
    @GetMapping("/eligible-items")
    public ResponseEntity<List<ConsolidatedEligibleItemDto>> getEligibleItems(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String uom,
            @RequestParam(required = false) String department) {
        return ResponseEntity.ok(clubbingService.getConsolidatedEligibleRequirements(search, category, uom, department));
    }

    /**
     * Create a new PR clubbing batch with consolidated lines and source PR allocations.
     */
    @PostMapping("/batches")
    public ResponseEntity<PrClubbingBatch> createBatch(@RequestBody CreateClubbingBatchRequest request) {
        return ResponseEntity.ok(clubbingService.createBatch(request));
    }

    /**
     * List all PR clubbing batches.
     */
    @GetMapping("/batches")
    public ResponseEntity<List<PrClubbingBatch>> getAllBatches(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(clubbingService.getAllBatches(status));
    }

    /**
     * Get a single PR clubbing batch by ID with item lines and source PR breakdown.
     */
    @GetMapping("/batches/{id}")
    public ResponseEntity<PrClubbingBatch> getBatchById(@PathVariable Long id) {
        return clubbingService.getBatchById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update PR clubbing batch status (e.g. READY_FOR_PURCHASE, CANCELLED, DRAFT).
     */
    @PutMapping("/batches/{id}/status")
    public ResponseEntity<PrClubbingBatch> updateBatchStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "READY_FOR_PURCHASE");
        return ResponseEntity.ok(clubbingService.updateBatchStatus(id, status));
    }

    /**
     * Delete / Cancel a PR clubbing batch.
     */
    @DeleteMapping("/batches/{id}")
    public ResponseEntity<Map<String, Object>> deleteBatch(@PathVariable Long id) {
        clubbingService.deleteBatch(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Clubbing batch deleted successfully."));
    }

    /**
     * Generate PO handoff payload for the Purchase Order module.
     */
    @GetMapping("/batches/{id}/handoff")
    public ResponseEntity<Map<String, Object>> getPoHandoff(
            @PathVariable Long id,
            @RequestParam(required = false) List<Long> itemIds) {
        return ResponseEntity.ok(clubbingService.generatePoHandoff(id, itemIds));
    }
}
