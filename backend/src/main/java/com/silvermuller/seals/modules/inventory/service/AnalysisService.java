package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.InvalidTransactionException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.DepartmentStockResponse;
import com.silvermuller.seals.modules.inventory.dto.DepartmentStockResponse.ItemRow;
import com.silvermuller.seals.modules.inventory.dto.DepartmentWiseCbResponse;
import com.silvermuller.seals.modules.inventory.dto.DepartmentWiseCbResponse.DepartmentBalanceRow;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.DepartmentMaster;
import com.silvermuller.seals.modules.inventory.model.InventoryTransaction;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.model.OpeningBalance;
import com.silvermuller.seals.modules.inventory.repository.DepartmentMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.InventoryTransactionRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.repository.OpeningBalanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class AnalysisService {

    private final MasterRepository masterRepository;
    private final DepartmentMasterRepository departmentMasterRepository;
    private final DepartmentService departmentService;
    private final OpeningBalanceRepository openingBalanceRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final InventoryTransactionService transactionService;

    public AnalysisService(
            MasterRepository masterRepository,
            DepartmentMasterRepository departmentMasterRepository,
            DepartmentService departmentService,
            OpeningBalanceRepository openingBalanceRepository,
            InventoryTransactionRepository transactionRepository,
            InventoryTransactionService transactionService) {
        this.masterRepository = masterRepository;
        this.departmentMasterRepository = departmentMasterRepository;
        this.departmentService = departmentService;
        this.openingBalanceRepository = openingBalanceRepository;
        this.transactionRepository = transactionRepository;
        this.transactionService = transactionService;
    }

    public DepartmentWiseCbResponse getDepartmentWiseCb(String itemCode, String category) {
        if (itemCode == null || itemCode.isBlank()) {
            throw new InvalidTransactionException("Item code is required.");
        }
        if (category == null || category.isBlank()) {
            throw new InvalidTransactionException("Category is required.");
        }

        String code = itemCode.trim();
        String cat = category.trim();

        Master master = masterRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Item code not found: " + code));

        List<DepartmentMaster> deptMasters = departmentMasterRepository.findAllByOrderByProcessSequenceAsc();

        DepartmentWiseCbResponse resp = new DepartmentWiseCbResponse();
        resp.setItemCode(master.getCode());
        resp.setDescription(master.getDescription());
        resp.setCategory(cat);
        resp.setUnitOfMeasurement(master.getUnitOfMeasurement());

        BigDecimal totalOpen = BigDecimal.ZERO;
        BigDecimal totalClose = BigDecimal.ZERO;
        List<DepartmentBalanceRow> rows = new ArrayList<>();

        for (DepartmentMaster dm : deptMasters) {
            String deptName = dm.getDepartmentName();
            BigDecimal opening = BigDecimal.ZERO;
            List<OpeningBalance> ob = openingBalanceRepository
                    .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
                            master.getCode(), cat, deptName);
            if (!ob.isEmpty() && ob.get(0).getOpeningBalance() != null) {
                opening = ob.get(0).getOpeningBalance();
            }

            BigDecimal closing = transactionService.getDepartmentClosingBalance(
                    master.getId(), cat, dm.getId());

            if (opening.compareTo(BigDecimal.ZERO) <= 0 && closing.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            rows.add(new DepartmentBalanceRow(deptName, opening, closing));
            totalOpen = totalOpen.add(opening);
            totalClose = totalClose.add(closing);
        }

        resp.setDepartments(rows);
        resp.setTotalOpening(totalOpen);
        resp.setTotalClosing(totalClose);
        return resp;
    }

    public DepartmentStockResponse getStockByDepartment(Long departmentId) {
        if (departmentId == null) {
            throw new InvalidTransactionException("Department is required.");
        }
        DepartmentMaster dm = departmentMasterRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + departmentId));
        Department liveDept = departmentService.getDepartmentEntity(departmentId);
        String deptName = dm.getDepartmentName();

        Map<String, OpeningBalance> openingByKey = new LinkedHashMap<>();
        for (OpeningBalance ob : openingBalanceRepository.findByDepartmentNameIgnoreCase(deptName)) {
            String key = itemCatKey(ob.getItemCode(), ob.getCategoryName());
            openingByKey.put(key, ob);
        }

        Map<String, String> categoryByKey = new LinkedHashMap<>();
        Map<String, Master> masterByKey = new LinkedHashMap<>();
        for (OpeningBalance ob : openingByKey.values()) {
            String key = itemCatKey(ob.getItemCode(), ob.getCategoryName());
            categoryByKey.put(key, ob.getCategoryName());
            masterRepository.findByCodeIgnoreCase(ob.getItemCode().trim())
                    .ifPresent(m -> masterByKey.put(key, m));
        }

        List<InventoryTransaction> txs = transactionRepository
                .findByFromDepartment_IdOrToDepartment_Id(liveDept.getId(), liveDept.getId());
        for (InventoryTransaction tx : txs) {
            Master m = tx.getMaster();
            String cat = (tx.getCategory() != null && !tx.getCategory().isBlank())
                    ? tx.getCategory().trim()
                    : (m.getCategory() != null ? m.getCategory().trim() : "");
            String key = itemCatKey(m.getCode(), cat);
            masterByKey.putIfAbsent(key, m);
            categoryByKey.putIfAbsent(key, cat);
        }

        DepartmentStockResponse resp = new DepartmentStockResponse();
        resp.setDepartmentId(departmentId);
        resp.setDepartmentName(deptName);

        List<ItemRow> rows = new ArrayList<>();
        BigDecimal totalOpen = BigDecimal.ZERO;
        BigDecimal totalQty = BigDecimal.ZERO;

        for (Map.Entry<String, Master> entry : masterByKey.entrySet()) {
            String key = entry.getKey();
            Master master = entry.getValue();
            String cat = categoryByKey.getOrDefault(key, "");
            OpeningBalance ob = openingByKey.get(key);
            BigDecimal opening = (ob != null && ob.getOpeningBalance() != null) ? ob.getOpeningBalance() : BigDecimal.ZERO;
            BigDecimal closing = transactionService.getDepartmentClosingBalance(
                    master.getId(), cat, departmentId);

            if (closing.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            rows.add(new ItemRow(
                    master.getCode(),
                    master.getDescription(),
                    cat,
                    master.getUnitOfMeasurement(),
                    opening,
                    closing
            ));
            totalOpen = totalOpen.add(opening);
            totalQty = totalQty.add(closing);
        }

        rows.sort(Comparator
                .comparing((ItemRow r) -> r.getItemCode() == null ? "" : r.getItemCode(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(r -> r.getCategory() == null ? "" : r.getCategory(), String.CASE_INSENSITIVE_ORDER));

        resp.setItems(rows);
        resp.setTotalOpening(totalOpen);
        resp.setTotalQuantity(totalQty);
        return resp;
    }

    private static String itemCatKey(String itemCode, String category) {
        String code = itemCode == null ? "" : itemCode.trim();
        String cat = category == null ? "" : category.trim();
        return (code + "::" + cat).toLowerCase(Locale.ROOT);
    }
}
