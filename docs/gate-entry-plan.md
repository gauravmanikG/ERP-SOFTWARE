# Gate Entry module — implementation plan and status

Status (2026-11-17): **backend stages 1–4 built and tested** (package `modules/gate`, 14 integration tests in
`GateEntryIntegrationTest`, full suite 200/200). The gate is **switched off** (`gate.config.required = false`) until
the gate screens (stage 5) are built, so the GRN screen keeps working as before. The 1 % over-delivery tolerance is
live for every GRN.

Decisions taken (user, 2026-11-17): data in PO/GRN/PR is dummy; over-delivery tolerance **1 % per item**; everything
else as recommended: hard switch to the gate flow once the screens exist (setting, no data migration), store verifies,
quality releases holds, rejected quantity stays on the gate entry, Purchase Inward only, a security "No" needs remarks,
multi-vendor is one global setting (off), one seeded gate `MAIN` (Main Gate), no stock posting yet.
Built from the ideas list: tolerance (A), hold release (C), printable gate pass without QR (E), duplicate invoice check
(F), dwell-time alerts (G), vendor delivery quality report (H, without on-time %). Not built: blind count (B),
weighbridge (D), return-to-vendor document (I), photos/driver ID (J), on-time-in-full %.

## 1. What exists today (read from the code)

| Area | Where | What it does now |
|---|---|---|
| PO header | `purchase_orders` (`po_number` unique, `vendor_code`, `status`, `expected_delivery`, `validity_date`, `po_origin`) | Statuses in use: `APPROVED`, `PARTIALLY RECEIVED`, `COMPLETED`, `CANCELLED`. |
| PO line | `purchase_order_items` (unique `po_number + item_code`) | One row per item per PO. Every GRN line, PR allocation and delivery lot points to it by foreign key. |
| Expected delivery schedule | `purchase_order_delivery_schedules` ("delivery lots") | **Already built.** One PO line can have several lots (date + qty). Saved by Direct PO and PO by PR on create, edited on PO Register (`POST /api/purchase/orders/{po}/schedules`). Rules (`DeliveryLots.validate`): date ≥ PO date, qty > 0, whole units for PCS/NOS, lots of an item ≤ its PO qty. Editing lots never changes the PO qty. `received_qty` is recalculated from posted GRNs (`syncScheduleReceipts`). |
| GRN | `goods_receipt_notes`, `goods_receipt_note_items`, `GoodsReceiptNoteService` | One GRN = one PO. Lines per PO item (one line per item per GRN). Posting locks the PO row, takes PO qty from the server, refuses accepted qty above PO outstanding (tolerance 0 %), refuses a second posted GRN with the same PO + vendor challan, writes PR attribution (`grn_item_allocations`), updates PO status and delivery lots, writes `procurement_audit_log`. Posted GRNs cannot be edited. |
| Pending GRN | `GET /api/purchase/grn/pending-pos` | **Derived, not stored**: every non-cancelled, non-completed PO with balance. Today any approved PO appears here immediately. |
| Stock | — | **There is no inventory/stock engine.** Posting a GRN does not post stock anywhere. "Preserve stock posting" therefore means: nothing to preserve today; a future stock engine should post from the GRN, not from the gate. |
| Numbers | `DocumentNumbers` (`PREFIX-YEAR-NNNNN`, atomic counters) | Reused for gate entry numbers. |
| Audit | `procurement_audit_log` (append-only, DB clock) | Reused for GRN-side events. |
| Access | `PermissionCatalog`, `ActionRules`, `ApiAccessInterceptor`, `RequestActor`; frontend `auth/access.js` | Reused: new `gate.*` entities. |
| Attachments | `job_work_attachments` pattern (bytea, size, type) | Same pattern for gate documents. |
| Settings | `app_setting` (key → JSONB) | Holds gate configuration (default gate, multi-vendor, tolerance, mandatory flag). |

Live data on 2026-11-17: 22 `APPROVED` + 5 `PARTIALLY RECEIVED` open POs, 0 draft GRNs, 11 posted GRNs,
28 delivery lots on 12 POs, 0 capital PO receipts.

### Conflicts found between the spec and current code
1. GRN screen: picking a delivery lot limits the accepted qty to that lot's balance (frontend only). The spec says
   planned lots must never restrict actual receipts. → Removed when the GRN starts from a gate entry.
2. Duplicate check "one posted GRN per PO + vendor challan" would block a second **partial** GRN from the same gate
   entry (same challan). → For gate-linked GRNs, duplicate protection moves to the gate-entry line (locked row + DB
   check that posted ≤ accepted) and an idempotency key.
