package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.CreateCategoryRequest;
import com.silvermuller.seals.modules.inventory.model.CategoryMaster;
import com.silvermuller.seals.modules.inventory.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ResponseEntity<List<CategoryMaster>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAll());
    }

    @PostMapping
    public ResponseEntity<CategoryMaster> createCategory(@Valid @RequestBody CreateCategoryRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(body));
    }

    @GetMapping("/{id}/usage")
    public ResponseEntity<Map<String, Object>> getUsage(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.usage(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Category deleted."));
    }
}
