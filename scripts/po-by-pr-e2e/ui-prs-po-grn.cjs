// UI end-to-end on the TEST copy (backend 4100, UI build on 5174): PR -> PO (partial, then remainder) -> GRN (accepted + rejected)
// -> cancellation of an unreceived PO. Each step is confirmed in PostgreSQL (sms_seals_test only).
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const path = require("path");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = __dirname;
const URL = "http://127.0.0.1:5174/";
const BASE = "http://localhost:4100";
const PSQL = "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const PR_NO = process.env.PR_NO;   // set by the runner (an approved PR created on the test copy)
const sql = (q) => {
  if (!PR_NO) throw new Error("PR_NO not set");
  return execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q],
    { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
};
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`); };

async function byText(page, text, tag = "*") {
  const [h] = await page.$$(`xpath/.//${tag}[normalize-space(text())="${text}"]`);
  if (!h) throw new Error(`not found: "${text}" (${tag})`);
  return h;
}
const bodyHas = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t);
async function rowWith(page, text) {
  for (const r of await page.$$("tbody tr")) if ((await r.evaluate((el) => el.innerText)).includes(text)) return r;
  return null;
}
async function menu(page, groupText, subText) {
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(1000);
  (await byText(page, "Purchase")).hover(); await wait(600);
  if (groupText) { (await byText(page, groupText)).hover(); await wait(600); }
  (await byText(page, subText)).click(); await wait(1500);
}
async function pickVendor(page) {
  const v = await page.$('input[placeholder="Search vendor name or code"]');
  await v.click(); await v.type("A.V.SALES", { delay: 25 }); await wait(900);
  (await page.$$("xpath/.//div[normalize-space(text())='A.V.SALES CORPORATION']"))[0].click(); await wait(400);
}
async function pickPr(page, prNo) {
  const p = await page.$('input[placeholder="Search PR number or department"]');
  await p.click(); await p.type(prNo, { delay: 25 }); await wait(1000);
  (await page.$$(`xpath/.//div[normalize-space(text())="${prNo}"]`))[0].click(); await wait(1500);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true,
    args: ["--no-sandbox", "--window-size=1440,1000"], defaultViewport: { width: 1440, height: 1000 } });
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("dialog", async (d) => { problems.push("dialog: " + d.message()); await d.accept(); });
  const pr = PR_NO;
  try {
    // ---- 1. PO by PR: partial order of line 1 (60 of 100)
    await menu(page, "New Purchase Order", "PO by PR");
    await pickVendor(page);
    await pickPr(page, pr);
    check("the PR's outstanding lines are listed after choosing the PR", await bodyHas(page, "Lines of " + pr) && !!(await rowWith(page, "CON01-0001")));
    const l1 = await rowWith(page, "CON01-0001");
    await (await byText(page, "Partially ordered", "label")).click();
    await wait(300);
    await (await l1.$('input[type="checkbox"]')).click();
    const q1 = await l1.$('input[type="number"]');
    await q1.click({ clickCount: 3 }); await q1.type("60");
    await (await byText(page, "Add 1 selected to PO", "button")).click(); await wait(900);
    (await byText(page, "Create purchase order", "button")).click(); await wait(2200);
    const alloc1 = sql(`SELECT a.allocated_qty FROM po_pr_allocations a JOIN purchase_requisition_items i ON i.id=a.pr_item_id WHERE i.pr_number='${pr}' AND i.item_code='CON01-0001'`);
    check("PO1 (partial 60) created from the PR line in the UI", alloc1 === "60.00", alloc1);
    check("PR status Partially Ordered after PO1", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${pr}'`) === "Partially Ordered");

    // ---- 2. remaining 40 of line 1 plus full line 2 in one PO
    await menu(page, "New Purchase Order", "PO by PR");
    await pickVendor(page);
    await pickPr(page, pr);
    const r1 = await rowWith(page, "CON01-0001");
    const remainingText = await r1.evaluate((el) => el.innerText);
    check("remaining quantity of line 1 is 40 (not 100)", /\b40\b/.test(remainingText), remainingText.replace(/\s+/g, " ").slice(0, 140));
    await (await r1.$('input[type="checkbox"]')).click();
    await (await rowWith(page, "CON01-0002")).$('input[type="checkbox"]').then((c) => c.click());
    await (await byText(page, "Add 2 selected to PO", "button")).click(); await wait(900);
    (await byText(page, "Create purchase order", "button")).click(); await wait(2200);
    check("PO2 created for the remaining 40 and the full line 2", sql(`SELECT COUNT(*) FROM po_pr_allocations a JOIN purchase_requisition_items i ON i.id=a.pr_item_id WHERE i.pr_number='${pr}' AND a.po_number NOT IN (SELECT po_number FROM po_pr_allocations WHERE allocated_qty=60)`) === "2");
    check("PR fully ordered (100 + 40)", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${pr}'`) === "Fully Ordered");
    check("the same quantity cannot be ordered again: line 1 no longer offered", !(await bodyHas(page, "Lines of " + pr)) || !(await rowWith(page, "CON01-0001")));
    await page.screenshot({ path: path.join(SHOTS, "flow-01-po.png") });

    // ---- 3. GRN on PO1: 60 received, 5 rejected, 55 accepted
    const po1 = sql(`SELECT a.po_number FROM po_pr_allocations a JOIN purchase_requisition_items i ON i.id=a.pr_item_id WHERE i.pr_number='${pr}' AND i.item_code='CON01-0001' AND a.allocated_qty=60`);
    const pend = await fetch(BASE + "/api/purchase/grn/pending-pos").then((r) => r.json());
    console.log("pending from API before GRN page:", pend.map((p) => p.poNumber).join(","));
    await menu(page, null, "GRN");
    (await page.$$("xpath/.//button[contains(., 'Pending POs for Receipt')]"))[0].click();
    await wait(2500);
    console.log("PO numbers in DOM:", await page.evaluate(() => (document.body.innerText.match(/PO-2026-d{5}/g) || []).join(",")));
    await page.screenshot({ path: path.join(SHOTS, "flow-grn-tab.png") });
    const poRow = await rowWith(page, po1);
    console.log("rows on pending tab:", (await page.$("tbody tr")).length, "PO1 row found:", !!poRow);
    check("PO1 is listed under Pending POs for Receipt", !!poRow);
    (await poRow.$$("xpath/.//button[contains(., 'Create GRN')]"))[0].click();
    await wait(1500);
    const grnRow = await rowWith(page, "CON01-0001");
    const inputs = await grnRow.$$('input[type="number"]');
    // inputs: challan, received, accepted, rejected, (pending)
    await inputs[3].click({ clickCount: 3 }); await inputs[3].type("5");   // rejected 5
    await wait(300);
    const acc = (await grnRow.$$('input[type="number"]'))[2];
    await acc.click({ clickCount: 3 }); await acc.type("55");              // accepted 55 -> received 60
    await wait(300);
    const reasonSel = await grnRow.$("select");
    const reasons = await reasonSel.evaluate((el) => Array.from(el.options).map((o) => o.value).filter((v) => v));
    check("rejection reasons are offered by the GRN form", reasons.length > 0, reasons.join(" | ").slice(0, 120));
    await reasonSel.select(reasons[0]);
    const challan = await page.$$("xpath/.//input[contains(@placeholder, 'DC-2026')]");
    if (challan.length) await challan[0].type("UI-CH-" + Date.now());
    (await byText(page, "✓ Post Official GRN", "button")).click();
    await wait(2500);
    const rcv = sql(`SELECT gi.received_qty || '|' || gi.accepted_qty || '|' || gi.rejected_qty FROM goods_receipt_note_items gi JOIN goods_receipt_notes n ON n.id=gi.grn_id WHERE gi.po_number='${po1}' AND n.status='POSTED' ORDER BY gi.id DESC LIMIT 1`);
    check("GRN posted in the UI with received 60, accepted 55, rejected 5", rcv === "60.00|55.00|5.00", rcv);
    check("accepted 55 attributed to PR line 1; rejected not attributed", sql(`SELECT COALESCE(SUM(g.accepted_qty),0)||'|'||COUNT(*) FROM grn_item_allocations g JOIN po_pr_allocations a ON a.id=g.allocation_id WHERE a.po_number='${po1}'`) === "55.00|1");
    check("PO1 remains open (PARTIALLY RECEIVED) for the 5 accepted units", sql(`SELECT status FROM purchase_orders WHERE po_number='${po1}'`) === "PARTIALLY RECEIVED");
    await page.screenshot({ path: path.join(SHOTS, "flow-02-grn.png") });

    // ---- 4. cancel PO2 (no receipts) through the PO Register screen
    const po2 = sql(`SELECT DISTINCT a.po_number FROM po_pr_allocations a JOIN purchase_requisition_items i ON i.id=a.pr_item_id WHERE i.pr_number='${pr}' AND i.item_code='CON01-0002'`);
    await menu(page, "New Purchase Order", "PO Register");
    const reg = await rowWith(page, po2);
    check("PO2 is in the PO Register", !!reg);
    await reg.click(); await wait(1200);
    const reason = await page.$('input[placeholder="Reason for cancelling this PO"]');
    await reason.type("ui cancel test");
    (await byText(page, "Cancel PO and release quantities", "button")).click(); await wait(2000);
    check("PO2 cancelled in the UI", sql(`SELECT status FROM purchase_orders WHERE po_number='${po2}'`) === "CANCELLED");
    check("line 2 released back to 0 ordered; PR back to Partially Ordered",
      sql(`SELECT ordered_qty FROM purchase_requisition_items WHERE pr_number='${pr}' AND item_code='CON01-0002'`) === "0.00" &&
      sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${pr}'`) === "Partially Ordered");
    await page.screenshot({ path: path.join(SHOTS, "flow-03-cancel.png") });
  } catch (e) {
    results.push(false);
    console.log("EXCEPTION: " + e.message);
    await page.screenshot({ path: path.join(SHOTS, "flow-99-failure.png") }).catch(() => {});
  }
  console.log("PROBLEMS:", JSON.stringify(problems));
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed} ui checks passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
