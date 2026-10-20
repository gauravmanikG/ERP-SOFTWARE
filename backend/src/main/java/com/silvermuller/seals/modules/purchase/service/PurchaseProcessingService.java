package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.common.exception.ConflictException;
import com.silvermuller.seals.modules.purchase.servicepo.ServicePoService;
import com.silvermuller.seals.modules.inventory.model.SupplierMaster;
import com.silvermuller.seals.modules.inventory.repository.SupplierMasterRepository;
import com.silvermuller.seals.modules.purchase.dto.*;
import com.silvermuller.seals.modules.purchase.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PurchaseProcessingService {

    private final SupplierMasterRepository supplierRepository;
    private final PurchaseRequisitionService prService;
    private final PrClubbingService clubbingService;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final Map<String, PurchaseProposal> proposalsMap = new ConcurrentHashMap<>();
    private final Map<String, PurchaseOrder> purchaseOrdersMap = new ConcurrentHashMap<>();
    private final AtomicInteger proposalCounter = new AtomicInteger(100);
    private final AtomicInteger poCounter = new AtomicInteger(200); // in-memory cache counter; numbering now comes from po_number_seq

    public static final String COMPANY_BILLING_ADDRESS =
            "Silver Muller Seals Ltd, Plot 42, GIDC Sector 3, Silvassa, D&NH - 396230. GSTIN: 24AAACS1234D1Z5";

    private final Set<String> validityExtendAuthorizedUsers;

    public PurchaseProcessingService(SupplierMasterRepository supplierRepository,
                                     PurchaseRequisitionService prService,
                                     PrClubbingService clubbingService,
                                     JdbcTemplate jdbc,
                                     ObjectMapper objectMapper,
                                     @Value("${purchase.validity.extend-authorized-users:General Manager (Purchases & SCM)}") String validityExtendAuthorizedUsers) {
        this.supplierRepository = supplierRepository;
        this.prService = prService;
        this.clubbingService = clubbingService;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.validityExtendAuthorizedUsers = parseAuthorizedUsers(validityExtendAuthorizedUsers);
        initializeSampleData();
        loadOrdersFromDb();
    }

    private String getNowTimestamp() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private void initializeSampleData() {
        proposalsMap.clear();
        purchaseOrdersMap.clear();
        if (true) return;

        // ====================================================================
        // PROPOSAL 1 & PO 1: PR-2026-00001 -> QT-2026-00001 -> PP-2026-00001 -> PO-2026-00001
        // (Apex Polymer, Oil Seal-NBR 500 PCS @ 240.00 - APPROVED)
        // ====================================================================
        PurchaseProposal p1 = createSeedProposal(
            "PROP-2026-0001", "PP-2026-00001", "PR-2026-00001", "2026-10-06",
            "Moulding", "Rahul Sharma", "2026-10-15", "HIGH",
            "High-volume production batch requirement for NBR seals",
            "Vendor offered 5% bulk discount; L1 evaluated quote",
            "APPROVED", "QT-2026-00001", 1L,
            List.of(createLine("945-05745", "Oil Seal-NBR (Size:95x130x13)", "Standard rotary shaft oil seal NBR 70 Shore A", "FG", "PCS",
                "SUP-001", "Apex Polymer Industries Ltd", 500, 240.00, 5.00, 18.00, 0, "2026-10-14", "Main Raw Material Store, Silvassa", "Standard COA required with batch", "QT-2026-00001", 1L)),
            Map.of("SUP-001", new VendorExtraCharges(new BigDecimal("1500.00"), BigDecimal.ZERO, new BigDecimal("-0.40"))),
            "Ramesh Gupta (VP Operations)", "2026-10-07 14:20:00", null, null, null,
            List.of("PO-2026-00001")
        );
        proposalsMap.put(p1.getId(), p1);

        PurchaseOrder po1 = createSeedPo(
            "PO-2026-0001", "PO-2026-00001", "2026-10-07", "PP-2026-00001", "PR-2026-00001", "2026-10-06",
            "Moulding", "Rahul Sharma", "SUP-001", "Apex Polymer Industries Ltd", "07AAACA1234H1ZV", "AAACA1234H",
            "Sandeep Kapoor", "+91-9876543210", "sandeep@apexpolymer.com",
            "Plot 45, Phase-2, Industrial Area, Faridabad, HR - 121001",
            "Silver Muller Seals Pvt Ltd, Plant 1, Main Raw Material Store, Silvassa",
            "Net 30 Days", "APPROVED", "Ramesh Gupta (VP Operations)", "2026-10-07 14:20:00",
            "2026-10-14", "Main Raw Material Store, Silvassa",
            "Vendor confirmed delivery schedule. QA inspection certificate required.",
            "QT-2026-00001", 1L,
            p1.getVendorGroups().get(0)
        );
        addPo(po1);

        // ====================================================================
        // PROPOSAL 2 & PO 2: PR-2026-00002 -> QT-2026-00004 -> PP-2026-00002 -> PO-2026-00002
        // (Balaji Packagings, Oil Seal-NBR 1200 PCS @ 35.00 - ISSUED)
        // ====================================================================
        PurchaseProposal p2 = createSeedProposal(
            "PROP-2026-0002", "PP-2026-00002", "PR-2026-00002", "2026-10-06",
            "Packing", "Priya Desai", "2026-10-16", "NORMAL",
            "Oil seal packaging batch requirement for monthly shipments",
            "Contractual packaging rate; pre-inspected supplier",
            "APPROVED", "QT-2026-00004", 4L,
            List.of(createLine("945-05744", "Oil Seal-NBR (Size:110x140x13)", "Heavy duty rotary shaft oil seal NBR", "FG", "PCS",
                "SUP-002", "Balaji Packagings Pvt Ltd", 1200, 35.00, 2.00, 12.00, 0, "2026-10-12", "Packing Dept, Plant 1", "Deliver in shrink-wrapped bundles of 25", "QT-2026-00004", 4L)),
            Map.of("SUP-002", new VendorExtraCharges(new BigDecimal("600.00"), BigDecimal.ZERO, new BigDecimal("0.20"))),
            "Ramesh Gupta (VP Operations)", "2026-10-07 14:25:00", null, null, null,
            List.of("PO-2026-00002")
        );
        proposalsMap.put(p2.getId(), p2);

        PurchaseOrder po2 = createSeedPo(
            "PO-2026-0002", "PO-2026-00002", "2026-10-07", "PP-2026-00002", "PR-2026-00002", "2026-10-06",
            "Packing", "Priya Desai", "SUP-002", "Balaji Packagings Pvt Ltd", "27AABCB5678G1ZK", "AABCB5678G",
            "Priya Desai", "+91-8765432109", "priya@balajipack.com",
            "MIDC Phase 3, Plot 12-A, Thane, Maharashtra - 400604",
            "Silver Muller Seals Pvt Ltd, Plant 1, Packing Dept, Silvassa",
            "Net 45 Days", "ISSUED", "Ramesh Gupta (VP Operations)", "2026-10-07 14:25:00",
            "2026-10-12", "Packing Dept, Plant 1",
            "PO dispatched via registered vendor email. Vendor acknowledged receipt.",
            "QT-2026-00004", 4L,
            p2.getVendorGroups().get(0)
        );
        addPo(po2);

        // ====================================================================
        // PROPOSALS 3 & 4 + POs 3 & 4: Multi-Vendor Split Order for PR-2026-00003 (Outer Shell 1000 PCS)
        // PO 3 -> ACTS ENGINEERING (600 PCS @ 96.00 - ISSUED)
        // PO 4 -> VEER TRADING (400 PCS @ 100.00 - APPROVED)
        // ====================================================================
        PurchaseProposal p3 = createSeedProposal(
            "PROP-2026-0003", "PP-2026-00003", "PR-2026-00003", "2026-10-05",
            "Power Press Die Making", "Suresh Patel", "2026-10-18", "HIGH",
            "Outer shells for Series 314 seal casings (Split lot 1/2)",
            "L1 awarded 60% capacity (600 pcs); balance 400 pcs to backup vendor",
            "APPROVED", "QT-2026-00005", 5L,
            List.of(createLine("314::OUTER SHELL", "314 Outer Shell Casing Deep Draw Steel", "Outer metal casing stamping", "OUTER METAL SHELL", "PCS",
                "SUP-006", "ACTS ENGINEERING", 600, 96.00, 1.00, 18.00, 0, "2026-10-15", "Bought-Out Stores, Plant 1", "Batch inspection certificate required", "QT-2026-00005", 5L)),
            Map.of("SUP-006", new VendorExtraCharges(new BigDecimal("800.00"), BigDecimal.ZERO, new BigDecimal("0.48"))),
            "Ramesh Gupta (VP Operations)", "2026-10-07 15:10:00", null, null, null,
            List.of("PO-2026-00003")
        );
        proposalsMap.put(p3.getId(), p3);

        PurchaseOrder po3 = createSeedPo(
            "PO-2026-0003", "PO-2026-00003", "2026-10-07", "PP-2026-00003", "PR-2026-00003", "2026-10-05",
            "Power Press Die Making", "Suresh Patel", "SUP-006", "ACTS ENGINEERING", "06AAACT9876C1Z3", "AAACT9876C",
            "Rajesh Mehra", "+91-9811223344", "orders@acts-eng.com",
            "Plot 18, Sector 24, Faridabad, Haryana - 121005",
            "Silver Muller Seals Pvt Ltd, Bought-Out Stores, Plant 1, Silvassa",
            "Net 30 Days", "ISSUED", "Ramesh Gupta (VP Operations)", "2026-10-07 15:10:00",
            "2026-10-15", "Bought-Out Stores, Plant 1",
            "Part of 1000 pcs split order (600 pcs). Expedited delivery confirmed.",
            "QT-2026-00005", 5L,
            p3.getVendorGroups().get(0)
        );
        addPo(po3);

        PurchaseProposal p4 = createSeedProposal(
            "PROP-2026-0004", "PP-2026-00004", "PR-2026-00003", "2026-10-05",
            "Power Press Die Making", "Suresh Patel", "2026-10-18", "HIGH",
            "Outer shells for Series 314 seal casings (Split lot 2/2)",
            "L2 awarded 40% capacity (400 pcs) for risk mitigation",
            "APPROVED", "QT-2026-00006", 6L,
            List.of(createLine("314::OUTER SHELL", "314 Outer Shell Casing Deep Draw Steel", "Outer metal casing stamping", "OUTER METAL SHELL", "PCS",
                "SUP-002", "VEER TRADING COMPANY", 400, 100.00, 2.00, 18.00, 0, "2026-10-17", "Bought-Out Stores, Plant 1", "Precision gauge sample approved", "QT-2026-00006", 6L)),
            Map.of("SUP-002", new VendorExtraCharges(new BigDecimal("500.00"), BigDecimal.ZERO, new BigDecimal("-0.20"))),
            "Ramesh Gupta (VP Operations)", "2026-10-07 15:15:00", null, null, null,
            List.of("PO-2026-00004")
        );
        proposalsMap.put(p4.getId(), p4);

        PurchaseOrder po4 = createSeedPo(
            "PO-2026-0004", "PO-2026-00004", "2026-10-07", "PP-2026-00004", "PR-2026-00003", "2026-10-05",
            "Power Press Die Making", "Suresh Patel", "SUP-002", "VEER TRADING COMPANY", "07AABCV1122D1Z9", "AABCV1122D",
            "Ajit Kumar", "+91-9871133557", "sales@veertrading.in",
            "Shop 12, Auto Market, G.T. Road, Faridabad - 121002",
            "Silver Muller Seals Pvt Ltd, Bought-Out Stores, Plant 1, Silvassa",
            "Net 30 Days", "APPROVED", "Ramesh Gupta (VP Operations)", "2026-10-07 15:15:00",
            "2026-10-17", "Bought-Out Stores, Plant 1",
            "Part of 1000 pcs split order (400 pcs). Awaiting vendor formal acceptance.",
            "QT-2026-00006", 6L,
            p4.getVendorGroups().get(0)
        );
        addPo(po4);

        // ====================================================================
        // PROPOSAL 5 & PO 5: Partial PR Order for PR-2026-00004 (Oil Seal 95x125x13)
        // PR Qty = 500, Ordered = 300, Remaining = 200 (ISSUED)
        // ====================================================================
        PurchaseProposal p5 = createSeedProposal(
            "PROP-2026-0005", "PP-2026-00005", "PR-2026-00004", "2026-10-06",
            "Store", "Kiran Bhalla", "2026-10-20", "NORMAL",
            "Oil Seal-NBR stock replenishment (Phase 1 immediate draw)",
            "Ordering 300 pcs now; remaining 200 pcs reserved for next production cycle",
            "APPROVED", "QT-2026-00008", 8L,
            List.of(createLine("945-05759", "Oil Seal-NBR (Size:95x125x13)", "Standard rotary shaft oil seal", "FG", "PCS",
                "SUP-006", "ACTS ENGINEERING", 300, 185.00, 0.00, 18.00, 0, "2026-10-16", "Raw Material Store, Silvassa", "Individual poly-bag packaging required", "QT-2026-00008", 8L)),
            Map.of("SUP-006", new VendorExtraCharges(new BigDecimal("700.00"), BigDecimal.ZERO, new BigDecimal("0.00"))),
            "Ramesh Gupta (VP Operations)", "2026-10-07 16:00:00", null, null, null,
            List.of("PO-2026-00005")
        );
        proposalsMap.put(p5.getId(), p5);

        PurchaseOrder po5 = createSeedPo(
            "PO-2026-0005", "PO-2026-00005", "2026-10-07", "PP-2026-00005", "PR-2026-00004", "2026-10-06",
            "Store", "Kiran Bhalla", "SUP-006", "ACTS ENGINEERING", "06AAACT9876C1Z3", "AAACT9876C",
            "Rajesh Mehra", "+91-9811223344", "orders@acts-eng.com",
            "Plot 18, Sector 24, Faridabad, Haryana - 121005",
            "Silver Muller Seals Pvt Ltd, Raw Material Store, Silvassa",
            "Net 30 Days", "ISSUED", "Ramesh Gupta (VP Operations)", "2026-10-07 16:00:00",
            "2026-10-16", "Raw Material Store, Silvassa",
            "Partial PR order (300 of 500 pcs). Remaining 200 pcs balance intact on PR.",
            "QT-2026-00008", 8L,
            p5.getVendorGroups().get(0)
        );
        addPo(po5);

        // ====================================================================
        // PROPOSAL 6: REJECTED Workflow Scenario for PR-2026-00005 (Inner Shell 2000 PCS)
        // Shows in PO Approval as REJECTED; PR remaining_qty = 2000 fully available!
        // ====================================================================
        PurchaseProposal p6 = createSeedProposal(
            "PROP-2026-0006", "PP-2026-00006", "PR-2026-00005", "2026-10-05",
            "Power Press Rubber Die Making", "Amit Verma", "2026-10-14", "HIGH",
            "Inner shells for Series 315 seal casings",
            "Single quote received from Apex Elastomers",
            "REJECTED", "QT-2026-00009", 9L,
            List.of(createLine("315::INNER SHELL", "315 Inner Shell Metal Reinforcement Ring", "Inner metal reinforcement ring stamping", "INNER METAL SHELL", "PCS",
                "SUP-005", "Apex Elastomers Ltd", 2000, 4.50, 0.00, 18.00, 0, "2026-10-12", "Bought-Out Stores, Plant 1", "Precision gauge sample needed", "QT-2026-00009", 9L)),
            Map.of("SUP-005", new VendorExtraCharges(new BigDecimal("350.00"), BigDecimal.ZERO, new BigDecimal("0.20"))),
            null, null,
            "Ramesh Gupta (VP Operations)", "2026-10-07 16:30:00",
            "Quoted rate of ₹4.50 is 18% higher than last purchase contract (₹3.80). Purchase dept to renegotiate bulk rate.",
            Collections.emptyList()
        );
        proposalsMap.put(p6.getId(), p6);

        // ====================================================================
        // PROPOSAL 7 & PO 6: CANCELLED PO Workflow for PR-2026-00006 (Tata 1210 Hub Seals 200 PCS)
        // Approved then cancelled; PR balance released back!
        // ====================================================================
        PurchaseProposal p7 = createSeedProposal(
            "PROP-2026-0007", "PP-2026-00007", "PR-2026-00006", "2026-10-04",
            "FG STORE", "Ramesh Kumar", "2026-10-15", "NORMAL",
            "Emergency batch requirement for TATA 1210 hub oil seals",
            "Emergency replacement order",
            "APPROVED", "QT-2026-00010", 10L,
            List.of(createLine("945-05758", "HUB OIL SEAL TATA 1210 REAR INNER METAL OD(135x160X13)", "Automotive rear hub heavy commercial vehicle oil seal", "FG", "PCS",
                "SUP-001", "Apex Polymer Industries Ltd", 200, 190.00, 3.00, 18.00, 0, "2026-10-10", "FG Store, Silvassa", "Standard packaging with batch inspection report", "QT-2026-00010", 10L)),
            Map.of("SUP-001", new VendorExtraCharges(new BigDecimal("1200.00"), BigDecimal.ZERO, new BigDecimal("0.32"))),
            "Ramesh Gupta (VP Operations)", "2026-10-06 11:00:00", null, null, null,
            List.of("PO-2026-00006")
        );
        proposalsMap.put(p7.getId(), p7);

        PurchaseOrder po6 = createSeedPo(
            "PO-2026-0006", "PO-2026-00006", "2026-10-06", "PP-2026-00007", "PR-2026-00006", "2026-10-04",
            "FG STORE", "Ramesh Kumar", "SUP-001", "Apex Polymer Industries Ltd", "07AAACA1234H1ZV", "AAACA1234H",
            "Sandeep Kapoor", "+91-9876543210", "sandeep@apexpolymer.com",
            "Plot 45, Phase-2, Industrial Area, Faridabad, HR - 121001",
            "Silver Muller Seals Pvt Ltd, FG Store, Plant 1, Silvassa",
            "Net 30 Days", "CANCELLED", "Ramesh Gupta (VP Operations)", "2026-10-06 11:00:00",
            "2026-10-10", "FG Store, Plant 1",
            "CANCELLED: Requirement merged into annual bulk tender contract. PR balance released.",
            "QT-2026-00010", 10L,
            p7.getVendorGroups().get(0)
        );
        addPo(po6);

        // ====================================================================
        // PROPOSAL 8: PENDING_PO_APPROVAL for PR-2026-00007 (Oil Seal 105X130X13 50 PCS)
        // Ready for user to click "Approve" or "Reject" in PO Approval screen!
        // ====================================================================
        PurchaseProposal p8 = createSeedProposal(
            "PROP-2026-0008", "PP-2026-00008", "PR-2026-00007", "2026-10-06",
            "Power Press Circle Cutting", "Deepak Chauhan", "2026-10-14", "URGENT",
            "Double lip rotary oil seals 105X130X13 for circle cutting line",
            "High priority circle cutting line requirement. Commercial quotation evaluated.",
            "PENDING_PO_APPROVAL", "QT-2026-00011", 11L,
            List.of(createLine("945-05747", "105X130X13", "Double lip oil seal with garter spring", "FG", "PCS",
                "SUP-006", "ACTS ENGINEERING", 50, 420.00, 0.00, 18.00, 0, "2026-10-12", "Bought-Out Stores, Plant 1", "OEM compatible specification", "QT-2026-00011", 11L)),
            Map.of("SUP-006", new VendorExtraCharges(new BigDecimal("400.00"), BigDecimal.ZERO, new BigDecimal("-0.20"))),
            null, null, null, null, null,
            Collections.emptyList()
        );
        proposalsMap.put(p8.getId(), p8);

        // ====================================================================
        // PROPOSAL 9: CHANGES_REQUESTED for PR-2026-00009 (Oil Seal 125x150x12 R 5 PCS)
        // ====================================================================
        PurchaseProposal p9 = createSeedProposal(
            "PROP-2026-0009", "PP-2026-00009", "PR-2026-00009", "2026-10-05",
            "CNC", "Neeraj Joshi", "2026-10-16", "HIGH",
            "Radial shaft seals for CNC spindle assemblies",
            "High precision radial shaft seals",
            "CHANGES_REQUESTED", "QT-2026-00014", 14L,
            List.of(createLine("945-05754", "125x150x12 R", "Radial shaft seal NBR right hand helix", "FG", "PCS",
                "SUP-006", "ACTS ENGINEERING", 5, 12500.00, 0.00, 18.00, 0, "2026-10-14", "Bought-Out Stores, Plant 1", "Mitutoyo/OEM genuine seal required", "QT-2026-00014", 14L)),
            Map.of("SUP-006", new VendorExtraCharges(new BigDecimal("500.00"), BigDecimal.ZERO, new BigDecimal("0.00"))),
            null, null, null, null,
            "Please confirm if vendor price includes NABL calibration certificate with traceability valid for 1 year.",
            Collections.emptyList()
        );
        p9.setChangesRequestedBy("Neeraj Joshi (Quality Head)");
        p9.setChangesRequestedAt("2026-10-07 10:15:00");
        proposalsMap.put(p9.getId(), p9);

        // ====================================================================
        // PROPOSAL 10 & PO 7: CLOSED PO for PR-2026-00012 (Oil Seal 52x72x12 200 PCS)
        // ====================================================================
        PurchaseProposal p10 = createSeedProposal(
            "PROP-2026-0010", "PP-2026-00010", "PR-2026-00012", "2026-10-01",
            "Sand", "Sunita Rao", "2026-10-08", "NORMAL",
            "Rotary shaft seals 52x72x12 for sand plant machinery",
            "Procurement for sand plant conveyor overhaul",
            "APPROVED", "QT-2026-00015", 15L,
            List.of(createLine("985-05901", "OIL SEAL-NBR (Size:52x72x12)", "Standard metric rotary shaft oil seal", "FG", "PCS",
                "SUP-005", "Apex Elastomers Ltd", 200, 85.00, 0.00, 18.00, 0, "2026-10-05", "Sand Dept Store, Plant 1", "Standard oil seal certificate", "QT-2026-00015", 15L)),
            Map.of("SUP-005", new VendorExtraCharges(new BigDecimal("250.00"), BigDecimal.ZERO, new BigDecimal("0.00"))),
            "Ramesh Gupta (VP Operations)", "2026-10-02 11:30:00", null, null, null,
            List.of("PO-2026-00007")
        );
        proposalsMap.put(p10.getId(), p10);

        PurchaseOrder po7 = createSeedPo(
            "PO-2026-0007", "PO-2026-00007", "2026-10-02", "PP-2026-00010", "PR-2026-00012", "2026-10-01",
            "Sand", "Sunita Rao", "SUP-005", "Apex Elastomers Ltd", "07AAAEA9988F1Z2", "AAAEA9988F",
            "Parduman Kumar", "+91-9810102030", "parduman@apexelastomers.com",
            "C-12, Sector 58, Noida, UP - 201301",
            "Silver Muller Seals Pvt Ltd, Sand Dept Store, Plant 1, Silvassa",
            "Net 30 Days", "CLOSED", "Ramesh Gupta (VP Operations)", "2026-10-02 11:30:00",
            "2026-10-05", "Sand Dept Store, Plant 1",
            "ORDER CLOSED: 200 Pcs received in full. GRN #GRN-2026-00109 generated and stock posted.",
            "QT-2026-00015", 15L,
            p10.getVendorGroups().get(0)
        );
        addPo(po7);

        // ====================================================================
        // PROPOSAL 11 & PO 8: PARTIALLY_RECEIVED for PR-2026-00013 (Oil Seal 58x75x12 100 PCS)
        // ====================================================================
        PurchaseProposal p11 = createSeedProposal(
            "PROP-2026-0011", "PP-2026-00011", "PR-2026-00013", "2026-10-03",
            "Tambling", "Anil Kulkarni", "2026-10-12", "HIGH",
            "High speed rotary oil seal for tambling machines",
            "Batch requirement for tambling machine maintenance",
            "APPROVED", "QT-2026-00016", 16L,
            List.of(createLine("945-05684", "Oil Seal-NBR (Size:58x75x12)", "High speed rotary oil seal", "FG", "PCS",
                "SUP-001", "Apex Polymer Industries Ltd", 100, 320.00, 0.00, 18.00, 0, "2026-10-08", "Tambling Store, Plant 1", "Heat resistant NBR compound", "QT-2026-00016", 16L)),
            Map.of("SUP-001", new VendorExtraCharges(new BigDecimal("500.00"), BigDecimal.ZERO, new BigDecimal("0.00"))),
            "Ramesh Gupta (VP Operations)", "2026-10-04 14:00:00", null, null, null,
            List.of("PO-2026-00008")
        );
        proposalsMap.put(p11.getId(), p11);

        PurchaseOrder po8 = createSeedPo(
            "PO-2026-0008", "PO-2026-00008", "2026-10-04", "PP-2026-00011", "PR-2026-00013", "2026-10-03",
            "Tambling", "Anil Kulkarni", "SUP-001", "Apex Polymer Industries Ltd", "07AAACA1234H1ZV", "AAACA1234H",
            "Sandeep Kapoor", "+91-9876543210", "sandeep@apexpolymer.com",
            "Plot 45, Phase-2, Industrial Area, Faridabad, HR - 121001",
            "Silver Muller Seals Pvt Ltd, Tambling Store, Plant 1, Silvassa",
            "Net 30 Days", "PARTIALLY_RECEIVED", "Ramesh Gupta (VP Operations)", "2026-10-04 14:00:00",
            "2026-10-08", "Tambling Store, Plant 1",
            "PARTIALLY RECEIVED: 50 pcs received under GRN #GRN-2026-00114. 50 pcs balance expected on 12-Oct.",
            "QT-2026-00016", 16L,
            p11.getVendorGroups().get(0)
        );
        addPo(po8);

        // ====================================================================
        // PROPOSAL 12 & PO 9: DRAFT PO for PR-2026-00014 (Oil Seal 36x54X7 20 PCS)
        // ====================================================================
        PurchaseProposal p12 = createSeedProposal(
            "PROP-2026-0012", "PP-2026-00012", "PR-2026-00014", "2026-10-06",
            "Burning", "Mohan Das", "2026-10-15", "NORMAL",
            "Compact metric shaft oil seals for burning furnace exhaust blowers",
            "Furnace blower seals replenishment",
            "DRAFT", "QT-2026-00017", 17L,
            List.of(createLine("945-05692", "36x54X7", "Compact metric shaft oil seal", "FG", "PCS",
                "SUP-002", "Balaji Packagings Pvt Ltd", 20, 1750.00, 0.00, 18.00, 0, "2026-10-10", "General Store, Plant 1", "Temperature resistant oil seals", "QT-2026-00017", 17L)),
            Map.of("SUP-002", new VendorExtraCharges(new BigDecimal("300.00"), BigDecimal.ZERO, new BigDecimal("0.00"))),
            null, null, null, null, null,
            List.of("PO-2026-00009")
        );
        proposalsMap.put(p12.getId(), p12);

        PurchaseOrder po9 = createSeedPo(
            "PO-2026-0009", "PO-2026-00009", "2026-10-07", "PP-2026-00012", "PR-2026-00014", "2026-10-06",
            "Burning", "Mohan Das", "SUP-002", "Balaji Packagings Pvt Ltd", "27AABCB5678G1ZK", "AABCB5678G",
            "Priya Desai", "+91-8765432109", "priya@balajipack.com",
            "MIDC Phase 3, Plot 12-A, Thane, Maharashtra - 400604",
            "Silver Muller Seals Pvt Ltd, General Store, Plant 1, Silvassa",
            "Immediate / COD", "DRAFT", null, null,
            "2026-10-10", "General Store, Plant 1",
            "DRAFT PO: Prepared by Buyer. Awaiting supervisor confirmation on furnace run time.",
            "QT-2026-00017", 17L,
            p12.getVendorGroups().get(0)
        );
        addPo(po9);

        // ====================================================================
        // PROPOSAL 13 & PO 10: Multi-item Order for PR-2026-00015 (Oil Seals 75x100x10 & 95x75x13)
        // (75x100x10 15 PCS + 95x75x13 10 PCS - APPROVED)
        // ====================================================================
        PurchaseProposal p13 = createSeedProposal(
            "PROP-2026-0013", "PP-2026-00013", "PR-2026-00015", "2026-10-04",
            "T/Room", "Dinesh Mehra", "2026-10-15", "HIGH",
            "Shaft seals for Tool Room precision machinery",
            "Tool room machinery seal replenishment",
            "APPROVED", "QT-2026-00018", 18L,
            List.of(
                createLine("985-05903", "OIL SEAL-NBR (Size:75x100x10)", "Rotary shaft seal 75x100x10", "FG", "PCS",
                    "SUP-006", "ACTS ENGINEERING", 15, 1850.00, 0.00, 18.00, 0, "2026-10-12", "Maintenance & MRO Store", "Standard NBR 70 Shore", "QT-2026-00018", 18L),
                createLine("985-05835", "95x75x13", "Custom shaft seal 95x75x13", "FG", "PCS",
                    "SUP-006", "ACTS ENGINEERING", 10, 2200.00, 0.00, 18.00, 0, "2026-10-12", "Maintenance & MRO Store", "Precision seal profile", "QT-2026-00018", 18L)
            ),
            Map.of("SUP-006", new VendorExtraCharges(new BigDecimal("500.00"), BigDecimal.ZERO, new BigDecimal("0.30"))),
            "Ramesh Gupta (VP Operations)", "2026-10-05 16:30:00", null, null, null,
            List.of("PO-2026-00010")
        );
        proposalsMap.put(p13.getId(), p13);

        PurchaseOrder po10 = createSeedPo(
            "PO-2026-0010", "PO-2026-00010", "2026-10-05", "PP-2026-00013", "PR-2026-00015", "2026-10-04",
            "T/Room", "Dinesh Mehra", "SUP-006", "ACTS ENGINEERING", "06AAACT9876C1Z3", "AAACT9876C",
            "Rajesh Mehra", "+91-9811223344", "orders@acts-eng.com",
            "Plot 18, Sector 24, Faridabad, Haryana - 121005",
            "Silver Muller Seals Pvt Ltd, Maintenance & MRO Store, Plant 1, Silvassa",
            "Net 30 Days", "APPROVED", "Ramesh Gupta (VP Operations)", "2026-10-05 16:30:00",
            "2026-10-12", "Maintenance & MRO Store",
            "Multi-item PO approved for Tool Room die machinery seals.",
            "QT-2026-00018", 18L,
            p13.getVendorGroups().get(0)
        );
        addPo(po10);
    }

    private void addPo(PurchaseOrder po) {
        purchaseOrdersMap.put(po.getId(), po);
        purchaseOrdersMap.put(po.getPoNumber(), po);
    }

    private PurchaseProposal createSeedProposal(
            String id, String propNum, String prNum, String prDate, String dept, String reqBy,
            String reqByDate, String priority, String purpose, String remarks, String status,
            String quoteNum, Long quoteId, List<PurchaseItemLine> items,
            Map<String, VendorExtraCharges> charges, String approvedBy, String approvedAt,
            String rejBy, String rejAt, String rejReason, List<String> poNumbers) {

        PurchaseProposal p = new PurchaseProposal();
        p.setId(id);
        p.setProposalNumber(propNum);
        p.setPrNumber(prNum);
        p.setPrDate(prDate);
        p.setDepartment(dept);
        p.setRequestedBy(reqBy);
        p.setRequiredByDate(reqByDate);
        p.setPriority(priority);
        p.setPurpose(purpose);
        p.setRemarks(remarks);
        p.setStatus(status);
        p.setSourceQuotationNumber(quoteNum);
        p.setSourceQuotationId(quoteId);
        p.setCreatedBy("Purchase Dept (Kavita Nair)");
        p.setCreatedAt(prDate + " 11:00:00");
        p.setApprovedBy(approvedBy);
        p.setApprovedAt(approvedAt);
        p.setRejectedBy(rejBy);
        p.setRejectedAt(rejAt);
        p.setRejectionReason(rejReason);
        p.setGeneratedPoNumbers(poNumbers);

        PurchaseCalculationRequest req = new PurchaseCalculationRequest();
        req.setItems(items);
        req.setVendorCharges(charges != null ? charges : Collections.emptyMap());
        PurchaseCalculationResponse res = calculate(req);

        p.setItems(res.getItems());
        p.setVendorGroups(res.getVendorGroups());
        p.setVendorCharges(charges);
        p.setGrandGross(res.getGrandGross());
        p.setGrandDiscount(res.getGrandDiscount());
        p.setGrandTaxable(res.getGrandTaxable());
        p.setGrandTax(res.getGrandTax());
        p.setGrandDelivery(res.getGrandDelivery());
        p.setGrandOtherCharges(res.getGrandOtherCharges());
        p.setGrandRoundOff(res.getGrandRoundOff());
        p.setGrandTotal(res.getGrandTotal());

        return p;
    }

    private PurchaseItemLine createLine(
            String code, String name, String desc, String category, String uom,
            String vCode, String vName, double qty, double rate, double discPct,
            double taxPct, double addChg, String delivDate, String delivLoc,
            String rem, String srcQuote, Long srcQuoteId) {

        PurchaseItemLine it = new PurchaseItemLine();
        it.setItemCode(code);
        it.setItemName(name);
        it.setDescription(desc);
        it.setCategory(category);
        it.setUom(uom);
        it.setVendorCode(vCode);
        it.setVendorName(vName);
        it.setQuantity(BigDecimal.valueOf(qty));
        it.setUnitRate(BigDecimal.valueOf(rate));
        it.setDiscountPercent(BigDecimal.valueOf(discPct));
        it.setTaxType("GST");
        it.setTaxPercent(BigDecimal.valueOf(taxPct));
        it.setOtherCharges(BigDecimal.valueOf(addChg));
        it.setExpectedDeliveryDate(delivDate);
        it.setDeliveryLocation(delivLoc);
        it.setRemarks(rem);
        it.setSourceQuotationNumber(srcQuote);
        it.setSourceQuotationId(srcQuoteId);

        BigDecimal gross = BigDecimal.valueOf(qty).multiply(BigDecimal.valueOf(rate)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal disc = gross.multiply(BigDecimal.valueOf(discPct)).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal taxable = gross.subtract(disc);
        BigDecimal tax = taxable.multiply(BigDecimal.valueOf(taxPct)).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(tax).add(BigDecimal.valueOf(addChg));

        it.setGrossAmount(gross);
        it.setDiscountAmount(disc);
        it.setTaxableAmount(taxable);
        it.setTaxAmount(tax);
        it.setItemTotal(total);

        return it;
    }

    private PurchaseOrder createSeedPo(
            String id, String poNum, String poDate, String propNum, String prNum, String prDate,
            String dept, String reqBy, String vCode, String vName, String gstin, String pan,
            String contact, String phone, String email, String billAddr, String shipAddr,
            String terms, String status, String appBy, String appAt, String delDate, String delLoc,
            String remarks, String quoteNum, Long quoteId, VendorSummaryGroup group) {

        PurchaseOrder po = new PurchaseOrder();
        po.setId(id);
        po.setPoNumber(poNum);
        po.setPoDate(poDate);
        po.setProposalNumber(propNum);
        po.setPrNumber(prNum);
        po.setPrDate(prDate);
        po.setDepartment(dept);
        po.setRequestedBy(reqBy);
        po.setVendorCode(vCode);
        po.setVendorName(vName);
        po.setVendorGstin(gstin);
        po.setVendorPan(pan);
        po.setContactPerson(contact);
        po.setPhone(phone);
        po.setEmail(email);
        po.setBillingAddress(billAddr);
        po.setShippingAddress(shipAddr);
        po.setPaymentTerms(terms);
        po.setStatus(status);
        po.setApprovedBy(appBy);
        po.setApprovedAt(appAt);
        po.setDeliveryDate(delDate);
        po.setDeliveryLocation(delLoc);
        po.setRemarks(remarks);
        po.setSourceQuotationNumber(quoteNum);
        po.setSourceQuotationId(quoteId);

        po.setItems(group.getItems());
        po.setItemsGross(group.getItemsGross());
        po.setTotalDiscount(group.getTotalDiscount());
        po.setTaxableAmount(group.getTaxableAmount());
        po.setTotalTax(group.getTotalTax());
        po.setDeliveryCharges(group.getDeliveryFreight());
        po.setOtherCharges(group.getOtherCharges());
        po.setRoundOff(group.getRoundOff());
        po.setGrandTotal(group.getVendorTotal());

        return po;
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
                        "SELECT hsn_code FROM public.item_master WHERE sms_new_part_no = ? OR old_code = ? LIMIT 1",
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

    public List<PurchaseProposal> getAllProposals() {
        Set<String> seen = new HashSet<>();
        List<PurchaseProposal> list = new ArrayList<>();
        for (PurchaseProposal p : proposalsMap.values()) {
            String key = p.getProposalNumber() != null ? p.getProposalNumber() : p.getId();
            if (key != null && seen.add(key)) {
                list.add(p);
            }
        }
        list.sort((a, b) -> {
            String numA = a.getProposalNumber() != null ? a.getProposalNumber() : "";
            String numB = b.getProposalNumber() != null ? b.getProposalNumber() : "";
            return numB.compareTo(numA);
        });
        return list;
    }

    public Optional<PurchaseProposal> getProposalById(String idOrNumber) {
        if (idOrNumber == null) return Optional.empty();
        PurchaseProposal p = proposalsMap.get(idOrNumber);
        if (p == null) {
            p = proposalsMap.values().stream()
                    .filter(x -> idOrNumber.equalsIgnoreCase(x.getId()) || idOrNumber.equalsIgnoreCase(x.getProposalNumber()))
                    .findFirst().orElse(null);
        }
        return Optional.ofNullable(p);
    }

    public PurchaseProposal saveOrSubmitProposal(PurchaseProposal proposal, boolean submitForApproval) {
        if (proposal.getId() == null || proposal.getId().trim().isEmpty()) {
            int seq = proposalCounter.incrementAndGet();
            proposal.setId("PROP-2026-" + String.format("%04d", seq));
            if (proposal.getProposalNumber() == null || proposal.getProposalNumber().trim().isEmpty()) {
                proposal.setProposalNumber("PP-2026-" + String.format("%05d", seq));
            }
            proposal.setCreatedAt(getNowTimestamp());
        }

        proposal.setUpdatedAt(getNowTimestamp());

        if (submitForApproval) {
            validateProposalForSubmission(proposal);
            proposal.setStatus("PENDING_PO_APPROVAL");
        } else {
            proposal.setStatus("DRAFT");
        }

        PurchaseCalculationRequest req = new PurchaseCalculationRequest();
        req.setItems(proposal.getItems());
        req.setVendorCharges(proposal.getVendorCharges());
        PurchaseCalculationResponse calcRes = calculate(req);

        proposal.setItems(calcRes.getItems());
        proposal.setVendorGroups(calcRes.getVendorGroups());
        proposal.setGrandGross(calcRes.getGrandGross());
        proposal.setGrandDiscount(calcRes.getGrandDiscount());
        proposal.setGrandTaxable(calcRes.getGrandTaxable());
        proposal.setGrandTax(calcRes.getGrandTax());
        proposal.setGrandDelivery(calcRes.getGrandDelivery());
        proposal.setGrandOtherCharges(calcRes.getGrandOtherCharges());
        proposal.setGrandRoundOff(calcRes.getGrandRoundOff());
        proposal.setGrandTotal(calcRes.getGrandTotal());

        proposalsMap.put(proposal.getId(), proposal);
        if (proposal.getProposalNumber() != null) {
            proposalsMap.put(proposal.getProposalNumber(), proposal);
        }
        return proposal;
    }

    private void validateProposalForSubmission(PurchaseProposal proposal) {
        if (proposal.getItems() == null || proposal.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cannot submit purchase proposal without items");
        }
        for (PurchaseItemLine item : proposal.getItems()) {
            if (item.getQuantity() == null || item.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Item " + item.getItemCode() + " has invalid quantity");
            }
            if (item.getUnitRate() == null || item.getUnitRate().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Item " + item.getItemCode() + " must have a unit rate greater than 0");
            }
            String vCode = item.getVendorCode();
            if ((vCode == null || vCode.trim().isEmpty()) && proposal.getVendorId() != null) {
                item.setVendorCode(proposal.getVendorId());
                item.setVendorName(proposal.getVendorName());
                vCode = proposal.getVendorId();
            }
            if (vCode == null || vCode.trim().isEmpty()) {
                throw new IllegalArgumentException("Item " + item.getItemCode() + " must have a valid vendor selected");
            }

            // Quantity and status validation against PR balance (TC-02 & TC-05)
            String targetPr = (item.getPrNumber() != null && !item.getPrNumber().trim().isEmpty()) ? item.getPrNumber().trim() : proposal.getPrNumber();
            if (targetPr != null && !targetPr.trim().isEmpty()) {
                PurchaseRequisition pr = prService.getRequisitionByNumber(targetPr);
                if (pr != null) {
                    if ("DRAFT".equalsIgnoreCase(pr.getStatus()) || "SUBMITTED".equalsIgnoreCase(pr.getStatus()) || "REJECTED".equalsIgnoreCase(pr.getStatus()) || "CANCELLED".equalsIgnoreCase(pr.getStatus())) {
                        throw new IllegalArgumentException("Cannot create PO proposal for PR " + targetPr + " with status '" + pr.getStatus() + "'. Only Approved PRs can be procured.");
                    }
                    if (pr.getItems() != null) {
                        for (PurchaseRequisitionItem pri : pr.getItems()) {
                            if (pri.getItemCode() != null && pri.getItemCode().equalsIgnoreCase(item.getItemCode())) {
                                BigDecimal rem = pri.getRemainingQty() != null ? pri.getRemainingQty() : BigDecimal.ZERO;
                                if (item.getQuantity().compareTo(rem) > 0) {
                                    throw new IllegalArgumentException("Requested quantity (" + item.getQuantity() + ") exceeds available PR balance (" + rem + ") for item " + item.getItemCode() + " on " + targetPr + ".");
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Next PO number from po_number_seq (PostgreSQL). Every creation path, including proposal approval, uses it, so
     * numbers are unique across requests and backend restarts. A rolled-back transaction leaves a gap, never a reuse.
     */
    public String reservePoNumber() {
        return formatPoNumber(jdbc.queryForObject("SELECT nextval('public.po_number_seq')", Long.class));
    }

    /** PO number format used across the module. The number itself is always taken from po_number_seq. */
    public static String formatPoNumber(long seq) {
        return "PO-2026-" + String.format("%05d", seq);
    }

    @Transactional
    public Map<String, Object> approveProposal(String proposalId, String approver, String validityDateText) {
        LocalDate validityDate = PoValidity.parseRequired(validityDateText);
        PoValidity.validateNewDate(validityDate, LocalDate.now());

        PurchaseProposal proposal = getProposalById(proposalId)
                .orElseThrow(() -> new IllegalArgumentException("Proposal not found: " + proposalId));

        proposal.setStatus("APPROVED");
        proposal.setApprovedBy(approver != null && !approver.trim().isEmpty() ? approver : "Authorized Approver");
        proposal.setApprovedAt(getNowTimestamp());

        List<PurchaseOrder> createdOrders = new ArrayList<>();
        List<String> poNumbers = new ArrayList<>();

        for (VendorSummaryGroup group : proposal.getVendorGroups()) {
            String poNum = reservePoNumber();

            PurchaseOrder po = new PurchaseOrder();
            po.setId("PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            po.setPoNumber(poNum);
            po.setPoDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            po.setValidityDate(validityDate.toString());
            po.setCreatedAt(getNowTimestamp());
            po.setProposalNumber(proposal.getProposalNumber());
            po.setPrNumber(proposal.getPrNumber());
            po.setPrDate(proposal.getPrDate());
            po.setDepartment(proposal.getDepartment());
            po.setRequestedBy(proposal.getRequestedBy());

            po.setVendorCode(group.getVendorCode());
            po.setVendorName(group.getVendorName());
            po.setVendorGstin(group.getVendorGstin());
            po.setVendorPan(group.getVendorPan());
            po.setContactPerson(group.getContactPerson());
            po.setPhone(group.getPhone());
            po.setEmail(group.getEmail());
            po.setBillingAddress(COMPANY_BILLING_ADDRESS);
            po.setShippingAddress(group.getAddress() != null ? group.getAddress() : "Silver Muller Central Warehouse, Plant 1, Silvassa");
            po.setPaymentTerms(group.getPaymentTerms() != null ? group.getPaymentTerms() : "Net 30 Days from MRN");

            po.setItems(group.getItems());
            po.setItemsGross(group.getItemsGross());
            po.setTotalDiscount(group.getTotalDiscount());
            po.setTaxableAmount(group.getTaxableAmount());
            po.setTotalTax(group.getTotalTax());
            po.setCgstTotal(group.getCgstAmount());
            po.setSgstTotal(group.getSgstAmount());
            po.setIgstTotal(group.getIgstAmount());
            po.setIsInterState(group.getIsInterState());
            
            VendorExtraCharges vc = null;
            if (proposal.getVendorCharges() != null) {
                vc = proposal.getVendorCharges().get(group.getVendorCode());
            }
            String finalPoType = "Standard PO";
            if (vc != null && vc.getPoType() != null && !vc.getPoType().trim().isEmpty()) {
                finalPoType = vc.getPoType().trim();
            } else if (group.getPoType() != null && !group.getPoType().trim().isEmpty()) {
                finalPoType = group.getPoType().trim();
            }
            po.setPoType(finalPoType);
            po.setRevisionNumber(0);
            po.setDeliveryCharges(group.getDeliveryFreight());
            po.setOtherCharges(group.getOtherCharges());
            po.setRoundOff(group.getRoundOff());
            po.setGrandTotal(group.getVendorTotal());

            po.setStatus("APPROVED");
            po.setApprovedBy(proposal.getApprovedBy());
            po.setApprovedAt(proposal.getApprovedAt());
            po.setDeliveryDate(group.getItems().isEmpty() ? null : group.getItems().get(0).getExpectedDeliveryDate());
            po.setDeliveryLocation(group.getItems().isEmpty() ? null : group.getItems().get(0).getDeliveryLocation());
            
            String srcQuote = proposal.getSourceQuotationNumber();
            Long srcQuoteId = proposal.getSourceQuotationId();
            if ((srcQuote == null || srcQuote.isEmpty()) && group.getItems() != null && !group.getItems().isEmpty()) {
                srcQuote = group.getItems().get(0).getSourceQuotationNumber();
                srcQuoteId = group.getItems().get(0).getSourceQuotationId();
            }
            po.setSourceQuotationNumber(srcQuote);
            po.setSourceQuotationId(srcQuoteId);

            // Resolve clubbing batch details if applicable
            Long clubBatchId = proposal.getClubbingBatchId();
            String clubBatchNumber = proposal.getClubbingBatchNumber();
            if (clubBatchId == null && proposal.getPrNumber() != null && proposal.getPrNumber().startsWith("CB-")) {
                clubBatchNumber = proposal.getPrNumber();
                try {
                    List<Map<String, Object>> bRows = jdbc.queryForList("SELECT id, batch_number FROM pr_clubbing_batches WHERE batch_number = ?", clubBatchNumber);
                    if (!bRows.isEmpty()) {
                        clubBatchId = ((Number) bRows.get(0).get("id")).longValue();
                        clubBatchNumber = (String) bRows.get(0).get("batch_number");
                    }
                } catch (Exception e) {
                    System.err.println("Could not resolve batchId for " + clubBatchNumber + ": " + e.getMessage());
                }
            }
            if (clubBatchId == null && group.getItems() != null) {
                for (PurchaseItemLine it : group.getItems()) {
                    if (it.getClubbingBatchId() != null) {
                        clubBatchId = it.getClubbingBatchId();
                        clubBatchNumber = it.getClubbingBatchNumber();
                        break;
                    }
                }
            }
            if (clubBatchId != null) {
                po.setClubbingBatchId(clubBatchId);
                po.setClubbingBatchNumber(clubBatchNumber);
            }

            po.setRemarks("Generated from Approved Proposal " + proposal.getProposalNumber() + " against PR " + proposal.getPrNumber());

            purchaseOrdersMap.put(po.getId(), po);
            purchaseOrdersMap.put(po.getPoNumber(), po);
            savePoToDb(po);

            // Persist delivery schedules if configured
            List<PurchaseOrderDeliverySchedule> schedList = null;
            if (vc != null && vc.getDeliverySchedules() != null && !vc.getDeliverySchedules().isEmpty()) {
                schedList = vc.getDeliverySchedules();
            } else if (group.getDeliverySchedules() != null && !group.getDeliverySchedules().isEmpty()) {
                schedList = group.getDeliverySchedules();
            }
            if (schedList != null && !schedList.isEmpty()) {
                saveDeliverySchedules(po.getPoNumber(), schedList);
                po.setDeliverySchedules(schedList);
            }

            // Persist payment milestones if configured
            List<PurchaseOrderPaymentMilestone> mileList = null;
            if (vc != null && vc.getPaymentMilestones() != null && !vc.getPaymentMilestones().isEmpty()) {
                mileList = vc.getPaymentMilestones();
            } else if (group.getPaymentMilestones() != null && !group.getPaymentMilestones().isEmpty()) {
                mileList = group.getPaymentMilestones();
            }
            if (mileList != null && !mileList.isEmpty()) {
                savePaymentMilestones(po.getPoNumber(), mileList);
                po.setPaymentMilestones(mileList);
            }

            createdOrders.add(po);
            poNumbers.add(poNum);

            // Update PR item ordered_qty in database (supporting multi-PR line items and clubbing batches)!
            if (group.getItems() != null) {
                for (PurchaseItemLine it : group.getItems()) {
                    Long itemClubBatchId = it.getClubbingBatchId() != null ? it.getClubbingBatchId() : clubBatchId;
                    if (itemClubBatchId != null) {
                        clubbingService.recordPurchaseAllocations(po.getPoNumber(), po.getId(), itemClubBatchId, it.getItemCode(), it.getQuantity());
                    } else {
                        String targetPr = (it.getPrNumber() != null && !it.getPrNumber().trim().isEmpty()) ? it.getPrNumber().trim() : proposal.getPrNumber();
                        if (targetPr != null && !targetPr.startsWith("CB-")) {
                            prService.updateItemOrderedQty(targetPr, it.getItemCode(), it.getQuantity());
                        }
                    }
                }
            }
        }

        proposal.setGeneratedPoNumbers(poNumbers);
        proposalsMap.put(proposal.getId(), proposal);
        if (proposal.getProposalNumber() != null) {
            proposalsMap.put(proposal.getProposalNumber(), proposal);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("proposal", proposal);
        result.put("purchaseOrders", createdOrders);
        result.put("poNumbers", poNumbers);
        if (!poNumbers.isEmpty()) {
            result.put("poNumber", poNumbers.get(0));
        }
        return result;
    }

    public PurchaseProposal rejectProposal(String proposalId, String rejector, String reason) {
        PurchaseProposal proposal = getProposalById(proposalId)
                .orElseThrow(() -> new IllegalArgumentException("Proposal not found: " + proposalId));
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection reason is mandatory");
        }

        proposal.setStatus("REJECTED");
        proposal.setRejectedBy(rejector != null && !rejector.trim().isEmpty() ? rejector : "Authorized Approver");
        proposal.setRejectedAt(getNowTimestamp());
        proposal.setRejectionReason(reason.trim());

        // Any quantities on PR that were held for this proposal remain free/available!
        proposalsMap.put(proposal.getId(), proposal);
        if (proposal.getProposalNumber() != null) {
            proposalsMap.put(proposal.getProposalNumber(), proposal);
        }
        return proposal;
    }

    public PurchaseProposal requestChanges(String proposalId, String requester, String comments) {
        PurchaseProposal proposal = getProposalById(proposalId)
                .orElseThrow(() -> new IllegalArgumentException("Proposal not found: " + proposalId));
        if (comments == null || comments.trim().isEmpty()) {
            throw new IllegalArgumentException("Change request comments are mandatory");
        }

        proposal.setStatus("CHANGES_REQUESTED");
        proposal.setChangesRequestedBy(requester != null && !requester.trim().isEmpty() ? requester : "Authorized Approver");
        proposal.setChangesRequestedAt(getNowTimestamp());
        proposal.setChangesComments(comments.trim());

        proposalsMap.put(proposal.getId(), proposal);
        if (proposal.getProposalNumber() != null) {
            proposalsMap.put(proposal.getProposalNumber(), proposal);
        }
        return proposal;
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
                "id, po_number, po_date, proposal_number, pr_number, pr_date, department, requested_by, " +
                "vendor_code, vendor_name, vendor_gstin, vendor_pan, contact_person, phone, email, " +
                "billing_address, shipping_address, payment_terms, delivery_date, delivery_location, " +
                "status, items_gross, total_discount, taxable_amount, total_tax, delivery_charges, " +
                "other_charges, round_off, grand_total, remarks, approved_by, approved_at, " +
                "source_quotation_number, source_quotation_id, clubbing_batch_number, clubbing_batch_id, details_json, " +
                "po_type, incoterms, freight_terms, delivery_mode, credit_period, revision_number, validity_date, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS DATE), NOW(), NOW()) " +
                "ON CONFLICT (id) DO UPDATE SET " +
                "status = EXCLUDED.status, remarks = EXCLUDED.remarks, details_json = EXCLUDED.details_json, " +
                "po_type = EXCLUDED.po_type, incoterms = EXCLUDED.incoterms, freight_terms = EXCLUDED.freight_terms, " +
                "delivery_mode = EXCLUDED.delivery_mode, credit_period = EXCLUDED.credit_period, revision_number = EXCLUDED.revision_number, " +
                "clubbing_batch_number = EXCLUDED.clubbing_batch_number, clubbing_batch_id = EXCLUDED.clubbing_batch_id, updated_at = NOW()",
                po.getId(), po.getPoNumber(), po.getPoDate(), po.getProposalNumber(), po.getPrNumber(), po.getPrDate(),
                po.getDepartment(), po.getRequestedBy(), po.getVendorCode(), po.getVendorName(), po.getVendorGstin(),
                po.getVendorPan(), po.getContactPerson(), po.getPhone(), po.getEmail(), po.getBillingAddress(),
                po.getShippingAddress(), po.getPaymentTerms(), po.getDeliveryDate(), po.getDeliveryLocation(),
                po.getStatus(), po.getItemsGross(), po.getTotalDiscount(), po.getTaxableAmount(), po.getTotalTax(),
                po.getDeliveryCharges(), po.getOtherCharges(), po.getRoundOff(), po.getGrandTotal(), po.getRemarks(),
                po.getApprovedBy(), po.getApprovedAt(), po.getSourceQuotationNumber(), po.getSourceQuotationId(),
                po.getClubbingBatchNumber(), po.getClubbingBatchId(), itemsJson,
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
                po.setProposalNumber(rs.getString("proposal_number"));
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
                po.setClubbingBatchNumber(rs.getString("clubbing_batch_number"));
                Long cbId = rs.getObject("clubbing_batch_id") != null ? rs.getLong("clubbing_batch_id") : null;
                po.setClubbingBatchId(cbId);

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
                if (po.getPoNumber() != null && po.getPoNumber().startsWith("PO-2026-")) {
                    try {
                        int num = Integer.parseInt(po.getPoNumber().replace("PO-2026-", ""));
                        poCounter.accumulateAndGet(num, Math::max);
                    } catch (Exception ignored) {}
                }
            });
        } catch (Exception e) {
            System.err.println("Could not load POs from DB: " + e.getMessage());
        }
    }

    public Map<String, Object> createPoAmendment(String poNumber, String changedBy, String changeReason, Map<String, Object> changes) {
        PurchaseOrder po = getPurchaseOrder(poNumber)
                .orElseThrow(() -> new IllegalArgumentException("PO not found: " + poNumber));
        // A PO raised through PO by PR has its quantities reserved on PR lines (po_pr_allocations). Changing its
        // lines here would change the PO without changing those reservations. Refused; nothing is written.
        Integer allocated = jdbc.queryForObject("SELECT COUNT(*) FROM public.po_pr_allocations WHERE po_number = ?", Integer.class, po.getPoNumber());
        if (allocated != null && allocated > 0) {
            throw new ConflictException("PO " + po.getPoNumber() + " was raised through PO by PR. Amending it is not supported yet; it was not changed.");
        }
        int currentRev = po.getRevisionNumber() != null ? po.getRevisionNumber() : 0;
        int newRev = currentRev + 1;
        po.setRevisionNumber(newRev);

        String actor = changedBy != null && !changedBy.trim().isEmpty() ? changedBy : "Authorized User";
        String reason = changeReason != null && !changeReason.trim().isEmpty() ? changeReason : "Order terms amended";

        String changesJson = "";
        try {
            changesJson = objectMapper.writeValueAsString(changes != null ? changes : Collections.emptyMap());
        } catch (Exception ignored) {}

        jdbc.update("INSERT INTO public.po_revisions (po_number, revision_number, changed_by, change_reason, changes_json) VALUES (?, ?, ?, ?, ?)",
                po.getPoNumber(), newRev, actor, reason, changesJson);

        po.setRemarks((po.getRemarks() != null ? po.getRemarks() + " | " : "") + "Rev." + newRev + " (" + actor + "): " + reason);
        savePoToDb(po);
        purchaseOrdersMap.put(po.getId(), po);
        purchaseOrdersMap.put(po.getPoNumber(), po);

        return Map.of("poNumber", po.getPoNumber(), "revisionNumber", newRev, "status", "AMENDED");
    }

    public List<Map<String, Object>> getPoRevisions(String poNumber) {
        return jdbc.queryForList("SELECT id, po_number, revision_number, changed_by, change_reason, changes_json, created_at FROM public.po_revisions WHERE po_number = ? ORDER BY revision_number DESC", poNumber);
    }

    /**
     * Sets or extends a PO's validity date and records old date, new date, user, timestamp and reason
     * in purchase_order_validity_history. The new date must be today or later and after the current date.
     */
    @Transactional
    public PurchaseOrder extendPoValidity(String poNumber, String newValidityDate, String reason, String user) {
        PurchaseOrder po = getPurchaseOrder(poNumber)
                .orElseThrow(() -> new IllegalArgumentException("PO not found: " + poNumber));
        if ("CANCELLED".equalsIgnoreCase(po.getStatus())) {
            throw new IllegalArgumentException("Validity cannot be extended for a cancelled PO.");
        }

        String actor = user != null ? user.trim() : "";
        if (actor.isEmpty() || !validityExtendAuthorizedUsers.contains(actor.toLowerCase())) {
            throw new NotAuthorizedException("User '" + actor + "' is not authorized to extend PO validity.");
        }
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("A reason is mandatory to extend PO validity.");
        }

        LocalDate proposed = PoValidity.parseRequired(newValidityDate);
        LocalDate current = PoValidity.parse(po.getValidityDate());
        PoValidity.validateExtension(current, proposed, LocalDate.now());

        jdbc.update(
            "INSERT INTO public.purchase_order_validity_history (po_number, action, old_validity_date, new_validity_date, changed_by, reason) " +
            "VALUES (?, ?, CAST(? AS DATE), CAST(? AS DATE), ?, ?)",
            po.getPoNumber(), current == null ? "SET" : "EXTENDED",
            current != null ? current.toString() : null, proposed.toString(), actor, reason.trim()
        );
        jdbc.update(
            "UPDATE public.purchase_orders SET validity_date = CAST(? AS DATE), updated_at = NOW() WHERE po_number = ?",
            proposed.toString(), po.getPoNumber()
        );

        po.setValidityDate(proposed.toString());
        purchaseOrdersMap.put(po.getId(), po);
        purchaseOrdersMap.put(po.getPoNumber(), po);
        return po;
    }

    public List<Map<String, Object>> getPoValidityHistory(String poNumber) {
        return jdbc.queryForList(
            "SELECT id, po_number, action, old_validity_date::text AS old_validity_date, new_validity_date::text AS new_validity_date, " +
            "changed_by, reason, changed_at::text AS changed_at " +
            "FROM public.purchase_order_validity_history WHERE po_number = ? ORDER BY changed_at DESC, id DESC",
            poNumber);
    }

    private static Set<String> parseAuthorizedUsers(String csv) {
        Set<String> users = new HashSet<>();
        if (csv == null) return users;
        for (String part : csv.split(",")) {
            String name = part.trim().toLowerCase();
            if (!name.isEmpty()) users.add(name);
        }
        return users;
    }

    /** Raised when the acting user is not allowed to perform a PO action. Mapped to HTTP 403. */
    public static class NotAuthorizedException extends RuntimeException {
        public NotAuthorizedException(String message) { super(message); }
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
            po.setPaymentMilestones(getPaymentMilestones(po.getPoNumber()));
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

    public List<PurchaseOrderPaymentMilestone> getPaymentMilestones(String poNumber) {
        String sql = "SELECT id, po_id, po_number, milestone_sequence, milestone_title, trigger_event, linked_lot_number, percentage, milestone_amount, credit_days, due_date, payment_status, paid_amount " +
                     "FROM public.purchase_order_payment_milestones WHERE po_number = ? ORDER BY milestone_sequence ASC";
        return jdbc.query(sql, (rs, rowNum) -> {
            PurchaseOrderPaymentMilestone m = new PurchaseOrderPaymentMilestone();
            m.setId(rs.getLong("id"));
            m.setPoId(rs.getObject("po_id") != null ? rs.getLong("po_id") : null);
            m.setPoNumber(rs.getString("po_number"));
            m.setMilestoneSequence(rs.getInt("milestone_sequence"));
            m.setMilestoneTitle(rs.getString("milestone_title"));
            m.setTriggerEvent(rs.getString("trigger_event"));
            m.setLinkedLotNumber(rs.getObject("linked_lot_number") != null ? rs.getInt("linked_lot_number") : null);
            m.setPercentage(rs.getBigDecimal("percentage"));
            m.setMilestoneAmount(rs.getBigDecimal("milestone_amount"));
            m.setCreditDays(rs.getInt("credit_days"));
            if (rs.getDate("due_date") != null) {
                m.setDueDate(rs.getDate("due_date").toLocalDate());
            }
            m.setPaymentStatus(rs.getString("payment_status"));
            m.setPaidAmount(rs.getBigDecimal("paid_amount"));
            return m;
        }, poNumber);
    }

    @Transactional
    public void savePaymentMilestones(String poNumber, List<PurchaseOrderPaymentMilestone> milestones) {
        jdbc.update("DELETE FROM public.purchase_order_payment_milestones WHERE po_number = ?", poNumber);
        if (milestones == null || milestones.isEmpty()) return;

        for (PurchaseOrderPaymentMilestone m : milestones) {
            jdbc.update(
                "INSERT INTO public.purchase_order_payment_milestones (po_number, milestone_sequence, milestone_title, trigger_event, linked_lot_number, percentage, milestone_amount, credit_days, due_date, payment_status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                poNumber, m.getMilestoneSequence() != null ? m.getMilestoneSequence() : 1,
                m.getMilestoneTitle() != null ? m.getMilestoneTitle() : "Milestone",
                m.getTriggerEvent() != null ? m.getTriggerEvent() : "UPON_LOT_GRN",
                m.getLinkedLotNumber(),
                m.getPercentage(),
                m.getMilestoneAmount() != null ? m.getMilestoneAmount() : BigDecimal.ZERO,
                m.getCreditDays() != null ? m.getCreditDays() : 15,
                m.getDueDate() != null ? java.sql.Date.valueOf(m.getDueDate()) : null,
                m.getPaymentStatus() != null ? m.getPaymentStatus() : "PENDING"
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
