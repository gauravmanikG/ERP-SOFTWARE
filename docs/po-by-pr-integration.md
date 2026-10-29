# Purchase quantity rules, state transitions and integration status

Scope: PR, PO-by-PR, legacy proposal approval, PR clubbing, manual ordered-quantity changes, PO cancellation,
PO amendment, GRN posting, and the PR delete/edit guards.

## 1. Quantity formulas (the single definition used by every path)

For one PR line (`purchase_requisition_items`):

| Quantity | Definition | Where it is stored |
|---|---|---|
| Requested | `req_qty` | `purchase_requisition_items.req_qty` |
| Ordered (reserved) | `ordered_qty` = all quantity reserved on the line, from every workflow (PO-by-PR, proposal approval, clubbing, manual change). Released quantity is subtracted. | `purchase_requisition_items.ordered_qty` |
| Remaining to order | `req_qty - ordered_qty` (never below 0). Includes quantity still in vendor drafts. | `remaining_qty` (kept in step on every write) |
| In draft | Quantity reserved in open vendor drafts (sourcing) | `purchase_requisition_items.drafted_qty`, detail in `po_draft_allocations` |
| Ready for sourcing / available to order | `req_qty - ordered_qty - drafted_qty`. Every reservation (PO by PR, proposal approval, clubbing, manual change, draft) is checked against this under the PR line lock. | derived |
| Allocated (PO-by-PR) | `SUM(allocated_qty - released_qty)` over `po_pr_allocations` for the line | derived |
| Ordered outside PO-by-PR | `ordered_qty - allocated` (legacy reservations; cannot be received against a PR line) | derived |
| Received | `SUM(received_qty)` of POSTED GRN lines attributed to the line's allocations through `grn_item_allocations` | derived |
| Pending receipt | `allocated - received` | derived |

For one PO allocation (`po_pr_allocations`):

- `net = allocated_qty - released_qty`. Cancelling a PO sets `released_qty = allocated_qty`. Rows are never deleted.

For one PO line item, the PO quantity is the sum of its line quantities in `purchase_orders.details_json`.

## 2. Reservation and release rules

Every write to `ordered_qty` goes through one of three methods in `PurchaseRequisitionService`:

- `reserveOrdered(prItemId, qty)`: locks the line (`FOR UPDATE`), refuses with **409** if `qty > remaining`.
- `releaseOrdered(prItemId, qty)`: locks the line, refuses with **409** if `qty > ordered`.
- `updateItemOrderedQty(pr, item, delta)` (legacy helper): for a positive delta, locks the matching lines and
  refuses with **409** if any would exceed its remaining quantity.

Lock order is always: PO row (if any) → allocations of that PO (by PR line) → PR lines (by id). Receipts lock the
PO row first, so a receipt and a cancellation of the same PO cannot interleave.

## 3. Workflow rules

| Workflow | Quantity behaviour now |
|---|---|
| PO by PR create (`POST /api/new-po/pr/purchase-orders`) | Locks PR lines, validates status (Approved / Partially Ordered only), creates PO, allocations and reservations in one transaction. Duplicate PO numbers are impossible (DB unique key). |
| Proposal approval (`approveProposal`) | Now transactional. Each reservation goes through the checked helper, so an over-order rolls back the whole approval (409). |
| PR clubbing (`recordPurchaseAllocations`) | Clubbing's own allocation remaining is still tracked in `pr_clubbing_allocations`. The PR line reservation is checked (`reserveOrdered`) and a shortfall rolls back the approval. |
| Manual ordered-qty endpoint | Refused (409) for lines with PO-by-PR allocations. Other lines are checked on increase. |
| PO cancellation, PO-by-PR (`POST /api/new-po/pr/purchase-orders/{po}/cancel`) | Locks PO, releases each allocation's net quantity, marks `released_qty`, sets PO `CANCELLED`, writes `po_revisions`. 409 if already cancelled (retry releases nothing) or if any receipt is posted. |
| PO cancellation, legacy (`POST /api/purchase/orders/{po}/cancel`) | Refused (409) for POs with allocations, pointing to the PO-by-PR endpoint. Legacy POs unchanged. |
| PO amendment, legacy (`POST /api/purchase/orders/{po}/amend`) | Refused (409) for POs with allocations. Nothing is changed. |
| GRN posting | Posted GRN cannot be changed or posted again (409). A second posted GRN with the same PO and vendor challan is refused (409). PO quantity comes from the PO, not the client. Over-receipt is refused. For PO-by-PR POs, receipts are attributed to allocations in the same transaction and stored in `grn_item_allocations`. |
| PR delete | 409 if any line has PO-by-PR allocations. Nothing is deleted or cascaded. |
| PR item edit | 409 if any line has PO-by-PR allocations. |

## 4. PO and PR status rules

