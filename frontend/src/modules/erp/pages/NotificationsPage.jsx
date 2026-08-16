import React, { useState } from "react";
import { Bell, CheckCircle2, AlertTriangle, Package, ShieldAlert, Info, Check, Trash2, Filter, ArrowRight } from "lucide-react";

export function NotificationsPage({ dark = false, setPage }) {
  const [filter, setFilter] = useState("all"); // 'all' | 'unread' | 'inventory' | 'system'
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "inventory",
      icon: <Package className="w-5 h-5 text-amber-500" />,
      bg: dark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
      title: "Low Stock Alert: MAT-001 (Steel Sheet)",
      description: "Remaining stock for Steel Sheet is 45 KG, which is below the minimum threshold of 100 KG.",
      timestamp: "10 mins ago",
      date: "16 Aug 2026, 08:55 PM",
      unread: true,
      category: "INVENTORY",
      actionTarget: "inventory"
    },
    {
      id: 2,
      type: "system",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      bg: dark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
      title: "Excel Batch Import Completed",
      description: "Successfully imported 28 company master records from 'Companies_Q3_2026.xlsx'.",
      timestamp: "45 mins ago",
      date: "16 Aug 2026, 08:20 PM",
      unread: true,
      category: "SYSTEM",
      actionTarget: "company-master-list"
    },
    {
      id: 3,
      type: "inventory",
      icon: <Info className="w-5 h-5 text-sky-500" />,
      bg: dark ? "rgba(14, 165, 233, 0.15)" : "#e0f2fe",
      title: "Material Issue Slip #SLIP-2026-089 Issued",
      description: "250 KG of Steel Sheet issued from Stores to Production Dept by Gaurav.",
      timestamp: "2 hours ago",
      date: "16 Aug 2026, 07:05 PM",
      unread: true,
      category: "TRANSACTION",
      actionTarget: "inventory-history"
    },
    {
      id: 4,
      type: "system",
      icon: <ShieldAlert className="w-5 h-5 text-indigo-500" />,
      bg: dark ? "rgba(99, 102, 241, 0.15)" : "#e0e7ff",
      title: "New Security Session Login",
      description: "Successful login from IP 192.168.1.104 (Plant Admin - Gaurav).",
      timestamp: "5 hours ago",
      date: "16 Aug 2026, 04:12 PM",
      unread: false,
      category: "SECURITY",
      actionTarget: null
    },
    {
      id: 5,
      type: "inventory",
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      bg: dark ? "rgba(244, 63, 94, 0.15)" : "#ffe4e6",
      title: "Transaction Reversal Requested",
      description: "Reversal request submitted for Slip #SLIP-2026-042 (SS Rod 20mm, 100 KG). Pending review.",
      timestamp: "1 day ago",
      date: "15 Aug 2026, 05:30 PM",
      unread: false,
      category: "APPROVAL",
      actionTarget: "inventory-history"
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const toggleRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: !n.unread } : n));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredList = notifications.filter(n => {
    if (filter === "unread") return n.unread;
    if (filter === "inventory") return n.type === "inventory";
    if (filter === "system") return n.type === "system";
    return true;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  const bgCard = dark ? "#1e293b" : "#ffffff";
  const bdrCard = dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)";
  const txtPrimary = dark ? "#f1f5f9" : "#0f172a";
  const txtMuted = dark ? "#94a3b8" : "#64748b";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 960, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header Banner */}
      <div style={{
        borderRadius: 20,
        padding: "24px 28px",
        background: dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        color: "#fff",
        boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 30px rgba(14,165,233,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)"
          }}>
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.3px" }}>System Notifications</h1>
            <p style={{ fontSize: 13, opacity: 0.85, margin: "4px 0 0" }}>
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.` : "All caught up! No unread notifications."}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.28)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
          >
            <Check size={14} /> Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: dark ? "rgba(148,163,184,0.08)" : "#e2e8f0", padding: 4, borderRadius: 12 }}>
          {[
            { id: "all", label: `All (${notifications.length})` },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "inventory", label: "Inventory" },
            { id: "system", label: "System" }
          ].map(t => {
            const active = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
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
                  transition: "all 0.15s"
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: 12, color: txtMuted }}>
          Showing {filteredList.length} notification{filteredList.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Notification List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredList.length === 0 ? (
          <div style={{
            background: bgCard,
            border: `1px solid ${bdrCard}`,
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            color: txtMuted
          }}>
            <Bell size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: txtPrimary }}>No notifications found</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>There are no notifications matching your selected filter.</p>
          </div>
        ) : (
          filteredList.map(n => (
            <div
              key={n.id}
              style={{
                background: bgCard,
                border: `1px solid ${n.unread ? (dark ? "#0ea5e9" : "#38bdf8") : bdrCard}`,
                borderLeft: n.unread ? `4px solid #0ea5e9` : `1px solid ${bdrCard}`,
                borderRadius: 16,
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                boxShadow: dark ? "0 2px 12px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s",
                position: "relative"
              }}
            >
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: n.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                {n.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: dark ? "rgba(148,163,184,0.14)" : "#f1f5f9",
                    color: dark ? "#38bdf8" : "#0284c7",
                    letterSpacing: "0.05em"
                  }}>
                    {n.category}
                  </span>
                  <span style={{ fontSize: 11, color: txtMuted }}>&bull; {n.timestamp}</span>
                  <span style={{ fontSize: 11, color: txtMuted }}>({n.date})</span>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 700, color: txtPrimary, margin: "0 0 4px" }}>
                  {n.title}
                </h3>
                <p style={{ fontSize: 12, color: txtMuted, margin: 0, lineHeight: 1.5 }}>
                  {n.description}
                </p>

                {n.actionTarget && setPage && (
                  <button
                    onClick={() => setPage(n.actionTarget)}
                    style={{
                      marginTop: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0ea5e9",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer"
                    }}
                  >
                    View Details <ArrowRight size={13} />
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => toggleRead(n.id)}
                  title={n.unread ? "Mark as Read" : "Mark as Unread"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 8,
                    color: n.unread ? "#0ea5e9" : txtMuted
                  }}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => deleteNotification(n.id)}
                  title="Delete notification"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 8,
                    color: dark ? "#64748b" : "#94a3b8"
                  }}
                  onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseOut={e => e.currentTarget.style.color = dark ? "#64748b" : "#94a3b8"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
