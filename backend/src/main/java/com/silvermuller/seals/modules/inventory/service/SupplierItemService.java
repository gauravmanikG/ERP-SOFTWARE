package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.modules.inventory.model.SupplierItem;
import com.silvermuller.seals.modules.inventory.repository.SupplierItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SupplierItemService {

    private final SupplierItemRepository supplierItemRepository;

    public SupplierItemService(SupplierItemRepository supplierItemRepository) {
        this.supplierItemRepository = supplierItemRepository;
    }

    public void addItemToSupplier(Long supplierId, Long itemId) {
        if (supplierItemRepository.findBySupplierIdAndItemId(supplierId, itemId).isEmpty()) {
            SupplierItem supplierItem = new SupplierItem(supplierId, itemId);
            supplierItemRepository.save(supplierItem);
        }
    }

    public void removeItemFromSupplier(Long supplierId, Long itemId) {
        supplierItemRepository.deleteBySupplierIdAndItemId(supplierId, itemId);
    }

    public List<Long> getItemIdsBySupplierId(Long supplierId) {
        return supplierItemRepository.findBySupplierId(supplierId)
                .stream()
                .map(SupplierItem::getItemId)
                .collect(Collectors.toList());
    }

    public void setItemsForSupplier(Long supplierId, List<Long> itemIds) {
        List<SupplierItem> existingItems = supplierItemRepository.findBySupplierId(supplierId);

        // Remove items not in the new list
        for (SupplierItem item : existingItems) {
            if (!itemIds.contains(item.getItemId())) {
                supplierItemRepository.delete(item);
            }
        }

        // Add new items
        for (Long itemId : itemIds) {
            addItemToSupplier(supplierId, itemId);
        }
    }

    public List<Long> getSupplierIdsByItemId(Long itemId) {
        return supplierItemRepository.findByItemId(itemId)
                .stream()
                .map(SupplierItem::getSupplierId)
                .collect(Collectors.toList());
    }
}
