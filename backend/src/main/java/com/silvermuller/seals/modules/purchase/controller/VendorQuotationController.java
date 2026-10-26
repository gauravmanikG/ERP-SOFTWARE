package com.silvermuller.seals.modules.purchase.controller;

import com.silvermuller.seals.modules.purchase.dto.*;
import com.silvermuller.seals.modules.purchase.model.VendorQuotation;
import com.silvermuller.seals.modules.purchase.model.VendorQuotationComment;
import com.silvermuller.seals.modules.purchase.service.VendorQuotationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase/quotations")
public class VendorQuotationController {

    private final VendorQuotationService quotationService;

    public VendorQuotationController(VendorQuotationService quotationService) {
        this.quotationService = quotationService;
    }

    /**
     * Summary cards for main dashboard:
     * Total quotations, Awaiting review, Approved, Expiring soon, Active vendors, Recently received.
     */
    @GetMapping("/summary")
    public ResponseEntity<QuotationSummaryDto> getSummary() {
        return ResponseEntity.ok(quotationService.getSummary());
    }

    /**
     * All Quotations with search, filtering, and amount range.
     */
    @GetMapping
    public ResponseEntity<List<VendorQuotation>> getAllQuotations(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String vendorCode,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount) {

        List<VendorQuotation> list = quotationService.findAll(
                search, vendorCode, itemCode, status, startDate, endDate, minAmount, maxAmount);
        return ResponseEntity.ok(list);
    }

    /**
     * Get single quotation with line items, history, comments.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getQuotationById(@PathVariable Long id) {
        return quotationService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Save new quotation (as Draft or Submitted for Review).
     */
    @PostMapping
    public ResponseEntity<?> createQuotation(
            @RequestBody VendorQuotation quotation,
            @RequestParam(defaultValue = "false") boolean submit) {
        try {
            quotation.setId(null);
            VendorQuotation saved = quotationService.saveOrUpdate(quotation, submit);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create quotation: " + ex.getMessage()));
        }
    }

    /**
     * Update existing quotation.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateQuotation(
            @PathVariable Long id,
            @RequestBody VendorQuotation quotation,
            @RequestParam(defaultValue = "false") boolean submit) {
        try {
            quotation.setId(id);
            VendorQuotation updated = quotationService.saveOrUpdate(quotation, submit);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update quotation: " + ex.getMessage()));
        }
    }

    /**
     * Update quotation review/approval status:
     * Draft -> Submitted for Review -> Under Evaluation -> Selected for Purchase / Rejected / Expired.
     */
    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            if (status == null || status.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Status field is required."));
            }
            String justification = body.get("justification");
            String evaluationNotes = body.get("evaluationNotes");
            String user = body.getOrDefault("user", "Authorized Reviewer");

            VendorQuotation updated = quotationService.updateStatus(id, status, justification, evaluationNotes, user);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update quotation status: " + ex.getMessage()));
        }
    }

    /**
     * Create a new revision of a quotation.
     */
    @PostMapping("/{id}/revisions")
    public ResponseEntity<?> createRevision(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String user = (body != null) ? body.getOrDefault("user", "Purchase Officer") : "Purchase Officer";
            VendorQuotation revision = quotationService.createRevision(id, user);
            return ResponseEntity.status(HttpStatus.CREATED).body(revision);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create quotation revision: " + ex.getMessage()));
        }
    }

    /**
     * Add internal comment / note.
     */
    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String comment = body.get("comment");
            String author = body.getOrDefault("author", "Team Member");
            VendorQuotationComment created = quotationService.addComment(id, author, comment);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to add comment: " + ex.getMessage()));
        }
    }

    /**
     * Delete quotation (allowed only for Drafts or Rejected).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteQuotation(@PathVariable Long id) {
        try {
            quotationService.deleteQuotation(id);
            return ResponseEntity.ok(Map.of("message", "Quotation deleted successfully."));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete quotation: " + ex.getMessage()));
        }
    }

    /**
     * Item Rate Comparison tab:
     * Select item code, required quantity, comparison date.
     */
    @GetMapping("/comparison")
    public ResponseEntity<List<RateComparisonDto>> getRateComparison(
            @RequestParam String itemCode,
            @RequestParam(required = false, defaultValue = "100") BigDecimal quantity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate comparisonDate) {

        List<RateComparisonDto> comparison = quotationService.getRateComparison(itemCode, quantity, comparisonDate);
        return ResponseEntity.ok(comparison);
    }

    /**
     * Vendor Price History tab:
     * Item code and optional vendor code with price trend over time.
     */
    @GetMapping("/price-history")
    public ResponseEntity<List<PriceHistoryDto>> getPriceHistory(
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String vendorCode) {

        List<PriceHistoryDto> history = quotationService.getPriceHistory(itemCode, vendorCode);
        return ResponseEntity.ok(history);
    }

    /**
     * Vendor-Wise Analysis tab:
     * Overall quotation performance, win rate, response and delivery terms.
     */
    @GetMapping("/vendor-analysis")
    public ResponseEntity<List<VendorAnalysisDto>> getVendorAnalysis() {
        return ResponseEntity.ok(quotationService.getVendorAnalysis());
    }

    /**
     * Search items catalog from item_master for quotation line item picker.
     */
    @GetMapping("/items-catalog")
    public ResponseEntity<List<Map<String, Object>>> getItemsCatalog(
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(quotationService.searchItemsCatalog(query));
    }

    /**
     * Synchronize dummy demo quotation dates with CURRENT_DATE so expiry countdowns
     * (e.g. 7 days left -> 6 days left tomorrow) are demonstrated realistically.
     */
    @PostMapping("/sync-dates")
    public ResponseEntity<Map<String, Object>> syncDemoDates() {
        quotationService.syncDemoDatesWithCurrentDate();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Demo quotation dates synchronized relative to today's date."
        ));
    }
}
