package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedPo;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.AssignRequest;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ConvertRequest;
import com.silvermuller.seals.modules.purchase.newpo.SourcingDtos.ReleaseRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** HTTP layer for sourcing (clubbed demand, vendor suggestions, vendor drafts, draft to PO). Rules live in SourcingService. */
@RestController
@RequestMapping("/api/new-po/sourcing")
public class SourcingController {

    private final SourcingService service;

    public SourcingController(SourcingService service) {
        this.service = service;
    }

    @GetMapping("/demand")
    public List<Map<String, Object>> demand(@RequestParam(required = false) String q,
                                            @RequestParam(required = false) String department) {
        return service.clubbedDemand(q, department);
    }

    @GetMapping("/demand/vendors")
    public Map<String, Object> vendors(@RequestParam String itemCode, @RequestParam(required = false) String uom) {
        return service.vendorSuggestions(itemCode, uom);
    }

    @PostMapping("/drafts/assign")
    public Map<String, Object> assign(@RequestBody AssignRequest body,
                                      @RequestHeader(value = "X-User-Name", required = false) String user) {
        return service.assign(body, user);
    }

    /** Several items into vendor drafts at once; all succeed or none does. */
    @PostMapping("/drafts/assign-batch")
    public List<Map<String, Object>> assignBatch(@RequestBody List<AssignRequest> body,
                                                 @RequestHeader(value = "X-User-Name", required = false) String user) {
        return service.assignBatch(body, user);
    }

    @GetMapping("/drafts")
    public List<Map<String, Object>> drafts(@RequestParam(required = false) String status,
                                            @RequestParam(required = false) String vendorCode,
                                            @RequestParam(required = false) String q) {
        return service.listDrafts(status, vendorCode, q);
    }

    @GetMapping("/drafts/{draftNumber}")
    public Map<String, Object> draft(@PathVariable String draftNumber) {
        return service.draftDetail(draftNumber);
    }

    @PostMapping("/drafts/{draftNumber}/release")
    public Map<String, Object> release(@PathVariable String draftNumber,
                                       @RequestBody(required = false) ReleaseRequest body,
                                       @RequestHeader(value = "X-User-Name", required = false) String user) {
        return service.release(draftNumber, body, user);
    }

    @GetMapping("/drafts/{draftNumber}/conversion-lines")
    public Map<String, Object> conversionLines(@PathVariable String draftNumber,
                                               @RequestParam(required = false) LocalDate poDate) {
        return service.conversionLines(draftNumber, poDate);
    }

    @PostMapping("/drafts/{draftNumber}/preview")
    public PlannedPo preview(@PathVariable String draftNumber, @RequestBody ConvertRequest body) {
        return service.preview(draftNumber, body);
    }

    @PostMapping("/drafts/{draftNumber}/convert")
    public ResponseEntity<Map<String, Object>> convert(@PathVariable String draftNumber, @RequestBody ConvertRequest body,
                                                       @RequestHeader(value = "X-User-Name", required = false) String user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.convert(draftNumber, body, user));
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit(@RequestParam(required = false) String ref) {
        return service.audit(ref);
    }
}
