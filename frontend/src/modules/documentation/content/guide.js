// User Guide content for the Documentation module.
//
// One entry per screen, keyed by the SAME page id the navigation uses (targetPage in shared/layout/modulesData.jsx).
// The Documentation module lists every screen in the navigation automatically and flags any screen that has no
// entry here as "Not documented yet", so a new screen can never be silently missing from the guide.
//
// KEEP THIS FILE CURRENT: whenever a screen, field, rule or workflow changes, update its entry in the same change
// (see CLAUDE.md, "Documentation rule"). Describe what the software does today; mark anything planned as planned.
//
// Block types understood by the renderer (DocBlocks.jsx):
//   { p: "text" }                                  paragraph
//   { steps: ["...", "..."] }                      numbered how-to steps
//   { list: ["...", "..."] }                       bullet list
//   { rules: ["...", "..."] }                      business rules the system enforces (shown with a shield)
//   { table: { head: [...], rows: [[...], ...] } } table
//   { tip: "text" } / { warn: "text" }             call-outs
//   { flow: "flowchart-id" }                       link to a chart in the Flowcharts section

export const GUIDE_UPDATED = "2026-11-11";

// ---------------------------------------------------------------- start here (not tied to a menu screen)

export const START_HERE = [
  {
    id: "welcome",
    title: "Welcome to Silver Brain ERP",
    summary: "What this software is, who it is for and how it is organised.",
    blocks: [
      { p: "Silver Brain is the ERP of Silver Muller Seals. It runs the plant's master data (items, vendors, customers, machines, departments) and the complete purchasing cycle — from a department's requirement to goods received at the gate — with every quantity checked, every step attributed to the person who did it, and every document numbered automatically." },
      { p: "The software is organised into modules (Engineering, Purchase, Inventory, CRM, Maintenance, Settings, …). Each module contains screens. Modules that are still being built show their planned screens as 'Coming soon', so you can see the roadmap." },
      { table: { head: ["Module", "What you do there", "Status"], rows: [
        ["Engineering", "Item Master (finished goods and other items), payment / freight masters, HSN & GST master", "Live"],
        ["Purchase", "Vendors, purchase requisitions, vendor rates, sourcing, all purchase order types, GRN, RFQ, quotations, job work, reports", "Live"],
        ["CRM & Order Management", "Customer master", "Customer master live; sales screens planned"],
        ["Maintenance", "Machine master", "Machine master live; maintenance screens planned"],
        ["Settings", "Departments, users, roles and access control", "Live"],
        ["Inventory, Gate, Quality, PPC, Production, Sales & Dispatch, Finance", "Planned modules", "Coming soon"]
      ] } },
      { tip: "New here? Read 'Signing in', 'Finding your way around' and 'Roles and access' first, then the guide for the screens you will use." }
    ]
  },
  {
    id: "sign-in",
    title: "Signing in and your password",
    summary: "Login, temporary passwords, sessions and signing out.",
    blocks: [
      { steps: [
        "Open the ERP in your browser. The sign-in screen appears.",
        "Enter the email address and password your administrator gave you, then sign in.",
        "If your administrator gave you a temporary password, the ERP asks you to set your own password before anything else. There is no way past this screen except setting a password or signing out.",
        "After signing in you land on the home page."
      ] },
      { rules: [
        "Passwords are stored as one-way bcrypt hashes; nobody can read your password from the database.",
        "A session lasts 12 hours. After that, or if an administrator deactivates your account, you are returned to the sign-in screen.",
        "An inactive account cannot sign in.",
        "The sign-in and set-password screens always use the light design. Night view (if it is switched on) applies after you sign in.",
        "Every action you take is recorded under your signed-in name. The server takes the name from your session, never from anything typed in the browser."
      ] },
      { tip: "Your session is kept for this browser tab. Opening the ERP in a new tab or window may ask you to sign in again." }
    ]
  },
  {
    id: "navigation",
    title: "Finding your way around",
    summary: "Home page, module menu, the slide-out menu, the Back and Home buttons and breadcrumbs.",
    blocks: [
      { list: [
        "Back and Home buttons (top-left of the header, on every screen): the arrow returns to the screen you were on before, and the house icon takes you to the home page. Back is greyed out when there is no earlier screen in this tab.",
        "The browser's own Back and Forward buttons (and Alt+Left / Alt+Right, or a mouse's back button) move between ERP screens the same way. Refreshing the page keeps you on the screen you were on.",
        "Back goes to the previous screen, not to an earlier step inside a screen. Anything typed but not saved on the screen you leave is not kept, just as when you open another screen from the menu.",
        "Home page: the left-hand list shows every module you have access to. Hover a module to open its screens; hover a group (for example Purchase → Purchase Orders) to see the screens inside it.",
        "Inside a screen: use the Menu button (top-left of most screens) to slide the module menu in and out, and Home to return to the home page.",
        "The header always shows which module and screen you are in, plus the live date and time.",
        "Screens marked 'Coming soon' are planned and not built yet; they are listed so you can see what is next.",
        "Documentation (this module) is always available to every signed-in user."
      ] },
      { tip: "If a module or screen you expect is missing from your menu, you do not have permission for it. Ask your administrator to grant it on Settings → Access Control." }
    ]
  },
  {
    id: "roles",
    title: "Roles and access",
    summary: "Who can see and do what, and how it is enforced.",
    blocks: [
      { p: "Access is controlled per screen and per action. Every controlled item is a permission key of the form module.entity:action — for example purchase.pr:approve means 'approve purchase requisitions'." },
      { table: { head: ["Concept", "Meaning"], rows: [
        ["Role", "A named set of permissions (for example Purchase Executive). Super Admin and Developer are built-in full-access roles."],
        ["User permissions", "On Settings → Access Control, a user's permissions start from their role and can be adjusted for that one user."],
        ["View", "Lets you open the screen. Without it, the screen is removed from your menu and cannot be opened."],
        ["Create / Edit / Delete / Submit / Approve / Reject / Cancel / Post / Issue / Receive / Inspect / Assign / Export / Print", "Individual actions. Buttons for actions you do not hold are hidden, and the server refuses them anyway."]
      ] } },
      { rules: [
        "The browser hides what you cannot use, but the server re-checks every change you make. Hiding a button is a convenience; the real lock is on the server.",
        "Starting role templates exist for Purchase Executive (prepares documents), Purchase Manager (approves spend, does not create what it approves), Department User (PRs and job-work indents), Store Operator (receipts and dispatch), Quality Inspector, Site Acceptor, Accounts User, Master Data Officer and Auditor (read-only)."
      ] },
      { flow: "rbac-request" }
    ]
  },
  {
    id: "glossary",
    title: "Glossary",
    summary: "The words the ERP uses, in plain language.",
    blocks: [
      { table: { head: ["Term", "Meaning"], rows: [
        ["PR — Purchase Requisition", "A department's formal request to buy something. It must be approved before purchasing can order against it."],
        ["Clubbed Demand", "All approved, not-yet-ordered PR quantity, grouped by item and unit so buyers can source it together. PR lines are never merged."],
        ["Draft PO", "A vendor's basket: PR quantity reserved for one vendor before it becomes a purchase order. One open draft per vendor."],
        ["PO — Purchase Order", "The order sent to a vendor. Types: PO by PR (from drafts), Direct PO (no PR), Capital PO (assets), Service PO (services)."],
        ["GRN — Goods Receipt Note", "The record of goods received against a PO, with accepted and rejected quantity."],
        ["Vendor Rate Master", "Agreed prices per vendor and item, each with an effective date. History is never overwritten."],
        ["RFQ", "Request for quotation sent to selected vendors for a PR."],
        ["HSN / SAC", "Tax classification codes for goods (HSN) and services (SAC), with their GST rates."],
        ["Job Work", "Sending your material to an outside processor (job worker) and receiving it back."],
        ["Challan", "The dispatch document for material sent to a job worker."],
        ["Reserved / ordered quantity", "PR quantity already promised to a draft or a PO. The system never lets reservations exceed what was requested."],
        ["FG / SFG", "Finished goods / semi-finished goods."]
      ] } }
    ]
  }
];

