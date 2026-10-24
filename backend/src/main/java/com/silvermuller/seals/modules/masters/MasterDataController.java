package com.silvermuller.seals.modules.masters;

import com.silvermuller.seals.modules.masters.MasterDataDefinitions.Definition;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Add, update and delete entries of the code-and-name masters. Delete is a soft delete: the entry is marked
 * inactive, so POs and GRNs that already use its code keep working, and a PUT with isActive=true restores it.
 * Any "meaning" or other extra field in a request body is ignored.
 */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/masters/{key}")
public class MasterDataController {

    private static final String SELECT_ROW =
            "SELECT id, code, name, is_active AS \"isActive\" FROM public.";

    private final JdbcTemplate jdbc;

    public MasterDataController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@PathVariable String key,
                                          @RequestParam(defaultValue = "false") boolean includeInactive) {
        Definition def = definition(key);
        return jdbc.queryForList(SELECT_ROW + def.table()
                + (includeInactive ? "" : " WHERE is_active = TRUE") + " ORDER BY code");
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@PathVariable String key, @RequestBody Map<String, Object> body) {
        Definition def = definition(key);
        String name = requiredName(body);
        assertNameFree(def, name, -1L);

        String code = text(body, "code");
        if (code != null && code.length() > 20) throw bad("Code can have at most 20 characters.");
        try {
            if (code == null) code = nextCode(def);
            jdbc.update("INSERT INTO public." + def.table() + " (code, name) VALUES (?, ?)", code.toUpperCase(), name);
        } catch (DuplicateKeyException e) {
            throw new MasterDataException(HttpStatus.CONFLICT, "Code " + code.toUpperCase() + " already exists.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(row(def, findId(def, code.toUpperCase())));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String key, @PathVariable long id, @RequestBody Map<String, Object> body) {
        Definition def = definition(key);
        Map<String, Object> current = row(def, id);
        String name = body.containsKey("name") ? requiredName(body) : (String) current.get("name");
        boolean active = body.get("isActive") instanceof Boolean b ? b : (Boolean) current.get("isActive");
        if (active) assertNameFree(def, name, id);

        jdbc.update("UPDATE public." + def.table() + " SET name = ?, is_active = ?, updated_at = NOW() WHERE id = ?", name, active, id);
        return row(def, id);
    }

    /** Soft delete: the entry is kept, marked inactive and hidden from the lists. */
    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String key, @PathVariable long id) {
        Definition def = definition(key);
        row(def, id);
        jdbc.update("UPDATE public." + def.table() + " SET is_active = FALSE, updated_at = NOW() WHERE id = ?", id);
        return Map.of("success", true, "id", id);
    }

    @ExceptionHandler(MasterDataException.class)
    public ResponseEntity<Map<String, String>> handle(MasterDataException e) {
        return ResponseEntity.status(e.status).body(Map.of("error", e.getMessage()));
    }

    // ------------------------------------------------------------------ helpers

    private static Definition definition(String key) {
        Definition def = MasterDataDefinitions.ALL.get(key);
        if (def == null) throw new MasterDataException(HttpStatus.NOT_FOUND, "Unknown master: " + key);
        return def;
    }

    private Map<String, Object> row(Definition def, long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(SELECT_ROW + def.table() + " WHERE id = ?", id);
        if (rows.isEmpty()) throw new MasterDataException(HttpStatus.NOT_FOUND, def.label() + " entry was not found.");
        return rows.get(0);
    }

    private long findId(Definition def, String code) {
        Long id = jdbc.queryForObject("SELECT id FROM public." + def.table() + " WHERE code = ?", Long.class, code);
        return id == null ? -1L : id;
    }

    private String nextCode(Definition def) {
        Integer n = jdbc.queryForObject(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INT)), 0) + 1 FROM public." + def.table()
                        + " WHERE code LIKE ?", Integer.class, def.codePrefix() + "%");
        return String.format("%s%03d", def.codePrefix(), n == null ? 1 : n);
    }

    /** Names are unique among active entries, ignoring case. excludeId is the entry being updated (-1 for none). */
    private void assertNameFree(Definition def, String name, long excludeId) {
        Integer clashes = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public." + def.table() + " WHERE LOWER(name) = LOWER(?) AND is_active = TRUE AND id <> ?",
                Integer.class, name, excludeId);
        if (clashes != null && clashes > 0) {
            throw new MasterDataException(HttpStatus.CONFLICT, "\"" + name + "\" already exists in " + def.label() + ".");
        }
    }

    private static String requiredName(Map<String, Object> body) {
        String name = text(body, "name");
        if (name == null) throw bad("Name is required.");
        if (name.length() > 200) throw bad("Name can have at most 200 characters.");
        return name;
    }

    private static String text(Map<String, Object> body, String field) {
        Object v = body.get(field);
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static MasterDataException bad(String message) {
        return new MasterDataException(HttpStatus.BAD_REQUEST, message);
    }

    static class MasterDataException extends RuntimeException {
        final HttpStatus status;

        MasterDataException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }
    }
}
