package com.silvermuller.seals.common.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * The root address. When the build includes the ERP screens (frontend/dist copied into static/ by pom.xml), "/" opens
 * the ERP, so a hosted install is one program on one address. An API-only build answers with a short service summary.
 */
@RestController
public class HomeController {

    private static final Resource INDEX = new ClassPathResource("static/index.html");

    @GetMapping("/")
    public ResponseEntity<?> home() {
        if (INDEX.exists()) {
            // no-cache: the browser re-checks the page on each visit, so a new release is picked up at once
            // (the scripts and styles it loads have content-hashed names and can be cached).
            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).cacheControl(CacheControl.noCache()).body(INDEX);
        }
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "Silver Muller Seals ERP Backend API",
            "version", "1.0.0",
            "endpoints", Map.of(
                "departments", "/api/inventory/departments",
                "items", "/api/inventory/items"
            )
        ));
    }
}
