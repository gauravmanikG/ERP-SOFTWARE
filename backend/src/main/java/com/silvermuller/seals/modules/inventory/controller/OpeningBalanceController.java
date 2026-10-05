package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.CreateOpeningBalanceRequest;
import com.silvermuller.seals.modules.inventory.model.OpeningBalance;
import com.silvermuller.seals.modules.inventory.repository.OpeningBalanceRepository;
import com.silvermuller.seals.modules.inventory.service.MasterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/inventory/opening-balances")
public class OpeningBalanceController {

    private final OpeningBalanceRepository openingBalanceRepository;
    private final MasterService masterService;

    public OpeningBalanceController(OpeningBalanceRepository openingBalanceRepository, MasterService masterService) {
        this.openingBalanceRepository = openingBalanceRepository;
        this.masterService = masterService;
    }

    @GetMapping
    public ResponseEntity<List<OpeningBalance>> getAllOpeningBalances(
            @RequestParam(value = "itemCode", required = false) String itemCode,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "department", required = false) String department) {
        if (itemCode != null && !itemCode.isBlank() && category != null && !category.isBlank()) {
            return ResponseEntity.ok(openingBalanceRepository.findByItemCodeIgnoreCaseAndCategoryNameIgnoreCase(
                    itemCode.trim(), category.trim()));
        }
        if (itemCode != null && !itemCode.isBlank()) {
            return ResponseEntity.ok(openingBalanceRepository.findByItemCodeIgnoreCase(itemCode.trim()));
        }
        if (department != null && !department.isBlank()) {
            return ResponseEntity.ok(openingBalanceRepository.findByDepartmentNameIgnoreCase(department.trim()));
        }
        return ResponseEntity.ok(openingBalanceRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<OpeningBalance> addOpeningBalance(@Valid @RequestBody CreateOpeningBalanceRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterService.addDepartmentOpening(body));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, String>> removeOpeningBalance(
            @RequestParam("itemCode") String itemCode,
            @RequestParam("category") String category,
            @RequestParam("department") String department) {
        masterService.removeDepartmentOpening(itemCode, category, department);
        return ResponseEntity.ok(Map.of("message", "Item removed from this department."));
    }

    @GetMapping("/categories-for-item")
    public ResponseEntity<List<String>> getCategoriesForItem(@RequestParam("code") String code) {
        List<OpeningBalance> records = openingBalanceRepository.findByItemCodeIgnoreCase(code.trim());
        List<String> categories = new ArrayList<>();
        for (OpeningBalance ob : records) {
            if (!categories.contains(ob.getCategoryName())) {
                categories.add(ob.getCategoryName());
            }
        }
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getBalance(
            @RequestParam("code") String code,
            @RequestParam("category") String category,
            @RequestParam(value = "department", required = false) String department) {

        String deptName = (department != null && !department.isBlank()) ? department.trim() : "Store";

        List<OpeningBalance> list = openingBalanceRepository.findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
                code.trim(), category.trim(), deptName);

        if (list.isEmpty()) {
            list = openingBalanceRepository.findByItemCodeIgnoreCaseAndCategoryNameIgnoreCase(
                    code.trim(), category.trim());
        }

        BigDecimal bal = list.isEmpty() ? BigDecimal.ZERO : list.get(0).getOpeningBalance();

        Map<String, Object> resp = new HashMap<>();
        resp.put("itemCode", code);
        resp.put("categoryName", category);
        resp.put("departmentName", deptName);
        resp.put("openingBalance", bal);
        resp.put("existsInMaster", !list.isEmpty());

        return ResponseEntity.ok(resp);
    }
}
