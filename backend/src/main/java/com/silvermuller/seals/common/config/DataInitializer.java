package com.silvermuller.seals.common.config;

import com.silvermuller.seals.modules.inventory.model.Department;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.model.TransactionType;
import com.silvermuller.seals.modules.inventory.repository.DepartmentRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.repository.TransactionTypeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initDatabase(
            JdbcTemplate jdbc,
            DepartmentRepository deptRepo,
            TransactionTypeRepository txTypeRepo,
            MasterRepository masterRepo) {
        return args -> {
            try {
                // 1. Ensure companies table exists across all databases (PostgreSQL & H2)
                jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS companies (
                        id UUID DEFAULT RANDOM_UUID() PRIMARY KEY,
                        company_code VARCHAR(100) NOT NULL,
                        company_name VARCHAR(255) NOT NULL,
                        legal_name VARCHAR(255) DEFAULT '',
                        short_name VARCHAR(100) DEFAULT '',
                        business_type VARCHAR(100) DEFAULT 'Manufacturing',
                        industry VARCHAR(100) DEFAULT '',
                        logo TEXT DEFAULT '',
                        status VARCHAR(50) DEFAULT 'Active',
                        pan_no VARCHAR(50) DEFAULT '',
                        gstin VARCHAR(50) DEFAULT '',
                        cin_llpin VARCHAR(50) DEFAULT '',
                        tan VARCHAR(50) DEFAULT '',
                        msme_registration VARCHAR(50) DEFAULT '',
                        factory_license_no VARCHAR(50) DEFAULT '',
                        iec VARCHAR(50) DEFAULT '',
                        pf_establishment_code VARCHAR(50) DEFAULT '',
                        esi_code VARCHAR(50) DEFAULT '',
                        professional_tax_no VARCHAR(50) DEFAULT '',
                        pollution_certificate_no VARCHAR(50) DEFAULT '',
                        registered_office TEXT DEFAULT '',
                        factory_address TEXT DEFAULT '',
                        branch_address TEXT DEFAULT '',
                        city VARCHAR(100) DEFAULT '',
                        state VARCHAR(100) DEFAULT '',
                        country VARCHAR(100) DEFAULT 'India',
                        pin_code VARCHAR(20) DEFAULT '',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """);
            } catch (Exception e) {
                System.err.println("Note: Table companies check: " + e.getMessage());
            }

            // 2. Seed Transaction Types if empty
            if (txTypeRepo.count() == 0) {
                List<String> types = List.of("ISSUE", "RECEIPT", "REVERSE");
                for (String t : types) {
                    TransactionType tt = new TransactionType();
                    tt.setType(t);
                    txTypeRepo.save(tt);
                }
                System.out.println("Seeded transaction types: " + types);
            }

            // 3. Seed Departments if empty
            if (deptRepo.count() == 0) {
                List<String> depts = List.of("Production", "Maintenance", "Quality Control", "Stores", "Administration");
                for (String d : depts) {
                    Department dept = new Department();
                    dept.setName(d);
                    deptRepo.save(dept);
                }
                System.out.println("Seeded departments: " + depts);
            }

            // 4. Seed Material Master Items if empty
            if (masterRepo.count() == 0) {
                masterRepo.save(createMaster("MAT-001", "Steel Sheet", "Raw Material", "KG", new BigDecimal("5000"), "Main Store"));
                masterRepo.save(createMaster("MAT-002", "Stainless Steel Rod", "Raw Material", "KG", new BigDecimal("2500"), "Main Store"));
                masterRepo.save(createMaster("MAT-003", "Bearing 6205", "Spare Parts", "PCS", new BigDecimal("150"), "Maintenance Store"));
                masterRepo.save(createMaster("MAT-004", "Lubricating Oil", "Consumables", "LTR", new BigDecimal("500"), "Maintenance Store"));
                masterRepo.save(createMaster("MAT-005", "Welding Electrode", "Consumables", "KG", new BigDecimal("300"), "Production Store"));
                System.out.println("Seeded 5 material master items.");
            }
        };
    }

    private Master createMaster(String code, String desc, String category, String uom, BigDecimal opening, String store) {
        Master m = new Master();
        m.setCode(code);
        m.setDescription(desc);
        m.setCategory(category);
        m.setUnitOfMeasurement(uom);
        m.setOpeningBalance(opening);
        m.setStoreName(store);
        return m;
    }
}
