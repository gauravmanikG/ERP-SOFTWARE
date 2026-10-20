// End-to-end checks for PO by PR against the TEST database copy (sms_seals_test) on port 4100.
// Every check reads the API response and, where it matters, the PostgreSQL rows that the API should have written.
const { execFileSync } = require("child_process");

const BASE = process.env.E2E_BASE || "http://localhost:4100";
const USER = { "X-User-Name": "e2e-tester", "X-User-Role": "CREATOR", "Content-Type": "application/json" };
const PSQL = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const DB = "sms_seals_test";
const POS_DATE = "2026-10-19";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
};

function sql(query) {
  return execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", DB, "-At", "-c", query], {
    env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8"
  }).trim();
}

async function call(method, path, body, headers = USER) {
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: res.status, data };
}

const num = (v) => Number(v);
const close = (a, b) => Math.abs(num(a) - num(b)) < 0.005;

async function createPo(lines, mode, poDate = POS_DATE, vendorCode = "SUP-002") {
  return call("POST", "/api/new-po/pr/purchase-orders", { vendorCode, poDate, mode, lines });
}

(async () => {
  // ------------------------------------------------------------ 0. rates used by the scenarios
  for (const [itemId, price, eff] of [[1611, 100, "2026-10-01"], [1612, 50, "2026-10-01"], [1613, 50, "2026-10-01"],
    [1614, 50, "2026-10-01"], [1615, 50, "2026-10-01"], [1616, 50, "2026-10-01"], [1617, 50, "2026-10-01"], [1601, 40, "2026-10-01"]]) {
    const r = await call("POST", "/api/new-po/vendor-rates", { supplierCode: "SUP-002", itemId, offeredUnitPrice: price, effectiveFrom: eff });
    if (r.status !== 201) check(`setup rate item ${itemId}`, false, JSON.stringify(r.data));
  }
  check("setup: rates created", true);

  // ------------------------------------------------------------ 1. eligibility
  const items = await call("GET", "/api/new-po/pr/eligible-items?q=CON01-0001");
  check("eligible items lists CON01-0001 with its PR count", items.status === 200 && items.data.length === 1 && num(items.data[0].pr_count) === 4,
    `pr_count=${items.data[0] && items.data[0].pr_count}`);
  const fullyOrderedVisible = await call("GET", "/api/new-po/pr/eligible-items?q=BOLT-HEX-M10");
  check("fully ordered PR line (BOLT-HEX-M10 on PR-23) is not offered", fullyOrderedVisible.data.length === 0, JSON.stringify(fullyOrderedVisible.data));
  const draftItem = await call("GET", "/api/new-po/pr/eligible-items?q=METAL-SHELL-01");
  check("line on a Draft PR (METAL-SHELL-01) is not offered", draftItem.data.length === 0);

  const lines = await call("GET", `/api/new-po/pr/eligible-lines?itemCode=CON01-0001&vendorCode=SUP-002&poDate=${POS_DATE}`);
  check("eligible lines: 4 PR lines for CON01-0001", lines.status === 200 && lines.data.length === 4, `count=${lines.data.length}`);
  check("eligible lines carry the vendor rate on the PO date", lines.data.every((l) => num(l.unitPrice) === 100),
    lines.data.map((l) => l.unitPrice).join(","));

  // ------------------------------------------------------------ 2. future-dated rate not applied early
  const future = await call("POST", "/api/new-po/vendor-rates", { supplierCode: "SUP-002", itemId: 1611, offeredUnitPrice: 120, effectiveFrom: "2026-12-01" });
  check("future-dated rate 120 saved", future.status === 201);
  const early = await call("GET", `/api/new-po/pr/eligible-lines?itemCode=CON01-0001&vendorCode=SUP-002&poDate=${POS_DATE}`);
  check("rate on 2026-10-19 stays 100 while 120 is future-dated", early.data.every((l) => num(l.unitPrice) === 100));
  const later = await call("GET", "/api/new-po/pr/eligible-lines?itemCode=CON01-0001&vendorCode=SUP-002&poDate=2026-12-02");
  check("rate on 2026-12-02 becomes 120", later.data.length > 0 && later.data.every((l) => num(l.unitPrice) === 120));

  // ------------------------------------------------------------ 3. full order, two items, one PO
  const before142 = sql("SELECT ordered_qty FROM purchase_requisition_items WHERE id = 142");
  const po1 = await createPo([{ prItemId: 142 }, { prItemId: 143 }], "FULL");
  check("full PO on two PR lines (142, 143) saved", po1.status === 201, JSON.stringify(po1.data).slice(0, 200));
  const po1No = po1.data && po1.data.poNumber;
  // taxable 20*100 + 20*50 = 3000; IGST 18% = 540; total 3540 (vendor SUP-002 is state 06, so IGST)
  check("PO1 taxable amount is 3000", po1.status === 201 && close(po1.data.po.taxableAmount, 3000), po1.data.po && po1.data.po.taxableAmount);
  check("PO1 total GST is 540 (18% IGST)", po1.status === 201 && close(po1.data.po.totalTax, 540), po1.data.po && po1.data.po.totalTax);
  check("PO1 grand total is 3540", po1.status === 201 && close(po1.data.po.grandTotal, 3540), po1.data.po && po1.data.po.grandTotal);
  if (po1No) {
    check("PO1 header row persisted in purchase_orders", sql(`SELECT COUNT(*) FROM purchase_orders WHERE po_number='${po1No}' AND status='APPROVED' AND vendor_code='SUP-002'`) === "1");
    check("PO1 details_json has 2 item lines", sql(`SELECT json_array_length(details_json::json) FROM purchase_orders WHERE po_number='${po1No}'`) === "2");
    check("PO1 has 2 allocation rows in po_pr_allocations", sql(`SELECT COUNT(*) FROM po_pr_allocations WHERE po_number='${po1No}'`) === "2");
  }
  check("PR line 142 ordered_qty = 20 in purchase_requisition_items", sql("SELECT ordered_qty FROM purchase_requisition_items WHERE id=142") === "20.00", `was ${before142}`);
  check("PR-2026-00031 status becomes Partially Ordered", sql("SELECT status FROM purchase_requisitions WHERE pr_number='PR-2026-00031'") === "Partially Ordered");
  const po1Lookup = await call("GET", "/api/purchase/orders");
  check("existing PO list (in-memory cache) shows the new PO", Array.isArray(po1Lookup.data) && po1Lookup.data.some((p) => p.poNumber === po1No),
    `po=${po1No}`);

  // ------------------------------------------------------------ 4. refusals
  const again = await createPo([{ prItemId: 142 }], "FULL");
  check("ordering the same PR line again is refused (409)", again.status === 409 && /fully ordered/.test(again.data.error), again.data.error);
  const over = await createPo([{ prItemId: 150, quantity: 35 }], "PARTIAL");
  check("partial quantity above remaining is refused (409)", over.status === 409 && /exceeds the remaining/.test(over.data.error), over.data.error);
  const draft = await call("POST", "/api/new-po/pr/preview", { vendorCode: "SUP-002", poDate: POS_DATE, mode: "FULL", lines: [{ prItemId: 141 }] });
  check("line on a Draft PR is refused (409)", draft.status === 409 && /Draft/.test(draft.data.error), draft.data.error);
  const noRate = await call("POST", "/api/new-po/pr/preview", { vendorCode: "SUP-002", poDate: "2026-09-01", mode: "FULL", lines: [{ prItemId: 144 }] });
  check("no effective rate on 2026-09-01 is refused (422)", noRate.status === 422 && /No vendor rate/.test(noRate.data.error), noRate.data.error);
  const noActor = await call("POST", "/api/new-po/pr/purchase-orders", { vendorCode: "SUP-002", poDate: POS_DATE, mode: "FULL", lines: [{ prItemId: 144 }] }, { "Content-Type": "application/json" });
  check("create without X-User-Name is refused (401)", noActor.status === 401);
  const badMode = await createPo([{ prItemId: 144 }], "SOMETIMES");
  check("invalid mode is refused (400)", badMode.status === 400);
  const dup = await createPo([{ prItemId: 144 }, { prItemId: 144 }], "FULL");
  check("same PR line twice in one request is refused (400)", dup.status === 400);

  // ------------------------------------------------------------ 5. partial, repeat order on one PR line
  const po2 = await createPo([{ prItemId: 150, quantity: 10 }], "PARTIAL");
  check("partial PO2 on PR-32 line 150 qty 10", po2.status === 201, po2.data.error || "");
  check("PO2 grand total 1180 (1000 + 18%)", po2.status === 201 && close(po2.data.po.grandTotal, 1180), po2.data.po && po2.data.po.grandTotal);
  check("PR-32 status Partially Ordered after 10 of 30", sql("SELECT status FROM purchase_requisitions WHERE pr_number='PR-2026-00032'") === "Partially Ordered");
  const po4 = await createPo([{ prItemId: 150, quantity: 20 }], "PARTIAL");
  check("second PO against the same PR line (qty 20) saved", po4.status === 201, po4.data.error || "");
  check("PR-32 becomes Fully Ordered after two POs total 30", sql("SELECT status FROM purchase_requisitions WHERE pr_number='PR-2026-00032'") === "Fully Ordered");

  // ------------------------------------------------------------ 6. one PO: two PRs for one item + another item
  const po5 = await createPo([{ prItemId: 151, quantity: 10 }, { prItemId: 152, quantity: 100 }, { prItemId: 132, quantity: 4 }], "PARTIAL");
  check("PO5 with two PRs for CON01-0001 and STEEL-ROD-01 saved", po5.status === 201, po5.data.error || "");
  // CON01-0001 110 * 100 = 11000 at 18%; STEEL-ROD-01 4 * 40 = 160 at 5%
  check("PO5 taxable is 11160", po5.status === 201 && close(po5.data.po.taxableAmount, 11160), po5.data.po && po5.data.po.taxableAmount);
  check("PO5 GST is 1988 (18% of 11000 + 5% of 160)", po5.status === 201 && close(po5.data.po.totalTax, 1988), po5.data.po && po5.data.po.totalTax);
  if (po5.data && po5.data.poNumber) {
    const pn = po5.data.poNumber;
    check("PO5 has one consolidated line per item (2 lines, CON01-0001 qty 110)",
      sql(`SELECT details_json::json->0->>'quantity' FROM purchase_orders WHERE po_number='${pn}' AND details_json::json->0->>'itemCode'='CON01-0001'`) === "110" ||
      sql(`SELECT details_json::json->1->>'quantity' FROM purchase_orders WHERE po_number='${pn}' AND details_json::json->1->>'itemCode'='CON01-0001'`) === "110");
    check("PO5 keeps three allocation rows (three PR lines)", sql(`SELECT COUNT(*) FROM po_pr_allocations WHERE po_number='${pn}'`) === "3");
    check("PO5 CON01-0001 allocations span two PRs", sql(`SELECT COUNT(DISTINCT pr_number) FROM po_pr_allocations WHERE po_number='${pn}' AND item_code='CON01-0001'`) === "2");
  }

  // ------------------------------------------------------------ 7. concurrency
  const raceFull = await Promise.all(Array.from({ length: 5 }, () => createPo([{ prItemId: 146 }], "FULL")));
  const wins = raceFull.filter((r) => r.status === 201).length;
  check("5 parallel full orders on one PR line: exactly one succeeds", wins === 1, raceFull.map((r) => r.status).join(","));
  check("PR line 146 ordered exactly 20 after the race", sql("SELECT ordered_qty FROM purchase_requisition_items WHERE id=146") === "20.00");

  const racePartial = await Promise.all(Array.from({ length: 3 }, () => createPo([{ prItemId: 147, quantity: 15 }], "PARTIAL")));
  const pWins = racePartial.filter((r) => r.status === 201).length;
  check("3 parallel partial orders of 15 on a line of 20: exactly one succeeds", pWins === 1, racePartial.map((r) => r.status).join(","));
  check("PR line 147 ordered exactly 15 after the race", sql("SELECT ordered_qty FROM purchase_requisition_items WHERE id=147") === "15.00");
  check("no PR line ever exceeds its requested quantity",
    sql("SELECT COUNT(*) FROM purchase_requisition_items WHERE ordered_qty > req_qty AND id IN (142,143,146,147,150,151,152,132)") === "0");

  // ------------------------------------------------------------ 8. receipts through the existing GRN workflow
  const grnBody = (po, rows) => ({
    grnDate: POS_DATE, poNumber: po, poDate: POS_DATE, vendorCode: "SUP-002", vendorName: "A.V.SALES CORPORATION",
    vendorChallanNo: "CH-E2E-" + Math.floor(Math.random() * 1e6), storeLocation: "Main Store", receivedBy: "e2e-tester",
    items: rows.map((r) => ({ itemCode: r.itemCode, itemName: r.itemCode, uom: "PCS", poOrderedQty: r.ordered, challanQty: r.qty, receivedQty: r.qty, acceptedQty: r.qty, rejectedQty: 0, unitRate: r.rate, taxPercent: 18 }))
  });
  if (po1No) {
    const g1 = await call("POST", "/api/purchase/grn?post=true", grnBody(po1No, [{ itemCode: "CON01-0001", ordered: 20, qty: 15, rate: 100 }]));
    check("GRN 1 (15 of CON01-0001) posted through existing GRN API", g1.status === 201, JSON.stringify(g1.data).slice(0, 200));
    const st1 = await call("GET", "/api/new-po/pr/prs/PR-2026-00031/lines");
    const l142 = st1.data.find((l) => l.prItemId === 142);
    const l143 = st1.data.find((l) => l.prItemId === 143);
    check("after GRN 1: PR line 142 received 15 of 20 ordered", l142 && close(l142.receivedQty, 15) && l142.receivingStatus === "PARTIALLY_RECEIVED",
      l142 && `${l142.receivedQty} ${l142.receivingStatus}`);
    check("after GRN 1: PR line 142 pending receipt 5", l142 && close(l142.pendingReceiptQty, 5), l142 && l142.pendingReceiptQty);
    check("PR line 143 has no receipt yet (not in GRN 1)", l143 && close(l143.receivedQty, 0) && l143.receivingStatus === "NOT_RECEIVED");
    check("PR line 142 ordering status FULLY_ORDERED while receiving is partial", l142 && l142.orderingStatus === "FULLY_ORDERED");

    const g2 = await call("POST", "/api/purchase/grn?post=true", grnBody(po1No, [{ itemCode: "CON01-0001", ordered: 20, qty: 5, rate: 100 }, { itemCode: "CON01-0002", ordered: 20, qty: 20, rate: 50 }]));
    check("GRN 2 (completes PO1) posted", g2.status === 201, JSON.stringify(g2.data).slice(0, 200));
    const st2 = await call("GET", "/api/new-po/pr/prs/PR-2026-00031/lines");
    const m142 = st2.data.find((l) => l.prItemId === 142);
    const m143 = st2.data.find((l) => l.prItemId === 143);
    check("after GRN 2: PR line 142 fully received (20)", m142 && close(m142.receivedQty, 20) && m142.receivingStatus === "FULLY_RECEIVED");
    check("after GRN 2: PR line 143 fully received (20)", m143 && close(m143.receivedQty, 20) && m143.receivingStatus === "FULLY_RECEIVED");
    check("PO1 status is closed by GRN (COMPLETED)", sql(`SELECT status FROM purchase_orders WHERE po_number='${po1No}'`) === "COMPLETED", sql(`SELECT status FROM purchase_orders WHERE po_number='${po1No}'`));
    check("PR-2026-00031 stays open after PO1 is closed (other lines not ordered)",
      sql("SELECT status FROM purchase_requisitions WHERE pr_number='PR-2026-00031'") === "Partially Ordered");
  }

  // ------------------------------------------------------------ persistence, origin and guards
  if (po1No) {
    // Manual refresh = a fresh request to the backend: the status must come from purchase_orders.
    const listed = await call("GET", "/api/purchase/orders");
    const fromCache = listed.data.find((p) => p.poNumber === po1No);
    check("existing PO list shows PO1 as COMPLETED after GRN", fromCache && fromCache.status === "COMPLETED", fromCache && fromCache.status);
    const byPr = await call("GET", "/api/new-po/pr/purchase-orders");
    const row = byPr.data.find((p) => p.po_number === po1No);
    check("PO-by-PR list (read from the database) shows PO1 COMPLETED", row && row.status === "COMPLETED", row && row.status);
    const detail = await call("GET", `/api/new-po/pr/purchase-orders/${po1No}`);
    check("PO1 detail origin is PO_BY_PR", detail.data.origin === "PO_BY_PR", detail.data.origin);
    const d142 = detail.data.allocations.find((a) => a.pr_item_id === 142);
    check("PO1 detail attributes 20 received to PR line 142", d142 && close(d142.receivedQty, 20), d142 && d142.receivedQty);
    const legacy = sql("SELECT p.po_number FROM purchase_orders p WHERE NOT EXISTS (SELECT 1 FROM po_pr_allocations a WHERE a.po_number = p.po_number) ORDER BY p.created_at LIMIT 1");
    const legacyDetail = await call("GET", `/api/new-po/pr/purchase-orders/${legacy}`);
    check("a pre-existing PO is identified as LEGACY", legacyDetail.data.origin === "LEGACY" && legacyDetail.data.allocations.length === 0, legacy);
    check("legacy PO is not listed as a PO-by-PR order", !byPr.data.some((p) => p.po_number === legacy));
    check("PR line 142 has no legacy-ordered quantity", (await call("GET", "/api/new-po/pr/prs/PR-2026-00031/lines")).data.find((l) => l.prItemId === 142).orderedOutsidePoByPrQty === undefined ||
      close((await call("GET", "/api/new-po/pr/prs/PR-2026-00031/lines")).data.find((l) => l.prItemId === 142).orderedOutsidePoByPrQty, 0));

    const cancel = await call("POST", `/api/purchase/orders/${po1No}/cancel`, { user: "e2e", reason: "test" });
    check("cancelling a PO-by-PR PO is refused (409)", cancel.status === 409, `status ${cancel.status}`);
    check("refused cancel leaves PO1 status unchanged", sql(`SELECT status FROM purchase_orders WHERE po_number='${po1No}'`) === "COMPLETED");

    const manual = await call("PUT", "/api/purchase/requisitions/PR-2026-00031/items/CON01-0001/ordered-qty", { deltaOrderedQty: 1 });
    check("manual ordered-qty change on an allocated line is refused (409)", manual.status === 409, `status ${manual.status}`);
    check("refused manual change leaves ordered_qty unchanged", sql("SELECT SUM(ordered_qty) FROM purchase_requisition_items WHERE pr_number='PR-2026-00031' AND item_code='CON01-0001'") === "20.00");

    const delPr = await call("DELETE", "/api/purchase/requisitions/PR-2026-00031");
    check("deleting a PR with PO-by-PR allocations is refused (409)", delPr.status === 409, `status ${delPr.status}`);
    check("refused delete keeps the PR, its items and its allocations",
      sql("SELECT COUNT(*) FROM purchase_requisitions WHERE pr_number='PR-2026-00031'") === "1" &&
      sql("SELECT COUNT(*) FROM po_pr_allocations WHERE pr_number='PR-2026-00031'") !== "0");
  }

  // ------------------------------------------------------------ summary
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (po1No) console.log("PO1:", po1No);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e); process.exit(2); });
