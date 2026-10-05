package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.modules.inventory.dto.MouldingBOMRequest;
import com.silvermuller.seals.modules.inventory.dto.MovementItem;
import com.silvermuller.seals.modules.inventory.dto.MovementPlan;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.FgBomEntry;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.repository.FgBomRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Service responsible for computing the FG BOM consumption movement plan.
 * <p>
 * When Source = FINISHING and Category = FG, the system decomposes the finished good
 * into its BOM components, validates stock for each, and applies the metal shell
 * exclusion rule (if moulded + metal shell are both present, skip metal shell).
 */
@Service
public class FgBomTransferRuleService {

    /** All 29 component categories in BOM column order (must match fg_bom table columns). */
    private static final List<String> ALL_COMPONENT_CATEGORIES = List.of(
            "OUTER METAL SHELL", "INNER METAL SHELL", "SPRING", "MIDDLE METAL SHELL",
            "OUTER MOULDED", "INNER MOULDED", "MIDDLE MOULDED",
            "FELT", "PTFE", "TPU/PU", "BRASS WASHER", "NUT", "PLASTIC",
            "TOOTED DISC", "FOAM", "GASKET", "O-RING", "LOCK WASHER",
            "ALUMINIUM WASHER", "SFG", "BIG SHIM-THIN", "SMALL SHIM-THIN",
            "BIG SHIM-THICK", "SMALL SHIM-THICK", "SPLIT PIN", "COTTON PIN",
            "SILICON RUBBER", "O RING MOULDED", "JALI"
    );

    /** Metal shell → moulded pairing for exclusion rule. */
    private static final Map<String, String> METAL_SHELL_TO_MOULDED = Map.of(
            "OUTER METAL SHELL", "OUTER MOULDED",
            "INNER METAL SHELL", "INNER MOULDED",
            "MIDDLE METAL SHELL", "MIDDLE MOULDED"
    );

    private final FgBomRepository fgBomRepository;
    private final MasterRepository masterRepository;
    private final DepartmentService departmentService;
    private final InventoryTransactionService inventoryTransactionService;

    public FgBomTransferRuleService(
            FgBomRepository fgBomRepository,
            MasterRepository masterRepository,
            DepartmentService departmentService,
            InventoryTransactionService inventoryTransactionService) {
        this.fgBomRepository = fgBomRepository;
        this.masterRepository = masterRepository;
        this.departmentService = departmentService;
        this.inventoryTransactionService = inventoryTransactionService;
    }

