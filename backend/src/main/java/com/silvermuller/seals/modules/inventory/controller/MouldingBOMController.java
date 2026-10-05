package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.MovementPlan;
import com.silvermuller.seals.modules.inventory.dto.MouldingBOMRequest;
import com.silvermuller.seals.modules.inventory.dto.MouldingBOMResponse;
import com.silvermuller.seals.modules.inventory.model.FgBomEntry;
import com.silvermuller.seals.modules.inventory.service.FgBomTransferRuleService;
import com.silvermuller.seals.modules.inventory.service.MouldingBOMService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory/moulding-bom")
@CrossOrigin(origins = "*")
public class MouldingBOMController {

    private final MouldingBOMService mouldingBOMService;
    private final FgBomTransferRuleService fgBomTransferRuleService;

    public MouldingBOMController(MouldingBOMService mouldingBOMService,
                                  FgBomTransferRuleService fgBomTransferRuleService) {
        this.mouldingBOMService = mouldingBOMService;
        this.fgBomTransferRuleService = fgBomTransferRuleService;
    }

    @PostMapping("/preview")
    public ResponseEntity<MovementPlan> previewTransfer(@RequestBody MouldingBOMRequest request) {
        MovementPlan plan = mouldingBOMService.previewTransfer(request);
        return ResponseEntity.ok(plan);
    }

    @PostMapping("/transfer")
    public ResponseEntity<MouldingBOMResponse> executeTransfer(@Valid @RequestBody MouldingBOMRequest request) {
        MouldingBOMResponse response = mouldingBOMService.executeTransfer(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<java.util.List<com.silvermuller.seals.modules.inventory.dto.TransactionResponse>> getTransferHistory() {
        return ResponseEntity.ok(mouldingBOMService.getTransferHistory());
    }

    /**
     * Get FG BOM recipe for a specific item code.
     * Used by the UI to display the BOM consumption breakdown.
     */
    @GetMapping("/fg-bom/{code}")
    public ResponseEntity<FgBomEntry> getFgBomByCode(@PathVariable String code) {
        FgBomEntry entry = fgBomTransferRuleService.getFgBomByCode(code);
        if (entry == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(entry);
    }

    /**
     * Get all FG BOM entries with bom_count > 0.
     */
    @GetMapping("/fg-bom")
    public ResponseEntity<List<FgBomEntry>> getAllFgBom() {
        return ResponseEntity.ok(fgBomTransferRuleService.getAllFgBom());
    }
}

