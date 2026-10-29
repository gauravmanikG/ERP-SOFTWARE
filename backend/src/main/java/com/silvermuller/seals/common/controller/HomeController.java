package com.silvermuller.seals.common.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of(
            "status", "UP",
            "service", "Silver Muller Seals ERP Backend API",
            "version", "1.0.0",
            "endpoints", Map.of(
                "departments", "/api/inventory/departments",
                "items", "/api/inventory/items"
            )
        );
    }
}
