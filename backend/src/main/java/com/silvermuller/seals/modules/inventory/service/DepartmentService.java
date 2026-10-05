package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.DepartmentResponse;
import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.DepartmentMaster;
import com.silvermuller.seals.modules.inventory.model.OpeningBalance;
import com.silvermuller.seals.modules.inventory.repository.DepartmentMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.InventoryTransactionRepository;
import com.silvermuller.seals.modules.inventory.repository.OpeningBalanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
@Transactional(readOnly = true)
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final DepartmentMasterRepository departmentMasterRepository;
    private final OpeningBalanceRepository openingBalanceRepository;
    private final InventoryTransactionRepository transactionRepository;

    public DepartmentService(
            DepartmentRepository departmentRepository,
            DepartmentMasterRepository departmentMasterRepository,
            OpeningBalanceRepository openingBalanceRepository,
            InventoryTransactionRepository transactionRepository) {
        this.departmentRepository = departmentRepository;
        this.departmentMasterRepository = departmentMasterRepository;
        this.openingBalanceRepository = openingBalanceRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<DepartmentResponse> getAllDepartments() {
        return departmentMasterRepository.findAllByOrderByProcessSequenceAsc().stream()
                .map(dept -> new DepartmentResponse(dept.getId(), dept.getDepartmentName(), dept.getProcessSequence()))
                .collect(Collectors.toList());
    }

    @Transactional
    public DepartmentResponse createDepartment(String name, java.math.BigDecimal processSequence) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("Department name is required");
        }
        if (processSequence == null) {
            throw new IllegalArgumentException("Process sequence is required");
        }
        if (departmentMasterRepository.findByDepartmentNameIgnoreCase(trimmed).isPresent()) {
            throw new IllegalArgumentException("A department named '" + trimmed + "' already exists");
        }
        DepartmentMaster saved = departmentMasterRepository.save(new DepartmentMaster(trimmed, processSequence));
        if (departmentRepository.findByNameIgnoreCase(trimmed).isEmpty()) {
            Department live = new Department();
            live.setName(trimmed);
            departmentRepository.save(live);
        }
        return new DepartmentResponse(saved.getId(), saved.getDepartmentName(), saved.getProcessSequence());
    }

    @Transactional
    public DepartmentResponse createDepartment(String name) {
        java.math.BigDecimal seq = java.math.BigDecimal.valueOf(departmentMasterRepository.count() + 1);
        return createDepartment(name, seq);
    }

    public Department getDepartmentEntity(Long id) {
        if (id == null) {
            return null;
        }

        Optional<DepartmentMaster> masterOpt = departmentMasterRepository.findById(id);
        if (masterOpt.isPresent()) {
            String name = masterOpt.get().getDepartmentName().trim();
            Optional<Department> byName = departmentRepository.findByNameIgnoreCase(name);
            if (byName.isPresent()) {
                return byName.get();
            }
            Department d = new Department();
            d.setName(name);
            return departmentRepository.save(d);
        }

        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
    }

    @Transactional
    public DepartmentResponse updateDepartment(Long id, String name, java.math.BigDecimal processSequence) {
        DepartmentMaster master = departmentMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("Department name is required");
        }
        if (processSequence == null) {
            throw new IllegalArgumentException("Process sequence is required");
        }
        String oldName = master.getDepartmentName();
        departmentMasterRepository.findByDepartmentNameIgnoreCase(trimmed).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new IllegalArgumentException("A department named '" + trimmed + "' already exists");
            }
        });
        if (!oldName.equalsIgnoreCase(trimmed)) {
            List<OpeningBalance> obs = openingBalanceRepository.findByDepartmentNameIgnoreCase(oldName);
            for (OpeningBalance ob : obs) {
                ob.setDepartmentName(trimmed);
                ob.setMainCode(ob.getItemCode() + "::" + ob.getCategoryName() + "::" + trimmed);
            }
            openingBalanceRepository.saveAll(obs);
            departmentRepository.findByNameIgnoreCase(oldName).ifPresent(live -> {
                live.setName(trimmed);
                departmentRepository.save(live);
            });
        }
        master.setDepartmentName(trimmed);
        master.setProcessSequence(processSequence);
        DepartmentMaster saved = departmentMasterRepository.save(master);
        return new DepartmentResponse(saved.getId(), saved.getDepartmentName(), saved.getProcessSequence());
    }

    @Transactional
    public void deleteDepartment(Long id) {
        DepartmentMaster master = departmentMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
        Department live = departmentRepository.findByNameIgnoreCase(master.getDepartmentName()).orElse(null);
        if (live != null) {
            List<com.silvermuller.seals.modules.inventory.model.InventoryTransaction> txs =
                    transactionRepository.findByFromDepartment_IdOrToDepartment_Id(live.getId(), live.getId());
            if (!txs.isEmpty()) {
                throw new IllegalArgumentException(
                        "Cannot delete '" + master.getDepartmentName()
                                + "' because inventory transactions still use it. Remove those movements first.");
            }
        }
        openingBalanceRepository.deleteByDepartmentNameIgnoreCase(master.getDepartmentName());
        if (live != null) {
            departmentRepository.delete(live);
        }
        departmentMasterRepository.delete(master);
    }
}
