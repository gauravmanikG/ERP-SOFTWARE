package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.dto.PurchaseCalculationRequest;
import com.silvermuller.seals.modules.purchase.dto.PurchaseCalculationResponse;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrder;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrderDeliverySchedule;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrderPaymentMilestone;
import com.silvermuller.seals.modules.purchase.model.PurchaseProposal;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/purchase")
public class PurchaseProcessingController {

    private final PurchaseProcessingService purchaseService;

    public PurchaseProcessingController(PurchaseProcessingService purchaseService) {
        this.purchaseService = purchaseService;
    }

    /**
     * Automatic backend monetary calculations for items and vendor groups.
     */
    @PostMapping("/calculate")
    public ResponseEntity<PurchaseCalculationResponse> calculate(@RequestBody PurchaseCalculationRequest request) {
        PurchaseCalculationResponse response = purchaseService.calculate(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all purchase proposals (drafts, pending approval, approved, rejected).
     */
    @GetMapping("/proposals")
    public ResponseEntity<List<PurchaseProposal>> getAllProposals(
            @RequestParam(required = false) String status) {
        List<PurchaseProposal> proposals = purchaseService.getAllProposals();
        if (status != null && !status.trim().isEmpty()) {
            proposals = proposals.stream()
                    .filter(p -> status.equalsIgnoreCase(p.getStatus()))
                    .toList();
        }
        return ResponseEntity.ok(proposals);
    }

    /**
     * Get proposal by ID.
     */
    @GetMapping("/proposals/{id}")
    public ResponseEntity<?> getProposalById(@PathVariable String id) {
        return purchaseService.getProposalById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Save draft or submit proposal for PO approval.
     */
    @PostMapping("/proposals")
    public ResponseEntity<?> saveOrSubmitProposal(
            @RequestBody PurchaseProposal proposal,
            @RequestParam(defaultValue = "false") boolean submit) {
        try {
            PurchaseProposal saved = purchaseService.saveOrSubmitProposal(proposal, submit);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error saving proposal: " + ex.getMessage()));
        }
    }

    /**
     * SCREEN 2 Approver Action: APPROVE
     */
    @PostMapping("/proposals/{id}/approve")
    public ResponseEntity<?> approveProposal(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String approver = (body != null && body.containsKey("approver")) ? body.get("approver") : "Authorized Approver";
            String validityDate = body != null ? body.get("validityDate") : null;
            Map<String, Object> result = purchaseService.approveProposal(id, approver, validityDate);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error approving proposal: " + ex.getMessage()));
        }
    }

    /**
     * SCREEN 2 Approver Action: REJECT
     */
    @PostMapping("/proposals/{id}/reject")
    public ResponseEntity<?> rejectProposal(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        try {
            String rejector = body != null ? body.get("rejector") : null;
            String reason = body != null ? body.get("reason") : null;
            PurchaseProposal rejected = purchaseService.rejectProposal(id, rejector, reason);
            return ResponseEntity.ok(rejected);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error rejecting proposal: " + ex.getMessage()));
        }
    }

    /**
     * SCREEN 2 Approver Action: SEND BACK / REQUEST CHANGES
     */
    @PostMapping("/proposals/{id}/request-changes")
    public ResponseEntity<?> requestChanges(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        try {
            String user = body != null ? body.get("user") : null;
            String comments = body != null ? body.get("comments") : null;
            PurchaseProposal result = purchaseService.requestChanges(id, user, comments);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error requesting changes: " + ex.getMessage()));
        }
    }

    /**
     * Get all generated PO records.
     */
    @GetMapping("/orders")
    public ResponseEntity<List<PurchaseOrder>> getAllOrders() {
        return ResponseEntity.ok(purchaseService.getAllPurchaseOrders());
    }

    /**
     * Get PO by ID or PO Number.
     */
    @GetMapping("/orders/{idOrNumber}")
    public ResponseEntity<?> getOrderByNumber(@PathVariable String idOrNumber) {
        return purchaseService.getPurchaseOrder(idOrNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Cancel PO and release balance.
     */
    @PostMapping("/orders/{idOrNumber}/cancel")
    public ResponseEntity<?> cancelOrder(
            @PathVariable String idOrNumber,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String user = body != null ? body.get("user") : "Purchase Officer";
            String reason = body != null ? body.get("reason") : "Cancelled by user";
            PurchaseOrder cancelled = purchaseService.cancelPurchaseOrder(idOrNumber, user, reason);
            return ResponseEntity.ok(cancelled);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (com.silvermuller.seals.common.exception.ConflictException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error cancelling order: " + ex.getMessage()));
        }
    }

    /**
     * Create PO amendment/revision.
     */
    @PostMapping("/orders/{poNumber}/amend")
    public ResponseEntity<?> amendOrder(
            @PathVariable String poNumber,
            @RequestBody Map<String, Object> body) {
        try {
            String user = body.get("user") != null ? body.get("user").toString() : "Authorized User";
            String reason = body.get("reason") != null ? body.get("reason").toString() : "Order revised";
            @SuppressWarnings("unchecked")
            Map<String, Object> changes = (Map<String, Object>) body.get("changes");
            Map<String, Object> res = purchaseService.createPoAmendment(poNumber, user, reason, changes);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (com.silvermuller.seals.common.exception.ConflictException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error amending order: " + ex.getMessage()));
        }
    }

    /**
     * Extend a PO's validity date. Records old date, new date, user, timestamp and reason in the validity history.
     */
    @PostMapping("/orders/{poNumber}/validity/extend")
    public ResponseEntity<?> extendValidity(
            @PathVariable String poNumber,
            @RequestBody Map<String, String> body) {
        try {
            PurchaseOrder po = purchaseService.extendPoValidity(
                    poNumber,
                    body.get("newValidityDate"),
                    body.get("reason"),
                    body.get("user"));
            return ResponseEntity.ok(po);
        } catch (PurchaseProcessingService.NotAuthorizedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error extending PO validity: " + ex.getMessage()));
        }
    }

    /**
     * PO validity audit history (old date, new date, user, timestamp, reason), newest first.
     */
    @GetMapping("/orders/{poNumber}/validity-history")
    public ResponseEntity<?> getValidityHistory(@PathVariable String poNumber) {
        return ResponseEntity.ok(purchaseService.getPoValidityHistory(poNumber));
    }

    /**
     * Get revision history for a PO.
     */
    @GetMapping("/orders/{poNumber}/revisions")
    public ResponseEntity<?> getRevisions(@PathVariable String poNumber) {
        return ResponseEntity.ok(purchaseService.getPoRevisions(poNumber));
    }

    /**
     * Get Delivery Schedule Lines for a Planned PO
     */
    @GetMapping("/orders/{poNumber}/schedules")
    public ResponseEntity<?> getDeliverySchedules(@PathVariable String poNumber) {
        return ResponseEntity.ok(purchaseService.getDeliverySchedules(poNumber));
    }

    /**
     * Save Delivery Schedule Lines for a Planned PO
     */
    @PostMapping("/orders/{poNumber}/schedules")
    public ResponseEntity<?> saveDeliverySchedules(
            @PathVariable String poNumber,
            @RequestBody List<PurchaseOrderDeliverySchedule> schedules) {
        purchaseService.saveDeliverySchedules(poNumber, schedules);
        return ResponseEntity.ok(Map.of("success", true, "poNumber", poNumber, "count", schedules.size()));
    }

    /**
     * Get Payment Milestones for a Planned PO
     */
    @GetMapping("/orders/{poNumber}/milestones")
    public ResponseEntity<?> getPaymentMilestones(@PathVariable String poNumber) {
        return ResponseEntity.ok(purchaseService.getPaymentMilestones(poNumber));
    }

    /**
     * Save Payment Milestones for a Planned PO
     */
    @PostMapping("/orders/{poNumber}/milestones")
    public ResponseEntity<?> savePaymentMilestones(
            @PathVariable String poNumber,
            @RequestBody List<PurchaseOrderPaymentMilestone> milestones) {
        purchaseService.savePaymentMilestones(poNumber, milestones);
        return ResponseEntity.ok(Map.of("success", true, "poNumber", poNumber, "count", milestones.size()));
    }

    /**
     * Record receipt against a specific scheduled delivery lot (used by GRN)
     */
    @PostMapping("/orders/{poNumber}/receipt")
    public ResponseEntity<?> recordScheduleReceipt(
            @PathVariable String poNumber,
            @RequestBody Map<String, Object> body) {
        String itemCode = (String) body.get("itemCode");
        Integer lotNumber = body.get("lotNumber") != null ? Integer.parseInt(body.get("lotNumber").toString()) : 1;
        BigDecimal qty = body.get("receivedQty") != null ? new BigDecimal(body.get("receivedQty").toString()) : BigDecimal.ZERO;
        try {
            purchaseService.recordScheduleReceipt(poNumber, itemCode, lotNumber, qty);
        } catch (IllegalArgumentException ex) {
            // e.g. PO validity expired: quantities are not updated
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
        return ResponseEntity.ok(Map.of("success", true, "poNumber", poNumber, "lotNumber", lotNumber, "receivedQty", qty));
    }
}
