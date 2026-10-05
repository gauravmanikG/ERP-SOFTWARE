package com.silvermuller.seals.modules.notifications.controller;

import com.silvermuller.seals.modules.notifications.dto.BulkDeleteAlertsRequest;
import com.silvermuller.seals.modules.notifications.dto.CreateStockAlertRuleRequest;
import com.silvermuller.seals.modules.notifications.model.StockAlertRule;
import com.silvermuller.seals.modules.notifications.service.StockAlertService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final StockAlertService stockAlertService;

    public NotificationController(StockAlertService stockAlertService) {
        this.stockAlertService = stockAlertService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(value = "refresh", defaultValue = "false") boolean refresh,
            @RequestParam(value = "status", defaultValue = "all") String status,
            @RequestParam(value = "item", required = false) String item,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(stockAlertService.listAlertsPage(
                refresh, status, item, department, from, to, page, size));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<Map<String, Object>> bulkDelete(@RequestBody BulkDeleteAlertsRequest body) {
        int deleted = stockAlertService.bulkDelete(body);
        return ResponseEntity.ok(Map.of(
                "deleted", deleted,
                "message", deleted + " notification" + (deleted == 1 ? "" : "s") + " deleted."));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("count", stockAlertService.unreadCount()));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markRead(
            @PathVariable Long id,
            @RequestParam(value = "unread", defaultValue = "false") boolean unread) {
        stockAlertService.markRead(id, unread);
        return ResponseEntity.ok(Map.of("message", unread ? "Marked unread." : "Marked read."));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllRead() {
        stockAlertService.markAllRead();
        return ResponseEntity.ok(Map.of("message", "All notifications marked read."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteAlert(@PathVariable Long id) {
        stockAlertService.deleteAlert(id);
        return ResponseEntity.ok(Map.of("message", "Notification deleted."));
    }

    @GetMapping("/rules")
    public ResponseEntity<List<Map<String, Object>>> listRules() {
        List<Map<String, Object>> body = stockAlertService.listRules().stream()
                .map(stockAlertService::toRuleMap)
                .toList();
        return ResponseEntity.ok(body);
    }

    @PostMapping("/rules")
    public ResponseEntity<List<Map<String, Object>>> createRules(@Valid @RequestBody CreateStockAlertRuleRequest body) {
        List<StockAlertRule> saved = stockAlertService.createRules(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved.stream().map(stockAlertService::toRuleMap).toList());
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<Map<String, Object>> updateRule(
            @PathVariable Long id,
            @Valid @RequestBody CreateStockAlertRuleRequest body) {
        return ResponseEntity.ok(stockAlertService.toRuleMap(stockAlertService.updateRule(id, body)));
    }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Map<String, String>> deleteRule(@PathVariable Long id) {
        stockAlertService.deleteRule(id);
        return ResponseEntity.ok(Map.of("message", "Notification rule deleted."));
    }
}
