package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.purchase.newpo.DeliveryLots;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService;
import com.silvermuller.seals.modules.inventory.model.SupplierMaster;
import com.silvermuller.seals.modules.inventory.repository.SupplierMasterRepository;
import com.silvermuller.seals.modules.purchase.dto.*;
import com.silvermuller.seals.modules.purchase.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Standard POs: pricing, cancellation and delivery schedules. POs are read from purchase_orders on every call; there
 * is no in-memory copy, so every server instance and every request sees the committed state.
 */
@Service
public class PurchaseProcessingService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseProcessingService.class);

    private final SupplierMasterRepository supplierRepository;
    private final PurchaseRequisitionService prService;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public static final String COMPANY_BILLING_ADDRESS =
            "Silver Muller Seals Ltd, Plot 42, GIDC Sector 3, Silvassa, D&NH - 396230. GSTIN: 24AAACS1234D1Z5";

    public PurchaseProcessingService(SupplierMasterRepository supplierRepository,
                                     PurchaseRequisitionService prService,
                                     JdbcTemplate jdbc,
                                     ObjectMapper objectMapper) {
        this.supplierRepository = supplierRepository;
        this.prService = prService;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public PurchaseCalculationResponse calculate(PurchaseCalculationRequest request) {
        PurchaseCalculationResponse response = new PurchaseCalculationResponse();
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return response;
        }

        Map<String, List<PurchaseItemLine>> byVendor = new LinkedHashMap<>();
        BigDecimal grandGross = BigDecimal.ZERO;
        BigDecimal grandDiscount = BigDecimal.ZERO;
        BigDecimal grandTaxable = BigDecimal.ZERO;
        BigDecimal grandTax = BigDecimal.ZERO;

        for (PurchaseItemLine item : request.getItems()) {
            BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
            BigDecimal rate = item.getUnitRate() != null ? item.getUnitRate() : BigDecimal.ZERO;
            BigDecimal gross = qty.multiply(rate).setScale(2, RoundingMode.HALF_UP);

            BigDecimal discPct = item.getDiscountPercent() != null ? item.getDiscountPercent() : BigDecimal.ZERO;
            BigDecimal manualDisc = item.getManualDiscount() != null ? item.getManualDiscount() : BigDecimal.ZERO;
            BigDecimal pctDiscAmt = gross.multiply(discPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal totalDisc = pctDiscAmt.add(manualDisc).min(gross);

            BigDecimal taxable = gross.subtract(totalDisc);

            // 1. Resolve HSN Code from Item Master if missing
            if ((item.getHsnCode() == null || item.getHsnCode().trim().isEmpty()) && item.getItemCode() != null) {
                try {
                    List<Map<String, Object>> itemRows = jdbc.queryForList(
                        "SELECT hsn_code FROM public.item_master WHERE sms_new_part_no = ? OR old_code = ? ORDER BY id LIMIT 1",
                        item.getItemCode().trim(), item.getItemCode().trim());
                    if (!itemRows.isEmpty() && itemRows.get(0).get("hsn_code") != null) {
                        item.setHsnCode(itemRows.get(0).get("hsn_code").toString().trim());
                    }
                } catch (Exception ignored) {}
            }

            // 2. Resolve Tax Rate & Description from hsn_tax_master if HSN code exists
            if (item.getHsnCode() != null && !item.getHsnCode().trim().isEmpty()) {
                try {
                    List<Map<String, Object>> hsnRows = jdbc.queryForList(
                        "SELECT description, gst_rate FROM public.hsn_tax_master WHERE hsn_sac_code = ? AND is_active = TRUE LIMIT 1",
                        item.getHsnCode().trim());
                    if (!hsnRows.isEmpty()) {
                        if (item.getHsnDescription() == null || item.getHsnDescription().trim().isEmpty()) {
                            item.setHsnDescription(hsnRows.get(0).get("description").toString());
                        }
                        if (item.getTaxPercent() == null || item.getTaxPercent().compareTo(BigDecimal.ZERO) == 0) {
                            Object r = hsnRows.get(0).get("gst_rate");
                            if (r != null) {
                                item.setTaxPercent(new BigDecimal(r.toString()));
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : new BigDecimal("18.00");
            BigDecimal taxAmt = taxable.multiply(taxPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

            // 3. Determine Intra-State vs Inter-State based on Vendor GSTIN state
            String vCode = item.getVendorCode() != null && !item.getVendorCode().trim().isEmpty() ? item.getVendorCode().trim() : "UNASSIGNED";
            boolean isInterState = false;
            Optional<SupplierMaster> optSupplier = supplierRepository.findBySupplierCode(vCode);
            if (optSupplier.isPresent()) {
                SupplierMaster sup = optSupplier.get();
                String gstin = sup.getGstin();
                if (gstin != null && gstin.trim().length() >= 2) {
                    String statePrefix = gstin.trim().substring(0, 2);
                    // Company state code is 27 (Maharashtra - Silver Muller Seals)
                    isInterState = !"27".equals(statePrefix);
                }
            } else if ("IGST".equalsIgnoreCase(item.getTaxType())) {
                isInterState = true;
            }

            // 4. Split Sub-Taxes: CGST & SGST vs IGST
            if (isInterState) {
                item.setTaxType("IGST");
                item.setIgstRate(taxPct);
                item.setIgstAmount(taxAmt);
                item.setCgstRate(BigDecimal.ZERO);
                item.setCgstAmount(BigDecimal.ZERO);
                item.setSgstRate(BigDecimal.ZERO);
                item.setSgstAmount(BigDecimal.ZERO);
            } else {
                item.setTaxType("GST");
                BigDecimal halfRate = taxPct.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                BigDecimal halfTax = taxAmt.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                item.setCgstRate(halfRate);
                item.setCgstAmount(halfTax);
                item.setSgstRate(halfRate);
                item.setSgstAmount(taxAmt.subtract(halfTax)); // Avoids 1-paisa rounding error
                item.setIgstRate(BigDecimal.ZERO);
                item.setIgstAmount(BigDecimal.ZERO);
            }

            BigDecimal addChg = item.getOtherCharges() != null ? item.getOtherCharges() : BigDecimal.ZERO;
            BigDecimal itemTotal = taxable.add(taxAmt).add(addChg);

            item.setGrossAmount(gross);
            item.setDiscountAmount(totalDisc);
            item.setTaxableAmount(taxable);
            item.setTaxAmount(taxAmt);
            item.setItemTotal(itemTotal);

            grandGross = grandGross.add(gross);
            grandDiscount = grandDiscount.add(totalDisc);
            grandTaxable = grandTaxable.add(taxable);
            grandTax = grandTax.add(taxAmt);

            byVendor.computeIfAbsent(vCode, k -> new ArrayList<>()).add(item);
        }

        response.setItems(request.getItems());
        response.setGrandGross(grandGross);
        response.setGrandDiscount(grandDiscount);
        response.setGrandTaxable(grandTaxable);
        response.setGrandTax(grandTax);

        List<VendorSummaryGroup> groups = new ArrayList<>();
        BigDecimal grandDelivery = BigDecimal.ZERO;
        BigDecimal grandOtherCharges = BigDecimal.ZERO;
        BigDecimal grandRoundOff = BigDecimal.ZERO;
        BigDecimal grandTotal = BigDecimal.ZERO;

        for (Map.Entry<String, List<PurchaseItemLine>> entry : byVendor.entrySet()) {
            String vCode = entry.getKey();
            List<PurchaseItemLine> vItems = entry.getValue();

            VendorSummaryGroup group = new VendorSummaryGroup();
            group.setVendorCode(vCode);
            group.setVendorName(vItems.get(0).getVendorName());
            group.setItems(vItems);

            Optional<SupplierMaster> optSupplier = supplierRepository.findBySupplierCode(vCode);
            if (optSupplier.isPresent()) {
                SupplierMaster s = optSupplier.get();
                group.setVendorName(s.getSupplierName());
                group.setVendorGstin(s.getGstin());
                group.setVendorPan(s.getPan());
                group.setContactPerson(s.getContactPerson());
                group.setPhone(s.getPhone());
                group.setEmail(s.getEmail());
                group.setAddress(formatAddress(s));
                group.setPaymentTerms(s.getPaymentTermsId());
            }

            if (!vItems.isEmpty() && vItems.get(0).getSourceQuotationNumber() != null) {
                try {
                    List<Map<String, Object>> qRows = jdbc.queryForList("SELECT payment_terms FROM vendor_quotations WHERE quotation_number = ?", vItems.get(0).getSourceQuotationNumber());
                    if (!qRows.isEmpty()) {
                        Object pt = qRows.get(0).get("payment_terms");
                        if (pt != null && !pt.toString().trim().isEmpty()) {
                            group.setPaymentTerms(pt.toString().trim());
                        }
                    }
                } catch (Exception ignored) {}
            }

            BigDecimal vGross = BigDecimal.ZERO;
            BigDecimal vDisc = BigDecimal.ZERO;
            BigDecimal vTaxable = BigDecimal.ZERO;
            BigDecimal vTax = BigDecimal.ZERO;
            BigDecimal vCgst = BigDecimal.ZERO;
            BigDecimal vSgst = BigDecimal.ZERO;
            BigDecimal vIgst = BigDecimal.ZERO;
            boolean vendorInterState = false;

            for (PurchaseItemLine it : vItems) {
                vGross = vGross.add(it.getGrossAmount());
                vDisc = vDisc.add(it.getDiscountAmount());
                vTaxable = vTaxable.add(it.getTaxableAmount());
                vTax = vTax.add(it.getTaxAmount());
                vCgst = vCgst.add(it.getCgstAmount());
                vSgst = vSgst.add(it.getSgstAmount());
                vIgst = vIgst.add(it.getIgstAmount());
                if ("IGST".equalsIgnoreCase(it.getTaxType()) || it.getIgstAmount().compareTo(BigDecimal.ZERO) > 0) {
                    vendorInterState = true;
                }
            }
            group.setItemsGross(vGross);
            group.setTotalDiscount(vDisc);
            group.setTaxableAmount(vTaxable);
            group.setTotalTax(vTax);
            group.setCgstAmount(vCgst);
            group.setSgstAmount(vSgst);
            group.setIgstAmount(vIgst);
            group.setIsInterState(vendorInterState);
            group.setTaxSummaryText(vendorInterState 
                ? "Inter-State (IGST 100%)" 
                : "Intra-State (CGST 50% + SGST 50%)");

            BigDecimal deliv = BigDecimal.ZERO;
            BigDecimal other = BigDecimal.ZERO;
            BigDecimal rOff = BigDecimal.ZERO;

            if (request.getVendorCharges() != null && request.getVendorCharges().containsKey(vCode)) {
                VendorExtraCharges vc = request.getVendorCharges().get(vCode);
                if (vc.getDeliveryFreight() != null) deliv = vc.getDeliveryFreight();
                if (vc.getOtherCharges() != null) other = vc.getOtherCharges();
                if (vc.getRoundOff() != null) rOff = vc.getRoundOff();
                if (vc.getPoType() != null) group.setPoType(vc.getPoType());
                if (vc.getDeliverySchedules() != null) group.setDeliverySchedules(vc.getDeliverySchedules());
                if (vc.getPaymentMilestones() != null) group.setPaymentMilestones(vc.getPaymentMilestones());
            }

            group.setDeliveryFreight(deliv);
            group.setOtherCharges(other);
            group.setRoundOff(rOff);

            BigDecimal vTotal = vTaxable.add(vTax).add(deliv).add(other).add(rOff);
            group.setVendorTotal(vTotal.setScale(2, RoundingMode.HALF_UP));

            groups.add(group);

            grandDelivery = grandDelivery.add(deliv);
            grandOtherCharges = grandOtherCharges.add(other);
            grandRoundOff = grandRoundOff.add(rOff);
            grandTotal = grandTotal.add(vTotal);
        }

        BigDecimal grandCgst = BigDecimal.ZERO;
        BigDecimal grandSgst = BigDecimal.ZERO;
        BigDecimal grandIgst = BigDecimal.ZERO;
        for (VendorSummaryGroup g : groups) {
            grandCgst = grandCgst.add(g.getCgstAmount());
            grandSgst = grandSgst.add(g.getSgstAmount());
            grandIgst = grandIgst.add(g.getIgstAmount());
        }

        response.setGrandCgst(grandCgst);
        response.setGrandSgst(grandSgst);
        response.setGrandIgst(grandIgst);
        response.setVendorGroups(groups);
        response.setGrandDelivery(grandDelivery);
        response.setGrandOtherCharges(grandOtherCharges);
        response.setGrandRoundOff(grandRoundOff);
        response.setGrandTotal(grandTotal.setScale(2, RoundingMode.HALF_UP));

        return response;
    }

    private String formatAddress(SupplierMaster s) {
        StringBuilder sb = new StringBuilder();
        if (s.getAddress() != null && !s.getAddress().trim().isEmpty()) sb.append(s.getAddress().trim());
        if (s.getCity() != null && !s.getCity().trim().isEmpty()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(s.getCity().trim());
        }
        if (s.getState() != null && !s.getState().trim().isEmpty()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(s.getState().trim());
        }
        if (s.getPincode() != null && !s.getPincode().trim().isEmpty()) {
            if (sb.length() > 0) sb.append(" - ");
            sb.append(s.getPincode().trim());
        }
        return sb.toString();
    }

    /** Next PO number (PO-YEAR-NNNNN, restarting each year). Every PO creation path uses it; see DocumentNumbers. */
    public String reservePoNumber() {
        return DocumentNumbers.next(jdbc, DocumentNumbers.Doc.PO);
    }

    /** The number the next PO will get, shown before saving. Nothing is reserved. */
    public String peekPoNumber() {
        return DocumentNumbers.peek(jdbc, DocumentNumbers.Doc.PO);
    }

    /**
     * Cancels a PO and releases its PR quantities, all in one transaction. The PO row is locked first, so a GRN being
     * posted against the same PO either finishes before this (and blocks the cancel) or waits and then sees it cancelled.
     */
    @Transactional
    public PurchaseOrder cancelPurchaseOrder(String poNumberOrId, String user, String reason) {
        PurchaseOrder po = getPurchaseOrder(poNumberOrId)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found: " + poNumberOrId));
        Map<String, Object> locked = jdbc.queryForMap(
                "SELECT status, remarks FROM public.purchase_orders WHERE po_number = ? FOR UPDATE", po.getPoNumber());
        if ("CANCELLED".equalsIgnoreCase((String) locked.get("status"))) {
            throw new IllegalArgumentException("Purchase Order " + poNumberOrId + " is already cancelled. Quantities cannot be restored again.");
        }
        // POs with PR allocations (raised through PO by PR, or older POs linked to their PR lines) must be cancelled
        // through the PO-by-PR endpoint, which releases exactly the quantities their allocations reserved. This
        // legacy path would release to po.prNumber instead.
        Integer raised = jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ?", Integer.class, po.getPoNumber());
        if (raised != null && raised > 0) {
            throw new ConflictException("PO " + po.getPoNumber() + " is linked to PR lines. Cancel it with POST /api/new-po/pr/purchase-orders/"
                    + po.getPoNumber() + "/cancel; it was not changed here.");
        }
        // Shared rule for every PO type: a PO with any posted receipt (accepted or rejected) cannot be cancelled.
        Integer posted = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.goods_receipt_note_items gi JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "WHERE gi.po_number = ? AND n.status = 'POSTED' AND gi.received_qty > 0", Integer.class, po.getPoNumber());
        if (posted != null && posted > 0) {
            throw new ConflictException("PO " + po.getPoNumber() + " has posted receipts and cannot be cancelled. Receipt reversal is not supported yet; it was not changed.");
        }
        String actor = (user != null && !user.trim().isEmpty()) ? user : "Purchase Manager";
        String r = (reason != null && !reason.trim().isEmpty()) ? reason : "Order cancelled";
        String currentRemarks = (String) locked.get("remarks");
        String remarks = (currentRemarks != null ? currentRemarks + " | " : "") + "Cancelled by " + actor + ": " + r;
        jdbc.update("UPDATE public.purchase_orders SET status = 'CANCELLED', remarks = ?, updated_at = NOW() WHERE po_number = ?",
                remarks, po.getPoNumber());
        po.setStatus("CANCELLED");
        po.setRemarks(remarks);

        // RELEASE PR QUANTITIES BACK TO PR (supporting multi-PR line items)!
        if (po.getItems() != null) {
            for (PurchaseItemLine it : po.getItems()) {
                String targetPr = (it.getPrNumber() != null && !it.getPrNumber().trim().isEmpty()) ? it.getPrNumber().trim() : po.getPrNumber();
                if (targetPr != null) {
                    BigDecimal qtyToRelease = it.getQuantity() != null ? it.getQuantity().negate() : BigDecimal.ZERO;
                    prService.updateItemOrderedQty(targetPr, it.getItemCode(), qtyToRelease);
                }
            }
        }

        return po;
    }

    /**
     * Does nothing. POs used to be cached in memory and this reloaded the cache; they are now read from the database
     * on every call, so there is nothing to reload. Kept because DirectPoService still calls it after a commit.
     */
    @Deprecated
    public void loadOrdersFromDb() {
    }

    /** Every PO, newest first (PO numbers are issued in increasing sequence). Read from the database on every call. */
    public List<PurchaseOrder> getAllPurchaseOrders() {
        return jdbc.query("SELECT * FROM public.purchase_orders ORDER BY po_number COLLATE \"C\" DESC", this::mapPurchaseOrder);
    }

    /** A PO by PO number or internal id (exact match first, then ignoring case), with its delivery schedules. */
    public Optional<PurchaseOrder> getPurchaseOrder(String poNumberOrId) {
        if (poNumberOrId == null) return Optional.empty();
        List<PurchaseOrder> found = jdbc.query(
                "SELECT * FROM public.purchase_orders WHERE po_number = ? OR id = ? ORDER BY (po_number = ?) DESC LIMIT 1",
                this::mapPurchaseOrder, poNumberOrId, poNumberOrId, poNumberOrId);
        if (found.isEmpty()) {
            found = jdbc.query(
                    "SELECT * FROM public.purchase_orders WHERE lower(po_number) = lower(?) OR lower(id) = lower(?) ORDER BY po_number LIMIT 1",
                    this::mapPurchaseOrder, poNumberOrId, poNumberOrId);
        }
        if (found.isEmpty()) return Optional.empty();
        PurchaseOrder po = found.get(0);
        po.setDeliverySchedules(getDeliverySchedules(po.getPoNumber()));
        return Optional.of(po);
    }

    private PurchaseOrder mapPurchaseOrder(ResultSet rs, int rowNum) throws SQLException {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(rs.getString("id"));
        po.setPoNumber(rs.getString("po_number"));
        po.setPoDate(rs.getString("po_date"));
        po.setPrNumber(rs.getString("pr_number"));
        po.setPrDate(rs.getString("pr_date"));
        po.setDepartment(rs.getString("department"));
        po.setRequestedBy(rs.getString("requested_by"));
        po.setVendorCode(rs.getString("vendor_code"));
        po.setVendorName(rs.getString("vendor_name"));
        po.setVendorGstin(rs.getString("vendor_gstin"));
        po.setVendorPan(rs.getString("vendor_pan"));
        po.setContactPerson(rs.getString("contact_person"));
        po.setPhone(rs.getString("phone"));
        po.setEmail(rs.getString("email"));
        po.setBillingAddress(rs.getString("billing_address"));
        po.setShippingAddress(rs.getString("shipping_address"));
        po.setPaymentTerms(rs.getString("payment_terms"));
        po.setDeliveryDate(rs.getString("delivery_date"));
        po.setDeliveryLocation(rs.getString("delivery_location"));
        po.setStatus(rs.getString("status"));
        po.setItemsGross(rs.getBigDecimal("items_gross"));
        po.setTotalDiscount(rs.getBigDecimal("total_discount"));
        po.setTaxableAmount(rs.getBigDecimal("taxable_amount"));
        po.setTotalTax(rs.getBigDecimal("total_tax"));
        po.setDeliveryCharges(rs.getBigDecimal("delivery_charges"));
        po.setOtherCharges(rs.getBigDecimal("other_charges"));
        po.setRoundOff(rs.getBigDecimal("round_off"));
        po.setGrandTotal(rs.getBigDecimal("grand_total"));
        po.setRemarks(rs.getString("remarks"));
        po.setApprovedBy(rs.getString("approved_by"));
        po.setApprovedAt(rs.getString("approved_at"));
        po.setSourceQuotationNumber(rs.getString("source_quotation_number"));
        po.setSourceQuotationId(rs.getLong("source_quotation_id"));

        po.setPoType(rs.getString("po_type") != null ? rs.getString("po_type") : "STANDARD");
        po.setIncoterms(rs.getString("incoterms") != null ? rs.getString("incoterms") : "FOR Destination");
        po.setFreightTerms(rs.getString("freight_terms") != null ? rs.getString("freight_terms") : "Included in Price");
        po.setDeliveryMode(rs.getString("delivery_mode") != null ? rs.getString("delivery_mode") : "Road Transport");
        po.setCreditPeriod(rs.getObject("credit_period") != null ? rs.getInt("credit_period") : 30);
        po.setRevisionNumber(rs.getObject("revision_number") != null ? rs.getInt("revision_number") : 0);
        java.sql.Date validityRaw = rs.getDate("validity_date");
        po.setValidityDate(validityRaw != null ? validityRaw.toLocalDate().toString() : null);

        String json = rs.getString("details_json");
        if (json != null && !json.trim().isEmpty()) {
            try {
                po.setItems(objectMapper.readValue(json, new TypeReference<List<PurchaseItemLine>>() {}));
            } catch (Exception ex) {
                // One unreadable PO must not break every PO list; it shows without lines and the problem is logged.
                log.warn("PO {} has unreadable line details and is shown without lines: {}", po.getPoNumber(), ex.getMessage());
                po.setItems(new ArrayList<>());
            }
        }
        return po;
    }

    public List<PurchaseOrderDeliverySchedule> getDeliverySchedules(String poNumber) {
        String sql = "SELECT id, po_number, item_code, lot_number, scheduled_date, scheduled_qty, received_qty, balance_qty, destination_store, status, created_at, updated_at " +
                     "FROM public.purchase_order_delivery_schedules WHERE po_number = ? ORDER BY lot_number ASC, scheduled_date ASC";
        return jdbc.query(sql, (rs, rowNum) -> {
            PurchaseOrderDeliverySchedule s = new PurchaseOrderDeliverySchedule();
            s.setId(rs.getLong("id"));
            s.setPoNumber(rs.getString("po_number"));
            s.setItemCode(rs.getString("item_code"));
            s.setLotNumber(rs.getInt("lot_number"));
            if (rs.getDate("scheduled_date") != null) {
                s.setScheduledDate(rs.getDate("scheduled_date").toLocalDate());
            }
            s.setScheduledQty(rs.getBigDecimal("scheduled_qty"));
            s.setReceivedQty(rs.getBigDecimal("received_qty"));
            s.setBalanceQty(rs.getBigDecimal("balance_qty"));
            s.setDestinationStore(rs.getString("destination_store"));
            s.setStatus(rs.getString("status"));
            return s;
        }, poNumber);
    }

    /**
     * Replaces the delivery lots of a PO, in one transaction with the PO row locked. Lots are checked against the PO
     * (see DeliveryLots.validate) and numbered per item in date order, lot 1 being the earliest. Received quantities
     * are never taken from the request: they are worked out again from the PO's posted GRNs.
     */
    @Transactional
    public void saveDeliverySchedules(String poNumber, List<PurchaseOrderDeliverySchedule> schedules) {
        List<Map<String, Object>> po = jdbc.queryForList(
                "SELECT status, po_date FROM public.purchase_orders WHERE po_number = ? FOR UPDATE", poNumber);
        if (po.isEmpty()) {
            throw new ResourceNotFoundException("PO " + poNumber + " was not found.");
        }
        String status = String.valueOf(po.get(0).get("status"));
        if ("CANCELLED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status)) {
            throw new ConflictException("PO " + poNumber + " is " + status + "; its delivery schedule cannot be changed.");
        }

        List<PurchaseOrderDeliverySchedule> rows = schedules == null ? List.of() : schedules;
        List<DeliveryLots.Lot> lots = new ArrayList<>();
        for (PurchaseOrderDeliverySchedule s : rows) {
            lots.add(s == null ? null : new DeliveryLots.Lot(s.getItemCode(), s.getScheduledDate(), s.getScheduledQty()));
        }
        Map<String, BigDecimal> poQtyByItem = new HashMap<>();
        jdbc.query("SELECT item_code, quantity FROM public.purchase_order_items WHERE po_number = ?",
                rs -> { poQtyByItem.put(rs.getString("item_code"), rs.getBigDecimal("quantity")); }, poNumber);
        DeliveryLots.validate(lots, poQtyByItem, parseIsoDate(po.get(0).get("po_date")));

        // An item's lots must still hold what has already been received for it.
        Map<String, BigDecimal> scheduledByItem = new HashMap<>();
        for (PurchaseOrderDeliverySchedule s : rows) {
            scheduledByItem.merge(s.getItemCode().trim(), s.getScheduledQty(), BigDecimal::add);
        }
        Map<String, BigDecimal> receivedByItem = acceptedQtyByItem(poNumber);
        for (Map.Entry<String, BigDecimal> e : scheduledByItem.entrySet()) {
            BigDecimal received = receivedByItem.getOrDefault(e.getKey(), BigDecimal.ZERO);
            if (received.compareTo(e.getValue()) > 0) {
                throw new IllegalArgumentException(e.getKey() + " on PO " + poNumber + " has already received "
                        + received.stripTrailingZeros().toPlainString() + "; its lots must add up to at least that. The schedule was not changed.");
            }
        }

        List<PurchaseOrderDeliverySchedule> ordered = new ArrayList<>(rows);
        ordered.sort(Comparator.comparing((PurchaseOrderDeliverySchedule s) -> s.getItemCode().trim())
                .thenComparing(PurchaseOrderDeliverySchedule::getScheduledDate));
        jdbc.update("DELETE FROM public.purchase_order_delivery_schedules WHERE po_number = ?", poNumber);
        Map<String, Integer> lotNumbers = new HashMap<>();
        for (PurchaseOrderDeliverySchedule s : ordered) {
            String itemCode = s.getItemCode().trim();
            jdbc.update(
                "INSERT INTO public.purchase_order_delivery_schedules (po_number, item_code, lot_number, scheduled_date, scheduled_qty, received_qty, balance_qty, destination_store, status) " +
                "VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'SCHEDULED')",
                poNumber, itemCode, lotNumbers.merge(itemCode, 1, Integer::sum), java.sql.Date.valueOf(s.getScheduledDate()),
                s.getScheduledQty(), s.getScheduledQty(), s.getDestinationStore()
            );
        }
        syncScheduleReceipts(poNumber);
    }

    /**
     * Works out the received quantity of every delivery lot of a PO from its posted GRNs: per item, the accepted
     * quantity fills the lots in lot order. Lots linked to payment milestones make those milestones due once they
     * have received anything. Safe to run any number of times; a lot that already matches is not rewritten.
     */
    public void syncScheduleReceipts(String poNumber) {
        jdbc.update(SYNC_SCHEDULE_RECEIPTS_SQL, poNumber, poNumber);
        jdbc.update(
            "UPDATE public.purchase_order_payment_milestones SET payment_status = 'DUE' " +
            "WHERE po_number = ? AND payment_status IN ('PENDING', 'UPCOMING') AND linked_lot_number IN (" +
            "SELECT lot_number FROM public.purchase_order_delivery_schedules WHERE po_number = ? AND received_qty > 0)",
            poNumber, poNumber
        );
    }

    private static final String SYNC_SCHEDULE_RECEIPTS_SQL = """
            WITH accepted AS (
                SELECT gi.item_code, SUM(gi.accepted_qty) AS qty
                FROM public.goods_receipt_note_items gi
                JOIN public.goods_receipt_notes g ON g.id = gi.grn_id
                WHERE g.status = 'POSTED' AND gi.po_number = ?
                GROUP BY gi.item_code
            ), filled AS (
                SELECT s.id, s.scheduled_qty,
                       LEAST(s.scheduled_qty, GREATEST(0, COALESCE(a.qty, 0) - COALESCE(SUM(s.scheduled_qty) OVER (
                           PARTITION BY s.item_code ORDER BY s.lot_number, s.id
                           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0))) AS received
                FROM public.purchase_order_delivery_schedules s
                LEFT JOIN accepted a ON a.item_code = s.item_code
                WHERE s.po_number = ?
            ), target AS (
                SELECT id, received, scheduled_qty - received AS balance,
                       CASE WHEN received = 0 THEN 'SCHEDULED'
                            WHEN received >= scheduled_qty THEN 'COMPLETED'
                            ELSE 'PARTIALLY_RECEIVED' END AS status
                FROM filled
            )
            UPDATE public.purchase_order_delivery_schedules s
            SET received_qty = t.received, balance_qty = t.balance, status = t.status, updated_at = NOW()
            FROM target t
            WHERE s.id = t.id
              AND (s.received_qty IS DISTINCT FROM t.received OR s.balance_qty IS DISTINCT FROM t.balance
                   OR s.status IS DISTINCT FROM t.status)
            """;

    /** Accepted quantity per item from the PO's posted GRNs. */
    private Map<String, BigDecimal> acceptedQtyByItem(String poNumber) {
        Map<String, BigDecimal> accepted = new HashMap<>();
        jdbc.query(
            "SELECT gi.item_code, SUM(gi.accepted_qty) AS qty FROM public.goods_receipt_note_items gi " +
            "JOIN public.goods_receipt_notes g ON g.id = gi.grn_id WHERE g.status = 'POSTED' AND gi.po_number = ? GROUP BY gi.item_code",
            rs -> { accepted.put(rs.getString("item_code"), rs.getBigDecimal("qty")); }, poNumber);
        return accepted;
    }

    /** po_date is stored as text; an ISO date is read, anything else counts as no date. */
    private static LocalDate parseIsoDate(Object value) {
        if (value == null) return null;
        try {
            return LocalDate.parse(value.toString().trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
