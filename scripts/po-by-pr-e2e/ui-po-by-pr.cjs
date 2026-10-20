// Browser test of PO by PR against the test backend (port 4100), served from the UI build on port 5174.
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const path = require("path");
const SHOTS = __dirname;
const URL = "http://127.0.0.1:5174/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PSQL = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";

function sql(q) {
  return execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q],
    { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
}

const results = [];
const check = (name, ok, detail = "") => { results.push(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`); console.log(results[results.length - 1]); };

async function byText(page, text, tag = "*") {
  const [h] = await page.$$(`xpath/.//${tag}[normalize-space(text())="${text}"]`);
  if (!h) throw new Error(`not found: "${text}"`);
  return h;
}
const bodyHas = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t);

async function openPoByPr(page) {
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(1000);
  (await byText(page, "Purchase")).hover();
  await wait(600);
  (await byText(page, "New Purchase Order")).hover();
  await wait(600);
  (await byText(page, "PO by PR", "*")).click();
  await wait(1200);
}

async function pickVendor(page, text) {
  const input = await page.$('input[placeholder="Search vendor name or code"]');
  await input.click();
  await input.type(text, { delay: 25 });
  await wait(900);
  const [opt] = await page.$$(`xpath/.//div[normalize-space(text())="A.V.SALES CORPORATION"]`);
  await opt.click();
  await wait(400);
}

async function pickItem(page, code) {
  const input = await page.$('input[placeholder="Search item code or name"]');
  await input.click();
  await input.type(code, { delay: 25 });
  await wait(900);
  const [opt] = await page.$$(`xpath/.//div[normalize-space(text())="${code}"]`);
  await opt.click();
  await wait(900);
}

// Find the table row that shows a given PR number, and its checkbox / qty input.
async function rowHandle(page, prNumber) {
  const handles = await page.$$("tbody tr");
  for (const h of handles) {
    const text = await h.evaluate((el) => el.innerText);
    if (text.includes(prNumber)) return h;
  }
  return null;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, args: ["--no-sandbox", "--window-size=1440,1000"], defaultViewport: { width: 1440, height: 1000 }
  });
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  try {
    // Setup through the real API: the vendor rate for CON01-0001 (item 1611) effective 1 Oct 2026.
    const rate = await fetch("http://localhost:4100/api/new-po/vendor-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Name": "ui-test-setup" },
      body: JSON.stringify({ supplierCode: "SUP-002", itemId: 1611, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" })
    });
    check("setup: vendor rate 100 for CON01-0001 saved via API", rate.status === 201, String(rate.status));
    await openPoByPr(page);
    check("PO by PR screen opens from the Purchase menu", await bodyHas(page, "Partially ordered"));

    await pickVendor(page, "A.V.SALES");
    await pickItem(page, "CON01-0001");
    check("item shows associated PR count 4", await bodyHas(page, "Associated PR count: 4"));
    check("PR-2026-00031 line is listed", !!(await rowHandle(page, "PR-2026-00031")));
    const price = await (await rowHandle(page, "PR-2026-00031")).evaluate((el) => el.innerText);
    check("unit price 100 is shown from Vendor Rate Master", price.includes("₹100.00"), price.replace(/\s+/g, " ").slice(0, 160));
    await page.screenshot({ path: path.join(SHOTS, "ui-01-lines.png") });

    // Full purchase of PR-2026-00031 line
    const r31 = await rowHandle(page, "PR-2026-00031");
    await (await r31.$('input[type="checkbox"]')).click();
    await (await byText(page, "Add 1 selected to PO", "button")).click();
    await wait(600);
    check("basket shows the PR line after Add", await bodyHas(page, "Full"));
    await wait(1200);
    check("preview shows GST and grand total 2,360.00 (2,000 + 18% IGST)", await bodyHas(page, "₹2,360.00"));
    await page.screenshot({ path: path.join(SHOTS, "ui-02-basket.png") });

    (await byText(page, "Create purchase order", "button")).click();
    await wait(2000);
    const dbFull = sql("SELECT COUNT(*) FROM po_pr_allocations a JOIN purchase_requisition_items p ON p.id=a.pr_item_id WHERE p.pr_number='PR-2026-00031' AND p.item_code='CON01-0001' AND a.allocated_qty=20");
    check("full PO saved to PostgreSQL (allocation 20 for PR-2026-00031)", dbFull === "1", dbFull);
    check("success message shows PO created", await bodyHas(page, "created for A.V.SALES"));
    check("PR-2026-00031 line disappears after full order", !(await rowHandle(page, "PR-2026-00031")));
    await page.screenshot({ path: path.join(SHOTS, "ui-03-created.png") });

    // Partial purchase of PR-2026-00034 line
    (await byText(page, "Partially ordered", "label")).click().catch(async () => {
      const radios = await page.$$('input[name="po-mode"]');
      await radios[1].click();
    });
    await wait(400);
    const r34 = await rowHandle(page, "PR-2026-00034");
    await (await r34.$('input[type="checkbox"]')).click();
    const qtyBox = await r34.$('input[type="number"]');
    await qtyBox.click({ clickCount: 3 });
    await qtyBox.type("5");
    await (await byText(page, "Add 1 selected to PO", "button")).click();
    await wait(1000);
    check("partial line added with typed quantity 5", await bodyHas(page, "Partial"));
    (await byText(page, "Create purchase order", "button")).click();
    await wait(2000);
    const dbPartial = sql("SELECT allocated_qty FROM po_pr_allocations a JOIN purchase_requisition_items p ON p.id=a.pr_item_id WHERE p.pr_number='PR-2026-00034' ORDER BY a.id DESC LIMIT 1");
    check("partial PO saved with allocation 5 for PR-2026-00034", dbPartial === "5.00", dbPartial);

    // Reload (browser restart): the saved quantities must come back from PostgreSQL.
    await openPoByPr(page);
    await pickVendor(page, "A.V.SALES");
    await pickItem(page, "CON01-0001");
    const r34b = await rowHandle(page, "PR-2026-00034");
    const prevOrdered = await r34b.evaluate((el) => el.querySelectorAll("td")[4].innerText.trim());
    check("after reload, PR-2026-00034 shows 5 previously ordered", prevOrdered === "5", prevOrdered);
    check("after reload, fully ordered PR-2026-00031 is gone", !(await rowHandle(page, "PR-2026-00031")));
    check("history: PR-2026-00034 remaining is 95", (await r34b.evaluate((el) => el.querySelectorAll("td")[5].innerText.trim())) === "95");
    await page.screenshot({ path: path.join(SHOTS, "ui-04-after-reload.png") });
  } catch (e) {
    results.push("EXCEPTION: " + e.message);
    console.log("EXCEPTION: " + e.message);
    await page.screenshot({ path: path.join(SHOTS, "ui-99-failure.png") }).catch(() => {});
  }
  console.log("PROBLEMS:", JSON.stringify(problems));
  const failed = results.filter((r) => r.startsWith("FAIL") || r.startsWith("EXCEPTION")).length;
  console.log(`${results.length - failed} ui checks passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
