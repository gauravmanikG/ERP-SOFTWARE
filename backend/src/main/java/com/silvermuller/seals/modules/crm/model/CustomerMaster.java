package com.silvermuller.seals.modules.crm.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Customer Master Entity (customer_master)
 * Incorporates all Book 3 attributes & Book 5 attributes (address, city, state, state_code, pincode).
 */
@Entity
@Table(name = "customer_master")
public class CustomerMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false, unique = true, length = 50)
    private String customerId;

    @Column(name = "customer_code", nullable = false, unique = true, length = 50)
    private String customerCode;

    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;

    @Column(name = "company_id", nullable = false, length = 50)
    private String companyId = "COMP-001";

    @Column(name = "customer_type", length = 50)
    private String customerType = "OEM";

    @Column(name = "gstin", length = 50)
    private String gstin;

    @Column(name = "pan", length = 30)
    private String pan;

    @Column(name = "udyam_no", length = 50)
    private String udyamNo;

    @Column(name = "msme_category", length = 50)
    private String msmeCategory = "NOT_MSME";

    @Column(name = "gst_registration_type", nullable = false, length = 50)
    private String gstRegistrationType = "REGISTERED";

    @Column(name = "contact_person", length = 255)
    private String contactPerson;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "payment_terms_id", length = 50)
    private String paymentTermsId = "PT-30";

    @Column(name = "credit_limit", precision = 15, scale = 2)
    private BigDecimal creditLimit = new BigDecimal("500000.00");

    @Column(name = "currency", length = 10)
    private String currency = "INR";

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    // Book 5 Attributes
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "state_code", length = 10)
    private String stateCode;

    @Column(name = "pincode", length = 20)
    private String pincode;

    // Audit fields
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by", nullable = false, length = 50)
    private String createdBy = "SYSTEM";

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by", nullable = false, length = 50)
    private String updatedBy = "SYSTEM";

    public CustomerMaster() {
    }

    @PrePersist
    public void onPrePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
        if (createdBy == null || createdBy.isBlank()) {
            createdBy = "SYSTEM";
        }
        if (updatedBy == null || updatedBy.isBlank()) {
            updatedBy = "SYSTEM";
        }
        if (companyId == null || companyId.isBlank()) {
            companyId = "COMP-001";
        }
        if (status == null || status.isBlank()) {
            status = "ACTIVE";
        }
        if (currency == null || currency.isBlank()) {
            currency = "INR";
        }
        if (customerId == null && customerCode != null) {
            customerId = customerCode;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        updatedAt = OffsetDateTime.now();
        if (updatedBy == null || updatedBy.isBlank()) {
            updatedBy = "SYSTEM";
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getCustomerCode() {
        return customerCode;
    }

    public void setCustomerCode(String customerCode) {
        this.customerCode = customerCode;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCompanyId() {
        return companyId;
    }

    public void setCompanyId(String companyId) {
        this.companyId = companyId;
    }

    public String getCustomerType() {
        return customerType;
    }

    public void setCustomerType(String customerType) {
        this.customerType = customerType;
    }

    public String getGstin() {
        return gstin;
    }

    public void setGstin(String gstin) {
        this.gstin = gstin;
    }

    public String getPan() {
        return pan;
    }

    public void setPan(String pan) {
        this.pan = pan;
    }

    public String getUdyamNo() {
        return udyamNo;
    }

    public void setUdyamNo(String udyamNo) {
        this.udyamNo = udyamNo;
    }

    public String getMsmeCategory() {
        return msmeCategory;
    }

    public void setMsmeCategory(String msmeCategory) {
        this.msmeCategory = msmeCategory;
    }

    public String getGstRegistrationType() {
        return gstRegistrationType;
    }

    public void setGstRegistrationType(String gstRegistrationType) {
        this.gstRegistrationType = gstRegistrationType;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPaymentTermsId() {
        return paymentTermsId;
    }

    public void setPaymentTermsId(String paymentTermsId) {
        this.paymentTermsId = paymentTermsId;
    }

    public BigDecimal getCreditLimit() {
        return creditLimit;
    }

    public void setCreditLimit(BigDecimal creditLimit) {
        this.creditLimit = creditLimit;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getStateCode() {
        return stateCode;
    }

    public void setStateCode(String stateCode) {
        this.stateCode = stateCode;
    }

    public String getPincode() {
        return pincode;
    }

    public void setPincode(String pincode) {
        this.pincode = pincode;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
}
