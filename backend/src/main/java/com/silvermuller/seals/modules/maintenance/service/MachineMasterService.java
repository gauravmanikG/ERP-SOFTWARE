package com.silvermuller.seals.modules.maintenance.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.maintenance.dto.CreateMachineRequest;
import com.silvermuller.seals.modules.maintenance.dto.MachineResponse;
import com.silvermuller.seals.modules.maintenance.model.MachineMaster;
import com.silvermuller.seals.modules.maintenance.repository.MachineMasterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MachineMasterService {

    private final MachineMasterRepository machineRepository;

    public MachineMasterService(MachineMasterRepository machineRepository) {
        this.machineRepository = machineRepository;
    }

    public List<MachineResponse> getAllMachines() {
        return machineRepository.findAllByOrderBySerialNoAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<MachineResponse> searchMachines(String query, String dept, String category, String status) {
        String q = (query != null && !query.isBlank()) ? query.trim() : null;
        String d = (dept != null && !dept.isBlank() && !"ALL".equalsIgnoreCase(dept)) ? dept.trim() : null;
        String c = (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) ? category.trim() : null;
        String s = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim() : null;

        return machineRepository.searchMachines(q, d, c, s).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public MachineResponse getMachineById(Long id) {
        MachineMaster m = machineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found with id: " + id));
        return toResponse(m);
    }

    @Transactional
    public MachineResponse createMachine(CreateMachineRequest req) {
        String machineNo = req.getMachineNo().trim();
        if (machineRepository.findByMachineNoIgnoreCase(machineNo).isPresent()) {
            throw new IllegalArgumentException("Machine with code '" + machineNo + "' already exists");
        }

        Integer sNo = req.getSNo();
        if (sNo == null) {
            sNo = (int) machineRepository.count() + 1;
        }

        MachineMaster m = new MachineMaster();
        m.setSerialNo(sNo);
        m.setMachineNo(machineNo);
        m.setDescription(req.getDescription().trim());
        m.setDepartment(req.getDepartment() != null ? req.getDepartment().trim() : "General");
        m.setLocation(req.getLocation() != null ? req.getLocation().trim() : "");
        m.setSpecification(req.getSpecification());
        m.setCapacity(req.getCapacity() != null ? req.getCapacity().trim() : "");
        m.setMake(req.getMake() != null ? req.getMake().trim() : "");
        m.setRemarks(req.getRemarks());
        m.setCategory(req.getCategory() != null ? req.getCategory().trim() : "Process");
        m.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus().trim() : "ACTIVE");

        MachineMaster saved = machineRepository.save(m);
        return toResponse(saved);
    }

    @Transactional
    public MachineResponse updateMachine(Long id, CreateMachineRequest req) {
        MachineMaster m = machineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found with id: " + id));

        String machineNo = req.getMachineNo().trim();
        machineRepository.findByMachineNoIgnoreCase(machineNo).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new IllegalArgumentException("Another machine with code '" + machineNo + "' already exists");
            }
        });

        if (req.getSNo() != null) {
            m.setSerialNo(req.getSNo());
        }
        m.setMachineNo(machineNo);
        m.setDescription(req.getDescription().trim());
        if (req.getDepartment() != null) m.setDepartment(req.getDepartment().trim());
        if (req.getLocation() != null) m.setLocation(req.getLocation().trim());
        m.setSpecification(req.getSpecification());
        if (req.getCapacity() != null) m.setCapacity(req.getCapacity().trim());
        if (req.getMake() != null) m.setMake(req.getMake().trim());
        m.setRemarks(req.getRemarks());
        if (req.getCategory() != null) m.setCategory(req.getCategory().trim());
        if (req.getStatus() != null) m.setStatus(req.getStatus().trim());

        MachineMaster updated = machineRepository.save(m);
        return toResponse(updated);
    }

    @Transactional
    public void deleteMachine(Long id) {
        MachineMaster m = machineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found with id: " + id));
        machineRepository.delete(m);
    }

    public Map<String, Object> getStats() {
        List<MachineMaster> all = machineRepository.findAll();
        long total = all.size();
        long active = all.stream().filter(m -> "ACTIVE".equalsIgnoreCase(m.getStatus())).count();
        long maintenance = all.stream().filter(m -> "UNDER_MAINTENANCE".equalsIgnoreCase(m.getStatus())).count();
        long breakdown = all.stream().filter(m -> "BREAKDOWN".equalsIgnoreCase(m.getStatus())).count();
        long standby = all.stream().filter(m -> "STANDBY".equalsIgnoreCase(m.getStatus())).count();

        Map<String, Long> byDept = all.stream()
                .filter(m -> m.getDepartment() != null)
                .collect(Collectors.groupingBy(MachineMaster::getDepartment, Collectors.counting()));

        Map<String, Long> byCategory = all.stream()
                .filter(m -> m.getCategory() != null)
                .collect(Collectors.groupingBy(MachineMaster::getCategory, Collectors.counting()));

        return Map.of(
                "total", total,
                "active", active,
                "maintenance", maintenance,
                "breakdown", breakdown,
                "standby", standby,
                "byDept", byDept,
                "byCategory", byCategory
        );
    }

    private MachineResponse toResponse(MachineMaster m) {
        return new MachineResponse(
                m.getId(),
                m.getSerialNo(),
                m.getMachineNo(),
                m.getDescription(),
                m.getDepartment(),
                m.getLocation(),
                m.getSpecification(),
                m.getCapacity(),
                m.getMake(),
                m.getRemarks(),
                m.getCategory(),
                m.getStatus(),
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
