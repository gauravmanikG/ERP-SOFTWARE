// Browser test: PO Register (cancel allowed / blocked) and the PO vs PR and reconciliation reports.
// Runs against the TEST backend (port 4100) served from the UI build on port 5174.
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const path = require("path");
const SHOTS = __dirname;
const URL = "http://127.0.0.1:5174/";
const API = "http://localhost:4100/api/new-po";
const H = { "Content-Type": "application/json", "X-User-Name": "ui-register" };
const PSQL = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function sql(q) {
  return execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q],
    { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
};

async function byText(page, text, tag = "*") {
  const [h] = await page.$$(`xpath/.//${tag}[normalize-space(text())="${text}"]`);
  if (!h) throw new Error(`not found: "${text}"`);
  return h;
}
const bodyHas = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t);

async function openNewPo(page, subItem) {
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(1000);
  (await byText(page, "Purchase")).hover();
  await wait(600);
  (await byText(page, "New Purchase Order")).hover();
  await wait(600);
  (await byText(page, subItem)).click();
  await wait(1200);
}

async function rowWith(page, text) {
  const rows = await page.$$("tbody tr");
  for (const r of rows) if ((await r.evaluate((el) => el.innerText)).includes(text)) return r;
  return null;
}

async function post(path, body, user = "ui-register") {
  const res = await fetch(API + path, { method: "POST", headers: { ...H, "X-User-Name": user }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
}

(async () => {
  // ---- setup through the real API
  for (const itemId of [1611, 1612]) {
    await post("/vendor-rates", { supplierCode: "SUP-002", itemId, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" });
  }
  const poA = await post("/pr/purchase-orders", { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: 142 }] });
  const poB = await post("/pr/purchase-orders", { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: 151 }] });
  if (poA.status !== 201 || poB.status !== 201) throw new Error("setup POs failed: " + poA.status + " " + poB.status);
  const poANo = poA.data.poNumber, poBNo = poB.data.poNumber;
  const grnRes = await fetch("http://localhost:4100/api/purchase/grn?post=true", {
    method: "POST", headers: H,
    body: JSON.stringify({ grnDate: "2026-10-19", poNumber: poBNo, poDate: "2026-10-19", vendorCode: "SUP-002", vendorName: "A.V.SALES CORPORATION",
      vendorChallanNo: "CH-UI-" + Date.now(), storeLocation: "Main Store", receivedBy: "ui-register",
      items: [{ itemCode: "CON01-0001", itemName: "CON01-0001", uom: "PCS", poOrderedQty: 10, challanQty: 10, receivedQty: 10, acceptedQty: 10, rejectedQty: 0, unitRate: 100, taxPercent: 18 }] })
  });
  check("setup: GRN posted against PO B through the existing GRN API", grnRes.status === 201, String(grnRes.status));

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, args: ["--no-sandbox", "--window-size=1440,1000"], defaultViewport: { width: 1440, height: 1000 }
  });
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  try {
    // ---- PO Register: cancellable PO
    await openNewPo(page, "PO Register");
    check("PO Register lists the orders", await bodyHas(page, "PO by PR orders"));
    (await rowWith(page, poANo)).click();
    await wait(1200);
    check("detail shows the cancel control for a PO with no receipts", await bodyHas(page, "Cancel PO and release quantities"));
    const reasonBox = await page.$('input[placeholder="Reason for cancelling this PO"]');
    await reasonBox.type("wrong quantity");
    (await byText(page, "Cancel PO and release quantities", "button")).click();
    await wait(1800);
    check("success message after cancellation", await bodyHas(page, `${poANo} cancelled`));
    check("database shows PO A CANCELLED", sql(`SELECT status FROM purchase_orders WHERE po_number='${poANo}'`) === "CANCELLED");
    check("database released PR line 142 back to 0 ordered", sql("SELECT ordered_qty FROM purchase_requisition_items WHERE id=142") === "0.00");
    await page.screenshot({ path: path.join(SHOTS, "reg-01-cancelled.png") });

    // ---- PO Register: PO with a posted receipt
    (await rowWith(page, poBNo)).click();
    await wait(1200);
    check("cancel control is NOT offered for a PO with posted receipts", !(await bodyHas(page, "Cancel PO and release quantities")));
    check("the reason is shown", await bodyHas(page, "cannot be cancelled"));
    await page.screenshot({ path: path.join(SHOTS, "reg-02-receipt-blocked.png") });

    // ---- Reports
    await openNewPo(page, "PO vs PR Report");
    check("PO vs PR report shows the PR line", await bodyHas(page, "PR-2026-00031"));
    check("PO vs PR report shows lifecycle", await bodyHas(page, "PARTIALLY_ORDERED") || await bodyHas(page, "OPEN"));
    await openNewPo(page, "PO vs PR vs MRN/GRN Report");
    check("PO vs PR vs GRN report shows PO B with its receipt", await bodyHas(page, poBNo));
    await openNewPo(page, "Legacy Reconciliation");
    check("reconciliation page loads with category counts", await bodyHas(page, "Legacy") || await bodyHas(page, "No records need manual reconciliation."));
    await page.screenshot({ path: path.join(SHOTS, "reg-03-reconciliation.png") });
  } catch (e) {
    results.push(false);
    console.log("EXCEPTION: " + e.message);
    await page.screenshot({ path: path.join(SHOTS, "reg-99-failure.png") }).catch(() => {});
  }
  console.log("PROBLEMS:", JSON.stringify(problems));
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed} ui checks passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
