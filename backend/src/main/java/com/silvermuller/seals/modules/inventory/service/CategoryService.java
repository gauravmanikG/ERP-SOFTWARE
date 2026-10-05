package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.CreateCategoryRequest;
import com.silvermuller.seals.modules.inventory.model.CategoryMaster;
import com.silvermuller.seals.modules.inventory.model.InventoryTransaction;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.model.OpeningBalance;
import com.silvermuller.seals.modules.inventory.repository.CategoryMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.InventoryTransactionRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.repository.OpeningBalanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryMasterRepository categoryMasterRepository;
    private final MasterRepository masterRepository;
    private final OpeningBalanceRepository openingBalanceRepository;
    private final InventoryTransactionRepository transactionRepository;

    public CategoryService(
            CategoryMasterRepository categoryMasterRepository,
            MasterRepository masterRepository,
            OpeningBalanceRepository openingBalanceRepository,
            InventoryTransactionRepository transactionRepository) {
        this.categoryMasterRepository = categoryMasterRepository;
        this.masterRepository = masterRepository;
        this.openingBalanceRepository = openingBalanceRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<CategoryMaster> getAll() {
        return categoryMasterRepository.findAllByOrderByIdAsc();
    }

    @Transactional
    public CategoryMaster create(CreateCategoryRequest body) {
        String name = body.getCategoryName().trim();
        if (categoryMasterRepository.findByCategoryNameIgnoreCase(name).isPresent()) {
            throw new IllegalArgumentException("A category named '" + name + "' already exists. Use it when adding an item.");
        }
        String bom = body.getBomConsumption() == null ? "" : body.getBomConsumption().trim();
        String code = body.getCategoryCode() == null ? "" : body.getCategoryCode().trim();
        String shortCode = body.getShortCode() == null ? "" : body.getShortCode().trim();
        return categoryMasterRepository.save(new CategoryMaster(name, bom, code, shortCode));
    }

    public Map<String, Object> usage(Long id) {
        CategoryMaster category = categoryMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
        return usageFor(category);
    }

    @Transactional
    public void delete(Long id) {
        CategoryMaster category = categoryMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
        String name = category.getCategoryName();
        long transactions = transactionRepository.countByCategoryIgnoreCase(name);
        if (transactions > 0) {
            throw new IllegalArgumentException(
                    "Cannot delete '" + name + "' because " + transactions
                            + " inventory transaction(s) still use it. Reverse or remove those movements first.");
        }

        Set<String> itemCodes = new LinkedHashSet<>();
        for (OpeningBalance ob : openingBalanceRepository.findByCategoryNameIgnoreCase(name)) {
            if (ob.getItemCode() != null && !ob.getItemCode().isBlank()) {
                itemCodes.add(ob.getItemCode().trim());
            }
        }
        for (Master master : masterRepository.findByCategoryIgnoreCase(name)) {
            if (master.getCode() != null && !master.getCode().isBlank()) {
                itemCodes.add(master.getCode().trim());
            }
        }

        openingBalanceRepository.deleteByCategoryNameIgnoreCase(name);

        for (String code : itemCodes) {
            masterRepository.findByCodeIgnoreCase(code).ifPresent(this::retargetOrDeleteMaster);
        }

        categoryMasterRepository.delete(category);
    }

    private void retargetOrDeleteMaster(Master master) {
        List<OpeningBalance> rest = openingBalanceRepository.findByItemCodeIgnoreCase(master.getCode());
        List<InventoryTransaction> itemTxs =
                transactionRepository.findByMasterIdOrderByTransactionDateAscIdAsc(master.getId());
        if (rest.isEmpty() && itemTxs.isEmpty()) {
            masterRepository.delete(master);
            return;
        }
        BigDecimal total = rest.stream()
                .map(ob -> ob.getOpeningBalance() == null ? BigDecimal.ZERO : ob.getOpeningBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        master.setOpeningBalance(total);
        if (!rest.isEmpty()) {
            master.setCategory(rest.get(0).getCategoryName());
            if (rest.get(0).getDepartmentName() != null && !rest.get(0).getDepartmentName().isBlank()) {
                master.setStoreName(rest.get(0).getDepartmentName());
            }
        } else {
            String fromTx = itemTxs.stream()
                    .map(InventoryTransaction::getCategory)
                    .filter(c -> c != null && !c.isBlank())
                    .findFirst()
                    .orElse("General");
            master.setCategory(fromTx);
        }
        masterRepository.save(master);
    }

    private Map<String, Object> usageFor(CategoryMaster category) {
        String name = category.getCategoryName();
        long masters = masterRepository.countByCategoryIgnoreCase(name);
        long openings = openingBalanceRepository.countByCategoryNameIgnoreCase(name);
        long transactions = transactionRepository.countByCategoryIgnoreCase(name);
        boolean canDelete = transactions == 0;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", category.getId());
        body.put("categoryName", name);
        body.put("masterCount", masters);
        body.put("openingCount", openings);
        body.put("transactionCount", transactions);
        body.put("canDelete", canDelete);
        if (!canDelete) {
            body.put("message", "Cannot delete '" + name + "' because " + transactions
                    + " inventory transaction(s) still use it. Reverse or remove those movements first.");
        } else if (masters > 0 || openings > 0) {
            body.put("message", "'" + name + "' has " + masters + " item(s) and " + openings
                    + " opening balance(s), and no inventory movements. Delete will remove those openings for this category. Items that only existed in this category (no movements) will also be removed.");
        } else {
            body.put("message", "'" + name + "' is not used. It can be deleted.");
        }
        return body;
    }
}
