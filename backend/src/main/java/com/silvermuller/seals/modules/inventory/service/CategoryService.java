package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.CreateCategoryRequest;
import com.silvermuller.seals.modules.inventory.model.CategoryMaster;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.repository.CategoryMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryMasterRepository categoryMasterRepository;
    private final MasterRepository masterRepository;

    public CategoryService(
            CategoryMasterRepository categoryMasterRepository,
            MasterRepository masterRepository) {
        this.categoryMasterRepository = categoryMasterRepository;
        this.masterRepository = masterRepository;
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

        for (Master master : masterRepository.findByCategoryIgnoreCase(name)) {
            masterRepository.delete(master);
        }

        categoryMasterRepository.delete(category);
    }

    private Map<String, Object> usageFor(CategoryMaster category) {
        String name = category.getCategoryName();
        long masters = masterRepository.countByCategoryIgnoreCase(name);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", category.getId());
        body.put("categoryName", name);
        body.put("masterCount", masters);
        body.put("canDelete", true);
        if (masters > 0) {
            body.put("message", "'" + name + "' has " + masters + " item(s). Delete will remove all items in this category.");
        } else {
            body.put("message", "'" + name + "' is not used. It can be deleted.");
        }
        return body;
    }
}
