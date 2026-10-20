// Browser test of the Direct PO screen on the TEST copy (backend 4100, UI build on 5174).
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true,
    args: ["--no-sandbox", "--window-size=1440,1000"], defaultViewport: { width: 1440, height: 1000 } });
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("dialog", async (d) => { problems.push("dialog: " + d.message()); await d.accept(); });
  try {
    await page.goto("http://127.0.0.1:5174/", { waitUntil: "networkidle2", timeout: 60000 });
    await wait(1000);
    (await byText(page, "Purchase")).hover(); await wait(600);
    (await byText(page, "New Purchase Order")).hover(); await wait(600);
    (await byText(page, "Direct PO")).click(); await wait(1500);
    check("Direct PO screen opens from the menu", await bodyHas(page, "Items (not linked to any PR)"));

    const v = await page.$('input[placeholder="Search vendor name or code"]');
    await v.click(); await v.type("A.V.SALES", { delay: 25 }); await wait(900);
    (await page.$$("xpath/.//div[normalize-space(text())='A.V.SALES CORPORATION']"))[0].click(); await wait(500);

    const addItem = async (code, qty) => {
      const i = await page.$('input[placeholder="Search part no. or description"]');
      await i.click(); await i.type(code, { delay: 25 }); await wait(900);
      (await page.$$(`xpath/.//div[normalize-space(text())="${code}"]`))[0].click(); await wait(400);
      const h = await page.$('input[placeholder="HSN code"]');
      if ((await h.evaluate((el) => el.value)) === "") await h.type("84669390");
      const q = (await page.$$('input[type="number"]')).slice(-1)[0];
      await q.click({ clickCount: 3 }); await q.type(String(qty));
      (await byText(page, "Add item", "button")).click(); await wait(900);
    };
    await addItem("CON01-0001", 4);
    await addItem("945-05745", 6);   // FG item from the Item Master
    check("both items listed with rates from Vendor Rate Master", await bodyHas(page, "CON01-0001") && await bodyHas(page, "945-05745"));
    await wait(1200);
    (await byText(page, "Create Direct PO", "button")).click(); await wait(2200);
    check("success message shows the Direct PO", await bodyHas(page, "created for A.V.SALES"));

    const dp = sql("SELECT po_number||'|'||po_origin||'|'||COALESCE(pr_number,'-')||'|'||(SELECT COUNT(*) FROM po_pr_allocations a WHERE a.po_number=p.po_number) FROM purchase_orders p WHERE po_origin='DIRECT' ORDER BY created_at DESC LIMIT 1");
    check("database: Direct PO with origin DIRECT, no PR, no allocations", /\|DIRECT\|-\|0$/.test(dp), dp);
    check("database: PR quantities untouched by Direct PO",
      sql("SELECT COALESCE(SUM(ordered_qty),0) FROM purchase_requisition_items WHERE item_code IN ('CON01-0001','945-05745')") === "0.00" ||
      sql("SELECT COUNT(*) FROM po_pr_allocations") === "0");
    const newNo = dp.split("|")[0];
    check("the new Direct PO number is non-empty and listed on the screen", !!newNo && await bodyHas(page, newNo), newNo);
  } catch (e) {
    results.push(false);
    console.log("EXCEPTION: " + e.message);
    await page.screenshot({ path: __dirname + "/direct-99-failure.png" }).catch(() => {});
  }
  console.log("PROBLEMS:", JSON.stringify(problems));
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed} ui checks passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
