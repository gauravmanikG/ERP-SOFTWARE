// Reproduce: can one PO by PR contain more than one item? (test copy only: backend 4100, UI on 5174)
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PSQL = "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const sql = (q) => execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q],
  { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} - ${n}${d ? " :: " + d : ""}`); };
async function byText(page, text, tag = "*") {
  const [h] = await page.$$(`xpath/.//${tag}[normalize-space(text())="${text}"]`);
  if (!h) throw new Error(`not found: "${text}"`);
  return h;
}
const bodyHas = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t);
async function rowWith(page, text) {
  for (const r of await page.$$("tbody tr")) if ((await r.evaluate((el) => el.innerText)).includes(text)) return r;
  return null;
}
async function pickItem(page, code) {
  const i = await page.$('input[placeholder="Search item code or name"]');
  await i.click(); await i.type(code, { delay: 25 }); await wait(1000);
  (await page.$$(`xpath/.//div[normalize-space(text())="${code}"]`))[0].click(); await wait(1200);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true,
    args: ["--no-sandbox", "--window-size=1440,1000"], defaultViewport: { width: 1440, height: 1000 } });
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("dialog", async (d) => { problems.push("dialog: " + d.message()); await d.accept(); });
  const PR = process.env.PR_NO;
  try {
    await page.goto("http://127.0.0.1:5174/", { waitUntil: "networkidle2", timeout: 60000 });
    await wait(1000);
    (await byText(page, "Purchase")).hover(); await wait(600);
    (await byText(page, "New Purchase Order")).hover(); await wait(600);
    (await byText(page, "PO by PR")).click(); await wait(1500);
    const v = await page.$('input[placeholder="Search vendor name or code"]');
    await v.click(); await v.type("A.V.SALES", { delay: 25 }); await wait(900);
    (await page.$$("xpath/.//div[normalize-space(text())='A.V.SALES CORPORATION']"))[0].click(); await wait(500);

    // item 1: CON01-0001
    await pickItem(page, "CON01-0001");
    const r1 = await rowWith(page, PR);
    await (await r1.$('input[type="checkbox"]')).click();
    await (await byText(page, "Add 1 selected to PO", "button")).click(); await wait(900);
    check("first item added to the PO", await bodyHas(page, "Full"));

    // item 2: change the item chip to CON01-0002 and add it
    const picker = await page.$('input[placeholder="Search item code or name"]');
    check("the item picker is ready again right after adding an item", !!picker);
    await pickItem(page, "CON01-0002");
    const r2 = await rowWith(page, PR);
    check("second item's PR line is listed", !!r2, r2 ? (await r2.evaluate((el) => el.innerText)).replace(/\s+/g, " ").slice(0, 80) : "");
    if (r2) await (await r2.$('input[type="checkbox"]')).click();
    await (await byText(page, "Add 1 selected to PO", "button")).click(); await wait(900);
    await wait(1500);
    const basketRows = await page.evaluate(() => Array.from(document.querySelectorAll("tbody tr")).filter((r) => /CON01-000[12]/.test(r.innerText) && /Partial|Full/.test(r.innerText)).length);
    check("PO basket holds both items", basketRows === 2, `rows=${basketRows}`);
    await page.screenshot({ path: __dirname + "/multi-basket.png" });

    (await byText(page, "Create purchase order", "button")).click(); await wait(2500);
    const n = sql(`SELECT COUNT(DISTINCT p.po_number) FROM purchase_orders p JOIN po_pr_allocations a ON a.po_number=p.po_number JOIN purchase_requisition_items i ON i.id=a.pr_item_id WHERE i.pr_number='${PR}' AND p.created_at > NOW() - INTERVAL '10 minutes'`);
    const lines = sql(`SELECT COUNT(DISTINCT a.item_code) FROM po_pr_allocations a WHERE a.po_number = (SELECT a2.po_number FROM po_pr_allocations a2 JOIN purchase_requisition_items i2 ON i2.id=a2.pr_item_id WHERE i2.pr_number='${PR}' ORDER BY a2.id DESC LIMIT 1)`);
    check("one PO created", n === "1", n);
    check("that PO has both items (2 item lines)", lines === "2", lines);
  } catch (e) {
    results.push(false);
    console.log("EXCEPTION: " + e.message);
    await page.screenshot({ path: __dirname + "/multi-99-failure.png" }).catch(() => {});
  }
  console.log("PROBLEMS:", JSON.stringify(problems));
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed} ui checks passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
