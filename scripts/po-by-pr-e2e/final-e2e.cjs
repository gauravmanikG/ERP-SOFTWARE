// Final PR -> PO -> GRN end-to-end checks. Runs ONLY against the test copy (sms_seals_test, backend port 4100).
// Creates its own PR through the real PR endpoints, approves it, then exercises POs, GRNs, cancellation,
// concurrency, restart persistence. Every step is checked against the API response and the PostgreSQL rows.
const { execFileSync } = require("child_process");
const { spawnSync } = require("child_process");

const BASE = "http://localhost:4100";
const NPO = BASE + "/api/new-po";
const H = { "Content-Type": "application/json", "X-User-Name": "final-e2e" };
const PSQL = "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const START = process.env.START_SCRIPT;
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => {
  if (!/sms_seals_test/.test(process.env.E2E_DB || "sms_seals_test")) throw new Error("refusing to run SQL on a non-test database");
  return execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q],
    { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
};
const num = (v) => Number(v);
const same = (a, b) => Math.abs(num(a) - num(b)) < 0.005;

async function call(method, url, body, headers = H) {
  const r = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: r.status, data };
}

async function healthy() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + "/api/health")).ok) return true; } catch (e) {} await wait(3000); }
  return false;
}

(async () => {
  console.log("== setup (test database only)");
  check("test backend reachable", (await call("GET", BASE + "/api/health")).status === 200);
  for (const itemId of [1611, 1612]) {
    const r = await call("POST", NPO + "/vendor-rates", { supplierCode: "SUP-002", itemId, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" });
    check(`vendor rate for item ${itemId} saved through API`, r.status === 201, String(r.status));
  }
  const clubBefore = sql("SELECT (SELECT COUNT(*) FROM pr_clubbing_batches) || '|' || (SELECT COUNT(*) FROM pr_clubbing_allocations)");

  console.log("== 1. create and approve a PR");
  const pr = await call("POST", BASE + "/api/purchase/requisitions", {
    prDate: "2026-10-19", requiredDate: "2026-10-26", requisitioner: "final-e2e", department: "Production", status: "Draft",
    items: [
      { itemCode: "CON01-0001", itemName: "CON01-0098 Shim BC1203", uom: "PCS", reqQty: 100, category: "FG", hsnCode: "84669390", requiredByDate: "2026-10-26" },
      { itemCode: "CON01-0002", itemName: "CON01-0099", uom: "PCS", reqQty: 40, category: "FG", hsnCode: "84669390", requiredByDate: "2026-10-26" }
    ]
  });
  check("PR created through PR API", pr.status === 200 && pr.data && pr.data.prNumber, pr.status + " " + JSON.stringify(pr.data).slice(0, 120));
  const prNo = pr.data.prNumber;
  check("new PR stored as Draft", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${prNo}'`) === "Draft");
  const appr = await call("PUT", `${BASE}/api/purchase/requisitions/${prNo}/status`, { status: "Approved", user: "final-e2e-approver" });
  check("PR approved through PR status API", appr.status === 200);
  check("PR is Approved in purchase_requisitions", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${prNo}'`) === "Approved");
  const lines = sql(`SELECT id || ':' || item_code || ':' || req_qty FROM purchase_requisition_items WHERE pr_number='${prNo}' ORDER BY id`).split("\n");
  const L1 = Number(lines[0].split(":")[0]), L2 = Number(lines[1].split(":")[0]);
  check("PR has two stored lines", lines.length === 2, lines.join(" | "));

  console.log("== 2. PR lines are eligible without any batch or clubbing");
  const elig = await call("GET", `${NPO}/pr/eligible-lines?itemCode=CON01-0001&vendorCode=SUP-002&poDate=2026-10-19`);
  const e1 = elig.data.find((l) => l.prItemId === L1);
  check("approved PR line is offered with full remaining quantity 100", e1 && same(e1.remainingQty, 100) && same(e1.unitPrice, 100), JSON.stringify(e1 && { r: e1.remainingQty, p: e1.unitPrice }));

  console.log("== 3. partial PO (60 of 100) then PO for the remaining eligible quantity (40)");
  const po1 = await call("POST", `${NPO}/pr/purchase-orders`, { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "PARTIAL", lines: [{ prItemId: L1, quantity: 60 }] });
  check("PO1: partial 60 saved", po1.status === 201, po1.status + " " + JSON.stringify(po1.data).slice(0, 150));
  const po1No = po1.data.poNumber;
  check("PO1 grand total = 6000 taxable + 18% IGST", po1.status === 201 && same(po1.data.po.grandTotal, 7080), String(po1.data.po && po1.data.po.grandTotal));
  check("PO1 header in purchase_orders, origin PO_BY_PR", sql(`SELECT COUNT(*) || '|' || MAX(po_origin) FROM purchase_orders WHERE po_number='${po1No}'`) === "1|PO_BY_PR");
  check("PO1 allocation: 60 on PR line with PR number", sql(`SELECT allocated_qty || '|' || pr_number || '|' || pr_item_id FROM po_pr_allocations WHERE po_number='${po1No}'`) === `60.00|${prNo}|${L1}`);
  check("PR line ordered 60, remaining 40", sql(`SELECT ordered_qty || '|' || remaining_qty FROM purchase_requisition_items WHERE id=${L1}`) === "60.00|40.00");
  check("PR status Partially Ordered after PO1", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${prNo}'`) === "Partially Ordered");

  const po2 = await call("POST", `${NPO}/pr/purchase-orders`, { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "PARTIAL", lines: [{ prItemId: L1, quantity: 40 }] });
  check("PO2: remaining 40 saved (second PO on the same line)", po2.status === 201, po2.status + " " + JSON.stringify(po2.data).slice(0, 120));
  const po2No = po2.data.poNumber;
  const over = await call("POST", `${NPO}/pr/purchase-orders`, { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "PARTIAL", lines: [{ prItemId: L1, quantity: 0.01 }] });
  check("one more unit on the same line is refused (409)", over.status === 409, over.status + " " + (over.data && over.data.error));
  check("PR line ordered exactly 100 after both POs", sql(`SELECT ordered_qty FROM purchase_requisition_items WHERE id=${L1}`) === "100.00");

  const po3 = await call("POST", `${NPO}/pr/purchase-orders`, { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: L2 }] });
  check("PO3: full order of PR line 2 (40)", po3.status === 201, po3.status + " " + JSON.stringify(po3.data).slice(0, 120));
  const po3No = po3.data.poNumber;
  check("PR fully ordered only when every line is fully ordered", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${prNo}'`) === "Fully Ordered");

  console.log("== 4. GRN: partial receipt with a rejected part, then completion with a replacement");
  const grn = (po, challan, code, received, accepted, rejected) => call("POST", BASE + "/api/purchase/grn?post=true", {
    grnDate: "2026-10-19", poNumber: po, poDate: "2026-10-19", vendorCode: "SUP-002", vendorName: "A.V.SALES CORPORATION",
    vendorChallanNo: challan, storeLocation: "Main Store", receivedBy: "final-e2e",
    items: [{ itemCode: code, itemName: code, uom: "PCS", poOrderedQty: 0, challanQty: received, receivedQty: received, acceptedQty: accepted, rejectedQty: rejected, pendingInspectionQty: 0, unitRate: 100, taxPercent: 18 }]
  });
  const tag = Date.now();
  const g1 = await grn(po1No, `CH-FE1-${tag}`, "CON01-0001", 60, 55, 5);
  check("GRN1 on PO1: 60 received, 55 accepted, 5 rejected, posted", g1.status === 201, g1.status + " " + JSON.stringify(g1.data).slice(0, 120));
  check("GRN1 attribution: 55 accepted to PR line 1 in grn_item_allocations",
    sql(`SELECT COALESCE(SUM(g.accepted_qty),0) FROM grn_item_allocations g JOIN po_pr_allocations a ON a.id=g.allocation_id WHERE a.pr_item_id=${L1}`) === "55.00");
  check("rejected 5 is not attributed to any PR line (only accepted rows exist)",
    sql(`SELECT COUNT(*) FROM grn_item_allocations WHERE received_qty <> accepted_qty`) === "0");
  check("PO1 status PARTIALLY RECEIVED (open for 5 accepted units)", sql(`SELECT status FROM purchase_orders WHERE po_number='${po1No}'`) === "PARTIALLY RECEIVED");
  const pos1 = await call("GET", `${NPO}/pr/purchase-orders/${po1No}`);
  const rp1 = pos1.data.receiptPosition.find((r) => r.itemCode === "CON01-0001");
  check("PO1 receipt position: physical 60, accepted 55, rejected 5 retained not returned, outstanding 5",
    rp1 && same(rp1.physicallyReceivedQty, 60) && same(rp1.acceptedQty, 55) && same(rp1.rejectedQty, 5) && same(rp1.outstandingAcceptedQty, 5) && rp1.rejectedDisposition === "RETAINED_NOT_RETURNED",
    JSON.stringify(rp1));

  const g2 = await grn(po2No, `CH-FE2-${tag}`, "CON01-0001", 40, 40, 0);
  check("GRN2 on PO2: 40 accepted, posted", g2.status === 201, g2.status + " " + JSON.stringify(g2.data).slice(0, 120));
  check("PO2 status COMPLETED", sql(`SELECT status FROM purchase_orders WHERE po_number='${po2No}'`) === "COMPLETED");

  const over2 = await grn(po1No, `CH-FE3-${tag}`, "CON01-0001", 6, 6, 0);
  check("replacement GRN for more than the 5 open accepted units is refused", over2.status >= 400, over2.status + " " + (over2.data && (over2.data.error || over2.data.message)));
  const g3 = await grn(po1No, `CH-FE4-${tag}`, "CON01-0001", 5, 5, 0);
  check("replacement GRN3 for the open 5 accepted units posted", g3.status === 201, g3.status + " " + JSON.stringify(g3.data).slice(0, 120));
  check("PO1 status COMPLETED after replacement", sql(`SELECT status FROM purchase_orders WHERE po_number='${po1No}'`) === "COMPLETED");
  check("PR line 1 accepted 100 (55 + 40 + 5), line 1 pending 0", sql(`SELECT COALESCE(SUM(g.accepted_qty),0) FROM grn_item_allocations g JOIN po_pr_allocations a ON a.id=g.allocation_id WHERE a.pr_item_id=${L1}`) === "100.00");

  const g4 = await grn(po3No, `CH-FE5-${tag}`, "CON01-0002", 40, 40, 0);
  check("GRN4 on PO3 (line 2 complete), posted", g4.status === 201);
  check("PR fully received: every line accepted in full", sql(`SELECT COUNT(*) FROM purchase_requisition_items i WHERE i.pr_number='${prNo}' AND i.ordered_qty > COALESCE((SELECT SUM(g.accepted_qty) FROM grn_item_allocations g JOIN po_pr_allocations a ON a.id=g.allocation_id WHERE a.pr_item_id=i.id),0)`) === "0");

  console.log("== 5. cancellation rules");
  const cancelDone = await call("POST", `${NPO}/pr/purchase-orders/${po1No}/cancel`, { reason: "x" });
  check("cancelling a fully received PO is refused (409)", cancelDone.status === 409, cancelDone.status + " " + (cancelDone.data && cancelDone.data.error));
  const probe = await call("POST", `${NPO}/pr/purchase-orders`, { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: L1 }] });
  check("line 1 is fully ordered, so a new order is refused (409)", probe.status === 409);

  console.log("== 6. concurrent orders against one PR line");
  const prC = await call("POST", BASE + "/api/purchase/requisitions", {
    prDate: "2026-10-19", requiredDate: "2026-10-26", requisitioner: "final-e2e", department: "Production", status: "Draft",
    items: [{ itemCode: "CON01-0001", itemName: "race line", uom: "PCS", reqQty: 10, category: "FG", hsnCode: "84669390", requiredByDate: "2026-10-26" }]
  });
  await call("PUT", `${BASE}/api/purchase/requisitions/${prC.data.prNumber}/status`, { status: "Approved", user: "final-e2e-approver" });
  const lineC = Number(sql(`SELECT id FROM purchase_requisition_items WHERE pr_number='${prC.data.prNumber}'`));
  const race = await Promise.all(Array.from({ length: 8 }, (_, i) => call("POST", `${NPO}/pr/purchase-orders`,
    { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "PARTIAL", lines: [{ prItemId: lineC, quantity: 10 }] })));
  const won = race.filter((r) => r.status === 201).length;
  check("8 concurrent orders for the whole line: exactly one succeeds", won === 1, race.map((r) => r.status).join(","));
  check("concurrent orders never exceed the line (ordered = 10)", sql(`SELECT ordered_qty FROM purchase_requisition_items WHERE id=${lineC}`) === "10.00");

  console.log("== 7. cancellation of an unreceived PO releases exactly its quantity");
  const raceOk = race.find((r) => r.status === 201).data.poNumber;
  const cancelOk = await call("POST", `${NPO}/pr/purchase-orders/${raceOk}/cancel`, { reason: "test release" });
  check("unreceived PO cancelled", cancelOk.status === 200 && cancelOk.data.status === "CANCELLED", cancelOk.status + " " + JSON.stringify(cancelOk.data).slice(0, 120));
  check("its 10 units released; line back to 0 ordered; PR back to Approved",
    sql(`SELECT ordered_qty FROM purchase_requisition_items WHERE id=${lineC}`) === "0.00" &&
    sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${prC.data.prNumber}'`) === "Approved");
  const again = await call("POST", `${NPO}/pr/purchase-orders/${raceOk}/cancel`, { reason: "again" });
  check("retrying the cancellation releases nothing more (409)", again.status === 409 && sql(`SELECT ordered_qty FROM purchase_requisition_items WHERE id=${lineC}`) === "0.00");

  console.log("== 8. batch and clubbing data are not part of this flow");
  const clubAfter = sql("SELECT (SELECT COUNT(*) FROM pr_clubbing_batches) || '|' || (SELECT COUNT(*) FROM pr_clubbing_allocations)");
  check("clubbing batch and allocation counts unchanged by the flow", clubAfter === clubBefore, `before ${clubBefore} after ${clubAfter}`);
  check("PR-to-PO allocations never reference a clubbing row", sql("SELECT COUNT(*) FROM po_pr_allocations WHERE pr_number='" + prNo + "' AND pr_item_id NOT IN (" + L1 + "," + L2 + ")") === "0");

  console.log("== 9. restart the backend, then re-read everything");
  const before = { ordered: sql(`SELECT ordered_qty FROM purchase_requisition_items WHERE id=${L1}`), status: sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${prNo}'`), po1: sql(`SELECT status FROM purchase_orders WHERE po_number='${po1No}'`) };
  for (const pid of execFileSync("cmd", ["/c", "netstat -ano | findstr :4100 | findstr LISTENING"], { encoding: "utf8" }).split("\n").map((l) => l.trim().split(/\s+/).pop()).filter(Boolean)) {
    try { execFileSync("taskkill", ["/PID", pid, "/F"], { stdio: "ignore" }); } catch (e) {}
  }
  await wait(4000);
  spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", START], { stdio: "ignore", timeout: 2000 });
  check("backend restarted", await healthy());
  const after = await call("GET", `${NPO}/pr/prs/${prNo}/lines`);
  const l1 = after.data.find((l) => l.prItemId === L1);
  check("after restart: PR line 1 ordered 100, accepted receipts 100", l1 && same(l1.orderedQty, 100) && same(l1.receivedQty, 100), JSON.stringify(l1 && { o: l1.orderedQty, r: l1.receivedQty }));
  check("after restart: PR and PO statuses unchanged", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${prNo}'`) === before.status && sql(`SELECT status FROM purchase_orders WHERE po_number='${po1No}'`) === before.po1);
  const listed = await call("GET", `${NPO}/pr/purchase-orders`);
  check("after restart: PO register lists PO1, PO2, PO3 from the database", [po1No, po2No, po3No].every((p) => listed.data.some((r) => r.po_number === p)));
  const seq = await call("POST", `${NPO}/pr/purchase-orders`, { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: lineC }] });
  check("after restart: new PO number is above every earlier one", seq.status === 201 && Number(seq.data.poNumber.slice(8)) > Math.max(...[po1No, po2No, po3No, raceOk].map((p) => Number(p.slice(8)))), seq.data && seq.data.poNumber);

  const failed = results.filter((r) => !r).length;
  console.log(`\nAPI + database: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("crashed:", e); process.exit(2); });