// ---------------------------------------------------------------- screens, keyed by navigation page id

export const SCREEN_GUIDE = {
  // ============================================================ ENGINEERING
  "item-master": {
    title: "Item Master — FG (Finished Goods)",
    who: "Engineering, master-data officers. Everyone else views.",
    purpose: "The catalogue of finished goods the plant makes and sells — oil seals, O-rings, kits, gaskets and more — with their dimensions, codes, planning and tax data. Purchasing, PRs and reports all read items from here.",
    blocks: [
      { p: "Each item belongs to a Group → Sub-Group → Sub-SubGroup, and its codes (main group, group, sub group, sub sub group) are built from that classification. Filter pills at the top narrow the list to Oil Seals, O-Rings or Kits." },
      { table: { head: ["Section", "Main fields"], rows: [
        ["Identity", "ITEM Code (SMS part number), Old Code, Item Description, Category, Class, Domestic / Exports"],
        ["Dimensions", "ID, OD, Height and Thickness (mm), Color, Material, Style, Gross and Net weight (g)"],
        ["Drawings", "Drawing No., drawing image upload, item image upload, CAD / drawing file name"],
        ["Planning", "Safety, Procurement and Total lead time; Min, Max and Reorder stock level; Opening balance; Rejection % tolerance"],
        ["Units and process", "Purchase UOM and Consumed UOM, Procurement Type, Process Type, FG / SFG outsource flags"],
        ["Tax and price", "HSN / SAC Code, MRP, Rate"],
        ["References", "Application, OEM Reference, CORTECO No., Cross Reference, REF. No., Fitting Position, Swirl Type, Remarks"]
      ] } },
      { steps: [
        "Open Engineering → Item Master → FG.",
        "Search or filter the list, or start a new item.",
        "Choose the group classification first; the codes follow from it.",
        "Fill the dimensions, planning, unit and tax fields, attach the drawing and image if you have them, and save.",
        "Use Print to print the item directory."
      ] },
      { rules: [
        "Purchase requisitions take the item's Purchase UOM automatically; the PR form's unit is used only when the item has none.",
        "An item's HSN code must exist in the HSN master with an active GST rate before it can be bought on a Direct PO."
      ] }
    ]
  },
  "item-master-other": {
    title: "Item Master — Other (non-FG)",
    who: "Engineering, stores, master-data officers.",
    purpose: "Every item that is not a finished good: raw material, consumables, spares, tooling, packing and more, organised into your own groups and sub-groups.",
    blocks: [
      { steps: [
        "Open Engineering → Item Master → Other.",
        "Create groups (name, code / abbreviation, optional description) and sub-groups under them (parent group, name, code).",
        "Add items inside a sub-group; attach a drawing and an image where useful.",
        "Edit or delete items, groups and sub-groups from the list. Deleting asks for confirmation."
      ] },
      { rules: [
        "Default groups and sub-groups are created once per database. If you delete or rename one, it stays deleted or renamed — a restart never brings it back."
      ] }
    ]
  },
  "masters-mode-of-payment": {
    title: "Mode of Payment",
    who: "Master-data officers; used by purchasing and CRM.",
    purpose: "The list of payment modes (for example NEFT, RTGS, cheque) offered on documents.",
    blocks: [
      { steps: ["Open Engineering → Masters → Mode of Payment.", "Add an entry: type a name (and a code, or leave the code blank to have one generated).", "Rename, delete (deactivate) or restore entries from the list."] },
      { rules: ["Names are unique among active entries.", "Delete is a soft delete: the entry is deactivated and can be restored, so documents that used it stay readable."] }
    ]
  },
  "masters-credit-period-basis": {
    title: "Credit Period Calculation From",
    who: "Master-data officers, accounts.",
    purpose: "The event a credit period is counted from (for example invoice date or receipt date), used by payment terms.",
    blocks: [
      { steps: ["Open Engineering → Masters → Credit Period Calculation From.", "Add, rename, delete or restore entries the same way as every code-and-name master."] },
      { rules: ["Names are unique among active entries; deleted entries can be restored."] }
    ]
  },
  "masters-payment-terms": {
    title: "Payment Terms",
    who: "Master-data officers; selected on vendors, customers and POs.",
    purpose: "Your standard payment terms (for example 30 days from invoice, advance).",
    blocks: [
      { steps: ["Open Engineering → Masters → Payment Terms.", "Add, rename, delete or restore entries."] },
      { rules: ["Names are unique among active entries; deleted entries can be restored."] }
    ]
  },
  "masters-freight-options": {
    title: "Freight Options",
    who: "Master-data officers; selected on purchase orders.",
    purpose: "How freight is handled on an order (for example paid by vendor, to pay, included).",
    blocks: [
      { steps: ["Open Engineering → Masters → Freight Options.", "Add, rename, delete or restore entries."] },
      { rules: ["Names are unique among active entries; deleted entries can be restored."] }
    ]
  },
  "masters-hsn-code": {
    title: "HSN Code (HSN / SAC tax master)",
    who: "Accounts and master-data officers.",
    purpose: "Tax classification codes for goods (HSN) and services (SAC) with their GST rates. Every PO line takes its GST from here.",
    blocks: [
      { steps: ["Open Engineering → Masters → HSN Code.", "Enter the code, its type, and the GST, CGST, SGST and IGST rates.", "Save. Deleted codes can be restored."] },
      { rules: [
        "You type all four rates; the screen does not derive them. CGST + SGST must equal GST, and IGST must equal GST — the screen refuses rates that do not agree.",
        "Codes are unique, including deleted ones, so a duplicate is caught before saving.",
        "A PO cannot use an item whose HSN code has no active GST rate."
      ] }
    ]
  },

  // ============================================================ PURCHASE
  "supplier-master": {
    title: "Suppliers (Vendor Master)",
    who: "Purchasing and master-data officers.",
    purpose: "Every vendor you buy from, with its tax registration, contacts, address, payment terms and the items it supplies.",
    blocks: [
      { table: { head: ["Area", "Fields"], rows: [
        ["Registration", "Supplier Type, GST Registration Type, GSTIN (15-digit), PAN (10-digit), Udyam Registration No., MSME Category"],
        ["Items supplied", "Search the Item Master and add the items this vendor supplies"],
        ["Contacts", "Contact Person, Phone / Mobile, Email"],
        ["Commercial", "Payment Terms"],
        ["Address", "Registered office / factory address, City, State, State Code (2-digit), Pincode"],
        ["Status", "Vendor Status (only ACTIVE vendors can be used on new documents)"]
      ] } },
      { steps: ["Open Purchase → Suppliers.", "Add a vendor or open an existing one.", "Fill registration, contacts and address; add the items it supplies.", "Save. Use Print for the directory."] },
      { rules: [
        "Only ACTIVE vendors appear on new PRs' sourcing, drafts, POs and job work.",
        "A vendor becomes selectable for an item either by being linked here (items supplied) or by having a rate for that item in the Vendor Rate Master. Adding a rate also records the link here automatically."
      ] }
    ]
  },
  "purchase-requisition": {
    title: "Purchase Requisition (PR)",
    who: "Department users raise PRs; approvers approve or reject them.",
    purpose: "The formal request to buy. Nothing can be ordered against a requirement until its PR is approved.",
    blocks: [
      { table: { head: ["Field", "Meaning"], rows: [
        ["PR Number", "Assigned by the server on save (PR-YEAR-NNNNN, restarting each year). A number shown before saving is only a preview."],
        ["PR Date / Required By Date", "When it was raised and when the material is needed"],
        ["Department", "From the Department Master"],
        ["Requested By", "Who needs it"],
        ["PR Type", "Raw Material, Raw Material Store, Packing, Capital Goods / Asset, Service / Subcontract"],
        ["Priority", "Low, Normal, High, Urgent"],
        ["Requirement Type / Purpose, Cost Center, Project / Work-Order Ref, Remarks", "Context for the approver and buyer"],
        ["Lines", "Item (from the Item Master), quantity and unit"]
      ] } },
      { steps: [
        "Open Purchase → Purchase Requisition and create a new PR.",
        "Fill the header and add the item lines. Save as Draft to finish later.",
        "Submit: the PR moves to Pending Approval.",
        "The approver opens it and approves, or rejects with a reason (Reason for Rejection is required).",
        "Once approved, its quantity appears in Clubbed Demand for buyers (or is used by a Capital / Service PO)."
      ] },
      { table: { head: ["Status", "Meaning"], rows: [
        ["Draft", "Being prepared; can be edited"],
        ["Pending Approval", "Submitted and waiting for the approver"],
        ["Approved", "Approved; nothing ordered yet"],
        ["Partially Ordered", "Some quantity is on POs"],
        ["Fully Ordered", "All requested quantity is ordered"],
        ["Rejected", "Returned with a reason; edit and submit again"],
        ["Cancelled", "Stopped (possible from Draft, Pending Approval, Approved or Rejected)"]
      ] } },
      { p: "The list's \"Converted to PO\" filter and the \"PO Converted\" counter include every PR that has a PO against it: Partially Ordered, Fully Ordered, and older PRs marked Converted to PO." },
      { rules: [
        "A PR line can never be ordered beyond its requested quantity — every reservation is checked under a database lock, so two buyers cannot over-order the same line at the same moment.",
        "A PR with lines already ordered through PO by PR cannot be deleted, and its lines cannot be edited.",
        "Counted units must be whole numbers.",
        "Every status change is written to the activity trail with the signed-in user's name."
      ] },
      { flow: "pr-lifecycle" }
    ]
  },
  "new-po-vendor-rates": {
    title: "Vendor Rate Master",
    who: "Purchasing (create), purchase managers (review).",
    purpose: "The agreed price of each item from each vendor, with the date it takes effect. Purchase orders take their prices from here.",
    blocks: [
      { steps: [
        "Open Purchase → Vendor Rate Master.",
        "Pick the vendor (Vendor Master) and the item (Item Master).",
        "Enter the offered unit price and the Effective From date. The screen shows which rate would apply on that date before you save.",
        "Save. The full price history for the vendor and item stays visible."
      ] },
      { rules: [
        "History is insert-only: a price change is a new row with its own effective date. Old rates are never overwritten or deleted, so every historical PO can be traced to the rate in force.",
        "The rate that applies on a date is the latest one effective on or before it; future-dated rates wait for their date.",
        "Price must be above zero with at most 2 decimals; the vendor must be ACTIVE.",
        "The same vendor, item and effective date cannot be entered twice.",
        "Saving a rate also links the vendor to the item in the Supplier Master, so the vendor immediately appears in Clubbed Demand for that item."
      ] }
    ]
  },
  "new-po-clubbed-demand": {
    title: "Clubbed Demand",
    who: "Buyers (purchase executives).",
    purpose: "All approved PR quantity that is not yet ordered or reserved, grouped by item and unit, with the best vendor suggested from the Vendor Rate Master.",
    blocks: [
      { p: "Each row is one item + unit. The row shows the total ready quantity, the PR lines behind it, the suggested (cheapest) vendor with a ★, its price and GST. 'Compare vendors' lists every vendor that supplies the item with its current rate and any open draft." },
      { steps: [
        "Open Purchase → Purchase Orders → Clubbed Demand.",
        "Use the 'Vendor ready' / 'Needs vendor / rate' pills to see what can be sourced now.",
        "For each item, keep the suggested vendor or click Compare and choose another.",
        "Tick the rows to source and add them to the vendors' drafts.",
        "Continue in Draft POs to review each vendor's basket and convert it to a PO."
      ] },
      { rules: [
        "A vendor is offered for an item when it is ACTIVE and either linked to the item in the Supplier Master or has a rate for it in the Vendor Rate Master. Only vendors with a rate effective today can be chosen.",
        "Adding to a draft only reserves PR quantity — nothing is ordered here.",
        "PR lines are never merged: each PR line keeps its own reservation, so every unit stays traceable to the PR it came from.",
        "Reservation is checked under lock against the quantity still available on each PR line."
      ] },
      { warn: "If an item shows 'No vendor linked' or 'No vendor rate', add a rate for it in the Vendor Rate Master (this also links the vendor)." },
      { flow: "sourcing" }
    ]
  },
  "new-po-draft-pos": {
    title: "Draft POs",
    who: "Buyers.",
    purpose: "Each vendor's open basket of reserved PR quantity, ready to become a purchase order.",
    blocks: [
      { steps: [
        "Open Purchase → Purchase Orders → Draft POs. There is one open draft per vendor (DRAFT-YEAR-NNN).",
        "Open a draft to see every item given to that vendor and the PR allocations under each item.",
        "Release quantity you no longer want: it goes back to Clubbed Demand.",
        "Click Convert to PO. On the PO screen choose, per PR allocation, how much to buy now — all, part or none. Lines left at zero stay in the draft for a later PO.",
        "Complete the PO terms (freight, other charges, discounts, delivery schedule, remarks) and create the PO."
      ] },
      { rules: [
        "A draft is never ordered by itself; only Convert creates a PO.",
        "Conversion moves the chosen quantity out of the draft and creates the PO in one database transaction — either everything happens or nothing does.",
        "Every assign, release and conversion is written to the activity trail."
      ] },
      { flow: "draft-to-po" }
    ]
  },
  "new-po-direct-po": {
    title: "Direct PO",
    who: "Buyers, for purchases without a PR.",
    purpose: "A purchase order for items bought without a requisition (for example urgent or regular spot buys).",
    blocks: [
      { steps: ["Open Purchase → Purchase Orders → Direct PO.", "Choose the vendor and add item lines.", "Preview the PO (prices, GST, totals), complete terms and delivery schedule.", "Create the PO; print it when needed."] },
      { rules: [
        "The vendor must be ACTIVE and each item must exist in the Item Master.",
        "A vendor rate must be effective on the PO date, and each item's HSN must have an active GST rate.",
        "GST split: a vendor whose GSTIN starts with our own state code (06, Haryana) is charged CGST + SGST; any other state is charged IGST. The same rule applies to PO by PR.",
        "Duplicate item lines are merged; quantities must be above zero with at most 2 decimals.",
        "A Direct PO never reads or changes any PR quantity."
      ] }
    ]
  },
  "capital-po": {
    title: "Capital PO (CAPEX)",
    who: "Buyers create; approvers approve; stores, quality and site teams receive, inspect and accept.",
    purpose: "Purchase orders for capital goods and assets — machines, equipment, infrastructure — through to installation, commissioning and asset registration.",
    blocks: [
      { p: "A capital PO carries the vendor and company GST details, place of supply, department, requester, plant, references (capital PR, quotation, contract), validity and delivery dates, payment / delivery / warranty terms and advance %. Each line describes the asset: category, name, HSN, specifications, make, model, quantity, price, discount, installation and commissioning requirements, warranty, AMC and useful life." },
      { table: { head: ["Status", "Meaning"], rows: [
        ["DRAFT", "Being prepared; can be edited"],
        ["PENDING_APPROVAL", "Submitted; an approver other than the creator approves or rejects"],
        ["REJECTED", "Returned; edit and resubmit"],
        ["APPROVED", "Approved, not yet sent; amendments can be proposed"],
        ["SENT_TO_VENDOR", "Issued. Goods can be received only from here. Receipt, installation, commissioning and asset registration each have their own progress status"],
        ["CLOSED", "Closed after the work is done"],
        ["CANCELLED", "Stopped (allowed up to Sent to Vendor, while nothing has been received)"]
      ] } },
      { rules: [
        "Totals are calculated by the server, not the browser.",
        "Capital POs draw from approved Capital Goods / Asset PR lines without exceeding their remaining quantity.",
        "Receipts never create a stock GRN: received assets are registered in the asset register with their own asset codes.",
        "Extending a PO's validity is restricted to authorised users, and every extension is kept in the validity history.",
        "Amendments, attachments and the full status history are kept for every capital PO."
      ] },
      { flow: "capital-po" }
    ]
  },
  "service-po": {
    title: "Service PO",
    who: "Buyers create; approvers approve; requesting departments accept the work.",
    purpose: "Purchase orders for services — maintenance, repairs, AMC, calibration, contract work — with scope, schedule, acceptance and invoices.",
    blocks: [
      { p: "Each service line records the category, title, related machine / asset, detailed scope, deliverables, acceptance criteria, frequency and number of visits, SLA, warranty, exclusions, pricing method, rate, discount and additional charges." },
      { table: { head: ["Status", "Meaning"], rows: [
        ["DRAFT → PENDING_APPROVAL → APPROVED", "Preparation and approval; a rejection returns the PO to Draft for correction"],
        ["ISSUED", "Sent to the vendor; service acceptance can be recorded against the schedule"],
        ["PARTIALLY_FULFILLED / FULFILLED", "Some / all scheduled work accepted (each acceptance is Accepted, Partially Accepted or Rejected)"],
        ["ON_HOLD", "Paused; release returns it to its previous status"],
        ["CLOSED / CANCELLED", "Finished, or stopped (cancel only while nothing has been accepted)"]
      ] } },
      { rules: [
        "A Service PO never creates a GRN and never changes stock.",
        "An approval limit can be configured for approvers (service-po.approval-limit); ADMIN is never limited.",
        "Acceptance can be recorded only while the PO is Issued or Partially Fulfilled and not expired; vendor invoices are recorded by finance users.",
        "Amendments keep the current status and are stored as revisions; validity extensions are kept in history."
      ] }
    ]
  },
  "new-po-po-register": {
    title: "PO Register",
    who: "Everyone in purchasing; auditors.",
    purpose: "Every purchase order, whatever created it — PO by PR, Direct PO or older flows — with column filters and a full detail view.",
    blocks: [
      { steps: ["Open Purchase → Purchase Orders → PO Register.", "Narrow the list with the column filters.", "Open a PO to see its lines, allocations, receipts and status.", "Print a PO, or cancel a PR-based PO when allowed."] },
      { rules: [
        "Figures are read from the database on every refresh.",
        "A PO cannot be cancelled once any goods have been received against it. Cancelling a PR-based PO releases its quantity back to the PR lines in one transaction.",
        "A PO that is already cancelled cannot be cancelled again (a retry releases nothing twice)."
      ] }
    ]
  },
  grn: {
    title: "GRN (Goods Receipt Note)",
    who: "Stores receive; quality records accepted and rejected quantity.",
    purpose: "Record the goods that arrive against a purchase order.",
    blocks: [
      { steps: [
        "Open Purchase → GRN and choose a PO that is pending receipt.",
        "Enter the vendor challan number and date (mandatory), the vendor invoice number if attached, vehicle / transporter, receiving store location and the person who received it.",
        "For each line enter the received quantity and split it into accepted, rejected and pending inspection.",
        "Save as draft, or post the GRN."
      ] },
      { rules: [
        "Received = accepted + rejected + pending inspection, on every line.",
        "Only accepted quantity fulfils the PO, moves its status and is attributed to the PR lines it was ordered for. Rejected goods are retained and shown on the reports, but never count as delivered.",
        "You cannot accept more than the PO quantity still open (0% tolerance).",
        "A posted GRN can never be edited, deleted or posted again.",
        "The same PO and vendor challan cannot be posted twice.",
        "When every line is fully accepted the PO becomes COMPLETED; otherwise PARTIALLY RECEIVED."
      ] },
      { flow: "grn-post" }
    ]
  },
  "new-po-tracking": {
    title: "PR Tracking",
    who: "Buyers, departments, managers.",
    purpose: "Follow a requisition from request to receipt: what was ordered, from whom, and what has arrived.",
    blocks: [
      { list: ["Search by PR, item or vendor; filter any column.", "Each PR line shows requested, reserved in drafts, ordered, received (accepted) and pending.", "Open the activity trail to see who did each step and when."] },
      { rules: ["Lines ordered through older flows without allocations are shown as 'ordered, untracked' — never as completed."] }
    ]
  },
  "new-po-report-po-vs-pr": {
    title: "PR vs PO Report",
    who: "Purchasing, management.",
    purpose: "Compares what each PR requested with what has been ordered, line by line and as an item summary over a PR date range.",
    blocks: [{ list: ["Read-only: every figure comes from the server; nothing is computed in the browser.", "Export the rows on screen for further analysis."] }]
  },
  "new-po-report-po-vs-pr-grn": {
    title: "PR vs PO vs MRN/GRN Report",
    who: "Purchasing, stores, management.",
    purpose: "Three-way view of requested, ordered and received (accepted and rejected) quantity for every PR line.",
    blocks: [{ list: ["Shows accepted and rejected receipts separately; rejected goods are marked as retained, not returned.", "Read-only."] }]
  },
  "new-po-reconciliation": {
    title: "Legacy Reconciliation",
    who: "Purchasing administrators, auditors.",
    purpose: "Lists records from before PR-to-PO allocation tracking existed, so they can be reviewed.",
    blocks: [
      { list: ["POs without allocations (with or without a PR number).", "Posted receipts not attributed to any PR line.", "PR quantity ordered without an explaining allocation."] },
      { rules: ["The report only identifies; it never creates links or changes data."] }
    ]
  },
  rfq: {
    title: "RFQ (Request for Quotation)",
    who: "Buyers.",
    purpose: "Invite selected vendors to quote for a PR's items and capture their bids side by side.",
    blocks: [
      { steps: [
        "Open Purchase → RFQ and create an RFQ: RFQ number, issue date, submission due date, the PR it refers to, inquiry title and department.",
        "Select the suppliers to invite.",
        "Record each vendor's bid: quoted basic rate, vendor quote reference, discount %, GST %, lead time and commercial remarks.",
        "Compare the bids and continue to Quotations for evaluation and approval."
      ] }
    ]
  },
  "vendor-quotations": {
    title: "Quotations (Vendor Quotations)",
    who: "Buyers prepare; approvers approve or reject.",
    purpose: "Evaluate vendor quotations for an item: compare prices and terms, keep revisions, and record the decision.",
    blocks: [
      { list: [
        "Each quotation records the item, required quantity, vendor quote reference, contact, payment terms, delivery time and location, remarks / evaluation notes and the original quotation document.",
        "Comparison: see competing quotations for the same item together, with the effective unit cost.",
        "Revisions: a revised quotation is a new revision linked to the original; the latest is marked and older revisions stay in history.",
        "Approval: approve, or reject with a reason. Comments and history are kept per quotation."
      ] }
    ]
  },
  "job-work-dashboard": {
    title: "Job Work — Home",
    who: "Everyone involved in job work.",
    purpose: "Overview of all job work: orders by status, actions needed, material with job workers, quality figures and costs.",
    blocks: [
      { p: "Job work means sending your material to an outside processor (a job worker) — CNC, grinding, coating, heat treatment and more — and receiving it back. Every movement is recorded in the job worker stock ledger, so you always know how much material each worker holds." },
      { list: [
        "Cards: orders by status (click to open the filtered register), action needed (approvals, overdue orders, open challans, receipts awaiting inspection), material and quality (with workers, rejected, rework, scrap).",
        "Cost tables by job worker, department and item, and turnaround (average days from challan to receipt)."
      ] },
      { warn: "Store stock is not checked by job work today, because there is no inventory engine yet. Job-worker balances come from the job work ledger." },
      { flow: "job-work" }
    ]
  },
  "job-work-indents": {
    title: "Job Work — 1 · Indents",
    who: "Departments raise; approvers approve.",
    purpose: "A department's request to outsource processing.",
    blocks: [
      { steps: ["New indent: requesting department, source store, reason for outsourcing (required), dates, optional references and estimated cost.", "Add lines: item, stock category, operation and quantity.", "Save and submit; an approver approves or rejects (with a reason)."] },
      { rules: ["Zero or negative quantities, the same item and operation twice, a missing reason, department or store are refused.", "The requester cannot approve their own indent (ADMIN excepted). Rejected indents can be edited and resubmitted."] }
    ]
  },
  "job-work-orders": {
    title: "Job Work — 2 · Job Work Orders",
    who: "Creators draft; approvers approve.",
    purpose: "The agreed order with a job worker; dispatch and receipt are started from it.",
    blocks: [
      { steps: ["Create from an approved indent (lines are copied) or as a direct order.", "Choose the job worker, source store, department, dates, terms and quality specifications.", "Save and submit; an approver approves."] },
      { rules: [
        "The rate is never typed: it comes from the worker's active rate contract for that operation and category on the order date, and approval re-checks it.",
        "Quantity sent cannot exceed the indent quantity across all live orders.",
        "The creator cannot approve their own order (ADMIN excepted). Approved orders cannot be edited — cancel (only if nothing was dispatched) and re-create.",
        "An approval limit on estimated charges can be configured (job-work.approval-limit)."
      ] }
    ]
  },
  "job-work-send": {
    title: "Job Work — 3 · Send Material",
    who: "Stores.",
    purpose: "Dispatch material to the job worker on a challan.",
    blocks: [
      { steps: ["Open an approved order → Dispatch material.", "Enter challan date, authorised by (required), transporter, vehicle, optional e-way bill number, purpose and remarks.", "Enter the quantity to send per line (tick 'Re-dispatch rework material' to send rework back out).", "Post the challan (JWC-…). Print it from the order's challan table."] },
      { rules: ["A dispatch cannot exceed the approved balance still to send, or the rework still pending for a rework dispatch.", "Posting the same challan twice (for example after a network hiccup) never moves material twice.", "A challan can be reversed by an approver only while no receipt is recorded against it."] }
    ]
  },
  "job-work-receive": {
    title: "Job Work — 4 · Receive Material",
    who: "Stores.",
    purpose: "Record material coming back from the job worker.",
    blocks: [
      { steps: ["Open the order → Record receipt.", "Enter receipt date, the worker's delivery note number and optionally the challan.", "Per line enter processed quantity back and unused raw material back. The form shows what the worker holds right now.", "Record the receipt; processed material waits for inspection."] },
      { rules: ["You cannot receive more than the worker holds.", "Partial receipts are normal (send 10, receive 4, then 6).", "Resubmitting the same receipt form does not create a second receipt."] }
    ]
  },
  "job-work-receipts": {
    title: "Job Work — 5 · Inspection",
    who: "Quality.",
    purpose: "Inspect returned material and decide where every piece goes.",
    blocks: [
      { steps: ["Open Receipts & Inspection → the receipt.", "For each pending line enter Accepted, Rejected, Rework and Scrap, with a defect code whenever rejected, rework or scrap is above zero."] },
      { rules: ["Accepted + rejected + rework + scrap must equal the quantity received — nothing is adjusted silently.", "A line is inspected once; further goods come on a new receipt.", "When all material is back and inspected (and no rework is pending), the order becomes Completed automatically."] }
    ]
  },
  "job-work-challans": {
    title: "Job Work — Challan Register",
    who: "Stores, auditors.",
    purpose: "Register of all dispatch challans with status, filters and search; click an order number to open the order.",
    blocks: [{ list: ["Challans are created from an order (Dispatch material), not from this register.", "Print or reverse (approver, before any receipt) from the order's challan table."] }]
  },
  "job-work-workers": {
    title: "Job Work — Job Workers",
    who: "Approvers onboard workers and manage rate contracts.",
    purpose: "The approved outside processors, their operations and rate contracts.",
    blocks: [
      { steps: ["Onboard job worker: pick an ACTIVE vendor from the Vendor Master (name, GSTIN, PAN and address are copied), tick approved operations, credit days, contacts and payment terms.", "Open the worker → Add rate contract: operation, item category (or all), rate basis (per piece / kg / batch / hour), rate, minimum quantity, effective and valid-until dates."] },
      { rules: ["One vendor = one job worker; a GSTIN cannot be used by two workers; a malformed GSTIN is refused.", "Two active contracts cannot overlap for the same worker, operation and category: revoke the old one, then add the new one.", "Workers can be set active, inactive or blocked (with a reason)."] }
    ]
  },
  "job-work-ledger": {
    title: "Job Work — Worker Stock Ledger",
    who: "Stores, purchasing, auditors.",
    purpose: "Every movement for every job worker, item and order: SENT, RECEIVED, RETURNED_UNUSED, REVERSED_SENT, with the balance held by the worker.",
    blocks: [{ rules: ["The balance with a worker can never go below zero — a bookkeeping error is detected immediately."] }, { list: ["Filter by job worker, search by item or reference, export to Excel."] }]
  },
  "job-work-recon": {
    title: "Job Work — Reconciliation & Scrap",
    who: "Approvers, stores, quality.",
    purpose: "Answers 'where is every piece now?' for every order, and handles scrap disposal, shortages and process losses.",
    blocks: [
      { list: [
        "Orders: dispatched, back processed, unused back, with worker, accepted, rejected, scrap, written off, allowed and excess loss per line.",
        "Adjustments & approvals: scrap disposal (to Scrap Yard), shortage write-off, process-loss write-off — each needs approval by someone other than the requester.",
        "Scrap register, alerts (overdue returns, unreconciled challans, pending rework, excess loss) and permissible-loss rules per operation and category."
      ] },
      { rules: ["An adjustment cannot exceed what is still available on the line.", "Nothing changes until an approval is given."] }
    ]
  },
  "job-work-reports": {
    title: "Job Work — Compliance & Reports",
    who: "Management, auditors, purchasing.",
    purpose: "Thirteen reports with date and worker filters, exported to Excel exactly as shown.",
    blocks: [{ list: ["Order register, challan register, challan-wise pending material, material outside factory, worker stock ledger, receipt register, quality rejection and rework, scrap and wastage, reconciliation adjustments, cost by item and operation, vendor rate comparison, worker turnaround, order transaction history."] }]
  },
  "job-work-operations": {
    title: "Job Work — Operations Master",
    who: "Approvers, master-data officers.",
    purpose: "The list of job work processes (CNC, machining, grinding, moulding, coating, heat treatment, finishing, turning, plating, …) that workers can be approved for and rated on.",
    blocks: [{ steps: ["Open Purchase → Job Work → Operations Master.", "Add or edit operations."] }]
  },

  // ============================================================ INVENTORY
  "item-wise-cb": {
    title: "Inventory — Items",
    who: "Stores.",
    purpose: "Item-wise closing balance.",
    blocks: [{ warn: "Not available yet. The earlier stock-movement screens were removed; inventory will return with a proper stock ledger. Purchase receipts (GRN) do not change stock today." }]
  },
  "dept-wise-cb": {
    title: "Inventory — Warehouses / Stock Ledger",
    who: "Stores.",
    purpose: "Department / warehouse-wise stock ledger.",
    blocks: [{ warn: "Not available yet — see Inventory → Items." }]
  },
  inventory: {
    title: "Inventory — Stock Receipt / Issue / Transfer",
    who: "Stores.",
    purpose: "Stock movements.",
    blocks: [{ warn: "Not available yet — see Inventory → Items." }]
  },

  // ============================================================ CRM, MAINTENANCE, SETTINGS
  "customer-master": {
    title: "Customers (Customer Master)",
    who: "Sales, accounts, master-data officers.",
    purpose: "Every customer with identity, tax, address, sales and accounts contacts and commercial terms.",
    blocks: [
      { table: { head: ["Area", "Fields"], rows: [
        ["Identity", "Code, Customer Name, Alias / Short Name, Customer ID, Company ID, Market Type, Category, Group, Status"],
        ["Tax", "GSTIN, PAN, GST Registration Type, State Code, Udyam Registration No., MSME Category"],
        ["Address", "Bill To address, Ship To address, Customer address, City, State, Country, Pincode, Domestic / Export"],
        ["Sales", "Sale Person, Sale Contact, Sale Email, Supplier Code of SMS, Billing Source"],
        ["Accounts", "Accounts person and contact, Credit Days, Credit Limit (₹), Currency, Payment Terms, Mode of Payment Reminder"],
        ["Checks", "Checked by Accounts, Checked by Sales"]
      ] } },
      { steps: ["Open CRM & Order Management → Customers.", "Add or open a customer, fill the tabs and save.", "Print the directory when needed. Deleting asks for confirmation."] }
    ]
  },
  "machine-master": {
    title: "Machines (Machine Master)",
    who: "Maintenance, production.",
    purpose: "Every machine in the plant.",
    blocks: [
      { table: { head: ["Field", "Meaning"], rows: [
        ["Machine Code (M/C No) / Serial #", "Identity"],
        ["Description, Make / Manufacturer, Capacity, Technical Specifications", "What the machine is"],
        ["Department, Location / Area", "Where it is"],
        ["Status, Remarks", "Operational state"]
      ] } },
      { steps: ["Open Maintenance → Machines.", "Add, edit or delete machines; print the directory."] }
    ]
  },
  "department-master": {
    title: "Departments (Department Master)",
    who: "Administrators.",
    purpose: "The plant's departments and stock locations, used on PRs, POs, job work and users.",
    blocks: [
      { table: { head: ["Field", "Meaning"], rows: [
        ["Unique Dept Number, Department Code, Department Name", "Identity"],
        ["Process Sequence, Category / Group", "Ordering and grouping"],
        ["Operational Status, Notes", "State and description"]
      ] } },
      { rules: ["Default departments and locations (Store, Rejection Store, External Job Work, Quality Hold, Scrap Yard, …) are created once per database. A department you rename or delete stays that way after restarts."] }
    ]
  },
  users: {
    title: "Users",
    who: "Administrators.",
    purpose: "Create and manage the people who sign in, and the roles they hold.",
    blocks: [
      { table: { head: ["Field", "Meaning"], rows: [
        ["Full Name, Email (login)", "Identity; the email is the sign-in name"],
        ["Temporary Password (min 8)", "The user must change it at first sign-in"],
        ["Role, Status", "What they can do; inactive users cannot sign in"],
        ["Department, Designation, Employee ID, Phone", "Profile"],
        ["Approval Limit (₹)", "The approval value recorded for this user"],
        ["Photo", "Profile photo shown in the header"]
      ] } },
      { steps: ["Open Settings → Users and create a user with a temporary password.", "Manage Roles: create your own roles (name and description).", "Open a user's access to adjust their permissions on Access Control.", "Reset a password (Set password) or deactivate / delete a user when needed."] },
      { rules: [
        "Passwords are bcrypt-hashed. If the administrator has configured a view key, a Super Admin can view a newly set password; the copy is encrypted in the database and never used for sign-in.",
        "A reset password is temporary: the user must set their own at next sign-in."
      ] }
    ]
  },
  rbac: {
    title: "Access Control (RBAC)",
    who: "Administrators.",
    purpose: "The permission grid for one user: modules down the side, actions across the top.",
    blocks: [
      { steps: ["Open Settings → Users, choose a user and open their access (or Settings → Access Control).", "Tick or untick permissions in the grid (View, Create, Edit, Delete, Submit, Approve, …).", "Use 'Reset to role' to return the user to their role's template.", "Save."] },
      { rules: ["Super Admin and Developer have full access and are not edited on this screen.", "The server applies changes on the user's very next request (it re-reads permissions every time); their menu updates the next time they load the app."] },
      { flow: "rbac-request" }
    ]
  }
};