3. Delivery lots stop counting at their scheduled qty (`received_qty ≤ scheduled_qty`). An excess delivery is
   real but invisible in lots. → Expected Arrivals shows "received beyond schedule" separately; lots unchanged.

## 2. Target flow

```
PO (optional lots) → Expected Arrivals → Gate Entry (draft → submitted = vehicle in)
   → Unloading (unloaded qty per line) → Quantity Verification (accepted / rejected / hold)
   → Pending GRN (accepted − already GRN'd) → GRN (partial allowed) → Vehicle Exit (any time after verification,
     or turned back at gate)
```

Vehicle stage (action-based; no free stage edit):

| Stage | Reached by action | Allowed next actions |
|---|---|---|
| `DRAFT` | Save as Draft | edit, Submit, Delete draft |
| `GATE_IN` | Submit Gate Entry (server stamps entry time) | Start Unloading, Turn Back, Cancel (reason) |
| `UNLOADING` | Start Unloading | Record Unloaded Qty |
| `UNLOADED` | Record Unloaded Qty | Verify Quantities |
| `VERIFIED` | Verify (accepted + rejected + hold = unloaded) | Gate Out, Release Hold, GRN |
| `TURNED_BACK` | Turn Back (reason) — nothing unloaded | Gate Out |
| `EXITED` | Gate Out (server stamps exit time) | Release Hold, GRN (paperwork continues after the truck leaves) |
| `CANCELLED` | Cancel (only before unloading, reason) | — |

GRN progress is tracked separately from the vehicle stage: `NOT_STARTED / PARTIAL / COMPLETE` per gate entry.

## 3. Quantities (per gate-entry line = one PO line on one gate entry)

| Quantity | Source |
|---|---|
| PO ordered | `purchase_order_items.quantity` (snapshot on the line for the report, never edited) |
| Previously posted GRN | posted GRN accepted for that PO line **at submit time** (snapshot) |
| Remaining at entry | ordered − previously posted − accepted on other open gate entries not yet GRN'd |
| Declared | typed from the vendor's invoice/challan (may exceed remaining → warning, not a block) |
| Unloaded | counted by store |
| Accepted / Rejected / Hold | verification; **DB check: unloaded = accepted + rejected + hold** |
| GRN posted (this entry) | maintained in the same transaction as each GRN post; **DB check: grn_posted ≤ accepted** |
| Pending GRN | accepted − grn_posted |

## 4. Database changes (all additive, in `schema.sql`; nothing existing is altered or deleted)

New tables:
- `gate_master` — gate code, name, active.
- `gate_entries` — header: number `GE-YYYY-NNNNN`, entry type, gate, stage, vehicle no (stored normalised:
  upper-case, no spaces/dashes), vehicle type, driver name/mobile, transporter, vendor, multi-vendor flag,
  invoice no/date, challan no/date, e-way bill, LR no, security checks (one column each + remarks),
  `entry_at`, `exit_at`, `turned_back_reason`, `cancel_reason`, `client_request_id` (unique, retry-safe),
  `version` (optimistic edit lock), created/submitted/modified by + time.
- `gate_entry_lines` — gate entry, `po_number + item_code` (FK to `purchase_order_items`), vendor, UOM,
  snapshots (ordered, previously posted, remaining at entry), declared, unloaded, accepted, rejected, hold,
  grn_posted, reject/hold reason. CHECKs: all ≥ 0; verified ⇒ unloaded = accepted + rejected + hold;
  grn_posted ≤ accepted; unique (gate entry, PO line).
- `gate_entry_events` — append-only activity history: action, from stage, to stage, actor, server time, remarks.
- `gate_entry_attachments` — invoice/challan/e-way bill/LR/photo files (same rules as job work attachments).
- Partial unique index: one **active** entry per vehicle (`stage IN (GATE_IN … VERIFIED)`), so two people cannot
  bring the same truck in twice even at the same moment.

Columns added to existing tables (nullable, so every existing row stays valid):
- `goods_receipt_notes.gate_entry_id` → `gate_entries(id)`
- `goods_receipt_note_items.gate_entry_line_id` → `gate_entry_lines(id)`
- Existing posted GRNs keep NULL and are labelled "before gate entry" in reports.

Document type `GE` added to `DocumentNumbers`. Gate entry permissions added to `PermissionCatalog`.

## 5. APIs

