// Creates and approves one PR on the TEST copy (backend 4100) with two lines, and adds the vendor rate. Prints PR number.
const BASE = "http://localhost:4100";
const J = { "Content-Type": "application/json" };
(async () => {
  for (const itemId of [1611, 1612]) {
    await fetch(BASE + "/api/new-po/vendor-rates", { method: "POST", headers: { ...J, "X-User-Name": "setup" }, body: JSON.stringify({ supplierCode: "SUP-002", itemId, offeredUnitPrice: 100, effectiveFrom: "2026-10-01" }) });
  }
  const pr = await fetch(BASE + "/api/purchase/requisitions", { method: "POST", headers: J, body: JSON.stringify({
    prDate: "2026-10-19", requiredDate: "2026-10-26", requisitioner: "ui-flow", department: "Production", status: "Draft",
    items: [
      { itemCode: "CON01-0001", itemName: "CON01-0098 Shim BC1203", uom: "PCS", reqQty: 100, category: "FG", hsnCode: "84669390", requiredByDate: "2026-10-26" },
      { itemCode: "CON01-0002", itemName: "CON01-0099", uom: "PCS", reqQty: 40, category: "FG", hsnCode: "84669390", requiredByDate: "2026-10-26" }] }) }).then((r) => r.json());
  await fetch(`${BASE}/api/purchase/requisitions/${pr.prNumber}/status`, { method: "PUT", headers: J, body: JSON.stringify({ status: "Approved", user: "ui-flow-approver" }) });
  console.log(pr.prNumber);
})().catch((e) => { console.error(e); process.exit(1); });
