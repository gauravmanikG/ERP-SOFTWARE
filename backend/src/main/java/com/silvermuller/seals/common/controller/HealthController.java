package com.silvermuller.seals.common.controller;

import com.silvermuller.seals.modules.company.repository.CompanyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    private final CompanyRepository repository;

    public HealthController(CompanyRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        try {
            repository.checkConnection();
            return ResponseEntity.ok(Map.of("ok", true, "db", "connected"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "db", "unreachable", "error", e.getMessage()));
        }
    }
}