New (`/api/gate`):
- `GET /dashboard` — vehicles inside by stage, today's in/out, average turnaround, overdue arrivals, pending GRN.
- `GET /expected-arrivals?from&to&vendor&po` — date-wise lots + lines with only a PO/line date + lines with no date
  ("unscheduled"), with scheduled total vs ordered, received, and already at the gate.
- `GET /pos/receivable?vendor` and `GET /pos/{po}/lines` — what can be added with **Add PO** (remaining shown).
- `POST /entries` (draft), `PUT /entries/{id}` (draft edit, version-checked),
  `POST /entries/{id}/submit`, `/start-unloading`, `/unloading`, `/verify`, `/turn-back`, `/cancel` (drafts too —
  nothing is deleted), `/exit`, `POST /lines/{lineId}/release-hold`.
- `GET /entries` (register: filters, paging), `GET /entries/{id}` (detail + events + GRNs),
  `GET /entries/{id}/gate-pass` (printable HTML), `GET /inside` (vehicles inside + current stage + time inside),
  `GET /exits` (exit register), `GET /reports/{name}` (gate entry report, turnaround, vendor on-time).
- `POST/GET /attachments`, `GET/POST /gates` (gate master), `GET/PUT /settings`.

Changed (behind the setting `gate.required`, so it can be switched back without a code change):
- `GET /api/purchase/grn/pending-pos` → rows come from verified gate-entry lines with pending GRN qty
  (gate entry no, vehicle, vendor, PO, item, accepted, already GRN'd, pending).
- `POST /api/purchase/grn`, `POST /api/purchase/grn/{id}/post` → each line must name its gate-entry line; GRN qty
  ≤ that line's pending qty; the gate line is locked in the same transaction; existing numbering, PO status,
  delivery-lot sync, PR attribution and audit stay exactly as they are.

## 6. Locking and safety
- Lock order for every receipt path: PO row → gate-entry lines (by id) → GRN. Same first lock as today's GRN, so a
  GRN, a verification and a PO cancellation of the same PO can never interleave.
- Server stamps entry/exit/verification times; nothing time-related is taken from the browser.
- Every write checks the acting user from the session; permission keys `gate.entry:create/submit/...`.
- Retry-safe: `client_request_id` on create, version on edit, DB CHECKs as the last line of defence.

## 7. Existing screens affected
- GRN screen: pending list switches to gate-entry lines; lot selector no longer limits quantities.
- PO creation (Direct PO, PO by PR): **no change needed** — expected date and lots are already optional.
- PO Register: unchanged (still edits lots).
- New: the nine gate screens (frontend stage, after the backend).

## 8. Migration
- No stored data has to change: pending GRN is computed, not stored, and there are 0 draft GRNs.
- Existing posted GRNs are untouched; they keep `gate_entry_id = NULL`.
- The 27 open POs: after the switch, their remaining qty can only be received through a gate entry (see §10 Q1).

## 9. Stages (each one released and checked before the next)
1. Schema, gate master, settings, numbers, permissions, gate entry draft/submit/cancel, vehicle rules, events,
   attachments, gate pass. **No GRN change.** Integration tests.
2. Unloading, verification, turn back, exit, hold release; inside / exit register / dashboard / report APIs.
3. Expected Arrivals API.
4. GRN integration behind `gate.required`; concurrency tests (two GRNs at once, GRN vs cancel); full `test-db.ps1`.
5. Frontend screens, Documentation module (guide, flowcharts, backend highlights), release.

## 10. Decisions

Answered — see the status at the top. Rules added beyond the original spec: invoice or challan number required at
Submit; e-way bill must be 12 digits when given; a submitted entry cannot be edited (cancel or turn back instead);
drafts are cancelled, never deleted; the tolerance also applies to GRN posting and PR attribution (the excess within
tolerance is received but attributed to no PR line).

## 11. Critical test cases
- Draft never appears in Pending GRN; submitted-but-unverified never appears either.
- Unloaded ≠ accepted + rejected + hold → refused.
- Two gate entries on the same PO line cannot together accept more than the PO remaining (+ tolerance).
- Two GRN posts on the same gate line at the same time → one succeeds, the other is refused; total ≤ accepted.
- Same vehicle cannot be submitted twice while inside; can come back after exit.
- Multi-vendor POs refused unless enabled.
- Cancelled / expired / service PO cannot be added.
- PO cancellation refused while a gate entry for it is open.
- Existing PO-by-PR GRN tests, delivery-lot tests and PR attribution tests still pass unchanged.
