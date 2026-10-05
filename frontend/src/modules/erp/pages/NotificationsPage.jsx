import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, AlertTriangle, Package, Check, Trash2, ArrowRight, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { SETTINGS_API, parseApiError } from "./settingsTheme";

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function groupLabel(iso) {
  if (!iso) return "Earlier";
  const t = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const day = 24 * 60 * 60 * 1000;
  if (t === today) return "Today";
  if (t === today - day) return "Yesterday";
  if (t > today - 7 * day) return "This week";
  return new Date(iso).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function pageWindow(current, totalPages) {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const pages = [];
  const push = (v) => pages.push(v);
  push(0);
  let start = Math.max(1, current - 1);
  let end = Math.min(totalPages - 2, current + 1);
  if (current <= 2) {
    start = 1;
    end = 3;
  }
  if (current >= totalPages - 3) {
    start = totalPages - 4;
    end = totalPages - 2;
  }
  if (start > 1) push("…");
  for (let i = start; i <= end; i++) push(i);
  if (end < totalPages - 2) push("…");
  push(totalPages - 1);
  return pages;
}

const PAGE_SIZE = 20;

export function NotificationsPage({ dark = false, setPage }) {
  const [filter, setFilter] = useState("all");
  const [exactDate, setExactDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [deptQuery, setDeptQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = PAGE_SIZE;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkScope, setBulkScope] = useState("selected");
  const refreshOnce = useRef(true);

  const dateRange = useMemo(() => {
    if (exactDate) return { from: exactDate, to: exactDate };
    return { from: fromDate, to: toDate };
  }, [exactDate, fromDate, toDate]);

  const load = async ({ refresh = false, pageOverride } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        refresh: String(refresh),
        status: filter === "inventory" ? "all" : filter,
        page: String(pageOverride ?? pageIndex),
        size: String(pageSize),
      });
      if (itemQuery.trim()) params.set("item", itemQuery.trim());
      if (deptQuery.trim()) params.set("department", deptQuery.trim());
      if (dateRange.from) params.set("from", dateRange.from);
      if (dateRange.to) params.set("to", dateRange.to);
      const res = await fetch(`${SETTINGS_API}/api/notifications?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not load notifications."));
        setNotifications([]);
        return;
      }
      const items = Array.isArray(data) ? data : (data.items || []);
      setNotifications(items);
      setTotal(Array.isArray(data) ? items.length : Number(data.total || 0));
      setTotalPages(Array.isArray(data) ? 1 : Number(data.totalPages || 0));
      setUnreadCount(Number(data.unreadCount ?? items.filter((n) => n.unread && !n.resolved).length));
      setActiveCount(Number(data.activeCount ?? items.filter((n) => !n.resolved).length));
      setResolvedCount(Number(data.resolvedCount ?? items.filter((n) => n.resolved).length));
      setError("");
    } catch {
      setError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refresh = refreshOnce.current;
    refreshOnce.current = false;
    load({ refresh });
  }, [filter, exactDate, fromDate, toDate, itemQuery, deptQuery, pageIndex, pageSize]);

  const markAllAsRead = async () => {
    await fetch(`${SETTINGS_API}/api/notifications/read-all`, { method: "POST" });
    await load({ refresh: false });
  };

  const toggleRead = async (n) => {
    await fetch(`${SETTINGS_API}/api/notifications/${n.id}/read?unread=${!n.unread}`, { method: "POST" });
    await load({ refresh: false });
  };

  const deleteNotification = async (id) => {
    await fetch(`${SETTINGS_API}/api/notifications/${id}`, { method: "DELETE" });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await load({ refresh: false });
  };

  const runBulkDelete = async () => {
    setError("");
    setSuccess("");
    let body;
    if (bulkScope === "selected") {
      if (selected.size === 0) {
        setError("Select one or more notifications first, or choose another bulk action.");
        return;
      }
      if (!window.confirm(`Delete ${selected.size} selected notification${selected.size === 1 ? "" : "s"}?`)) return;
      body = { scope: "IDS", ids: Array.from(selected) };
    } else if (bulkScope === "cleared") {
      if (!window.confirm(`Delete all ${resolvedCount} cleared notification${resolvedCount === 1 ? "" : "s"}? Active alerts are kept.`)) return;
      body = { scope: "CLEARED" };
    } else if (bulkScope === "cleared90") {
      if (!window.confirm("Delete cleared notifications older than 90 days? Active alerts are kept.")) return;
      body = { scope: "CLEARED_OLDER_THAN", olderThanDays: 90 };
    } else if (bulkScope === "cleared365") {
      if (!window.confirm("Delete cleared notifications older than 1 year? Active alerts are kept.")) return;
      body = { scope: "CLEARED_OLDER_THAN", olderThanDays: 365 };
    } else if (bulkScope === "matching") {
      if (!window.confirm(`Delete all ${total} notification${total === 1 ? "" : "s"} matching the current filters (this tab, dates, item, department)?`)) return;
      body = {
        scope: "MATCHING",
        status: filter === "inventory" ? "all" : filter,
        item: itemQuery.trim() || null,
        department: deptQuery.trim() || null,
        from: dateRange.from || null,
        to: dateRange.to || null,
      };
    } else {
      return;
    }
    try {
      const res = await fetch(`${SETTINGS_API}/api/notifications/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data, "Could not delete notifications."));
        return;
      }
      setSuccess(data.message || "Deleted.");
      setSelected(new Set());
      if (pageIndex !== 0) setPageIndex(0);
      else await load({ refresh: false });
    } catch {
      setError("Could not delete notifications.");
    }
  };

  const pageIds = notifications.map((n) => n.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelectAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const groups = [];
    let current = null;
    for (const n of notifications) {
      const label = groupLabel(n.createdAt || n.updatedAt);
      if (!current || current.label !== label) {
        current = { label, items: [] };
        groups.push(current);
      }
      current.items.push(n);
    }
    return groups;
  }, [notifications]);

  const bgCard = dark ? "#1e293b" : "#ffffff";
  const bdrCard = dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)";
  const txtPrimary = dark ? "#f1f5f9" : "#0f172a";
  const txtMuted = dark ? "#94a3b8" : "#64748b";

  const dateInput = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: `1px solid ${bdrCard}`,
    background: dark ? "#0f172a" : "#fff",
    color: txtPrimary,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    colorScheme: dark ? "dark" : "light",
  };

  const changeFilter = (id) => {
    setFilter(id);
    setPageIndex(0);
    setSelected(new Set());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 960, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{
        borderRadius: 20,
        padding: "24px 28px",
        background: dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        color: "#fff",
        boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 30px rgba(14,165,233,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.3px" }}>System Notifications</h1>
            <p style={{ fontSize: 13, opacity: 0.85, margin: "4px 0 0" }}>
              {unreadCount > 0 ? `You have ${unreadCount} unread stock alert${unreadCount > 1 ? "s" : ""}.` : "No unread stock alerts."}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => load({ refresh: true })}
            disabled={loading}
            title="Recheck closing balances and load new alerts"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 12, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 12, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              <Check size={14} /> Mark all as read
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: dark ? "rgba(148,163,184,0.08)" : "#e2e8f0", padding: 4, borderRadius: 12 }}>
          {[
            { id: "all", label: `Active (${activeCount})` },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "inventory", label: "Inventory" },
            { id: "resolved", label: `Cleared (${resolvedCount})` },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => changeFilter(tab.id)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: active ? (dark ? "#0ea5e9" : "#fff") : "transparent",
                  color: active ? (dark ? "#fff" : "#0f172a") : txtMuted,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  boxShadow: active && !dark ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: txtMuted }}>
          {loading ? "Checking stock…" : `Showing ${notifications.length} of ${total.toLocaleString("en-IN")}`}
        </span>
      </div>

      <div style={{
        background: bgCard,
        border: `1px solid ${bdrCard}`,
        borderRadius: 16,
        padding: 16,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}>
        <label>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: txtMuted }}>Date</span>
          <input type="date" value={exactDate} onChange={(e) => { setExactDate(e.target.value); setFromDate(""); setToDate(""); setPageIndex(0); }} style={dateInput} />
        </label>
        <label>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: txtMuted }}>From</span>
          <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => { setFromDate(e.target.value); setExactDate(""); setPageIndex(0); }} style={dateInput} />
        </label>
        <label>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: txtMuted }}>To</span>
          <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setExactDate(""); setPageIndex(0); }} style={dateInput} />
        </label>
        <label>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, marginBottom: 6, color: txtMuted }}><Search size={12} /> Item code</span>
          <input
            value={itemQuery}
            onChange={(e) => { setItemQuery(e.target.value); setPageIndex(0); }}
            placeholder="e.g. 101"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${bdrCard}`, background: dark ? "#0f172a" : "#fff", color: txtPrimary, fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </label>
        <label>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, marginBottom: 6, color: txtMuted }}><Search size={12} /> Department</span>
          <input
            value={deptQuery}
            onChange={(e) => { setDeptQuery(e.target.value); setPageIndex(0); }}
            placeholder="e.g. Store"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${bdrCard}`, background: dark ? "#0f172a" : "#fff", color: txtPrimary, fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </label>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}>
          <AlertTriangle size={16} /><span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 13, display: "flex", gap: 8 }}>
          <CheckCircle2 size={16} /><span>{success}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.length === 0 && !loading ? (
          <div style={{ background: bgCard, border: `1px solid ${bdrCard}`, borderRadius: 16, padding: "48px 24px", textAlign: "center", color: txtMuted }}>
            <Bell size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: txtPrimary }}>No notifications</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Create a rule under Settings → Generate Notification. Alerts appear when closing balance is below min or above max.</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: txtMuted, margin: "8px 4px 8px" }}>{group.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.items.map((n) => {
                  const low = n.kind === "BELOW_MIN";
                  return (
                    <div
                      key={n.id}
                      style={{
                        background: bgCard,
                        border: `1px solid ${n.unread ? (dark ? "#0ea5e9" : "#38bdf8") : bdrCard}`,
                        borderLeft: n.unread ? "4px solid #0ea5e9" : `1px solid ${bdrCard}`,
                        borderRadius: 14,
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleSelect(n.id)} style={{ marginTop: 12 }} />
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: low
                          ? (dark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7")
                          : (dark ? "rgba(244, 63, 94, 0.15)" : "#ffe4e6"),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {low ? <Package className="w-4 h-4 text-amber-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: dark ? "rgba(148,163,184,0.14)" : "#f1f5f9", color: dark ? "#38bdf8" : "#0284c7", letterSpacing: "0.05em" }}>
                            {n.category}
                          </span>
                          {n.resolved && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: "#ecfdf5", color: "#047857" }}>CLEARED</span>
                          )}
                          <span style={{ fontSize: 11, color: txtMuted }}>{n.departmentName}</span>
                          <span style={{ fontSize: 11, color: txtMuted }}>{timeAgo(n.updatedAt || n.createdAt)}</span>
                          <span style={{ fontSize: 11, color: txtMuted }}>({formatDate(n.createdAt)})</span>
                        </div>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 2px" }}>{n.title}</h3>
                        <p style={{ fontSize: 12, color: txtMuted, margin: 0, lineHeight: 1.5 }}>{n.description}</p>
                        {setPage && (
                          <button
                            onClick={() => setPage("item-wise-cb")}
                            style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#0ea5e9", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                          >
                            Open Item wise CB <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => toggleRead(n)} title={n.unread ? "Mark as Read" : "Mark as Unread"} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: n.unread ? "#0ea5e9" : txtMuted }}>
                          {n.unread ? <Check size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button onClick={() => deleteNotification(n.id)} title="Delete notification" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: dark ? "#64748b" : "#94a3b8" }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {total > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
          padding: "8px 0 4px",
        }}>
          <span style={{ fontSize: 13, color: txtMuted, marginRight: 8 }}>
            {total === 0
              ? "0–0 of 0"
              : `${pageIndex * PAGE_SIZE + 1}–${Math.min((pageIndex + 1) * PAGE_SIZE, total)} of ${total.toLocaleString("en-IN")}`}
          </span>
          <button
            type="button"
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            title="Newer"
            style={{
              width: 36, height: 36, borderRadius: 18,
              border: "none",
              background: "transparent",
              color: txtPrimary,
              cursor: pageIndex <= 0 ? "default" : "pointer",
              opacity: pageIndex <= 0 ? 0.35 : 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronLeft size={20} />
          </button>
          {pageWindow(pageIndex, Math.max(totalPages, 1)).map((p, i) => (
            typeof p === "string" ? (
              <span key={`e-${i}`} style={{ width: 28, textAlign: "center", color: txtMuted, fontSize: 13 }}>{p}</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPageIndex(p)}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: "0 8px",
                  borderRadius: 16,
                  border: "none",
                  background: p === pageIndex ? (dark ? "#0ea5e9" : "#e8f0fe") : "transparent",
                  color: p === pageIndex ? (dark ? "#fff" : "#1967d2") : txtPrimary,
                  fontWeight: p === pageIndex ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {p + 1}
              </button>
            )
          ))}
          <button
            type="button"
            disabled={pageIndex + 1 >= totalPages}
            onClick={() => setPageIndex((p) => p + 1)}
            title="Older"
            style={{
              width: 36, height: 36, borderRadius: 18,
              border: "none",
              background: "transparent",
              color: txtPrimary,
              cursor: pageIndex + 1 >= totalPages ? "default" : "pointer",
              opacity: pageIndex + 1 >= totalPages ? 0.35 : 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <div style={{
        background: bgCard,
        border: `1px solid ${bdrCard}`,
        borderRadius: 16,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: txtPrimary, cursor: "pointer" }}>
          <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} />
          Select this page
          {selected.size > 0 && <span style={{ fontWeight: 600, color: txtMuted }}>({selected.size} selected)</span>}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select
            value={bulkScope}
            onChange={(e) => setBulkScope(e.target.value)}
            style={{ ...dateInput, width: "auto", minWidth: 220 }}
          >
            <option value="selected">Delete selected</option>
            <option value="matching">Delete all matching filters</option>
            <option value="cleared">Delete all cleared</option>
            <option value="cleared90">Delete cleared older than 90 days</option>
            <option value="cleared365">Delete cleared older than 1 year</option>
          </select>
          <button
            type="button"
            onClick={runBulkDelete}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "none", background: "#b91c1c", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
