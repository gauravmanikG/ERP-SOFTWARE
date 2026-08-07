package com.silvermuller.seals.modules.company.controller;

import com.silvermuller.seals.modules.company.repository.CompanyRepository;
import com.silvermuller.seals.modules.company.exception.DuplicateRecordException;
import com.silvermuller.seals.common.util.FieldMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyRepository repository;

    public CompanyController(CompanyRepository repository) {
        this.repository = repository;
    }

    // GET /api/companies?search=foo — list all, newest first, optional search
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String search) {
        try {
            return ResponseEntity.ok(repository.findAll(search));
        } catch (Exception e) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch companies");
        }
    }

    // POST /api/companies — create a new record
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String companyCode = asString(body.get("companyCode"));
        String companyName = asString(body.get("companyName"));
        if (isBlank(companyCode) || isBlank(companyName)) {
            return error(HttpStatus.BAD_REQUEST, "companyCode and companyName are required");
        }
        try {
            Map<String, Object> created = repository.insert(body);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (DuplicateRecordException e) {
            return error(HttpStatus.CONFLICT, "Record already exists");
        } catch (Exception e) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create company");
        }
    }

    // PUT /api/companies/{id} — update an existing record
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        FieldMapper.Columns cols = FieldMapper.toColumns(body);
        if (cols.columns().isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "No fields to update");
        }
        try {
            Optional<Map<String, Object>> updated = repository.update(id, body);
            if (updated.isEmpty()) {
                return error(HttpStatus.NOT_FOUND, "Company not found");
            }
            return ResponseEntity.ok(updated.get());
        } catch (DuplicateRecordException e) {
            return error(HttpStatus.CONFLICT, "Record already exists");
        } catch (Exception e) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update company");
        }
    }

    // DELETE /api/companies/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        try {
            boolean deleted = repository.deleteById(id);
            if (!deleted) {
                return error(HttpStatus.NOT_FOUND, "Company not found");
            }
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete company");
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
