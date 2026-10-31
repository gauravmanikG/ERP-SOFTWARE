package com.silvermuller.seals.modules.inventory.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.CreateDepartmentRequest;
import com.silvermuller.seals.modules.inventory.dto.DepartmentResponse;
import com.silvermuller.seals.modules.inventory.model.DepartmentMaster;
import com.silvermuller.seals.modules.inventory.repository.DepartmentMasterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;


@Service
@Transactional(readOnly = true)
public class DepartmentService {

    private final DepartmentMasterRepository departmentMasterRepository;

    public DepartmentService(DepartmentMasterRepository departmentMasterRepository) {
        this.departmentMasterRepository = departmentMasterRepository;
    }

    public List<DepartmentResponse> getAllDepartments() {
        return departmentMasterRepository.findAllByOrderByProcessSequenceAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private DepartmentResponse toResponse(DepartmentMaster dept) {
        return new DepartmentResponse(
                dept.getId(),
                dept.getDeptCode(),
                dept.getDeptNumber(),
                dept.getDepartmentName(),
                dept.getProcessSequence(),
                dept.getCategory(),
                dept.getStatus(),
                dept.getNotes()
        );
    }

    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest req) {
        String name = req.getDepartmentName() == null ? "" : req.getDepartmentName().trim();
        if (name.isBlank()) {
            throw new IllegalArgumentException("Department name is required");
        }
        if (req.getProcessSequence() == null) {
            throw new IllegalArgumentException("Process sequence is required");
        }
        if (departmentMasterRepository.findByDepartmentNameIgnoreCase(name).isPresent()) {
            throw new IllegalArgumentException("A department named '" + name + "' already exists");
        }
        // The next number after the highest code or number in use. A count of rows would repeat an existing code
        // once any department has been deleted; dept_code is unique.
        Integer num = req.getDeptNumber();
        if (num == null) {
            num = departmentMasterRepository.highestDepartmentNumber() + 1;
        }
        String code = req.getDeptCode();
        if (code == null || code.isBlank()) {
            code = String.format("DPT-%03d", num);
        }
        assertCodeFree(code.trim(), null);

        DepartmentMaster dept = new DepartmentMaster();
        dept.setDeptCode(code.trim());
        dept.setDeptNumber(num);
        dept.setDepartmentName(name);
        dept.setProcessSequence(req.getProcessSequence());
        dept.setCategory(req.getCategory() != null ? req.getCategory().trim() : "General");
        dept.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus().trim() : "ACTIVE");
        dept.setNotes(req.getNotes());

        DepartmentMaster saved = departmentMasterRepository.save(dept);
        return toResponse(saved);
    }

    @Transactional
    public DepartmentResponse createDepartment(String name, java.math.BigDecimal processSequence) {
        CreateDepartmentRequest req = new CreateDepartmentRequest();
        req.setDepartmentName(name);
        req.setProcessSequence(processSequence);
        return createDepartment(req);
    }

    @Transactional
    public DepartmentResponse createDepartment(String name) {
        java.math.BigDecimal seq = java.math.BigDecimal.valueOf(departmentMasterRepository.count() + 1);
        return createDepartment(name, seq);
    }

    public DepartmentMaster getDepartmentEntity(Long id) {
        if (id == null) {
            return null;
        }
        return departmentMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
    }

    @Transactional
    public DepartmentResponse updateDepartment(Long id, CreateDepartmentRequest req) {
        DepartmentMaster master = departmentMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
        String trimmed = req.getDepartmentName() == null ? "" : req.getDepartmentName().trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("Department name is required");
        }
        if (req.getProcessSequence() == null) {
            throw new IllegalArgumentException("Process sequence is required");
        }
        departmentMasterRepository.findByDepartmentNameIgnoreCase(trimmed).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new IllegalArgumentException("A department named '" + trimmed + "' already exists");
            }
        });

        Integer num = req.getDeptNumber() != null ? req.getDeptNumber() : master.getDeptNumber();
        String code = req.getDeptCode() != null && !req.getDeptCode().isBlank() ? req.getDeptCode().trim() : master.getDeptCode();
        if (code == null || code.isBlank()) {
            code = String.format("DPT-%03d", num != null ? num : master.getId().intValue());
        }
        assertCodeFree(code, id);

        master.setDeptCode(code);
        master.setDeptNumber(num);
        master.setDepartmentName(trimmed);
        master.setProcessSequence(req.getProcessSequence());
        if (req.getCategory() != null) master.setCategory(req.getCategory().trim());
        if (req.getStatus() != null) master.setStatus(req.getStatus().trim());
        if (req.getNotes() != null) master.setNotes(req.getNotes());

        DepartmentMaster saved = departmentMasterRepository.save(master);
        return toResponse(saved);
    }

    @Transactional
    public DepartmentResponse updateDepartment(Long id, String name, java.math.BigDecimal processSequence) {
        CreateDepartmentRequest req = new CreateDepartmentRequest();
        req.setDepartmentName(name);
        req.setProcessSequence(processSequence);
        return updateDepartment(id, req);
    }

    private void assertCodeFree(String code, Long ownId) {
        departmentMasterRepository.findByDeptCode(code).ifPresent(other -> {
            if (!other.getId().equals(ownId)) {
                throw new IllegalArgumentException("Department code '" + code + "' is already used by " + other.getDepartmentName());
            }
        });
    }

    @Transactional
    public void deleteDepartment(Long id) {
        DepartmentMaster master = departmentMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
        departmentMasterRepository.delete(master);
    }
}
