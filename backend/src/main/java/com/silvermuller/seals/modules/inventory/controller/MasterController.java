package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.CreateMasterItemRequest;
import com.silvermuller.seals.modules.inventory.dto.ItemEditDetailResponse;
import com.silvermuller.seals.modules.inventory.dto.MasterStockResponse;
import com.silvermuller.seals.modules.inventory.service.MasterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @PostMapping
    public ResponseEntity<MasterStockResponse> createMaster(@Valid @RequestBody CreateMasterItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterService.createItem(request));
    }

    @GetMapping("/{id}/edit")
    public ResponseEntity<ItemEditDetailResponse> getItemForEdit(
            @PathVariable Long id,
            @RequestParam(value = "category", required = false) String category) {
        return ResponseEntity.ok(masterService.getItemForEdit(id, category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemEditDetailResponse> updateMaster(
            @PathVariable Long id,
            @Valid @RequestBody CreateMasterItemRequest request) {
        return ResponseEntity.ok(masterService.updateItem(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMaster(@PathVariable Long id) {
        masterService.deleteItem(id);
        return ResponseEntity.ok(Map.of("message", "Item and its opening/closing stock records were deleted."));
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
