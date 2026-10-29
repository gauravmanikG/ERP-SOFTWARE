package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.RateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * API for the "New Purchase Order" submodule: lookups and the Vendor Rate Master. Lives beside the existing
 * purchase endpoints and does not change them. To retire this flow, delete this package and its frontend folder.
 */
@RestController
@RequestMapping("/api/new-po")
public class NewPoController {

    private final VendorRateService rates;

    public NewPoController(VendorRateService rates) {
        this.rates = rates;
    }

    @GetMapping("/lookups/vendors")
    public List<Map<String, Object>> vendors(@RequestParam(required = false) String q) {
        return rates.vendorLookup(q);
    }

    @GetMapping("/lookups/items")
    public List<Map<String, Object>> items(@RequestParam(required = false) String q) {
        return rates.itemLookup(q);
    }

    @GetMapping("/vendor-rates")
    public List<Map<String, Object>> history(@RequestParam(required = false) String supplierCode,
                                             @RequestParam(required = false) Long itemId) {
        return rates.history(supplierCode, itemId);
    }

    @GetMapping("/vendor-rates/effective")
    public Map<String, Object> effective(@RequestParam String supplierCode,
                                         @RequestParam Long itemId,
                                         @RequestParam(required = false) LocalDate on) {
        Map<String, Object> row = rates.effectiveRate(supplierCode, itemId, on);
        return row == null ? Map.of("found", false) : Map.of("found", true, "rate", row);
    }

    @PostMapping("/vendor-rates")
    public ResponseEntity<Map<String, Object>> create(@RequestBody RateBody body,
                                                      @RequestHeader(value = "X-User-Name", required = false) String user) {
        Map<String, Object> saved = rates.create(
                new RateRequest(body.supplierCode(), body.itemId(), body.offeredUnitPrice(), body.effectiveFrom()), user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** Request body for a new vendor rate. Dates arrive as ISO yyyy-MM-dd. */
    public record RateBody(String supplierCode, Long itemId, BigDecimal offeredUnitPrice, LocalDate effectiveFrom) {}
}