PO status values in use: `APPROVED` (created by PO by PR and proposal approval), `PARTIALLY RECEIVED`,
`COMPLETED` (set by GRN posting when every line is fully received), `CANCELLED`.

PR ordering status (`purchase_requisitions.status`), recalculated after every reservation or release:

- `Approved`: nothing ordered.
- `Partially Ordered`: some ordered, not all.
- `Fully Ordered`: total ordered >= total requested.

PR receipt status is derived per line (not stored): `NOT_RECEIVED`, `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`.
A PR is never closed by a PO closing. There is no stored "Closed" status yet (see section 7).

## 5. Legacy data

- POs and GRNs created before `po_pr_allocations` existed have no allocation rows. They are reported as
  `origin: LEGACY` by `GET /api/new-po/pr/purchase-orders/{po}`, and their receipts are never attributed to PR lines.
- Quantity ordered on a PR line outside PO-by-PR is shown as `orderedOutsidePoByPrQty`.
- No historical allocation or attribution was created. Ambiguous legacy relationships are not reconstructed.

## 6. Schema changes (all additive and idempotent; applied by `schema.sql` at startup)

- `po_pr_allocations.released_qty NUMERIC(15,2) NOT NULL DEFAULT 0` (added with `ADD COLUMN IF NOT EXISTS`).
  Limitation: the `released_qty <= allocated_qty` check exists only where the table is created fresh; the
  service enforces it under lock for existing databases (`schema.sql` cannot hold a `DO` block safely).
- `grn_item_allocations` (new): `grn_item_id`, `allocation_id`, `received_qty > 0`, unique (grn_item, allocation).

## 6a. Sourcing: clubbed demand, vendor drafts, draft to PO (`/api/new-po/sourcing`)

- Clubbed demand groups ready-for-sourcing PR lines by item code + unit for display only; PR lines are never merged.
- Vendor suggestions: active vendors linked to the item in the Supplier Master (`supplier_item`), priced from the
  Vendor Rate Master rate effective today; cheapest first. Suggestions create nothing.
- Assigning an item to a vendor reserves PR quantity (`drafted_qty`) in that vendor's single OPEN draft
  (`DRAFT-YYYY-NNN`). The vendor must be linked to the item and have a rate effective today.
- Release sends open draft quantity back to sourcing. Convert moves the chosen quantities out of the draft and creates
  the PO through PO by PR in the same transaction (same pricing, GST, freight, terms, schedules, numbering);
  `po_pr_allocations.draft_allocation_id` records the draft line. Lines left at zero stay in the draft.
- Lock order: vendor advisory lock (assign) -> draft row -> draft lines -> PR lines by id.
- Audit: PR status decisions and draft actions are written to `procurement_audit_log`.
- Report: `GET /api/new-po/reports/traceability` (nested, or `flat=true` for export) and `/pr-status/{pr}`.
  Lines ordered through older flows without allocations are reported as `ORDERED_UNTRACKED`, never as completed.

## 6b. Document numbers

PR, PO, GRN and draft numbers are `PREFIX-YEAR-NNNNN` (`DRAFT-YEAR-NNN`) and restart at 1 every calendar year. They come
from `document_number_counters` (one row per document type and year, incremented atomically) and always stay above the
highest number of that year already stored (`DocumentNumbers`). The server always assigns the number of a new document;
a number shown on the form beforehand (`next-number` endpoints) is a preview and is not reserved. The older
`po_number_seq` is no longer used.

Purchase UoM: a PR line takes the item's purchase UoM from the Item Master (`purchased_uom`, else `uom`); the UoM
chosen on the form is used only when the item has none. Counted units must be whole numbers (`QuantityRules`).

## 7. Still open (explicit decisions or deferred work)

1. **Receipt reversal** is not supported by the existing GRN module. A PO with any receipt cannot be cancelled.
2. **PO-by-PR amendment** is refused. Supporting it needs a rule for changing quantities, rates and tax on
   allocated lines after receipts exist.
3. **Approval workflow:** PO-by-PR POs are created `APPROVED`, as before. Whether they need a separate
   approval step is a business decision.
4. **Over-receipt tolerance:** none. Receipts above the PO quantity are refused. A tolerance % would need a
   configured rule.
5. **Rejected goods:** a GRN line's `received_qty` (including rejected quantity) is what counts toward the PO,
   as in the existing module. Rejected goods do not reduce the PO receipt.
6. **Stored PR closure:** PR status does not become "Closed" on receipt. Needs a business decision.
7. **Legacy reconciliation:** legacy POs and GRNs are identified, not reconciled. No report lists them yet.
8. **Remaining legacy writers:** the legacy approval/clubbing paths now respect remaining quantity, but their
   own allocation tables (`pr_clubbing_allocations`) still track a separate remaining amount.
9. **Reports and Direct PO** were not part of this change.
