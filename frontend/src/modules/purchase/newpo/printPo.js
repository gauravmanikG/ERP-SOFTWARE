import { formatDisplayDate } from "../../../shared/utils/dateFormat";
import { COMPANY_BLOCK } from "./ui";

// Printable purchase order, built from the PO detail (GET /api/new-po/pr/purchase-orders/{po}).
// It carries only PO information: no PR, department or requisitioner details. Opens a print window; nothing is saved.

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lines = (v) => esc(v || "").replace(/\n/g, "<br/>");
const money = (n) => (n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const qty = (n) => (n === null || n === undefined ? "" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
const date = (v) => (v ? formatDisplayDate(String(v).slice(0, 10)) : "");

// Terms that are printed by name (the code is never printed).
const OTHER_TERMS = [
  ["dispatch_through", "Dispatch through"], ["delivery_required", "Delivery required"], ["currency", "Currency"],
  ["conversion_rate", "Conversion rate"], ["insurance", "Insurance"], ["test_certificate", "Test certificate"],
  ["transporter", "Transporter"], ["bankers", "Bankers"], ["warranty", "Warranty"], ["kind_attention", "Kind attention"],
  ["dispatch_to", "Dispatch to"], ["packing_instructions", "Packing instructions"], ["terms_conditions", "Terms & conditions"]
];

export function printPo(po) {
  const names = po.termNames || {};
  const terms = po.terms || {};
  const lineRows = (po.lines || []).map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><b>${esc(l.itemCode)}</b><br/><span class="muted">${esc(l.itemName || l.description || "")}</span>${l.remarks ? `<br/><span class="muted">${esc(l.remarks)}</span>` : ""}</td>
      <td>${esc(l.hsnCode)}</td>
      <td class="r">${qty(l.quantity)}</td>
      <td>${esc(l.uom)}</td>
      <td class="r">${money(l.unitRate)}</td>
      <td class="r">${money(l.discountAmount)}</td>
      <td class="r">${money(l.taxableAmount)}</td>
      <td class="r">${qty(l.taxPercent)}%</td>
      <td class="r">${money(l.taxAmount)}</td>
      <td class="r"><b>${money(l.itemTotal)}</b></td>
      <td>${date(l.expectedDeliveryDate)}</td>
    </tr>`).join("");

  const total = (k, v) => (v === null || v === undefined ? "" : `<tr><td>${k}</td><td class="r">${money(v)}</td></tr>`);

  const termRows = [
    names.modeOfPayment && ["Mode of payment", names.modeOfPayment],
    names.paymentTerms && ["Payment terms", names.paymentTerms],
    names.creditPeriodFrom && ["Credit period calculated from", names.creditPeriodFrom],
    names.freight && ["Freight", names.freight + (terms.freight_amount !== null && terms.freight_amount !== undefined ? ` (${money(terms.freight_amount)})` : "")],
    ...OTHER_TERMS.filter(([k]) => terms[k] !== null && terms[k] !== undefined && terms[k] !== "").map(([k, label]) => [label, k === "delivery_required" ? date(terms[k]) : terms[k]])
  ].filter(Boolean);

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(po.poNumber)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0; letter-spacing: 1px; } .muted { color: #666; } .r { text-align: right; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .box { border: 1px solid #bbb; padding: 8px 10px; min-height: 70px; }
    .box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #555; }
    .refs td { border: 1px solid #bbb; padding: 4px 8px; } .refs td:first-child { background: #f3f3f3; font-weight: bold; width: 160px; }
    table.items { width: 100%; border-collapse: collapse; } table.items th, table.items td { border: 1px solid #bbb; padding: 5px 6px; vertical-align: top; }
    table.items th { background: #eee; text-align: left; }
    .totals { width: 320px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
    .totals td { border: none; border-bottom: 1px solid #ddd; padding: 3px 4px; } .grand td { font-size: 14px; font-weight: bold; border-top: 2px solid #111; }
    .terms td { border: 1px solid #ddd; padding: 4px 6px; } .terms td:first-child { width: 200px; color: #555; }
    .sign { display: flex; justify-content: space-between; margin-top: 60px; }
    @media print { body { margin: 10mm; } }
  </style></head><body>
    <div class="head">
      <div><h1>PURCHASE ORDER</h1></div>
      <div class="box" style="min-width:300px;min-height:0"><h3>Our details</h3>${lines(COMPANY_BLOCK)}</div>
    </div>

    <div class="grid">
      <div class="box"><h3>Invoice To</h3>${lines(po.invoiceTo || COMPANY_BLOCK)}</div>
      <div class="box"><h3>Ship To</h3>${lines(po.shipTo || COMPANY_BLOCK)}</div>
      <div class="box"><h3>Supplier</h3><b>${esc(po.vendorName)}</b> (${esc(po.vendorCode)})<br/>
        ${po.vendorAddress ? `${lines(po.vendorAddress)}<br/>` : ""}
        ${po.vendorGstin ? `GSTIN: ${esc(po.vendorGstin)}<br/>` : ""}${po.vendorPan ? `PAN: ${esc(po.vendorPan)}<br/>` : ""}
        ${esc([po.contactPerson, po.phone, po.email].filter(Boolean).join(" · "))}</div>
      <table class="refs" style="border-collapse:collapse;align-self:start">
        <tr><td>Voucher No.</td><td>${esc(po.voucherNo || po.poNumber)}</td></tr>
        <tr><td>Dated</td><td>${esc(date(po.poDate))}</td></tr>
        <tr><td>Reference No. &amp; Date</td><td>${esc(po.referenceNo || "")}${po.referenceDate ? ` &nbsp;·&nbsp; ${esc(date(po.referenceDate))}` : ""}</td></tr>
        <tr><td>PO status</td><td>${esc(po.status)}</td></tr>
      </table>
    </div>

    <table class="items">
      <thead><tr><th>#</th><th>Item</th><th>HSN</th><th class="r">Qty</th><th>Unit</th><th class="r">Rate</th><th class="r">Discount</th><th class="r">Taxable</th><th class="r">GST</th><th class="r">GST amt</th><th class="r">Total</th><th>Due on</th></tr></thead>
      <tbody>${lineRows}</tbody>
    </table>
    <table class="totals"><tbody>
      ${total("Items (gross)", po.itemsGross)}${total("Discount", po.totalDiscount)}${total("Taxable amount", po.taxableAmount)}${total("Total GST", po.totalTax)}
      ${total("Delivery charges", po.deliveryCharges)}${total("Other charges", po.otherCharges)}${total("Round off", po.roundOff)}
      <tr class="grand"><td>Grand total</td><td class="r">${money(po.grandTotal)}</td></tr>
    </tbody></table>

    ${termRows.length ? `<h3 style="margin:16px 0 4px">Terms</h3><table class="terms"><tbody>${termRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${lines(v)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${po.remarks ? `<p><b>Remarks:</b> ${esc(po.remarks)}</p>` : ""}
    <div class="sign"><div>Prepared by</div><div>Authorised signatory${po.approvedBy ? ` (${esc(po.approvedBy)})` : ""}</div></div>
    <script>window.onload = function () { window.print(); };<\/script>
  </body></html>`;

  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) throw new Error("The print window was blocked by the browser. Allow pop-ups for this site and try again.");
  w.document.open();
  w.document.write(html);
  w.document.close();
}
