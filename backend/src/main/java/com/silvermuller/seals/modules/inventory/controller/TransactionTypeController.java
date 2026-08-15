package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.TransactionTypeResponse;
import com.silvermuller.seals.modules.inventory.service.TransactionTypeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory/transaction-types")
public class TransactionTypeController {

    private final TransactionTypeService transactionTypeService;

    public TransactionTypeController(TransactionTypeService transactionTypeService) {
        this.transactionTypeService = transactionTypeService;
    }

    @GetMapping
    public ResponseEntity<List<TransactionTypeResponse>> getAllTransactionTypes() {
        return ResponseEntity.ok(transactionTypeService.getAllTransactionTypes());
    }
}
