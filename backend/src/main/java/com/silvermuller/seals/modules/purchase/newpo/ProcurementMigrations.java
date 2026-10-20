package com.silvermuller.seals.modules.purchase.newpo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Controlled, idempotent migrations that cannot be expressed in schema.sql (which is split on semicolons, so it
 * cannot hold conditional blocks). Each step checks the current state first and never changes business rows.
 *
 * Runs after schema.sql has been applied. Every step is safe to run on every start.
 */
@Component
@Order(0)
public class ProcurementMigrations implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProcurementMigrations.class);
    /** Sequence numbers start above the legacy counter's initial value (200). */
    private static final long PO_NUMBER_FLOOR = 200L;

    private final JdbcTemplate jdbc;

    public ProcurementMigrations(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensureReleasedQtyConstraint();
        ensurePoNumberSequence();
        ensureAcceptedQtyOnAttributions();
    }

    /**
     * Adds CHECK (released_qty >= 0 AND released_qty <= allocated_qty) to po_pr_allocations.
     * If any existing row already violates it, the constraint is NOT added and the rows are left as they are:
     * the violation is logged for manual review.
     */
    public boolean ensureReleasedQtyConstraint() {
        Integer present = jdbc.queryForObject(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'ck_po_pr_alloc_released' AND conrelid = 'public.po_pr_allocations'::regclass",
                Integer.class);
        if (present != null && present > 0) {
            return true;
        }
        Integer violations = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.po_pr_allocations WHERE released_qty < 0 OR released_qty > allocated_qty", Integer.class);
        if (violations != null && violations > 0) {
            log.error("Constraint ck_po_pr_alloc_released NOT added: {} po_pr_allocations rows violate it. Review them manually.", violations);
            return false;
        }
        jdbc.execute("ALTER TABLE public.po_pr_allocations ADD CONSTRAINT ck_po_pr_alloc_released " +
                "CHECK (released_qty >= 0 AND released_qty <= allocated_qty)");
        log.info("Added constraint ck_po_pr_alloc_released to po_pr_allocations.");
        return true;
    }

    /**
     * Fills accepted_qty on attribution rows written before rejected goods were separated out. The value is the
     * row's received share multiplied by the GRN line's accepted/received ratio, i.e. the same allocation
     * re-expressed for accepted goods. Rows are only filled where accepted_qty is still NULL; nothing else changes.
     * Once every row is filled the column is set NOT NULL (idempotent).
     */
    public void ensureAcceptedQtyOnAttributions() {
        int filled = jdbc.update(
                "UPDATE public.grn_item_allocations g SET accepted_qty = ROUND(g.received_qty * COALESCE(gi.accepted_qty, 0) / NULLIF(gi.received_qty, 0), 2) " +
                "FROM public.goods_receipt_note_items gi WHERE gi.id = g.grn_item_id AND g.accepted_qty IS NULL AND gi.received_qty > 0");
        Integer remaining = jdbc.queryForObject("SELECT COUNT(*) FROM public.grn_item_allocations WHERE accepted_qty IS NULL", Integer.class);
        if (filled > 0) log.info("Filled accepted_qty on {} grn_item_allocations rows.", filled);
        if (remaining != null && remaining == 0) {
            jdbc.execute("ALTER TABLE public.grn_item_allocations ALTER COLUMN accepted_qty SET NOT NULL");
        } else if (remaining != null && remaining > 0) {
            log.error("{} grn_item_allocations rows still have no accepted_qty; NOT NULL not set.", remaining);
        }
    }

    /**
     * Creates po_number_seq and moves it past the highest PO-2026-NNNNN already stored, so numbers keep
     * increasing across restarts and never collide with existing POs. Only ever moves the sequence forward.
     */
    public void ensurePoNumberSequence() {
        jdbc.execute("CREATE SEQUENCE IF NOT EXISTS public.po_number_seq START WITH " + (PO_NUMBER_FLOOR + 1));
        Long max = jdbc.queryForObject(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS BIGINT)), 0) FROM public.purchase_orders " +
                "WHERE po_number ~ '^PO-2026-[0-9]+$'", Long.class);
        long floor = Math.max(max == null ? 0 : max, PO_NUMBER_FLOOR);
        java.util.Map<String, Object> state = jdbc.queryForMap("SELECT last_value, is_called FROM public.po_number_seq");
        long last = ((Number) state.get("last_value")).longValue();
        boolean called = (Boolean) state.get("is_called");
        long nextValue = called ? last + 1 : last;
        if (nextValue <= floor) {
            jdbc.queryForObject("SELECT setval('public.po_number_seq', ?, true)", Long.class, floor);
            log.info("po_number_seq moved to {} so the next PO number is {}.", floor, floor + 1);
        }
    }
}
