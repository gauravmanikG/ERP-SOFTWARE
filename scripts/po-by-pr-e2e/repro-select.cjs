// READ-ONLY reproduction against the live app (5173 -> 4000): open PO by PR, pick vendor and item, inspect PR lines.
const puppeteer = require("puppeteer-core");
const path = require("path");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function byText(page, text, tag = "*") {
  const [h] = await page.$$(`xpath/.//${tag}[normalize-space(text())="${text}"]`);
  if (!h) throw new Error(`not found: "${text}"`);
  return h;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox", "--window-size=1440,1000"], defaultViewport: { width: 1440, height: 1000 } });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle2", timeout: 60000 });
  await wait(1200);
  (await byText(page, "Purchase")).hover(); await wait(600);
  (await byText(page, "New Purchase Order")).hover(); await wait(600);
  (await byText(page, "PO by PR")).click(); await wait(1500);
  const v = await page.$('input[placeholder="Search vendor name or code"]');
  await v.click(); await v.type("A.V.SALES", { delay: 25 }); await wait(900);
  (await page.$$("xpath/.//div[normalize-space(text())='A.V.SALES CORPORATION']"))[0].click(); await wait(500);
  const i = await page.$('input[placeholder="Search item code or name"]');
  await i.click(); await i.type("CON01-0001", { delay: 25 }); await wait(900);
  (await page.$$("xpath/.//div[normalize-space(text())='CON01-0001']"))[0].click(); await wait(1500);
  const info = await page.evaluate(() => ({
    rows: Array.from(document.querySelectorAll("tbody tr")).map((r) => r.innerText.replace(/\s+/g, " ").slice(0, 200)),
    checkboxes: Array.from(document.querySelectorAll('input[type="checkbox"]')).map((c) => ({ disabled: c.disabled })),
    notice: document.body.innerText.includes("No rate on this date")
  }));
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: path.join(__dirname, "repro-live-po-by-pr.png") });
  await browser.close();
})().catch((e) => { console.error("FAILED", e.message); process.exit(1); });
