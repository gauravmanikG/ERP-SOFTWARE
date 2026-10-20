package com.silvermuller.seals.modules.purchase.newpo;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Read-only purchase reports. See ProcurementReportService for the definitions behind every column. */
@RestController
@CrossOrigin(origins = "*")
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

    @GetMapping("/legacy-reconciliation")
    public Map<String, Object> legacyReconciliation() {
        return reports.legacyReconciliation();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
