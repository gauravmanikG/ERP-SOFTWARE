// Real backend restart test for PO numbering (isolated test database, port 4100).
// 1) create POs, 2) stop and start the backend process, 3) create more POs including concurrent ones.
// Checks: numbers strictly increase across the restart, all numbers are unique, every number is stored once.
const { execFileSync, spawnSync } = require("child_process");
const BASE = "http://localhost:4100/api/new-po";
const H = { "Content-Type": "application/json", "X-User-Name": "numbering-test" };
const PSQL = "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const sql = (q) => execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q], { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} - ${n}${d ? " :: " + d : ""}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: H, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => null) };
}
async function health() {
  for (let i = 0; i < 60; i++) { try { const r = await fetch("http://localhost:4100/api/health"); if (r.ok) return true; } catch (e) {} await wait(3000); }
  return false;
}
// PR lines 143..152 are orderable on the test copy (CON01 items, approved PRs); each is ordered once.
const lineIds = [142, 143, 150, 151, 152]; // PR lines priced by the two rates above

(async () => {
  await post("/vendor-rates", { supplierCode: "SUP-002", itemId: 1611, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" });
  await post("/vendor-rates", { supplierCode: "SUP-002", itemId: 1612, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" });

  const before = [];
  for (const id of lineIds.slice(0, 3)) {
    const r = await post("/pr/purchase-orders", { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: id }] });
    if (r.status === 201) before.push(r.data.poNumber);
  }
  check("created POs before the restart", before.length === 3, before.join(","));
  const maxBefore = Math.max(...before.map((p) => Number(p.slice(8))));

  // Real restart of the backend process on port 4100.
  for (const pid of execFileSync("cmd", ["/c", "netstat -ano | findstr :4100 | findstr LISTENING"], { encoding: "utf8" }).split("\n").map((l) => l.trim().split(/\s+/).pop()).filter(Boolean)) {
    try { execFileSync("taskkill", ["/PID", pid, "/F"], { stdio: "ignore" }); } catch (e) {}
  }
  await wait(4000);
  check("backend stopped", (await fetch("http://localhost:4100/api/health").then(() => true).catch(() => false)) === false);
  spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", process.env.START_SCRIPT], { stdio: "ignore", timeout: 2000 });
  check("backend restarted and healthy", await health());

  const after = [];
  const results2 = await Promise.all(lineIds.slice(3).map((id) =>
    post("/pr/purchase-orders", { vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: id }] })));
  for (const r of results2) if (r.status === 201) after.push(r.data.poNumber);
  check("POs created after the restart, concurrently", after.length === 2, `${after.length} created of 2 attempts`);
  check("every number after the restart is above the numbers before it",
    after.every((p) => Number(p.slice(8)) > maxBefore), `before max ${maxBefore}, after ${after.join(",")}`);
  const all = [...before, ...after];
  check("all numbers are distinct", new Set(all).size === all.length);
  const stored = Number(sql(`SELECT COUNT(*) FROM purchase_orders WHERE po_number IN (${all.map((p) => `'${p}'`).join(",")})`));
  check("every number is stored exactly once in purchase_orders", stored === all.length, `${stored} of ${all.length}`);

  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("crashed", e); process.exit(2); });