    /**
     * Checks whether this request should be handled by the FG BOM rule engine.
     * Condition: Source department name contains "FINISHING" and category is "FG".
     */
    public boolean isFgBomTransfer(MouldingBOMRequest request) {
        if (request.getFromDepartmentId() == null || request.getCategory() == null) {
            return false;
        }
        String cat = request.getCategory().trim().toUpperCase();
        if (!"FG".equals(cat)) {
            return false;
        }
        try {
            Department fromDept = departmentService.getDepartmentEntity(request.getFromDepartmentId());
            return fromDept != null && fromDept.getName().toUpperCase().contains("FINISHING");
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Calculate the movement plan for an FG BOM consumption transfer.
     * This produces multiple SOURCE movements (component deductions from Finishing)
     * and one DESTINATION movement (FG addition to destination department).
     */
    @Transactional(readOnly = true)
    public MovementPlan calculateFgMovementPlan(MouldingBOMRequest request) {
        MovementPlan plan = new MovementPlan();
        plan.setValid(true);
        plan.setCategoryClassification("FG_BOM");

        // Validate departments
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

        Department fromDept;
        Department toDept;
        try {
            fromDept = departmentService.getDepartmentEntity(request.getFromDepartmentId());
            toDept = departmentService.getDepartmentEntity(request.getToDepartmentId());
        } catch (Exception e) {
            plan.setValid(false);
            plan.setValidationError("Invalid source or destination department.");
            return plan;
        }
        if (fromDept == null || toDept == null) {
            plan.setValid(false);
            plan.setValidationError("Invalid source or destination department.");
            return plan;
        }

        plan.setSourceDepartmentName(fromDept.getName());
        plan.setDestinationDepartmentName(toDept.getName());

        // Validate quantity
        BigDecimal qty = request.getQuantity();
        if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
            plan.setValid(false);
            plan.setValidationError("Quantity must be greater than zero.");
            return plan;
        }

        // Resolve the selected FG item in master
        Master fgItem = resolveItem(request);
        if (fgItem == null) {
            plan.setValid(false);
            plan.setValidationError("Selected FG item not found in item master.");
            return plan;
        }

        plan.setSelectedItemCode(fgItem.getCode());
        plan.setSelectedCategory("FG");

        // Look up the FG BOM entry by the item's old_code
        Optional<FgBomEntry> bomOpt = fgBomRepository.findByOldCodeIgnoreCase(fgItem.getCode());
        if (bomOpt.isEmpty()) {
            plan.setValid(false);
            plan.setValidationError(String.format(
                    "No FG BOM recipe found for item '%s'. Please configure the BOM in the fg_bom table.",
                    fgItem.getCode()));
            return plan;
        }

        FgBomEntry bom = bomOpt.get();

        // Determine which metal shells are excluded (because their moulded counterpart is also present)
        Set<String> excludedCategories = computeExcludedCategories(bom);

        // Build component deduction movements
        List<String> insufficientItems = new ArrayList<>();

        for (String componentCat : ALL_COMPONENT_CATEGORIES) {
            int ratio = bom.getComponentRatio(componentCat);
            if (ratio <= 0) continue;

            boolean excluded = excludedCategories.contains(componentCat.toUpperCase());
            BigDecimal consumeQty = BigDecimal.valueOf(ratio).multiply(qty);

            // Resolve the component master item: look for item with same code as FG item
            // but in the component's category
            Master componentMaster = resolveComponentItem(fgItem.getCode(), componentCat);

            MovementItem movement = new MovementItem();
            movement.setRole(excluded ? "EXCLUDED" : "SOURCE");
            movement.setDepartmentId(fromDept.getId());
            movement.setDepartmentName(fromDept.getName());
            movement.setCategory(componentCat);
            movement.setQuantityChange(excluded ? BigDecimal.ZERO : consumeQty.negate());
            movement.setUnitOfMeasurement(componentMaster != null ? componentMaster.getUnitOfMeasurement() : "NOS");

            if (componentMaster != null) {
                movement.setMasterId(componentMaster.getId());
                movement.setItemCode(componentMaster.getCode());
                movement.setItemDescription(componentMaster.getDescription());

                BigDecimal currentBal = inventoryTransactionService.getDepartmentClosingBalance(
                        componentMaster.getId(), componentCat, fromDept.getId());
                movement.setAvailableBalanceBefore(currentBal);

                if (excluded) {
                    movement.setAvailableBalanceAfter(currentBal);
                    movement.setNote("🔒 Excluded: Covered by " + METAL_SHELL_TO_MOULDED.getOrDefault(componentCat.toUpperCase(), "Moulded counterpart"));
                } else {
                    movement.setAvailableBalanceAfter(currentBal.subtract(consumeQty));
                    movement.setNote(String.format("Deduct %s × %d = %s of %s [%s] from %s",
                            qty, ratio, consumeQty, componentMaster.getCode(), componentCat, fromDept.getName()));

                    // Validate stock
                    if (currentBal.compareTo(consumeQty) < 0) {
                        insufficientItems.add(String.format("%s [%s]: need %s, have %s",
                                componentMaster.getCode(), componentCat, consumeQty, currentBal));
                    }
                }
            } else {
                // Component master not found — warn but allow if excluded
                movement.setMasterId(null);
                movement.setItemCode(fgItem.getCode());
                movement.setItemDescription("Component not found in master");
                movement.setAvailableBalanceBefore(BigDecimal.ZERO);
                movement.setAvailableBalanceAfter(BigDecimal.ZERO);

                if (excluded) {
                    movement.setNote("🔒 Excluded (component not in master)");
                } else {
                    movement.setNote("⚠️ Component " + fgItem.getCode() + " [" + componentCat + "] not found in master");
                    insufficientItems.add(String.format("%s [%s]: component not configured in master",
                            fgItem.getCode(), componentCat));
                }
            }

            plan.getMovements().add(movement);
        }

        // Add DESTINATION movement: +Q of FG item to destination department
        BigDecimal destBal = inventoryTransactionService.getDepartmentClosingBalance(
                fgItem.getId(), "FG", toDept.getId());

        MovementItem destMovement = new MovementItem();
        destMovement.setRole("DESTINATION");
        destMovement.setDepartmentId(toDept.getId());
        destMovement.setDepartmentName(toDept.getName());
        destMovement.setMasterId(fgItem.getId());
        destMovement.setItemCode(fgItem.getCode());
        destMovement.setItemDescription(fgItem.getDescription());
        destMovement.setCategory("FG");
        destMovement.setQuantityChange(qty);
        destMovement.setAvailableBalanceBefore(destBal);
        destMovement.setAvailableBalanceAfter(destBal.add(qty));
        destMovement.setUnitOfMeasurement(fgItem.getUnitOfMeasurement());
        destMovement.setNote("Add " + qty + " × FG item (" + fgItem.getCode() + ") to " + toDept.getName());
        plan.getMovements().add(destMovement);

        // Set validation error if any component has insufficient stock
        if (!insufficientItems.isEmpty()) {
            plan.setValid(false);
            plan.setValidationError("Insufficient stock for FG BOM components:\n• " +
                    String.join("\n• ", insufficientItems));
        }

        return plan;
    }

    /**
     * Computes which metal shell categories should be excluded because their
     * moulded counterpart is also present in the BOM.
     */
    private Set<String> computeExcludedCategories(FgBomEntry bom) {
        Set<String> excluded = new HashSet<>();

        // OUTER METAL SHELL excluded if OUTER MOULDED >= 1
        if (bom.getComponentRatio("OUTER METAL SHELL") > 0 && bom.getComponentRatio("OUTER MOULDED") > 0) {
            excluded.add("OUTER METAL SHELL");
        }
        // INNER METAL SHELL excluded if INNER MOULDED >= 1
        if (bom.getComponentRatio("INNER METAL SHELL") > 0 && bom.getComponentRatio("INNER MOULDED") > 0) {
            excluded.add("INNER METAL SHELL");
        }
        // MIDDLE METAL SHELL excluded if MIDDLE MOULDED >= 1
        if (bom.getComponentRatio("MIDDLE METAL SHELL") > 0 && bom.getComponentRatio("MIDDLE MOULDED") > 0) {
            excluded.add("MIDDLE METAL SHELL");
        }

        return excluded;
    }

    /**
     * Resolves the component item in the master table.
     * Looks for master item with the given oldCode + category combination.
     * Falls back to searching by code alone if category-specific search fails.
     */
    private Master resolveComponentItem(String fgOldCode, String componentCategory) {
        // Strategy 1: Direct code match — the master item typically has code = oldCode
        // and category = componentCategory
        List<Master> candidates = masterRepository.findByCategoryIgnoreCase(componentCategory);
        for (Master m : candidates) {
            // Check if code matches the FG item's code
            if (m.getCode().equalsIgnoreCase(fgOldCode)) {
                return m;
            }
        }

        // Strategy 2: Code starts with the oldCode prefix (e.g., "103" -> "103::OUTER METAL SHELL")
        // In style-B items, the code might be "103" with category set to different values
        Optional<Master> byCode = masterRepository.findByCodeIgnoreCase(fgOldCode);
        if (byCode.isPresent()) {
            // The same master item might serve multiple categories (Style B)
            return byCode.get();
        }

        return null;
    }

    /**
     * Resolves the selected master item from the request.
     */
    private Master resolveItem(MouldingBOMRequest request) {
        if (request.getMasterId() != null) {
            return masterRepository.findById(request.getMasterId()).orElse(null);
        }
        if (request.getItemCode() != null && !request.getItemCode().isBlank()) {
            return masterRepository.findByCodeIgnoreCase(request.getItemCode().trim()).orElse(null);
        }
        return null;
    }

    /**
     * Gets the FG BOM entry for display in the UI.
     */
    @Transactional(readOnly = true)
    public FgBomEntry getFgBomByCode(String code) {
        return fgBomRepository.findByOldCodeIgnoreCase(code).orElse(null);
    }

    /**
     * Gets all FG BOM entries.
     */
    @Transactional(readOnly = true)
    public List<FgBomEntry> getAllFgBom() {
        return fgBomRepository.findByBomCountGreaterThan(0);
    }

    /**
     * Returns all component categories defined in the BOM schema.
     */
    public static List<String> getAllComponentCategories() {
        return ALL_COMPONENT_CATEGORIES;
    }
}
