package com.silvermuller.seals.common.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Two health checks, used by the restart tooling (backend/run.ps1 watchdog, Docker HEALTHCHECK):
 *
 * - GET /api/health/live : liveness. 200 whenever the API process is responsive; never touches the database.
 *   The watchdog restarts the API only when this stops answering, because restarting cannot fix a database outage.
 * - GET /api/health      : readiness. 200 {"ok":true,"db":"connected"} only when PostgreSQL answers within
 *   {@value #DB_CHECK_TIMEOUT_SECONDS} seconds; otherwise 503 {"ok":false,"db":"disconnected"}.
 */
@RestController
public class HealthController {

    static final int DB_CHECK_TIMEOUT_SECONDS = 3;

    private final DataSource dataSource;

    // Small dedicated pool so a hanging database check can never block request threads or the common pool.
    private final ExecutorService dbCheckPool = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "health-db-check");
        t.setDaemon(true);
        return t;
    });

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/api/health/live")
    public ResponseEntity<Map<String, Object>> live() {
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean dbUp = databaseAnswers();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", dbUp);
        body.put("db", dbUp ? "connected" : "disconnected");
        return ResponseEntity.status(dbUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    private boolean databaseAnswers() {
        try {
            return CompletableFuture.supplyAsync(() -> {
                try (Connection c = dataSource.getConnection()) {
                    return c.isValid(DB_CHECK_TIMEOUT_SECONDS);
                } catch (Exception e) {
                    return false;
                }
            }, dbCheckPool).get(DB_CHECK_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (Exception e) {
            return false; // timed out, interrupted or rejected: report the database as unreachable
        }
    }
}
