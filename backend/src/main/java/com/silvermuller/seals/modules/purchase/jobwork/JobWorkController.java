package com.silvermuller.seals.modules.purchase.jobwork;

import com.silvermuller.seals.modules.purchase.jobwork.JobWorkDtos.*;
import com.silvermuller.seals.modules.purchase.jobwork.JobWorkService.Actor;
import com.silvermuller.seals.modules.purchase.jobwork.JobWorkService.JobWorkException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/job-work")
public class JobWorkController {

    private final JobWorkService service;
    private final JobWorkReconciliationService reconciliation;
    private final JobWorkReportService reports;

    public JobWorkController(JobWorkService service, JobWorkReconciliationService reconciliation, JobWorkReportService reports) {
        this.service = service;
        this.reconciliation = reconciliation;
        this.reports = reports;
    }

    // ------------------------------------------------------------------ reference data

    @GetMapping("/operations")
    public List<Map<String, Object>> operations() { return service.operations(); }

    @GetMapping("/locations")
    public List<Map<String, Object>> locations() { return service.locations(); }

    @GetMapping("/categories")
    public List<Map<String, Object>> categories() { return service.categories(); }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestHeader(value = "X-User-Name", required = false) String user,
                                       @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.dashboard(); }, HttpStatus.OK);
    }

    // ------------------------------------------------------------------ job workers

    @GetMapping("/vendor-candidates")
    public ResponseEntity<?> vendorCandidates(@RequestHeader(value = "X-User-Name", required = false) String user,
                                              @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.vendorCandidates(); }, HttpStatus.OK);
    }

    @GetMapping("/workers")
    public ResponseEntity<?> listWorkers(@RequestParam(required = false) String q, @RequestParam(required = false) String status,
                                         @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.listWorkers(q, status, page, size); }, HttpStatus.OK);
    }

    @PostMapping("/workers")
    public ResponseEntity<?> createWorker(@RequestBody WorkerRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.createWorker(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/workers/{id}")
    public ResponseEntity<?> worker(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.workerDetails(id); }, HttpStatus.OK);
    }

    @PutMapping("/workers/{id}")
    public ResponseEntity<?> updateWorker(@PathVariable long id, @RequestBody WorkerRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.updateWorker(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping("/workers/{id}/balances")
    public ResponseEntity<?> workerBalances(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.workerBalances(id); }, HttpStatus.OK);
    }

    @PostMapping("/workers/{id}/rate-contracts")
    public ResponseEntity<?> addRate(@PathVariable long id, @RequestBody RateContractRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.addRateContract(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @PostMapping("/rate-contracts/{id}/revoke")
    public ResponseEntity<?> revokeRate(@PathVariable long id, @RequestBody ActionRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                        @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.revokeRateContract(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ indents

    @GetMapping("/indents")
    public ResponseEntity<?> listIndents(@RequestParam(required = false) String q, @RequestParam(required = false) String status,
                                         @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to,
                                         @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.listIndents(q, status, from, to, page, size); }, HttpStatus.OK);
    }

    @PostMapping("/indents")
    public ResponseEntity<?> createIndent(@RequestBody IndentRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.createIndent(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/indents/{id}")
    public ResponseEntity<?> indent(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.indentDetails(id, service.actor(user, role)), HttpStatus.OK);
    }

    @PutMapping("/indents/{id}")
    public ResponseEntity<?> updateIndent(@PathVariable long id, @RequestBody IndentRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.updateIndent(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/indents/{id}/submit")
    public ResponseEntity<?> submitIndent(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.submitIndent(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/indents/{id}/approve")
    public ResponseEntity<?> approveIndent(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                           @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.approveIndent(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/indents/{id}/reject")
    public ResponseEntity<?> rejectIndent(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.rejectIndent(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/indents/{id}/cancel")
    public ResponseEntity<?> cancelIndent(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.cancelIndent(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ job work orders

    @GetMapping("/orders")
    public ResponseEntity<?> listOrders(@RequestParam(required = false) String q, @RequestParam(required = false) String status,
                                        @RequestParam(required = false) Long workerId, @RequestParam(required = false) LocalDate from,
                                        @RequestParam(required = false) LocalDate to, @RequestParam(required = false) String overdue,
                                        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                                        @RequestHeader(value = "X-User-Name", required = false) String user,
                                        @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.listOrders(q, status, workerId, from, to, overdue, page, size); }, HttpStatus.OK);
    }

    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody OrderRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.createOrder(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> order(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.orderDetails(id, service.actor(user, role)), HttpStatus.OK);
    }

    @PutMapping("/orders/{id}")
    public ResponseEntity<?> updateOrder(@PathVariable long id, @RequestBody OrderRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.updateOrder(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/orders/{id}/submit")
    public ResponseEntity<?> submitOrder(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.submitOrder(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/orders/{id}/approve")
    public ResponseEntity<?> approveOrder(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.approveOrder(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/orders/{id}/reject")
    public ResponseEntity<?> rejectOrder(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.rejectOrder(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.cancelOrder(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/orders/{id}/close")
    public ResponseEntity<?> closeOrder(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                        @RequestHeader(value = "X-User-Name", required = false) String user,
                                        @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.closeOrder(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ challans

    @GetMapping("/challans")
    public ResponseEntity<?> listChallans(@RequestParam(required = false) String q, @RequestParam(required = false) String status,
                                          @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.listChallans(q, status, page, size); }, HttpStatus.OK);
    }

    @PostMapping("/challans")
    public ResponseEntity<?> createChallan(@RequestBody ChallanRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.createChallan(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/challans/{id}")
    public ResponseEntity<?> challan(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.challanDetails(id, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/challans/{id}/cancel")
    public ResponseEntity<?> cancelChallan(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                           @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.cancelChallan(id, safe(body), service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping(value = "/challans/{id}/print", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<?> printChallan(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        try {
            service.actor(user, role);
            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(service.challanPrintHtml(id));
        } catch (JobWorkException ex) {
            return error(ex);
        }
    }

    // ------------------------------------------------------------------ receipts & inspection

    @GetMapping("/receipts")
    public ResponseEntity<?> listReceipts(@RequestParam(required = false) String q, @RequestParam(required = false) String inspection,
                                          @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.listReceipts(q, inspection, page, size); }, HttpStatus.OK);
    }

    @PostMapping("/receipts")
    public ResponseEntity<?> createReceipt(@RequestBody ReceiptRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.createReceipt(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/receipts/{id}")
    public ResponseEntity<?> receipt(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.receiptDetails(id, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/receipt-lines/{id}/inspect")
    public ResponseEntity<?> inspect(@PathVariable long id, @RequestBody InspectionRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.inspectLine(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ ledger & attachments

    @GetMapping("/ledger")
    public ResponseEntity<?> ledger(@RequestParam(required = false) Long workerId, @RequestParam(required = false) Long jwoId,
                                    @RequestParam(required = false) Long masterId, @RequestParam(required = false) String q,
                                    @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return service.listLedger(workerId, jwoId, masterId, q, page, size); }, HttpStatus.OK);
    }

    @PostMapping("/attachments")
    public ResponseEntity<?> addAttachment(@RequestBody AttachmentRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.addAttachment(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/attachments/{id}")
    public ResponseEntity<?> attachment(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                        @RequestHeader(value = "X-User-Role", required = false) String role) {
        try {
            service.actor(user, role);
            Map<String, Object> a = service.attachment(id);
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"" + a.get("file_name") + "\"")
                    .contentType(MediaType.parseMediaType(String.valueOf(a.get("content_type"))))
                    .body((byte[]) a.get("content"));
        } catch (JobWorkException ex) {
            return error(ex);
        }
    }

    // ------------------------------------------------------------------ reconciliation, scrap, losses

    @GetMapping("/reconciliation/orders")
    public ResponseEntity<?> reconOrders(@RequestParam(required = false) String q, @RequestParam(required = false) String status,
                                         @RequestParam(defaultValue = "false") boolean overdue,
                                         @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return reconciliation.orders(q, status, overdue, page, size); }, HttpStatus.OK);
    }

    @GetMapping("/reconciliation/orders/{id}")
    public ResponseEntity<?> reconOrder(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                        @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> reconciliation.orderReconciliation(id, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping("/reconciliation/adjustments")
    public ResponseEntity<?> adjustments(@RequestParam(required = false) String status, @RequestParam(required = false) String type,
                                         @RequestParam(required = false) Long jwoId,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return reconciliation.adjustments(status, type, jwoId); }, HttpStatus.OK);
    }

    @PostMapping("/reconciliation/adjustments")
    public ResponseEntity<?> requestAdjustment(@RequestBody JobWorkReconciliationService.AdjustmentRequest req,
                                               @RequestHeader(value = "X-User-Name", required = false) String user,
                                               @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> reconciliation.requestAdjustment(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @PostMapping("/reconciliation/adjustments/{id}/decision")
    public ResponseEntity<?> decideAdjustment(@PathVariable long id, @RequestBody JobWorkReconciliationService.DecisionRequest req,
                                              @RequestHeader(value = "X-User-Name", required = false) String user,
                                              @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> reconciliation.decideAdjustment(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping("/reconciliation/scrap")
    public ResponseEntity<?> scrap(@RequestHeader(value = "X-User-Name", required = false) String user,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return reconciliation.scrapRegister(); }, HttpStatus.OK);
    }

    @GetMapping("/reconciliation/alerts")
    public ResponseEntity<?> alerts(@RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return reconciliation.alerts(); }, HttpStatus.OK);
    }

    @GetMapping("/reconciliation/loss-policies")
    public ResponseEntity<?> lossPolicies(@RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return reconciliation.lossPolicies(); }, HttpStatus.OK);
    }

    @PostMapping("/reconciliation/loss-policies")
    public ResponseEntity<?> saveLossPolicy(@RequestBody JobWorkReconciliationService.LossPolicyRequest req,
                                            @RequestHeader(value = "X-User-Name", required = false) String user,
                                            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> reconciliation.saveLossPolicy(req, service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ reports

    @GetMapping("/reports")
    public ResponseEntity<?> reportCatalogue(@RequestHeader(value = "X-User-Name", required = false) String user,
                                             @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> { service.actor(user, role); return reports.catalogue(); }, HttpStatus.OK);
    }

    @GetMapping("/reports/{name}")
    public ResponseEntity<?> report(@PathVariable String name, @RequestParam(required = false) LocalDate from,
                                    @RequestParam(required = false) LocalDate to, @RequestParam(required = false) Long workerId,
                                    @RequestParam(required = false) String q,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> reports.run(name, from, to, workerId, q, service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ helpers

    @FunctionalInterface
    private interface Call<T> {
        T run();
    }

    private static ActionRequest safe(ActionRequest body) {
        return body == null ? new ActionRequest(null) : body;
    }

    private <T> ResponseEntity<?> run(Call<T> call, HttpStatus okStatus) {
        try {
            return ResponseEntity.status(okStatus).body(call.run());
        } catch (JobWorkException ex) {
            return error(ex);
        }
    }

    private ResponseEntity<Map<String, Object>> error(JobWorkException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of(
                "status", ex.getStatus().value(),
                "error", ex.getStatus().getReasonPhrase(),
                "message", ex.getMessage() == null ? "Request failed" : ex.getMessage()));
    }

    @ExceptionHandler(JobWorkException.class)
    public ResponseEntity<Map<String, Object>> handle(JobWorkException ex) {
        return error(ex);
    }
}
