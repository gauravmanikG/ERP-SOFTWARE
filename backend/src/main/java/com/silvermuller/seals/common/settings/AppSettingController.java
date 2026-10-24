package com.silvermuller.seals.common.settings;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class AppSettingController {

    private final AppSettingService settings;

    public AppSettingController(AppSettingService settings) {
        this.settings = settings;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        return ResponseEntity.ok(settings.getAll());
    }

    @PutMapping("/{key}")
    public ResponseEntity<Void> put(@PathVariable String key, @RequestBody Map<String, Object> body) {
        settings.put(key, body.get("value"));
        return ResponseEntity.noContent().build();
    }
}
