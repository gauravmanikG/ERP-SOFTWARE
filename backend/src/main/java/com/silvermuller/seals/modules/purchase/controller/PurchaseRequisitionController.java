package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.admin.security.AdminGuard;
import com.silvermuller.seals.modules.admin.security.CurrentUser;
import com.silvermuller.seals.modules.purchase.model.PurchaseRequisition;
import com.silvermuller.seals.modules.purchase.service.PurchaseRequisitionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase/requisitions")
public class PurchaseRequisitionController {

    private final PurchaseRequisitionService prService;
    private final AdminGuard guard;

    public PurchaseRequisitionController(PurchaseRequisitionService prService, AdminGuard guard) {
        this.prService = prService;
        this.guard = guard;
    }

    /** Status change -> the permission it needs (Approved needs purchase.pr:approve, and so on). */
    private static String permissionForStatus(String status) {
        return switch (status == null ? "" : status.trim()) {
            case "Approved" -> "purchase.pr:approve";
            case "Rejected" -> "purchase.pr:reject";
            case "Pending Approval" -> "purchase.pr:submit";
            case "Cancelled" -> "purchase.pr:cancel";
            // unknown statuses are rejected by the service; still require approval authority to get that far
            default -> "purchase.pr:approve";
        };
    }

    @GetMapping
    public ResponseEntity<List<PurchaseRequisition>> getAllRequisitions() {
        return ResponseEntity.ok(prService.getAllRequisitions());
    }

    @GetMapping("/next-number")
    public ResponseEntity<Map<String, String>> getNextPrNumber() {
        return ResponseEntity.ok(Map.of("prNumber", prService.getNextPrNumber()));
    }

    @GetMapping("/{prNumber}")
    public ResponseEntity<PurchaseRequisition> getRequisition(@PathVariable String prNumber) {
        PurchaseRequisition pr = prService.getRequisitionByNumber(prNumber);
        if (pr == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pr);
    }

    /**
     * Save a PR. Needs purchase.pr:create for a new PR or purchase.pr:edit for an existing one; saving it as
     * anything other than a Draft also submits it for approval, which needs purchase.pr:submit.
     */
    @PostMapping
    public ResponseEntity<PurchaseRequisition> createOrUpdateRequisition(
            @RequestHeader(value = "Authorization", required = false) String authz,
            @RequestBody PurchaseRequisition pr) {
        boolean exists = pr.getPrNumber() != null && !pr.getPrNumber().isBlank()
                && prService.getRequisitionByNumber(pr.getPrNumber()) != null;
        guard.requireAny(authz, exists ? "purchase.pr:edit" : "purchase.pr:create");
        if (!"Draft".equals(pr.getStatus())) {
            guard.requireAny(authz, "purchase.pr:submit");
        }
        return ResponseEntity.ok(prService.createOrUpdateRequisition(pr));
    }

    /**
     * Approve / reject / submit / cancel a PR. The permission depends on the target status, and the decision is
     * recorded under the signed-in user's name — never a name sent by the browser.
     */
    @PutMapping("/{prNumber}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authz,
            @PathVariable String prNumber,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "Approved");
        String reason = body.get("reason");
        CurrentUser actor = guard.requireAny(authz, permissionForStatus(status));
        prService.updateStatus(prNumber, status, reason, actor.name());
        return ResponseEntity.ok(Map.of("success", true, "prNumber", prNumber, "status", status));
    }

    @DeleteMapping("/{prNumber}")
    public ResponseEntity<Map<String, Object>> deleteRequisition(@PathVariable String prNumber) {
        prService.deleteRequisition(prNumber);
        return ResponseEntity.ok(Map.of("success", true, "prNumber", prNumber));
    }
}
