package com.silvermuller.seals.modules.gate;

import com.silvermuller.seals.modules.purchase.service.QuantityRules;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gate and receiving configuration, stored as one JSON row in app_setting (key "gate.config"), so it is changed on the
 * screen and needs no restart or redeploy. Missing keys fall back to the defaults below.
 *
 * <ul>
 *   <li>{@code required} (default false): when true, a GRN can only be made from a verified gate entry. Off until the
 *       gate screens are in use, so the GRN screen keeps working.</li>
 *   <li>{@code overDeliveryTolerancePct} (default 1): how much more than the PO quantity an item may be accepted, at
 *       gate verification and at GRN posting. Counted units (PCS, NOS...) round the allowance down to whole units.</li>
 *   <li>{@code multiVendorAllowed} (default false): one vehicle may carry POs of different vendors.</li>
 *   <li>{@code defaultGate} (default "MAIN") and {@code dwellAlertHours} (default 4) for the dashboard alert.</li>
 * </ul>
 */
@Service
public class GateSettings {

    public static final String KEY = "gate.config";

    public record Config(boolean required, BigDecimal overDeliveryTolerancePct, boolean multiVendorAllowed,
                         String defaultGate, int dwellAlertHours) {
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("required", required);
            m.put("overDeliveryTolerancePct", overDeliveryTolerancePct);
            m.put("multiVendorAllowed", multiVendorAllowed);
            m.put("defaultGate", defaultGate);
            m.put("dwellAlertHours", dwellAlertHours);
            return m;
        }
    }

    static final Config DEFAULTS = new Config(false, BigDecimal.ONE, false, "MAIN", 4);

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public GateSettings(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public Config get() {
        List<String> rows = jdbc.queryForList("SELECT setting_value::text FROM public.app_setting WHERE setting_key = ?", String.class, KEY);
        if (rows.isEmpty()) return DEFAULTS;
        Map<?, ?> m;
        try {
            m = mapper.readValue(rows.get(0), Map.class);
        } catch (Exception e) {
            return DEFAULTS;
        }
        return new Config(
                bool(m.get("required"), DEFAULTS.required()),
                decimal(m.get("overDeliveryTolerancePct"), DEFAULTS.overDeliveryTolerancePct()),
                bool(m.get("multiVendorAllowed"), DEFAULTS.multiVendorAllowed()),
                m.get("defaultGate") == null ? DEFAULTS.defaultGate() : String.valueOf(m.get("defaultGate")),
                m.get("dwellAlertHours") == null ? DEFAULTS.dwellAlertHours() : decimal(m.get("dwellAlertHours"), BigDecimal.valueOf(4)).intValue());
    }

    /** Saves a partial or full change. Values are checked; anything not sent keeps its current value. */
    public Config save(Map<String, Object> in) {
        Config c = get();
        Config next = new Config(
                in.containsKey("required") ? bool(in.get("required"), c.required()) : c.required(),
                in.containsKey("overDeliveryTolerancePct") ? decimal(in.get("overDeliveryTolerancePct"), c.overDeliveryTolerancePct()) : c.overDeliveryTolerancePct(),
                in.containsKey("multiVendorAllowed") ? bool(in.get("multiVendorAllowed"), c.multiVendorAllowed()) : c.multiVendorAllowed(),
                in.containsKey("defaultGate") ? GateRows.upper(String.valueOf(in.get("defaultGate"))) : c.defaultGate(),
                in.containsKey("dwellAlertHours") ? decimal(in.get("dwellAlertHours"), BigDecimal.valueOf(c.dwellAlertHours())).intValue() : c.dwellAlertHours());
        if (next.overDeliveryTolerancePct().signum() < 0 || next.overDeliveryTolerancePct().compareTo(BigDecimal.TEN) > 0) {
            throw new IllegalArgumentException("Over-delivery tolerance must be between 0 and 10 %.");
        }
        if (next.dwellAlertHours() < 1 || next.dwellAlertHours() > 72) {
            throw new IllegalArgumentException("Vehicle dwell alert must be between 1 and 72 hours.");
        }
        Integer gate = jdbc.queryForObject("SELECT COUNT(*) FROM public.gate_master WHERE gate_code = ? AND status = 'ACTIVE'", Integer.class, next.defaultGate());
        if (gate == null || gate == 0) throw new IllegalArgumentException("Default gate " + next.defaultGate() + " is not an active gate.");
        try {
            jdbc.update("INSERT INTO public.app_setting (setting_key, setting_value, updated_at) VALUES (?, CAST(? AS JSONB), now()) "
                    + "ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()",
                    KEY, mapper.writeValueAsString(next.toMap()));
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Settings could not be saved: " + e.getMessage());
        }
        return next;
    }

    /**
     * The most that may be accepted against a PO line in total: the PO quantity plus the tolerance. For counted units
     * the allowance is rounded down to whole units (1 % of 50 PCS allows nothing extra; of 100 PCS allows 1).
     */
    public static BigDecimal ceilingWithTolerance(BigDecimal ordered, String uom, BigDecimal tolerancePct) {
        BigDecimal base = GateRows.nz(ordered);
        BigDecimal pct = tolerancePct == null ? BigDecimal.ZERO : tolerancePct;
        BigDecimal allowance = base.multiply(pct).divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        allowance = QuantityRules.isCountedUnit(uom) ? allowance.setScale(0, RoundingMode.FLOOR) : allowance.setScale(2, RoundingMode.FLOOR);
        return base.add(allowance);
    }

    private static boolean bool(Object v, boolean dflt) {
        if (v == null) return dflt;
        if (v instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(v));
    }

    private static BigDecimal decimal(Object v, BigDecimal dflt) {
        if (v == null || String.valueOf(v).isBlank()) return dflt;
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Not a number: " + v);
        }
    }
}
