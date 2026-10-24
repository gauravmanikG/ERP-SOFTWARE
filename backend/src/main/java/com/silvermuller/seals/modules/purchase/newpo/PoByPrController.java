package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatePoRequest;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.CreatedPo;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.EligiblePrLine;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedPo;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** HTTP layer for PO by PR. All rules and quantity checks live in {@link PoByPrService}. */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/new-po/pr")
public class PoByPrController {

    private final PoByPrService service;

    public PoByPrController(PoByPrService service) {
        this.service = service;
    }

    /** PR-first selection: approved or partially ordered PRs with outstanding quantity. */
    @GetMapping("/eligible-prs")
    public List<Map<String, Object>> eligiblePrs(@RequestParam(required = false) String q) {
        return service.eligiblePrs(q);
    }

    /** Outstanding lines of one PR, priced for the vendor on the PO date. */
    @GetMapping("/prs/{prNumber}/outstanding-lines")
    public List<EligiblePrLine> outstandingLines(@PathVariable String prNumber,
                                                 @RequestParam(required = false) String vendorCode,
                                                 @RequestParam(required = false) LocalDate poDate) {
        return service.eligibleLinesForPr(prNumber, vendorCode, poDate);
    }

    @GetMapping("/next-po-number")
    public Map<String, Object> nextPoNumber() {
        return service.nextPoNumber();
    }

    @GetMapping("/eligible-items")
    public List<Map<String, Object>> eligibleItems(@RequestParam(required = false) String q,
                                                   @RequestParam(required = false) String exclude) {
        return service.eligibleItems(q, exclude);
    }

    @GetMapping("/eligible-lines")
    public List<EligiblePrLine> eligibleLines(@RequestParam String itemCode,
                                              @RequestParam(required = false) String vendorCode,
                                              @RequestParam(required = false) LocalDate poDate) {
        return service.eligibleLines(itemCode, vendorCode, poDate);
    }

    /** POs raised through PO by PR, read from the database on every call. Other POs are legacy (see the detail). */
    @GetMapping("/purchase-orders")
    public List<Map<String, Object>> poByPrOrders() {
        return service.poByPrOrders();
    }

    /** One PO read from the database: current status, origin (PO_BY_PR or LEGACY), allocations and receipts. */
    @GetMapping("/purchase-orders/{poNumber}")
    public Map<String, Object> poDetail(@PathVariable String poNumber) {
        return service.poDetail(poNumber);
    }

    /** Cancels a PO-by-PR order and releases only what its allocations reserved. 409 if already cancelled or received. */
    @PostMapping("/purchase-orders/{poNumber}/cancel")
    public Map<String, Object> cancelPo(@PathVariable String poNumber,
                                        @RequestBody(required = false) Map<String, String> body,
                                        @RequestHeader(value = "X-User-Name", required = false) String user) {
        return service.cancel(poNumber, user, body == null ? null : body.get("reason"));
    }

    @GetMapping("/prs/{prNumber}/lines")
    public List<PoByPrDtos.PrLineStatus> prLines(@PathVariable String prNumber) {
        return service.prLineStatuses(prNumber);
    }

    /** Prices and taxes the order exactly as create would, without saving anything. */
    @PostMapping("/preview")
    public PlannedPo preview(@RequestBody CreatePoRequest body) {
        return service.preview(body);
    }

    @PostMapping("/purchase-orders")
    public ResponseEntity<CreatedPo> create(@RequestBody CreatePoRequest body,
                                            @RequestHeader(value = "X-User-Name", required = false) String user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(body, user));
    }
}
