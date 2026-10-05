package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.model.SupplierMaster;
import com.silvermuller.seals.modules.inventory.repository.SupplierMasterRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping({"/api/inventory/suppliers", "/api/suppliers", "/api/vendors"})
public class SupplierMasterController {

    private final SupplierMasterRepository supplierRepository;

    public SupplierMasterController(SupplierMasterRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @GetMapping
    public ResponseEntity<List<SupplierMaster>> getAllSuppliers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String gstType) {

        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(supplierRepository.searchSuppliers(search.trim()));
        }
        if (state != null && !state.trim().isEmpty()) {
            return ResponseEntity.ok(supplierRepository.findByStateIgnoreCase(state.trim()));
        }
        if (gstType != null && !gstType.trim().isEmpty()) {
            return ResponseEntity.ok(supplierRepository.findByGstRegistrationTypeIgnoreCase(gstType.trim()));
        }
        return ResponseEntity.ok(supplierRepository.findAllByOrderBySupplierCodeAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupplierMaster> getById(@PathVariable Long id) {
        return supplierRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<SupplierMaster> getByCode(@PathVariable String code) {
        return supplierRepository.findBySupplierCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createSupplier(@RequestBody SupplierMaster supplier) {
        if (supplier.getSupplierName() == null || supplier.getSupplierName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Supplier name is required"));
        }

        // Auto-generate supplierCode if empty
        if (supplier.getSupplierCode() == null || supplier.getSupplierCode().trim().isEmpty()) {
            long count = supplierRepository.count();
            supplier.setSupplierCode(String.format("SUP-%03d", count + 1));
        }
        if (supplier.getSupplierId() == null || supplier.getSupplierId().trim().isEmpty()) {
            supplier.setSupplierId(supplier.getSupplierCode());
        }

        // Auto-derive PAN if GSTIN provided and PAN not set
        if ((supplier.getPan() == null || supplier.getPan().isBlank()) && supplier.getGstin() != null) {
            String gstin = supplier.getGstin().trim();
            if (gstin.length() >= 15 && Character.isDigit(gstin.charAt(0)) && Character.isDigit(gstin.charAt(1))) {
                supplier.setPan(gstin.substring(2, 12));
                if (supplier.getStateCode() == null || supplier.getStateCode().isBlank()) {
                    supplier.setStateCode(gstin.substring(0, 2));
                }
            }
        }

        SupplierMaster saved = supplierRepository.save(supplier);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSupplier(@PathVariable Long id, @RequestBody SupplierMaster input) {
        Optional<SupplierMaster> opt = supplierRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SupplierMaster s = opt.get();
        if (input.getSupplierName() != null) s.setSupplierName(input.getSupplierName());
        if (input.getSupplierCode() != null) s.setSupplierCode(input.getSupplierCode());
        if (input.getCompanyId() != null) s.setCompanyId(input.getCompanyId());
        if (input.getSupplierType() != null) s.setSupplierType(input.getSupplierType());
        if (input.getGstin() != null) s.setGstin(input.getGstin());
        if (input.getPan() != null) s.setPan(input.getPan());
        if (input.getUdyamNo() != null) s.setUdyamNo(input.getUdyamNo());
        if (input.getMsmeCategory() != null) s.setMsmeCategory(input.getMsmeCategory());
        if (input.getGstRegistrationType() != null) s.setGstRegistrationType(input.getGstRegistrationType());
        if (input.getTdsSectionId() != null) s.setTdsSectionId(input.getTdsSectionId());
        if (input.getContactPerson() != null) s.setContactPerson(input.getContactPerson());
        if (input.getEmail() != null) s.setEmail(input.getEmail());
        if (input.getPhone() != null) s.setPhone(input.getPhone());
        if (input.getPaymentTermsId() != null) s.setPaymentTermsId(input.getPaymentTermsId());
        if (input.getCurrency() != null) s.setCurrency(input.getCurrency());
        if (input.getStatus() != null) s.setStatus(input.getStatus());
        if (input.getAddress() != null) s.setAddress(input.getAddress());
        if (input.getCity() != null) s.setCity(input.getCity());
        if (input.getState() != null) s.setState(input.getState());
        if (input.getStateCode() != null) s.setStateCode(input.getStateCode());
        if (input.getPincode() != null) s.setPincode(input.getPincode());
        if (input.getUpdatedBy() != null) s.setUpdatedBy(input.getUpdatedBy());

        return ResponseEntity.ok(supplierRepository.save(s));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteSupplier(@PathVariable Long id) {
        if (!supplierRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        supplierRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Supplier deleted successfully"));
    }
}
