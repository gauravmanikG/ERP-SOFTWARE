package com.silvermuller.seals.modules.crm.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Customer Master Entity (customer_master)
 * Incorporates all attributes from the customer excel sheet + point 2 master attributes.
 */
@Entity
@Table(name = "customer_master")
public class CustomerMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Identification
    @Column(name = "customer_id", length = 50)
    private String customerId;

    @Column(name = "customer_code", length = 50)
    private String customerCode;

    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;

    @Column(name = "customer_alias", length = 150)
    private String customerAlias;

    // Organization
    @Column(name = "company_id", nullable = false, length = 50)
    private String companyId = "COMP-001";

    // Classification
    @Column(name = "customer_type", length = 50)
    private String customerType = "OEM";

    @Column(name = "domestic_export", length = 50)
    private String domesticExport = "Domestic";

    @Column(name = "market_type", length = 50)
    private String marketType = "Domestic";

    @Column(name = "customer_category", length = 50)
    private String customerCategory = "OEM";

    @Column(name = "customer_group", length = 50)
    private String customerGroup = "Automotive";

    // Tax
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

    // Verifications / Approvals
    @Column(name = "check_by_accounts")
    private Boolean checkByAccounts = false;

    @Column(name = "check_by_sales")
    private Boolean checkBySales = true;

    @Column(name = "billing_source", length = 100)
    private String billingSource;

    @Column(name = "supplier_code_sms", length = 100)
    private String supplierCodeSms;

    // Contact
    @Column(name = "contact_person", columnDefinition = "TEXT")
    private String contactPerson;

    @Column(name = "sales_person", columnDefinition = "TEXT")
    private String salesPerson;

    @Column(name = "phone", length = 255)
    private String phone;

    @Column(name = "sales_contact", length = 255)
    private String salesContact;

    @Column(name = "email", columnDefinition = "TEXT")
    private String email;

    @Column(name = "sales_email", columnDefinition = "TEXT")
    private String salesEmail;

    @Column(name = "mode_of_payment_reminder", length = 100)
    private String modeOfPaymentReminder;

    @Column(name = "accounts_contact_details", columnDefinition = "TEXT")
    private String accountsContactDetails;

    // Commercial
    @Column(name = "payment_terms_id", length = 50)
    private String paymentTermsId = "PT-30";

    @Column(name = "credit_days")
    private Integer creditDays = 30;

    @Column(name = "credit_limit", precision = 15, scale = 2)
    private BigDecimal creditLimit = new BigDecimal("500000.00");

    @Column(name = "currency", length = 10)
    private String currency = "INR";

    @Column(name = "scm", length = 255)
    private String scm;

    // Status
    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    // Address & Locations
    @Column(name = "bill_to_address", columnDefinition = "TEXT")
    private String billToAddress;

    @Column(name = "ship_to_address", columnDefinition = "TEXT")
    private String shipToAddress;

    @Column(name = "customer_address", columnDefinition = "TEXT")
    private String customerAddress;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "state_code", length = 10)
    private String stateCode;

    @Column(name = "country", length = 100)
    private String country = "India";

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
        if (country == null || country.isBlank()) {
            country = "India";
        }
        if (checkByAccounts == null) {
            checkByAccounts = false;
        }
        if (checkBySales == null) {
            checkBySales = true;
        }
        if (creditDays == null) {
            creditDays = 30;
        }
        // Harmonize person/contact/email aliases
        if (contactPerson == null && salesPerson != null) {
            contactPerson = salesPerson;
        } else if (salesPerson == null && contactPerson != null) {
            salesPerson = contactPerson;
        }
        if (phone == null && salesContact != null) {
            phone = salesContact;
        } else if (salesContact == null && phone != null) {
            salesContact = phone;
        }
        if (email == null && salesEmail != null) {
            email = salesEmail;
        } else if (salesEmail == null && email != null) {
            salesEmail = email;
        }
        // Harmonize addresses
        if (address == null) {
            address = customerAddress != null ? customerAddress : (billToAddress != null ? billToAddress : shipToAddress);
        }
        if (billToAddress == null && address != null) {
            billToAddress = address;
        }
        if (shipToAddress == null && address != null) {
            shipToAddress = address;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        updatedAt = OffsetDateTime.now();
        if (updatedBy == null || updatedBy.isBlank()) {
            updatedBy = "SYSTEM";
        }
        if (contactPerson == null && salesPerson != null) {
            contactPerson = salesPerson;
        } else if (salesPerson == null && contactPerson != null) {
            salesPerson = contactPerson;
        }
        if (phone == null && salesContact != null) {
            phone = salesContact;
        } else if (salesContact == null && phone != null) {
            salesContact = phone;
        }
        if (email == null && salesEmail != null) {
            email = salesEmail;
        } else if (salesEmail == null && email != null) {
            salesEmail = email;
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

    public String getCustomerAlias() {
        return customerAlias;
    }

    public void setCustomerAlias(String customerAlias) {
        this.customerAlias = customerAlias;
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

    public String getDomesticExport() {
        return domesticExport;
    }

    public void setDomesticExport(String domesticExport) {
        this.domesticExport = domesticExport;
    }

    public String getMarketType() {
        return marketType;
    }

    public void setMarketType(String marketType) {
        this.marketType = marketType;
    }

    public String getCustomerCategory() {
        return customerCategory;
    }

    public void setCustomerCategory(String customerCategory) {
        this.customerCategory = customerCategory;
    }

    public String getCustomerGroup() {
        return customerGroup;
    }

    public void setCustomerGroup(String customerGroup) {
        this.customerGroup = customerGroup;
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

    public Boolean getCheckByAccounts() {
        return checkByAccounts;
    }

    public void setCheckByAccounts(Boolean checkByAccounts) {
        this.checkByAccounts = checkByAccounts;
    }

    public Boolean getCheckBySales() {
        return checkBySales;
    }

    public void setCheckBySales(Boolean checkBySales) {
        this.checkBySales = checkBySales;
    }

    public String getBillingSource() {
        return billingSource;
    }

    public void setBillingSource(String billingSource) {
        this.billingSource = billingSource;
    }

    public String getSupplierCodeSms() {
        return supplierCodeSms;
    }

    public void setSupplierCodeSms(String supplierCodeSms) {
        this.supplierCodeSms = supplierCodeSms;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getSalesPerson() {
        return salesPerson;
    }

    public void setSalesPerson(String salesPerson) {
        this.salesPerson = salesPerson;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getSalesContact() {
        return salesContact;
    }

    public void setSalesContact(String salesContact) {
        this.salesContact = salesContact;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSalesEmail() {
        return salesEmail;
    }

    public void setSalesEmail(String salesEmail) {
        this.salesEmail = salesEmail;
    }

    public String getModeOfPaymentReminder() {
        return modeOfPaymentReminder;
    }

    public void setModeOfPaymentReminder(String modeOfPaymentReminder) {
        this.modeOfPaymentReminder = modeOfPaymentReminder;
    }

    public String getAccountsContactDetails() {
        return accountsContactDetails;
    }

    public void setAccountsContactDetails(String accountsContactDetails) {
        this.accountsContactDetails = accountsContactDetails;
    }

    public String getPaymentTermsId() {
        return paymentTermsId;
    }

    public void setPaymentTermsId(String paymentTermsId) {
        this.paymentTermsId = paymentTermsId;
    }

    public Integer getCreditDays() {
        return creditDays;
    }

    public void setCreditDays(Integer creditDays) {
        this.creditDays = creditDays;
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

    public String getScm() {
        return scm;
    }

    public void setScm(String scm) {
        this.scm = scm;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getBillToAddress() {
        return billToAddress;
    }

    public void setBillToAddress(String billToAddress) {
        this.billToAddress = billToAddress;
    }

    public String getShipToAddress() {
        return shipToAddress;
    }

    public void setShipToAddress(String shipToAddress) {
        this.shipToAddress = shipToAddress;
    }

    public String getCustomerAddress() {
        return customerAddress;
    }

    public void setCustomerAddress(String customerAddress) {
        this.customerAddress = customerAddress;
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

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
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
