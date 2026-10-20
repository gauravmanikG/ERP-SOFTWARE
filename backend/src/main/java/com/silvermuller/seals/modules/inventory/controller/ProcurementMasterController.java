package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.model.ProcurementMaster;
import com.silvermuller.seals.modules.inventory.repository.ProcurementMasterRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory/procurement-master")
public class ProcurementMasterController {

    private final ProcurementMasterRepository repository;

    public ProcurementMasterController(ProcurementMasterRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<ProcurementMaster>> getAll() {
        return ResponseEntity.ok(repository.findAllByOrderByIdAsc());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String type = body.get("procurementType");
        if (type == null || type.isBlank()) {
            type = body.get("procurementName");
        }
        if (type == null || type.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "procurementType is required"));
        }
        String trimmed = type.trim();
        String name = body.getOrDefault("procurementName", trimmed);

        return repository.findByProcurementTypeIgnoreCase(trimmed)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    ProcurementMaster pm = new ProcurementMaster(trimmed, name);
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
        return ResponseEntity.ok(Map.of("message", "Procurement master entry deleted successfully"));
    }
}
