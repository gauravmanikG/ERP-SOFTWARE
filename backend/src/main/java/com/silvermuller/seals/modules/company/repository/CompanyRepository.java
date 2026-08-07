package com.silvermuller.seals.modules.company.repository;

import com.silvermuller.seals.common.util.FieldMapper;
import com.silvermuller.seals.modules.company.exception.DuplicateRecordException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class CompanyRepository {

    private final JdbcTemplate jdbc;

    public CompanyRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void checkConnection() {
        jdbc.queryForObject("SELECT 1", Integer.class);
    }

    public List<Map<String, Object>> findAll(String search) {
        List<Map<String, Object>> rows;
        if (search != null && !search.trim().isEmpty()) {
            rows = jdbc.query(
                    "SELECT * FROM companies WHERE company_name ILIKE ? OR company_code ILIKE ? ORDER BY created_at DESC",
                    new ColumnMapRowMapper(),
                    "%" + search.trim() + "%", "%" + search.trim() + "%"
            );
        } else {
            rows = jdbc.query("SELECT * FROM companies ORDER BY created_at DESC", new ColumnMapRowMapper());
        }
        return rows.stream().map(FieldMapper::toCamel).toList();
    }

    public Map<String, Object> insert(Map<String, Object> body) {
        FieldMapper.Columns cols = FieldMapper.toColumns(body);
        // Check for an exact existing record with the same provided column values
        if (!cols.columns().isEmpty()) {
            String where = String.join(" AND ", cols.columns().stream().map(c -> c + " IS NOT DISTINCT FROM ?").toList());
            String dupSql = "SELECT count(*) FROM companies WHERE " + where;
            Integer cnt = jdbc.queryForObject(dupSql, Integer.class, cols.values().toArray());
            if (cnt != null && cnt > 0) {
                throw new DuplicateRecordException("Record already exists");
            }
        }
        String columnList = String.join(", ", cols.columns());
        String placeholders = cols.columns().stream().map(c -> "?").reduce((a, b) -> a + ", " + b).orElse("");
        String sql = "INSERT INTO companies (" + columnList + ") VALUES (" + placeholders + ") RETURNING *";
        Map<String, Object> row = jdbc.queryForMap(sql, cols.values().toArray());
        return FieldMapper.toCamel(row);
    }

    /** Caller must ensure body maps to at least one column (see FieldMapper.toColumns) before calling this. */
    public Optional<Map<String, Object>> update(UUID id, Map<String, Object> body) {
        FieldMapper.Columns cols = FieldMapper.toColumns(body);
        // Prevent updating to an exact duplicate of another record
        if (!cols.columns().isEmpty()) {
            String where = String.join(" AND ", cols.columns().stream().map(c -> c + " IS NOT DISTINCT FROM ?").toList());
            String dupSql = "SELECT id FROM companies WHERE " + where + " LIMIT 1";
            try {
                Map<String, Object> existing = jdbc.queryForMap(dupSql, cols.values().toArray());
                if (existing != null && existing.get("id") != null) {
                    UUID existingId = (UUID) existing.get("id");
                    if (!existingId.equals(id)) {
                        throw new DuplicateRecordException("Record already exists");
                    }
                }
            } catch (org.springframework.dao.EmptyResultDataAccessException ignored) {
                // no duplicate found — ok to proceed
            }
        }
        StringBuilder setClause = new StringBuilder();
        for (int i = 0; i < cols.columns().size(); i++) {
            if (i > 0) setClause.append(", ");
            setClause.append(cols.columns().get(i)).append(" = ?");
        }
        String sql = "UPDATE companies SET " + setClause + ", updated_at = now() WHERE id = ? RETURNING *";
        List<Object> params = new ArrayList<>(cols.values());
        params.add(id);
        try {
            Map<String, Object> row = jdbc.queryForMap(sql, params.toArray());
            return Optional.of(FieldMapper.toCamel(row));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public boolean deleteById(UUID id) {
        int updated = jdbc.update("DELETE FROM companies WHERE id = ?", id);
        return updated > 0;
    }
}
