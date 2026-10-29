package com.silvermuller.seals.modules.purchase.newpo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silvermuller.seals.modules.purchase.dto.PurchaseCalculationRequest;
import com.silvermuller.seals.modules.purchase.dto.PurchaseCalculationResponse;
import com.silvermuller.seals.modules.purchase.dto.PurchaseItemLine;
import com.silvermuller.seals.modules.purchase.dto.VendorExtraCharges;
import com.silvermuller.seals.modules.purchase.dto.VendorSummaryGroup;
import com.silvermuller.seals.modules.masters.PurchaseOrderTerms;
import com.silvermuller.seals.modules.masters.PurchaseOrderTermsService;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedLine;
import com.silvermuller.seals.modules.purchase.newpo.PoByPrDtos.PlannedPo;
import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import com.silvermuller.seals.modules.purchase.service.PurchaseProcessingService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Direct PO: purchasing items without a PR. No PR line is read, reserved or changed, and no allocation is written.
 * Vendor, item, effective rate, HSN/GST, numbering and status rules are the same as for PO by PR.
 * The PO carries po_origin = 'DIRECT', so every report can tell it apart from PO-by-PR and legacy POs.
 */
@Service
public class DirectPoService {

    /** One requested item. Duplicate item codes in one request are merged. */
    /** hsnCode is optional: when blank the Item Master HSN is used. The GST rate always comes from HSN Tax Master. */
    /** dueOn is optional: when blank the PO's expected delivery date is used. */
    public record Line(String itemCode, BigDecimal quantity, String hsnCode, LocalDate dueOn) {
        public Line(String itemCode, BigDecimal quantity, String hsnCode) {
            this(itemCode, quantity, hsnCode, null);
        }
        public Line(String itemCode, BigDecimal quantity) {
            this(itemCode, quantity, null, null);
        }
    }

    /**
     * PO Terms, as in the PO-by-PR conversion. The printed header (invoiceTo, shipTo, voucherNo, referenceNo) is
     * required on create; a blank voucherNo takes the PO number. deliveryFreight, terms and schedules are optional.
     * schedules are delivery lots per item (see DeliveryLots). directReason is why this PO bypasses PO by PR; required on create.
     */
    public record Request(String vendorCode, LocalDate poDate, LocalDate expectedDeliveryDate, List<Line> lines, String remarks,
                          BigDecimal deliveryFreight, PurchaseOrderTerms terms, List<DeliveryLots.Lot> schedules,
                          String invoiceTo, String shipTo, String voucherNo, String referenceNo,
                          BigDecimal otherCharges, BigDecimal roundOff, String directReason) {
        public Request(String vendorCode, LocalDate poDate, LocalDate expectedDeliveryDate, List<Line> lines, String remarks) {
            this(vendorCode, poDate, expectedDeliveryDate, lines, remarks, null, null, null, null, null, null, null, null, null, null);
        }
    }

    public record Created(String poNumber, String poId, PlannedPo po) {}

    private record Plan(PlannedPo po, List<PurchaseItemLine> calcItems, VendorSummaryGroup group) {}

    private final JdbcTemplate jdbc;
    private final PurchaseProcessingService purchaseProcessing;
    private final VendorRateService rates;
    private final ObjectMapper objectMapper;
    private final PurchaseOrderTermsService poTerms;

    public DirectPoService(JdbcTemplate jdbc, PurchaseProcessingService purchaseProcessing,
                           VendorRateService rates, ObjectMapper objectMapper, PurchaseOrderTermsService poTerms) {
        this.poTerms = poTerms;
        this.jdbc = jdbc;
        this.purchaseProcessing = purchaseProcessing;
        this.rates = rates;
        this.objectMapper = objectMapper;
    }

    /** Validates and prices the Direct PO without saving anything. */
    public PlannedPo preview(Request r) {
        return plan(r).po();
    }

