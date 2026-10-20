# Purchase module: audit results, rules in force, and decisions still needed

This file records what was verified in the code and database, the rules now in force, and the business
questions that block further work. Companion to `docs/po-by-pr-integration.md`.

## 1. Rejected goods (implemented)

Fields tracked per GRN line: `received_qty` (physical), `accepted_qty`, `rejected_qty`, `pending_inspection_qty`.
Invariant enforced at posting: received = accepted + rejected + pending.

| Quantity | Counts toward PO fulfilment? | Where it appears |
|---|---|---|
| Accepted | Yes. Fulfils the PO, moves PO status, is attributed to PR allocations | `grn_item_allocations.accepted_qty`, PO receipt position |
| Rejected | No. Does not close or advance the PO. Not attributed to any PR line | GRN line, PO receipt position (`rejectedDisposition: RETAINED_NOT_RETURNED`), PO vs PR vs GRN report |
| Pending inspection | No (not decided yet) | GRN line, PO receipt position |
| Physical received | Not fulfilment | PO receipt position; blocks PO cancellation |

- Over-acceptance is refused: accepted quantity may not exceed the PO quantity minus prior accepted quantity.
  Tolerance is 0%; no configurable tolerance exists and none was introduced.
- A posted GRN is never edited or deleted. A rejected quantity is not returned by the system; the report says it
  is retained and not returned.
- No replacement order is created automatically. A replacement is received as a further GRN against the same
  PO only while accepted quantity remains open.

## 2. Approval (audited, not changed)

- PO by PR and Direct PO orders are created with status `APPROVED` and `approved_by` set to the acting user.
- The PR must be in `Approved` status before PO by PR can order its lines (this is the PR approval step).
- The existing proposal-approval step (`PENDING_PO_APPROVAL` -> `APPROVED`, `approveProposal`) applies only to
  proposal-generated POs. PO by PR and Direct PO **bypass** that step.
- The codebase does not define a PO approval policy (who approves, limits, or thresholds). `service-po.approval-limit`
  exists only for Service POs.
- **Decision needed:** whether PO by PR and Direct PO need an approval step before they are issued.

## 3. Amendment rules (current)

- Standard PO amendment (`POST /api/purchase/orders/{po}/amend`): refused (409) for POs with PO-by-PR allocations.
- Quantity or rate changes that would overwrite posted receipt history are never allowed.
- No safe amendment exists yet for allocated POs. Supporting one needs a rule for reducing a PO below its received
  accepted quantity, which the request asked to forbid; amendment therefore stays blocked.

## 4. Cancellation rules (current, all PO types)

- Refused (409) if the PO is already cancelled (a retry releases nothing).
- Refused (409) if any POSTED GRN line exists for the PO, accepted or rejected. Receipt reversal is not supported.
- PO by PR cancellation releases each allocation's net quantity to its PR line in one transaction.

## 5. Stock and inventory (audit; decision needed)

- The GRN module does **not** write to inventory tables. It has no reference to `inventory_transaction` or any
  stock balance. Receipts therefore do not change stock.
- The inventory module (`InventoryTransactionService`, `inventory_transaction`) and job work do post stock movements.
- No purchase-receipt stock rule (which store, which movement type, at accepted or received quantity, and how
  rejected goods are handled) is defined in the code or the existing documentation.
- **Decision needed** before any GRN-to-inventory posting: which quantity posts to stock (accepted only, as the
  rule above suggests), which store and movement type, and whether it happens at GRN posting or at a separate
  store-acceptance step. No stock movement has been added.

## 6. In-memory and browser state audit

- Server, in-memory: `PurchaseProcessingService` keeps `purchaseOrdersMap` (PO cache loaded from `purchase_orders`
  at startup) and `proposalsMap`. The existing PO and proposal screens read the cache. After a PO-by-PR or Direct PO
  commit, and after GRN posting and cancellation, the cache is refreshed or updated after commit. Failed transactions
  do not update it. New screens (PO register, reports, PO by PR lines) read PostgreSQL directly.
  Remaining risk: the existing proposal and PO screens still depend on the cache for lists, and a legacy status change
  made directly in the database is not seen until restart.
- Sequence counter: the in-memory `poCounter` is no longer used for numbering (`po_number_seq`).
- Browser storage: `localStorage` holds only the acting user's name and role (`SMS_CURRENT_USER`) as a UI preference
  for the `X-User-Name` header. No business record is stored in the browser.

## 7. Reconciliation (report, read-only)

`GET /api/new-po/reports/legacy-reconciliation` lists: POs without allocations (with or without a PR number on the PO),
posted receipts not attributed to any PR line, and PR quantities ordered without an explaining allocation. It creates
no links. Verified by test that the report does not change allocation rows.

## 8. Direct PO (implemented; UI not built)

- Origin marker `purchase_orders.po_origin = 'DIRECT'` (PO by PR writes `PO_BY_PR`; older rows are classified by
  their allocation records).
- Endpoints: `POST /api/new-po/direct/preview`, `POST /api/new-po/direct/purchase-orders`,
  `GET /api/new-po/direct/purchase-orders`, `POST /api/new-po/direct/purchase-orders/{po}/cancel`.
- Vendor must be active; each item must exist in Item Master; a vendor rate must be effective on the PO date;
  HSN must exist with an active GST rate; duplicate item lines are merged; quantities must be > 0 with at most 2 decimals.
- No PR line is read or changed. No allocation is written.
- Numbering from `po_number_seq`; status `APPROVED` (see section 2).
- Receipts use the same GRN rules as other POs. Receipts are not attributed to PR lines.

## 9. Concurrency paths covered

Every quantity write goes through a locked check: PO by PR create, proposal approval reservations, clubbing
reservations, manual ordered-quantity changes, PO cancellation releases, and the legacy helper for positive changes.
Tests cover a new order racing a legacy quantity change for the last units (exactly one succeeds).

## 10. Open items (not done)

1. PO approval policy (section 2).
2. GRN-to-inventory posting rules (section 5).
3. Receipt reversal workflow (required before cancellation after receipt can be allowed).
4. Return and replacement workflow for rejected goods (section 1 keeps them as retained, not returned).
5. Direct PO screen in the browser (API and tests exist).
6. Proposal approval and PR clubbing combined end-to-end test (not written in this round).
7. Existing screens still read the in-memory PO cache for lists (section 6).
8. Stored PR closure (PR lifecycle is derived only).
