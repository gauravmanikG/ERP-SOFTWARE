package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.CreateMasterItemRequest;
import com.silvermuller.seals.modules.inventory.dto.CreateOpeningBalanceRequest;
import com.silvermuller.seals.modules.inventory.dto.DepartmentOpeningLine;
import com.silvermuller.seals.modules.inventory.dto.ItemEditDetailResponse;
import com.silvermuller.seals.modules.inventory.dto.MasterStockResponse;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.DepartmentMaster;
import com.silvermuller.seals.modules.inventory.model.InventoryTransaction;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.model.OpeningBalance;
import com.silvermuller.seals.modules.inventory.repository.CategoryMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.DepartmentMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.InventoryTransactionRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.repository.OpeningBalanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class MasterService {

    private final MasterRepository masterRepository;
    private final DepartmentRepository departmentRepository;
    private final InventoryTransactionService transactionService;
    private final CategoryMasterRepository categoryMasterRepository;
    private final OpeningBalanceRepository openingBalanceRepository;
    private final DepartmentMasterRepository departmentMasterRepository;
    private final InventoryTransactionRepository transactionRepository;

    public MasterService(
            MasterRepository masterRepository,
            DepartmentRepository departmentRepository,
            InventoryTransactionService transactionService,
            CategoryMasterRepository categoryMasterRepository,
            OpeningBalanceRepository openingBalanceRepository,
            DepartmentMasterRepository departmentMasterRepository,
            InventoryTransactionRepository transactionRepository) {
        this.masterRepository = masterRepository;
        this.departmentRepository = departmentRepository;
        this.transactionService = transactionService;
        this.categoryMasterRepository = categoryMasterRepository;
        this.openingBalanceRepository = openingBalanceRepository;
        this.departmentMasterRepository = departmentMasterRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<MasterStockResponse> getAllMasterWithStock() {
        return masterRepository.findAllByOrderByIdAsc().stream()
                .map(this::toLiteResponse)
                .toList();
    }

    public MasterStockResponse getMasterStockById(Long id) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        List<Department> departments = departmentRepository.findAll();
        return buildMasterResponse(master, departments);
    }

    public Master getMasterEntity(Long id) {
        return masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
    }

    @Transactional
    public MasterStockResponse createItem(CreateMasterItemRequest request) {
        String code = request.getItemCode().trim().toUpperCase();
        String itemName = request.getItemName().trim();
        String extraDesc = request.getDescription() == null ? "" : request.getDescription().trim();
        String storedDescription = extraDesc.isBlank() || extraDesc.equalsIgnoreCase(itemName)
                ? itemName
                : itemName + " — " + extraDesc;
        String categoryReq = request.getCategory().trim();
        String uom = request.getUnitOfMeasurement().trim();

        String category = categoryMasterRepository.findByCategoryNameIgnoreCase(categoryReq)
                .map(c -> c.getCategoryName())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Category '" + categoryReq + "' is not in category_master. Create the category first, then add the item."));

        if (masterRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("Item code '" + code + "' already exists in material master.");
        }

        if (request.getDepartmentOpenings() == null || request.getDepartmentOpenings().isEmpty()) {
            throw new IllegalArgumentException("Add at least one department opening balance.");
        }

        java.util.Set<String> seenDepts = new java.util.HashSet<>();
        BigDecimal totalOpening = BigDecimal.ZERO;
        String firstDept = null;
        for (DepartmentOpeningLine line : request.getDepartmentOpenings()) {
            String deptName = line.getDepartmentName() == null ? "" : line.getDepartmentName().trim();
            if (deptName.isBlank()) {
                throw new IllegalArgumentException("Department is required on each opening-balance row.");
            }
            String deptKey = deptName.toLowerCase();
            if (!seenDepts.add(deptKey)) {
                throw new IllegalArgumentException("Department '" + deptName + "' is listed more than once.");
            }
            ensureLiveDepartment(deptName);
            BigDecimal qty = line.getOpeningBalance() == null ? BigDecimal.ZERO : line.getOpeningBalance();
            if (qty.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Opening balance cannot be negative for " + deptName);
            }
            totalOpening = totalOpening.add(qty);
            if (firstDept == null) {
                firstDept = deptName;
            }
        }

        Master master = new Master(code, storedDescription, category, uom, totalOpening, firstDept);
        Master saved = masterRepository.save(master);

        for (DepartmentOpeningLine line : request.getDepartmentOpenings()) {
            saveOpeningRow(code, category, line.getDepartmentName().trim(), line.getOpeningBalance());
        }

        return toLiteResponse(saved);
    }

    @Transactional
    public OpeningBalance addDepartmentOpening(CreateOpeningBalanceRequest request) {
        String code = request.getItemCode().trim().toUpperCase();
        Master master = masterRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new IllegalArgumentException("Item code '" + code + "' was not found. Save the item first."));

        String category = categoryMasterRepository.findByCategoryNameIgnoreCase(request.getCategory().trim())
                .map(c -> c.getCategoryName())
                .orElseThrow(() -> new IllegalArgumentException("Category is not in category_master."));

        String deptName = ensureLiveDepartment(request.getDepartmentName());

        List<OpeningBalance> existing = openingBalanceRepository
                .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(code, category, deptName);
        if (!existing.isEmpty()) {
            throw new IllegalArgumentException("Opening balance for " + code + " / " + category + " in '" + deptName + "' already exists.");
        }

        OpeningBalance saved = saveOpeningRow(code, category, deptName, request.getOpeningBalance());
        BigDecimal newTotal = master.getOpeningBalance() == null ? BigDecimal.ZERO : master.getOpeningBalance();
        newTotal = newTotal.add(request.getOpeningBalance() == null ? BigDecimal.ZERO : request.getOpeningBalance());
        master.setOpeningBalance(newTotal);
        masterRepository.save(master);
        return saved;
    }

    @Transactional
    public void removeDepartmentOpening(String itemCode, String category, String departmentName) {
        String code = itemCode == null ? "" : itemCode.trim().toUpperCase();
        String cat = categoryMasterRepository.findByCategoryNameIgnoreCase(category == null ? "" : category.trim())
                .map(c -> c.getCategoryName())
                .orElseThrow(() -> new IllegalArgumentException("Category is not in category_master."));
        String dept = departmentName == null ? "" : departmentName.trim();
        List<OpeningBalance> existing = openingBalanceRepository
                .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(code, cat, dept);
        if (existing.isEmpty()) {
            throw new IllegalArgumentException("That item + category is not assigned to department '" + dept + "'.");
        }
        BigDecimal removed = existing.stream()
                .map(ob -> ob.getOpeningBalance() == null ? BigDecimal.ZERO : ob.getOpeningBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        openingBalanceRepository.deleteByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(code, cat, dept);
        masterRepository.findByCodeIgnoreCase(code).ifPresent(master -> {
            BigDecimal total = master.getOpeningBalance() == null ? BigDecimal.ZERO : master.getOpeningBalance();
            BigDecimal next = total.subtract(removed);
            master.setOpeningBalance(next.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : next);
            masterRepository.save(master);
        });
    }

    private String ensureLiveDepartment(String deptName) {
        String trimmed = deptName == null ? "" : deptName.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("Department is required.");
        }
        java.util.Optional<Department> live = departmentRepository.findByNameIgnoreCase(trimmed);
        if (live.isPresent()) {
            return live.get().getName();
        }
        DepartmentMaster master = departmentMasterRepository.findByDepartmentNameIgnoreCase(trimmed)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Department '" + trimmed + "' was not found. Add it in Settings first."));
        Department created = new Department();
        created.setName(master.getDepartmentName());
        return departmentRepository.save(created).getName();
    }

    private OpeningBalance saveOpeningRow(String code, String category, String deptName, BigDecimal qty) {
        BigDecimal opening = qty == null ? BigDecimal.ZERO : qty;
        String mainCode = code + "::" + category + "::" + deptName;
        if (!openingBalanceRepository.findByMainCode(mainCode).isEmpty()) {
            throw new IllegalArgumentException("Opening balance already exists for " + deptName);
        }
        return openingBalanceRepository.save(new OpeningBalance(mainCode, code, category, deptName, opening));
    }

    public ItemEditDetailResponse getItemForEdit(Long id) {
        return getItemForEdit(id, null);
    }

    public ItemEditDetailResponse getItemForEdit(Long id, String categoryFilter) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        ItemEditDetailResponse resp = new ItemEditDetailResponse();
        resp.setId(master.getId());
        resp.setItemCode(master.getCode());
        String desc = master.getDescription() == null ? "" : master.getDescription();
        int sep = desc.indexOf(" — ");
        resp.setItemName(sep > 0 ? desc.substring(0, sep) : desc);
        resp.setDescription(sep > 0 ? desc.substring(sep + 3) : desc);
        resp.setUnitOfMeasurement(master.getUnitOfMeasurement());

        java.util.LinkedHashSet<String> cats = new java.util.LinkedHashSet<>();
        if (master.getCategory() != null && !master.getCategory().isBlank()) {
            cats.add(master.getCategory().trim());
        }
        for (OpeningBalance ob : openingBalanceRepository.findByItemCodeIgnoreCase(master.getCode())) {
            if (ob.getCategoryName() != null && !ob.getCategoryName().isBlank()) {
                cats.add(ob.getCategoryName().trim());
            }
        }
        for (InventoryTransaction tx : transactionRepository.findByMasterIdOrderByTransactionDateAscIdAsc(master.getId())) {
            String txCat = tx.getCategory() == null || tx.getCategory().isBlank()
                    ? master.getCategory()
                    : tx.getCategory().trim();
            if (txCat != null && !txCat.isBlank()) {
                cats.add(txCat);
            }
        }
        resp.setAvailableCategories(new java.util.ArrayList<>(cats));

        String cat = categoryFilter == null || categoryFilter.isBlank()
                ? master.getCategory()
                : categoryFilter.trim();
        resp.setCategory(cat);

        java.util.Map<String, OpeningBalance> obByDept = new java.util.LinkedHashMap<>();
        if (cat != null && !cat.isBlank()) {
            for (OpeningBalance ob : openingBalanceRepository
                    .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCase(master.getCode(), cat)) {
                if (ob.getDepartmentName() == null) {
                    continue;
                }
                obByDept.putIfAbsent(ob.getDepartmentName().trim().toLowerCase(), ob);
            }
        }

        List<DepartmentOpeningLine> lines = new java.util.ArrayList<>();
        java.util.Set<String> listed = new java.util.HashSet<>();
        for (DepartmentMaster dm : departmentMasterRepository.findAllByOrderByProcessSequenceAsc()) {
            String deptName = dm.getDepartmentName();
            OpeningBalance ob = obByDept.get(deptName.trim().toLowerCase());
            BigDecimal opening = (ob != null && ob.getOpeningBalance() != null) ? ob.getOpeningBalance() : BigDecimal.ZERO;
            BigDecimal cb = cat == null || cat.isBlank()
                    ? BigDecimal.ZERO
                    : transactionService.getDepartmentClosingBalance(master.getId(), cat, dm.getId());
            boolean hasRow = ob != null;
            if (!hasRow && opening.compareTo(BigDecimal.ZERO) <= 0 && cb.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            DepartmentOpeningLine line = new DepartmentOpeningLine();
            line.setDepartmentName(deptName);
            line.setOpeningBalance(opening);
            line.setClosingBalance(cb);
            lines.add(line);
            listed.add(deptName.trim().toLowerCase());
        }
        for (OpeningBalance ob : obByDept.values()) {
            String key = ob.getDepartmentName().trim().toLowerCase();
            if (listed.contains(key)) {
                continue;
            }
            DepartmentOpeningLine line = new DepartmentOpeningLine();
            line.setDepartmentName(ob.getDepartmentName());
            line.setOpeningBalance(ob.getOpeningBalance() == null ? BigDecimal.ZERO : ob.getOpeningBalance());
            line.setClosingBalance(line.getOpeningBalance());
            lines.add(line);
        }
        resp.setDepartmentOpenings(lines);
        return resp;
    }

    @Transactional
    public ItemEditDetailResponse updateItem(Long id, CreateMasterItemRequest request) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        String oldCode = master.getCode();
        String code = request.getItemCode().trim().toUpperCase();
        if (!oldCode.equalsIgnoreCase(code) && masterRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("Item code '" + code + "' already exists.");
        }
        String category = categoryMasterRepository.findByCategoryNameIgnoreCase(request.getCategory().trim())
                .map(c -> c.getCategoryName())
                .orElseThrow(() -> new IllegalArgumentException("Category is not in category_master."));
        String itemName = request.getItemName().trim();
        String extraDesc = request.getDescription() == null ? "" : request.getDescription().trim();
        String storedDescription = extraDesc.isBlank() || extraDesc.equalsIgnoreCase(itemName)
                ? itemName
                : itemName + " — " + extraDesc;

        java.util.Set<String> seen = new java.util.HashSet<>();
        BigDecimal totalOpening = BigDecimal.ZERO;
        String firstDept = null;
        if (request.getDepartmentOpenings() != null) {
            for (DepartmentOpeningLine line : request.getDepartmentOpenings()) {
                String deptName = line.getDepartmentName() == null ? "" : line.getDepartmentName().trim();
                if (deptName.isBlank()) {
                    throw new IllegalArgumentException("Department is required on each row.");
                }
                if (!seen.add(deptName.toLowerCase())) {
                    throw new IllegalArgumentException("Department '" + deptName + "' is listed more than once.");
                }
                if (departmentRepository.findByNameIgnoreCase(deptName).isEmpty()) {
                    throw new IllegalArgumentException("Department '" + deptName + "' was not found.");
                }
                BigDecimal opening = line.getOpeningBalance() == null ? BigDecimal.ZERO : line.getOpeningBalance();
                if (opening.compareTo(BigDecimal.ZERO) < 0) {
                    throw new IllegalArgumentException("Opening balance cannot be negative for " + deptName);
                }
                line.setOpeningBalance(opening);
                totalOpening = totalOpening.add(opening);
                if (firstDept == null) {
                    firstDept = deptName;
                }
            }
        }

        master.setCode(code);
        master.setDescription(storedDescription);
        master.setUnitOfMeasurement(request.getUnitOfMeasurement().trim());
        if (request.getDepartmentOpenings() != null && !request.getDepartmentOpenings().isEmpty()) {
            master.setOpeningBalance(totalOpening);
            if (firstDept != null) {
                master.setStoreName(firstDept);
            }
        }
        masterRepository.save(master);

        if (request.getDepartmentOpenings() != null && !request.getDepartmentOpenings().isEmpty()) {
            List<OpeningBalance> existing = openingBalanceRepository
                    .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCase(oldCode, category);
            java.util.Set<String> keep = new java.util.HashSet<>();
            for (DepartmentOpeningLine line : request.getDepartmentOpenings()) {
                String deptName = line.getDepartmentName().trim();
                keep.add(deptName.toLowerCase());
                OpeningBalance row = existing.stream()
                        .filter(ob -> ob.getDepartmentName() != null
                                && ob.getDepartmentName().trim().equalsIgnoreCase(deptName))
                        .findFirst()
                        .orElse(null);
                if (row == null) {
                    row = new OpeningBalance();
                }
                row.setItemCode(code);
                row.setCategoryName(category);
                row.setDepartmentName(deptName);
                row.setOpeningBalance(line.getOpeningBalance());
                row.setMainCode(code + "::" + category + "::" + deptName);
                openingBalanceRepository.save(row);
            }
            for (OpeningBalance ob : existing) {
                if (!keep.contains(ob.getDepartmentName().trim().toLowerCase())) {
                    openingBalanceRepository.delete(ob);
                }
            }
        }

        if (!oldCode.equalsIgnoreCase(code)) {
            for (OpeningBalance ob : openingBalanceRepository.findByItemCodeIgnoreCase(oldCode)) {
                ob.setItemCode(code);
                ob.setMainCode(code + "::" + ob.getCategoryName() + "::" + ob.getDepartmentName());
                openingBalanceRepository.save(ob);
            }
        }

        return getItemForEdit(master.getId(), category);
    }

    @Transactional
    public void deleteItem(Long id) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        List<InventoryTransaction> txs = transactionRepository.findByMasterIdOrderByTransactionDateAscIdAsc(id);
        List<Long> txIds = txs.stream().map(InventoryTransaction::getId).toList();
        if (!txIds.isEmpty()) {
            List<InventoryTransaction> pointingAt = transactionRepository.findByReversedTransaction_IdIn(txIds);
            for (InventoryTransaction other : pointingAt) {
                other.setReversedTransaction(null);
            }
            transactionRepository.saveAll(pointingAt);
        }
        for (InventoryTransaction tx : txs) {
            tx.setReversedTransaction(null);
        }
        transactionRepository.saveAll(txs);
        transactionRepository.flush();
        transactionRepository.deleteByMaster_Id(id);
        openingBalanceRepository.deleteByItemCodeIgnoreCase(master.getCode());
        masterRepository.delete(master);
    }

    private MasterStockResponse toLiteResponse(Master master) {
        return new MasterStockResponse(
                master.getId(),
                master.getCode(),
                master.getDescription(),
                master.getCategory(),
                master.getUnitOfMeasurement(),
                master.getOpeningBalance(),
                master.getOpeningBalance(),
                master.getStoreName()
        );
    }

    private MasterStockResponse buildMasterResponse(Master master, List<Department> departments) {
        BigDecimal totalBalance = transactionService.getCurrentBalance(master.getId());
        Map<String, BigDecimal> deptBalances = new HashMap<>();

        for (Department dept : departments) {
            BigDecimal deptBal = transactionService.getDepartmentClosingBalance(master.getId(), dept.getId());
            deptBalances.put(dept.getName(), deptBal);
            deptBalances.put(String.valueOf(dept.getId()), deptBal);
        }

        return new MasterStockResponse(
                master.getId(),
                master.getCode(),
                master.getDescription(),
                master.getCategory(),
                master.getUnitOfMeasurement(),
                master.getOpeningBalance(),
                totalBalance,
                master.getStoreName(),
                deptBalances
        );
    }
}
