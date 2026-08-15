package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.InsufficientStockException;
import com.silvermuller.seals.common.exception.InvalidTransactionException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.*;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.InventoryTransaction;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.model.TransactionType;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.InventoryTransactionRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.repository.TransactionTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class InventoryTransactionService {

    private final InventoryTransactionRepository transactionRepository;
    private final MasterRepository masterRepository;
    private final DepartmentRepository departmentRepository;
    private final TransactionTypeRepository transactionTypeRepository;

    public InventoryTransactionService(
            InventoryTransactionRepository transactionRepository,
            MasterRepository masterRepository,
            DepartmentRepository departmentRepository,
            TransactionTypeRepository transactionTypeRepository) {
        this.transactionRepository = transactionRepository;
        this.masterRepository = masterRepository;
        this.departmentRepository = departmentRepository;
        this.transactionTypeRepository = transactionTypeRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal getDepartmentClosingBalance(Long masterId, Long departmentId) {
        Master master = masterRepository.findById(masterId)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + masterId));

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + departmentId));

        BigDecimal balance = BigDecimal.ZERO;
        String storeName = master.getStoreName() != null ? master.getStoreName().toLowerCase() : "";
        String deptName = department.getName().toLowerCase();

        if (deptName.equals(storeName) ||
            (storeName.contains("main") && deptName.contains("stores")) ||
            (storeName.contains("maintenance") && deptName.contains("maintenance")) ||
            (storeName.contains("production") && deptName.contains("production"))) {
            balance = master.getOpeningBalance();
        }

        List<InventoryTransaction> transactions = transactionRepository.findByMasterIdOrderByTransactionDateAscIdAsc(masterId);

        for (InventoryTransaction tx : transactions) {
            String type = tx.getTransactionType().getType().toUpperCase();
            Long fromId = tx.getFromDepartment() != null ? tx.getFromDepartment().getId() : null;
            Long toId = tx.getToDepartment() != null ? tx.getToDepartment().getId() : null;

            if ("RECEIPT".equals(type)) {
                if (departmentId.equals(toId) || (toId == null && departmentId.equals(fromId))) {
                    balance = balance.add(tx.getQuantity());
                }
            } else if ("ISSUE".equals(type)) {
                if (departmentId.equals(fromId)) {
                    balance = balance.subtract(tx.getQuantity());
                }
                if (departmentId.equals(toId)) {
                    balance = balance.add(tx.getQuantity());
                }
            } else if ("REVERSE".equals(type)) {
                InventoryTransaction reversed = tx.getReversedTransaction();
                if (reversed != null) {
                    String origType = reversed.getTransactionType().getType().toUpperCase();
                    Long origFromId = reversed.getFromDepartment() != null ? reversed.getFromDepartment().getId() : null;
                    Long origToId = reversed.getToDepartment() != null ? reversed.getToDepartment().getId() : null;

                    if ("RECEIPT".equals(origType)) {
                        if (departmentId.equals(origToId) || (origToId == null && departmentId.equals(origFromId))) {
                            balance = balance.subtract(tx.getQuantity());
                        }
                    } else if ("ISSUE".equals(origType)) {
                        if (departmentId.equals(origFromId)) {
                            balance = balance.add(tx.getQuantity());
                        }
                        if (departmentId.equals(origToId)) {
                            balance = balance.subtract(tx.getQuantity());
                        }
                    }
                }
            }
        }
        return balance;
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentBalance(Long masterId) {
        Master master = masterRepository.findById(masterId)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + masterId));

        BigDecimal balance = master.getOpeningBalance();
        List<InventoryTransaction> transactions = transactionRepository.findByMasterIdOrderByTransactionDateAscIdAsc(masterId);

        for (InventoryTransaction tx : transactions) {
            String type = tx.getTransactionType().getType().toUpperCase();
            if ("RECEIPT".equals(type)) {
                balance = balance.add(tx.getQuantity());
            } else if ("ISSUE".equals(type)) {
                balance = balance.subtract(tx.getQuantity());
            } else if ("REVERSE".equals(type)) {
                InventoryTransaction reversed = tx.getReversedTransaction();
                if (reversed != null) {
                    String origType = reversed.getTransactionType().getType().toUpperCase();
                    if ("RECEIPT".equals(origType)) {
                        balance = balance.subtract(tx.getQuantity());
                    } else if ("ISSUE".equals(origType)) {
                        balance = balance.add(tx.getQuantity());
                    }
                }
            }
        }
        return balance;
    }

    @Transactional(readOnly = true)
    public String getPreviewTransactionNumber(String typeStr) {
        String normalizedType = typeStr != null ? typeStr.trim().toUpperCase() : "ISSUE";
        TransactionType type = transactionTypeRepository.findByTypeIgnoreCase(normalizedType)
                .orElseGet(() -> transactionTypeRepository.findAll().stream().findFirst().orElseThrow());
        return generateTransactionNumber(type);
    }

    @Transactional(readOnly = true)
    public String getPreviewSlipNumber(String typeStr) {
        return getPreviewTransactionNumber(typeStr);
    }

    @Transactional(rollbackFor = Exception.class)
    public List<TransactionResponse> processBatchTransaction(CreateBatchTransactionRequest request) {
        String typeStr = request.getTransactionType().trim().toUpperCase();
        if (!"ISSUE".equals(typeStr) && !"RECEIPT".equals(typeStr)) {
            throw new InvalidTransactionException("Transaction type must be ISSUE or RECEIPT. For reversals, use /reverse.");
        }

        Department fromDept = departmentRepository.findById(request.getFromDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("From Department not found with ID: " + request.getFromDepartmentId()));

        Department toDept = null;
        if (request.getToDepartmentId() != null) {
            toDept = departmentRepository.findById(request.getToDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("To Department not found with ID: " + request.getToDepartmentId()));
        }

        TransactionType type = transactionTypeRepository.findByTypeIgnoreCase(typeStr)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction type not found: " + typeStr));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new InvalidTransactionException("Transaction must contain at least one item.");
        }

        String transactionNumber = generateTransactionNumber(type);
        String manualSlipNumber = request.getSlipNumber() != null && !request.getSlipNumber().isBlank()
                ? request.getSlipNumber().trim()
                : null;

        List<TransactionResponse> responses = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();

        for (TransactionItemRequest itemReq : request.getItems()) {
            Master master = masterRepository.findByIdForUpdate(itemReq.getMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + itemReq.getMasterId()));

            BigDecimal fromDeptBalance = getDepartmentClosingBalance(master.getId(), fromDept.getId());

            if ("ISSUE".equals(typeStr)) {
                if (itemReq.getQuantity().compareTo(fromDeptBalance) > 0) {
                    throw new InsufficientStockException(String.format(
                            "Transaction quantity (%s %s) cannot be greater than closing balance in department '%s' (%s %s) for item '%s'.",
                            itemReq.getQuantity(), master.getUnitOfMeasurement(),
                            fromDept.getName(), fromDeptBalance, master.getUnitOfMeasurement(),
                            master.getCode()
                    ));
                }
            }

            InventoryTransaction tx = new InventoryTransaction();
            tx.setTransactionNumber(transactionNumber);
            tx.setSlipNumber(manualSlipNumber);
            tx.setTransactionType(type);
            tx.setMaster(master);
            tx.setFromDepartment(fromDept);
            tx.setToDepartment(toDept);
            tx.setQuantity(itemReq.getQuantity());
            tx.setTransactionDate(now);
            tx.setRemarks(itemReq.getRemarks() != null && !itemReq.getRemarks().isBlank() ? itemReq.getRemarks() : request.getRemarks());

            InventoryTransaction savedTx = transactionRepository.save(tx);
            BigDecimal newBalance = getCurrentBalance(master.getId());
            responses.add(mapToResponse(savedTx, newBalance));
        }

        return responses;
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionResponse processTransaction(CreateTransactionRequest request) {
        CreateBatchTransactionRequest batchReq = new CreateBatchTransactionRequest();
        batchReq.setTransactionType(request.getTransactionType());
        batchReq.setFromDepartmentId(request.getDepartmentId());
        batchReq.setRemarks(request.getRemarks());

        TransactionItemRequest item = new TransactionItemRequest(request.getMasterId(), request.getQuantity(), request.getRemarks());
        batchReq.setItems(List.of(item));

        List<TransactionResponse> responses = processBatchTransaction(batchReq);
        return responses.get(0);
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionResponse processReverse(CreateReverseRequest request) {
        InventoryTransaction targetTx = transactionRepository.findById(request.getTargetTransactionId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found to reverse with ID: " + request.getTargetTransactionId()));

        if ("REVERSE".equalsIgnoreCase(targetTx.getTransactionType().getType())) {
            throw new InvalidTransactionException("Cannot reverse a reversal transaction.");
        }

        if (transactionRepository.existsByReversedTransactionId(targetTx.getId())) {
            throw new InvalidTransactionException("Transaction '" + targetTx.getSlipNumber() + "' has already been reversed.");
        }

        TransactionType reverseType = transactionTypeRepository.findByTypeIgnoreCase("REVERSE")
                .orElseThrow(() -> new ResourceNotFoundException("Transaction type REVERSE not found"));

        Long masterId = targetTx.getMaster().getId();
        BigDecimal currentBalance = getCurrentBalance(masterId);

        if ("RECEIPT".equalsIgnoreCase(targetTx.getTransactionType().getType())) {
            if (currentBalance.compareTo(targetTx.getQuantity()) < 0) {
                throw new InsufficientStockException(String.format(
                        "Cannot reverse RECEIPT '%s': available balance (%s) is less than receipt quantity (%s)",
                        targetTx.getSlipNumber(), currentBalance, targetTx.getQuantity()
                ));
            }
        }

        String transactionNumber = generateTransactionNumber(reverseType);

        InventoryTransaction reverseTx = new InventoryTransaction();
        reverseTx.setTransactionNumber(transactionNumber);
        reverseTx.setSlipNumber(targetTx.getSlipNumber() != null ? "REV-" + targetTx.getSlipNumber() : null);
        reverseTx.setTransactionType(reverseType);
        reverseTx.setMaster(targetTx.getMaster());
        reverseTx.setFromDepartment(targetTx.getFromDepartment());
        reverseTx.setToDepartment(targetTx.getToDepartment());
        reverseTx.setQuantity(targetTx.getQuantity());
        reverseTx.setTransactionDate(OffsetDateTime.now());
        reverseTx.setRemarks(request.getRemarks() != null && !request.getRemarks().isBlank()
                ? request.getRemarks()
                : "Reversal of slip " + targetTx.getSlipNumber());
        reverseTx.setReversedTransaction(targetTx);

        InventoryTransaction savedTx = transactionRepository.save(reverseTx);
        BigDecimal newBalance = getCurrentBalance(masterId);

        return mapToResponse(savedTx, newBalance);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getAllTransactions() {
        return transactionRepository.findAllByOrderByTransactionDateDescIdDesc().stream()
                .map(tx -> mapToResponse(tx, getCurrentBalance(tx.getMaster().getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(Long id) {
        InventoryTransaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));
        return mapToResponse(tx, getCurrentBalance(tx.getMaster().getId()));
    }

    private synchronized String generateTransactionNumber(TransactionType type) {
        String typeName = type.getType().toUpperCase();
        String prefix;
        switch (typeName) {
            case "ISSUE":
                prefix = "ISU";
                break;
            case "RECEIPT":
                prefix = "REC";
                break;
            case "REVERSE":
                prefix = "REV";
                break;
            default:
                prefix = "TX";
                break;
        }

        Optional<String> latestTxNumOpt = transactionRepository.findLatestTransactionNumberByTypeId(type.getId());
        int nextSeq = 1;
        if (latestTxNumOpt.isPresent()) {
            String latestTxNum = latestTxNumOpt.get();
            try {
                String numPart = latestTxNum.substring(latestTxNum.lastIndexOf('-') + 1);
                nextSeq = Integer.parseInt(numPart) + 1;
            } catch (Exception ignored) {
                nextSeq = 1;
            }
        }

        return String.format("%s-%03d", prefix, nextSeq);
    }

    private TransactionResponse mapToResponse(InventoryTransaction tx, BigDecimal currentBalanceAfter) {
        TransactionResponse dto = new TransactionResponse();
        dto.setId(tx.getId());
        dto.setTransactionNumber(tx.getTransactionNumber());
        dto.setSlipNumber(tx.getSlipNumber());
        dto.setTransactionType(tx.getTransactionType().getType());
        dto.setMasterId(tx.getMaster().getId());
        dto.setMasterCode(tx.getMaster().getCode());
        dto.setMasterDescription(tx.getMaster().getDescription());
        dto.setCategory(tx.getMaster().getCategory());
        dto.setUnitOfMeasurement(tx.getMaster().getUnitOfMeasurement());
        if (tx.getFromDepartment() != null) {
            dto.setFromDepartmentId(tx.getFromDepartment().getId());
            dto.setFromDepartmentName(tx.getFromDepartment().getName());
        }
        if (tx.getToDepartment() != null) {
            dto.setToDepartmentId(tx.getToDepartment().getId());
            dto.setToDepartmentName(tx.getToDepartment().getName());
        }
        dto.setQuantity(tx.getQuantity());
        dto.setTransactionDate(tx.getTransactionDate());
        dto.setRemarks(tx.getRemarks());
        if (tx.getReversedTransaction() != null) {
            dto.setReversedTransactionId(tx.getReversedTransaction().getId());
        }
        dto.setCurrentBalanceAfter(currentBalanceAfter);
        return dto;
    }
}
