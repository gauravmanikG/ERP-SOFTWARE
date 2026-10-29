package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silvermuller.seals.modules.purchase.dto.PurchaseItemLine;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNote;
import com.silvermuller.seals.modules.purchase.model.GoodsReceiptNoteItem;
import com.silvermuller.seals.modules.purchase.model.PoValidity;
import com.silvermuller.seals.modules.purchase.model.PurchaseOrder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.silvermuller.seals.common.exception.ConflictException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class GoodsReceiptNoteService {

    private final JdbcTemplate jdbc;
    private final PurchaseProcessingService purchaseProcessingService;
    private final ObjectMapper objectMapper;

    private final com.silvermuller.seals.modules.purchase.newpo.ReceiptAttributionService receiptAttribution;

    public GoodsReceiptNoteService(JdbcTemplate jdbc,
                                  com.silvermuller.seals.modules.purchase.newpo.ReceiptAttributionService receiptAttribution,
                                  PurchaseProcessingService purchaseProcessingService,
                                  ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.receiptAttribution = receiptAttribution;
        this.purchaseProcessingService = purchaseProcessingService;
        this.objectMapper = objectMapper;
    }

    private final RowMapper<GoodsReceiptNote> grnRowMapper = (rs, rowNum) -> {
        GoodsReceiptNote g = new GoodsReceiptNote();
        g.setId(rs.getLong("id"));
        g.setGrnNumber(rs.getString("grn_number"));
        Date gd = rs.getDate("grn_date");
        if (gd != null) g.setGrnDate(gd.toLocalDate());
        g.setPoNumber(rs.getString("po_number"));
        g.setPoDate(rs.getString("po_date"));
        g.setPrNumber(rs.getString("pr_number"));
        g.setVendorCode(rs.getString("vendor_code"));
        g.setVendorName(rs.getString("vendor_name"));
        g.setVendorGstin(rs.getString("vendor_gstin"));
        g.setVendorChallanNo(rs.getString("vendor_challan_no"));
        Date cd = rs.getDate("vendor_challan_date");
        if (cd != null) g.setVendorChallanDate(cd.toLocalDate());
        g.setVendorInvoiceNo(rs.getString("vendor_invoice_no"));
        Date id = rs.getDate("vendor_invoice_date");
        if (id != null) g.setVendorInvoiceDate(id.toLocalDate());
        g.setTransporterName(rs.getString("transporter_name"));
        g.setVehicleNumber(rs.getString("vehicle_number"));
        g.setStoreLocation(rs.getString("store_location"));
        g.setReceivedBy(rs.getString("received_by"));
        g.setInspectedBy(rs.getString("inspected_by"));
        g.setStatus(rs.getString("status"));
        g.setTotalOrderedQty(rs.getBigDecimal("total_ordered_qty"));
        g.setTotalChallanQty(rs.getBigDecimal("total_challan_qty"));
        g.setTotalReceivedQty(rs.getBigDecimal("total_received_qty"));
        g.setTotalAcceptedQty(rs.getBigDecimal("total_accepted_qty"));
        g.setTotalRejectedQty(rs.getBigDecimal("total_rejected_qty"));
        g.setTotalPendingQty(rs.getBigDecimal("total_pending_qty"));
        g.setTotalValue(rs.getBigDecimal("total_value"));
        g.setRemarks(rs.getString("remarks"));
        
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) g.setCreatedAt(cat.toInstant().toString());
        g.setCreatedBy(rs.getString("created_by"));

        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) g.setUpdatedAt(uat.toInstant().toString());
        g.setUpdatedBy(rs.getString("updated_by"));

        return g;
    };

    private final RowMapper<GoodsReceiptNoteItem> grnItemRowMapper = (rs, rowNum) -> {
        GoodsReceiptNoteItem it = new GoodsReceiptNoteItem();
        it.setId(rs.getLong("id"));
        it.setGrnId(rs.getLong("grn_id"));
        it.setGrnNumber(rs.getString("grn_number"));
        it.setPoNumber(rs.getString("po_number"));
        it.setItemCode(rs.getString("item_code"));
        it.setItemName(rs.getString("item_name"));
        it.setDescription(rs.getString("description"));
        it.setCategory(rs.getString("category"));
        it.setUom(rs.getString("uom"));
        it.setPoOrderedQty(rs.getBigDecimal("po_ordered_qty"));
        it.setPriorReceivedQty(rs.getBigDecimal("prior_received_qty"));
        it.setBalanceExpectedQty(rs.getBigDecimal("balance_expected_qty"));
        it.setChallanQty(rs.getBigDecimal("challan_qty"));
        it.setReceivedQty(rs.getBigDecimal("received_qty"));
        it.setAcceptedQty(rs.getBigDecimal("accepted_qty"));
        it.setRejectedQty(rs.getBigDecimal("rejected_qty"));
        it.setPendingInspectionQty(rs.getBigDecimal("pending_inspection_qty"));
        it.setRejectionReason(rs.getString("rejection_reason"));
        it.setStorageBin(rs.getString("storage_bin"));
        it.setUnitRate(rs.getBigDecimal("unit_rate"));
        it.setTaxPercent(rs.getBigDecimal("tax_percent"));
        it.setItemTotal(rs.getBigDecimal("item_total"));
        it.setRemarks(rs.getString("remarks"));

        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) it.setCreatedAt(cat.toInstant().toString());

        return it;
    };

    public List<GoodsReceiptNote> getAllGoodsReceiptNotes() {
        List<GoodsReceiptNote> list = jdbc.query(
            "SELECT * FROM goods_receipt_notes ORDER BY id DESC", grnRowMapper);
        for (GoodsReceiptNote grn : list) {
            List<GoodsReceiptNoteItem> items = jdbc.query(
                "SELECT * FROM goods_receipt_note_items WHERE grn_id = ? ORDER BY id ASC",
                grnItemRowMapper, grn.getId());
            grn.setItems(items);
        }
        return list;
    }

    public Optional<GoodsReceiptNote> getGoodsReceiptNoteById(Long id) {
        List<GoodsReceiptNote> list = jdbc.query(
            "SELECT * FROM goods_receipt_notes WHERE id = ?", grnRowMapper, id);
        if (list.isEmpty()) return Optional.empty();
        GoodsReceiptNote grn = list.get(0);
        List<GoodsReceiptNoteItem> items = jdbc.query(
            "SELECT * FROM goods_receipt_note_items WHERE grn_id = ? ORDER BY id ASC",
            grnItemRowMapper, grn.getId());
        grn.setItems(items);
        return Optional.of(grn);
    }

    public List<GoodsReceiptNote> getGoodsReceiptNotesByPoNumber(String poNumber) {
        List<GoodsReceiptNote> list = jdbc.query(
            "SELECT * FROM goods_receipt_notes WHERE po_number = ? ORDER BY id DESC", grnRowMapper, poNumber);
        for (GoodsReceiptNote grn : list) {
            List<GoodsReceiptNoteItem> items = jdbc.query(
                "SELECT * FROM goods_receipt_note_items WHERE grn_id = ? ORDER BY id ASC",
                grnItemRowMapper, grn.getId());
            grn.setItems(items);
        }
        return list;
    }

    /**
     * Finds all Approved/Issued Purchase Orders that have pending balance quantity to be received.
     */
    public List<Map<String, Object>> getPendingPurchaseOrdersForReceipt() {
        List<PurchaseOrder> allOrders = purchaseProcessingService.getAllPurchaseOrders();
        List<Map<String, Object>> pendingList = new ArrayList<>();

        // PRs behind each PO, from its allocations: a PO built from several PRs has no single header PR.
        Map<String, String> prsByPo = new HashMap<>();
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT po_number, string_agg(DISTINCT pr_number, ', ' ORDER BY pr_number) AS prs FROM public.po_pr_allocations GROUP BY po_number")) {
            prsByPo.put(String.valueOf(r.get("po_number")), String.valueOf(r.get("prs")));
        }

        for (PurchaseOrder po : allOrders) {
            if ("CANCELLED".equalsIgnoreCase(po.getStatus()) || "COMPLETED".equalsIgnoreCase(po.getStatus())) continue;

            List<PurchaseItemLine> lines = po.getItems() != null ? po.getItems() : Collections.emptyList();
            BigDecimal poTotalOrdered = BigDecimal.ZERO;
            BigDecimal poTotalReceived = BigDecimal.ZERO;
            List<Map<String, Object>> enrichedLines = new ArrayList<>();

            for (PurchaseItemLine line : lines) {
                BigDecimal ordered = line.getQuantity() != null ? line.getQuantity() : BigDecimal.ZERO;
                poTotalOrdered = poTotalOrdered.add(ordered);

                // Calculate cumulative accepted/received qty from POSTED GRNs for this PO and Item
                BigDecimal received = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(accepted_qty), 0) FROM goods_receipt_note_items " +
                    "WHERE po_number = ? AND item_code = ? AND grn_id IN (SELECT id FROM goods_receipt_notes WHERE status = 'POSTED')",
                    BigDecimal.class, po.getPoNumber(), line.getItemCode()
                );
                if (received == null) received = BigDecimal.ZERO;
                poTotalReceived = poTotalReceived.add(received);

                BigDecimal balance = ordered.subtract(received);
                if (balance.compareTo(BigDecimal.ZERO) < 0) balance = BigDecimal.ZERO;

                Map<String, Object> el = new HashMap<>();
                el.put("itemCode", line.getItemCode());
                el.put("itemName", line.getItemName());
                el.put("description", line.getDescription());
                el.put("category", line.getCategory());
                el.put("uom", line.getUom() != null ? line.getUom() : "PCS");
                el.put("unitRate", line.getUnitRate());
                el.put("taxPercent", line.getTaxPercent());
                el.put("orderedQty", ordered);
                el.put("receivedQty", received);
                el.put("balanceQty", balance);
                el.put("expectedDeliveryDate", line.getExpectedDeliveryDate());
                el.put("deliveryLocation", line.getDeliveryLocation());
                enrichedLines.add(el);
            }

            BigDecimal poBalance = poTotalOrdered.subtract(poTotalReceived);
            if (poBalance.compareTo(BigDecimal.ZERO) < 0) poBalance = BigDecimal.ZERO;

            // Only include PO if it has at least one item with remaining balance > 0 OR no GRN yet
            if (poBalance.compareTo(BigDecimal.ZERO) > 0 || (poTotalOrdered.compareTo(BigDecimal.ZERO) > 0 && poTotalReceived.compareTo(BigDecimal.ZERO) == 0)) {
                Map<String, Object> pMap = new HashMap<>();
                pMap.put("id", po.getId());
                pMap.put("poNumber", po.getPoNumber());
                pMap.put("poDate", po.getPoDate());
                pMap.put("prNumber", po.getPrNumber());
                pMap.put("prNumbers", prsByPo.getOrDefault(po.getPoNumber(), po.getPrNumber()));
                pMap.put("department", po.getDepartment());
                pMap.put("requestedBy", po.getRequestedBy());
                pMap.put("vendorCode", po.getVendorCode());
                pMap.put("vendorName", po.getVendorName());
                pMap.put("vendorGstin", po.getVendorGstin());
                pMap.put("vendorPan", po.getVendorPan());
                pMap.put("deliveryDate", po.getDeliveryDate());
                pMap.put("validityDate", po.getValidityDate());
                pMap.put("validityStatus", po.getValidityStatus());
                pMap.put("deliveryLocation", po.getDeliveryLocation());
                pMap.put("paymentTerms", po.getPaymentTerms());
                pMap.put("grandTotal", po.getGrandTotal());
                pMap.put("status", po.getStatus());
                pMap.put("totalOrderedQty", poTotalOrdered);
                pMap.put("totalReceivedQty", poTotalReceived);
                pMap.put("totalBalanceQty", poBalance);
                pMap.put("items", enrichedLines);
                pendingList.add(pMap);
            }
        }

        return pendingList;
    }

    /** Takes the next GRN number (GRN-YEAR-NNNNN, restarting each year); see DocumentNumbers. */
    public String reserveGrnNumber() {
        return DocumentNumbers.next(jdbc, DocumentNumbers.Doc.GRN);
    }

    /** The number the next GRN will get, shown before saving. Nothing is reserved. */
    public String peekGrnNumber() {
        return DocumentNumbers.peek(jdbc, DocumentNumbers.Doc.GRN);
    }

    @Transactional
    public GoodsReceiptNote saveOrPostGoodsReceiptNote(GoodsReceiptNote grn, boolean isPost) {
        if (grn.getPoNumber() == null || grn.getPoNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Purchase Order reference (poNumber) is mandatory for GRN.");
        }
        if (grn.getVendorChallanNo() == null || grn.getVendorChallanNo().trim().isEmpty()) {
            throw new IllegalArgumentException("Vendor Challan Number is mandatory.");
        }
        if (grn.getStoreLocation() == null || grn.getStoreLocation().trim().isEmpty()) {
            throw new IllegalArgumentException("Store Location is mandatory.");
        }
        if (grn.getReceivedBy() == null || grn.getReceivedBy().trim().isEmpty()) {
            throw new IllegalArgumentException("Received By (receiving personnel) is mandatory.");
        }
        if (grn.getItems() == null || grn.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one line item is required in the GRN.");
        }

        // PO validity: an expired PO blocks saving and posting. Checked before any GRN number, row or stock write.
        purchaseProcessingService.getPurchaseOrder(grn.getPoNumber()).ifPresent(po ->
                PoValidity.assertNotExpired(po.getPoNumber(), po.getValidityDate(), LocalDate.now()));

        // Service POs never use the GRN workflow (no receipt, no stock update). Standard PO numbers pass through.
        ServicePoService.assertNotServicePo(jdbc, grn.getPoNumber());
        // A posted GRN is a record: it cannot be edited or posted again.
        if (grn.getId() != null) {
            List<String> current = jdbc.queryForList("SELECT status FROM goods_receipt_notes WHERE id = ? FOR UPDATE", String.class, grn.getId());
            if (!current.isEmpty() && "POSTED".equals(current.get(0))) {
                throw new ConflictException("GRN " + grn.getId() + " is already posted and cannot be changed or posted again.");
            }
        }
        // Retry protection: one posted GRN per PO and vendor challan. A repeated submission is refused, not posted twice.
        if (isPost) {
            Integer dup = jdbc.queryForObject(
                "SELECT COUNT(*) FROM goods_receipt_notes WHERE po_number = ? AND vendor_challan_no = ? AND status = 'POSTED' AND id IS DISTINCT FROM ?",
                Integer.class, grn.getPoNumber(), grn.getVendorChallanNo().trim(), grn.getId());
            if (dup != null && dup > 0) {
                throw new ConflictException("Vendor challan " + grn.getVendorChallanNo().trim() + " for PO " + grn.getPoNumber()
                        + " is already posted as a GRN. The duplicate was not posted.");
            }
        }


        // The server owns GRN numbers: a new GRN always takes the next sequence number (a number typed or
        // pre-fetched by the client is ignored), and a saved draft keeps the number it was stored with.
        if (grn.getId() == null) {
            grn.setGrnNumber(reserveGrnNumber());
        } else {
            List<String> stored = jdbc.queryForList("SELECT grn_number FROM goods_receipt_notes WHERE id = ?", String.class, grn.getId());
            if (stored.isEmpty()) {
                throw new IllegalArgumentException("GRN " + grn.getId() + " was not found.");
            }
            grn.setGrnNumber(stored.get(0));
        }
        if (grn.getGrnDate() == null) {
            grn.setGrnDate(LocalDate.now());
        }

        String targetStatus = isPost ? "POSTED" : "DRAFT";
        grn.setStatus(targetStatus);

        BigDecimal sumOrd = BigDecimal.ZERO;
        BigDecimal sumChallan = BigDecimal.ZERO;
        BigDecimal sumRec = BigDecimal.ZERO;
        BigDecimal sumAcc = BigDecimal.ZERO;
        BigDecimal sumRej = BigDecimal.ZERO;
        BigDecimal sumPend = BigDecimal.ZERO;
        BigDecimal sumVal = BigDecimal.ZERO;

        for (GoodsReceiptNoteItem it : grn.getItems()) {
            BigDecimal ord = it.getPoOrderedQty() != null ? it.getPoOrderedQty() : BigDecimal.ZERO;
            BigDecimal chal = it.getChallanQty() != null ? it.getChallanQty() : BigDecimal.ZERO;
            BigDecimal rec = it.getReceivedQty() != null ? it.getReceivedQty() : BigDecimal.ZERO;
            BigDecimal acc = it.getAcceptedQty() != null ? it.getAcceptedQty() : BigDecimal.ZERO;
            BigDecimal rej = it.getRejectedQty() != null ? it.getRejectedQty() : BigDecimal.ZERO;
            BigDecimal pend = it.getPendingInspectionQty() != null ? it.getPendingInspectionQty() : BigDecimal.ZERO;
            BigDecimal rate = it.getUnitRate() != null ? it.getUnitRate() : BigDecimal.ZERO;

            // Enforce Received = Accepted + Rejected + Pending Inspection
            BigDecimal verifiedRec = acc.add(rej).add(pend);
            if (rec.compareTo(verifiedRec) != 0 && verifiedRec.compareTo(BigDecimal.ZERO) > 0) {
                rec = verifiedRec;
                it.setReceivedQty(rec);
            }

            // OVER-RECEIPT CHECK IF POSTING
            if (isPost) {
                // The PO quantity is taken from the PO itself, never from the quantity the client sent.
                ord = serverPoQty(grn.getPoNumber(), it.getItemCode());
                it.setPoOrderedQty(ord);
                BigDecimal priorRec = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(accepted_qty), 0) FROM goods_receipt_note_items " +
                    "WHERE po_number = ? AND item_code = ? AND grn_id != COALESCE(?, 0) AND grn_id IN (SELECT id FROM goods_receipt_notes WHERE status = 'POSTED')",
                    BigDecimal.class, grn.getPoNumber(), it.getItemCode(), grn.getId() != null ? grn.getId() : 0L
                );
                if (priorRec == null) priorRec = BigDecimal.ZERO;
                it.setPriorReceivedQty(priorRec);
                BigDecimal maxAllowed = ord.subtract(priorRec);
                if (acc.compareTo(maxAllowed) > 0) {
                    throw new IllegalArgumentException(String.format(
                        "Accepted quantity (%s) for item '%s' exceeds the PO outstanding balance (%s). Only accepted goods fulfil a PO; over-acceptance is blocked (tolerance 0%%).",
                        acc.toPlainString(), it.getItemCode(), maxAllowed.toPlainString()
                    ));
                }
            }

            BigDecimal lineVal = acc.multiply(rate).setScale(2, RoundingMode.HALF_UP);
            it.setItemTotal(lineVal);

            sumOrd = sumOrd.add(ord);
            sumChallan = sumChallan.add(chal);
            sumRec = sumRec.add(rec);
            sumAcc = sumAcc.add(acc);
            sumRej = sumRej.add(rej);
            sumPend = sumPend.add(pend);
            sumVal = sumVal.add(lineVal);
        }

        grn.setTotalOrderedQty(sumOrd);
        grn.setTotalChallanQty(sumChallan);
        grn.setTotalReceivedQty(sumRec);
        grn.setTotalAcceptedQty(sumAcc);
        grn.setTotalRejectedQty(sumRej);
        grn.setTotalPendingQty(sumPend);
        grn.setTotalValue(sumVal);

        if (grn.getCreatedBy() == null || grn.getCreatedBy().trim().isEmpty()) {
            grn.setCreatedBy(grn.getReceivedBy());
        }

        Long grnId = grn.getId();
        if (grnId == null) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO goods_receipt_notes (" +
                    "grn_number, grn_date, po_number, po_date, pr_number, vendor_code, vendor_name, vendor_gstin, " +
                    "vendor_challan_no, vendor_challan_date, vendor_invoice_no, vendor_invoice_date, transporter_name, " +
                    "vehicle_number, store_location, received_by, inspected_by, status, total_ordered_qty, total_challan_qty, " +
                    "total_received_qty, total_accepted_qty, total_rejected_qty, total_pending_qty, total_value, remarks, " +
                    "created_at, created_by, updated_at, updated_by) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)",
                    Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, grn.getGrnNumber());
                ps.setDate(2, grn.getGrnDate() != null ? Date.valueOf(grn.getGrnDate()) : Date.valueOf(LocalDate.now()));
                ps.setString(3, grn.getPoNumber());
                ps.setString(4, grn.getPoDate());
                ps.setString(5, grn.getPrNumber());
                ps.setString(6, grn.getVendorCode());
                ps.setString(7, grn.getVendorName());
                ps.setString(8, grn.getVendorGstin());
                ps.setString(9, grn.getVendorChallanNo());
                ps.setDate(10, grn.getVendorChallanDate() != null ? Date.valueOf(grn.getVendorChallanDate()) : null);
                ps.setString(11, grn.getVendorInvoiceNo());
                ps.setDate(12, grn.getVendorInvoiceDate() != null ? Date.valueOf(grn.getVendorInvoiceDate()) : null);
                ps.setString(13, grn.getTransporterName());
                ps.setString(14, grn.getVehicleNumber());
                ps.setString(15, grn.getStoreLocation());
                ps.setString(16, grn.getReceivedBy());
                ps.setString(17, grn.getInspectedBy());
                ps.setString(18, grn.getStatus());
                ps.setBigDecimal(19, grn.getTotalOrderedQty());
                ps.setBigDecimal(20, grn.getTotalChallanQty());
                ps.setBigDecimal(21, grn.getTotalReceivedQty());
                ps.setBigDecimal(22, grn.getTotalAcceptedQty());
                ps.setBigDecimal(23, grn.getTotalRejectedQty());
                ps.setBigDecimal(24, grn.getTotalPendingQty());
                ps.setBigDecimal(25, grn.getTotalValue());
                ps.setString(26, grn.getRemarks());
                ps.setString(27, grn.getCreatedBy());
                ps.setString(28, grn.getCreatedBy());
                return ps;
            }, keyHolder);

            Map<String, Object> keys = keyHolder.getKeys();
            if (keys != null && keys.containsKey("id")) {
                grnId = ((Number) keys.get("id")).longValue();
                grn.setId(grnId);
            }
        } else {
            jdbc.update(
                "UPDATE goods_receipt_notes SET " +
                "grn_date = ?, vendor_challan_no = ?, vendor_challan_date = ?, vendor_invoice_no = ?, vendor_invoice_date = ?, " +
                "transporter_name = ?, vehicle_number = ?, store_location = ?, received_by = ?, inspected_by = ?, status = ?, " +
                "total_ordered_qty = ?, total_challan_qty = ?, total_received_qty = ?, total_accepted_qty = ?, total_rejected_qty = ?, " +
                "total_pending_qty = ?, total_value = ?, remarks = ?, updated_at = NOW(), updated_by = ? " +
                "WHERE id = ?",
                grn.getGrnDate() != null ? Date.valueOf(grn.getGrnDate()) : Date.valueOf(LocalDate.now()),
                grn.getVendorChallanNo(),
                grn.getVendorChallanDate() != null ? Date.valueOf(grn.getVendorChallanDate()) : null,
                grn.getVendorInvoiceNo(),
                grn.getVendorInvoiceDate() != null ? Date.valueOf(grn.getVendorInvoiceDate()) : null,
                grn.getTransporterName(),
                grn.getVehicleNumber(),
                grn.getStoreLocation(),
                grn.getReceivedBy(),
                grn.getInspectedBy(),
                grn.getStatus(),
                grn.getTotalOrderedQty(),
                grn.getTotalChallanQty(),
                grn.getTotalReceivedQty(),
                grn.getTotalAcceptedQty(),
                grn.getTotalRejectedQty(),
                grn.getTotalPendingQty(),
                grn.getTotalValue(),
                grn.getRemarks(),
                grn.getReceivedBy(),
                grnId
            );
            jdbc.update("DELETE FROM goods_receipt_note_items WHERE grn_id = ?", grnId);
        }

        // Insert items
        for (GoodsReceiptNoteItem it : grn.getItems()) {
            it.setGrnId(grnId);
            it.setGrnNumber(grn.getGrnNumber());
            it.setPoNumber(grn.getPoNumber());
            jdbc.update(
                "INSERT INTO goods_receipt_note_items (" +
                "grn_id, grn_number, po_number, item_code, item_name, description, category, uom, " +
                "po_ordered_qty, prior_received_qty, balance_expected_qty, challan_qty, received_qty, accepted_qty, " +
                "rejected_qty, pending_inspection_qty, rejection_reason, storage_bin, unit_rate, tax_percent, item_total, " +
                "remarks, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                grnId, grn.getGrnNumber(), grn.getPoNumber(), it.getItemCode(), it.getItemName(), it.getDescription(),
                it.getCategory(), it.getUom() != null ? it.getUom() : "PCS",
                it.getPoOrderedQty(), it.getPriorReceivedQty(), it.getBalanceExpectedQty(), it.getChallanQty(),
                it.getReceivedQty(), it.getAcceptedQty(), it.getRejectedQty(), it.getPendingInspectionQty(),
                it.getRejectionReason(), it.getStorageBin(), it.getUnitRate(), it.getTaxPercent(), it.getItemTotal(),
                it.getRemarks()
            );
        }

        // IF POSTED: UPDATE PO RECEIVED STATUS ACCURATELY
        if (isPost) {
            // Receipt attribution to PR allocations is written in this same transaction (rolled back with the GRN).
            receiptAttribution.attributePostedGrn(grnId, grn.getPoNumber());
            updatePurchaseOrderStatusFromGrn(grn.getPoNumber());
        }

        return getGoodsReceiptNoteById(grnId).orElse(grn);
    }

    /**
     * Recalculates the PO status from the POSTED receipts and writes it to purchase_orders in the same
     * transaction as the GRN. The cached PO copy is updated only after commit, so a rolled-back GRN
     * cannot leave a status in memory that the database does not have.
     */
    private void updatePurchaseOrderStatusFromGrn(String poNumber) {
        Optional<PurchaseOrder> cached = purchaseProcessingService.getPurchaseOrder(poNumber);
        List<PurchaseItemLine> poLines = cached.map(PurchaseOrder::getItems).orElseGet(() -> loadPoLinesFromDb(poNumber));
        if (poLines == null) return;

        BigDecimal totalOrdered = BigDecimal.ZERO;
        boolean allLinesFullyReceived = true;
        boolean anyLineReceived = false;

        for (PurchaseItemLine line : poLines) {
            BigDecimal ord = line.getQuantity() != null ? line.getQuantity() : BigDecimal.ZERO;
            totalOrdered = totalOrdered.add(ord);

            BigDecimal totalRec = jdbc.queryForObject(
                "SELECT COALESCE(SUM(accepted_qty), 0) FROM goods_receipt_note_items " +
                "WHERE po_number = ? AND item_code = ? AND grn_id IN (SELECT id FROM goods_receipt_notes WHERE status = 'POSTED')",
                BigDecimal.class, poNumber, line.getItemCode()
            );
            if (totalRec == null) totalRec = BigDecimal.ZERO;

            if (totalRec.compareTo(BigDecimal.ZERO) > 0) {
                anyLineReceived = true;
            }
            if (totalRec.compareTo(ord) < 0) {
                allLinesFullyReceived = false;
            }
        }

        // Only accepted quantity moves the PO. With nothing accepted yet (for example a fully rejected delivery),
        // the PO keeps its current status: rejected goods neither advance nor close it.
        String newStatus;
        if (allLinesFullyReceived && totalOrdered.compareTo(BigDecimal.ZERO) > 0) {
            newStatus = "COMPLETED"; // all accepted quantity received
        } else if (anyLineReceived) {
            newStatus = "PARTIALLY RECEIVED";
        } else {
            return;
        }

        jdbc.update("UPDATE purchase_orders SET status = ?, updated_at = NOW() WHERE po_number = ?", newStatus, poNumber);

        Runnable applyToCache = () -> cached.ifPresentOrElse(
                po -> po.setStatus(newStatus),
                purchaseProcessingService::loadOrdersFromDb);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    applyToCache.run();
                }
            });
        } else {
            applyToCache.run();
        }
    }

    /** Ordered quantity of one item on the PO, read from purchase_orders (never from the client). */
    private BigDecimal serverPoQty(String poNumber, String itemCode) {
        List<PurchaseItemLine> lines = loadPoLinesFromDb(poNumber);
        if (lines == null) {
            throw new IllegalArgumentException("PO " + poNumber + " was not found.");
        }
        BigDecimal total = BigDecimal.ZERO;
        boolean found = false;
        for (PurchaseItemLine l : lines) {
            if (itemCode != null && itemCode.equals(l.getItemCode())) {
                found = true;
                if (l.getQuantity() != null) total = total.add(l.getQuantity());
            }
        }
        if (!found) {
            throw new IllegalArgumentException("Item " + itemCode + " is not on PO " + poNumber + ". The GRN was not posted.");
        }
        return total;
    }

    /** Lines of a PO that is not in the in-memory cache, read from its purchase_orders row. Null if there is no such PO. */
    private List<PurchaseItemLine> loadPoLinesFromDb(String poNumber) {
        List<String> rows = jdbc.queryForList("SELECT details_json FROM purchase_orders WHERE po_number = ?", String.class, poNumber);
        if (rows.isEmpty() || rows.get(0) == null) return null;
        try {
            return Arrays.asList(objectMapper.readValue(rows.get(0), PurchaseItemLine[].class));
        } catch (Exception e) {
            throw new IllegalStateException("Could not read the lines of PO " + poNumber + " from the database.", e);
        }
    }
}
