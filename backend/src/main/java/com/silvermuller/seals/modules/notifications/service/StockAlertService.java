package com.silvermuller.seals.modules.notifications.service;

import com.silvermuller.seals.common.exception.ResourceNotFoundException;
import com.silvermuller.seals.modules.inventory.dto.DepartmentResponse;
import com.silvermuller.seals.modules.inventory.model.Master;
import com.silvermuller.seals.modules.inventory.repository.CategoryMasterRepository;
import com.silvermuller.seals.modules.inventory.repository.MasterRepository;
import com.silvermuller.seals.modules.inventory.service.DepartmentService;
import com.silvermuller.seals.modules.inventory.service.InventoryTransactionService;
import com.silvermuller.seals.modules.notifications.dto.BulkDeleteAlertsRequest;
import com.silvermuller.seals.modules.notifications.dto.CreateStockAlertRuleRequest;
import com.silvermuller.seals.modules.notifications.dto.DepartmentThresholdLine;
import com.silvermuller.seals.modules.notifications.model.StockAlert;
import com.silvermuller.seals.modules.notifications.model.StockAlertRule;
import com.silvermuller.seals.modules.notifications.repository.StockAlertRepository;
import com.silvermuller.seals.modules.notifications.repository.StockAlertRuleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class StockAlertService {

    private final StockAlertRuleRepository ruleRepository;
    private final StockAlertRepository alertRepository;
    private final MasterRepository masterRepository;
    private final CategoryMasterRepository categoryMasterRepository;
    private final DepartmentService departmentService;
    private final InventoryTransactionService transactionService;

    public StockAlertService(
            StockAlertRuleRepository ruleRepository,
            StockAlertRepository alertRepository,
            MasterRepository masterRepository,
            CategoryMasterRepository categoryMasterRepository,
            DepartmentService departmentService,
            InventoryTransactionService transactionService) {
        this.ruleRepository = ruleRepository;
        this.alertRepository = alertRepository;
        this.masterRepository = masterRepository;
        this.categoryMasterRepository = categoryMasterRepository;
        this.departmentService = departmentService;
        this.transactionService = transactionService;
    }

    @Transactional(readOnly = true)
    public List<StockAlertRule> listRules() {
        return ruleRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public List<StockAlertRule> createRules(CreateStockAlertRuleRequest request) {
        String code = request.getItemCode().trim().toUpperCase();
        Master master = masterRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new IllegalArgumentException("Item code '" + code + "' was not found."));
        String category = categoryMasterRepository.findByCategoryNameIgnoreCase(request.getCategory().trim())
                .map(c -> c.getCategoryName())
                .orElseThrow(() -> new IllegalArgumentException("Category is not in category_master."));

        List<DepartmentThresholdLine> lines = new ArrayList<>();
        if (request.isAllDepartments()) {
            DepartmentThresholdLine line = new DepartmentThresholdLine();
            line.setDepartmentName(StockAlertRule.ALL_DEPARTMENTS);
            line.setMinQuantity(request.getMinQuantity());
            line.setMaxQuantity(request.getMaxQuantity());
            lines.add(line);
        } else {
            if (request.getDepartments() == null || request.getDepartments().isEmpty()) {
                throw new IllegalArgumentException("Select at least one department, or choose All departments.");
            }
            lines.addAll(request.getDepartments());
        }

        List<StockAlertRule> saved = new ArrayList<>();
        for (DepartmentThresholdLine line : lines) {
            saved.add(upsertLine(master.getCode(), category, line, request.isAllDepartments()));
        }
        for (StockAlertRule rule : saved) {
            evaluateRule(rule);
        }
        return saved;
    }

    @Transactional
    public StockAlertRule updateRule(Long id, CreateStockAlertRuleRequest request) {
        StockAlertRule existing = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification rule not found."));
        String code = request.getItemCode().trim().toUpperCase();
        masterRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new IllegalArgumentException("Item code '" + code + "' was not found."));
        String category = categoryMasterRepository.findByCategoryNameIgnoreCase(request.getCategory().trim())
                .map(c -> c.getCategoryName())
                .orElseThrow(() -> new IllegalArgumentException("Category is not in category_master."));

        DepartmentThresholdLine line = new DepartmentThresholdLine();
        if (request.isAllDepartments()) {
            line.setDepartmentName(StockAlertRule.ALL_DEPARTMENTS);
            line.setMinQuantity(request.getMinQuantity());
            line.setMaxQuantity(request.getMaxQuantity());
        } else {
            if (request.getDepartments() == null || request.getDepartments().isEmpty()) {
                throw new IllegalArgumentException("Select a department, or choose All departments.");
            }
            line = request.getDepartments().get(0);
        }
        ResolvedThreshold resolved = resolveThreshold(code, category, line, request.isAllDepartments());
        ruleRepository.findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
                        code, category, resolved.departmentName())
                .ifPresent(other -> {
                    if (!other.getId().equals(id)) {
                        throw new IllegalArgumentException(
                                "A notification rule already exists for " + code + " / " + category
                                        + " in '" + (resolved.allDepartments() ? "All departments" : resolved.departmentName()) + "'.");
                    }
                });
        existing.setItemCode(code);
        existing.setCategoryName(category);
        existing.setDepartmentName(resolved.departmentName());
        existing.setMinQuantity(resolved.min());
        existing.setMaxQuantity(resolved.max());
        StockAlertRule saved = ruleRepository.save(existing);
        evaluateRule(saved);
        return saved;
    }

    private record ResolvedThreshold(String departmentName, BigDecimal min, BigDecimal max, boolean allDepartments) {}

    private ResolvedThreshold resolveThreshold(
            String code, String category, DepartmentThresholdLine line, boolean allDepartments) {
        String requestedDept = allDepartments
                ? StockAlertRule.ALL_DEPARTMENTS
                : (line.getDepartmentName() == null ? "" : line.getDepartmentName().trim());
        if (!allDepartments) {
            if (requestedDept.isBlank()) {
                throw new IllegalArgumentException("Department is required on each row.");
            }
            boolean known = departmentService.getAllDepartments().stream()
                    .anyMatch(d -> d.getName() != null && d.getName().equalsIgnoreCase(requestedDept));
            if (!known) {
                throw new IllegalArgumentException("Department '" + requestedDept + "' was not found.");
            }
        }
        final String dept = allDepartments
                ? StockAlertRule.ALL_DEPARTMENTS
                : departmentService.getAllDepartments().stream()
                    .filter(d -> d.getName() != null && d.getName().equalsIgnoreCase(requestedDept))
                    .map(DepartmentResponse::getName)
                    .findFirst()
                    .orElse(requestedDept);
        BigDecimal min = emptyToNull(line.getMinQuantity());
        BigDecimal max = emptyToNull(line.getMaxQuantity());
        if (min == null && max == null) {
            throw new IllegalArgumentException("Set a minimum quantity, a maximum quantity, or both.");
        }
        if (min != null && min.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Minimum quantity cannot be negative.");
        }
        if (max != null && max.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Maximum quantity cannot be negative.");
        }
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new IllegalArgumentException("Minimum quantity cannot be greater than maximum quantity.");
        }
        return new ResolvedThreshold(dept, min, max, allDepartments);
    }

    private StockAlertRule upsertLine(String code, String category, DepartmentThresholdLine line, boolean allDepartments) {
        ResolvedThreshold resolved = resolveThreshold(code, category, line, allDepartments);
        StockAlertRule rule = ruleRepository
                .findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
                        code, category, resolved.departmentName())
                .orElseGet(StockAlertRule::new);
        rule.setItemCode(code);
        rule.setCategoryName(category);
        rule.setDepartmentName(resolved.departmentName());
        rule.setMinQuantity(resolved.min());
        rule.setMaxQuantity(resolved.max());
        if (rule.getCreatedAt() == null) {
            rule.setCreatedAt(OffsetDateTime.now());
        }
        return ruleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Long id) {
        StockAlertRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification rule not found."));
        alertRepository.deleteByRuleId(id);
        ruleRepository.delete(rule);
    }

    @Transactional
    public List<StockAlert> listAlerts(boolean refresh) {
        if (refresh) {
            evaluateAll();
        }
        return alertRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Map<String, Object> listAlertsPage(
            boolean refresh,
            String status,
            String item,
            String department,
            String from,
            String to,
            int page,
            int size) {
        if (refresh) {
            evaluateAll();
        }
        AlertFilter filter = parseFilter(status, item, department, from, to);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<StockAlert> result = alertRepository.search(
                filter.resolved(), filter.unread(), filter.item(), filter.dept(), filter.fromTs(), filter.toTs(), pageable);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", result.getContent().stream().map(this::toAlertMap).toList());
        body.put("total", result.getTotalElements());
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalPages", result.getTotalPages());
        body.put("unreadCount", unreadCount());
        body.put("activeCount", alertRepository.countByResolvedFalse());
        body.put("resolvedCount", alertRepository.countByResolvedTrue());
        return body;
    }

    @Transactional
    public int bulkDelete(BulkDeleteAlertsRequest request) {
        String scope = request.getScope() == null ? "IDS" : request.getScope().trim().toUpperCase();
        return switch (scope) {
            case "IDS" -> {
                List<Long> ids = request.getIds() == null
                        ? List.of()
                        : request.getIds().stream().filter(Objects::nonNull).distinct().toList();
                if (ids.isEmpty()) {
                    throw new IllegalArgumentException("Select at least one notification to delete.");
                }
                alertRepository.deleteAllById(ids);
                yield ids.size();
            }
            case "CLEARED" -> alertRepository.deleteAllResolved();
            case "CLEARED_OLDER_THAN" -> {
                int days = request.getOlderThanDays() == null ? 90 : request.getOlderThanDays();
                if (days < 1) {
                    throw new IllegalArgumentException("Days must be at least 1.");
                }
                yield alertRepository.deleteResolvedOlderThan(OffsetDateTime.now().minusDays(days));
            }
            case "MATCHING" -> {
                AlertFilter filter = parseFilter(
                        request.getStatus(), request.getItem(), request.getDepartment(), request.getFrom(), request.getTo());
                yield alertRepository.deleteMatching(
                        filter.resolved(), filter.unread(), filter.item(), filter.dept(), filter.fromTs(), filter.toTs());
            }
            default -> throw new IllegalArgumentException("Unknown delete scope.");
        };
    }

    private record AlertFilter(
            Boolean resolved,
            Boolean unread,
            String item,
            String dept,
            OffsetDateTime fromTs,
            OffsetDateTime toTs) {}

    private AlertFilter parseFilter(String status, String item, String department, String from, String to) {
        Boolean resolved = Boolean.FALSE;
        Boolean unread = null;
        String st = status == null ? "all" : status.trim().toLowerCase();
        if ("resolved".equals(st) || "cleared".equals(st)) {
            resolved = Boolean.TRUE;
        } else if ("unread".equals(st)) {
            resolved = Boolean.FALSE;
            unread = Boolean.TRUE;
        }
        return new AlertFilter(
                resolved,
                unread,
                likePattern(item),
                likePattern(department),
                startOfDay(from),
                endOfDay(to));
    }

    private static String likePattern(String v) {
        String t = blankToNull(v);
        return t == null ? null : "%" + t.toLowerCase() + "%";
    }

    private static String blankToNull(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private static OffsetDateTime startOfDay(String ymd) {
        if (blankToNull(ymd) == null) {
            return null;
        }
        return LocalDate.parse(ymd.trim()).atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime();
    }

    private static OffsetDateTime endOfDay(String ymd) {
        if (blankToNull(ymd) == null) {
            return null;
        }
        return LocalDate.parse(ymd.trim()).atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return alertRepository.countByUnreadTrueAndResolvedFalse();
    }

    @Transactional
    public void markRead(Long id, boolean unread) {
        StockAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found."));
        alert.setUnread(unread);
        alert.setUpdatedAt(OffsetDateTime.now());
        alertRepository.save(alert);
    }

    @Transactional
    public void markAllRead() {
        for (StockAlert alert : alertRepository.findAll()) {
            if (alert.isUnread()) {
                alert.setUnread(false);
                alert.setUpdatedAt(OffsetDateTime.now());
                alertRepository.save(alert);
            }
        }
    }

    @Transactional
    public void deleteAlert(Long id) {
        if (!alertRepository.existsById(id)) {
            throw new ResourceNotFoundException("Notification not found.");
        }
        alertRepository.deleteById(id);
    }

    @Transactional
    public void evaluateItem(String itemCode, String category) {
        if (itemCode == null || category == null) {
            return;
        }
        List<StockAlertRule> rules = ruleRepository.findByItemCodeIgnoreCaseAndCategoryNameIgnoreCase(
                itemCode.trim(), category.trim());
        for (StockAlertRule rule : rules) {
            evaluateRule(rule);
        }
    }

    @Transactional
    public void evaluateAll() {
        for (StockAlertRule rule : ruleRepository.findAll()) {
            evaluateRule(rule);
        }
    }

    private void evaluateRule(StockAlertRule rule) {
        Master master = masterRepository.findByCodeIgnoreCase(rule.getItemCode()).orElse(null);
        if (master == null) {
            return;
        }
        List<DepartmentResponse> depts = targetDepartments(rule);
        for (DepartmentResponse dept : depts) {
            if (rule.appliesToAllDepartments() && hasSpecificRule(rule.getItemCode(), rule.getCategoryName(), dept.getName())) {
                continue;
            }
            BigDecimal cb = transactionService.getDepartmentClosingBalance(
                    master.getId(), rule.getCategoryName(), dept.getId());
            if (cb.compareTo(BigDecimal.ZERO) < 0) {
                cb = BigDecimal.ZERO;
            }
            applyThresholds(rule, master, dept.getName(), cb);
        }
    }

    private boolean hasSpecificRule(String itemCode, String category, String departmentName) {
        return ruleRepository.findByItemCodeIgnoreCaseAndCategoryNameIgnoreCaseAndDepartmentNameIgnoreCase(
                itemCode, category, departmentName).isPresent();
    }

    private List<DepartmentResponse> targetDepartments(StockAlertRule rule) {
        List<DepartmentResponse> all = departmentService.getAllDepartments();
        if (rule.appliesToAllDepartments()) {
            return all;
        }
        return all.stream()
                .filter(d -> d.getName() != null && d.getName().equalsIgnoreCase(rule.getDepartmentName()))
                .toList();
    }

    private void applyThresholds(StockAlertRule rule, Master master, String departmentName, BigDecimal cb) {
        if (rule.getMinQuantity() != null && cb.compareTo(rule.getMinQuantity()) < 0) {
            upsertAlert(rule, master, departmentName, StockAlert.BELOW_MIN, cb, rule.getMinQuantity());
        } else {
            resolveKind(rule.getId(), departmentName, StockAlert.BELOW_MIN);
        }
        if (rule.getMaxQuantity() != null && cb.compareTo(rule.getMaxQuantity()) > 0) {
            upsertAlert(rule, master, departmentName, StockAlert.ABOVE_MAX, cb, rule.getMaxQuantity());
        } else {
            resolveKind(rule.getId(), departmentName, StockAlert.ABOVE_MAX);
        }
    }

    private void upsertAlert(
            StockAlertRule rule,
            Master master,
            String departmentName,
            String kind,
            BigDecimal cb,
            BigDecimal threshold) {
        String uom = master.getUnitOfMeasurement() == null ? "" : master.getUnitOfMeasurement();
        boolean below = StockAlert.BELOW_MIN.equals(kind);
        String title = (below ? "Low stock" : "High stock") + ": " + rule.getItemCode() + " (" + rule.getCategoryName() + ")";
        String message = "Closing balance in " + departmentName + " is " + fmt(cb) + " " + uom
                + ", which is " + (below ? "below the minimum of " : "above the maximum of ")
                + fmt(threshold) + " " + uom + ".";

        StockAlert alert = alertRepository
                .findFirstByRuleIdAndDepartmentNameIgnoreCaseAndKindAndResolvedFalse(rule.getId(), departmentName, kind)
                .orElseGet(StockAlert::new);
        boolean isNew = alert.getId() == null;
        alert.setRuleId(rule.getId());
        alert.setItemCode(rule.getItemCode());
        alert.setCategoryName(rule.getCategoryName());
        alert.setDepartmentName(departmentName);
        alert.setKind(kind);
        alert.setClosingBalance(cb);
        alert.setThreshold(threshold);
        alert.setTitle(title);
        alert.setMessage(message);
        alert.setResolved(false);
        alert.setUpdatedAt(OffsetDateTime.now());
        if (isNew) {
            alert.setUnread(true);
            alert.setCreatedAt(OffsetDateTime.now());
        }
        alertRepository.save(alert);
    }

    private void resolveKind(Long ruleId, String departmentName, String kind) {
        alertRepository.findFirstByRuleIdAndDepartmentNameIgnoreCaseAndKindAndResolvedFalse(ruleId, departmentName, kind)
                .ifPresent(alert -> {
                    alert.setResolved(true);
                    alert.setUnread(false);
                    alert.setUpdatedAt(OffsetDateTime.now());
                    alertRepository.save(alert);
                });
    }

    private static BigDecimal emptyToNull(BigDecimal v) {
        return v;
    }

    private static String fmt(BigDecimal n) {
        if (n == null) {
            return "0";
        }
        return n.stripTrailingZeros().toPlainString();
    }

    public Map<String, Object> toRuleMap(StockAlertRule rule) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rule.getId());
        m.put("itemCode", rule.getItemCode());
        m.put("category", rule.getCategoryName());
        m.put("departmentName", rule.appliesToAllDepartments() ? "All departments" : rule.getDepartmentName());
        m.put("allDepartments", rule.appliesToAllDepartments());
        m.put("minQuantity", rule.getMinQuantity());
        m.put("maxQuantity", rule.getMaxQuantity());
        m.put("createdAt", rule.getCreatedAt());
        return m;
    }

    public Map<String, Object> toAlertMap(StockAlert alert) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", alert.getId());
        m.put("type", "inventory");
        m.put("kind", alert.getKind());
        m.put("category", StockAlert.BELOW_MIN.equals(alert.getKind()) ? "LOW STOCK" : "HIGH STOCK");
        m.put("title", alert.getTitle());
        m.put("description", alert.getMessage());
        m.put("itemCode", alert.getItemCode());
        m.put("itemCategory", alert.getCategoryName());
        m.put("departmentName", alert.getDepartmentName());
        m.put("closingBalance", alert.getClosingBalance());
        m.put("threshold", alert.getThreshold());
        m.put("unread", alert.isUnread());
        m.put("resolved", alert.isResolved());
        m.put("createdAt", alert.getCreatedAt());
        m.put("updatedAt", alert.getUpdatedAt());
        m.put("actionTarget", "item-wise-cb");
        return m;
    }
}
