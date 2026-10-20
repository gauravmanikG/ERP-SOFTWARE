package com.silvermuller.seals.modules.maintenance.controller;

import com.silvermuller.seals.modules.maintenance.dto.CreateMachineRequest;
import com.silvermuller.seals.modules.maintenance.dto.MachineResponse;
import com.silvermuller.seals.modules.maintenance.service.MachineMasterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/maintenance/machines")
public class MachineMasterController {

    private final MachineMasterService machineService;

    public MachineMasterController(MachineMasterService machineService) {
        this.machineService = machineService;
    }

    @GetMapping
    public ResponseEntity<List<MachineResponse>> getMachines(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String dept,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {
        if (query != null || dept != null || category != null || status != null) {
            return ResponseEntity.ok(machineService.searchMachines(query, dept, category, status));
        }
        return ResponseEntity.ok(machineService.getAllMachines());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MachineResponse> getMachineById(@PathVariable Long id) {
        return ResponseEntity.ok(machineService.getMachineById(id));
    }

    @PostMapping
    public ResponseEntity<MachineResponse> createMachine(@Valid @RequestBody CreateMachineRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(machineService.createMachine(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MachineResponse> updateMachine(
            @PathVariable Long id,
            @Valid @RequestBody CreateMachineRequest body) {
        return ResponseEntity.ok(machineService.updateMachine(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMachine(@PathVariable Long id) {
        machineService.deleteMachine(id);
        return ResponseEntity.ok(Map.of("message", "Machine deleted successfully"));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(machineService.getStats());
    }
}
