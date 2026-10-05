package com.silvermuller.seals.modules.crm.repository;

import com.silvermuller.seals.modules.crm.model.CustomerMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerMasterRepository extends JpaRepository<CustomerMaster, Long> {

    Optional<CustomerMaster> findByCustomerCode(String customerCode);

    List<CustomerMaster> findByStateIgnoreCase(String state);

    List<CustomerMaster> findByGstRegistrationTypeIgnoreCase(String gstRegistrationType);

    List<CustomerMaster> findAllByOrderByCustomerCodeAsc();

    @Query("SELECT c FROM CustomerMaster c WHERE " +
           "LOWER(c.customerName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.customerCode) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.gstin) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.pan) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.city) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.contactPerson) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<CustomerMaster> searchCustomers(@Param("query") String query);
}
