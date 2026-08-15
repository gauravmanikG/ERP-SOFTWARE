package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.MasterStockResponse;
import com.silvermuller.seals.modules.inventory.service.MasterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory/master")
public class MasterController {

    private final MasterService masterService;

    public MasterController(MasterService masterService) {
        this.masterService = masterService;
    }

    @GetMapping
    public ResponseEntity<List<MasterStockResponse>> getAllMaster() {
        return ResponseEntity.ok(masterService.getAllMasterWithStock());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MasterStockResponse> getMasterById(@PathVariable Long id) {
        return ResponseEntity.ok(masterService.getMasterStockById(id));
    }

    @GetMapping("/{id}/balance")
    public ResponseEntity<MasterStockResponse> getMasterBalance(@PathVariable Long id) {
        return ResponseEntity.ok(masterService.getMasterStockById(id));
    }
}
