package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.service.ItemMasterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/inventory/items", "/api/items"})
public class ItemMasterApiController {

    private final ItemMasterService items;

    public ItemMasterApiController(ItemMasterService items) {
        this.items = items;
    }

    /** All items (FG and Other), optionally filtered by search text, category/group or type (FG / OTHER). */
    @GetMapping
    public List<Map<String, Object>> getAllItems(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String type) {
        return items.list(search, category, type);
    }

    /** Creates an item, or updates it when the body carries its id. */
    @PostMapping
    public ResponseEntity<Map<String, Object>> saveItem(@RequestBody Map<String, Object> body) {
        ItemMasterService.Saved saved = items.save(body);
        return ResponseEntity.status(saved.created() ? HttpStatus.CREATED : HttpStatus.OK).body(saved.item());
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteItemById(@PathVariable long id) {
        items.delete(id);
        return Map.of("success", true, "id", id);
    }

    @DeleteMapping("/by-code/{code}")
    public Map<String, Object> deleteItemByCode(@PathVariable String code) {
        items.deleteByCode(code);
        return Map.of("success", true, "code", code);
    }
}
