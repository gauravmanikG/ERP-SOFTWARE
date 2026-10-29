package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.service.GoodsReceiptNoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase/grn")
public class GoodsReceiptNoteController {

    private final GoodsReceiptNoteService grnService;

    public GoodsReceiptNoteController(GoodsReceiptNoteService grnService) {
        this.grnService = grnService;
    }

    /**
     * Get list of all GRNs.
     */
    @GetMapping
    public ResponseEntity<List<GoodsReceiptNote>> getAllGrns() {
        return ResponseEntity.ok(grnService.getAllGoodsReceiptNotes());
    }

    /**
     * Get single GRN by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getGrnById(@PathVariable Long id) {
        return grnService.getGoodsReceiptNoteById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all GRNs against a specific PO number.
     */
    @GetMapping("/by-po/{poNumber}")
    public ResponseEntity<List<GoodsReceiptNote>> getGrnsByPoNumber(@PathVariable String poNumber) {
        return ResponseEntity.ok(grnService.getGoodsReceiptNotesByPoNumber(poNumber));
    }

    /**
     * Get list of Approved/Issued POs that have pending unreceived balance quantity.
     */
    @GetMapping("/pending-pos")
    public ResponseEntity<List<Map<String, Object>>> getPendingPos() {
        return ResponseEntity.ok(grnService.getPendingPurchaseOrdersForReceipt());
    }

    /**
     * Get next suggested GRN number.
     */
    @GetMapping("/next-number")
    public ResponseEntity<Map<String, String>> getNextGrnNumber() {
        return ResponseEntity.ok(Map.of("grnNumber", grnService.peekGrnNumber()));
    }

    /**
     * Save Draft GRN or Post Official GRN.
     */
    @PostMapping
    public ResponseEntity<?> saveOrPostGrn(
            @RequestBody GoodsReceiptNote grn,
            @RequestParam(defaultValue = "true") boolean post) {
        try {
            GoodsReceiptNote saved = grnService.saveOrPostGoodsReceiptNote(grn, post);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (com.silvermuller.seals.common.exception.InvalidTransactionException ex) {
            // e.g. Service PO numbers are refused by the GRN workflow
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (com.silvermuller.seals.common.exception.ConflictException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error saving GRN: " + ex.getMessage()));
        }
    }

    /**
     * Post an existing Draft GRN.
     */
    @PostMapping("/{id}/post")
    public ResponseEntity<?> postDraftGrn(@PathVariable Long id) {
        try {
            GoodsReceiptNote grn = grnService.getGoodsReceiptNoteById(id)
                    .orElseThrow(() -> new IllegalArgumentException("GRN not found: " + id));
            GoodsReceiptNote posted = grnService.saveOrPostGoodsReceiptNote(grn, true);
            return ResponseEntity.ok(posted);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (com.silvermuller.seals.common.exception.ConflictException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error posting GRN: " + ex.getMessage()));
        }
    }
}
