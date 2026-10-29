package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService;
import com.silvermuller.seals.modules.inventory.model.SupplierMaster;
import com.silvermuller.seals.modules.inventory.repository.SupplierMasterRepository;
import com.silvermuller.seals.modules.purchase.dto.*;
import com.silvermuller.seals.modules.purchase.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PurchaseProcessingService {

    private final SupplierMasterRepository supplierRepository;
    private final PurchaseRequisitionService prService;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final Map<String, PurchaseOrder> purchaseOrdersMap = new ConcurrentHashMap<>();

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
        loadOrdersFromDb();
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

    public PurchaseOrder cancelPurchaseOrder(String poNumberOrId, String user, String reason) {
        PurchaseOrder po = getPurchaseOrder(poNumberOrId)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found: " + poNumberOrId));
        if ("CANCELLED".equalsIgnoreCase(po.getStatus())) {
            throw new IllegalArgumentException("Purchase Order " + poNumberOrId + " is already cancelled. Quantities cannot be restored again.");
        }
        // POs raised through PO by PR must be cancelled through their own endpoint, which releases exactly the
        // quantities their allocations reserved. This legacy path would release to po.prNumber instead.
        Integer raised = jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ?", Integer.class, po.getPoNumber());
        if (raised != null && raised > 0) {
            throw new ConflictException("PO " + po.getPoNumber() + " was raised through PO by PR. Cancel it with POST /api/new-po/pr/purchase-orders/"
                    + po.getPoNumber() + "/cancel; it was not changed here.");
        }
        // Shared rule for every PO type: a PO with any posted receipt (accepted or rejected) cannot be cancelled.
        Integer posted = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.goods_receipt_note_items gi JOIN public.goods_receipt_notes n ON n.id = gi.grn_id " +
                "WHERE gi.po_number = ? AND n.status = 'POSTED' AND gi.received_qty > 0", Integer.class, po.getPoNumber());
        if (posted != null && posted > 0) {
            throw new ConflictException("PO " + po.getPoNumber() + " has posted receipts and cannot be cancelled. Receipt reversal is not supported yet; it was not changed.");
        }
        po.setStatus("CANCELLED");
        String actor = (user != null && !user.trim().isEmpty()) ? user : "Purchase Manager";
        String r = (reason != null && !reason.trim().isEmpty()) ? reason : "Order cancelled";
        po.setRemarks((po.getRemarks() != null ? po.getRemarks() + " | " : "") + "Cancelled by " + actor + ": " + r);
        purchaseOrdersMap.put(po.getId(), po);
        purchaseOrdersMap.put(po.getPoNumber(), po);
        savePoToDb(po);

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

    public void savePoToDb(PurchaseOrder po) {
        try {
            String itemsJson = objectMapper.writeValueAsString(po.getItems());
            jdbc.update(
                "INSERT INTO purchase_orders (" +
                "id, po_number, po_date, pr_number, pr_date, department, requested_by, " +
                "vendor_code, vendor_name, vendor_gstin, vendor_pan, contact_person, phone, email, " +
                "billing_address, shipping_address, payment_terms, delivery_date, delivery_location, " +
                "status, items_gross, total_discount, taxable_amount, total_tax, delivery_charges, " +
                "other_charges, round_off, grand_total, remarks, approved_by, approved_at, " +
                "source_quotation_number, source_quotation_id, details_json, " +
                "po_type, incoterms, freight_terms, delivery_mode, credit_period, revision_number, validity_date, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS DATE), NOW(), NOW()) " +
                "ON CONFLICT (id) DO UPDATE SET " +
                "status = EXCLUDED.status, remarks = EXCLUDED.remarks, details_json = EXCLUDED.details_json, " +
                "po_type = EXCLUDED.po_type, incoterms = EXCLUDED.incoterms, freight_terms = EXCLUDED.freight_terms, " +
                "delivery_mode = EXCLUDED.delivery_mode, credit_period = EXCLUDED.credit_period, revision_number = EXCLUDED.revision_number, updated_at = NOW()",
                po.getId(), po.getPoNumber(), po.getPoDate(), po.getPrNumber(), po.getPrDate(),
                po.getDepartment(), po.getRequestedBy(), po.getVendorCode(), po.getVendorName(), po.getVendorGstin(),
                po.getVendorPan(), po.getContactPerson(), po.getPhone(), po.getEmail(), po.getBillingAddress(),
                po.getShippingAddress(), po.getPaymentTerms(), po.getDeliveryDate(), po.getDeliveryLocation(),
                po.getStatus(), po.getItemsGross(), po.getTotalDiscount(), po.getTaxableAmount(), po.getTotalTax(),
                po.getDeliveryCharges(), po.getOtherCharges(), po.getRoundOff(), po.getGrandTotal(), po.getRemarks(),
                po.getApprovedBy(), po.getApprovedAt(), po.getSourceQuotationNumber(), po.getSourceQuotationId(),
                itemsJson,
                po.getPoType() != null ? po.getPoType() : "STANDARD",
                po.getIncoterms() != null ? po.getIncoterms() : "FOR Destination",
                po.getFreightTerms() != null ? po.getFreightTerms() : "Included in Price",
                po.getDeliveryMode() != null ? po.getDeliveryMode() : "Road Transport",
                po.getCreditPeriod() != null ? po.getCreditPeriod() : 30,
                po.getRevisionNumber() != null ? po.getRevisionNumber() : 0,
                po.getValidityDate()
            );
        } catch (Exception e) {
            System.err.println("Could not save PO to DB: " + e.getMessage());
        }
    }

    public void loadOrdersFromDb() {
        try {
            purchaseOrdersMap.clear();
            jdbc.query("SELECT * FROM purchase_orders ORDER BY id", (rs) -> {
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
                        List<PurchaseItemLine> lines = objectMapper.readValue(json, new TypeReference<List<PurchaseItemLine>>() {});
                        po.setItems(lines);
                    } catch (Exception ex) {
                        po.setItems(new ArrayList<>());
                    }
                }
                purchaseOrdersMap.put(po.getId(), po);
                purchaseOrdersMap.put(po.getPoNumber(), po);
            });
        } catch (Exception e) {
            System.err.println("Could not load POs from DB: " + e.getMessage());
        }
    }

    public List<PurchaseOrder> getAllPurchaseOrders() {
        Set<String> seenPoNumbers = new HashSet<>();
        List<PurchaseOrder> list = new ArrayList<>();
        for (PurchaseOrder po : purchaseOrdersMap.values()) {
            if (seenPoNumbers.add(po.getPoNumber())) {
                list.add(po);
            }
        }
        // Newest first: PO numbers are issued in increasing sequence
        list.sort((a, b) -> b.getPoNumber().compareTo(a.getPoNumber()));
        return list;
    }

    public Optional<PurchaseOrder> getPurchaseOrder(String poNumberOrId) {
        if (poNumberOrId == null) return Optional.empty();
        PurchaseOrder po = purchaseOrdersMap.get(poNumberOrId);
        if (po == null) {
            po = purchaseOrdersMap.values().stream()
                    .filter(x -> poNumberOrId.equalsIgnoreCase(x.getId()) || poNumberOrId.equalsIgnoreCase(x.getPoNumber()))
                    .findFirst().orElse(null);
        }
        if (po != null) {
            po.setDeliverySchedules(getDeliverySchedules(po.getPoNumber()));
        }
        return Optional.ofNullable(po);
    }

    public List<PurchaseOrderDeliverySchedule> getDeliverySchedules(String poNumber) {
        String sql = "SELECT id, po_id, po_number, item_code, lot_number, scheduled_date, scheduled_qty, received_qty, balance_qty, destination_store, status, created_at, updated_at " +
                     "FROM public.purchase_order_delivery_schedules WHERE po_number = ? ORDER BY lot_number ASC, scheduled_date ASC";
        return jdbc.query(sql, (rs, rowNum) -> {
            PurchaseOrderDeliverySchedule s = new PurchaseOrderDeliverySchedule();
            s.setId(rs.getLong("id"));
            s.setPoId(rs.getObject("po_id") != null ? rs.getLong("po_id") : null);
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

    @Transactional
    public void saveDeliverySchedules(String poNumber, List<PurchaseOrderDeliverySchedule> schedules) {
        jdbc.update("DELETE FROM public.purchase_order_delivery_schedules WHERE po_number = ?", poNumber);
        if (schedules == null || schedules.isEmpty()) return;

        for (PurchaseOrderDeliverySchedule s : schedules) {
            BigDecimal schedQty = s.getScheduledQty() != null ? s.getScheduledQty() : BigDecimal.ZERO;
            BigDecimal recQty = s.getReceivedQty() != null ? s.getReceivedQty() : BigDecimal.ZERO;
            BigDecimal balQty = (s.getBalanceQty() != null && s.getBalanceQty().compareTo(BigDecimal.ZERO) > 0) 
                    ? s.getBalanceQty() 
                    : schedQty.subtract(recQty).max(BigDecimal.ZERO);

            jdbc.update(
                "INSERT INTO public.purchase_order_delivery_schedules (po_number, item_code, lot_number, scheduled_date, scheduled_qty, received_qty, balance_qty, destination_store, status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                poNumber, s.getItemCode(), s.getLotNumber() != null ? s.getLotNumber() : 1,
                s.getScheduledDate() != null ? java.sql.Date.valueOf(s.getScheduledDate()) : java.sql.Date.valueOf(LocalDate.now()),
                schedQty, recQty, balQty, s.getDestinationStore(), s.getStatus() != null ? s.getStatus() : "SCHEDULED"
            );
        }
    }

    @Transactional
    public void recordScheduleReceipt(String poNumber, String itemCode, Integer lotNumber, BigDecimal receivedQty) {
        // Service POs never record goods receipts against delivery schedules.
        ServicePoService.assertNotServicePo(jdbc, poNumber);
        getPurchaseOrder(poNumber).ifPresent(po ->
                PoValidity.assertNotExpired(po.getPoNumber(), po.getValidityDate(), LocalDate.now()));
        if (receivedQty == null || receivedQty.compareTo(BigDecimal.ZERO) <= 0) return;
        jdbc.update(
            "UPDATE public.purchase_order_delivery_schedules SET received_qty = received_qty + ?, " +
            "balance_qty = GREATEST(0, scheduled_qty - (received_qty + ?)), " +
            "status = CASE WHEN scheduled_qty <= (received_qty + ?) THEN 'COMPLETED' ELSE 'PARTIALLY_RECEIVED' END, " +
            "updated_at = NOW() WHERE po_number = ? AND (item_code = ? OR ? IS NULL) AND lot_number = ?",
            receivedQty, receivedQty, receivedQty, poNumber, itemCode, itemCode, lotNumber
        );

        // Also update linked payment milestone if any
        jdbc.update(
            "UPDATE public.purchase_order_payment_milestones SET payment_status = 'DUE' " +
            "WHERE po_number = ? AND linked_lot_number = ? AND payment_status IN ('PENDING', 'UPCOMING')",
            poNumber, lotNumber
        );
    }
}
