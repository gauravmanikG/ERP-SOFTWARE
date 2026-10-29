package com.silvermuller.seals.modules.purchase.newpo;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Read-only purchase reports. See ProcurementReportService for the definitions behind every column. */
@RestController
@RequestMapping("/api/new-po/reports")
public class ProcurementReportController {

    private final ProcurementReportService reports;

    public ProcurementReportController(ProcurementReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/po-vs-pr")
    public List<Map<String, Object>> poVsPr(@RequestParam(required = false) String prNumber,
                                            @RequestParam(required = false) String poNumber,
                                            @RequestParam(required = false) String vendorCode) {
        return reports.poVsPr(blankToNull(prNumber), blankToNull(poNumber), blankToNull(vendorCode));
    }

    @GetMapping("/po-vs-pr-vs-grn")
    public List<Map<String, Object>> poVsPrVsGrn(@RequestParam(required = false) String poNumber,
                                                 @RequestParam(required = false) String prNumber,
                                                 @RequestParam(required = false) String vendorCode) {
        return reports.poVsPrVsGrn(blankToNull(poNumber), blankToNull(prNumber), blankToNull(vendorCode));
    }

    @GetMapping("/pr-vs-po")
    public List<Map<String, Object>> prVsPo(@RequestParam(required = false) java.time.LocalDate from,
                                            @RequestParam(required = false) java.time.LocalDate to) {
        return reports.prVsPo(from, to);
    }

    @GetMapping("/pr-vs-po/item-summary")
    public List<Map<String, Object>> prVsPoItemSummary(@RequestParam(required = false) java.time.LocalDate from,
                                                       @RequestParam(required = false) java.time.LocalDate to) {
        return reports.prVsPoItemSummary(from, to);
    }

    /** PR -> draft -> PO -> GRN, one row per PR line with drafts, POs and GRNs nested. flat=true gives export rows. */
    @GetMapping("/traceability")
    public List<Map<String, Object>> traceability(@RequestParam(required = false) String department,
                                                  @RequestParam(required = false) String vendorCode,
                                                  @RequestParam(required = false) String item,
                                                  @RequestParam(required = false) String docNumber,
                                                  @RequestParam(required = false) String status,
                                                  @RequestParam(defaultValue = "false") boolean flat) {
        return flat
                ? reports.traceabilityFlat(blankToNull(department), blankToNull(vendorCode), blankToNull(item), blankToNull(docNumber), blankToNull(status))
                : reports.traceability(blankToNull(department), blankToNull(vendorCode), blankToNull(item), blankToNull(docNumber), blankToNull(status));
    }

    /** The PO register: every standard purchase order, with its origin and the PRs it came from. */
    @GetMapping("/all-purchase-orders")
    public List<Map<String, Object>> allPurchaseOrders() {
        return reports.allPurchaseOrders();
    }

    @GetMapping("/pr-status/{prNumber}")
    public Map<String, Object> prStatus(@PathVariable String prNumber) {
        return reports.prStatus(prNumber.trim());
    }

    @GetMapping("/legacy-reconciliation")
    public Map<String, Object> legacyReconciliation() {
        return reports.legacyReconciliation();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
