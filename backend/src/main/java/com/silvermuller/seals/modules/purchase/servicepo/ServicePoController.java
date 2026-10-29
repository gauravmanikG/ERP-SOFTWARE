package com.silvermuller.seals.modules.purchase.servicepo;

import com.silvermuller.seals.modules.purchase.servicepo.ServicePoDtos.*;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService.Actor;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService.ServicePoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/service-pos")
public class ServicePoController {

    private final ServicePoService service;

    public ServicePoController(ServicePoService service) {
        this.service = service;
    }

    // ------------------------------------------------------------------ meta

    @GetMapping("/categories")
    public List<String> categories(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return service.categories(activeOnly);
    }

    @PostMapping("/categories")
    public ResponseEntity<?> addCategory(@RequestBody CategoryRequest req,
                                         @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.createCategory(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/sac-codes")
    public List<Map<String, Object>> sacCodes() {
        return service.sacCodes();
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        return Map.of(
                "pricingMethods", List.of("FIXED_PRICE", "HOURLY", "DAILY", "PER_VISIT", "QUANTITY_RATE", "MILESTONE", "TIME_AND_MATERIAL"),
                "serviceFrequencies", List.of("ONE_TIME", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"),
                "scheduleTypes", List.of("ONE_TIME", "RECURRING", "MILESTONE"),
                "recurrenceFrequencies", List.of("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"),
                "gstTaxability", List.of("TAXABLE", "EXEMPT", "NIL_RATED", "NON_GST"),
                "acceptanceResults", List.of("ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED"),
                "roles", List.of("CREATOR", "APPROVER", "ACCEPTOR", "FINANCE", "ADMIN"));
    }

    // ------------------------------------------------------------------ CRUD

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ServicePoRequest req,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.create(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable long id, @RequestBody ServicePoRequest req,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.update(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String q,
                                  @RequestParam(required = false) String vendorCode,
                                  @RequestParam(required = false) String department,
                                  @RequestParam(required = false) String category,
                                  @RequestParam(required = false) String status,
                                  @RequestParam(required = false) String invoiceStatus,
                                  @RequestParam(required = false) LocalDate fromDate,
                                  @RequestParam(required = false) LocalDate toDate,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  @RequestParam(defaultValue = "poDate") String sort,
                                  @RequestParam(defaultValue = "desc") String dir,
                                  @RequestHeader(value = "X-User-Name", required = false) String user,
                                  @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.list(new ServicePoService.ListFilter(q, vendorCode, department, category, status,
                invoiceStatus, fromDate, toDate), page, size, sort, dir, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/preview")
    public ResponseEntity<?> preview(@RequestBody ServicePoRequest req,
                                     @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.preview(req, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> details(@PathVariable long id,
                                     @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.details(id, service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ workflow

    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submit(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.submit(i, b, a));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.approve(i, b, a));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.reject(i, b, a));
    }

    @PostMapping("/{id}/issue")
    public ResponseEntity<?> issue(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.issue(i, b, a));
    }

    @PostMapping("/{id}/hold")
    public ResponseEntity<?> hold(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.hold(i, b, a));
    }

    @PostMapping("/{id}/release")
    public ResponseEntity<?> release(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.release(i, b, a));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<?> close(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.close(i, b, a));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.cancel(i, b, a));
    }

    @PostMapping("/{id}/validity/extend")
    public ResponseEntity<?> extendValidity(@PathVariable long id, @RequestBody(required = false) ActionRequest body, @RequestHeader(value = "X-User-Name", required = false) String user, @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.extendValidity(i, b, a));
    }

    @PostMapping("/{id}/amend")
    public ResponseEntity<?> amend(@PathVariable long id, @RequestBody ServicePoRequest req,
                                   @RequestHeader(value = "X-User-Name", required = false) String user,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.amend(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ schedule, acceptance, invoice

    @PutMapping("/{id}/schedule")
    public ResponseEntity<?> saveSchedule(@PathVariable long id, @RequestBody ScheduleRequest req,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.saveSchedule(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/{id}/acceptances")
    public ResponseEntity<?> recordAcceptance(@PathVariable long id, @RequestBody AcceptanceRequest req,
                                              @RequestHeader(value = "X-User-Name", required = false) String user,
                                              @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.recordAcceptance(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @PostMapping("/{id}/invoices")
    public ResponseEntity<?> recordInvoice(@PathVariable long id, @RequestBody InvoiceRequest req,
                                           @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.recordInvoice(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    // ------------------------------------------------------------------ attachments & print

    @PostMapping("/{id}/attachments")
    public ResponseEntity<?> addAttachment(@PathVariable long id, @RequestBody AttachmentRequest req,
                                           @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.addAttachment(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<?> downloadAttachment(@PathVariable long id, @PathVariable long attachmentId,
                                                @RequestHeader(value = "X-User-Name", required = false) String user,
                                                @RequestHeader(value = "X-User-Role", required = false) String role) {
        try {
            service.actor(user, role);
            Map<String, Object> a = service.attachment(id, attachmentId);
            String name = String.valueOf(a.get("file_name"));
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"" + name + "\"")
                    .contentType(MediaType.parseMediaType(String.valueOf(a.get("content_type"))))
                    .body((byte[]) a.get("content"));
        } catch (ServicePoException ex) {
            return error(ex);
        }
    }

    @GetMapping(value = "/{id}/print", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<?> print(@PathVariable long id,
                                   @RequestHeader(value = "X-User-Name", required = false) String user,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        try {
            service.actor(user, role);
            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(service.printHtml(id));
        } catch (ServicePoException ex) {
            return error(ex);
        }
    }

    // ------------------------------------------------------------------ helpers

    @FunctionalInterface
    private interface Call<T> {
        T run() throws ServicePoException;
    }

    @FunctionalInterface
    private interface ActionCall {
        Map<String, Object> apply(long id, ActionRequest body, Actor actor);
    }

    private ResponseEntity<?> action(long id, ActionRequest body, String user, String role, ActionCall call) {
        ActionRequest safe = body == null ? new ActionRequest(null, null) : body;
        return run(() -> call.apply(id, safe, service.actor(user, role)), HttpStatus.OK);
    }

    private <T> ResponseEntity<?> run(Call<T> call, HttpStatus okStatus) {
        try {
            T result = call.run();
            return ResponseEntity.status(okStatus).body(result);
        } catch (ServicePoException ex) {
            return error(ex);
        }
    }

    private ResponseEntity<Map<String, Object>> error(ServicePoException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of(
                "status", ex.getStatus().value(),
                "error", ex.getStatus().getReasonPhrase(),
                "message", ex.getMessage() == null ? "Request failed" : ex.getMessage()));
    }

    @ExceptionHandler(ServicePoException.class)
    public ResponseEntity<Map<String, Object>> handle(ServicePoException ex) {
        return error(ex);
    }
}
