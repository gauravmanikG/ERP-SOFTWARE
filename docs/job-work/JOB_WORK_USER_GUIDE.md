# Job Work Module — User Guide

This guide explains how to use the Job Work module of the Silver Muller Seals ERP, step by step, from setting up a job worker to closing an order. It describes what the screens do today. Where something is not built yet, it says so.

---

## 1. What Job Work is, in this ERP

Job work means sending your material to an outside company (a **job worker**) for processing — for example CNC machining, grinding, coating or heat treatment — and getting the processed material back.

In the ERP, the material never disappears from the books while it is outside:

```
Store  ──(Challan: dispatch)──▶  External Job Work  ──(Receipt)──▶  Quality Hold  ──(Inspection)──▶  Store / Rejection Store / Rework-Burning
                                  (with the job worker)               (waiting for QC)               (accepted / rejected / rework)
```

- **Store** is where the material normally sits (your warehouse).
- **External Job Work** is a virtual location that holds everything currently with job workers.
- **Quality Hold** holds returned material until it is inspected. Nothing from Quality Hold can be used until inspection releases it.
- **Rejection Store** holds rejected and scrap material. Scrap leaves it only through an approved disposal to **Scrap Yard** (section 6.8).
- **Rework-Burning** holds material that must be reworked and sent out again.

Every movement is recorded twice:
1. In the **inventory engine** (so Inventory balances are always correct), and
2. In the **Worker Stock Ledger** (so you always know how much material each job worker holds, per item).

---

## 2. Finding the module

1. Open the ERP and hover **Purchase** in the left sidebar.
2. Hover **Job Work**. A panel opens to the right listing every Job Work screen:

| Screen | What it is for |
|---|---|
| **Dashboard** | Overview of all job work, with clickable cards |
| **Job Workers** | Approved outside companies, their operations and rates |
| **Indents** | Requests from a department to outsource work |
| **Job Work Orders** | The agreed order with a job worker; dispatch and receipt happen from here |
| **Challans** | Register of all dispatch challans |
| **Receipts & Inspection** | Register of all returns, and the quality inspection screen |
| **Worker Stock Ledger** | Who holds what, item by item, with every movement |
| **Reconciliation & Scrap** | Order-wise reconciliation, adjustment approvals, scrap register, alerts and permissible loss (section 6.8) |
| **Compliance & Reports** | Thirteen reports with date and worker filters, exported to Excel (section 6.9) |
| Job Work Invoices | *Not built.* It needs a Finance module, which the project does not have yet |

The same screens are also available from the home page: **Purchase → Job Work → …**

The Job Work page has its own header with a button for each screen.

### Setting your name and role (important)

In the top-right of the Job Work page there are two boxes:

- **Acting as** — your name. It is recorded on every document you create or approve.
- **Role** (dropdown) — decides what you are allowed to do.

**Every action checks your role.** If a button is missing or the server refuses an action, the first thing to check is the role selected here. The default is `CREATOR`.

| Role | What it can do |
|---|---|
| **CREATOR** | Create and edit indents and draft orders; submit them for approval; cancel your own drafts |
| **APPROVER** | Onboard job workers; add and revoke rate contracts; approve or reject indents and orders; cancel approved orders; close completed orders; reverse a dispatch challan |
| **STORE** | Dispatch material (challans); record receipts from job workers |
| **QUALITY** | Inspect received material (accept / reject / rework / scrap) |
| **ADMIN** | Everything above |

> A person normally uses one role per job. You can change the role at any time; the change is saved in your browser.

---

## 3. One-time setup

Do this before anything else. It is done once per job worker and once per rate.

### 3.1 Create the job worker (APPROVER)

Go to **Job Workers → + Onboard job worker**.

