package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.InsufficientStockException;
import com.silvermuller.seals.common.exception.InvalidTransactionException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.*;
import com.silvermuller.seals.modules.inventory.model.*;
import com.silvermuller.seals.modules.inventory.repository.*;
import com.silvermuller.seals.modules.notifications.service.StockAlertService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class MouldingBOMService {

    private final MouldingTransferRuleService ruleService;
    private final FgBomTransferRuleService fgBomRuleService;
    private final DepartmentService departmentService;
    private final MasterRepository masterRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final InventoryTransactionService inventoryTransactionService;
    private final OpeningBalanceRepository openingBalanceRepository;
    private final StockAlertService stockAlertService;

    public MouldingBOMService(
            MouldingTransferRuleService ruleService,
            FgBomTransferRuleService fgBomRuleService,
            DepartmentService departmentService,
            MasterRepository masterRepository,
            TransactionTypeRepository transactionTypeRepository,
            InventoryTransactionRepository transactionRepository,
            InventoryTransactionService inventoryTransactionService,
            OpeningBalanceRepository openingBalanceRepository,
            @Lazy StockAlertService stockAlertService) {
        this.ruleService = ruleService;
        this.fgBomRuleService = fgBomRuleService;
        this.departmentService = departmentService;
        this.masterRepository = masterRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionRepository = transactionRepository;
        this.inventoryTransactionService = inventoryTransactionService;
        this.openingBalanceRepository = openingBalanceRepository;
        this.stockAlertService = stockAlertService;
    }

    @Transactional(readOnly = true)
    public MovementPlan previewTransfer(MouldingBOMRequest request) {
        // Route to FG BOM engine if Source=FINISHING and Category=FG
        if (fgBomRuleService.isFgBomTransfer(request)) {
            return fgBomRuleService.calculateFgMovementPlan(request);
        }
        return ruleService.calculateMovementPlan(request);
    }

    @Transactional(rollbackFor = Exception.class)
    public MouldingBOMResponse executeTransfer(MouldingBOMRequest request) {
        // Route to FG BOM execution if Source=FINISHING and Category=FG
        if (fgBomRuleService.isFgBomTransfer(request)) {
            return executeFgBomTransfer(request);
        }

        MovementPlan plan = ruleService.calculateMovementPlan(request);

        if (!plan.isValid()) {
            if (plan.getValidationError() != null && plan.getValidationError().toLowerCase().contains("insufficient stock")) {
                throw new InsufficientStockException(plan.getValidationError());
            }
            throw new InvalidTransactionException(plan.getValidationError());
        }

        Department fromDept = departmentService.getDepartmentEntity(request.getFromDepartmentId());
        Department toDept = departmentService.getDepartmentEntity(request.getToDepartmentId());
        if (fromDept == null || toDept == null) {
            throw new ResourceNotFoundException("Source or Destination department not found.");
        }

        TransactionType transferType = transactionTypeRepository.findByTypeIgnoreCase("Material Transfer")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setType("Material Transfer");
                    return transactionTypeRepository.save(tt);
                });

        TransactionType receiptType = transactionTypeRepository.findByTypeIgnoreCase("BOM Moulding Receipt")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setType("BOM Moulding Receipt");
                    return transactionTypeRepository.save(tt);
                });

        String txNum = generateTransactionNumber();
        String slipNum = (request.getSlipNumber() != null && !request.getSlipNumber().isBlank())
                ? request.getSlipNumber().trim()
                : txNum;

        MouldingBOMResponse response = new MouldingBOMResponse();
        response.setSuccess(true);
        response.setTransactionNumber(txNum);
        response.setSlipNumber(slipNum);
        response.setMovementPlan(plan);
        response.setMessage(String.format("BOM Moulding Transfer completed successfully from %s to %s.",
                fromDept.getName(), toDept.getName()));

        OffsetDateTime now = OffsetDateTime.now();
        String classification = plan.getCategoryClassification();

        if ("MOULDED".equalsIgnoreCase(classification)) {
            // MOULDED:
            // 1. Source movement: Deduct metal shell from Moulding. (toDepartment = null ensures no stock addition to destination)
            MovementItem shellMovement = plan.getMovements().stream()
                    .filter(m -> "SOURCE".equalsIgnoreCase(m.getRole()))
                    .findFirst()
                    .orElseThrow(() -> new InvalidTransactionException("Shell deduction movement missing in plan."));

            Master shellMaster = masterRepository.findByIdForUpdate(shellMovement.getMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("Shell master item not found: " + shellMovement.getMasterId()));

            InventoryTransaction txShell = new InventoryTransaction();
            txShell.setTransactionNumber(txNum);
            txShell.setSlipNumber(slipNum);
            txShell.setTransactionType(transferType);
            txShell.setMaster(shellMaster);
            txShell.setCategory(shellMovement.getCategory());
            txShell.setFromDepartment(fromDept);
            txShell.setToDepartment(null); // Outbound from Moulding only!
            txShell.setQuantity(shellMovement.getQuantityChange().abs());
            txShell.setTransactionDate(now);
            txShell.setRemarks(request.getRemarks() != null && !request.getRemarks().isBlank()
                    ? request.getRemarks() + " (Shell deduction)"
                    : "BOM Moulding: Shell consumed for " + plan.getSelectedItemCode());
            InventoryTransaction savedShell = transactionRepository.save(txShell);
            response.getTransactions().add(mapToResponse(savedShell, inventoryTransactionService.getCurrentBalance(shellMaster.getId())));
            stockAlertService.evaluateItem(shellMaster.getCode(), shellMovement.getCategory());

            // 2. Destination movement: Add moulded item to Destination using inbound BOM Moulding Receipt
            MovementItem mouldedMovement = plan.getMovements().stream()
                    .filter(m -> "DESTINATION".equalsIgnoreCase(m.getRole()))
                    .findFirst()
                    .orElseThrow(() -> new InvalidTransactionException("Moulded addition movement missing in plan."));

            Master mouldedMaster = masterRepository.findByIdForUpdate(mouldedMovement.getMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("Moulded master item not found: " + mouldedMovement.getMasterId()));

            InventoryTransaction txMoulded = new InventoryTransaction();
            txMoulded.setTransactionNumber(txNum);
            txMoulded.setSlipNumber(slipNum);
            txMoulded.setTransactionType(receiptType); // Inbound operation: adds to toDept, NO deduction from fromDept
            txMoulded.setMaster(mouldedMaster);
            txMoulded.setCategory(mouldedMovement.getCategory());
            txMoulded.setFromDepartment(fromDept);
            txMoulded.setToDepartment(toDept);
            txMoulded.setQuantity(mouldedMovement.getQuantityChange().abs());
            txMoulded.setTransactionDate(now);
            txMoulded.setRemarks(request.getRemarks() != null && !request.getRemarks().isBlank()
                    ? request.getRemarks()
                    : "BOM Moulding: Transfer to " + toDept.getName());
            InventoryTransaction savedMoulded = transactionRepository.save(txMoulded);

            ensureOpeningBalanceExists(mouldedMaster.getCode(), mouldedMovement.getCategory(), toDept.getName());
            response.getTransactions().add(mapToResponse(savedMoulded, inventoryTransactionService.getCurrentBalance(mouldedMaster.getId())));
            stockAlertService.evaluateItem(mouldedMaster.getCode(), mouldedMovement.getCategory());

        } else if ("O_RING".equalsIgnoreCase(classification)) {
            // O-RING:
            // Add O-Ring to Destination using inbound BOM Moulding Receipt. No deduction from Moulding.
            MovementItem oRingMovement = plan.getMovements().stream()
                    .filter(m -> "DESTINATION".equalsIgnoreCase(m.getRole()))
                    .findFirst()
                    .orElseThrow(() -> new InvalidTransactionException("O-Ring destination movement missing in plan."));

            Master oRingMaster = masterRepository.findByIdForUpdate(oRingMovement.getMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("O-Ring master item not found: " + oRingMovement.getMasterId()));

            InventoryTransaction txORing = new InventoryTransaction();
            txORing.setTransactionNumber(txNum);
            txORing.setSlipNumber(slipNum);
            txORing.setTransactionType(receiptType); // Inbound operation
            txORing.setMaster(oRingMaster);
            txORing.setCategory(oRingMovement.getCategory());
            txORing.setFromDepartment(fromDept);
            txORing.setToDepartment(toDept);
            txORing.setQuantity(oRingMovement.getQuantityChange().abs());
            txORing.setTransactionDate(now);
            txORing.setRemarks(request.getRemarks() != null && !request.getRemarks().isBlank()
                    ? request.getRemarks()
                    : "BOM Moulding: O-Ring Transfer to " + toDept.getName());
            InventoryTransaction savedORing = transactionRepository.save(txORing);

            ensureOpeningBalanceExists(oRingMaster.getCode(), oRingMovement.getCategory(), toDept.getName());
            response.getTransactions().add(mapToResponse(savedORing, inventoryTransactionService.getCurrentBalance(oRingMaster.getId())));
            stockAlertService.evaluateItem(oRingMaster.getCode(), oRingMovement.getCategory());

        } else {
            // STANDARD:
            // Standard single Material Transfer from fromDept to toDept (subtracts from fromDept, adds to toDept)
            Master stdMaster = masterRepository.findByIdForUpdate(request.getMasterId() != null
                    ? request.getMasterId()
                    : plan.getMovements().get(0).getMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found"));

            String cat = (request.getCategory() != null && !request.getCategory().isBlank())
                    ? request.getCategory().trim()
                    : plan.getSelectedCategory();

            InventoryTransaction txStd = new InventoryTransaction();
            txStd.setTransactionNumber(txNum);
            txStd.setSlipNumber(slipNum);
            txStd.setTransactionType(transferType); // Standard Material Transfer
            txStd.setMaster(stdMaster);
            txStd.setCategory(cat);
            txStd.setFromDepartment(fromDept);
            txStd.setToDepartment(toDept);
            txStd.setQuantity(request.getQuantity());
            txStd.setTransactionDate(now);
            txStd.setRemarks(request.getRemarks() != null && !request.getRemarks().isBlank()
                    ? request.getRemarks()
                    : "BOM Moulding: Transfer to " + toDept.getName());
            InventoryTransaction savedStd = transactionRepository.save(txStd);

            ensureOpeningBalanceExists(stdMaster.getCode(), cat, toDept.getName());
            response.getTransactions().add(mapToResponse(savedStd, inventoryTransactionService.getCurrentBalance(stdMaster.getId())));
            stockAlertService.evaluateItem(stdMaster.getCode(), cat);
        }

        return response;
    }

    /**
     * Execute an FG BOM consumption transfer from Finishing.
     * Creates one deduction transaction per consumed component in Finishing,
     * and one inbound receipt for the FG item in the destination department.
     */
    @Transactional(rollbackFor = Exception.class)
    private MouldingBOMResponse executeFgBomTransfer(MouldingBOMRequest request) {
        MovementPlan plan = fgBomRuleService.calculateFgMovementPlan(request);

        if (!plan.isValid()) {
            if (plan.getValidationError() != null && plan.getValidationError().toLowerCase().contains("insufficient stock")) {
                throw new InsufficientStockException(plan.getValidationError());
            }
            throw new InvalidTransactionException(plan.getValidationError());
        }

        Department fromDept = departmentService.getDepartmentEntity(request.getFromDepartmentId());
        Department toDept = departmentService.getDepartmentEntity(request.getToDepartmentId());
        if (fromDept == null || toDept == null) {
            throw new ResourceNotFoundException("Source or Destination department not found.");
        }

        TransactionType transferType = transactionTypeRepository.findByTypeIgnoreCase("Material Transfer")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setType("Material Transfer");
                    return transactionTypeRepository.save(tt);
                });

        TransactionType fgReceiptType = transactionTypeRepository.findByTypeIgnoreCase("BOM FG Transfer Receipt")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setType("BOM FG Transfer Receipt");
                    return transactionTypeRepository.save(tt);
                });

        String txNum = generateFgTransactionNumber();
        String slipNum = (request.getSlipNumber() != null && !request.getSlipNumber().isBlank())
                ? request.getSlipNumber().trim()
                : txNum;

        MouldingBOMResponse response = new MouldingBOMResponse();
        response.setSuccess(true);
        response.setTransactionNumber(txNum);
        response.setSlipNumber(slipNum);
        response.setMovementPlan(plan);
        response.setMessage(String.format("FG BOM Transfer completed successfully from %s to %s. Item: %s [FG], Qty: %s.",
                fromDept.getName(), toDept.getName(), plan.getSelectedItemCode(), request.getQuantity()));

        OffsetDateTime now = OffsetDateTime.now();

        // Process each SOURCE movement (component deductions from Finishing)
        for (MovementItem movement : plan.getMovements()) {
            if ("EXCLUDED".equalsIgnoreCase(movement.getRole())) {
                continue; // Skip excluded components (metal shells covered by moulded)
            }

            if ("SOURCE".equalsIgnoreCase(movement.getRole())) {
                if (movement.getMasterId() == null) {
                    continue; // Component not found in master, skip
                }

                Master componentMaster = masterRepository.findByIdForUpdate(movement.getMasterId())
                        .orElseThrow(() -> new ResourceNotFoundException("Component master not found: " + movement.getMasterId()));

                BigDecimal deductQty = movement.getQuantityChange().abs();

                // Create outbound deduction from Finishing (toDepartment = null means outbound only)
                InventoryTransaction txDeduct = new InventoryTransaction();
                txDeduct.setTransactionNumber(txNum);
                txDeduct.setSlipNumber(slipNum);
                txDeduct.setTransactionType(transferType);
                txDeduct.setMaster(componentMaster);
                txDeduct.setCategory(movement.getCategory());
                txDeduct.setFromDepartment(fromDept);
                txDeduct.setToDepartment(null); // Outbound from Finishing only
                txDeduct.setQuantity(deductQty);
                txDeduct.setTransactionDate(now);
                txDeduct.setRemarks(request.getRemarks() != null && !request.getRemarks().isBlank()
                        ? request.getRemarks() + " (FG BOM: " + movement.getCategory() + ")"
                        : "FG BOM Consumption: " + movement.getCategory() + " for " + plan.getSelectedItemCode());
                InventoryTransaction saved = transactionRepository.save(txDeduct);

                ensureOpeningBalanceExists(componentMaster.getCode(), movement.getCategory(), fromDept.getName());
                response.getTransactions().add(mapToResponse(saved, inventoryTransactionService.getCurrentBalance(componentMaster.getId())));
                stockAlertService.evaluateItem(componentMaster.getCode(), movement.getCategory());
            }

            if ("DESTINATION".equalsIgnoreCase(movement.getRole())) {
                Master fgMaster = masterRepository.findByIdForUpdate(movement.getMasterId())
                        .orElseThrow(() -> new ResourceNotFoundException("FG master not found: " + movement.getMasterId()));

                // Create inbound FG receipt to destination department
                InventoryTransaction txFgReceipt = new InventoryTransaction();
                txFgReceipt.setTransactionNumber(txNum);
                txFgReceipt.setSlipNumber(slipNum);
                txFgReceipt.setTransactionType(fgReceiptType); // Inbound: adds to toDept
                txFgReceipt.setMaster(fgMaster);
                txFgReceipt.setCategory("FG");
                txFgReceipt.setFromDepartment(fromDept);
                txFgReceipt.setToDepartment(toDept);
                txFgReceipt.setQuantity(movement.getQuantityChange().abs());
                txFgReceipt.setTransactionDate(now);
                txFgReceipt.setRemarks(request.getRemarks() != null && !request.getRemarks().isBlank()
                        ? request.getRemarks()
                        : "FG BOM Transfer: " + fgMaster.getCode() + " to " + toDept.getName());
                InventoryTransaction savedFg = transactionRepository.save(txFgReceipt);

                ensureOpeningBalanceExists(fgMaster.getCode(), "FG", toDept.getName());
                response.getTransactions().add(mapToResponse(savedFg, inventoryTransactionService.getCurrentBalance(fgMaster.getId())));
                stockAlertService.evaluateItem(fgMaster.getCode(), "FG");
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransferHistory() {
        // Include both Moulding BOM (MBD-) and FG BOM (FGB-) transfer history
        List<InventoryTransaction> mouldingList = transactionRepository
                .findByTransactionNumberStartingWithOrderByTransactionDateDescIdDesc("MBD-");
        List<InventoryTransaction> fgList = transactionRepository
                .findByTransactionNumberStartingWithOrderByTransactionDateDescIdDesc("FGB-");

        List<InventoryTransaction> combined = new ArrayList<>();
        combined.addAll(mouldingList);
        combined.addAll(fgList);
        // Sort by date desc, id desc
        combined.sort((a, b) -> {
            int dateComp = b.getTransactionDate().compareTo(a.getTransactionDate());
            if (dateComp != 0) return dateComp;
            return b.getId().compareTo(a.getId());
        });

        List<TransactionResponse> result = new ArrayList<>();
        for (InventoryTransaction tx : combined) {
            BigDecimal curBal = inventoryTransactionService.getCurrentBalance(tx.getMaster().getId());
            result.add(mapToResponse(tx, curBal));
        }
        return result;
    }

    private void ensureOpeningBalanceExists(String itemCode, String category, String deptName) {
        if (itemCode == null || category == null || deptName == null) return;
        List<OpeningBalance> existing = openingBalanceRepository
                .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
                        itemCode.trim(), category.trim(), deptName.trim());
        if (existing.isEmpty()) {
            OpeningBalance ob = new OpeningBalance();
            ob.setItemCode(itemCode.trim());
            ob.setCategoryName(category.trim());
            ob.setDepartmentName(deptName.trim());
            ob.setOpeningBalance(BigDecimal.ZERO);
            ob.setMainCode(itemCode.trim() + "::" + category.trim() + "::" + deptName.trim());
            openingBalanceRepository.save(ob);
        }
    }

    private synchronized String generateTransactionNumber() {
        Long maxId = transactionRepository.findMaxTransactionId();
        long nextSeq = (maxId != null ? maxId : 0) + 1;
        return String.format("MBD-%04d", nextSeq);
    }

    private synchronized String generateFgTransactionNumber() {
        Long maxId = transactionRepository.findMaxTransactionId();
        long nextSeq = (maxId != null ? maxId : 0) + 1;
        return String.format("FGB-%04d", nextSeq);
    }

    private TransactionResponse mapToResponse(InventoryTransaction tx, BigDecimal currentBalanceAfter) {
        TransactionResponse dto = new TransactionResponse();
        dto.setId(tx.getId());
        dto.setTransactionNumber(tx.getTransactionNumber());
        dto.setSlipNumber(tx.getSlipNumber());
        dto.setTransactionType(tx.getTransactionType().getType());
        dto.setMasterId(tx.getMaster().getId());
        dto.setMasterCode(tx.getMaster().getCode());
        dto.setMasterDescription(tx.getMaster().getDescription());
        dto.setCategory(tx.getCategory());
        dto.setUnitOfMeasurement(tx.getMaster().getUnitOfMeasurement());
        if (tx.getFromDepartment() != null) {
            dto.setFromDepartmentId(tx.getFromDepartment().getId());
            dto.setFromDepartmentName(tx.getFromDepartment().getName());
        }
        if (tx.getToDepartment() != null) {
            dto.setToDepartmentId(tx.getToDepartment().getId());
            dto.setToDepartmentName(tx.getToDepartment().getName());
        }
        dto.setQuantity(tx.getQuantity());
        dto.setTransactionDate(tx.getTransactionDate());
        dto.setRemarks(tx.getRemarks());
        dto.setCurrentBalanceAfter(currentBalanceAfter);
        return dto;
    }
}

