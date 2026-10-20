// Checks that the existing PR save endpoint still works for PRs without PO-by-PR orders,
// and refuses (without changing anything) to replace items of a PR that PO by PR has ordered.
const { execFileSync } = require("child_process");
const BASE = "http://localhost:4100";
const H = { "Content-Type": "application/json", "X-User-Name": "pr-guard-check" };
const PSQL = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const sql = (q) => execFileSync(PSQL, ["-h", "localhost", "-p", "5434", "-U", "postgres", "-d", "sms_seals_test", "-At", "-c", q],
  { env: { ...process.env, PGPASSWORD: "postgres" }, encoding: "utf8" }).trim();
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`); };

(async () => {
  // Order PR-2026-00031 line 142 through the new flow.
  await fetch(`${BASE}/api/new-po/vendor-rates`, { method: "POST", headers: H, body: JSON.stringify({ supplierCode: "SUP-002", itemId: 1611, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" }) });
  const po = await fetch(`${BASE}/api/new-po/pr/purchase-orders`, { method: "POST", headers: H, body: JSON.stringify({ vendorCode: "SUP-002", poDate: "2026-10-19", mode: "FULL", lines: [{ prItemId: 142 }] }) });
  check("PO raised on PR-2026-00031 line 142", po.status === 201, String(po.status));

  // 1. Edit of the ordered PR must be refused and must change nothing.
  const before = await (await fetch(`${BASE}/api/purchase/requisitions/PR-2026-00031`)).json();
  const edited = { ...before, remarks: "edited by pr-guard-check" };
  const refused = await fetch(`${BASE}/api/purchase/requisitions`, { method: "POST", headers: H, body: JSON.stringify(edited) });
  const refusedBody = await refused.text();
  check("edit of an ordered PR is refused (409)", refused.status === 409, `status ${refused.status}`);
  check("refusal explains why", /PO by PR/.test(refusedBody), refusedBody.slice(0, 160));
  const after = await (await fetch(`${BASE}/api/purchase/requisitions/PR-2026-00031`)).json();
  check("refused edit leaves PR remarks unchanged", after.remarks === before.remarks, `remarks='${after.remarks}'`);
  check("refused edit keeps item ids and ordered quantity",
    sql("SELECT string_agg(id::text || ':' || ordered_qty::text, ',' ORDER BY id) FROM purchase_requisition_items WHERE pr_number='PR-2026-00031'").includes("142:20.00"));

  // 2. Editing a PR with no PO-by-PR orders still works, exactly as before.
  const untouched = await (await fetch(`${BASE}/api/purchase/requisitions/PR-2026-00033`)).json();
  const saved = await fetch(`${BASE}/api/purchase/requisitions`, { method: "POST", headers: H, body: JSON.stringify({ ...untouched, remarks: "edited by pr-guard-check" }) });
  check("edit of a PR with no PO-by-PR orders still saves", saved.status === 200, `status ${saved.status}`);
  const savedPr = await (await fetch(`${BASE}/api/purchase/requisitions/PR-2026-00033`)).json();
  check("that edit is persisted", savedPr.remarks === "edited by pr-guard-check");

  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("crashed", e); process.exit(2); });
