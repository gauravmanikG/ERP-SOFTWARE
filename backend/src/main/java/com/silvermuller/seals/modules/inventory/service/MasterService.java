package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.CreateMasterItemRequest;
import com.silvermuller.seals.modules.inventory.dto.ItemEditDetailResponse;
import com.silvermuller.seals.modules.inventory.dto.MasterResponse;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.repository.CategoryMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.DepartmentMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class MasterService {

    private final MasterRepository masterRepository;
    private final CategoryMasterRepository categoryMasterRepository;

    public MasterService(
            MasterRepository masterRepository,
            CategoryMasterRepository categoryMasterRepository) {
        this.masterRepository = masterRepository;
        this.categoryMasterRepository = categoryMasterRepository;
    }

    public List<MasterResponse> getAllMasterWithStock() {
        return masterRepository.findAllByOrderByIdAsc().stream()
                .map(this::toLiteResponse)
                .toList();
    }

    public MasterResponse getMasterStockById(Long id) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        return buildMasterResponse(master);
    }

    public Master getMasterEntity(Long id) {
        return masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
    }

    @Transactional
    public MasterResponse createItem(CreateMasterItemRequest request) {
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

        Master master = new Master();
        master.setCode(code);
        master.setDescription(storedDescription);
        master.setCategory(category);
        master.setUnitOfMeasurement(uom);
        master.setStoreName("Store");
        Master saved = masterRepository.save(master);

        return toLiteResponse(saved);
    }

    @Transactional
    public ItemEditDetailResponse updateItem(Long id, CreateMasterItemRequest request) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));

        String categoryReq = request.getCategory().trim();
        String category = categoryMasterRepository.findByCategoryNameIgnoreCase(categoryReq)
                .map(c -> c.getCategoryName())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Category '" + categoryReq + "' is not in category_master."));

        String itemName = request.getItemName().trim();
        String extraDesc = request.getDescription() == null ? "" : request.getDescription().trim();
        String storedDescription = extraDesc.isBlank() || extraDesc.equalsIgnoreCase(itemName)
                ? itemName
                : itemName + " — " + extraDesc;

        master.setDescription(storedDescription);
        master.setCategory(category);
        master.setUnitOfMeasurement(request.getUnitOfMeasurement().trim());
        Master updated = masterRepository.save(master);

        return toEditResponse(updated);
    }

    @Transactional
    public void deleteItem(Long id) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        masterRepository.delete(master);
    }

    public ItemEditDetailResponse getItemForEdit(Long id) {
        return getItemForEdit(id, null);
    }

    public ItemEditDetailResponse getItemForEdit(Long id, String categoryFilter) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        return toEditResponse(master);
    }

    private MasterResponse toLiteResponse(Master master) {
        return new MasterResponse(
                master.getId(),
                master.getCode(),
                master.getDescription(),
                master.getCategory(),
                master.getUnitOfMeasurement(),
                master.getStoreName()
        );
    }

    private MasterResponse buildMasterResponse(Master master) {
        return toLiteResponse(master);
    }

    private ItemEditDetailResponse toEditResponse(Master master) {
        ItemEditDetailResponse resp = new ItemEditDetailResponse();
        resp.setId(master.getId());
        resp.setItemCode(master.getCode());
        resp.setItemName(master.getDescription());
        resp.setDescription(master.getDescription());
        resp.setCategory(master.getCategory());
        resp.setUnitOfMeasurement(master.getUnitOfMeasurement());
        resp.setAvailableCategories(categoryMasterRepository.findAllByOrderByIdAsc().stream()
                .map(c -> c.getCategoryName())
                .toList());
        return resp;
    }
}