    @Transactional
    public Created create(Request r, String actor) {
        if (actor == null || actor.isBlank()) {
            throw new NewPoException(HttpStatus.UNAUTHORIZED, "Missing current user (X-User-Name header).");
        }
        if (blank(r.invoiceTo())) throw bad("Invoice To is required.");
        if (blank(r.shipTo())) throw bad("Ship To is required.");
        if (blank(r.referenceNo())) throw bad("Reference No is required.");
        if (blank(r.directReason())) throw bad("Reason for Direct PO is required.");
        Plan plan = plan(r);
        String poNumber = purchaseProcessing.reservePoNumber();
        String poId = "PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        insert(poId, poNumber, plan, r, actor.trim());
        poTerms.save(poNumber, r.terms(), r.deliveryFreight());
        purchaseProcessing.saveDeliverySchedules(poNumber, DeliveryLots.toRows(poNumber, r.schedules()));
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                purchaseProcessing.loadOrdersFromDb();
            }
        });
        return new Created(poNumber, poId, plan.po());
    }

    /** Direct POs, read from the database on every call. */
    public List<Map<String, Object>> list() {
        return jdbc.queryForList(
                "SELECT po_number, po_date, vendor_code, vendor_name, status, grand_total, expected_delivery, created_at " +
                "FROM public.purchase_orders WHERE po_origin = 'DIRECT' ORDER BY created_at DESC, po_number DESC LIMIT 500");
    }

    private Plan plan(Request r) {
        String vendorCode = r.vendorCode() == null ? "" : r.vendorCode().trim();
        if (vendorCode.isEmpty()) throw bad("Select a vendor from the Vendor Master.");
        List<Map<String, Object>> sup = jdbc.queryForList("SELECT status FROM public.supplier_master WHERE supplier_code = ?", vendorCode);
        if (sup.isEmpty()) throw bad("Vendor " + vendorCode + " was not found in the Vendor Master.");
        if (!"ACTIVE".equalsIgnoreCase(String.valueOf(sup.get(0).get("status")))) throw bad("Vendor " + vendorCode + " is not active.");

        LocalDate poDate = r.poDate() == null ? LocalDate.now() : r.poDate();
        if (poDate.isBefore(LocalDate.now())) throw bad("PO date cannot be in the past. Select today or a future date.");
        if (r.expectedDeliveryDate() != null && r.expectedDeliveryDate().isBefore(poDate)) {
            throw bad("Expected delivery date cannot be before the PO date.");
        }
        if (r.lines() == null || r.lines().isEmpty()) throw bad("Add at least one item to the Direct PO.");
        Map<String, BigDecimal> poQtyByItem = new HashMap<>();
        for (Line l : r.lines()) {
            if (l != null && l.itemCode() != null && l.quantity() != null) poQtyByItem.merge(l.itemCode().trim(), l.quantity(), BigDecimal::add);
        }
        DeliveryLots.validate(r.schedules(), poQtyByItem, poDate);

        // Merge duplicate item codes; validate each quantity.
        Map<String, BigDecimal> qty = new LinkedHashMap<>();
        Map<String, String> hsnByCode = new LinkedHashMap<>();
        Map<String, LocalDate> dueByCode = new HashMap<>();
        for (Line l : r.lines()) {
            String code = l.itemCode() == null ? "" : l.itemCode().trim();
            if (code.isEmpty()) throw bad("Every line needs an item.");
            if (l.quantity() == null || l.quantity().signum() <= 0) throw bad("Quantity for " + code + " must be greater than zero.");
            if (l.quantity().scale() > 2) throw bad("Quantity for " + code + " can have at most 2 decimal places.");
            qty.merge(code, l.quantity(), BigDecimal::add);
            if (l.hsnCode() != null && !l.hsnCode().isBlank()) hsnByCode.putIfAbsent(code, l.hsnCode().trim());
            if (l.dueOn() != null) {
                if (l.dueOn().isBefore(poDate)) throw bad("Due on for " + code + " cannot be before the PO date.");
                dueByCode.merge(code, l.dueOn(), (a, b) -> a.isBefore(b) ? a : b);
            }
        }

        List<PurchaseItemLine> calcItems = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : qty.entrySet()) {
            String code = e.getKey();
            Map<String, Object> item = resolveItem(code).orElseThrow(() ->
                    new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY, "Item " + code + " is not in the Item Master."));
            long itemId = ((Number) item.get("id")).longValue();

            Map<String, Object> rate = rates.effectiveRate(vendorCode, itemId, poDate);
            if (rate == null) {
                throw new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY, "No vendor rate for " + code + " from " + vendorCode
                        + " is effective on " + poDate + ". Add the rate in Vendor Rate Master first.");
            }
            String masterHsn = item.get("hsn_code") == null ? null : String.valueOf(item.get("hsn_code")).trim();
            String hsn = hsnByCode.getOrDefault(code, (masterHsn == null || masterHsn.isEmpty()) ? null : masterHsn);
            if (hsn == null || hsn.isEmpty()) {
                throw new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY, "HSN code is missing for " + code + ". Enter the HSN on this line or add it in Item Master.");
            }
            Integer active = jdbc.queryForObject("SELECT COUNT(*) FROM public.hsn_tax_master WHERE hsn_sac_code = ? AND is_active = TRUE", Integer.class, hsn);
            if (active == null || active == 0) {
                throw new NewPoException(HttpStatus.UNPROCESSABLE_ENTITY, "HSN " + hsn + " for " + code + " has no active GST rate in HSN Tax Master.");
            }

            PurchaseItemLine line = new PurchaseItemLine();
            line.setItemCode(code);
            line.setItemName(item.get("description_size") == null ? code : String.valueOf(item.get("description_size")));
            line.setDescription(line.getItemName());
            line.setUom(item.get("uom") == null ? "PCS" : String.valueOf(item.get("uom")));
            line.setCategory("DIRECT");
            line.setVendorCode(vendorCode);
            line.setQuantity(e.getValue());
            line.setUnitRate((BigDecimal) rate.get("offered_unit_price"));
            line.setHsnCode(hsn);
            LocalDate due = dueByCode.getOrDefault(code, r.expectedDeliveryDate());
            line.setExpectedDeliveryDate(due == null ? null : due.toString());
            calcItems.add(line);
        }

        String termsError = poTerms.validate(r.terms());
        if (termsError != null) throw bad(termsError);
        if (r.deliveryFreight() != null && r.deliveryFreight().signum() < 0) throw bad("Freight amount cannot be negative.");

        PurchaseCalculationRequest calcRequest = new PurchaseCalculationRequest();
        calcRequest.setItems(calcItems);
        // Freight, other charges and round-off are the vendor group's charges, as in PO by PR.
        Map<String, VendorExtraCharges> vendorCharges = new HashMap<>();
        vendorCharges.put(vendorCode, new VendorExtraCharges(r.deliveryFreight(), r.otherCharges(), r.roundOff()));
        calcRequest.setVendorCharges(vendorCharges);
        PurchaseCalculationResponse calc = purchaseProcessing.calculate(calcRequest);
        if (calc.getVendorGroups() == null || calc.getVendorGroups().isEmpty()) {
            throw new NewPoException(HttpStatus.INTERNAL_SERVER_ERROR, "GST calculation returned no vendor summary.");
        }
        VendorSummaryGroup group = calc.getVendorGroups().get(0);
        List<PlannedLine> lines = new ArrayList<>();
        for (PurchaseItemLine l : calc.getItems()) {
            lines.add(new PlannedLine(l.getItemCode(), l.getItemName(), l.getUom(), l.getHsnCode(), l.getQuantity(), l.getUnitRate(),
                    l.getTaxPercent(), l.getTaxType(), l.getDiscountAmount(), l.getTaxableAmount(), l.getCgstAmount(), l.getSgstAmount(),
                    l.getIgstAmount(), l.getTaxAmount(), l.getItemTotal(), null));
        }
        PlannedPo po = new PlannedPo(vendorCode, group.getVendorName(), group.getVendorGstin(), poDate, lines, List.of(),
                group.getItemsGross(), group.getTotalDiscount(), group.getTaxableAmount(), group.getTotalTax(),
                group.getDeliveryFreight(), group.getOtherCharges(), group.getRoundOff(), group.getVendorTotal());
        return new Plan(po, calc.getItems(), group);
    }

    private void insert(String poId, String poNumber, Plan plan, Request r, String actor) {
        PlannedPo po = plan.po();
        VendorSummaryGroup g = plan.group();
        String detailsJson;
        try {
            detailsJson = objectMapper.writeValueAsString(plan.calcItems());
        } catch (Exception e) {
            throw new NewPoException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not serialise PO lines: " + e.getMessage());
        }
        try {
            jdbc.update(
                    "INSERT INTO public.purchase_orders (id, po_number, po_date, pr_number, pr_date, department, requested_by, " +
                    "vendor_code, vendor_name, vendor_gstin, vendor_pan, contact_person, phone, email, billing_address, shipping_address, " +
                    "payment_terms, status, items_gross, total_discount, taxable_amount, total_tax, delivery_charges, other_charges, " +
                    "round_off, grand_total, remarks, approved_by, approved_at, details_json, po_type, created_at, updated_at, po_origin, expected_delivery, " +
                    "invoice_to, ship_to, voucher_no, reference_no, reference_date, direct_po_reason) " +
                    "VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STANDARD', NOW(), NOW(), 'DIRECT', ?, ?, ?, ?, ?, ?, ?)",
                    poId, poNumber, po.poDate().toString(), actor,
                    po.vendorCode(), po.vendorName(), po.vendorGstin(), g.getVendorPan(), g.getContactPerson(), g.getPhone(), g.getEmail(),
                    PurchaseProcessingService.COMPANY_BILLING_ADDRESS,
                    g.getAddress() != null ? g.getAddress() : "Silver Muller Central Warehouse, Plant 1, Silvassa",
                    g.getPaymentTerms() != null ? g.getPaymentTerms() : "Net 30 Days from MRN",
                    po.itemsGross(), po.totalDiscount(), po.taxableAmount(), po.totalTax(), po.deliveryCharges(), po.otherCharges(),
                    po.roundOff(), po.grandTotal(), r.remarks() == null ? "Direct PO" : "Direct PO: " + r.remarks().trim(),
                    actor, LocalDate.now().toString(), detailsJson,
                    r.expectedDeliveryDate() == null ? null : java.sql.Date.valueOf(r.expectedDeliveryDate()),
                    r.invoiceTo().trim(), r.shipTo().trim(),
                    blank(r.voucherNo()) ? poNumber : r.voucherNo().trim(), r.referenceNo().trim(),
                    java.sql.Date.valueOf(po.poDate()), r.directReason().trim());
        } catch (DataIntegrityViolationException e) {
            throw new NewPoException(HttpStatus.CONFLICT, "PO number " + poNumber + " was already used. Try again.");
        }
    }

    private Optional<Map<String, Object>> resolveItem(String code) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, sms_new_part_no, description_size, uom, hsn_code FROM public.item_master " +
                "WHERE sms_new_part_no = ? OR old_code = ? ORDER BY (sms_new_part_no = ?) DESC, id LIMIT 1", code, code, code);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    private static NewPoException bad(String message) {
        return new NewPoException(HttpStatus.BAD_REQUEST, message);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