1. **Vendor** — search and pick a vendor from the Vendor Master. Only active vendors that are not already job workers are listed. Name, GSTIN, PAN and address are copied from the Vendor Master, so keep the vendor master correct first.
2. **Approved operations** — tick every operation this worker is approved for (CNC, Machining, Grinding, Moulding, Coating, Heat Treatment, Finishing, Turning, Plating, Other). A rate can only be added for an approved operation, and an order can only use one.
3. **Credit days**, contact person, phone, email, work location, and payment terms (blank = the vendor's payment terms).
4. Click **Save job worker**.

The system refuses:
- a vendor that is already a job worker (one vendor = one job worker record),
- a GSTIN that is already used by another job worker,
- a vendor whose GSTIN is malformed (correct it in the Vendor Master first),
- a worker with no operations.

### 3.2 Add a rate contract (APPROVER)

Open the job worker (click its code) → **+ Add rate contract**.

| Field | Meaning |
|---|---|
| Operation | Must be one of the worker's approved operations |
| Item category | The stock category the rate applies to. Leave blank for all categories |
| Rate basis | Per piece, per kg, per batch or per hour — recorded on the order for reference |
| Rate | The agreed rate |
| Minimum qty per order | An order below this quantity is refused |
| Effective from / Valid until | The contract is only usable on these dates |

Rules:
- Two active contracts cannot overlap for the same worker, operation and category. To change a rate, **revoke** the old contract first (button in the rate table) and then add the new one. This keeps every change visible.
- An expired contract is never used silently. Orders must have a valid contract on their order date, and approval re-checks it.

### 3.3 Make sure the store has stock

Job work moves stock that already exists in your Store. Check the item's stock in the Inventory module. The Indent screen also shows the stock available at the source store for each line.

---

## 4. The normal flow, step by step

The whole flow is shown below. Each step links to the one before it, so you can always walk from an order to its indent, challans, receipts, inspections and ledger.

```
Indent (CREATOR) → approve (APPROVER)
      ↓ "Create job work order"
Job Work Order (CREATOR) → submit → approve (APPROVER; rate re-checked)
      ↓ "Dispatch material"                 (STORE)
Challan(s) → material moves Store → External Job Work
      ↓ "Record receipt"                    (STORE)
Receipt(s) → processed material → Quality Hold; unused raw material → Store
      ↓ inspect each receipt line          (QUALITY)
Accepted → Store · Rejected/Scrap → Rejection Store · Rework → Rework-Burning
      ↓ rework goes back out: "Dispatch material" → "Re-dispatch rework"
      ↓ all material back and inspected → order becomes COMPLETED automatically
Close order (APPROVER)
```

### Step 1 — Raise an indent (CREATOR)

**Indents → + New indent.**

1. **Requesting department** — the department that needs the work (e.g. CNC).
2. **Source store / warehouse** — where the material is taken from (e.g. Store). The system checks stock here.
3. **Reason for outsourcing** — required, for example "CNC capacity short this month".
4. **Required dispatch / return date**, optional production order or BOM reference, optional estimated cost and remarks.
5. **Items** — for each line choose:
   - the **item** (search by code or description),
   - the **stock category** the material is held under (for example SPRING or FG — the category where your stock actually sits; it defaults to the item's category),
   - the **operation** (e.g. CNC),
   - the **quantity** (must be above zero),
   - remarks.
6. Click **Save and submit** (or **Save draft** to finish later).

The indent list shows, for every line, the **available quantity at the store** and a warning when the store is short. Stock is checked again at dispatch, so a warning here is information, not a block.

Refused: zero or negative quantities, the same item and operation twice on one indent, a missing reason, a missing department or store.

### Step 2 — Approve the indent (APPROVER)

Open the indent. Click **Approve** or **Reject** (rejection needs a reason). The requester cannot approve their own indent (only an ADMIN can). Rejected indents can be edited and submitted again.

### Step 3 — Create the job work order (CREATOR)

From an approved indent: open the indent and click **Create job work order**. Or from **Job Work Orders → + New job work order** and choose **From approved indent** (or leave it on *Direct order* to order without an indent).

1. The lines are copied from the indent; change the quantity to send if needed. The total sent for an item and operation cannot exceed the indent quantity across all live orders.
2. Choose the **Job worker** (only active workers appear).
3. Choose the **Source store**, the **Requesting department**, dates, payment terms, quality specifications and delivery/rejection terms.
4. Click **Save and submit**.

**The rate is never typed in.** The system takes the worker's active rate contract for that operation and category on the order date and calculates the **estimated charges** (rate × quantity). If there is no valid contract, the order is refused with a message telling you to ask an approver to add one.

### Step 4 — Approve the order (APPROVER)

Open the order → **Approve** (or **Reject** with a reason). Approval:
- refuses an order whose contract has expired since it was drafted,
- refuses approval by the person who created the order (except ADMIN),
- checks the **approval limit** on estimated charges if one has been configured (see §9).

**Approved orders cannot be edited.** That is deliberate: the agreed rate and quantities are fixed once approved. To change them, cancel the order (only if nothing has been dispatched) and create a new one.

### Step 5 — Dispatch material (STORE)

Open the approved order → **Dispatch material**. This opens the dispatch form.

- **Challan date**, **Authorised by** (required), transporter, vehicle number, **E-way bill number** (optional — enter it if your transport rules require it), purpose and remarks.
- **Lines** — every item with balance still to send is listed. Type the quantity to dispatch for each line.
- **Re-dispatch rework material** (checkbox) — switches the form to rework: only the quantity that came back as *rework* and is still pending re-dispatch is listed, and it is sent from Rework-Burning instead of the Store.
- Click **Post challan**.

What happens when you post:
- A **challan number** (JWC-…) is generated.
- The stock moves from the **source store** (or Rework-Burning) to **External Job Work** in the inventory engine.
- The job worker's ledger shows the quantity as "with worker".
- The order moves to **In progress**.

The system refuses a dispatch that exceeds:
- the approved balance still to send on the line,
- the stock available at the source store,
- the rework quantity pending (for a rework dispatch).

Posting the same challan twice (for example after a network hiccup) does **not** move the stock twice.

You can dispatch the same order several times (partial dispatches). Each dispatch is a separate challan.

### Step 6 — Print the challan

Open the order → **Challans** table → **Print** on the challan. It opens a printable page with the job worker, the source, purpose, transport, e-way bill number and the item lines. Use the browser's **Print → Save as PDF** to keep a copy.

### Step 7 — Record the receipt (STORE)

When the job worker returns material, open the order → **Record receipt**.

- **Receipt date**, the job worker's **delivery note number**, optionally the **challan** the material belongs to, and remarks.
- For each line the form shows what the worker **holds right now** (the "With worker" column). Enter:
  - **Processed quantity back** — the finished/processed material returning,
  - **Unused raw material back** — raw material that was not used and comes back to store.
- Click **Record receipt**.

What happens:
- Processed material moves from External Job Work to **Quality Hold** (it is *not* yet available for use).
- Unused material moves from External Job Work back to the **source store**.
- The worker's balance is reduced by what came back.
- The receipt appears in **Receipts & Inspection** waiting for inspection.

The system refuses a receipt larger than what the worker holds (over-receiving). Partial receipts are normal: send 10, receive 4, receive 6 later.

Resubmitting the same receipt form (same key) does not create a second receipt.

### Step 8 — Inspect the material (QUALITY)

Go to **Receipts & Inspection** → click the receipt number. For each line still *Pending*:

| Column | Enter |
|---|---|
| **Accepted** | Good material — released to the **source store** |
| **Rejected** | Material that failed — moved to **Rejection Store** |
| **Rework** | Material that can be fixed — moved to **Rework-Burning**; it must be sent out again (Step 9) |
| **Scrap** | Material that is lost — moved to **Rejection Store** until disposal |
| **Defect code** | Required whenever rejected, rework or scrap is more than zero |
| **Remarks** | Optional |

Rules:
- **Accepted + Rejected + Rework + Scrap must equal the quantity received.** Nothing is adjusted silently.
- A line can be inspected **once**. Further goods come back on a new receipt.
- Only material that has been inspected can leave Quality Hold, so nothing unchecked reaches the store.

When every line is inspected and every piece is back, the order becomes **Completed** automatically.

### Step 9 — Rework (if any)

If some material was marked *Rework*:
1. Open the order → **Dispatch material** → tick **Re-dispatch rework material**.
2. Enter the quantity to send again (up to the rework quantity still pending) → **Post challan**.
3. The worker processes it and returns it → **Record receipt** → inspect it (usually Accepted).

Rework stays linked to the same order and the same line, so the history is complete through every cycle.

### Step 10 — Complete and close (APPROVER)

When the order shows **Completed** (all material back, all inspected, no rework pending), an APPROVER opens it and clicks **Close order**. Closing is the end of the material flow. Financial closure (invoices and payments) is part of a later phase.

---

## 5. Reversing and cancelling — what is allowed

| Action | Who | When it is allowed |
|---|---|---|
| **Cancel an order** | Creator (draft / pending / rejected); Approver (approved) | Only if nothing has been dispatched on it. A reason is required |
| **Reverse a challan** | Approver | Only if no receipt has been recorded against that dispatch. A reason is required. The stock returns to the source store and the worker's balance is reduced |
| **Edit an order** | Creator | Only while it is a draft or rejected. Approved orders are not edited |
| **Close an order** | Approver | Only when it is Completed |

Reversals are never silent: each reversal is a new inventory transaction linked to the original, and it is written to the history.

---

## 6. The screens in detail

### 6.1 Dashboard

Cards show:
- **Orders by status** — click any card to open the order register filtered to that status.
- **Action needed** — indents and orders awaiting approval, overdue orders (past their return date), orders with material out, open challans, receipts awaiting inspection. Each card opens the matching register.
- **Material and quality** — material with job workers (quantity), rejected quantity, rework generated, rework still pending re-dispatch, scrap.
- **Cost tables** — estimated job work cost by job worker, by department and by item; and **turnaround** — average days from challan to receipt per worker.

### 6.2 Job Workers

- **Search** by name, code or GSTIN; filter by status.
- Open a job worker to see its master details, approved operations, **rate contracts** (with revoke and add), **material held** (ledger balance per item), **status** (Set active / Set inactive / Block with a reason) and **history**.

### 6.3 Indents

- Filter by status and search by number, reason or item code.
- Open an indent to see its lines with available stock, the orders raised from it, the approval history, and the buttons for the next action (Edit, Submit, Approve, Reject, Cancel, Create job work order).

### 6.4 Job Work Orders

- Filter by status, search by order number, worker or item, or show only **overdue** orders.
- Overdue rows are shaded red.
- Open an order to see:
  - **Items and progress** — for every line: input, sent, with worker, back (processed), accepted, rejected, rework (and how much is still pending), scrap, and the rate and rate basis agreed.
  - **Challans** with status, returned quantity and **Print** / **Reverse**.
  - **Receipts** with inspection status.
  - **Stock ledger for this order** — every movement.
  - **Approval history**.
- The footer buttons show only the actions allowed for the current order status and your role.

### 6.5 Challans

A register of all dispatches with filters by status and search by challan, order or worker. Challans are created from an order (Dispatch material); clicking an order number opens the order.

### 6.6 Receipts & Inspection

- Filter: *Awaiting inspection* / *Inspected*.
- The receipt list shows how many lines are still pending inspection.
- Open a receipt to inspect its lines and see the history.

### 6.7 Worker Stock Ledger

Every movement for every job worker, item and order: **SENT** (dispatch, +), **RECEIVED** (processed material back, −), **RETURNED_UNUSED** (unused material back, −), **REVERSED_SENT** (a reversed dispatch, −). The *Balance with worker* column never goes below zero. Filter by job worker or search by item or reference; export to Excel.

---

### 6.8 Reconciliation & Scrap

This screen answers one question for every order: **where is every piece now?** It has five tabs.

- **Orders** — one row per order that has material out or back. Filter by order number or worker, or tick *Only past return date*. Overdue rows are shaded. Click **Open** to see each line: dispatched, back processed, unused back, **with worker**, accepted, rejected, scrap (and how much is still left to dispose), written off, allowed loss, excess loss and status.
- **Adjustments & approvals** — every adjustment request with its status. The default filter shows what is **awaiting approval**. An APPROVER or ADMIN clicks **Approve** or **Reject** and must give a reason for a rejection. Nothing changes until an approval is given.
- **Scrap** — for each scrap line: recorded, disposed (approved), disposal pending, and left to dispose.
- **Alerts** — overdue returns, challans not fully reconciled, rework still waiting for re-dispatch, and excess losses above the permissible limit.
- **Permissible loss** — APPROVER only. Sets the loss allowed for an operation, as a percentage of dispatched quantity, for one category or for all categories. If no rule is set, every process loss counts as excess.

**Requesting an adjustment.** On an order, click **Request adjustment**, choose the line and the type, enter the quantity and a reason. Three types exist:

| Type | Use it when | Effect after approval |
|---|---|---|
| **Scrap disposal (to Scrap Yard)** | Scrap in the Rejection Store is being thrown out or sold | Stock moves from Rejection Store to Scrap Yard |
| **Shortage (write off, not received)** | Material was sent but will never come back, and the worker accepts the loss | The quantity is written off and no longer counts as with the worker |
| **Process loss (write off)** | The worker lost material during processing | The quantity is written off, and it is checked against the permissible loss |

The quantity cannot exceed what is still available for that line (shown on the form). The request needs approval by someone other than the requester.

**Typical use.** An order is past its return date and 5 pieces are still with the worker. Open it from the **Orders** tab, confirm the numbers, and request a *Shortage* adjustment for 5 with the worker's written statement as the reason. An approver approves it in **Adjustments & approvals**. The order then shows the 5 as written off, and the worker's ledger balance goes to zero for that item.

### 6.9 Reports

Choose a report on the left, set the filters and press **Run report**. **Export Excel** saves exactly the rows on screen.

| Report | What it shows | Filters |
|---|---|---|
| Job Work Order Register | Orders with quantities and status | Dates, worker, search |
| Challan Register | Every dispatch challan | Dates, worker, search |
| Challan-wise Pending Material | Material still with the worker, per order line | Worker, search |
| Material Outside Factory | Quantity with each job worker, per item | Worker, search |
| Job Worker Stock Ledger | Every movement, per job worker | Dates, worker, search |
| Job Work Receipt Register | Every receipt | Dates, worker, search |
| Quality Rejection and Rework | Inspection results per receipt line | Dates, worker, search |
| Scrap and Wastage | Scrap, losses and permissible loss per line | Dates, worker, search |
| Reconciliation Adjustments | Scrap disposals, shortages and process losses | Dates, worker, search |
| Job Work Cost by Item and Operation | Estimated charges grouped by item and operation | Dates, worker, search |
| Vendor Rate Comparison | Active rate contracts per operation and category | — |
| Job Worker Turnaround | Days from challan to receipt, per worker | Dates, worker, search |
| Order Transaction History | The full trail of one order | Type the exact order number in *Search* |

Reports with a date range use the **From** and **To** dates. The rest show the current position and ignore the dates.

## 7. Business rules at a glance

| Rule | Why |
|---|---|
| Rates come only from an active contract valid on the order date | No silent or expired rates |
| Approved orders cannot be edited | Agreed terms stay fixed |
| Creator cannot approve their own indent or order | Segregation of duties (ADMIN excepted) |
| Dispatch ≤ approved balance and ≤ store stock | No over-sending |
| Receipt ≤ what the worker holds | No over-receiving |
| Accepted + rejected + rework + scrap = received | Nothing adjusted silently |
| A receipt line is inspected once | No double disposition |
| Material leaves Quality Hold only after inspection | Unchecked goods never reach production |
| Repeated submissions do not repeat postings | Protection against double-clicks and retries |
| A dispatch with receipts cannot be reversed | History stays consistent |
| An order with dispatched material cannot be cancelled | Use reversal, then cancel, or close |
| Ledger balance cannot go negative | Detects bookkeeping errors immediately |

---

## 8. Troubleshooting

| Message you see | What it means | What to do |
|---|---|---|
| *No active rate contract for this operation and category…* | The worker has no valid rate for that operation/category on the order date | Approver: open the worker → add a rate contract (check the dates and category) |
| *This operation is not approved for …* | The operation is not in the worker's approved list | Approver: edit the worker and tick the operation, then add the rate |
| *Only approved indents can be turned into a job work order* | The indent is still draft or submitted | Get it approved first |
| *… exceeds the indent quantity remaining* | The orders already raised use up the indent | Reduce the quantity or raise a new indent |
| *Only the creator or an approver can change this…* | Wrong role selected, or you are not the creator | Pick the right role at the top-right, or ask the creator |
| *Only approved orders…* / *Current status: …* | The order is not in the status needed for the action | Check the status badge; follow the flow in section 4 |
| *exceeds the approved balance to dispatch* | You are sending more than the order allows | Reduce the quantity |
| *Insufficient stock* / *cannot be greater than closing balance…* | The store does not have that quantity under that category | Check the stock category on the line; check the store balance |
| *Over-receiving blocked…* | The worker holds less than you entered | Check the "With worker" column and the earlier receipts |
| *This line has already been inspected…* | The line was already inspected | Use a new receipt for further goods |
| *Accepted + rejected + rework + scrap … must equal …* | The inspection numbers do not add up to the received quantity | Correct the numbers |
| *Give a defect code…* | Rejected, rework or scrap entered without a defect code | Enter the defect code |
| *Receipts exist against this dispatch… cannot be reversed* | Material has already come back on that challan | Reverse the receipts first (or keep the challan) |

If a page looks empty, check the **filters** above the table — a status or date filter may be hiding records.

---

## 9. Configuration (for the administrator)

| Setting | File | Meaning |
|---|---|---|
| `job-work.approval-limit` | `backend/src/main/resources/application.properties` | If set, an approver cannot approve an order whose estimated charges exceed this amount (ADMIN is not limited). Empty = no limit. **Set this to your company's approval policy.** |
| Locations | Department Master | *External Job Work*, *Quality Hold* were added for this module; *Store*, *Rejection Store* and *Rework-Burning* must exist |
| Operations | Database table `job_work_operations` | The list of job work processes (add more here) |
| Stock categories | Category Master | Every line's stock category must exist here |
| Tax (GST) on job work | Not configured here | This phase records no GST on job work orders; GST and invoicing come with the invoice phase |

---

## 10. What is not built yet (and where it stands)

| Area | Status |
|---|---|
| Job worker invoices, verification against rates, duplicate invoice check, TDS, payables and payments | Next phase (there is no Finance module in the project yet) |
| Compliance: GST challan data, ITC-04 data, e-way bill rules | Later phase. The e-way bill field is recorded; no rule is enforced |
| Order amendments with revision history | Not built. Approved orders must be cancelled (if nothing dispatched) and re-created |
| Multi-stage chains (CNC → Coating → Inspection) | Partly: rework can be sent to another dispatch, but a fixed chain of stages with separate orders is not built |
| Job-worker-supplied consumables | Not built |
| Quality checklists, test reports, photographs | Not built. Inspection records the numbers, defect code and remarks only |
| Attachments (certificates, delivery notes) | The storage exists in the backend; screens for uploading them are not built yet |
| Notifications (overdue returns, pending approvals, etc.) | Not built. Overdue orders are visible on the dashboard and in the order register |
| Recoverable scrap value (rupee value of scrap) | Not built. Scrap and disposal are tracked in quantity only |
| Barcode / QR codes | Not built |

---

## 11. Quick reference: who does what

| Task | Role | Screen |
|---|---|---|
| Onboard a vendor as job worker | APPROVER | Job Workers → + Onboard |
| Add / revoke a rate contract | APPROVER | Job Workers → open worker |
| Block / reactivate a worker | APPROVER | Job Workers → open worker → Status |
| Raise an indent | CREATOR | Indents → + New indent |
| Approve / reject an indent | APPROVER | Indents → open indent |
| Create an order | CREATOR | Job Work Orders → + New (or from the indent) |
| Approve / reject an order | APPROVER | Job Work Orders → open order |
| Dispatch material | STORE | Order → Dispatch material |
| Record a receipt | STORE | Order → Record receipt |
| Inspect received material | QUALITY | Receipts & Inspection → open receipt |
| Re-dispatch rework | STORE | Order → Dispatch material → tick Re-dispatch rework |
| Reverse a challan | APPROVER | Order → Challans → Reverse |
| Cancel an order | CREATOR (draft) / APPROVER | Order → Cancel order |
| Close a completed order | APPROVER | Order → Close order |
| Check what a worker holds | Anyone | Worker Stock Ledger, or Job Workers → open worker |

---

## 12. Worked example

1. **Setup (APPROVER):** Onboard vendor *Global Precision Works* as a job worker with approved operation *CNC*. Add a rate contract: CNC, category SPRING, per piece, ₹50, valid for a year.
2. **Indent (CREATOR):** CNC department needs 30 pieces of item 101 machined. Source store: Store. Reason: "CNC capacity short". Submit.
3. **Approve (APPROVER):** Approve the indent.
4. **Order (CREATOR):** From the approved indent, create an order for 20 pieces to Global Precision Works. Estimated charges: 20 × ₹50 = ₹1,000. Submit.
5. **Approve (APPROVER):** Approve the order.
6. **Dispatch (STORE):** Dispatch 12 pieces on challan 1, then 8 pieces on challan 2. The store stock falls by 20; the worker holds 20.
7. **Receipt (STORE):** Receipt 1: 10 processed pieces back (worker still holds 10). Receipt 2: 9 processed + 1 unused back (worker holds 0).
8. **Inspection (QUALITY):**
   - Receipt 1: 6 accepted, 2 rejected (defect DIM-01), 2 rework (defect DIM-01). Accepted goes to Store; 2 rejected to Rejection Store; 2 rework to Rework-Burning.
   - Receipt 2: 9 accepted to Store.
9. **Rework (STORE + QUALITY):** Re-dispatch the 2 rework pieces from Rework-Burning; they come back on receipt 3; inspection accepts them.
10. **Result:** The order shows **Completed**. Of the 20 pieces sent, 19 came back processed and 1 came back unused. The 2 rework pieces went out again and came back processed. In total 17 were accepted, 2 were rejected and 0 were scrapped. The worker holds nothing. **Close order (APPROVER)**.

---

*Document version: Job Work phase 1 (dispatch, receipt, inspection, rework, ledger, dashboard, workers, indents, orders). Keep this guide with the module; update it when a later phase is added.*
