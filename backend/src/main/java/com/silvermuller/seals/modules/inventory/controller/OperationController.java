package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.model.OperationMaster;
import com.silvermuller.seals.modules.inventory.repository.OperationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory/operations")
public class OperationController {

    private final OperationRepository operationRepository;

    public OperationController(OperationRepository operationRepository) {
        this.operationRepository = operationRepository;
    }

    @GetMapping
    public ResponseEntity<List<OperationMaster>> getAllOperations() {
        return ResponseEntity.ok(operationRepository.findAllByOrderByIdAsc());
    }

    @PostMapping
    public ResponseEntity<OperationMaster> createOperation(@RequestBody Map<String, String> body) {
        String name = body.get("operationName");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String trimmed = name.trim();
        return operationRepository.findByOperationNameIgnoreCase(trimmed)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    OperationMaster saved = operationRepository.save(new OperationMaster(trimmed));
                    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
                });
    }
}
