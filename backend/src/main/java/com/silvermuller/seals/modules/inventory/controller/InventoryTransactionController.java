package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.CreateBatchTransactionRequest;
import com.silvermuller.seals.modules.inventory.dto.CreateReverseRequest;
import com.silvermuller.seals.modules.inventory.dto.CreateTransactionRequest;
import com.silvermuller.seals.modules.inventory.dto.TransactionResponse;
import com.silvermuller.seals.modules.inventory.service.InventoryTransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory/transactions")
public class InventoryTransactionController {

    private final InventoryTransactionService transactionService;

    public InventoryTransactionController(InventoryTransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getAllTransactions() {
        return ResponseEntity.ok(transactionService.getAllTransactions());
    }

    @GetMapping("/preview-transaction-number")
    public ResponseEntity<Map<String, String>> previewTransactionNumber(@RequestParam(defaultValue = "ISSUE") String type) {
        String txNum = transactionService.getPreviewTransactionNumber(type);
        return ResponseEntity.ok(Map.of("transactionNumber", txNum, "slipNumber", txNum));
    }

    @GetMapping("/preview-slip-number")
    public ResponseEntity<Map<String, String>> previewSlipNumber(@RequestParam(defaultValue = "ISSUE") String type) {
        String txNum = transactionService.getPreviewTransactionNumber(type);
        return ResponseEntity.ok(Map.of("transactionNumber", txNum, "slipNumber", txNum));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransactionById(@PathVariable Long id) {
        return ResponseEntity.ok(transactionService.getTransactionById(id));
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> createSingleTransaction(@Valid @RequestBody CreateTransactionRequest request) {
        TransactionResponse response = transactionService.processTransaction(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<TransactionResponse>> createBatchTransaction(@Valid @RequestBody CreateBatchTransactionRequest request) {
        List<TransactionResponse> responses = transactionService.processBatchTransaction(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @PostMapping("/reverse")
    public ResponseEntity<TransactionResponse> createReverse(@Valid @RequestBody CreateReverseRequest request) {
        TransactionResponse response = transactionService.processReverse(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
