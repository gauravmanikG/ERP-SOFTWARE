package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.InsufficientStockException;
import com.silvermuller.seals.common.exception.InvalidTransactionException;
import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.*;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.InventoryTransaction;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.model.TransactionType;
import com.silvermuller.seals.modules.inventory.model.OpeningBalance;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.InventoryTransactionRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.repository.OpeningBalanceRepository;
import com.silvermuller.seals.modules.inventory.repository.CategoryMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.OperationRepository;
import com.silvermuller.seals.modules.inventory.repository.TransactionTypeRepository;
import com.silvermuller.seals.modules.notifications.service.StockAlertService;
import org.springframework.context.annotation.Lazy;
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
    private final DepartmentService departmentService;
    private final TransactionTypeRepository transactionTypeRepository;
    private final OpeningBalanceRepository openingBalanceRepository;
    private final OperationRepository operationRepository;
    private final CategoryMasterRepository categoryMasterRepository;
    private final StockAlertService stockAlertService;

    public InventoryTransactionService(
            InventoryTransactionRepository transactionRepository,
            MasterRepository masterRepository,
            DepartmentRepository departmentRepository,
            DepartmentService departmentService,
            TransactionTypeRepository transactionTypeRepository,
            OpeningBalanceRepository openingBalanceRepository,
            OperationRepository operationRepository,
            CategoryMasterRepository categoryMasterRepository,
            @Lazy StockAlertService stockAlertService) {
        this.transactionRepository = transactionRepository;
        this.masterRepository = masterRepository;
        this.departmentRepository = departmentRepository;
        this.departmentService = departmentService;
        this.transactionTypeRepository = transactionTypeRepository;
        this.openingBalanceRepository = openingBalanceRepository;
        this.operationRepository = operationRepository;
        this.categoryMasterRepository = categoryMasterRepository;
        this.stockAlertService = stockAlertService;
    }

    /** Inbound stock (adds to destination). All other operations move from → to. */
    static boolean isInboundOperation(String type) {
        if (type == null) {
            return false;
        }
        String t = type.trim();
        return "CUSTOMER REJECTION RECEIPT".equalsIgnoreCase(t)
                || "BOM MOULDING RECEIPT".equalsIgnoreCase(t)
                || "BOM TRANSFER RECEIPT".equalsIgnoreCase(t)
                || "BOM FG TRANSFER RECEIPT".equalsIgnoreCase(t);
    }

    @Transactional(readOnly = true)
    public BigDecimal getDepartmentClosingBalance(Long masterId, Long departmentId) {
        return getDepartmentClosingBalance(masterId, null, departmentId);
    }

    @Transactional(readOnly = true)
    public BigDecimal getDepartmentClosingBalance(Long masterId, String categoryName, Long departmentId) {
        Master master = masterRepository.findById(masterId)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + masterId));

        Department department = departmentService.getDepartmentEntity(departmentId);

        String code = master.getCode();
        String catName = (categoryName != null && !categoryName.isBlank()) ? categoryName.trim() : master.getCategory();
        String deptName = department.getName();

        BigDecimal balance = BigDecimal.ZERO;

        List<OpeningBalance> obExact = openingBalanceRepository
                .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(code, catName, deptName);
        if (!obExact.isEmpty() && obExact.get(0).getOpeningBalance() != null) {
            balance = obExact.get(0).getOpeningBalance();
        }

        List<InventoryTransaction> transactions = transactionRepository.findByMasterIdOrderByTransactionDateAscIdAsc(masterId);

        for (InventoryTransaction tx : transactions) {
            String txCat = (tx.getCategory() == null || tx.getCategory().isBlank())
                    ? master.getCategory()
                    : tx.getCategory().trim();
            if (catName != null && txCat != null && !catName.equalsIgnoreCase(txCat)) {
                continue;
            }

            String type = tx.getTransactionType().getType();

            if (isInboundOperation(type)) {
                if (isSameDepartment(departmentId, department, tx.getToDepartment())
                        || (tx.getToDepartment() == null && isSameDepartment(departmentId, department, tx.getFromDepartment()))) {
                    balance = balance.add(tx.getQuantity());
                }
            } else if (tx.getReversedTransaction() != null) {
                InventoryTransaction reversed = tx.getReversedTransaction();
                String origType = reversed.getTransactionType().getType();

                if (isInboundOperation(origType)) {
                    if (isSameDepartment(departmentId, department, reversed.getToDepartment())
                            || (reversed.getToDepartment() == null && isSameDepartment(departmentId, department, reversed.getFromDepartment()))) {
                        balance = balance.subtract(tx.getQuantity());
                    }
                } else {
                    if (isSameDepartment(departmentId, department, reversed.getFromDepartment())) {
                        balance = balance.add(tx.getQuantity());
                    }
                    if (isSameDepartment(departmentId, department, reversed.getToDepartment())) {
                        balance = balance.subtract(tx.getQuantity());
                    }
                }
            } else {
                if (isSameDepartment(departmentId, department, tx.getFromDepartment())) {
                    balance = balance.subtract(tx.getQuantity());
                }
                if (isSameDepartment(departmentId, department, tx.getToDepartment())) {
                    balance = balance.add(tx.getQuantity());
                }
            }
        }

        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }
        return balance;
    }

    private boolean isSameDepartment(Long requestedId, Department resolved, Department txDept) {
        if (txDept == null) {
            return false;
        }
        if (requestedId != null && requestedId.equals(txDept.getId())) {
            return true;
        }
        if (resolved != null && resolved.getId() != null && resolved.getId().equals(txDept.getId())) {
            return true;
        }
        if (resolved != null && resolved.getName() != null && txDept.getName() != null
                && resolved.getName().trim().equalsIgnoreCase(txDept.getName().trim())) {
            return true;
        }
        return false;
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentBalance(Long masterId) {
        Master master = masterRepository.findById(masterId)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + masterId));

        BigDecimal balance = master.getOpeningBalance();
        List<InventoryTransaction> transactions = transactionRepository.findByMasterIdOrderByTransactionDateAscIdAsc(masterId);

        for (InventoryTransaction tx : transactions) {
            String type = tx.getTransactionType().getType();
            boolean hasTo = tx.getToDepartment() != null;
            if (tx.getReversedTransaction() != null) {
                String origType = tx.getReversedTransaction().getTransactionType().getType();
                boolean origInbound = isInboundOperation(origType);
                boolean origHasTo = tx.getReversedTransaction().getToDepartment() != null;
                if (origInbound) {
                    balance = balance.subtract(tx.getQuantity());
                } else if (!origHasTo) {
                    balance = balance.add(tx.getQuantity());
                }
            } else if (isInboundOperation(type)) {
                balance = balance.add(tx.getQuantity());
            } else if (!hasTo) {
                balance = balance.subtract(tx.getQuantity());
            }
        }
        return balance;
    }

    @Transactional(readOnly = true)
    public String getPreviewTransactionNumber(String typeStr) {
        String normalizedType = typeStr != null && !typeStr.isBlank() ? typeStr.trim() : "Material Transfer";
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
        String typeStr = request.getTransactionType() != null ? request.getTransactionType().trim() : "Material Transfer";

        if (operationRepository.findByOperationNameIgnoreCase(typeStr).isEmpty()) {
            throw new InvalidTransactionException(
                    "Unknown operation '" + typeStr + "'. Add it in operation_master to use it.");
        }

        Department fromDept = departmentService.getDepartmentEntity(request.getFromDepartmentId());

        if (request.getToDepartmentId() == null) {
            throw new InvalidTransactionException("To Department is required.");
        }
        Department toDept = departmentService.getDepartmentEntity(request.getToDepartmentId());


        final String finalTypeStr = typeStr;
        TransactionType type = transactionTypeRepository.findByTypeIgnoreCase(typeStr)
                .orElseGet(() -> {
                    TransactionType newType = new TransactionType();
                    newType.setType(finalTypeStr);
                    return transactionTypeRepository.save(newType);
                });

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

            if (itemReq.getCategory() == null || itemReq.getCategory().isBlank()) {
                throw new InvalidTransactionException("Category of Item is required for item '" + master.getCode() + "'.");
            }
            String requestedCategory = itemReq.getCategory().trim();
            String itemCategory = categoryMasterRepository.findByCategoryNameIgnoreCase(requestedCategory)
                    .map(c -> c.getCategoryName())
                    .orElseThrow(() -> new InvalidTransactionException(
                            "Category '" + requestedCategory + "' is not in category_master."));

            // Validate sufficient stock using category-specific balance
            BigDecimal fromDeptBalance = getDepartmentClosingBalance(master.getId(), itemCategory, request.getFromDepartmentId());

            if (!isInboundOperation(typeStr)) {
                if (itemReq.getQuantity().compareTo(fromDeptBalance) > 0) {
                    throw new InsufficientStockException(String.format(
                            "Transaction quantity (%s %s) cannot be greater than closing balance in department '%s' (%s %s) for item '%s' [%s].",
                            itemReq.getQuantity(), master.getUnitOfMeasurement(),
                            fromDept.getName(), fromDeptBalance, master.getUnitOfMeasurement(),
                            master.getCode(), itemCategory
                    ));
                }
            }


            InventoryTransaction tx = new InventoryTransaction();
            tx.setTransactionNumber(transactionNumber);
            tx.setSlipNumber(manualSlipNumber);
            tx.setTransactionType(type);
            tx.setMaster(master);
            tx.setCategory(itemCategory);  // save the exact selected category
            tx.setFromDepartment(fromDept);
            tx.setToDepartment(toDept);
            tx.setQuantity(itemReq.getQuantity());
            tx.setTransactionDate(now);
            tx.setRemarks(itemReq.getRemarks() != null && !itemReq.getRemarks().isBlank() ? itemReq.getRemarks() : request.getRemarks());

            InventoryTransaction savedTx = transactionRepository.save(tx);
            BigDecimal newBalance = getCurrentBalance(master.getId());
            responses.add(mapToResponse(savedTx, newBalance));
            stockAlertService.evaluateItem(master.getCode(), itemCategory);
        }

        return responses;
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionResponse processTransaction(CreateTransactionRequest request) {
        CreateBatchTransactionRequest batchReq = new CreateBatchTransactionRequest();
        batchReq.setTransactionType(request.getTransactionType());
        batchReq.setFromDepartmentId(request.getDepartmentId());
        batchReq.setToDepartmentId(request.getToDepartmentId());
        batchReq.setRemarks(request.getRemarks());

        TransactionItemRequest item = new TransactionItemRequest(
                request.getMasterId(), request.getQuantity(), request.getRemarks(), request.getCategory());
        batchReq.setItems(List.of(item));

        List<TransactionResponse> responses = processBatchTransaction(batchReq);
        return responses.get(0);
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionResponse processReverse(CreateReverseRequest request) {
        InventoryTransaction targetTx = transactionRepository.findById(request.getTargetTransactionId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found to reverse with ID: " + request.getTargetTransactionId()));

        if (targetTx.getReversedTransaction() != null) {
            throw new InvalidTransactionException("Cannot reverse a reversal transaction.");
        }

        if (transactionRepository.existsByReversedTransactionId(targetTx.getId())) {
            throw new InvalidTransactionException("Transaction '" + targetTx.getSlipNumber() + "' has already been reversed.");
        }

        TransactionType reverseType = transactionTypeRepository.findByTypeIgnoreCase("Internal Material Return")
                .orElseGet(() -> transactionTypeRepository.findByTypeIgnoreCase(targetTx.getTransactionType().getType())
                        .orElseThrow(() -> new ResourceNotFoundException("No operation type available to record a reversal")));

        Long masterId = targetTx.getMaster().getId();
        BigDecimal currentBalance = getCurrentBalance(masterId);

        if (isInboundOperation(targetTx.getTransactionType().getType())) {
            if (currentBalance.compareTo(targetTx.getQuantity()) < 0) {
                throw new InsufficientStockException(String.format(
                        "Cannot reverse inbound '%s': available balance (%s) is less than receipt quantity (%s)",
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
        String cat = targetTx.getCategory() != null && !targetTx.getCategory().isBlank()
                ? targetTx.getCategory()
                : targetTx.getMaster().getCategory();
        stockAlertService.evaluateItem(targetTx.getMaster().getCode(), cat);

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
        Long maxId = transactionRepository.findMaxTransactionId();
        long nextSeq = (maxId != null ? maxId : 0) + 1;
        return String.format("%03d", nextSeq);
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
        dto.setCategory(tx.getCategory() != null ? tx.getCategory() : tx.getMaster().getCategory());
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

    @Transactional
    public void clearAllTransactions() {
        transactionRepository.deleteAllInBatch();
    }
}

