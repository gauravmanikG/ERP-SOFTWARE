package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.MasterStockResponse;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class MasterService {

    private final MasterRepository masterRepository;
    private final DepartmentRepository departmentRepository;
    private final InventoryTransactionService transactionService;

    public MasterService(
            MasterRepository masterRepository,
            DepartmentRepository departmentRepository,
            InventoryTransactionService transactionService) {
        this.masterRepository = masterRepository;
        this.departmentRepository = departmentRepository;
        this.transactionService = transactionService;
    }

    public List<MasterStockResponse> getAllMasterWithStock() {
        List<Department> departments = departmentRepository.findAll();
        return masterRepository.findAll().stream()
                .map(master -> buildMasterResponse(master, departments))
                .toList();
    }

    public MasterStockResponse getMasterStockById(Long id) {
        Master master = masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
        List<Department> departments = departmentRepository.findAll();
        return buildMasterResponse(master, departments);
    }

    public Master getMasterEntity(Long id) {
        return masterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material master not found with ID: " + id));
    }

    private MasterStockResponse buildMasterResponse(Master master, List<Department> departments) {
        BigDecimal totalBalance = transactionService.getCurrentBalance(master.getId());
        Map<String, BigDecimal> deptBalances = new HashMap<>();

        for (Department dept : departments) {
            BigDecimal deptBal = transactionService.getDepartmentClosingBalance(master.getId(), dept.getId());
            deptBalances.put(dept.getName(), deptBal);
            deptBalances.put(String.valueOf(dept.getId()), deptBal);
        }

        return new MasterStockResponse(
                master.getId(),
                master.getCode(),
                master.getDescription(),
                master.getCategory(),
                master.getUnitOfMeasurement(),
                master.getOpeningBalance(),
                totalBalance,
                master.getStoreName(),
                deptBalances
        );
    }
}
