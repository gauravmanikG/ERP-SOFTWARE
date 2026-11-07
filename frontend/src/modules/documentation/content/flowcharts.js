// Flowcharts for the Documentation module, written in Mermaid (https://mermaid.js.org) and rendered in the browser.
// The User Guide links to these by id ({ flow: "<id>" }).
//
// KEEP THESE CURRENT: when a workflow, status or architecture changes, update its chart in the same change
// (see CLAUDE.md, "Documentation rule"). Quote labels that contain punctuation: A["label (text)"].

export const FLOW_GROUPS = [
  { id: "system", title: "System & engineering" },
  { id: "purchase", title: "Purchasing" },
  { id: "documents", title: "Document lifecycles" },
  { id: "other", title: "Job work & documentation" }
];

export const FLOWCHARTS = [
  // ------------------------------------------------------------------ system
  {
    id: "architecture",
    group: "system",
    title: "System architecture",
    description: "How a click in the browser becomes a safe change in the database, and what keeps the service alive.",
    code: `flowchart LR
  subgraph Browser["Browser (React + Vite)"]
    UI["ERP screens"] --> FW["fetch wrapper<br/>adds session token"]
  end
  FW -->|"HTTPS /api"| INT
  subgraph API["Spring Boot API :4000"]
    INT["Access interceptor<br/>session · status · permission"] --> CTL["REST controllers<br/>(exact list: Live System)"]
    CTL --> SVC["Services<br/>rules · locks · transactions"]
    SVC --> AUD["Activity trail<br/>who did what"]
  end
  SVC -->|"JDBC pool"| DB[("PostgreSQL<br/>schema.sql = single source of truth")]
  AUD --> DB
  subgraph OPS["Operations"]
    SUP["Supervisor + watchdog<br/>run.ps1 / Docker"] -.->|"GET /api/health/live"| CTL
    SUP -.->|"restart on exit or hang"| API
  end`
  },
  {
    id: "rbac-request",
    group: "system",
    title: "Security pipeline of every API request",
    description: "Every request passes these checks before any business code runs. The browser hides buttons, but this is the real lock.",
    code: `flowchart TD
  R["API request"] --> O{"Open endpoint?<br/>health · login · read settings"}
  O -->|yes| OK["Handled"]
  O -->|no| T{"Valid session token?"}
  T -->|no| E401["401 Sign in required"]
  T -->|yes| A{"Account active?"}
  A -->|no| E403a["403 Account is inactive"]
  A -->|yes| ACT["Record signed-in user on the request<br/>(actor for the audit trail)"]
  ACT --> P{"Temporary password<br/>not changed yet?"}
  P -->|yes| E403b["403 Change your temporary password first"]
  P -->|no| W{"Full-access role<br/>or a read request?"}
  W -->|yes| OK
  W -->|no| M{"Write matches a<br/>permission rule?"}
  M -->|no rule| E403c["403 Not permitted<br/>(deny by default)"]
  M -->|rule| H{"User holds the<br/>required permission?"}
  H -->|no| E403d["403 You do not have permission"]
  H -->|yes| OK`
  },
  {
    id: "restart-policy",
    group: "system",
    title: "Self-healing backend: supervisor and watchdog",
    description: "What backend/run.ps1 does, forever, until you stop it with stop-backend.ps1.",
    code: `flowchart TD
  S(["Supervisor starts"]) --> L{"Another supervisor<br/>already running?"}
  L -->|yes| X(["Exit: nothing to do"])
  L -->|no| PORT{"Port 4000 busy?"}
  PORT -->|"orphan of this app"| KILL["Stop the orphan<br/>and take over"] --> START
  PORT -->|"another program"| WAIT["Wait 30 s"] --> PORT
  PORT -->|free| START["Start API<br/>ExitOnOutOfMemoryError"]
  START --> CHK{"Every 15 s:<br/>/api/health/live answers?"}
  CHK -->|yes| CHK
  CHK -->|"no, during start-up grace"| CHK
  CHK -->|"3 failures in a row"| HUNG["Hung: stop the API"] --> DELAY
  START -->|"process exits<br/>(crash · OOM · killed)"| DELAY{"Was the run healthy?"}
  DELAY -->|yes| D10["Restart in 10 s"] --> PORT
  DELAY -->|"no: crash loop"| DBK["Back off: 20 s → 40 s → 60 s"] --> PORT`
  },
  {
    id: "startup",
    group: "system",
    title: "Safe start-up sequence",
    description: "Why restarting the backend can never reset or delete your data.",
    code: `flowchart TD
  A(["Backend starts"]) --> B["schema.sql<br/>CREATE … IF NOT EXISTS · ADD COLUMN IF NOT EXISTS<br/>no INSERT · UPDATE · DELETE · DROP"]
  B --> C["seed-data.sql<br/>default rows with a declared seed policy"]
  C --> D{"Seed key already<br/>in the seed registry?"}
  D -->|yes| SKIP["Skip — a deleted or renamed<br/>default stays that way"]
  D -->|no| INS["Insert once and record the key"]
  SKIP --> E
  INS --> E["One-time data migrations"]
  E --> F{"Already applied?"}
  F -->|yes| G{"Checksum unchanged?"}
  G -->|no| STOP(["Start-up stops:<br/>a shipped migration was edited"])
  G -->|yes| H
  F -->|no| RUN["Run once, record id + checksum"] --> H
  H["Hibernate validates entities against schema<br/>(never changes the schema)"] --> I(["API ready"])
  B -. "any failing statement" .-> STOP2(["Start-up stops — fail fast,<br/>nothing half-applied"])`
  },

  // ------------------------------------------------------------------ purchasing
  {
    id: "purchase-e2e",
    group: "purchase",
    title: "Complete purchase flow",
    description: "From a department's need to goods accepted at the store, and the reports that trace it.",
    code: `flowchart TD
  SM["Supplier Master<br/>vendor + items supplied"] --> VR["Vendor Rate Master<br/>price + effective date"]
  PR["Purchase Requisition<br/>Draft → Submit"] --> APP{"Approver"}
  APP -->|reject + reason| RJ["Rejected"]
  APP -->|approve| CD["Clubbed Demand<br/>approved quantity by item + unit"]
  VR --> CD
  CD -->|"assign: reserve quantity"| DR["Vendor Draft PO<br/>one open draft per vendor"]
  DR -->|release| CD
  DR -->|"convert: choose quantity now"| PO["Purchase Order<br/>PO by PR · APPROVED"]
  DPO["Direct PO<br/>no PR"] --> GRN
  PO --> GRN["GRN<br/>accepted · rejected · pending"]
  GRN -->|"accepted qty attributed"| PRL["PR lines<br/>received"]
  GRN --> ST{"All accepted?"}
  ST -->|yes| COMP["PO COMPLETED"]
  ST -->|no| PART["PO PARTIALLY RECEIVED"]
  PRL --> REP["Reports<br/>Tracking · PR vs PO · PR vs PO vs GRN"]
  PR -. "Capital Goods PR" .-> CAP["Capital PO"]
  PR -. "Service PR" .-> SPO["Service PO"]`
  },
  {
    id: "sourcing",
    group: "purchase",
    title: "How Clubbed Demand chooses vendors",
    description: "Which vendors are offered for an item, and which one is recommended.",
    code: `flowchart TD
  I["Approved PR quantity for an item<br/>(requested − ordered − in drafts > 0)"] --> V["Candidate vendors"]
  V --> L1["Linked to the item<br/>in the Supplier Master"]
  V --> L2["Has any rate for the item<br/>in the Vendor Rate Master"]
  L1 --> U["Union of both"]
  L2 --> U
  U --> ACT{"Vendor ACTIVE?"}
  ACT -->|no| HIDE["Not offered"]
  ACT -->|yes| RATE{"Rate effective today?"}
  RATE -->|no| SHOW["Shown greyed:<br/>'No vendor rate'"]
  RATE -->|yes| SORT["Sorted cheapest first"]
  SORT --> REC["Cheapest = ★ recommended"]
  REC --> ASG["Assign → reserve PR quantity<br/>in that vendor's open draft"]`
  },
  {
    id: "draft-to-po",
    group: "purchase",
    title: "Convert a vendor draft into a PO (one transaction)",
    description: "Everything below happens in one database transaction: all of it, or none of it.",
    code: `sequenceDiagram
  actor Buyer
  participant UI as Convert screen
  participant API as Sourcing service
  participant DB as PostgreSQL
  Buyer->>UI: choose quantity per PR allocation
  UI->>API: POST /drafts/{draft}/convert
  API->>DB: BEGIN
  API->>DB: lock draft row, then draft lines, then PR lines (fixed order)
  API->>API: validate quantities, vendor, rates, HSN / GST
  API->>DB: insert PO (number PO-YEAR-NNNNN), allocations, terms, schedules
  API->>DB: move qty: draft reserved → PR ordered
  API->>DB: recalculate PR status (Partially / Fully Ordered)
  API->>DB: write activity trail (signed-in user)
  API->>DB: COMMIT
  API-->>UI: PO created
  Note over API,DB: any failure → ROLLBACK, nothing changes`
  },
  {
    id: "grn-post",
    group: "purchase",
    title: "Posting a GRN",
    description: "The checks applied when goods are received against a PO.",
    code: `flowchart TD
  A["Post GRN against a PO"] --> B{"GRN already posted?"}
  B -->|yes| X1["409 — a posted GRN is final"]
  B -->|no| C{"Same PO + vendor challan<br/>already posted?"}
  C -->|yes| X2["409 — duplicate receipt"]
  C -->|no| D["Lock PO row"]
  D --> E{"Each line:<br/>received = accepted + rejected + pending?"}
  E -->|no| X3["400 — quantities do not add up"]
  E -->|yes| F{"Accepted ≤ open PO quantity?"}
  F -->|no| X4["409 — over-acceptance refused"]
  F -->|yes| G["Attribute accepted qty<br/>to PR allocations"]
  G --> H["Update delivery schedules"]
  H --> I{"Every line fully accepted?"}
  I -->|yes| J["PO COMPLETED"]
  I -->|no| K["PO PARTIALLY RECEIVED"]`
  },
  {
    id: "quantity-model",
    group: "purchase",
    title: "The quantity model of a PR line",
    description: "One set of definitions used by every screen and report.",
    code: `flowchart LR
  REQ["Requested<br/>req_qty"] --> AV["Available to source<br/>= requested − ordered − in drafts"]
  REQ --> ORD["Ordered (reserved on POs)<br/>ordered_qty"]
  REQ --> DRF["In vendor drafts<br/>drafted_qty"]
  ORD --> REC["Received (accepted)<br/>from posted GRNs"]
  ORD --> PEN["Pending receipt<br/>= ordered − received"]
  DRF -->|convert| ORD
  DRF -->|release| AV
  ORD -->|"PO cancelled"| AV`
  },

  // ------------------------------------------------------------------ document lifecycles
  {
    id: "pr-lifecycle",
    group: "documents",
    title: "Purchase Requisition lifecycle",
    description: "Statuses a PR moves through.",
    code: `stateDiagram-v2
  [*] --> Draft
  Draft --> PendingApproval: submit
  PendingApproval --> Approved: approve
  PendingApproval --> Rejected: reject (reason)
  Rejected --> PendingApproval: edit and resubmit
  Approved --> PartiallyOrdered: some quantity on POs
  PartiallyOrdered --> FullyOrdered: all quantity ordered
  Approved --> FullyOrdered: everything ordered at once
  FullyOrdered --> PartiallyOrdered: PO cancelled
  Draft --> Cancelled: cancel
  PendingApproval --> Cancelled: cancel
  Approved --> Cancelled: cancel
  Rejected --> Cancelled: cancel
  PendingApproval: Pending Approval
  PartiallyOrdered: Partially Ordered
  FullyOrdered: Fully Ordered`
  },
  {
    id: "po-lifecycle",
    group: "documents",
    title: "Purchase Order lifecycle (PO by PR / Direct PO)",
    description: "Statuses of standard purchase orders.",
    code: `stateDiagram-v2
  [*] --> APPROVED: created (by the signed-in buyer)
  APPROVED --> PARTIALLY_RECEIVED: GRN posted, some accepted
  PARTIALLY_RECEIVED --> COMPLETED: everything accepted
  APPROVED --> COMPLETED: everything accepted at once
  APPROVED --> CANCELLED: cancel (only before any receipt)
  note right of CANCELLED: cancelling releases the quantity back to the PR lines`
  },
  {
    id: "capital-po",
    group: "documents",
    title: "Capital PO lifecycle",
    description: "The PO status, plus the separate progress tracks that run once it is sent to the vendor.",
    code: `stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> PENDING_APPROVAL: submit
  REJECTED --> PENDING_APPROVAL: edit and resubmit
  PENDING_APPROVAL --> APPROVED: approve (not by its creator)
  PENDING_APPROVAL --> REJECTED: reject
  APPROVED --> SENT_TO_VENDOR: issue
  SENT_TO_VENDOR --> CLOSED: close
  DRAFT --> CANCELLED: cancel
  PENDING_APPROVAL --> CANCELLED: cancel
  REJECTED --> CANCELLED: cancel
  APPROVED --> CANCELLED: cancel
  SENT_TO_VENDOR --> CANCELLED: cancel (nothing received)
  state SENT_TO_VENDOR {
    [*] --> Receipt
    Receipt: Receipt NOT → PARTIALLY → FULLY_RECEIVED
    Receipt --> Install
    Install: Installation / Commissioning IN_PROGRESS → COMPLETED
    Install --> Assets
    Assets: Asset registration in the asset register
  }`
  },
  {
    id: "service-po",
    group: "documents",
    title: "Service PO lifecycle",
    description: "From preparation to accepted service and closure.",
    code: `stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> PENDING_APPROVAL: submit
  PENDING_APPROVAL --> APPROVED: approve (within approval limit)
  PENDING_APPROVAL --> DRAFT: reject (back for correction)
  APPROVED --> ISSUED: issue to vendor
  ISSUED --> PARTIALLY_FULFILLED: acceptance recorded
  PARTIALLY_FULFILLED --> FULFILLED: all scheduled work accepted
  ISSUED --> FULFILLED: all accepted at once
  APPROVED --> ON_HOLD: hold
  ISSUED --> ON_HOLD: hold
  PARTIALLY_FULFILLED --> ON_HOLD: hold
  ON_HOLD --> ISSUED: release (returns to previous status)
  ISSUED --> CLOSED: close
  PARTIALLY_FULFILLED --> CLOSED: close
  FULFILLED --> CLOSED: close
  DRAFT --> CANCELLED: cancel (nothing accepted)
  ISSUED --> CANCELLED: cancel (nothing accepted)
  note right of ISSUED: amendments keep the status and are recorded as revisions`
  },

  // ------------------------------------------------------------------ job work & docs
  {
    id: "job-work",
    group: "other",
    title: "Job work: material out and back",
    description: "From indent to closed order, with rework loops.",
    code: `flowchart TD
  IND["Indent<br/>department request"] -->|approve| JWO["Job Work Order<br/>rate from active contract"]
  JWO -->|approve| CH["Challan: dispatch<br/>material with job worker"]
  CH --> RC["Receipt<br/>processed back · unused back"]
  RC --> QH["Waiting for inspection"]
  QH --> INSP{"Inspection<br/>accepted + rejected + rework + scrap = received"}
  INSP -->|accepted| STORE["Back to store"]
  INSP -->|rejected / scrap| REJ["Rejection store"]
  INSP -->|rework| RW["Rework"]
  RW -->|re-dispatch| CH
  REJ -->|"approved disposal"| SY["Scrap yard"]
  STORE --> DONE{"All back and inspected?"}
  DONE -->|yes| COMP["Order COMPLETED"] -->|approver| CLOSE["Closed"]`
  },
  {
    id: "docs-update",
    group: "other",
    title: "How this documentation stays current",
    description: "Three mechanisms keep the docs in step with the software.",
    code: `flowchart LR
  subgraph AUTO["Generated from the system (always exact)"]
    NAV["Navigation menu"] --> CAT["Screen catalog<br/>+ 'Not documented yet' flags"]
    SPR["Spring endpoints · DB tables ·<br/>permissions · migrations"] --> LIVE["Live system page<br/>GET /api/docs/system"]
    GIT["git history"] --> NEW["What's new<br/>refreshes on every commit"]
  end
  subgraph RULE["Written content (kept current by rule)"]
    CH["Every code change"] --> CMD["CLAUDE.md documentation rule<br/>+ editor hook reminder"]
    CMD --> CNT["guide.js · backend.js · flowcharts.js<br/>updated in the same change"]
    CNT --> CHK["npm run docs:check<br/>fails if a screen has no guide entry"]
  end`
  }
];
