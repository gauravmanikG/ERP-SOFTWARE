package com.silvermuller.seals.modules.gate;

import com.silvermuller.seals.modules.admin.security.CurrentUser;
import com.silvermuller.seals.modules.admin.security.RequestActor;
import com.silvermuller.seals.modules.gate.GateDtos.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Gate API (/api/gate). Writes need the gate permissions in ActionRules (checked before this controller runs); reads
 * need a signed-in session. Who acted is always the session user, never a value sent by the browser.
 */
@RestController
@RequestMapping("/api/gate")
public class GateController {

    private final GateEntryService entries;
    private final GateQueryService queries;
    private final GateSettings settings;

    public GateController(GateEntryService entries, GateQueryService queries, GateSettings settings) {
        this.entries = entries;
        this.queries = queries;
        this.settings = settings;
    }

    private static String actor() {
        return RequestActor.current().map(CurrentUser::name).filter(n -> !n.isBlank())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required."));
    }

    // ------------------------------------------------------------------ screens: dashboard, arrivals, registers

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return queries.dashboard();
    }

    @GetMapping("/expected-arrivals")
    public Map<String, Object> expectedArrivals(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                @RequestParam(required = false) String vendor,
                                                @RequestParam(required = false) String po,
                                                @RequestParam(required = false) Boolean includeUnscheduled,
                                                @RequestParam(required = false) Boolean includeReceived) {
        return queries.expectedArrivals(from, to, vendor, po, includeUnscheduled, includeReceived);
    }

    @GetMapping("/entries")
    public Map<String, Object> register(@RequestParam(required = false) String q, @RequestParam(required = false) String stage,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                        @RequestParam(required = false) String vendor, @RequestParam(required = false) String po,
                                        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return queries.register(q, stage, from, to, vendor, po, page, size);
    }

    @GetMapping("/entries/{id}")
    public Map<String, Object> entry(@PathVariable long id) {
        return queries.detail(id);
    }

    @GetMapping("/inside")
    public List<Map<String, Object>> inside() {
        return queries.inside();
    }

    @GetMapping("/exits")
    public Map<String, Object> exits(@RequestParam(required = false) String q,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                     @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return queries.exits(q, from, to, page, size);
    }

    @GetMapping("/pos/receivable")
    public List<Map<String, Object>> receivablePos(@RequestParam(required = false) String vendor, @RequestParam(required = false) String q) {
        return queries.receivablePos(vendor, q);
    }

    @GetMapping("/pos/{poNumber}/lines")
    public List<Map<String, Object>> poLines(@PathVariable String poNumber) {
        return queries.poLines(poNumber);
    }

    @GetMapping("/reports/gate-entries")
    public List<Map<String, Object>> entryReport(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                 @RequestParam(required = false) String vendor, @RequestParam(required = false) String stage) {
        return queries.entryReport(from, to, vendor, stage);
    }

    @GetMapping("/reports/vendor-performance")
    public List<Map<String, Object>> vendorPerformance(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return queries.vendorPerformance(from, to);
    }

    @GetMapping(value = "/entries/{id}/gate-pass", produces = MediaType.TEXT_HTML_VALUE)
    public String gatePass(@PathVariable long id) {
        return queries.gatePass(id);
    }

    // ------------------------------------------------------------------ gate entry actions

    @PostMapping("/entries")
    public ResponseEntity<Map<String, Object>> create(@RequestBody EntryRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(entries.create(body, actor()));
    }

    @PutMapping("/entries/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody EntryRequest body) {
        return entries.update(id, body, actor());
    }

    @PostMapping("/entries/{id}/submit")
    public Map<String, Object> submit(@PathVariable long id) {
        return entries.submit(id, actor());
    }

    @PostMapping("/entries/{id}/start-unloading")
    public Map<String, Object> startUnloading(@PathVariable long id) {
        return entries.startUnloading(id, actor());
    }

    @PostMapping("/entries/{id}/unloading")
    public Map<String, Object> recordUnloading(@PathVariable long id, @RequestBody UnloadRequest body) {
        return entries.recordUnloading(id, body, actor());
    }

    @PostMapping("/entries/{id}/verify")
    public Map<String, Object> verify(@PathVariable long id, @RequestBody VerifyRequest body) {
        return entries.verify(id, body, actor());
    }

    @PostMapping("/lines/{id}/release-hold")
    public Map<String, Object> releaseHold(@PathVariable long id, @RequestBody ReleaseHoldRequest body) {
        return entries.releaseHold(id, body, actor());
    }

    @PostMapping("/entries/{id}/turn-back")
    public Map<String, Object> turnBack(@PathVariable long id, @RequestBody ReasonRequest body) {
        return entries.turnBack(id, body, actor());
    }

    @PostMapping("/entries/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable long id, @RequestBody ReasonRequest body) {
        return entries.cancel(id, body, actor());
    }

    @PostMapping("/entries/{id}/exit")
    public Map<String, Object> exit(@PathVariable long id, @RequestBody(required = false) ReasonRequest body) {
        return entries.exit(id, body, actor());
    }

    // ------------------------------------------------------------------ attachments

    @PostMapping("/attachments")
    public ResponseEntity<Map<String, Object>> addAttachment(@RequestBody AttachmentRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(entries.addAttachment(body, actor()));
    }

    @GetMapping("/attachments/{id}")
    public ResponseEntity<byte[]> attachment(@PathVariable long id) {
        Map<String, Object> a = entries.attachment(id);
        String name = String.valueOf(a.get("file_name")).replace("\"", "");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"")
                .contentType(MediaType.parseMediaType(String.valueOf(a.get("content_type"))))
                .body((byte[]) a.get("content"));
    }

    // ------------------------------------------------------------------ gates and settings

    @GetMapping("/gates")
    public List<Map<String, Object>> gates() {
        return queries.gates();
    }

    @PostMapping("/gates")
    public ResponseEntity<Map<String, Object>> createGate(@RequestBody GateRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(entries.createGate(body));
    }

    @PutMapping("/gates/{id}")
    public Map<String, Object> updateGate(@PathVariable long id, @RequestBody GateRequest body) {
        return entries.updateGate(id, body);
    }

    @GetMapping("/settings")
    public Map<String, Object> settings() {
        return settings.get().toMap();
    }

    @PutMapping("/settings")
    public Map<String, Object> saveSettings(@RequestBody Map<String, Object> body) {
        return settings.save(body).toMap();
    }
}
