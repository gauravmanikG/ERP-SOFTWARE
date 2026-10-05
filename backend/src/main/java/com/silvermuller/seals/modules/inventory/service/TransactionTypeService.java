package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.modules.inventory.dto.TransactionTypeResponse;
import com.silvermuller.seals.modules.inventory.model.OperationMaster;
import com.silvermuller.seals.modules.inventory.model.TransactionType;
import com.silvermuller.seals.modules.inventory.repository.OperationRepository;
import com.silvermuller.seals.modules.inventory.repository.TransactionTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TransactionTypeService {

    private final OperationRepository operationRepository;
    private final TransactionTypeRepository transactionTypeRepository;

    public TransactionTypeService(
            OperationRepository operationRepository,
            TransactionTypeRepository transactionTypeRepository) {
        this.operationRepository = operationRepository;
        this.transactionTypeRepository = transactionTypeRepository;
    }

    /**
     * Dropdown source of truth is operation_master. Adding a row there
     * (or via /api/inventory/operations data) is what the UI lists.
     */
    @Transactional
    public List<TransactionTypeResponse> getAllTransactionTypes() {
        List<OperationMaster> operations = operationRepository.findAllByOrderByIdAsc();
        for (OperationMaster op : operations) {
            if (transactionTypeRepository.findByTypeIgnoreCase(op.getOperationName()).isEmpty()) {
                TransactionType tt = new TransactionType();
                tt.setType(op.getOperationName());
                transactionTypeRepository.save(tt);
            }
        }
        return operations.stream()
                .map(op -> new TransactionTypeResponse(op.getId(), op.getOperationName()))
                .collect(Collectors.toList());
    }
}
