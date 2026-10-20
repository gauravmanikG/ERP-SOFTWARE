package com.silvermuller.seals.modules.purchase.capitalpo;

import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoDtos.*;
import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoService.Actor;
import com.silvermuller.seals.modules.purchase.capitalpo.CapitalPoService.CapitalPoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/capital-pos")
public class CapitalPoController {

    private final CapitalPoService service;

    public CapitalPoController(CapitalPoService service) {
        this.service = service;
    }

    // ------------------------------------------------------------------ meta

    @GetMapping("/categories")
    public List<Map<String, Object>> categories(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return service.categories(activeOnly);
    }

    @PostMapping("/categories")
    public ResponseEntity<?> addCategory(@RequestBody CategoryRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                         @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.addCategory(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/hsn-goods")
    public List<Map<String, Object>> hsnGoods() {
        return service.hsnCodes("GOODS");
    }

    @GetMapping("/sac-codes")
    public List<Map<String, Object>> sacCodes() {
        return service.hsnCodes("SERVICE");
    }

    @PostMapping("/preview")
    public ResponseEntity<?> preview(@RequestBody PoRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.preview(req, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping("/eligible-prs")
    public List<Map<String, Object>> eligiblePrs() {
        return service.eligiblePrs();
    }

    @GetMapping("/policy")
    public Map<String, Object> policy() {
        return service.policy();
    }

    // ------------------------------------------------------------------ CRUD

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PoRequest req, @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.create(req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable long id, @RequestBody PoRequest req,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.update(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String poNumber,
                                  @RequestParam(required = false) String vendor,
                                  @RequestParam(required = false) String assetCategory,
                                  @RequestParam(required = false) String department,
                                  @RequestParam(required = false) String plant,
                                  @RequestParam(required = false) LocalDate poFrom,
                                  @RequestParam(required = false) LocalDate poTo,
                                  @RequestParam(required = false) LocalDate deliveryFrom,
                                  @RequestParam(required = false) LocalDate deliveryTo,
                                  @RequestParam(required = false) String status,
                                  @RequestParam(required = false) String receiptStatus,
                                  @RequestParam(required = false) String installationStatus,
                                  @RequestParam(required = false) String commissioningStatus,
                                  @RequestParam(required = false) String registrationStatus,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  @RequestParam(defaultValue = "poDate") String sort,
                                  @RequestParam(defaultValue = "desc") String dir,
                                  @RequestHeader(value = "X-User-Name", required = false) String user,
                                  @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.list(new CapitalPoService.ListFilter(poNumber, vendor, assetCategory, department, plant,
                poFrom, poTo, deliveryFrom, deliveryTo, status, receiptStatus, installationStatus, commissioningStatus,
                registrationStatus), page, size, sort, dir, service.actor(user, role)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> details(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.details(id, service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ approval workflow

    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submit(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.submit(i, b, a));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                     @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.approve(i, b, a));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.reject(i, b, a));
    }

    @PostMapping("/{id}/issue")
    public ResponseEntity<?> issue(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                   @RequestHeader(value = "X-User-Name", required = false) String user,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.issue(i, b, a));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                    @RequestHeader(value = "X-User-Name", required = false) String user,
                                    @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.cancel(i, b, a));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<?> close(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                   @RequestHeader(value = "X-User-Name", required = false) String user,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.close(i, b, a));
    }

    @PostMapping("/{id}/validity/extend")
    public ResponseEntity<?> extendValidity(@PathVariable long id, @RequestBody(required = false) ActionRequest body,
                                            @RequestHeader(value = "X-User-Name", required = false) String user,
                                            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return action(id, body, user, role, (i, b, a) -> service.extendValidity(i, b, a));
    }

    // ------------------------------------------------------------------ amendments

    @PostMapping("/{id}/amendments")
    public ResponseEntity<?> proposeAmendment(@PathVariable long id, @RequestBody PoRequest req,
                                              @RequestHeader(value = "X-User-Name", required = false) String user,
                                              @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.proposeAmendment(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @PostMapping("/{id}/amendments/{amendmentId}/decision")
    public ResponseEntity<?> decideAmendment(@PathVariable long id, @PathVariable long amendmentId, @RequestBody AmendmentDecision body,
                                             @RequestHeader(value = "X-User-Name", required = false) String user,
                                             @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.decideAmendment(id, new AmendmentDecision(amendmentId, body.approve(), body.comments()),
                service.actor(user, role)), HttpStatus.OK);
    }

    // ------------------------------------------------------------------ schedule, receipts, installation, assets

    @PutMapping("/{id}/schedule")
    public ResponseEntity<?> saveSchedule(@PathVariable long id, @RequestBody ScheduleRequest req,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.saveSchedule(id, req, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/{id}/receipts")
    public ResponseEntity<?> recordReceipt(@PathVariable long id, @RequestBody ReceiptRequest req,
                                           @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.recordReceipt(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}/receipts/{receiptId}/inspection")
    public ResponseEntity<?> inspect(@PathVariable long id, @PathVariable long receiptId, @RequestBody InspectionRequest req,
                                     @RequestHeader(value = "X-User-Name", required = false) String user,
                                     @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.inspectReceipt(id, receiptId, req, service.actor(user, role)), HttpStatus.OK);
    }

    @PutMapping("/{id}/lines/{lineNo}/installation")
    public ResponseEntity<?> installation(@PathVariable long id, @PathVariable int lineNo, @RequestBody LineEventRequest req,
                                          @RequestHeader(value = "X-User-Name", required = false) String user,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.lineEvent(id, lineNo, "INSTALLATION", req, service.actor(user, role)), HttpStatus.OK);
    }

    @PutMapping("/{id}/lines/{lineNo}/commissioning")
    public ResponseEntity<?> commissioning(@PathVariable long id, @PathVariable int lineNo, @RequestBody LineEventRequest req,
                                           @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.lineEvent(id, lineNo, "COMMISSIONING", req, service.actor(user, role)), HttpStatus.OK);
    }

    @PostMapping("/{id}/assets/register")
    public ResponseEntity<?> registerAssets(@PathVariable long id, @RequestBody RegisterRequest req,
                                            @RequestHeader(value = "X-User-Name", required = false) String user,
                                            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.registerAssets(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    // ------------------------------------------------------------------ attachments & print

    @PostMapping("/{id}/attachments")
    public ResponseEntity<?> addAttachment(@PathVariable long id, @RequestBody AttachmentRequest req,
                                           @RequestHeader(value = "X-User-Name", required = false) String user,
                                           @RequestHeader(value = "X-User-Role", required = false) String role) {
        return run(() -> service.addAttachment(id, req, service.actor(user, role)), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<?> download(@PathVariable long id, @PathVariable long attachmentId,
                                      @RequestHeader(value = "X-User-Name", required = false) String user,
                                      @RequestHeader(value = "X-User-Role", required = false) String role) {
        try {
            service.actor(user, role);
            Map<String, Object> a = service.attachment(id, attachmentId);
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"" + a.get("file_name") + "\"")
                    .contentType(MediaType.parseMediaType(String.valueOf(a.get("content_type"))))
                    .body((byte[]) a.get("content"));
        } catch (CapitalPoException ex) {
            return error(ex);
        }
    }

    @GetMapping(value = "/{id}/print", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<?> print(@PathVariable long id, @RequestHeader(value = "X-User-Name", required = false) String user,
                                   @RequestHeader(value = "X-User-Role", required = false) String role) {
        try {
            service.actor(user, role);
            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(service.printHtml(id));
        } catch (CapitalPoException ex) {
            return error(ex);
        }
    }

    // ------------------------------------------------------------------ helpers

    @FunctionalInterface
    private interface Call<T> {
        T run();
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
            return ResponseEntity.status(okStatus).body(call.run());
        } catch (CapitalPoException ex) {
            return error(ex);
        }
    }

    private ResponseEntity<Map<String, Object>> error(CapitalPoException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of(
                "status", ex.getStatus().value(),
                "error", ex.getStatus().getReasonPhrase(),
                "message", ex.getMessage() == null ? "Request failed" : ex.getMessage()));
    }

    @ExceptionHandler(CapitalPoException.class)
    public ResponseEntity<Map<String, Object>> handle(CapitalPoException ex) {
        return error(ex);
    }
}
