package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.modules.purchase.model.RfqHeader;
import com.silvermuller.seals.modules.purchase.model.RfqItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RfqService {

    private final JdbcTemplate jdbc;

    public RfqService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<RfqHeader> rfqHeaderRowMapper = (rs, rowNum) -> {
        RfqHeader r = new RfqHeader();
        r.setId(rs.getLong("id"));
        r.setRfqNumber(rs.getString("rfq_number"));
        Date rd = rs.getDate("rfq_date");
        if (rd != null) r.setRfqDate(rd.toLocalDate());
        Date dd = rs.getDate("due_date");
        if (dd != null) r.setDueDate(dd.toLocalDate());
        r.setPrNumber(rs.getString("pr_number"));
        r.setPrDate(rs.getString("pr_date"));
        r.setDepartment(rs.getString("department"));
        r.setTitle(rs.getString("title"));
        r.setStatus(rs.getString("status"));
        r.setSelectedVendorsJson(rs.getString("selected_vendors_json"));
        r.setDeliveryLocation(rs.getString("delivery_location"));
        r.setPaymentTerms(rs.getString("payment_terms"));
        r.setTermsConditions(rs.getString("terms_conditions"));
        r.setRemarks(rs.getString("remarks"));
        r.setCreatedBy(rs.getString("created_by"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) r.setCreatedAt(cat.toInstant().toString());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) r.setUpdatedAt(uat.toInstant().toString());
        return r;
    };

    private final RowMapper<RfqItem> rfqItemRowMapper = (rs, rowNum) -> {
        RfqItem it = new RfqItem();
        it.setId(rs.getLong("id"));
        it.setRfqId(rs.getLong("rfq_id"));
        it.setRfqNumber(rs.getString("rfq_number"));
        it.setPrNumber(rs.getString("pr_number"));
        it.setItemCode(rs.getString("item_code"));
        it.setItemName(rs.getString("item_name"));
        it.setDescription(rs.getString("description"));
        it.setCategory(rs.getString("category"));
        it.setUom(rs.getString("uom"));
        it.setRequiredQty(rs.getBigDecimal("required_qty"));
        Date td = rs.getDate("target_date");
        if (td != null) it.setTargetDate(td.toLocalDate());
        it.setRemarks(rs.getString("remarks"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) it.setCreatedAt(cat.toInstant().toString());
        return it;
    };

    public List<RfqHeader> getAllRfqs() {
        List<RfqHeader> list = jdbc.query("SELECT * FROM rfq_headers ORDER BY id DESC", rfqHeaderRowMapper);
        for (RfqHeader r : list) {
            List<RfqItem> items = jdbc.query(
                "SELECT * FROM rfq_items WHERE rfq_id = ? ORDER BY id ASC", rfqItemRowMapper, r.getId());
            r.setItems(items);
        }
        return list;
    }

    public Optional<RfqHeader> getRfqById(Long id) {
        List<RfqHeader> list = jdbc.query("SELECT * FROM rfq_headers WHERE id = ?", rfqHeaderRowMapper, id);
        if (list.isEmpty()) return Optional.empty();
        RfqHeader r = list.get(0);
        List<RfqItem> items = jdbc.query(
            "SELECT * FROM rfq_items WHERE rfq_id = ? ORDER BY id ASC", rfqItemRowMapper, r.getId());
        r.setItems(items);
        return Optional.of(r);
    }

    public List<RfqHeader> getRfqsByPrNumber(String prNumber) {
        List<RfqHeader> list = jdbc.query(
            "SELECT * FROM rfq_headers WHERE pr_number = ? ORDER BY id DESC", rfqHeaderRowMapper, prNumber);
        for (RfqHeader r : list) {
            List<RfqItem> items = jdbc.query(
                "SELECT * FROM rfq_items WHERE rfq_id = ? ORDER BY id ASC", rfqItemRowMapper, r.getId());
            r.setItems(items);
        }
        return list;
    }

    /** The number the next RFQ will get, shown on the form. Nothing is reserved. */
    public String generateNextRfqNumber() {
        return DocumentNumbers.peek(jdbc, DocumentNumbers.Doc.RFQ);
    }

    @Transactional
    public RfqHeader createOrUpdateRfq(RfqHeader rfq) {
        if (rfq.getPrNumber() == null || rfq.getPrNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Purchase Requisition reference (prNumber) is mandatory for RFQ.");
        }
        rfq.setPrNumber(rfq.getPrNumber().trim());
        Integer prExists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.purchase_requisitions WHERE pr_number = ?", Integer.class, rfq.getPrNumber());
        if (prExists == null || prExists == 0) {
            throw new IllegalArgumentException("PR " + rfq.getPrNumber() + " was not found.");
        }
        if (rfq.getItems() == null || rfq.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one line item is required in the RFQ.");
        }

        // RFQ-YEAR-NNNNN from document_number_counters (atomic, restarts each year); see DocumentNumbers.
        if (rfq.getRfqNumber() == null || rfq.getRfqNumber().trim().isEmpty()) {
            rfq.setRfqNumber(DocumentNumbers.next(jdbc, DocumentNumbers.Doc.RFQ));
        }
        if (rfq.getRfqDate() == null) {
            rfq.setRfqDate(LocalDate.now());
        }
        if (rfq.getDueDate() == null) {
            rfq.setDueDate(LocalDate.now().plusDays(7));
        }
        if (rfq.getStatus() == null || rfq.getStatus().trim().isEmpty()) {
            rfq.setStatus("OPEN");
        }
        if (rfq.getTitle() == null || rfq.getTitle().trim().isEmpty()) {
            rfq.setTitle("Quotation Request for Requisition #" + rfq.getPrNumber());
        }

        Long rfqId = rfq.getId();
        if (rfqId == null) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO rfq_headers (" +
                    "rfq_number, rfq_date, due_date, pr_number, pr_date, department, title, status, " +
                    "selected_vendors_json, delivery_location, payment_terms, terms_conditions, remarks, " +
                    "created_by, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
                    Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, rfq.getRfqNumber());
                ps.setDate(2, Date.valueOf(rfq.getRfqDate()));
                ps.setDate(3, Date.valueOf(rfq.getDueDate()));
                ps.setString(4, rfq.getPrNumber());
                ps.setString(5, rfq.getPrDate());
                ps.setString(6, rfq.getDepartment());
                ps.setString(7, rfq.getTitle());
                ps.setString(8, rfq.getStatus());
                ps.setString(9, rfq.getSelectedVendorsJson());
                ps.setString(10, rfq.getDeliveryLocation());
                ps.setString(11, rfq.getPaymentTerms());
                ps.setString(12, rfq.getTermsConditions());
                ps.setString(13, rfq.getRemarks());
                ps.setString(14, rfq.getCreatedBy() != null ? rfq.getCreatedBy() : "Purchase Team");
                return ps;
            }, keyHolder);

            Map<String, Object> keys = keyHolder.getKeys();
            if (keys != null && keys.containsKey("id")) {
                rfqId = ((Number) keys.get("id")).longValue();
                rfq.setId(rfqId);
            }
        } else {
            jdbc.update(
                "UPDATE rfq_headers SET " +
                "rfq_date = ?, due_date = ?, pr_number = ?, pr_date = ?, department = ?, title = ?, status = ?, " +
                "selected_vendors_json = ?, delivery_location = ?, payment_terms = ?, terms_conditions = ?, remarks = ?, " +
                "updated_at = NOW() WHERE id = ?",
                Date.valueOf(rfq.getRfqDate()),
                Date.valueOf(rfq.getDueDate()),
                rfq.getPrNumber(),
                rfq.getPrDate(),
                rfq.getDepartment(),
                rfq.getTitle(),
                rfq.getStatus(),
                rfq.getSelectedVendorsJson(),
                rfq.getDeliveryLocation(),
                rfq.getPaymentTerms(),
                rfq.getTermsConditions(),
                rfq.getRemarks(),
                rfqId
            );
            jdbc.update("DELETE FROM rfq_items WHERE rfq_id = ?", rfqId);
        }

        // Insert items
        for (RfqItem it : rfq.getItems()) {
            it.setRfqId(rfqId);
            it.setRfqNumber(rfq.getRfqNumber());
            it.setPrNumber(rfq.getPrNumber());
            jdbc.update(
                "INSERT INTO rfq_items (" +
                "rfq_id, rfq_number, pr_number, item_code, item_name, description, category, uom, " +
                "required_qty, target_date, remarks, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                rfqId, rfq.getRfqNumber(), rfq.getPrNumber(), it.getItemCode(), it.getItemName(),
                it.getDescription(), it.getCategory(), it.getUom() != null ? it.getUom() : "PCS",
                it.getRequiredQty(),
                it.getTargetDate() != null ? Date.valueOf(it.getTargetDate()) : null,
                it.getRemarks()
            );
        }

        return getRfqById(rfqId).orElse(rfq);
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        jdbc.update("UPDATE rfq_headers SET status = ?, updated_at = NOW() WHERE id = ?", status, id);
    }
}
