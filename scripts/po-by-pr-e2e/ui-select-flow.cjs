// Browser check of PR selection on the PO by PR screen, on the TEST copy (backend 4100, UI build on 5174).
// 1) a new approved PR with no vendor rate: its line must be selectable, and adding it must explain the missing rate
// 2) after the rate is added through the API: select the same line, add it, create the PO
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const path = require("path");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = __dirname;
const URL = "http://127.0.0.1:5174/";
const BASE = "http://localhost:4100";
const PSQL = "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const sql = (q) => execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q],
  { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`); };

async function byText(page, text, tag = "*") {
  const [h] = await page.$$(`xpath/.//${tag}[normalize-space(text())="${text}"]`);
  if (!h) throw new Error(`not found: "${text}"`);
  return h;
}
const bodyHas = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t);
async function openPoByPr(page) {
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(1000);
  (await byText(page, "Purchase")).hover(); await wait(600);
  (await byText(page, "New Purchase Order")).hover(); await wait(600);
  (await byText(page, "PO by PR")).click(); await wait(1200);
}
async function pickVendorAndItem(page, code) {
  const v = await page.$('input[placeholder="Search vendor name or code"]');
  await v.click(); await v.type("A.V.SALES", { delay: 25 }); await wait(900);
  (await page.$$("xpath/.//div[normalize-space(text())='A.V.SALES CORPORATION']"))[0].click(); await wait(400);
  const i = await page.$('input[placeholder="Search item code or name"]');
  await i.click(); await i.type(code, { delay: 25 }); await wait(900);
  (await page.$$(`xpath/.//div[normalize-space(text())="${code}"]`))[0].click(); await wait(1200);
}
async function rowFor(page, prNumber) {
  for (const r of await page.$$("tbody tr")) if ((await r.evaluate((el) => el.innerText)).includes(prNumber)) return r;
  return null;
}

(async () => {
  // PR with one line, approved through the PR API. No vendor rate exists for this item yet.
  const pr = await fetch(BASE + "/api/purchase/requisitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    prDate: "2026-10-19", requiredDate: "2026-10-26", requisitioner: "ui-select", department: "Production", status: "Draft",
    items: [{ itemCode: "CON01-0001", itemName: "UI select line", uom: "PCS", reqQty: 25, category: "FG", hsnCode: "84669390", requiredByDate: "2026-10-26" }] }) }).then((r) => r.json());
  await fetch(`${BASE}/api/purchase/requisitions/${pr.prNumber}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Approved", user: "ui-select" }) });
  const lineId = sql(`SELECT id FROM purchase_requisition_items WHERE pr_number='${pr.prNumber}'`);

  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true,
    args: ["--no-sandbox", "--window-size=1440,1000"], defaultViewport: { width: 1440, height: 1000 } });
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  try {
    await openPoByPr(page);
    await pickVendorAndItem(page, "CON01-0001");
    const row = await rowFor(page, pr.prNumber);
    check("the new approved PR line is listed", !!row);
    const box = await row.$('input[type="checkbox"]');
    check("its checkbox is selectable (not disabled) even without a rate", box && !(await box.evaluate((el) => el.disabled)));
    await box.click();
    await (await byText(page, "Add 1 selected to PO", "button")).click();
    await wait(700);
    check("adding it without a rate explains what to do", await bodyHas(page, "no vendor rate for") && await bodyHas(page, "Vendor Rate Master"));
    await page.screenshot({ path: path.join(SHOTS, "sel-01-no-rate.png") });

    // Add the rate through the real API (as a user would in Vendor Rate Master), then select again.
    const rate = await fetch(`${BASE}/api/new-po/vendor-rates`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Name": "ui-select" },
      body: JSON.stringify({ supplierCode: "SUP-002", itemId: 1611, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" }) });
    check("rate added through Vendor Rate Master API", rate.status === 201, String(rate.status));

    await openPoByPr(page);
    await pickVendorAndItem(page, "CON01-0001");
    const row2 = await rowFor(page, pr.prNumber);
    await (await row2.$('input[type="checkbox"]')).click();
    await (await byText(page, "Add 1 selected to PO", "button")).click();
    await wait(1200);
    check("the line is added to the PO basket with its price", await bodyHas(page, "2,500.00") || await bodyHas(page, "2,950.00"));
    (await byText(page, "Create purchase order", "button")).click();
    await wait(2200);
    check("success message shows the PO", await bodyHas(page, "created for A.V.SALES"));
    const alloc = sql(`SELECT allocated_qty || '|' || pr_item_id FROM po_pr_allocations WHERE pr_item_id=${lineId}`);
    check("database: allocation of 25 to the PR line", alloc === `25.00|${lineId}`, alloc);
    check("database: PR fully ordered", sql(`SELECT status FROM purchase_requisitions WHERE pr_number='${pr.prNumber}'`) === "Fully Ordered");
    await page.screenshot({ path: path.join(SHOTS, "sel-02-created.png") });
  } catch (e) {
    results.push(false);
    console.log("EXCEPTION: " + e.message);
    await page.screenshot({ path: path.join(SHOTS, "sel-99-failure.png") }).catch(() => {});
  }
  console.log("PROBLEMS:", JSON.stringify(problems));
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed} ui checks passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
