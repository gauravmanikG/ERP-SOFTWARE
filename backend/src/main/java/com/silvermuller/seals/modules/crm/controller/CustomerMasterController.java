package com.silvermuller.seals.modules.crm.controller;

import com.silvermuller.seals.modules.crm.model.CustomerMaster;
import com.silvermuller.seals.modules.crm.repository.CustomerMasterRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping({"/api/crm/customers", "/api/customers"})
public class CustomerMasterController {

    private final CustomerMasterRepository customerRepository;

    public CustomerMasterController(CustomerMasterRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @GetMapping
    public ResponseEntity<List<CustomerMaster>> getAllCustomers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String gstType) {

        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(customerRepository.searchCustomers(search.trim()));
        }
        if (state != null && !state.trim().isEmpty()) {
            return ResponseEntity.ok(customerRepository.findByStateIgnoreCase(state.trim()));
        }
        if (gstType != null && !gstType.trim().isEmpty()) {
            return ResponseEntity.ok(customerRepository.findByGstRegistrationTypeIgnoreCase(gstType.trim()));
        }
        return ResponseEntity.ok(customerRepository.findAllByOrderByCustomerCodeAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerMaster> getById(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<CustomerMaster> getByCode(@PathVariable String code) {
        return customerRepository.findByCustomerCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody CustomerMaster customer) {
        if (customer.getCustomerName() == null || customer.getCustomerName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Customer name is required"));
        }

        // Auto-generate customerCode if empty
        if (customer.getCustomerCode() == null || customer.getCustomerCode().trim().isEmpty()) {
            long count = customerRepository.count();
            customer.setCustomerCode(String.format("CUST-%03d", count + 1));
        }
        if (customer.getCustomerId() == null || customer.getCustomerId().trim().isEmpty()) {
            customer.setCustomerId(customer.getCustomerCode());
        }

        // Auto-derive PAN if GSTIN provided and PAN not set
        if ((customer.getPan() == null || customer.getPan().isBlank()) && customer.getGstin() != null) {
            String gstin = customer.getGstin().trim();
            if (gstin.length() >= 15 && Character.isDigit(gstin.charAt(0)) && Character.isDigit(gstin.charAt(1))) {
                customer.setPan(gstin.substring(2, 12));
                if (customer.getStateCode() == null || customer.getStateCode().isBlank()) {
                    customer.setStateCode(gstin.substring(0, 2));
                }
            }
        }

        CustomerMaster saved = customerRepository.save(customer);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable Long id, @RequestBody CustomerMaster input) {
        Optional<CustomerMaster> opt = customerRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CustomerMaster c = opt.get();
        if (input.getCustomerName() != null) c.setCustomerName(input.getCustomerName());
        if (input.getCustomerCode() != null) c.setCustomerCode(input.getCustomerCode());
        if (input.getCompanyId() != null) c.setCompanyId(input.getCompanyId());
        if (input.getCustomerType() != null) c.setCustomerType(input.getCustomerType());
        if (input.getGstin() != null) c.setGstin(input.getGstin());
        if (input.getPan() != null) c.setPan(input.getPan());
        if (input.getUdyamNo() != null) c.setUdyamNo(input.getUdyamNo());
        if (input.getMsmeCategory() != null) c.setMsmeCategory(input.getMsmeCategory());
        if (input.getGstRegistrationType() != null) c.setGstRegistrationType(input.getGstRegistrationType());
        if (input.getContactPerson() != null) c.setContactPerson(input.getContactPerson());
        if (input.getEmail() != null) c.setEmail(input.getEmail());
        if (input.getPhone() != null) c.setPhone(input.getPhone());
        if (input.getPaymentTermsId() != null) c.setPaymentTermsId(input.getPaymentTermsId());
        if (input.getCreditLimit() != null) c.setCreditLimit(input.getCreditLimit());
        if (input.getCurrency() != null) c.setCurrency(input.getCurrency());
        if (input.getStatus() != null) c.setStatus(input.getStatus());
        if (input.getAddress() != null) c.setAddress(input.getAddress());
        if (input.getCity() != null) c.setCity(input.getCity());
        if (input.getState() != null) c.setState(input.getState());
        if (input.getStateCode() != null) c.setStateCode(input.getStateCode());
        if (input.getPincode() != null) c.setPincode(input.getPincode());
        if (input.getUpdatedBy() != null) c.setUpdatedBy(input.getUpdatedBy());

        return ResponseEntity.ok(customerRepository.save(c));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCustomer(@PathVariable Long id) {
        if (!customerRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        customerRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Customer deleted successfully"));
    }
}
