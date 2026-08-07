package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.modules.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class InventoryService {

    private final InventoryRepository repository;

    public InventoryService(InventoryRepository repository) {
        this.repository = repository;
    }

    public List<Map<String, Object>> getTransactions() {
        return repository.findAllTransactions();
    }

    public Map<String, Object> createTransaction(Map<String, Object> transactionData) {
        return repository.addTransaction(transactionData);
    }

    public List<Map<String, Object>> getMasterCodes() {
        return repository.findAllMasterCodes();
    }
}
