package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.purchase.model.PurchaseRequisition;
import com.silvermuller.seals.modules.purchase.model.PurchaseRequisitionItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class PurchaseRequisitionService {

    private final JdbcTemplate jdbc;

    public PurchaseRequisitionService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    public void onInit() {
        seedInitialRequisitionsIfEmpty();
    }

    public void seedInitialRequisitionsIfEmpty() {
        // Disabled: do not auto-seed demo requisitions so live requisitions (PR-2026-00020) are preserved
        try {
            if (true) return;

            // Seed 15 realistic PRs strictly with Real Item Master, Real Category Master, and Real Department Master
            // PR 1: PR-2026-00001 (Fully Ordered / PO Generated)
            saveSeedPr(
                "PR-2026-00001", LocalDate.now().minusDays(6), LocalDate.now().plusDays(9),
                "Rahul Sharma", "Moulding", "Raw Material Store", "Apex Polymer Industries Ltd",
                "High", "Production Requirement", "Competitive Quotation",
                "High-volume batch manufacturing requirement for automotive OEM seals", "Multiple vendor quotes evaluated",
                "Fully Ordered", "Kavita Nair", "VP Operations",
                List.of(createItem("945-05745", "Oil Seal-NBR (Size:95x130x13)", "Oil Seal-NBR (Size:95x130x13)", "FG", "PCS", 500, 500, 0, 220.00))
            );

            // PR 2: PR-2026-00002 (Fully Ordered / PO Issued)
            saveSeedPr(
                "PR-2026-00002", LocalDate.now().minusDays(5), LocalDate.now().plusDays(10),
                "Priya Desai", "Packing", "General Store", "Balaji Packagings Pvt Ltd",
                "Normal", "General Plant Operations", "Direct Purchase",
                "Finished oil seals packaging requirement for scheduled dispatches", "Regular monthly order replenishment",
                "Fully Ordered", "Priya Desai", "Stores Manager",
                List.of(createItem("945-05744", "Oil Seal-NBR (Size:110x140x13)", "Oil Seal-NBR (Size:110x140x13)", "FG", "PCS", 1200, 1200, 0, 260.00))
            );

            // PR 3: PR-2026-00003 (Fully Ordered / Split across 2 Vendors)
            saveSeedPr(
                "PR-2026-00003", LocalDate.now().minusDays(4), LocalDate.now().plusDays(12),
                "Suresh Patel", "Power Press Die Making", "Bought-Out Stores", "ACTS ENGINEERING",
                "High", "Production Requirement", "Competitive Quotation",
                "Outer shells for Series 314 seal casings", "Split order: 600 pcs to ACTS, 400 pcs to VEER TRADING",
                "Fully Ordered", "Suresh Patel", "VP Operations",
                List.of(createItem("314::OUTER SHELL", "314 Outer Shell Casing Deep Draw Steel", "314 Outer Shell Casing Deep Draw Steel", "OUTER METAL SHELL", "PCS", 1000, 1000, 0, 96.00))
            );

            // PR 4: PR-2026-00004 (Partially Ordered - 300 Ordered, 200 Remaining)
            saveSeedPr(
                "PR-2026-00004", LocalDate.now().minusDays(3), LocalDate.now().plusDays(14),
                "Kiran Bhalla", "Store", "Raw Material Store", "ACTS ENGINEERING",
                "Normal", "Stock Reorder Level Depletion", "Competitive Quotation",
                "Oil Seal-NBR stock replenishment", "Partial order issued for 300 units; 200 units balance remaining",
                "Partially Ordered", "Kiran Bhalla", "Purchase Manager",
                List.of(createItem("945-05759", "Oil Seal-NBR (Size:95x125x13)", "Oil Seal-NBR (Size:95x125x13)", "FG", "PCS", 500, 300, 200, 185.00))
            );

            // PR 5: PR-2026-00005 (Approved / Proposal Rejected -> Full Qty Released)
            saveSeedPr(
                "PR-2026-00005", LocalDate.now().minusDays(3), LocalDate.now().plusDays(8),
                "Amit Verma", "Power Press Rubber Die Making", "Bought-Out Stores", "Apex Polymer Industries Ltd",
                "High", "Production Requirement", "Competitive Quotation",
                "Metal inner reinforcement shells for heavy commercial vehicle hub seals", "Proposal PP-2026-00006 was rejected due to high rate; balance fully released",
                "Approved", "Amit Verma", "VP Operations",
                List.of(createItem("315::INNER SHELL", "315 Inner Shell Metal Reinforcement Ring", "315 Inner Shell Metal Reinforcement Ring", "INNER METAL SHELL", "PCS", 2000, 0, 2000, 85.00))
            );

            // PR 6: PR-2026-00006 (Approved / PO Cancelled -> Balance Released)
            saveSeedPr(
                "PR-2026-00006", LocalDate.now().minusDays(4), LocalDate.now().plusDays(11),
                "Ramesh Kumar", "FG STORE", "FG STORE", "Apex Polymer Industries Ltd",
                "Normal", "Production Requirement", "Existing Contract",
                "Heavy commercial vehicle rear axle hub oil seal replenishment", "PO-2026-00006 cancelled; 200 PCS balance released back to PR",
                "Approved", "Ramesh Kumar", "Plant Head",
                List.of(createItem("945-05758", "HUB OIL SEAL TATA 1210 REAR INNER METAL OD(135x160X13)", "HUB OIL SEAL TATA 1210 REAR INNER METAL OD(135x160X13)", "FG", "PCS", 200, 0, 200, 340.00))
            );

            // PR 7: PR-2026-00007 (Approved / PO Issued)
            saveSeedPr(
                "PR-2026-00007", LocalDate.now().minusDays(2), LocalDate.now().plusDays(7),
                "Deepak Chauhan", "Power Press Circle Cutting", "Bought-Out Stores", "ACTS ENGINEERING",
                "Urgent", "Production Requirement", "Competitive Quotation",
                "105x130x13 Rotary shaft seals for urgent export order assembly", "PO-2026-00007 issued and expedited",
                "Fully Ordered", "Deepak Chauhan", "Plant Head",
                List.of(createItem("945-05747", "105X130X13", "105X130X13 Rotary Shaft Seal", "FG", "PCS", 400, 400, 0, 210.00))
            );

            // PR 8: PR-2026-00008 (Approved / Under Multi-Vendor Evaluation)
            saveSeedPr(
                "PR-2026-00008", LocalDate.now().minusDays(2), LocalDate.now().plusDays(15),
                "Vikas Sharma", "Finishing", "General Store", "ABRAR PACKAGING",
                "Normal", "Production Requirement", "Competitive Quotation",
                "120x145x15 Large casing rotary seals for industrial gearboxes", "2 vendor quotations received; commercial evaluation in progress",
                "Approved", "Vikas Sharma", "General Manager",
                List.of(createItem("945-05746", "120x145x15", "120x145x15 Heavy Duty Oil Seal", "FG", "PCS", 300, 0, 300, 275.00))
            );

            // PR 9: PR-2026-00009 (Approved / Proposal Change Requested)
            saveSeedPr(
                "PR-2026-00009", LocalDate.now().minusDays(3), LocalDate.now().plusDays(10),
                "Neeraj Joshi", "CNC", "Bought-Out Stores", "ACTS ENGINEERING",
                "High", "Production Requirement", "Competitive Quotation",
                "125x150x12 R High pressure hydraulic seals for precision CNC line", "Change requested on proposal: include NABL material certificate",
                "Approved", "Neeraj Joshi", "Quality Head",
                List.of(createItem("945-05754", "125x150x12 R", "125x150x12 R High Pressure Rotary Seal", "FG", "PCS", 250, 0, 250, 295.00))
            );

            // PR 10: PR-2026-00010 (Draft / No Quotations Yet)
            saveSeedPr(
                "PR-2026-00010", LocalDate.now().minusDays(1), LocalDate.now().plusDays(20),
                "Manoj Yadav", "Sand", "Raw Material Store", "",
                "Low", "Stock Reorder Level Depletion", "Competitive Quotation",
                "65x90x15 Metric oil seals for standard plant assembly inventory", "Draft requisition created; specifications review pending",
                "Draft", "Manoj Yadav", null,
                List.of(createItem("945-05681", "65x90x15", "65x90x15 Standard Metric Seal", "FG", "PCS", 500, 0, 500, 160.00))
            );

            // PR 11: PR-2026-00011 (Submitted / Pending Approval)
            saveSeedPr(
                "PR-2026-00011", LocalDate.now().minusDays(1), LocalDate.now().plusDays(14),
                "Sunil Rathi", "Tambling", "Raw Material Store", "Apex Polymer Industries Ltd",
                "Normal", "Production Requirement", "Competitive Quotation",
                "Silicone high temperature rotary shaft oil seals", "Requisition submitted to HOD; awaiting authorization",
                "Submitted", "Sunil Rathi", null,
                List.of(createItem("945-05682", "Oil Seal-Silicone (Size:65x90x15)", "Oil Seal-Silicone (Size:65x90x15)", "FG", "PCS", 600, 0, 600, 195.00))
            );

            // PR 12: PR-2026-00012 (Rejected Requisition)
            saveSeedPr(
                "PR-2026-00012", LocalDate.now().minusDays(4), LocalDate.now().plusDays(12),
                "Sunita Rao", "LASER", "Raw Material Store", "Tata Steel",
                "Normal", "Production Requirement", "Direct Purchase",
                "52x72x12 NBR seals for laser cutting cooling manifold", "Rejected: Sufficient stock buffer available in FG Store",
                "Rejected", "Sunita Rao", null,
                List.of(createItem("985-05901", "OIL SEAL-NBR (Size:52x72x12)", "OIL SEAL-NBR (Size:52x72x12)", "FG", "PCS", 800, 0, 800, 145.00))
            );

            // PR 13: PR-2026-00013 (Fully Ordered / PO Issued)
            saveSeedPr(
                "PR-2026-00013", LocalDate.now().minusDays(5), LocalDate.now().plusDays(10),
                "Anil Kulkarni", "Moulding", "Moulding Store", "Apex Polymer Industries Ltd",
                "High", "Production Requirement", "Existing Contract",
                "58x75x12 NBR compression molded seals", "PO-2026-00008 issued and scheduled",
                "Fully Ordered", "Anil Kulkarni", "Plant Head",
                List.of(createItem("945-05684", "Oil Seal-NBR (Size:58x75x12)", "Oil Seal-NBR (Size:58x75x12)", "FG", "PCS", 400, 400, 0, 170.00))
            );

            // PR 14: PR-2026-00014 (Approved / Draft PO Created)
            saveSeedPr(
                "PR-2026-00014", LocalDate.now().minusDays(2), LocalDate.now().plusDays(6),
                "Mohan Das", "Burning", "General Store", "Balaji Packagings Pvt Ltd",
                "Normal", "General Plant Operations", "Direct Purchase",
                "36x54x7 Small bore oil seals for burning furnace drive motors", "Draft PO-2026-00009 prepared; pending final signoff",
                "Approved", "Mohan Das", "General Manager",
                List.of(createItem("945-05692", "36x54X7", "36x54X7 Small Bore Oil Seal", "FG", "PCS", 350, 0, 350, 110.00))
            );

            // PR 15: PR-2026-00015 (Fully Ordered / Multi-Item PO Issued)
            saveSeedPr(
                "PR-2026-00015", LocalDate.now().minusDays(4), LocalDate.now().plusDays(11),
                "Dinesh Mehra", "T/Room", "Maintenance & MRO Store", "ACTS ENGINEERING",
                "High", "Maintenance & Repair", "Competitive Quotation",
                "Critical rotary seals for tool room CNC milling machine spindles", "PO-2026-00010 approved covering both items",
                "Fully Ordered", "Dinesh Mehra", "Tool Room Head",
                List.of(
                    createItem("985-05903", "OIL SEAL-NBR (Size:75x100x10)", "OIL SEAL-NBR (Size:75x100x10)", "FG", "PCS", 150, 150, 0, 230.00),
                    createItem("985-05835", "95x75x13", "95x75x13 Rotary Shaft Seal", "FG", "PCS", 100, 100, 0, 215.00)
                )
            );

        } catch (Exception ex) {
            System.err.println("Could not seed purchase requisitions: " + ex.getMessage());
        }
    }

    private PurchaseRequisitionItem createItem(String code, String name, String desc, String category, String uom, double req, double ord, double rem, double rate) {
        PurchaseRequisitionItem it = new PurchaseRequisitionItem();
        it.setItemCode(code);
        it.setItemName(name);
        it.setDescription(desc);
        it.setCategory(category != null ? category : "FG");
        it.setUom(uom);
        it.setReqQty(BigDecimal.valueOf(req));
        it.setOrderedQty(BigDecimal.valueOf(ord));
        it.setRemainingQty(BigDecimal.valueOf(rem));
        it.setEstRate(BigDecimal.valueOf(rate));
        it.setEstTotal(BigDecimal.valueOf(req * rate));
        return it;
    }

    @Transactional
    public void saveSeedPr(String prNum, LocalDate prDate, LocalDate reqDate, String reqer, String dept, String store,
                           String vendor, String priority, String reqType, String procMethod, String purpose,
                           String remarks, String status, String createdBy, String approvedBy,
                           List<PurchaseRequisitionItem> items) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            // startup-guard: allow demo PR seeding is disabled: seedInitialRequisitionsIfEmpty returns before calling this
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO purchase_requisitions (pr_number, pr_date, required_date, requisitioner, department, store, " +
                "preferred_vendor, priority, requirement_type, procurement_method, purpose, remarks, status, created_by, " +
                "approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, prNum);
            ps.setDate(2, Date.valueOf(prDate));
            ps.setDate(3, reqDate != null ? Date.valueOf(reqDate) : null);
            ps.setString(4, reqer);
            ps.setString(5, dept);
            ps.setString(6, store);
            ps.setString(7, vendor);
            ps.setString(8, priority);
            ps.setString(9, reqType);
            ps.setString(10, procMethod);
            ps.setString(11, purpose);
            ps.setString(12, remarks);
            ps.setString(13, status);
            ps.setString(14, createdBy);
            ps.setString(15, approvedBy);
            ps.setTimestamp(16, approvedBy != null ? new java.sql.Timestamp(System.currentTimeMillis()) : null);
            return ps;
        }, kh);

        Number prIdNum = null;
        if (kh.getKeys() != null && kh.getKeys().containsKey("id")) {
            prIdNum = (Number) kh.getKeys().get("id");
        } else if (!kh.getKeyList().isEmpty() && kh.getKeyList().get(0).containsKey("id")) {
            prIdNum = (Number) kh.getKeyList().get(0).get("id");
        } else {
            prIdNum = kh.getKey();
        }
        long prId = prIdNum != null ? prIdNum.longValue() : 0L;

        for (PurchaseRequisitionItem it : items) {
            // startup-guard: allow demo PR seeding is disabled: seedInitialRequisitionsIfEmpty returns before calling this
            jdbc.update(
                "INSERT INTO purchase_requisition_items (pr_id, pr_number, item_code, item_name, description, category, uom, req_qty, " +
                "ordered_qty, remaining_qty, est_rate, est_total, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                prId, prNum, it.getItemCode(), it.getItemName(), it.getDescription(),
                it.getCategory() != null ? it.getCategory() : "FG", it.getUom(),
                it.getReqQty(), it.getOrderedQty(), it.getRemainingQty(), it.getEstRate(), it.getEstTotal(), it.getRemarks()
            );
        }
    }

    public List<PurchaseRequisition> getAllRequisitions() {
        List<PurchaseRequisition> list = jdbc.query(
            "SELECT * FROM purchase_requisitions ORDER BY id ASC",
            prRowMapper
        );
        for (PurchaseRequisition pr : list) {
            List<PurchaseRequisitionItem> items = jdbc.query(
                "SELECT * FROM purchase_requisition_items WHERE pr_id = ? ORDER BY id ASC",
                itemRowMapper,
                pr.getId()
            );
            pr.setItems(items);

            // Fetch any generated PO numbers for this PR
            List<String> pos = jdbc.queryForList(
                "SELECT po_number FROM purchase_orders WHERE pr_number = ? ORDER BY po_number ASC",
                String.class,
                pr.getPrNumber()
            );
            pr.setGeneratedPos(pos);
        }
        return list;
    }

    public PurchaseRequisition getRequisitionByNumber(String prNumber) {
        List<PurchaseRequisition> list = jdbc.query(
            "SELECT * FROM purchase_requisitions WHERE pr_number = ?",
            prRowMapper,
            prNumber
        );
        if (list.isEmpty()) return null;
        PurchaseRequisition pr = list.get(0);
        pr.setItems(jdbc.query(
            "SELECT * FROM purchase_requisition_items WHERE pr_id = ? ORDER BY id ASC",
            itemRowMapper,
            pr.getId()
        ));
        List<String> pos = jdbc.queryForList(
            "SELECT po_number FROM purchase_orders WHERE pr_number = ? ORDER BY po_number ASC",
            String.class,
            pr.getPrNumber()
        );
        pr.setGeneratedPos(pos);
        return pr;
    }

    @Transactional
    public void updateStatus(String prNumber, String status, String reason, String user) {
        if ("Approved".equalsIgnoreCase(status)) {
            jdbc.update(
                "UPDATE purchase_requisitions SET status = ?, approved_by = COALESCE(?, 'VP Operations'), approved_at = NOW(), rejection_reason = NULL, updated_at = NOW() WHERE pr_number = ?",
                status, user, prNumber
            );
        } else if ("Rejected".equalsIgnoreCase(status)) {
            jdbc.update(
                "UPDATE purchase_requisitions SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE pr_number = ?",
                status, reason, prNumber
            );
        } else {
            jdbc.update(
                "UPDATE purchase_requisitions SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE pr_number = ?",
                status, reason, prNumber
            );
        }
    }

    public synchronized String getNextPrNumber() {
        int year = LocalDate.now().getYear();
        Long maxVal = jdbc.queryForObject(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(pr_number FROM 'PR-[0-9]+-([0-9]+)') AS BIGINT)), 20) FROM purchase_requisitions",
            Long.class
        );
        long nextVal = (maxVal != null ? maxVal : 20) + 1;
        String candidate = String.format("PR-%d-%05d", year, nextVal);
        while (jdbc.queryForObject("SELECT count(*) FROM purchase_requisitions WHERE pr_number = ?", Integer.class, candidate) > 0) {
            nextVal++;
            candidate = String.format("PR-%d-%05d", year, nextVal);
        }
        return candidate;
    }

    @Transactional
    public PurchaseRequisition createOrUpdateRequisition(PurchaseRequisition pr) {
        Long prId = pr.getId();
        boolean isUpdate = false;
        if (prId != null && prId > 0) {
            Integer count = jdbc.queryForObject("SELECT count(*) FROM purchase_requisitions WHERE id = ?", Integer.class, prId);
            if (count != null && count > 0) {
                isUpdate = true;
            }
        }

        if (isUpdate) {
            jdbc.update(
                "UPDATE purchase_requisitions SET pr_date = ?, required_date = ?, requisitioner = ?, department = ?, " +
                "store = ?, preferred_vendor = ?, priority = ?, requirement_type = ?, procurement_method = ?, " +
                "purpose = ?, remarks = ?, status = ?, pr_type = ?, cost_center = ?, project_reference = ?, cancellation_reason = ?, updated_at = NOW() WHERE id = ?",
                pr.getPrDate() != null ? Date.valueOf(pr.getPrDate()) : Date.valueOf(LocalDate.now()),
                pr.getRequiredDate() != null ? Date.valueOf(pr.getRequiredDate()) : Date.valueOf(LocalDate.now().plusDays(7)),
                pr.getRequisitioner(), pr.getDepartment(), pr.getStore(), pr.getPreferredVendor(), pr.getPriority(),
                pr.getRequirementType(), pr.getProcurementMethod(), pr.getPurpose(), pr.getRemarks(),
                pr.getStatus() != null ? pr.getStatus() : "Draft",
                pr.getPrType() != null ? pr.getPrType() : "Direct Material",
                pr.getCostCenter(), pr.getProjectReference(), pr.getCancellationReason(),
                prId
            );
            // Items that POs were raised against (PO by PR) are referenced by po_pr_allocations, so they cannot be
            // replaced. Refuse here with a clear message; the transaction rolls back the header update as well.
            assertNoPoByPrAllocationsForPrId(prId);
            jdbc.update("DELETE FROM purchase_requisition_items WHERE pr_id = ?", prId);
        } else {
            // New PR insertion: ensure prNumber is assigned and completely unique
            if (pr.getPrNumber() == null || pr.getPrNumber().isBlank()) {
                pr.setPrNumber(getNextPrNumber());
            } else {
                Integer count = jdbc.queryForObject("SELECT count(*) FROM purchase_requisitions WHERE pr_number = ?", Integer.class, pr.getPrNumber());
                if (count != null && count > 0) {
                    // Avoid duplicate collision by generating next sequence
                    pr.setPrNumber(getNextPrNumber());
                }
            }

            KeyHolder kh = new GeneratedKeyHolder();
            jdbc.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO purchase_requisitions (pr_number, pr_date, required_date, requisitioner, department, store, " +
                    "preferred_vendor, priority, requirement_type, procurement_method, purpose, remarks, status, " +
                    "pr_type, cost_center, project_reference, cancellation_reason, created_by, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, pr.getPrNumber());
                ps.setDate(2, pr.getPrDate() != null ? Date.valueOf(pr.getPrDate()) : Date.valueOf(LocalDate.now()));
                ps.setDate(3, pr.getRequiredDate() != null ? Date.valueOf(pr.getRequiredDate()) : Date.valueOf(LocalDate.now().plusDays(7)));
                ps.setString(4, pr.getRequisitioner());
                ps.setString(5, pr.getDepartment());
                ps.setString(6, pr.getStore());
                ps.setString(7, pr.getPreferredVendor());
                ps.setString(8, pr.getPriority() != null ? pr.getPriority() : "Normal");
                ps.setString(9, pr.getRequirementType() != null ? pr.getRequirementType() : "Production Requirement");
                ps.setString(10, pr.getProcurementMethod() != null ? pr.getProcurementMethod() : "Competitive Quotation");
                ps.setString(11, pr.getPurpose());
                ps.setString(12, pr.getRemarks());
                ps.setString(13, pr.getStatus() != null ? pr.getStatus() : "Draft");
                ps.setString(14, pr.getPrType() != null ? pr.getPrType() : "Direct Material");
                ps.setString(15, pr.getCostCenter());
                ps.setString(16, pr.getProjectReference());
                ps.setString(17, pr.getCancellationReason());
                ps.setString(18, pr.getCreatedBy() != null ? pr.getCreatedBy() : "User");
                return ps;
            }, kh);
            Number n = null;
            if (kh.getKeys() != null && kh.getKeys().containsKey("id")) {
                n = (Number) kh.getKeys().get("id");
            } else if (!kh.getKeyList().isEmpty() && kh.getKeyList().get(0).containsKey("id")) {
                n = (Number) kh.getKeyList().get(0).get("id");
            } else {
                n = kh.getKey();
            }
            prId = n != null ? n.longValue() : 0L;
            pr.setId(prId);
        }

        if (pr.getItems() != null) {
            for (PurchaseRequisitionItem it : pr.getItems()) {
                BigDecimal req = it.getReqQty() != null ? it.getReqQty() : BigDecimal.ONE;
                BigDecimal ord = it.getOrderedQty() != null ? it.getOrderedQty() : BigDecimal.ZERO;
                BigDecimal rem = it.getRemainingQty() != null ? it.getRemainingQty() : req.subtract(ord).max(BigDecimal.ZERO);
                BigDecimal rate = it.getEstRate() != null ? it.getEstRate() : BigDecimal.ZERO;
                BigDecimal total = it.getEstTotal() != null ? it.getEstTotal() : req.multiply(rate);

                jdbc.update(
                    "INSERT INTO purchase_requisition_items (pr_id, pr_number, item_code, item_name, description, category, uom, req_qty, " +
                    "ordered_qty, remaining_qty, est_rate, est_total, remarks, hsn_code, drawing_no, manufacturer_brand, required_by_date) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    prId, pr.getPrNumber(), it.getItemCode(), it.getItemName(), it.getDescription(),
                    it.getCategory() != null ? it.getCategory() : "FG",
                    it.getUom() != null ? it.getUom() : "PCS", req, ord, rem, rate, total, it.getRemarks(),
                    it.getHsnCode(), it.getDrawingNo(), it.getManufacturerBrand(),
                    it.getRequiredByDate() != null ? Date.valueOf(it.getRequiredByDate()) : null
                );
            }
        }
        return getRequisitionByNumber(pr.getPrNumber());
    }

    /**
     * Shared ordered-quantity helper used by the legacy paths (manual change, proposal approval, clubbing
     * fallback, legacy PO cancellation). A positive change locks the matching PR lines and refuses it if it
     * would exceed the requisitioned quantity; a negative change releases quantity and cannot take
     * ordered_qty below zero.
     */
    @Transactional
    public void updateItemOrderedQty(String prNumber, String itemCode, BigDecimal deltaOrdered) {
        if (deltaOrdered.signum() > 0) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, req_qty, ordered_qty FROM purchase_requisition_items WHERE pr_number = ? AND item_code = ? ORDER BY id FOR UPDATE",
                prNumber, itemCode);
            if (rows.isEmpty()) {
                throw new ConflictException("PR " + prNumber + " has no line for item " + itemCode + ".");
            }
            for (Map<String, Object> r : rows) {
                BigDecimal remaining = ((BigDecimal) r.get("req_qty")).subtract((BigDecimal) r.get("ordered_qty"));
                if (remaining.compareTo(deltaOrdered) < 0) {
                    throw new ConflictException("PR " + prNumber + " / " + itemCode + " has " + remaining.stripTrailingZeros().toPlainString()
                            + " remaining; cannot order " + deltaOrdered.stripTrailingZeros().toPlainString() + ".");
                }
            }
        }
        jdbc.update(
            "UPDATE purchase_requisition_items SET ordered_qty = GREATEST(0, ordered_qty + ?), " +
            "remaining_qty = GREATEST(0, req_qty - (ordered_qty + ?)) WHERE pr_number = ? AND item_code = ?",
            deltaOrdered, deltaOrdered, prNumber, itemCode
        );
        recalculatePrStatus(prNumber);
    }

    /**
     * Reserves quantity on one PR line. The line is locked (FOR UPDATE) and checked against its current
     * remaining quantity inside the caller's transaction, so concurrent reservations serialise here.
     */
    @Transactional
    public void reserveOrdered(long prItemId, BigDecimal qty) {
        if (qty == null || qty.signum() <= 0) {
            throw new IllegalArgumentException("Quantity to reserve must be greater than zero.");
        }
        Map<String, Object> r = lockItem(prItemId);
        BigDecimal remaining = ((BigDecimal) r.get("req_qty")).subtract((BigDecimal) r.get("ordered_qty"));
        String prNumber = (String) r.get("pr_number");
        if (remaining.compareTo(qty) < 0) {
            throw new ConflictException("PR " + prNumber + " / " + r.get("item_code") + " has " + remaining.stripTrailingZeros().toPlainString()
                    + " remaining; cannot order " + qty.stripTrailingZeros().toPlainString() + ".");
        }
        jdbc.update("UPDATE purchase_requisition_items SET ordered_qty = ordered_qty + ?, " +
                "remaining_qty = GREATEST(0, req_qty - (ordered_qty + ?)) WHERE id = ?", qty, qty, prItemId);
        recalculatePrStatus(prNumber);
    }

    /** Releases quantity previously reserved on one PR line. Refuses to take ordered_qty below zero. */
    @Transactional
    public void releaseOrdered(long prItemId, BigDecimal qty) {
        if (qty == null || qty.signum() <= 0) {
            throw new IllegalArgumentException("Quantity to release must be greater than zero.");
        }
        Map<String, Object> r = lockItem(prItemId);
        BigDecimal ordered = (BigDecimal) r.get("ordered_qty");
        String prNumber = (String) r.get("pr_number");
        if (ordered.compareTo(qty) < 0) {
            throw new ConflictException("PR " + prNumber + " / " + r.get("item_code") + " has only "
                    + ordered.stripTrailingZeros().toPlainString() + " ordered; cannot release " + qty.stripTrailingZeros().toPlainString() + ".");
        }
        jdbc.update("UPDATE purchase_requisition_items SET ordered_qty = ordered_qty - ?, " +
                "remaining_qty = GREATEST(0, req_qty - (ordered_qty - ?)) WHERE id = ?", qty, qty, prItemId);
        recalculatePrStatus(prNumber);
    }

    private Map<String, Object> lockItem(long prItemId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT pr_number, item_code, req_qty, ordered_qty FROM purchase_requisition_items WHERE id = ? FOR UPDATE", prItemId);
        if (rows.isEmpty()) {
            throw new ConflictException("PR line " + prItemId + " no longer exists.");
        }
        return rows.get(0);
    }

    /** Sets the PR to Approved / Partially Ordered / Fully Ordered from its item ordered quantities. */
    @Transactional
    public void recalculatePrStatus(String prNumber) {
        BigDecimal totalReq = jdbc.queryForObject(
            "SELECT COALESCE(SUM(req_qty), 0) FROM purchase_requisition_items WHERE pr_number = ?", BigDecimal.class, prNumber);
        BigDecimal totalOrd = jdbc.queryForObject(
            "SELECT COALESCE(SUM(ordered_qty), 0) FROM purchase_requisition_items WHERE pr_number = ?", BigDecimal.class, prNumber);

        if (totalReq != null && totalOrd != null && totalReq.compareTo(BigDecimal.ZERO) > 0) {
            if (totalOrd.compareTo(BigDecimal.ZERO) == 0) {
                // If it was ordered and now totalOrd == 0 (e.g. after cancellation), restore to Approved
                jdbc.update("UPDATE purchase_requisitions SET status = 'Approved', updated_at = NOW() WHERE pr_number = ? AND status IN ('Partially Ordered', 'Fully Ordered')", prNumber);
            } else if (totalOrd.compareTo(totalReq) >= 0) {
                jdbc.update("UPDATE purchase_requisitions SET status = 'Fully Ordered', updated_at = NOW() WHERE pr_number = ?", prNumber);
            } else {
                jdbc.update("UPDATE purchase_requisitions SET status = 'Partially Ordered', updated_at = NOW() WHERE pr_number = ?", prNumber);
            }
        }
    }

    private final RowMapper<PurchaseRequisition> prRowMapper = (rs, rowNum) -> {
        PurchaseRequisition pr = new PurchaseRequisition();
        pr.setId(rs.getLong("id"));
        pr.setPrNumber(rs.getString("pr_number"));
        Date d = rs.getDate("pr_date");
        if (d != null) pr.setPrDate(d.toLocalDate());
        Date rd = rs.getDate("required_date");
        if (rd != null) pr.setRequiredDate(rd.toLocalDate());
        pr.setRequisitioner(rs.getString("requisitioner"));
        pr.setDepartment(rs.getString("department"));
        pr.setStore(rs.getString("store"));
        pr.setPreferredVendor(rs.getString("preferred_vendor"));
        pr.setPriority(rs.getString("priority"));
        pr.setRequirementType(rs.getString("requirement_type"));
        pr.setProcurementMethod(rs.getString("procurement_method"));
        pr.setPurpose(rs.getString("purpose"));
        pr.setRemarks(rs.getString("remarks"));
        pr.setStatus(rs.getString("status"));
        try {
            pr.setPrType(rs.getString("pr_type"));
            pr.setCostCenter(rs.getString("cost_center"));
            pr.setProjectReference(rs.getString("project_reference"));
            pr.setCancellationReason(rs.getString("cancellation_reason"));
        } catch (Exception ignored) {}
        pr.setCreatedBy(rs.getString("created_by"));
        pr.setApprovedBy(rs.getString("approved_by"));
        pr.setRejectionReason(rs.getString("rejection_reason"));
        try {
            Timestamp cat = rs.getTimestamp("created_at");
            if (cat != null) pr.setCreatedAt(cat.toInstant().atOffset(ZoneOffset.UTC));
            Timestamp aat = rs.getTimestamp("approved_at");
            if (aat != null) pr.setApprovedAt(aat.toInstant().atOffset(ZoneOffset.UTC));
            Timestamp uat = rs.getTimestamp("updated_at");
            if (uat != null) pr.setUpdatedAt(uat.toInstant().atOffset(ZoneOffset.UTC));
        } catch (Exception ignored) {}
        return pr;
    };

    private final RowMapper<PurchaseRequisitionItem> itemRowMapper = (rs, rowNum) -> {
        PurchaseRequisitionItem it = new PurchaseRequisitionItem();
        it.setId(rs.getLong("id"));
        it.setPrId(rs.getLong("pr_id"));
        it.setPrNumber(rs.getString("pr_number"));
        it.setItemCode(rs.getString("item_code"));
        it.setItemName(rs.getString("item_name"));
        it.setDescription(rs.getString("description"));
        try {
            it.setCategory(rs.getString("category"));
        } catch (Exception ignored) {
            it.setCategory("FG");
        }
        it.setUom(rs.getString("uom"));
        it.setReqQty(rs.getBigDecimal("req_qty"));
        it.setOrderedQty(rs.getBigDecimal("ordered_qty"));
        it.setRemainingQty(rs.getBigDecimal("remaining_qty"));
        it.setEstRate(rs.getBigDecimal("est_rate"));
        it.setEstTotal(rs.getBigDecimal("est_total"));
        it.setRemarks(rs.getString("remarks"));
        try {
            it.setHsnCode(rs.getString("hsn_code"));
            it.setDrawingNo(rs.getString("drawing_no"));
            it.setManufacturerBrand(rs.getString("manufacturer_brand"));
            Date rbd = rs.getDate("required_by_date");
            if (rbd != null) it.setRequiredByDate(rbd.toLocalDate());
        } catch (Exception ignored) {}
        return it;
    };

    /**
     * Deletes a PR and its items, unless PO by PR orders reference any of its items. Those PRs are refused
     * (409) and nothing is deleted or cascaded; allocations and the POs they belong to are never touched.
     */
    @Transactional
    public void deleteRequisition(String prNumber) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM purchase_requisitions WHERE pr_number = ?", Long.class, prNumber);
        if (!ids.isEmpty()) {
            long id = ids.get(0);
            assertNoPoByPrAllocationsForPrId(id);
            jdbc.update("DELETE FROM purchase_requisition_items WHERE pr_id = ?", id);
            jdbc.update("DELETE FROM purchase_requisitions WHERE id = ?", id);
        }
    }

    /**
     * Refuses a manual change to ordered quantity (the ordered-qty endpoint) for a PR line that PO by PR has
     * allocated. Pass itemCode null to check every line of the PR.
     */
    public void assertNoPoByPrAllocations(String prNumber, String itemCode) {
        Integer n = itemCode == null
                ? jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE pr_number = ?", Integer.class, prNumber)
                : jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE pr_number = ? AND item_code = ?", Integer.class, prNumber, itemCode);
        if (n != null && n > 0) {
            throw new ConflictException("PR " + prNumber + (itemCode == null ? "" : " / " + itemCode)
                    + " has purchase orders raised through PO by PR. Its ordered quantity is managed by that flow and cannot be changed manually.");
        }
    }

    private void assertNoPoByPrAllocationsForPrId(long prId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.po_pr_allocations a JOIN public.purchase_requisition_items i ON i.id = a.pr_item_id WHERE i.pr_id = ?",
                Integer.class, prId);
        if (n != null && n > 0) {
            throw new ConflictException("This PR already has purchase orders raised through PO by PR, so it cannot be changed or deleted.");
        }
    }
}
