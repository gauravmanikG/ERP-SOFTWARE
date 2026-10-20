package com.silvermuller.seals.modules.purchase.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PurchaseCalculationRequest {
    private List<PurchaseItemLine> items = new ArrayList<>();
    private Map<String, VendorExtraCharges> vendorCharges = new HashMap<>();

    public PurchaseCalculationRequest() {}

    public List<PurchaseItemLine> getItems() { return items; }
    public void setItems(List<PurchaseItemLine> items) { this.items = items; }

    public Map<String, VendorExtraCharges> getVendorCharges() { return vendorCharges; }
    public void setVendorCharges(Map<String, VendorExtraCharges> vendorCharges) { this.vendorCharges = vendorCharges; }
}
