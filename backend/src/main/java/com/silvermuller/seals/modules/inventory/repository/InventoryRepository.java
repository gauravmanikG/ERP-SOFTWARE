package com.silvermuller.seals.modules.inventory.repository;

import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class InventoryRepository {

    private final List<Map<String, Object>> transactions = Collections.synchronizedList(new ArrayList<>());
    private final List<Map<String, Object>> masterCodes = Collections.synchronizedList(new ArrayList<>());

    public InventoryRepository() {
        // Initial sample master items
        masterCodes.add(Map.of(
            "code", "MC-1001",
            "description", "Oil Seal 45x65x10 Dual Lip Nitrile Rubber",
            "category", "Rubber Seals",
            "group", "Rotary Seals",
            "uom", "Pcs",
            "deptStock", Map.of("Store Department", 250, "Assembly Department", 25, "Machining Department", 0)
        ));
        masterCodes.add(Map.of(
            "code", "MC-1002",
            "description", "EPDM Flange Gasket 2 Inch Class 150",
            "category", "Gaskets",
            "group", "Pipe Flanges",
            "uom", "Pcs",
            "deptStock", Map.of("Store Department", 120, "Packaging Department", 15)
        ));
    }

    public List<Map<String, Object>> findAllTransactions() {
        return new ArrayList<>(transactions);
    }

    public Map<String, Object> addTransaction(Map<String, Object> tx) {
        Map<String, Object> record = new HashMap<>(tx);
        record.put("id", UUID.randomUUID().toString());
        record.put("createdAt", new Date().toString());
        transactions.add(0, record);
        return record;
    }

    public List<Map<String, Object>> findAllMasterCodes() {
        return new ArrayList<>(masterCodes);
    }
}
