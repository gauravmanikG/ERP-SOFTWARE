package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.*;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.model.MouldingBomMapping;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.repository.MouldingBomMappingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class MouldingTransferRuleService {

    private final MasterRepository masterRepository;
    private final DepartmentService departmentService;
    private final MouldingBomMappingRepository mouldingBomMappingRepository;
    private final InventoryTransactionService inventoryTransactionService;

    public MouldingTransferRuleService(
            MasterRepository masterRepository,
            DepartmentService departmentService,
            MouldingBomMappingRepository mouldingBomMappingRepository,
            InventoryTransactionService inventoryTransactionService) {
        this.masterRepository = masterRepository;
        this.departmentService = departmentService;
        this.mouldingBomMappingRepository = mouldingBomMappingRepository;
        this.inventoryTransactionService = inventoryTransactionService;
    }

    public String classifyCategory(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return "STANDARD";
        }
        String catUpper = categoryName.trim().toUpperCase();
        if (catUpper.contains("MOULDED") || catUpper.equals("OMLD") || catUpper.equals("IMLD")) {
            return "MOULDED";
        }
        if (catUpper.contains("O-RING") || catUpper.contains("ORING") || catUpper.equals("O_RING")) {
            return "O_RING";
        }
        return "STANDARD";
    }

    @Transactional(readOnly = true)
    public MovementPlan calculateMovementPlan(MouldingBOMRequest request) {
        MovementPlan plan = new MovementPlan();
        plan.setValid(true);

        if (request.getFromDepartmentId() == null || request.getToDepartmentId() == null) {
            plan.setValid(false);
            plan.setValidationError("Source and Destination departments are required.");
            return plan;
        }

        if (request.getFromDepartmentId().equals(request.getToDepartmentId())) {
            plan.setValid(false);
            plan.setValidationError("Source and Destination departments cannot be the same.");
            return plan;
        }

        Department fromDept = null;
        Department toDept = null;
        try {
            fromDept = departmentService.getDepartmentEntity(request.getFromDepartmentId());
            toDept = departmentService.getDepartmentEntity(request.getToDepartmentId());
        } catch (Exception e) {
            // Silently ignore if department ID cannot be resolved
        }

        if (fromDept == null || toDept == null) {
            plan.setValid(false);
            plan.setValidationError("Invalid source or destination department.");
            return plan;
        }

        plan.setSourceDepartmentName(fromDept.getName());
        plan.setDestinationDepartmentName(toDept.getName());

        if (request.getQuantity() == null || request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            plan.setValid(false);
            plan.setValidationError("Quantity must be greater than zero.");
            return plan;
        }

        // Validate selected item in master
        Master selectedItem = null;
        if (request.getMasterId() != null) {
            selectedItem = masterRepository.findById(request.getMasterId()).orElse(null);
        }
        if (selectedItem == null && request.getItemCode() != null && !request.getItemCode().isBlank()) {
            selectedItem = masterRepository.findByCodeIgnoreCase(request.getItemCode().trim()).orElse(null);
        }

        if (selectedItem == null) {
            plan.setValid(false);
            plan.setValidationError("Selected item is not configured in item master. Please create the item before transferring stock.");
            return plan;
        }

        plan.setSelectedItemCode(selectedItem.getCode());
        String category = (request.getCategory() != null && !request.getCategory().isBlank())
                ? request.getCategory().trim()
                : selectedItem.getCategory();
        plan.setSelectedCategory(category);

        String classification = classifyCategory(category);
        plan.setCategoryClassification(classification);

        BigDecimal qty = request.getQuantity();

        if ("MOULDED".equalsIgnoreCase(classification)) {
            // Derive corresponding metal shell category (e.g. OUTER MOULDED -> OUTER METAL SHELL)
            String metalShellCat = deriveMetalShellCategory(category);

            // Find corresponding Metal Shell item (Style A: distinct item, Style B: same master item)
            Master metalShellItem = resolveMetalShellItem(selectedItem, category);
            if (metalShellItem == null) {
                // Style B fallback: use selectedItem as the master entity with derived metalShellCat
                metalShellItem = selectedItem;
            }

            // 1. Source movement: Deduct Metal Shell from Moulding
            BigDecimal sourceBal = inventoryTransactionService.getDepartmentClosingBalance(
                    metalShellItem.getId(), metalShellCat, fromDept.getId());

            MovementItem sourceMovement = new MovementItem();
            sourceMovement.setRole("SOURCE");
            sourceMovement.setDepartmentId(fromDept.getId());
            sourceMovement.setDepartmentName(fromDept.getName());
            sourceMovement.setMasterId(metalShellItem.getId());
            sourceMovement.setItemCode(metalShellItem.getCode());
            sourceMovement.setItemDescription(metalShellItem.getDescription());
            sourceMovement.setCategory(metalShellCat);
            sourceMovement.setQuantityChange(qty.negate());
            sourceMovement.setAvailableBalanceBefore(sourceBal);
            sourceMovement.setAvailableBalanceAfter(sourceBal.subtract(qty));
            sourceMovement.setUnitOfMeasurement(metalShellItem.getUnitOfMeasurement());
            sourceMovement.setNote("Deduct corresponding metal shell (" + metalShellItem.getCode() + " [" + metalShellCat + "]) from " + fromDept.getName());
            plan.getMovements().add(sourceMovement);

            if (sourceBal.compareTo(qty) < 0) {
                plan.setValid(false);
                plan.setValidationError(String.format(
                        "Insufficient stock in %s for corresponding metal shell item '%s' [%s]. Available: %s %s, Requested: %s %s.",
                        fromDept.getName(), metalShellItem.getCode(), metalShellCat,
                        sourceBal, metalShellItem.getUnitOfMeasurement(),
                        qty, metalShellItem.getUnitOfMeasurement()
                ));
            }

            // 2. Destination movement: Add Moulded item to Destination department
            BigDecimal destBal = inventoryTransactionService.getDepartmentClosingBalance(
                    selectedItem.getId(), category, toDept.getId());

            MovementItem destMovement = new MovementItem();
            destMovement.setRole("DESTINATION");
            destMovement.setDepartmentId(toDept.getId());
            destMovement.setDepartmentName(toDept.getName());
            destMovement.setMasterId(selectedItem.getId());
            destMovement.setItemCode(selectedItem.getCode());
            destMovement.setItemDescription(selectedItem.getDescription());
            destMovement.setCategory(category);
            destMovement.setQuantityChange(qty);
            destMovement.setAvailableBalanceBefore(destBal);
            destMovement.setAvailableBalanceAfter(destBal.add(qty));
            destMovement.setUnitOfMeasurement(selectedItem.getUnitOfMeasurement());
            destMovement.setNote("Add moulded item (" + selectedItem.getCode() + ") to " + toDept.getName());
            plan.getMovements().add(destMovement);

        } else if ("O_RING".equalsIgnoreCase(classification)) {
            // O-RING case: NO stock deduction on Moulding source department
            BigDecimal destBal = inventoryTransactionService.getDepartmentClosingBalance(
                    selectedItem.getId(), category, toDept.getId());

            MovementItem destMovement = new MovementItem();
            destMovement.setRole("DESTINATION");
            destMovement.setDepartmentId(toDept.getId());
            destMovement.setDepartmentName(toDept.getName());
            destMovement.setMasterId(selectedItem.getId());
            destMovement.setItemCode(selectedItem.getCode());
            destMovement.setItemDescription(selectedItem.getDescription());
            destMovement.setCategory(category);
            destMovement.setQuantityChange(qty);
            destMovement.setAvailableBalanceBefore(destBal);
            destMovement.setAvailableBalanceAfter(destBal.add(qty));
            destMovement.setUnitOfMeasurement(selectedItem.getUnitOfMeasurement());
            destMovement.setNote("Add O-Ring item (" + selectedItem.getCode() + ") to " + toDept.getName() + " (No source deduction)");
            plan.getMovements().add(destMovement);

        } else {
            // STANDARD / Metal Shell case: Deduct selected item from Source, Add to Destination
            BigDecimal sourceBal = inventoryTransactionService.getDepartmentClosingBalance(
                    selectedItem.getId(), category, fromDept.getId());

            MovementItem sourceMovement = new MovementItem();
            sourceMovement.setRole("SOURCE");
            sourceMovement.setDepartmentId(fromDept.getId());
            sourceMovement.setDepartmentName(fromDept.getName());
            sourceMovement.setMasterId(selectedItem.getId());
            sourceMovement.setItemCode(selectedItem.getCode());
            sourceMovement.setItemDescription(selectedItem.getDescription());
            sourceMovement.setCategory(category);
            sourceMovement.setQuantityChange(qty.negate());
            sourceMovement.setAvailableBalanceBefore(sourceBal);
            sourceMovement.setAvailableBalanceAfter(sourceBal.subtract(qty));
            sourceMovement.setUnitOfMeasurement(selectedItem.getUnitOfMeasurement());
            sourceMovement.setNote("Deduct selected item (" + selectedItem.getCode() + ") from " + fromDept.getName());
            plan.getMovements().add(sourceMovement);

            if (sourceBal.compareTo(qty) < 0) {
                plan.setValid(false);
                plan.setValidationError(String.format(
                        "Insufficient stock in %s for item '%s' [%s]. Available: %s %s, Requested: %s %s.",
                        fromDept.getName(), selectedItem.getCode(), category,
                        sourceBal, selectedItem.getUnitOfMeasurement(),
                        qty, selectedItem.getUnitOfMeasurement()
                ));
            }

            BigDecimal destBal = inventoryTransactionService.getDepartmentClosingBalance(
                    selectedItem.getId(), category, toDept.getId());

            MovementItem destMovement = new MovementItem();
            destMovement.setRole("DESTINATION");
            destMovement.setDepartmentId(toDept.getId());
            destMovement.setDepartmentName(toDept.getName());
            destMovement.setMasterId(selectedItem.getId());
            destMovement.setItemCode(selectedItem.getCode());
            destMovement.setItemDescription(selectedItem.getDescription());
            destMovement.setCategory(category);
            destMovement.setQuantityChange(qty);
            destMovement.setAvailableBalanceBefore(destBal);
            destMovement.setAvailableBalanceAfter(destBal.add(qty));
            destMovement.setUnitOfMeasurement(selectedItem.getUnitOfMeasurement());
            destMovement.setNote("Add selected item (" + selectedItem.getCode() + ") to " + toDept.getName());
            plan.getMovements().add(destMovement);
        }

        return plan;
    }

    public String deriveMetalShellCategory(String mouldedCategory) {
        if (mouldedCategory == null || mouldedCategory.isBlank()) {
            return "OUTER METAL SHELL";
        }
        String cat = mouldedCategory.trim();
        String upper = cat.toUpperCase();
        if (upper.contains("OUTER") && upper.contains("MOULDED")) {
            return "OUTER METAL SHELL";
        }
        if (upper.contains("INNER") && upper.contains("MOULDED")) {
            return "INNER METAL SHELL";
        }
        if (upper.contains("MIDDLE") && upper.contains("MOULDED")) {
            return "MIDDLE METAL SHELL";
        }
        if (upper.contains("MOULDED")) {
            return cat.replaceAll("(?i)moulded", "METAL SHELL");
        }
        return "OUTER METAL SHELL";
    }

    private Master resolveMetalShellItem(Master mouldedItem, String category) {
        // 1. Check explicit mapping table first
        Optional<MouldingBomMapping> mapping = mouldingBomMappingRepository.findByMouldedItemIdAndActiveTrue(mouldedItem.getId());
        if (mapping.isPresent()) {
            return mapping.get().getMetalShellItem();
        }

        // 2. Pattern matching fallback by Item Code or Description
        String code = mouldedItem.getCode();
        String derivedCode = code.replace("MOULDED", "METAL SHELL").replace("moulded", "metal shell");

        if (!derivedCode.equalsIgnoreCase(code)) {
            Optional<Master> byDerivedCode = masterRepository.findByCodeIgnoreCase(derivedCode);
            if (byDerivedCode.isPresent()) {
                return byDerivedCode.get();
            }
        }

        // Try replacing category in string if code is like "314::OUTER MOULDED"
        if (code.contains("::")) {
            String[] parts = code.split("::", 2);
            String prefix = parts[0].trim();
            String catPart = parts[1].trim();

            String targetCatPart = catPart.replace("MOULDED", "METAL SHELL").replace("moulded", "metal shell");
            String altCode = prefix + "::" + targetCatPart;

            Optional<Master> byAltCode = masterRepository.findByCodeIgnoreCase(altCode);
            if (byAltCode.isPresent()) {
                return byAltCode.get();
            }
        }

        // Try searching for an item starting with prefix and ending with METAL SHELL
        String prefix = code.split("::|\\s+")[0].trim();
        if (!prefix.isBlank()) {
            for (Master candidate : masterRepository.findAll()) {
                if (candidate.getCode().startsWith(prefix) && candidate.getCategory().toUpperCase().contains("SHELL")) {
                    return candidate;
                }
            }
        }

        return null;
    }
}
