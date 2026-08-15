package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.modules.inventory.dto.TransactionTypeResponse;
import com.silvermuller.seals.modules.inventory.repository.TransactionTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TransactionTypeService {

    private final TransactionTypeRepository transactionTypeRepository;

    public TransactionTypeService(TransactionTypeRepository transactionTypeRepository) {
        this.transactionTypeRepository = transactionTypeRepository;
    }

    public List<TransactionTypeResponse> getAllTransactionTypes() {
        return transactionTypeRepository.findAll().stream()
                .map(type -> new TransactionTypeResponse(type.getId(), type.getType()))
                .collect(Collectors.toList());
    }
}
