package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.service.ItemGroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory/item-groups")
public class ItemGroupController {

    private final ItemGroupService itemGroupService;

    public ItemGroupController(ItemGroupService itemGroupService) {
        this.itemGroupService = itemGroupService;
    }

    /** Groups with their subgroups. */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getTree() {
        return ResponseEntity.ok(itemGroupService.getTree());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createGroup(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(itemGroupService.createGroup(body.get("name"), body.get("code"), body.get("description")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateGroup(@PathVariable Long id, @RequestBody Map<String, String> body) {
        itemGroupService.updateGroup(id, body.get("name"), body.get("code"), body.get("description"));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        itemGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/subgroups")
    public ResponseEntity<Map<String, Object>> createSubgroup(@PathVariable Long groupId, @RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(itemGroupService.createSubgroup(groupId, body.get("name"), body.get("code"), body.get("description")));
    }

    @PutMapping("/subgroups/{id}")
    public ResponseEntity<Void> updateSubgroup(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long groupId = body.get("groupId") != null ? Long.valueOf(body.get("groupId").toString()) : null;
        itemGroupService.updateSubgroup(id, groupId, (String) body.get("name"), (String) body.get("code"), (String) body.get("description"));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/subgroups/{id}")
    public ResponseEntity<Void> deleteSubgroup(@PathVariable Long id) {
        itemGroupService.deleteSubgroup(id);
        return ResponseEntity.noContent().build();
    }

    /** Copies groups and subgroups saved in a browser into the database. */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importGroups(@RequestBody List<Map<String, Object>> groups) {
        return ResponseEntity.ok(Map.of("added", itemGroupService.importGroups(groups)));
    }

    /** Restores the default groups and subgroups, removing user changes. */
    @PostMapping("/reset")
    public ResponseEntity<List<Map<String, Object>>> reset() {
        return ResponseEntity.ok(itemGroupService.resetToDefaults());
    }
}
