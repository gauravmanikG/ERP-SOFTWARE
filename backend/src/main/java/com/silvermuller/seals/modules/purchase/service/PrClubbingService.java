package com.silvermuller.seals.modules.purchase.service;

import com.silvermuller.seals.modules.purchase.dto.ConsolidatedEligibleItemDto;
import com.silvermuller.seals.modules.purchase.dto.CreateClubbingBatchRequest;
import com.silvermuller.seals.modules.purchase.dto.SourcePrAllocationDto;
import com.silvermuller.seals.modules.purchase.model.PrClubbingAllocation;
import com.silvermuller.seals.modules.purchase.model.PrClubbingBatch;
import com.silvermuller.seals.modules.purchase.model.PrClubbingBatchItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class PrClubbingService {

    private final JdbcTemplate jdbc;
    private final PurchaseRequisitionService prService;

    public PrClubbingService(JdbcTemplate jdbc, PurchaseRequisitionService prService) {
        this.jdbc = jdbc;
        this.prService = prService;
    }

    /**
     * 1. Get Consolidated Eligible Requirements
     * Aggregates approved PR line items by itemCode and UOM.
     * Prevents over-allocation by deducting quantities currently locked in active DRAFT or READY batches.
     */
    public List<ConsolidatedEligibleItemDto> getConsolidatedEligibleRequirements(String search, String category, String uom, String department) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT pri.id AS pr_item_id, pri.pr_id, pri.pr_number, pri.item_code, pri.item_name, ");
        sql.append("pri.description, pri.category, pri.uom, pri.req_qty, pri.ordered_qty, pri.remaining_qty, ");
        sql.append("pri.est_rate, pri.remarks, ");
        sql.append("pr.pr_date, pr.required_date, pr.requisitioner, pr.department, pr.store, pr.priority, pr.status AS pr_status, ");
        sql.append("COALESCE((SELECT SUM(a.remaining_qty) FROM pr_clubbing_allocations a ");
        sql.append(" JOIN pr_clubbing_batches b ON a.batch_id = b.id ");
        sql.append(" WHERE a.pr_item_id = pri.id AND b.status IN ('DRAFT', 'READY_FOR_PURCHASE') AND a.status = 'ALLOCATED'), 0) AS locked_batch_qty ");
        sql.append("FROM purchase_requisition_items pri ");
        sql.append("JOIN purchase_requisitions pr ON pri.pr_id = pr.id ");
        sql.append("WHERE pr.status IN ('Approved', 'Partially Ordered', 'PO Generated') ");
        sql.append("AND pri.remaining_qty > 0 ");

        List<Object> params = new ArrayList<>();

        if (search != null && !search.trim().isEmpty()) {
            String q = "%" + search.trim().toLowerCase() + "%";
            sql.append("AND (LOWER(pri.item_code) LIKE ? OR LOWER(pri.item_name) LIKE ? OR LOWER(pri.pr_number) LIKE ? OR LOWER(pr.department) LIKE ? OR LOWER(pr.requisitioner) LIKE ?) ");
            params.add(q);
            params.add(q);
            params.add(q);
            params.add(q);
            params.add(q);
        }

        if (category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category)) {
            sql.append("AND LOWER(pri.category) = ? ");
            params.add(category.trim().toLowerCase());
        }

        if (uom != null && !uom.trim().isEmpty() && !"ALL".equalsIgnoreCase(uom)) {
            sql.append("AND LOWER(pri.uom) = ? ");
            params.add(uom.trim().toLowerCase());
        }

        if (department != null && !department.trim().isEmpty() && !"ALL".equalsIgnoreCase(department)) {
            sql.append("AND LOWER(pr.department) = ? ");
            params.add(department.trim().toLowerCase());
        }

        sql.append("ORDER BY pri.item_code ASC, pr.pr_date ASC, pri.id ASC");

        List<SourcePrAllocationDto> rawList = jdbc.query(sql.toString(), (rs, rowNum) -> {
            SourcePrAllocationDto dto = new SourcePrAllocationDto();
            dto.setPrItemId(rs.getLong("pr_item_id"));
            dto.setPrId(rs.getLong("pr_id"));
            dto.setPrNumber(rs.getString("pr_number"));
            dto.setItemCode(rs.getString("item_code"));
            dto.setItemName(rs.getString("item_name"));
            dto.setUom(rs.getString("uom"));
            dto.setReqQty(rs.getBigDecimal("req_qty"));
            dto.setOrderedQty(rs.getBigDecimal("ordered_qty"));
            
            BigDecimal rawRem = rs.getBigDecimal("remaining_qty");
            BigDecimal locked = rs.getBigDecimal("locked_batch_qty");
            BigDecimal netAvailable = rawRem.subtract(locked).max(BigDecimal.ZERO);
            dto.setRemainingQty(netAvailable);

            dto.setEstRate(rs.getBigDecimal("est_rate") != null ? rs.getBigDecimal("est_rate") : BigDecimal.ZERO);
            dto.setRemarks(rs.getString("remarks"));

            Date prD = rs.getDate("pr_date");
            if (prD != null) dto.setPrDate(prD.toLocalDate());
            Date reqD = rs.getDate("required_date");
            if (reqD != null) dto.setRequiredDate(reqD.toLocalDate());

            dto.setRequisitioner(rs.getString("requisitioner"));
            dto.setDepartment(rs.getString("department"));
            dto.setStore(rs.getString("store"));
            dto.setPriority(rs.getString("priority"));
            return dto;
        }, params.toArray());

        // Group by itemCode and UOM (Strict constraint: Incompatible UOMs are kept separate!)
        Map<String, ConsolidatedEligibleItemDto> map = new LinkedHashMap<>();

        for (SourcePrAllocationDto src : rawList) {
            // Only consider items with net positive available quantity
            if (src.getRemainingQty() == null || src.getRemainingQty().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            String key = src.getItemCode().trim().toUpperCase() + "___" + src.getUom().trim().toUpperCase();
            ConsolidatedEligibleItemDto group = map.computeIfAbsent(key, k -> {
                ConsolidatedEligibleItemDto c = new ConsolidatedEligibleItemDto();
                c.setItemCode(src.getItemCode());
                c.setItemName(src.getItemName());
                c.setUom(src.getUom());
                return c;
            });

            group.setCombinedEligibleQty(group.getCombinedEligibleQty().add(src.getRemainingQty()));
            if (!group.getSourcePrNumbers().contains(src.getPrNumber())) {
                group.getSourcePrNumbers().add(src.getPrNumber());
            }
            group.getSourceAllocations().add(src);

            // Compute weighted average rate or fallback rate
            BigDecimal currentTotalAmount = group.getTotalEstAmount().add(src.getRemainingQty().multiply(src.getEstRate()));
            group.setTotalEstAmount(currentTotalAmount);
        }

        List<ConsolidatedEligibleItemDto> result = new ArrayList<>(map.values());
        for (ConsolidatedEligibleItemDto it : result) {
            it.setSourcePrCount(it.getSourcePrNumbers().size());
            if (it.getCombinedEligibleQty().compareTo(BigDecimal.ZERO) > 0) {
                it.setAvgEstRate(it.getTotalEstAmount().divide(it.getCombinedEligibleQty(), 2, RoundingMode.HALF_UP));
            }
        }

        return result;
    }

    /**
     * 2. Create Clubbing Batch
     * Saves batch header, batch items, and exact PR line allocations.
     * Transactional and validates against concurrent over-allocation.
     */
    @Transactional
    public PrClubbingBatch createBatch(CreateClubbingBatchRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cannot create clubbing batch without items");
        }

        // Generate next batch number (e.g., CB-2026-00001)
        Long nextId = jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) + 1 FROM pr_clubbing_batches", Long.class);
        String batchNumber = "CB-2026-" + String.format("%05d", nextId);

        String batchName = (request.getBatchName() != null && !request.getBatchName().trim().isEmpty())
                ? request.getBatchName().trim()
                : "Consolidated Batch #" + batchNumber;

        String createdBy = (request.getCreatedBy() != null && !request.getCreatedBy().trim().isEmpty())
                ? request.getCreatedBy().trim()
                : "Purchase Officer";

        BigDecimal totalBatchQty = BigDecimal.ZERO;
        for (CreateClubbingBatchRequest.ClubbingItemRequest it : request.getItems()) {
            if (it.getClubbedQty() == null || it.getClubbedQty().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Clubbed quantity must be greater than 0 for item: " + it.getItemCode());
            }
            totalBatchQty = totalBatchQty.add(it.getClubbedQty());
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        final BigDecimal fTotalBatchQty = totalBatchQty;
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO pr_clubbing_batches (batch_number, batch_name, status, total_items_count, " +
                            "total_clubbed_qty, purchased_qty, remaining_qty, notes, created_by, created_at, updated_at) " +
                            "VALUES (?, ?, 'READY_FOR_PURCHASE', ?, ?, 0.00, ?, ?, ?, NOW(), NOW())",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, batchNumber);
            ps.setString(2, batchName);
            ps.setInt(3, request.getItems().size());
            ps.setBigDecimal(4, fTotalBatchQty);
            ps.setBigDecimal(5, fTotalBatchQty);
            ps.setString(6, request.getNotes() != null ? request.getNotes().trim() : "");
            ps.setString(7, createdBy);
            return ps;
        }, keyHolder);

        Number batchKey = (Number) (keyHolder.getKeys() != null ? keyHolder.getKeys().get("id") : keyHolder.getKey());
        Long batchId = batchKey.longValue();

        // Save items and source allocations
        for (CreateClubbingBatchRequest.ClubbingItemRequest itemReq : request.getItems()) {
            // Ensure UOM is resolved if omitted
            if (itemReq.getUom() == null || itemReq.getUom().trim().isEmpty()) {
                List<String> uomList = jdbc.query(
                        "SELECT uom FROM purchase_requisition_items WHERE item_code = ? AND uom IS NOT NULL LIMIT 1",
                        (rs, rn) -> rs.getString("uom"), itemReq.getItemCode());
                itemReq.setUom(!uomList.isEmpty() ? uomList.get(0) : "PCS");
            }

            KeyHolder itemKeyHolder = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                        "INSERT INTO pr_clubbing_batch_items (batch_id, batch_number, item_code, item_name, description, " +
                                "category, uom, total_clubbed_qty, purchased_qty, remaining_qty, est_rate, status, created_at, updated_at) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, 'PENDING', NOW(), NOW())",
                        Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, batchId);
                ps.setString(2, batchNumber);
                ps.setString(3, itemReq.getItemCode());
                ps.setString(4, itemReq.getItemName() != null ? itemReq.getItemName() : itemReq.getItemCode());
                ps.setString(5, itemReq.getDescription() != null ? itemReq.getDescription() : "");
                ps.setString(6, itemReq.getCategory() != null ? itemReq.getCategory() : "Bought-Out Parts");
                ps.setString(7, itemReq.getUom());
                ps.setBigDecimal(8, itemReq.getClubbedQty());
                ps.setBigDecimal(9, itemReq.getClubbedQty());
                ps.setBigDecimal(10, itemReq.getEstRate() != null ? itemReq.getEstRate() : BigDecimal.ZERO);
                return ps;
            }, itemKeyHolder);

            Number batchItemKey = (Number) (itemKeyHolder.getKeys() != null ? itemKeyHolder.getKeys().get("id") : itemKeyHolder.getKey());
            Long batchItemId = batchItemKey.longValue();

            // Handle allocations
            List<CreateClubbingBatchRequest.ItemAllocationRequest> allocList = itemReq.getAllocations();
            if (allocList == null || allocList.isEmpty()) {
                // If allocations not explicitly mapped, auto-allocate from eligible unpurchased PR items
                allocList = autoDistributeAllocations(batchItemId, itemReq.getItemCode(), itemReq.getUom(), itemReq.getClubbedQty());
            }

            for (CreateClubbingBatchRequest.ItemAllocationRequest allocReq : allocList) {
                if (allocReq.getPrItemId() == null && allocReq.getPrNumber() != null) {
                    List<Long> prItemIds = jdbc.query(
                            "SELECT id FROM purchase_requisition_items WHERE pr_number = ? AND item_code = ? LIMIT 1",
                            (rs, rn) -> rs.getLong("id"), allocReq.getPrNumber(), itemReq.getItemCode());
                    if (!prItemIds.isEmpty()) {
                        allocReq.setPrItemId(prItemIds.get(0));
                    }
                }
                if (allocReq.getPrId() == null && allocReq.getPrNumber() != null) {
                    List<Long> prIds = jdbc.query(
                            "SELECT id FROM purchase_requisitions WHERE pr_number = ? LIMIT 1",
                            (rs, rn) -> rs.getLong("id"), allocReq.getPrNumber());
                    if (!prIds.isEmpty()) {
                        allocReq.setPrId(prIds.get(0));
                    }
                }

                if (allocReq.getPrItemId() == null) {
                    throw new IllegalArgumentException("Cannot resolve PR Item ID for PR #" + allocReq.getPrNumber() + " item " + itemReq.getItemCode());
                }

                // Concurrency and Over-allocation Check: Lock PR item row for update!
                BigDecimal actualRemaining = jdbc.queryForObject(
                        "SELECT remaining_qty FROM purchase_requisition_items WHERE id = ? FOR UPDATE",
                        BigDecimal.class, allocReq.getPrItemId());

                if (actualRemaining == null || actualRemaining.compareTo(allocReq.getAllocateQty()) < 0) {
                    throw new IllegalArgumentException("Insufficient remaining quantity on PR #" + allocReq.getPrNumber() +
                            " for item " + itemReq.getItemCode() + ". Available: " + actualRemaining + ", Requested: " + allocReq.getAllocateQty());
                }

                jdbc.update(
                        "INSERT INTO pr_clubbing_allocations (batch_id, batch_item_id, pr_id, pr_number, pr_item_id, " +
                                "item_code, allocated_qty, purchased_qty, remaining_qty, status, created_at, updated_at) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'ALLOCATED', NOW(), NOW())",
                        batchId, batchItemId, allocReq.getPrId(), allocReq.getPrNumber(), allocReq.getPrItemId(),
                        itemReq.getItemCode(), allocReq.getAllocateQty(), allocReq.getAllocateQty());
            }
        }

        return getBatchById(batchId).orElseThrow();
    }

    private List<CreateClubbingBatchRequest.ItemAllocationRequest> autoDistributeAllocations(
            Long batchItemId, String itemCode, String uom, BigDecimal targetQty) {
        String sql;
        List<Map<String, Object>> rows = Collections.emptyList();
        if (uom != null && !uom.trim().isEmpty()) {
            sql = "SELECT pri.id AS pr_item_id, pri.pr_id, pri.pr_number, pri.remaining_qty, " +
                    "COALESCE((SELECT SUM(a.remaining_qty) FROM pr_clubbing_allocations a " +
                    " JOIN pr_clubbing_batches b ON a.batch_id = b.id " +
                    " WHERE a.pr_item_id = pri.id AND b.status IN ('DRAFT', 'READY_FOR_PURCHASE') AND a.status = 'ALLOCATED'), 0) AS locked_qty " +
                    "FROM purchase_requisition_items pri " +
                    "JOIN purchase_requisitions pr ON pri.pr_id = pr.id " +
                    "WHERE pri.item_code = ? AND UPPER(TRIM(pri.uom)) = UPPER(TRIM(?)) AND UPPER(TRIM(pr.status)) IN ('APPROVED', 'PARTIALLY ORDERED', 'PO GENERATED') " +
                    "AND pri.remaining_qty > 0 " +
                    "ORDER BY pr.pr_date ASC, pri.id ASC";
            rows = jdbc.queryForList(sql, itemCode, uom);
        }
        if (rows.isEmpty()) {
            sql = "SELECT pri.id AS pr_item_id, pri.pr_id, pri.pr_number, pri.remaining_qty, " +
                    "COALESCE((SELECT SUM(a.remaining_qty) FROM pr_clubbing_allocations a " +
                    " JOIN pr_clubbing_batches b ON a.batch_id = b.id " +
                    " WHERE a.pr_item_id = pri.id AND b.status IN ('DRAFT', 'READY_FOR_PURCHASE') AND a.status = 'ALLOCATED'), 0) AS locked_qty " +
                    "FROM purchase_requisition_items pri " +
                    "JOIN purchase_requisitions pr ON pri.pr_id = pr.id " +
                    "WHERE pri.item_code = ? AND UPPER(TRIM(pr.status)) IN ('APPROVED', 'PARTIALLY ORDERED', 'PO GENERATED') " +
                    "AND pri.remaining_qty > 0 " +
                    "ORDER BY pr.pr_date ASC, pri.id ASC";
            rows = jdbc.queryForList(sql, itemCode);
        }
        List<CreateClubbingBatchRequest.ItemAllocationRequest> result = new ArrayList<>();
        BigDecimal remainingToAllocate = targetQty;

        for (Map<String, Object> r : rows) {
            if (remainingToAllocate.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal rem = (BigDecimal) r.get("remaining_qty");
            BigDecimal locked = (BigDecimal) r.get("locked_qty");
            BigDecimal available = rem.subtract(locked).max(BigDecimal.ZERO);

            if (available.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal alloc = available.min(remainingToAllocate);
                CreateClubbingBatchRequest.ItemAllocationRequest ar = new CreateClubbingBatchRequest.ItemAllocationRequest();
                ar.setPrId(((Number) r.get("pr_id")).longValue());
                ar.setPrNumber((String) r.get("pr_number"));
                ar.setPrItemId(((Number) r.get("pr_item_id")).longValue());
                ar.setItemCode(itemCode);
                ar.setAllocateQty(alloc);
                result.add(ar);

                remainingToAllocate = remainingToAllocate.subtract(alloc);
            }
        }

        if (remainingToAllocate.compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalArgumentException("Cannot allocate requested quantity (" + targetQty +
                    ") for item " + itemCode + ". Available unallocated balance is insufficient.");
        }

        return result;
    }

    /**
     * 3. List all batches
     */
    public List<PrClubbingBatch> getAllBatches(String statusFilter) {
        StringBuilder sql = new StringBuilder("SELECT * FROM pr_clubbing_batches ");
        List<Object> params = new ArrayList<>();
        if (statusFilter != null && !statusFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(statusFilter)) {
            sql.append("WHERE status = ? ");
            params.add(statusFilter.trim().toUpperCase());
        }
        sql.append("ORDER BY id DESC");

        List<PrClubbingBatch> batches = jdbc.query(sql.toString(), batchRowMapper, params.toArray());
        for (PrClubbingBatch b : batches) {
            b.setItems(getItemsByBatchId(b.getId()));
        }
        return batches;
    }

    /**
     * 4. Get batch by ID with items and full source allocations
     */
    public Optional<PrClubbingBatch> getBatchById(Long id) {
        List<PrClubbingBatch> list = jdbc.query("SELECT * FROM pr_clubbing_batches WHERE id = ?", batchRowMapper, id);
        if (list.isEmpty()) return Optional.empty();
        PrClubbingBatch b = list.get(0);
        b.setItems(getItemsWithAllocationsByBatchId(b.getId()));
        return Optional.of(b);
    }

    /**
     * 5. Update batch status
     */
    @Transactional
    public PrClubbingBatch updateBatchStatus(Long id, String status) {
        PrClubbingBatch b = getBatchById(id).orElseThrow(
                () -> new IllegalArgumentException("Batch not found with id: " + id));

        String upperStatus = status.trim().toUpperCase();
        if ("CANCELLED".equals(upperStatus)) {
            // Release allocations
            jdbc.update("UPDATE pr_clubbing_allocations SET status = 'RELEASED', updated_at = NOW() WHERE batch_id = ?", id);
            jdbc.update("UPDATE pr_clubbing_batch_items SET status = 'CANCELLED', updated_at = NOW() WHERE batch_id = ?", id);
            jdbc.update("UPDATE pr_clubbing_batches SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?", id);
        } else {
            jdbc.update("UPDATE pr_clubbing_batches SET status = ?, updated_at = NOW() WHERE id = ?", upperStatus, id);
        }
        return getBatchById(id).orElse(b);
    }

    /**
     * 6. Delete batch (only if not purchased)
     */
    @Transactional
    public void deleteBatch(Long id) {
        PrClubbingBatch b = getBatchById(id).orElseThrow(
                () -> new IllegalArgumentException("Batch not found with id: " + id));

        if ("FULLY_PURCHASED".equalsIgnoreCase(b.getStatus()) || "PARTIALLY_PURCHASED".equalsIgnoreCase(b.getStatus())) {
            throw new IllegalStateException("Cannot delete a batch that has purchased quantities. Current status: " + b.getStatus());
        }

        jdbc.update("DELETE FROM pr_clubbing_allocations WHERE batch_id = ?", id);
        jdbc.update("DELETE FROM pr_clubbing_batch_items WHERE batch_id = ?", id);
        jdbc.update("DELETE FROM pr_clubbing_batches WHERE id = ?", id);
    }

    /**
     * 7. Handoff to PO Creation
     * Formats the consolidated requirements into an approved PR-like payload that pre-populates
     * the existing Purchase Order screen (PurchaseOrderPage.jsx).
     */
    public Map<String, Object> generatePoHandoff(Long batchId, List<Long> itemIds) {
        PrClubbingBatch batch = getBatchById(batchId).orElseThrow(
                () -> new IllegalArgumentException("Clubbing batch not found with id: " + batchId));

        List<PrClubbingBatchItem> targetItems = batch.getItems();
        if (itemIds != null && !itemIds.isEmpty()) {
            targetItems = targetItems.stream().filter(it -> itemIds.contains(it.getId())).toList();
        }

        // Build list of items formatted for PurchaseOrderPage purchaseLines
        List<Map<String, Object>> poLineItems = new ArrayList<>();
        List<String> sourcePrs = new ArrayList<>();

        for (PrClubbingBatchItem bi : targetItems) {
            BigDecimal buyQty = bi.getRemainingQty().compareTo(BigDecimal.ZERO) > 0 ? bi.getRemainingQty() : bi.getTotalClubbedQty();

            // Collect source PR references
            for (PrClubbingAllocation a : bi.getAllocations()) {
                if (!sourcePrs.contains(a.getPrNumber())) {
                    sourcePrs.add(a.getPrNumber());
                }
            }

            Map<String, Object> line = new LinkedHashMap<>();
            line.put("id", "CB-LINE-" + bi.getId());
            line.put("itemCode", bi.getItemCode());
            line.put("itemName", bi.getItemName());
            line.put("description", bi.getDescription());
            line.put("category", bi.getCategory() != null ? bi.getCategory() : "Bought-Out Parts");
            line.put("uom", bi.getUom());
            line.put("req_qty", buyQty);
            line.put("remaining_qty", buyQty);
            line.put("ordered_qty", 0);
            line.put("est_rate", bi.getEstRate());
            line.put("remarks", "Consolidated in Batch #" + batch.getBatchNumber() + " (Source PRs: " + String.join(", ", sourcePrs) + ")");
            line.put("clubbingBatchId", batch.getId());
            line.put("clubbingBatchNumber", batch.getBatchNumber());
            line.put("clubbingBatchItemId", bi.getId());
            poLineItems.add(line);
        }

        Map<String, Object> handoff = new LinkedHashMap<>();
        handoff.put("isClubbingBatch", true);
        handoff.put("clubbingBatchId", batch.getId());
        handoff.put("clubbingBatchNumber", batch.getBatchNumber());
        handoff.put("pr_number", batch.getBatchNumber());
        handoff.put("pr_date", LocalDate.now().toString());
        handoff.put("required_date", LocalDate.now().plusDays(7).toString());
        handoff.put("department", "Consolidated Procurement");
        handoff.put("requisitioner", batch.getCreatedBy());
        handoff.put("priority", "High");
        handoff.put("purpose", "Clubbed Procurement: " + batch.getBatchName() + " (Sources: " + String.join(", ", sourcePrs) + ")");
        handoff.put("remarks", batch.getNotes() != null ? batch.getNotes() : "");
        handoff.put("items", poLineItems);

        return handoff;
    }

    /**
     * 8. Transactional PO Allocation Linker
     * Called when a PO is created / approved for items originating from a clubbing batch.
     * Atomically attributes purchased quantities to the source PR lines, updates batch item status,
     * updates purchase_requisition_items ordered_qty and remaining_qty, and links the PO!
     */
    @Transactional
    public void recordPurchaseAllocations(String poNumber, String poId, Long batchId, String itemCode, BigDecimal purchasedQty) {
        if (purchasedQty == null || purchasedQty.compareTo(BigDecimal.ZERO) <= 0) return;

        // 1. Find batch item
        List<Long> itemIds = jdbc.queryForList(
                "SELECT id FROM pr_clubbing_batch_items WHERE batch_id = ? AND item_code = ?",
                Long.class, batchId, itemCode);
        if (itemIds.isEmpty()) return;
        Long batchItemId = itemIds.get(0);

        // 2. Fetch allocations with available remaining qty
        List<Map<String, Object>> allocRows = jdbc.queryForList(
                "SELECT id, pr_id, pr_number, pr_item_id, remaining_qty FROM pr_clubbing_allocations " +
                        "WHERE batch_item_id = ? AND remaining_qty > 0 AND status = 'ALLOCATED' " +
                        "ORDER BY id ASC FOR UPDATE", batchItemId);

        BigDecimal qtyToAllocate = purchasedQty;

        for (Map<String, Object> row : allocRows) {
            if (qtyToAllocate.compareTo(BigDecimal.ZERO) <= 0) break;

            Long allocId = ((Number) row.get("id")).longValue();
            Long prItemId = ((Number) row.get("pr_item_id")).longValue();
            String prNumber = (String) row.get("pr_number");
            BigDecimal allocRem = (BigDecimal) row.get("remaining_qty");

            BigDecimal deduct = allocRem.min(qtyToAllocate);

            // Update allocation
            jdbc.update(
                    "UPDATE pr_clubbing_allocations SET purchased_qty = purchased_qty + ?, " +
                            "remaining_qty = remaining_qty - ?, po_id = ?, po_number = ?, " +
                            "status = CASE WHEN remaining_qty - ? = 0 THEN 'PURCHASED' ELSE 'ALLOCATED' END, " +
                            "updated_at = NOW() WHERE id = ?",
                    deduct, deduct, poId, poNumber, deduct, allocId);

            // Reserve on the source PR line: locked and checked against its remaining quantity (also recalculates PR status)
            prService.reserveOrdered(prItemId, deduct);

            qtyToAllocate = qtyToAllocate.subtract(deduct);
        }

        // If batch had no pre-inserted allocations or has unallocated quantity remaining, allocate directly to source PR lines
        if (qtyToAllocate.compareTo(BigDecimal.ZERO) > 0) {
            List<Map<String, Object>> fallbackPrItems = jdbc.queryForList(
                    "SELECT pri.id AS pr_item_id, pri.pr_id, pri.pr_number, pri.remaining_qty " +
                    "FROM purchase_requisition_items pri " +
                    "JOIN purchase_requisitions pr ON pri.pr_id = pr.id " +
                    "WHERE pri.item_code = ? AND pri.remaining_qty > 0 " +
                    "AND UPPER(TRIM(pr.status)) IN ('APPROVED', 'PARTIALLY ORDERED', 'PO GENERATED') " +
                    "ORDER BY pr.pr_date ASC, pri.id ASC FOR UPDATE", itemCode);

            for (Map<String, Object> prItem : fallbackPrItems) {
                if (qtyToAllocate.compareTo(BigDecimal.ZERO) <= 0) break;
                Long prItemId = ((Number) prItem.get("pr_item_id")).longValue();
                Long prId = ((Number) prItem.get("pr_id")).longValue();
                String prNum = (String) prItem.get("pr_number");
                BigDecimal prRem = (BigDecimal) prItem.get("remaining_qty");

                BigDecimal deduct = prRem.min(qtyToAllocate);

                // Insert allocation row
                jdbc.update(
                        "INSERT INTO pr_clubbing_allocations (batch_id, batch_item_id, pr_id, pr_number, pr_item_id, " +
                        "item_code, allocated_qty, purchased_qty, remaining_qty, po_id, po_number, status, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, 'PURCHASED', NOW(), NOW())",
                        batchId, batchItemId, prId, prNum, prItemId, itemCode, deduct, deduct, poId, poNumber);

                // Reserve on the PR line: locked and checked against its remaining quantity (also recalculates PR status)
                prService.reserveOrdered(prItemId, deduct);

                qtyToAllocate = qtyToAllocate.subtract(deduct);
            }
        }

        // 3. Update batch item purchased and remaining qty
        jdbc.update(
                "UPDATE pr_clubbing_batch_items SET purchased_qty = purchased_qty + ?, " +
                        "remaining_qty = GREATEST(0, total_clubbed_qty - (purchased_qty + ?)), " +
                        "status = CASE WHEN total_clubbed_qty - (purchased_qty + ?) <= 0 THEN 'FULLY_PURCHASED' ELSE 'PARTIALLY_PURCHASED' END, " +
                        "updated_at = NOW() WHERE id = ?",
                purchasedQty, purchasedQty, purchasedQty, batchItemId);

        // 4. Update overall batch metrics and status
        jdbc.update(
                "UPDATE pr_clubbing_batches SET purchased_qty = purchased_qty + ?, " +
                        "remaining_qty = GREATEST(0, total_clubbed_qty - (purchased_qty + ?)), " +
                        "status = CASE WHEN total_clubbed_qty - (purchased_qty + ?) <= 0 THEN 'FULLY_PURCHASED' ELSE 'PARTIALLY_PURCHASED' END, " +
                        "updated_at = NOW() WHERE id = ?",
                purchasedQty, purchasedQty, purchasedQty, batchId);
    }

    // Helpers
    private List<PrClubbingBatchItem> getItemsByBatchId(Long batchId) {
        return jdbc.query("SELECT * FROM pr_clubbing_batch_items WHERE batch_id = ? ORDER BY id ASC", batchItemRowMapper, batchId);
    }

    private List<PrClubbingBatchItem> getItemsWithAllocationsByBatchId(Long batchId) {
        List<PrClubbingBatchItem> items = getItemsByBatchId(batchId);
        for (PrClubbingBatchItem it : items) {
            it.setAllocations(getAllocationsByBatchItemId(it.getId()));
        }
        return items;
    }

    private List<PrClubbingAllocation> getAllocationsByBatchItemId(Long batchItemId) {
        return jdbc.query("SELECT * FROM pr_clubbing_allocations WHERE batch_item_id = ? ORDER BY id ASC", allocationRowMapper, batchItemId);
    }

    // Row Mappers
    private final RowMapper<PrClubbingBatch> batchRowMapper = (rs, rowNum) -> {
        PrClubbingBatch b = new PrClubbingBatch();
        b.setId(rs.getLong("id"));
        b.setBatchNumber(rs.getString("batch_number"));
        b.setBatchName(rs.getString("batch_name"));
        b.setStatus(rs.getString("status"));
        b.setTotalItemsCount(rs.getInt("total_items_count"));
        b.setTotalClubbedQty(rs.getBigDecimal("total_clubbed_qty"));
        b.setPurchasedQty(rs.getBigDecimal("purchased_qty"));
        b.setRemainingQty(rs.getBigDecimal("remaining_qty"));
        b.setNotes(rs.getString("notes"));
        b.setCreatedBy(rs.getString("created_by"));
        Timestamp ca = rs.getTimestamp("created_at");
        if (ca != null) b.setCreatedAt(ca.toInstant().atOffset(ZoneOffset.UTC));
        Timestamp ua = rs.getTimestamp("updated_at");
        if (ua != null) b.setUpdatedAt(ua.toInstant().atOffset(ZoneOffset.UTC));
        return b;
    };

    private final RowMapper<PrClubbingBatchItem> batchItemRowMapper = (rs, rowNum) -> {
        PrClubbingBatchItem it = new PrClubbingBatchItem();
        it.setId(rs.getLong("id"));
        it.setBatchId(rs.getLong("batch_id"));
        it.setBatchNumber(rs.getString("batch_number"));
        it.setItemCode(rs.getString("item_code"));
        it.setItemName(rs.getString("item_name"));
        it.setDescription(rs.getString("description"));
        it.setCategory(rs.getString("category"));
        it.setUom(rs.getString("uom"));
        it.setTotalClubbedQty(rs.getBigDecimal("total_clubbed_qty"));
        it.setPurchasedQty(rs.getBigDecimal("purchased_qty"));
        it.setRemainingQty(rs.getBigDecimal("remaining_qty"));
        it.setEstRate(rs.getBigDecimal("est_rate"));
        it.setStatus(rs.getString("status"));
        Timestamp ca = rs.getTimestamp("created_at");
        if (ca != null) it.setCreatedAt(ca.toInstant().atOffset(ZoneOffset.UTC));
        Timestamp ua = rs.getTimestamp("updated_at");
        if (ua != null) it.setUpdatedAt(ua.toInstant().atOffset(ZoneOffset.UTC));
        return it;
    };

    private final RowMapper<PrClubbingAllocation> allocationRowMapper = (rs, rowNum) -> {
        PrClubbingAllocation a = new PrClubbingAllocation();
        a.setId(rs.getLong("id"));
        a.setBatchId(rs.getLong("batch_id"));
        a.setBatchItemId(rs.getLong("batch_item_id"));
        a.setPrId(rs.getLong("pr_id"));
        a.setPrNumber(rs.getString("pr_number"));
        a.setPrItemId(rs.getLong("pr_item_id"));
        a.setItemCode(rs.getString("item_code"));
        a.setAllocatedQty(rs.getBigDecimal("allocated_qty"));
        a.setPurchasedQty(rs.getBigDecimal("purchased_qty"));
        a.setRemainingQty(rs.getBigDecimal("remaining_qty"));
        a.setPoId(rs.getString("po_id"));
        a.setPoNumber(rs.getString("po_number"));
        a.setStatus(rs.getString("status"));
        Timestamp ca = rs.getTimestamp("created_at");
        if (ca != null) a.setCreatedAt(ca.toInstant().atOffset(ZoneOffset.UTC));
        Timestamp ua = rs.getTimestamp("updated_at");
        if (ua != null) a.setUpdatedAt(ua.toInstant().atOffset(ZoneOffset.UTC));
        return a;
    };
}
