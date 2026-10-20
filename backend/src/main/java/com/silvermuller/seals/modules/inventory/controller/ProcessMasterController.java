package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.model.ProcessMaster;
import com.silvermuller.seals.modules.inventory.repository.ProcessMasterRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory/process-master")
public class ProcessMasterController {

    private final ProcessMasterRepository repository;

    public ProcessMasterController(ProcessMasterRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<ProcessMaster>> getAll() {
        return ResponseEntity.ok(repository.findAllByOrderByIdAsc());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String code = body.get("processCode");
        String desc = body.get("processDescription");

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "processCode is required"));
        }
        if (desc == null || desc.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "processDescription is required"));
        }

        String trimmedCode = code.trim();
        String trimmedDesc = desc.trim();

        return repository.findByProcessCodeIgnoreCase(trimmedCode)
                .map(existing -> {
                    existing.setProcessDescription(trimmedDesc);
                    if (body.containsKey("status")) {
                        existing.setStatus(body.get("status"));
                    }
                    return ResponseEntity.ok(repository.save(existing));
                })
                .orElseGet(() -> {
                    ProcessMaster pm = new ProcessMaster(trimmedCode, trimmedDesc);
                    pm.setStatus(body.getOrDefault("status", "ACTIVE"));
                    return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(pm));
                });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Process master entry deleted successfully"));
    }
}
