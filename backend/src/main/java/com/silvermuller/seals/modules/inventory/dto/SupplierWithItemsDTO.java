package com.silvermuller.seals.modules.inventory.dto;

import java.util.List;

public class SupplierWithItemsDTO {
    private Long supplierId;
    private List<Long> itemIds;

    public SupplierWithItemsDTO() {
    }

    public SupplierWithItemsDTO(Long supplierId, List<Long> itemIds) {
        this.supplierId = supplierId;
        this.itemIds = itemIds;
    }

    public Long getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(Long supplierId) {
        this.supplierId = supplierId;
    }

    public List<Long> getItemIds() {
        return itemIds;
    }

    public void setItemIds(List<Long> itemIds) {
        this.itemIds = itemIds;
    }
}
