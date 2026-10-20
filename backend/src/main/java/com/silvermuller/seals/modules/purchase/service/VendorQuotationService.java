package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.modules.purchase.dto.*;
import com.silvermuller.seals.modules.purchase.model.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class VendorQuotationService {

    private final JdbcTemplate jdbc;

    public VendorQuotationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    public void onInit() {
        seedDemoQuotationsIfEmpty();
        autoExpireOverdueQuotations();
    }

    public void seedDemoQuotationsIfEmpty() {
        // Disabled: do not auto-seed demo quotations so live quotations (QT-LIVE-001, QT-LIVE-002, QT-LIVE-003) are preserved
    }

    private void seedQuote(String qNum, String prNum, String vCode, String vName, String refNo,
                           int daysAgo, int validDays, String terms, String deliv, String status,
                           String notes, String justif, List<VendorQuotationItem> items) {
        VendorQuotation q = new VendorQuotation();
        q.setQuotationNumber(qNum);
        q.setPrNumber(prNum);
        q.setVendorCode(vCode);
        q.setVendorName(vName);
        q.setVendorRefNo(refNo);
        q.setQuotationDate(LocalDate.now().minusDays(daysAgo));
        q.setValidUntil(LocalDate.now().plusDays(validDays));
        q.setContactPerson("Commercial Representative");
        q.setPaymentTerms(terms);
        q.setDeliveryTime(deliv);
        q.setDeliveryLocation("Silver Muller Central Stores, Faridabad");
        q.setStatus(status);
        q.setNotes(notes);
        q.setSelectionJustification(justif);
        q.setCreatedBy("Purchase Officer");
        q.setItems(items);
        saveOrUpdate(q, false);
        if (justif != null) {
            updateStatus(q.getId(), status, justif, "Approved", "VP Operations");
        }
    }

    private VendorQuotationItem createQuoteItem(String code, String desc, String category, String uom, double qty, double rate, double taxPct, double discPct) {
        VendorQuotationItem it = new VendorQuotationItem();
        it.setItemCode(code);
        it.setItemDescription(desc);
        it.setCategory(category != null ? category : "FG");
        it.setUom(uom);
        it.setQuotedQuantity(BigDecimal.valueOf(qty));
        it.setUnitRate(BigDecimal.valueOf(rate));
        it.setTaxPercent(BigDecimal.valueOf(taxPct));
        it.setDiscountPercent(BigDecimal.valueOf(discPct));
        return it;
    }

    public void autoExpireOverdueQuotations() {
        try {
            jdbc.update("UPDATE vendor_quotations SET status = 'Expired', updated_at = NOW() WHERE is_latest = TRUE AND valid_until < CURRENT_DATE AND status IN ('Draft', 'Submitted for Review', 'Under Evaluation')");
        } catch (Exception ignored) {}
    }

    public void syncDemoDatesWithCurrentDate() {
        try {
            jdbc.update("UPDATE vendor_quotations SET quotation_date = CURRENT_DATE - INTERVAL '14 days', valid_until = CURRENT_DATE + INTERVAL '45 days' WHERE quotation_number = 'QT-2026-0001'");
            jdbc.update("UPDATE vendor_quotations SET quotation_date = CURRENT_DATE - INTERVAL '10 days', valid_until = CURRENT_DATE + INTERVAL '20 days' WHERE quotation_number = 'QT-2026-0002'");
            jdbc.update("UPDATE vendor_quotations SET quotation_date = CURRENT_DATE - INTERVAL '21 days', valid_until = CURRENT_DATE + INTERVAL '3 days' WHERE quotation_number = 'QT-2026-0003'");
            jdbc.update("UPDATE vendor_quotations SET quotation_date = CURRENT_DATE - INTERVAL '7 days', valid_until = CURRENT_DATE + INTERVAL '7 days' WHERE quotation_number = 'QT-2026-0004'");
            jdbc.update("UPDATE vendor_quotations SET quotation_date = CURRENT_DATE - INTERVAL '1 day', valid_until = CURRENT_DATE + INTERVAL '1 day' WHERE quotation_number = 'QT-2026-0005'");
            jdbc.update("UPDATE vendor_quotations SET quotation_date = CURRENT_DATE - INTERVAL '40 days', valid_until = CURRENT_DATE - INTERVAL '5 days', status = 'Expired' WHERE quotation_number = 'QT-2026-0000-HIST'");
            autoExpireOverdueQuotations();
        } catch (Exception ignored) {}
    }

    private final RowMapper<VendorQuotation> quotationRowMapper = (rs, rowNum) -> {
        VendorQuotation q = new VendorQuotation();
        q.setId(rs.getLong("id"));
        q.setQuotationNumber(rs.getString("quotation_number"));
        long vId = rs.getLong("vendor_id");
        if (!rs.wasNull()) q.setVendorId(vId);
        q.setVendorCode(rs.getString("vendor_code"));
        q.setVendorName(rs.getString("vendor_name"));
        q.setVendorRefNo(rs.getString("vendor_ref_no"));

        Date qd = rs.getDate("quotation_date");
        if (qd != null) q.setQuotationDate(qd.toLocalDate());
        Date vd = rs.getDate("valid_until");
        if (vd != null) q.setValidUntil(vd.toLocalDate());

        q.setContactPerson(rs.getString("contact_person"));
        q.setPaymentTerms(rs.getString("payment_terms"));
        q.setDeliveryTime(rs.getString("delivery_time"));
        q.setDeliveryLocation(rs.getString("delivery_location"));
        q.setSubtotalAmount(rs.getBigDecimal("subtotal_amount"));
        q.setTaxAmount(rs.getBigDecimal("tax_amount"));
        q.setDeliveryCharges(rs.getBigDecimal("delivery_charges"));
        q.setOtherCharges(rs.getBigDecimal("other_charges"));
        q.setFinalAmount(rs.getBigDecimal("final_amount"));
        q.setStatus(rs.getString("status"));
        q.setSelectionJustification(rs.getString("selection_justification"));
        q.setNotes(rs.getString("notes"));
        q.setDocumentName(rs.getString("document_name"));
        q.setDocumentUrl(rs.getString("document_url"));
        q.setRevisionNumber(rs.getInt("revision_number"));
        q.setIsLatest(rs.getBoolean("is_latest"));
        long pId = rs.getLong("parent_quotation_id");
        if (!rs.wasNull()) q.setParentQuotationId(pId);
        long prId = rs.getLong("pr_id");
        if (!rs.wasNull()) q.setPrId(prId);
        q.setPrNumber(rs.getString("pr_number"));
        q.setCreatedBy(rs.getString("created_by"));

        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) q.setCreatedAt(cat.toInstant().atOffset(ZoneOffset.UTC));
        q.setUpdatedBy(rs.getString("updated_by"));
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) q.setUpdatedAt(uat.toInstant().atOffset(ZoneOffset.UTC));

        q.setApprovedBy(rs.getString("approved_by"));
        Timestamp aat = rs.getTimestamp("approved_at");
        if (aat != null) q.setApprovedAt(aat.toInstant().atOffset(ZoneOffset.UTC));
        q.setEvaluationNotes(rs.getString("evaluation_notes"));
        return q;
    };

    private final RowMapper<VendorQuotationItem> itemRowMapper = (rs, rowNum) -> {
        VendorQuotationItem item = new VendorQuotationItem();
        item.setId(rs.getLong("id"));
        item.setQuotationId(rs.getLong("quotation_id"));
        long prItemId = rs.getLong("pr_item_id");
        if (!rs.wasNull()) item.setPrItemId(prItemId);
        long iId = rs.getLong("item_id");
        if (!rs.wasNull()) item.setItemId(iId);
        item.setItemCode(rs.getString("item_code"));
        item.setItemDescription(rs.getString("item_description"));
        try {
            item.setCategory(rs.getString("category"));
        } catch (Exception ignored) {
            item.setCategory("FG");
        }
        item.setUom(rs.getString("uom"));
        item.setQuotedQuantity(rs.getBigDecimal("quoted_quantity"));
        item.setUnitRate(rs.getBigDecimal("unit_rate"));
        item.setDiscountPercent(rs.getBigDecimal("discount_percent"));
        item.setDiscountAmount(rs.getBigDecimal("discount_amount"));
        item.setTaxType(rs.getString("tax_type"));
        item.setTaxPercent(rs.getBigDecimal("tax_percent"));
        item.setTaxAmount(rs.getBigDecimal("tax_amount"));
        item.setAdditionalCharges(rs.getBigDecimal("additional_charges"));
        item.setLineTotal(rs.getBigDecimal("line_total"));
        item.setEffectiveUnitCost(rs.getBigDecimal("effective_unit_cost"));
        Timestamp t = rs.getTimestamp("created_at");
        if (t != null) item.setCreatedAt(t.toInstant().atOffset(ZoneOffset.UTC));
        return item;
    };

    // 1. Dashboard summary cards
    public QuotationSummaryDto getSummary() {
        autoExpireOverdueQuotations();
        QuotationSummaryDto dto = new QuotationSummaryDto();
        dto.setTotalQuotations(jdbc.queryForObject(
                "SELECT COUNT(*) FROM vendor_quotations WHERE is_latest = TRUE", Long.class));
        dto.setAwaitingReviewCount(jdbc.queryForObject(
                "SELECT COUNT(*) FROM vendor_quotations WHERE is_latest = TRUE AND status IN ('Draft', 'Submitted for Review', 'Under Evaluation')", Long.class));
        dto.setApprovedCount(jdbc.queryForObject(
                "SELECT COUNT(*) FROM vendor_quotations WHERE is_latest = TRUE AND status = 'Selected for Purchase'", Long.class));
        dto.setExpiringSoonCount(jdbc.queryForObject(
                "SELECT COUNT(*) FROM vendor_quotations WHERE is_latest = TRUE AND valid_until BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days') AND status NOT IN ('Rejected', 'Expired')", Long.class));
        dto.setActiveVendorsCount(jdbc.queryForObject(
                "SELECT COUNT(DISTINCT vendor_code) FROM vendor_quotations WHERE is_latest = TRUE", Long.class));
        dto.setRecentlyReceivedCount(jdbc.queryForObject(
                "SELECT COUNT(*) FROM vendor_quotations WHERE is_latest = TRUE AND quotation_date >= (CURRENT_DATE - INTERVAL '14 days')", Long.class));
        return dto;
    }

    // 2. Find All Quotations with dynamic filters
    public List<VendorQuotation> findAll(String search, String vendorCode, String itemCode, String status,
                                         String startDate, String endDate, BigDecimal minAmount, BigDecimal maxAmount) {
        autoExpireOverdueQuotations();
        StringBuilder sql = new StringBuilder("SELECT DISTINCT q.* FROM vendor_quotations q ");
        List<Object> params = new ArrayList<>();

        if (itemCode != null && !itemCode.trim().isEmpty()) {
            sql.append("INNER JOIN vendor_quotation_items it ON it.quotation_id = q.id ");
        }

        sql.append("WHERE q.is_latest = TRUE ");

        if (search != null && !search.trim().isEmpty()) {
            sql.append("AND (q.quotation_number ILIKE ? OR q.vendor_name ILIKE ? OR q.vendor_ref_no ILIKE ? OR q.vendor_code ILIKE ?) ");
            String s = "%" + search.trim() + "%";
            params.add(s); params.add(s); params.add(s); params.add(s);
        }

        if (vendorCode != null && !vendorCode.trim().isEmpty()) {
            sql.append("AND q.vendor_code = ? ");
            params.add(vendorCode.trim());
        }

        if (itemCode != null && !itemCode.trim().isEmpty()) {
            sql.append("AND it.item_code = ? ");
            params.add(itemCode.trim());
        }

        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
            sql.append("AND q.status = ? ");
            params.add(status.trim());
        }

        if (startDate != null && !startDate.trim().isEmpty()) {
            sql.append("AND q.quotation_date >= ?::date ");
            params.add(startDate.trim());
        }

        if (endDate != null && !endDate.trim().isEmpty()) {
            sql.append("AND q.quotation_date <= ?::date ");
            params.add(endDate.trim());
        }

        if (minAmount != null) {
            sql.append("AND q.final_amount >= ? ");
            params.add(minAmount);
        }

        if (maxAmount != null) {
            sql.append("AND q.final_amount <= ? ");
            params.add(maxAmount);
        }

        sql.append("ORDER BY q.created_at DESC");

        List<VendorQuotation> list = jdbc.query(sql.toString(), quotationRowMapper, params.toArray());

        // Attach line items for each quotation
        for (VendorQuotation q : list) {
            List<VendorQuotationItem> items = jdbc.query(
                    "SELECT * FROM vendor_quotation_items WHERE quotation_id = ? ORDER BY id ASC",
                    itemRowMapper, q.getId());
            q.setItems(items);
        }

        return list;
    }

    // 3. Find by ID
    public Optional<VendorQuotation> findById(Long id) {
        List<VendorQuotation> list = jdbc.query(
                "SELECT * FROM vendor_quotations WHERE id = ?", quotationRowMapper, id);
        if (list.isEmpty()) return Optional.empty();

        VendorQuotation q = list.get(0);
        List<VendorQuotationItem> items = jdbc.query(
                "SELECT * FROM vendor_quotation_items WHERE quotation_id = ? ORDER BY id ASC",
                itemRowMapper, q.getId());
        q.setItems(items);

        List<VendorQuotationHistory> history = jdbc.query(
                "SELECT * FROM vendor_quotation_history WHERE quotation_id = ? ORDER BY action_at DESC",
                (rs, rowNum) -> {
                    VendorQuotationHistory h = new VendorQuotationHistory();
                    h.setId(rs.getLong("id"));
                    h.setQuotationId(rs.getLong("quotation_id"));
                    h.setAction(rs.getString("action"));
                    h.setActionBy(rs.getString("action_by"));
                    Timestamp at = rs.getTimestamp("action_at");
                    if (at != null) h.setActionAt(at.toInstant().atOffset(ZoneOffset.UTC));
                    h.setComments(rs.getString("comments"));
                    h.setDetailsJson(rs.getString("details_json"));
                    return h;
                }, q.getId());
        q.setHistory(history);

        List<VendorQuotationComment> comments = jdbc.query(
                "SELECT * FROM vendor_quotation_comments WHERE quotation_id = ? ORDER BY created_at ASC",
                (rs, rowNum) -> {
                    VendorQuotationComment c = new VendorQuotationComment();
                    c.setId(rs.getLong("id"));
                    c.setQuotationId(rs.getLong("quotation_id"));
                    c.setAuthor(rs.getString("author"));
                    c.setComment(rs.getString("comment"));
                    Timestamp cat = rs.getTimestamp("created_at");
                    if (cat != null) c.setCreatedAt(cat.toInstant().atOffset(ZoneOffset.UTC));
                    return c;
                }, q.getId());
        q.setComments(comments);

        return Optional.of(q);
    }

    // 4. Save or Update Quotation with automatic calculations
    @Transactional
    public VendorQuotation saveOrUpdate(VendorQuotation q, boolean submitForReview) {
        if (q.getVendorName() == null || q.getVendorName().trim().isEmpty()) {
            throw new IllegalArgumentException("Vendor selection is required.");
        }
        if (q.getVendorCode() == null || q.getVendorCode().trim().isEmpty()) {
            q.setVendorCode("VEND-" + (q.getVendorId() != null ? q.getVendorId() : (System.currentTimeMillis() % 10000)));
        }
        if (q.getQuotationDate() == null) {
            q.setQuotationDate(LocalDate.now());
        }
        if (q.getValidUntil() == null) {
            q.setValidUntil(q.getQuotationDate().plusDays(30));
        }
        if (q.getItems() == null || q.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item line is required for a quotation.");
        }

        // Auto-generate quotation number if not present
        if (q.getQuotationNumber() == null || q.getQuotationNumber().trim().isEmpty()) {
            int year = LocalDate.now().getYear();
            Integer nextVal = jdbc.queryForObject(
                    "SELECT COALESCE(MAX(id), 0) + 1 FROM vendor_quotations", Integer.class);
            q.setQuotationNumber(String.format("QT-%d-%04d", year, nextVal));
        }

        // Perform exact calculations using BigDecimal
        BigDecimal totalSubtotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        for (VendorQuotationItem item : q.getItems()) {
            if (item.getItemCode() == null || item.getItemCode().trim().isEmpty()) {
                throw new IllegalArgumentException("Item code is required for all rows.");
            }
            if (item.getItemDescription() == null || item.getItemDescription().trim().isEmpty()) {
                item.setItemDescription(item.getItemCode());
            }
            BigDecimal qty = item.getQuotedQuantity() != null && item.getQuotedQuantity().compareTo(BigDecimal.ZERO) > 0
                    ? item.getQuotedQuantity() : BigDecimal.ONE;
            BigDecimal rate = item.getUnitRate() != null && item.getUnitRate().compareTo(BigDecimal.ZERO) >= 0
                    ? item.getUnitRate() : BigDecimal.ZERO;

            item.setQuotedQuantity(qty);
            item.setUnitRate(rate);

            BigDecimal lineBase = rate.multiply(qty).setScale(2, RoundingMode.HALF_UP);

            // Discount: calculate total line discount
            BigDecimal discPct = item.getDiscountPercent() != null ? item.getDiscountPercent() : BigDecimal.ZERO;
            BigDecimal discAmt = BigDecimal.ZERO;

            if (discPct.compareTo(BigDecimal.ZERO) > 0) {
                discAmt = lineBase.multiply(discPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            } else if (item.getDiscountAmount() != null && item.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                discAmt = item.getDiscountAmount();
            }
            item.setDiscountPercent(discPct);
            item.setDiscountAmount(discAmt);

            // Line Taxable: line base minus total line discount
            BigDecimal lineTaxable = lineBase.subtract(discAmt).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

            // Tax
            BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : new BigDecimal("18.00");
            BigDecimal taxAmt = lineTaxable.multiply(taxPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            item.setTaxPercent(taxPct);
            item.setTaxAmount(taxAmt);

            // Additional Charges (item level)
            BigDecimal addCharges = item.getAdditionalCharges() != null ? item.getAdditionalCharges() : BigDecimal.ZERO;
            item.setAdditionalCharges(addCharges);

            // Line Total
            BigDecimal lineTotal = lineTaxable.add(taxAmt).add(addCharges).setScale(2, RoundingMode.HALF_UP);
            item.setLineTotal(lineTotal);

            // Effective unit cost
            BigDecimal effUnitCost = qty.compareTo(BigDecimal.ZERO) > 0
                    ? lineTotal.divide(qty, 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            item.setEffectiveUnitCost(effUnitCost);

            totalSubtotal = totalSubtotal.add(lineTaxable);
            totalTax = totalTax.add(taxAmt);
        }

        q.setSubtotalAmount(totalSubtotal);
        q.setTaxAmount(totalTax);

        BigDecimal deliveryCharges = q.getDeliveryCharges() != null ? q.getDeliveryCharges() : BigDecimal.ZERO;
        BigDecimal otherCharges = q.getOtherCharges() != null ? q.getOtherCharges() : BigDecimal.ZERO;
        BigDecimal finalTotal = totalSubtotal.add(totalTax).add(deliveryCharges).add(otherCharges).setScale(2, RoundingMode.HALF_UP);
        q.setFinalAmount(finalTotal);

        if (submitForReview) {
            q.setStatus("Submitted for Review");
        } else if (q.getStatus() == null || q.getStatus().trim().isEmpty()) {
            q.setStatus("Draft");
        }

        Long quotationId = q.getId();
        boolean isNew = (quotationId == null || quotationId == 0);

        if (isNew && q.getQuotationNumber() != null && !q.getQuotationNumber().trim().isEmpty()) {
            List<Long> exist = jdbc.queryForList("SELECT id FROM vendor_quotations WHERE quotation_number = ?", Long.class, q.getQuotationNumber().trim());
            if (!exist.isEmpty()) {
                quotationId = exist.get(0);
                q.setId(quotationId);
                isNew = false;
            }
        }

        if (isNew) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                        "INSERT INTO vendor_quotations (" +
                                "quotation_number, pr_id, pr_number, vendor_id, vendor_code, vendor_name, vendor_ref_no, " +
                                "quotation_date, valid_until, contact_person, payment_terms, delivery_time, " +
                                "delivery_location, subtotal_amount, tax_amount, delivery_charges, other_charges, " +
                                "final_amount, status, notes, document_name, document_url, revision_number, is_latest, " +
                                "created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, q.getQuotationNumber());
                if (q.getPrId() != null) ps.setLong(2, q.getPrId()); else ps.setNull(2, java.sql.Types.BIGINT);
                ps.setString(3, q.getPrNumber());
                if (q.getVendorId() != null) ps.setLong(4, q.getVendorId()); else ps.setNull(4, java.sql.Types.BIGINT);
                ps.setString(5, q.getVendorCode());
                ps.setString(6, q.getVendorName());
                ps.setString(7, q.getVendorRefNo());
                ps.setDate(8, Date.valueOf(q.getQuotationDate()));
                ps.setDate(9, Date.valueOf(q.getValidUntil()));
                ps.setString(10, q.getContactPerson());
                ps.setString(11, q.getPaymentTerms());
                ps.setString(12, q.getDeliveryTime());
                ps.setString(13, q.getDeliveryLocation());
                ps.setBigDecimal(14, q.getSubtotalAmount());
                ps.setBigDecimal(15, q.getTaxAmount());
                ps.setBigDecimal(16, q.getDeliveryCharges());
                ps.setBigDecimal(17, q.getOtherCharges());
                ps.setBigDecimal(18, q.getFinalAmount());
                ps.setString(19, q.getStatus());
                ps.setString(20, q.getNotes());
                ps.setString(21, q.getDocumentName());
                ps.setString(22, q.getDocumentUrl());
                ps.setInt(23, q.getRevisionNumber() != null ? q.getRevisionNumber() : 1);
                ps.setBoolean(24, q.getIsLatest() != null ? q.getIsLatest() : true);
                ps.setString(25, q.getCreatedBy() != null ? q.getCreatedBy() : "Purchase Officer");
                ps.setString(26, q.getUpdatedBy() != null ? q.getUpdatedBy() : "Purchase Officer");
                return ps;
            }, keyHolder);

            Number n = null;
            if (keyHolder.getKeys() != null && keyHolder.getKeys().containsKey("id")) {
                n = (Number) keyHolder.getKeys().get("id");
            } else if (!keyHolder.getKeyList().isEmpty() && keyHolder.getKeyList().get(0).containsKey("id")) {
                n = (Number) keyHolder.getKeyList().get(0).get("id");
            } else {
                n = keyHolder.getKey();
            }
            quotationId = n != null ? n.longValue() : 0L;
            q.setId(quotationId);

            recordHistory(quotationId, submitForReview ? "SUBMITTED_FOR_REVIEW" : "CREATED",
                    q.getCreatedBy(), submitForReview ? "Quotation created and submitted for review." : "Quotation saved as Draft.");
        } else {
            jdbc.update(
                    "UPDATE vendor_quotations SET " +
                            "pr_id = ?, pr_number = ?, vendor_id = ?, vendor_code = ?, vendor_name = ?, vendor_ref_no = ?, " +
                            "quotation_date = ?, valid_until = ?, contact_person = ?, payment_terms = ?, " +
                            "delivery_time = ?, delivery_location = ?, subtotal_amount = ?, tax_amount = ?, " +
                            "delivery_charges = ?, other_charges = ?, final_amount = ?, status = ?, notes = ?, " +
                            "document_name = ?, document_url = ?, updated_by = ?, updated_at = NOW() " +
                            "WHERE id = ?",
                    q.getPrId(), q.getPrNumber(), q.getVendorId(), q.getVendorCode(), q.getVendorName(), q.getVendorRefNo(),
                    Date.valueOf(q.getQuotationDate()), Date.valueOf(q.getValidUntil()), q.getContactPerson(),
                    q.getPaymentTerms(), q.getDeliveryTime(), q.getDeliveryLocation(), q.getSubtotalAmount(),
                    q.getTaxAmount(), q.getDeliveryCharges(), q.getOtherCharges(), q.getFinalAmount(),
                    q.getStatus(), q.getNotes(), q.getDocumentName(), q.getDocumentUrl(),
                    q.getUpdatedBy(), quotationId);

            // Remove existing items and re-insert
            jdbc.update("DELETE FROM vendor_quotation_items WHERE quotation_id = ?", quotationId);

            recordHistory(quotationId, submitForReview ? "SUBMITTED_FOR_REVIEW" : "UPDATED",
                    q.getUpdatedBy(), submitForReview ? "Quotation updated and submitted for review." : "Quotation updated.");
        }

        // Insert Line Items
        for (VendorQuotationItem item : q.getItems()) {
            jdbc.update(
                    "INSERT INTO vendor_quotation_items (" +
                            "quotation_id, pr_item_id, item_id, item_code, item_description, category, uom, quoted_quantity, " +
                            "unit_rate, discount_percent, discount_amount, tax_type, tax_percent, tax_amount, " +
                            "additional_charges, line_total, effective_unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    quotationId, item.getPrItemId(), item.getItemId(), item.getItemCode(), item.getItemDescription(),
                    item.getCategory() != null ? item.getCategory() : "FG", item.getUom(),
                    item.getQuotedQuantity(), item.getUnitRate(), item.getDiscountPercent(), item.getDiscountAmount(),
                    item.getTaxType(), item.getTaxPercent(), item.getTaxAmount(), item.getAdditionalCharges(),
                    item.getLineTotal(), item.getEffectiveUnitCost());
        }

        return findById(quotationId).orElse(q);
    }

    // 5. Update Status (Workflow: Draft -> Submitted for Review -> Under Evaluation -> Selected for Purchase / Rejected)
    @Transactional
    public VendorQuotation updateStatus(Long id, String status, String justification, String evaluationNotes, String user) {
        VendorQuotation existing = findById(id).orElseThrow(
                () -> new IllegalArgumentException("Quotation not found with id: " + id));

        String actor = (user != null && !user.trim().isEmpty()) ? user : "Authorized Reviewer";

        if ("Selected for Purchase".equalsIgnoreCase(status)) {
            if (existing.getValidUntil() != null && existing.getValidUntil().isBefore(LocalDate.now())) {
                throw new IllegalArgumentException("Quotation has expired and cannot be used for purchase processing.");
            }
            jdbc.update(
                    "UPDATE vendor_quotations SET status = ?, selection_justification = ?, evaluation_notes = ?, " +
                            "approved_by = ?, approved_at = NOW(), updated_by = ?, updated_at = NOW() WHERE id = ?",
                    status, justification, evaluationNotes, actor, actor, id);

            recordHistory(id, "APPROVED_FOR_PURCHASE", actor,
                    "Quotation approved for purchase consideration. Justification: " + (justification != null ? justification : "Standard compliant quote."));
        } else if ("Rejected".equalsIgnoreCase(status)) {
            jdbc.update(
                    "UPDATE vendor_quotations SET status = ?, evaluation_notes = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
                    status, evaluationNotes, actor, id);

            recordHistory(id, "REJECTED", actor,
                    "Quotation rejected. Reason: " + (evaluationNotes != null ? evaluationNotes : "Commercial / Technical non-compliance."));
        } else {
            jdbc.update(
                    "UPDATE vendor_quotations SET status = ?, evaluation_notes = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
                    status, evaluationNotes, actor, id);

            recordHistory(id, status.toUpperCase().replace(' ', '_'), actor,
                    "Quotation status updated to " + status + ".");
        }

        return findById(id).orElse(existing);
    }

    // 6. Create Revision without overwriting previous versions
    @Transactional
    public VendorQuotation createRevision(Long id, String user) {
        VendorQuotation original = findById(id).orElseThrow(
                () -> new IllegalArgumentException("Quotation not found with id: " + id));

        String actor = (user != null && !user.trim().isEmpty()) ? user : "Purchase Officer";
        int newRev = original.getRevisionNumber() + 1;
        String newQuotationNum = original.getQuotationNumber().replaceAll("-R\\d+$", "") + "-R" + newRev;

        // Mark original as no longer the latest
        jdbc.update("UPDATE vendor_quotations SET is_latest = FALSE WHERE id = ?", id);

        // Insert new revision
        VendorQuotation rev = new VendorQuotation();
        rev.setQuotationNumber(newQuotationNum);
        rev.setPrId(original.getPrId());
        rev.setPrNumber(original.getPrNumber());
        rev.setVendorId(original.getVendorId());
        rev.setVendorCode(original.getVendorCode());
        rev.setVendorName(original.getVendorName());
        rev.setVendorRefNo(original.getVendorRefNo());
        rev.setQuotationDate(LocalDate.now());
        rev.setValidUntil(LocalDate.now().plusDays(30));
        rev.setContactPerson(original.getContactPerson());
        rev.setPaymentTerms(original.getPaymentTerms());
        rev.setDeliveryTime(original.getDeliveryTime());
        rev.setDeliveryLocation(original.getDeliveryLocation());
        rev.setSubtotalAmount(original.getSubtotalAmount());
        rev.setTaxAmount(original.getTaxAmount());
        rev.setDeliveryCharges(original.getDeliveryCharges());
        rev.setOtherCharges(original.getOtherCharges());
        rev.setFinalAmount(original.getFinalAmount());
        rev.setStatus("Draft");
        rev.setNotes("Revision " + newRev + " created from " + original.getQuotationNumber());
        rev.setRevisionNumber(newRev);
        rev.setIsLatest(true);
        rev.setParentQuotationId(id);
        rev.setCreatedBy(actor);
        rev.setUpdatedBy(actor);

        List<VendorQuotationItem> clonedItems = new ArrayList<>();
        for (VendorQuotationItem it : original.getItems()) {
            VendorQuotationItem clone = new VendorQuotationItem();
            clone.setPrItemId(it.getPrItemId());
            clone.setItemId(it.getItemId());
            clone.setItemCode(it.getItemCode());
            clone.setItemDescription(it.getItemDescription());
            clone.setUom(it.getUom());
            clone.setQuotedQuantity(it.getQuotedQuantity());
            clone.setUnitRate(it.getUnitRate());
            clone.setDiscountPercent(it.getDiscountPercent());
            clone.setDiscountAmount(it.getDiscountAmount());
            clone.setTaxType(it.getTaxType());
            clone.setTaxPercent(it.getTaxPercent());
            clone.setTaxAmount(it.getTaxAmount());
            clone.setAdditionalCharges(it.getAdditionalCharges());
            clone.setLineTotal(it.getLineTotal());
            clone.setEffectiveUnitCost(it.getEffectiveUnitCost());
            clonedItems.add(clone);
        }
        rev.setItems(clonedItems);

        VendorQuotation savedRev = saveOrUpdate(rev, false);

        recordHistory(savedRev.getId(), "REVISION_CREATED", actor,
                "Revision " + newRev + " created from earlier quotation #" + original.getQuotationNumber());

        return savedRev;
    }

    // 7. Add Comment / Internal Note
    public VendorQuotationComment addComment(Long id, String author, String comment) {
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Comment text cannot be empty.");
        }
        String user = (author != null && !author.trim().isEmpty()) ? author : "Internal User";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO vendor_quotation_comments (quotation_id, author, comment) VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, id);
            ps.setString(2, user);
            ps.setString(3, comment.trim());
            return ps;
        }, keyHolder);

        recordHistory(id, "COMMENT_ADDED", user, "Added internal note: " + (comment.length() > 60 ? comment.substring(0, 57) + "..." : comment));

        VendorQuotationComment c = new VendorQuotationComment();
        c.setId(((Number) Objects.requireNonNull(keyHolder.getKeys()).get("id")).longValue());
        c.setQuotationId(id);
        c.setAuthor(user);
        c.setComment(comment.trim());
        c.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return c;
    }

    // 8. Delete Quotation (only if Draft or Rejected)
    @Transactional
    public void deleteQuotation(Long id) {
        VendorQuotation q = findById(id).orElseThrow(
                () -> new IllegalArgumentException("Quotation not found with id: " + id));

        if ("Selected for Purchase".equalsIgnoreCase(q.getStatus())) {
            throw new IllegalStateException("Approved quotations selected for purchase cannot be deleted. Preserve historical audit trail.");
        }

        jdbc.update("DELETE FROM vendor_quotations WHERE id = ?", id);
    }

    // 9. Item Rate Comparison
    public List<RateComparisonDto> getRateComparison(String itemCode, BigDecimal requiredQuantity, LocalDate comparisonDate) {
        if (itemCode == null || itemCode.trim().isEmpty()) {
            return Collections.emptyList();
        }

        BigDecimal reqQty = (requiredQuantity != null && requiredQuantity.compareTo(BigDecimal.ZERO) > 0)
                ? requiredQuantity : new BigDecimal("100.00");

        String sql = "SELECT q.id AS q_id, q.quotation_number, q.vendor_id, q.vendor_code, q.vendor_name, " +
                "q.quotation_date, q.valid_until, q.payment_terms, q.delivery_time, q.delivery_charges, q.status, " +
                "it.item_code, it.item_description, it.uom, it.quoted_quantity, it.unit_rate, " +
                "it.discount_percent, it.discount_amount, it.tax_type, it.tax_percent, it.tax_amount, " +
                "it.additional_charges, it.line_total, it.effective_unit_cost " +
                "FROM vendor_quotations q " +
                "INNER JOIN vendor_quotation_items it ON it.quotation_id = q.id " +
                "WHERE it.item_code = ? AND q.is_latest = TRUE ";

        List<Object> params = new ArrayList<>();
        params.add(itemCode.trim());

        if (comparisonDate != null) {
            sql += "AND q.quotation_date <= ? ";
            params.add(Date.valueOf(comparisonDate));
        }

        sql += "ORDER BY it.effective_unit_cost ASC";

        List<RateComparisonDto> results = jdbc.query(sql, (rs, rowNum) -> {
            RateComparisonDto dto = new RateComparisonDto();
            dto.setQuotationId(rs.getLong("q_id"));
            dto.setQuotationNumber(rs.getString("quotation_number"));
            dto.setVendorId(rs.getLong("vendor_id"));
            dto.setVendorCode(rs.getString("vendor_code"));
            dto.setVendorName(rs.getString("vendor_name"));
            dto.setQuotationDate(rs.getDate("quotation_date").toLocalDate());
            dto.setValidUntil(rs.getDate("valid_until").toLocalDate());
            dto.setPaymentTerms(rs.getString("payment_terms"));
            dto.setDeliveryTime(rs.getString("delivery_time"));
            dto.setQuotationDeliveryCharges(rs.getBigDecimal("delivery_charges"));
            dto.setStatus(rs.getString("status"));

            dto.setItemCode(rs.getString("item_code"));
            dto.setItemDescription(rs.getString("item_description"));
            dto.setUom(rs.getString("uom"));
            dto.setQuotedQuantity(rs.getBigDecimal("quoted_quantity"));
            dto.setUnitRate(rs.getBigDecimal("unit_rate"));
            dto.setDiscountPercent(rs.getBigDecimal("discount_percent"));
            dto.setDiscountAmount(rs.getBigDecimal("discount_amount"));
            dto.setTaxType(rs.getString("tax_type"));
            dto.setTaxPercent(rs.getBigDecimal("tax_percent"));
            dto.setTaxAmount(rs.getBigDecimal("tax_amount"));
            dto.setItemAdditionalCharges(rs.getBigDecimal("additional_charges"));
            dto.setEffectiveUnitCost(rs.getBigDecimal("effective_unit_cost"));

            // Calculated total for requested quantity
            BigDecimal costForReq = dto.getEffectiveUnitCost().multiply(reqQty).setScale(2, RoundingMode.HALF_UP);
            dto.setCalculatedTotalForRequestedQty(costForReq);
            return dto;
        }, params.toArray());

        if (results.isEmpty()) return results;

        // Fetch previous purchase rate from earlier quotes or baseline for this vendor
        for (RateComparisonDto r : results) {
            List<BigDecimal> prevRates = jdbc.query(
                    "SELECT it.unit_rate FROM vendor_quotation_items it " +
                            "JOIN vendor_quotations q ON q.id = it.quotation_id " +
                            "WHERE it.item_code = ? AND q.vendor_code = ? AND q.id != ? " +
                            "ORDER BY q.quotation_date DESC LIMIT 1",
                    (rs, rowNum) -> rs.getBigDecimal(1),
                    r.getItemCode(), r.getVendorCode(), r.getQuotationId());

            if (!prevRates.isEmpty()) {
                r.setPreviousPurchaseRate(prevRates.get(0));
            } else {
                // If no earlier quote exists, query item_master baseline price if present
                List<BigDecimal> masterPrice = jdbc.query(
                        "SELECT price FROM public.item_master WHERE sms_new_part_no = ? AND price IS NOT NULL LIMIT 1",
                        (rs, rowNum) -> rs.getBigDecimal(1), r.getItemCode());
                if (!masterPrice.isEmpty()) {
                    r.setPreviousPurchaseRate(masterPrice.get(0));
                }
            }
        }

        // Identify lowest comparable price
        BigDecimal lowestCost = results.get(0).getEffectiveUnitCost();
        results.get(0).setIsLowestPrice(true);
        results.get(0).setDiffFromLowestPrice(BigDecimal.ZERO);
        results.get(0).setDiffPercentFromLowest(BigDecimal.ZERO);

        for (int i = 1; i < results.size(); i++) {
            RateComparisonDto r = results.get(i);
            BigDecimal diff = r.getEffectiveUnitCost().subtract(lowestCost).setScale(4, RoundingMode.HALF_UP);
            r.setDiffFromLowestPrice(diff);
            if (lowestCost.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal diffPct = diff.multiply(new BigDecimal("100")).divide(lowestCost, 2, RoundingMode.HALF_UP);
                r.setDiffPercentFromLowest(diffPct);
            } else {
                r.setDiffPercentFromLowest(BigDecimal.ZERO);
            }
        }

        return results;
    }

    // 10. Vendor Price History
    public List<PriceHistoryDto> getPriceHistory(String itemCode, String vendorCode) {
        StringBuilder sql = new StringBuilder(
                "SELECT q.vendor_name, q.vendor_code, it.item_code, it.item_description, " +
                        "q.quotation_number, q.quotation_date, it.unit_rate, it.discount_amount, " +
                        "it.tax_amount, q.delivery_charges, it.effective_unit_cost, q.status, " +
                        "q.revision_number " +
                        "FROM vendor_quotation_items it " +
                        "JOIN vendor_quotations q ON q.id = it.quotation_id " +
                        "WHERE 1=1 ");

        List<Object> params = new ArrayList<>();
        if (itemCode != null && !itemCode.trim().isEmpty()) {
            sql.append("AND it.item_code = ? ");
            params.add(itemCode.trim());
        }
        if (vendorCode != null && !vendorCode.trim().isEmpty() && !"ALL".equalsIgnoreCase(vendorCode)) {
            sql.append("AND q.vendor_code = ? ");
            params.add(vendorCode.trim());
        }

        sql.append("ORDER BY q.quotation_date ASC, q.revision_number ASC");

        return jdbc.query(sql.toString(), (rs, rowNum) -> {
            PriceHistoryDto dto = new PriceHistoryDto();
            dto.setVendorName(rs.getString("vendor_name"));
            dto.setVendorCode(rs.getString("vendor_code"));
            dto.setItemCode(rs.getString("item_code"));
            dto.setItemDescription(rs.getString("item_description"));
            dto.setQuotationNumber(rs.getString("quotation_number"));
            dto.setQuotationDate(rs.getDate("quotation_date").toLocalDate());
            dto.setUnitRate(rs.getBigDecimal("unit_rate"));
            dto.setDiscountAmount(rs.getBigDecimal("discount_amount"));
            dto.setTaxAmount(rs.getBigDecimal("tax_amount"));
            dto.setDeliveryCharges(rs.getBigDecimal("delivery_charges"));
            dto.setEffectiveUnitCost(rs.getBigDecimal("effective_unit_cost"));
            dto.setStatus(rs.getString("status"));
            dto.setRevisionNumber(rs.getInt("revision_number"));
            // Mock or link PO if selected
            if ("Selected for Purchase".equalsIgnoreCase(dto.getStatus())) {
                dto.setRelatedPoNumber("PO-" + rs.getDate("quotation_date").toString().substring(0, 4) + "-" + rs.getString("vendor_code"));
                dto.setActualPurchaseRate(dto.getUnitRate());
            }
            return dto;
        }, params.toArray());
    }

    // 11. Vendor-Wise Performance Comparison
    public List<VendorAnalysisDto> getVendorAnalysis() {
        String vendorSql = "SELECT DISTINCT vendor_code, vendor_name FROM vendor_quotations";
        List<Map<String, Object>> vendors = jdbc.queryForList(vendorSql);

        List<VendorAnalysisDto> list = new ArrayList<>();
        for (Map<String, Object> row : vendors) {
            String vCode = (String) row.get("vendor_code");
            String vName = (String) row.get("vendor_name");

            VendorAnalysisDto dto = new VendorAnalysisDto();
            dto.setVendorCode(vCode);
            dto.setVendorName(vName);

            Long totalSubmitted = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM vendor_quotations WHERE vendor_code = ?", Long.class, vCode);
            Long totalSelected = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM vendor_quotations WHERE vendor_code = ? AND status = 'Selected for Purchase'", Long.class, vCode);
            Long itemsCount = jdbc.queryForObject(
                    "SELECT COUNT(DISTINCT it.item_code) FROM vendor_quotation_items it " +
                            "JOIN vendor_quotations q ON q.id = it.quotation_id WHERE q.vendor_code = ?", Long.class, vCode);
            BigDecimal totalAmount = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(final_amount), 0) FROM vendor_quotations WHERE vendor_code = ?", BigDecimal.class, vCode);

            dto.setQuotationsSubmittedCount(totalSubmitted != null ? totalSubmitted : 0);
            dto.setQuotationsSelectedCount(totalSelected != null ? totalSelected : 0);
            dto.setItemsQuotedCount(itemsCount != null ? itemsCount : 0);
            dto.setTotalQuotedAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO);

            if (dto.getQuotationsSubmittedCount() > 0) {
                double pct = ((double) dto.getQuotationsSelectedCount() / (double) dto.getQuotationsSubmittedCount()) * 100.0;
                dto.setSelectionRatePercent(Math.round(pct * 100.0) / 100.0);
            }

            // Common terms & delivery
            List<String> terms = jdbc.query(
                    "SELECT payment_terms FROM vendor_quotations WHERE vendor_code = ? AND payment_terms IS NOT NULL LIMIT 1",
                    (rs, idx) -> rs.getString(1), vCode);
            dto.setCommonPaymentTerms(terms.isEmpty() ? "Net 30 Days" : terms.get(0));

            List<String> del = jdbc.query(
                    "SELECT delivery_time FROM vendor_quotations WHERE vendor_code = ? AND delivery_time IS NOT NULL LIMIT 1",
                    (rs, idx) -> rs.getString(1), vCode);
            dto.setAvgDeliveryTime(del.isEmpty() ? "7-10 Days" : del.get(0));

            // Quoted items summary
            List<VendorAnalysisDto.VendorQuotedItemSummary> itemSummaries = jdbc.query(
                    "SELECT it.item_code, it.item_description, it.unit_rate " +
                            "FROM vendor_quotation_items it " +
                            "JOIN vendor_quotations q ON q.id = it.quotation_id " +
                            "WHERE q.vendor_code = ? " +
                            "ORDER BY q.quotation_date DESC",
                    (rs, idx) -> {
                        VendorAnalysisDto.VendorQuotedItemSummary s = new VendorAnalysisDto.VendorQuotedItemSummary();
                        s.setItemCode(rs.getString("item_code"));
                        s.setItemDescription(rs.getString("item_description"));
                        s.setLatestQuotedPrice(rs.getBigDecimal("unit_rate"));
                        return s;
                    }, vCode);

            // De-duplicate by item code
            Map<String, VendorAnalysisDto.VendorQuotedItemSummary> map = new LinkedHashMap<>();
            for (VendorAnalysisDto.VendorQuotedItemSummary is : itemSummaries) {
                map.putIfAbsent(is.getItemCode(), is);
            }
            dto.setItems(new ArrayList<>(map.values()));

            list.add(dto);
        }

        return list;
    }

    // 12. Catalog Items Search (for dynamic quotation form item picker)
    public List<Map<String, Object>> searchItemsCatalog(String query) {
        String sql;
        List<Object> params = new ArrayList<>();
        if (query != null && !query.trim().isEmpty()) {
            sql = "SELECT id, " +
                    "COALESCE(NULLIF(sms_new_part_no, ''), NULLIF(main_fg_code, ''), NULLIF(old_code, ''), 'ITM-' || id) AS item_code, " +
                    "COALESCE(NULLIF(description_size, ''), NULLIF(subgroup, ''), 'Item ' || id) AS item_description, " +
                    "COALESCE(NULLIF(purchased_uom, ''), NULLIF(uom, ''), 'PCS') AS uom, " +
                    "COALESCE(price, 0.00) AS price, " +
                    "COALESCE(NULLIF(category, ''), NULLIF(group_name, ''), 'General') AS category, " +
                    "CASE WHEN UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG' THEN 'FG' ELSE 'OTHER' END AS item_type " +
                    "FROM public.item_master " +
                    "WHERE sms_new_part_no ILIKE ? OR description_size ILIKE ? OR old_code ILIKE ? " +
                    "ORDER BY CASE WHEN UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG' THEN 2 ELSE 1 END, id DESC LIMIT 500";
            String q = "%" + query.trim() + "%";
            params.add(q); params.add(q); params.add(q);
        } else {
            sql = "SELECT id, " +
                    "COALESCE(NULLIF(sms_new_part_no, ''), NULLIF(main_fg_code, ''), NULLIF(old_code, ''), 'ITM-' || id) AS item_code, " +
                    "COALESCE(NULLIF(description_size, ''), NULLIF(subgroup, ''), 'Item ' || id) AS item_description, " +
                    "COALESCE(NULLIF(purchased_uom, ''), NULLIF(uom, ''), 'PCS') AS uom, " +
                    "COALESCE(price, 0.00) AS price, " +
                    "COALESCE(NULLIF(category, ''), NULLIF(group_name, ''), 'General') AS category, " +
                    "CASE WHEN UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG' THEN 'FG' ELSE 'OTHER' END AS item_type " +
                    "FROM public.item_master " +
                    "ORDER BY CASE WHEN UPPER(COALESCE(group_name, '')) = 'FG' OR UPPER(COALESCE(category, '')) = 'FG' THEN 2 ELSE 1 END, id DESC LIMIT 2000";
        }

        return jdbc.queryForList(sql, params.toArray());
    }

    private void recordHistory(Long quotationId, String action, String actionBy, String comments) {
        try {
            jdbc.update(
                    "INSERT INTO vendor_quotation_history (quotation_id, action, action_by, comments) VALUES (?, ?, ?, ?)",
                    quotationId, action, (actionBy != null ? actionBy : "SYSTEM"), comments);
        } catch (Exception ignored) {}
    }
}
