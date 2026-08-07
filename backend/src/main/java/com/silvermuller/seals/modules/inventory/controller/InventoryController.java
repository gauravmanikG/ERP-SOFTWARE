package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.service.InventoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> getTransactions() {
        return ResponseEntity.ok(inventoryService.getTransactions());
    }

    @PostMapping("/transactions")
    public ResponseEntity<Map<String, Object>> createTransaction(@RequestBody Map<String, Object> body) {
        Map<String, Object> created = inventoryService.createTransaction(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/master-codes")
    public ResponseEntity<List<Map<String, Object>>> getMasterCodes() {
        return ResponseEntity.ok(inventoryService.getMasterCodes());
    }
}
