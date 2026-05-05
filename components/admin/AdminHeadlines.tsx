"use client"
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@liderlabs/washlab-backend/api";
import { Id } from "@liderlabs/washlab-backend/dataModel";


// ── Icons (inline SVG to avoid extra deps) ──────────────────────────────────
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const MegaphoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────
type Priority = "info" | "warning" | "urgent";
type FilterTab = "active" | "expired" | "all";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  info:    { label: "Info",    color: "#3b82f6", bg: "#eff6ff", dot: "#93c5fd" },
  warning: { label: "Warning", color: "#f59e0b", bg: "#fffbeb", dot: "#fcd34d" },
  urgent:  { label: "Urgent",  color: "#ef4444", bg: "#fef2f2", dot: "#fca5a5" },
};

const EXPIRY_OPTIONS = [
  { label: "1 day",    value: 1 },
  { label: "3 days",   value: 3 },
  { label: "1 week",   value: 7 },
  { label: "2 weeks",  value: 14 },
  { label: "1 month",  value: 30 },
  { label: "3 months", value: 90 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (days > 1) return `${days}d left`;
  if (days === 1) return "Expires tomorrow";
  if (hours >= 1) return `${hours}h left`;
  return "Expires soon";
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Add Headline Modal ───────────────────────────────────────────────────────
interface AddModalProps {
  branches: Array<{ _id: Id<"branches">; name: string }>;
  onClose: () => void;
  onSave: (data: {
    title: string;
    body?: string;
    branchId?: Id<"branches">;
    priority: Priority;
    expiresAt: number;
  }) => Promise<void>;
}

function AddHeadlineModal({ branches, onClose, onSave }: AddModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [priority, setPriority] = useState<Priority>("info");
  const [expiryDays, setExpiryDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        body: body.trim() || undefined,
        branchId: branchId === "all" ? undefined : (branchId as Id<"branches">),
        priority,
        expiresAt: Date.now() + expiryDays * 24 * 60 * 60 * 1000,
      });
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>
            <MegaphoneIcon />
            <span>New Headline</span>
          </div>
          <button style={styles.iconBtn} onClick={onClose}><XIcon /></button>
        </div>

        <div style={styles.modalBody}>
          {/* Branch */}
          <div style={styles.field}>
            <label style={styles.label}>Branch</label>
            <select style={styles.select} value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div style={styles.field}>
            <label style={styles.label}>Priority</label>
            <div style={styles.pillRow}>
             {(["info", "warning", "urgent"] as Priority[]).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    style={{
                      ...styles.pill,
                      background: active ? cfg.color : "#f4f4f5",
                      color: active ? "#fff" : "#52525b",
                      border: active ? `1.5px solid ${cfg.color}` : "1.5px solid #e4e4e7",
                    }}
                    onClick={() => setPriority(p)}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#fff" : cfg.color, display: "inline-block" }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div style={styles.field}>
            <label style={styles.label}>Title <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              style={styles.input}
              placeholder="e.g. Academic City is on break this week"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(""); }}
            />
          </div>

          {/* Body */}
          <div style={styles.field}>
            <label style={styles.label}>Details <span style={{ color: "#a1a1aa", fontWeight: 400 }}>(optional)</span></label>
            <textarea
              style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
              placeholder="Additional info customers or staff should know..."
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          {/* Expiry */}
          <div style={styles.field}>
            <label style={styles.label}>Expires after</label>
            <div style={styles.pillRow}>
              {EXPIRY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  style={{
                    ...styles.pill,
                    background: expiryDays === opt.value ? "#18181b" : "#f4f4f5",
                    color: expiryDays === opt.value ? "#fff" : "#52525b",
                    border: expiryDays === opt.value ? "1.5px solid #18181b" : "1.5px solid #e4e4e7",
                  }}
                  onClick={() => setExpiryDays(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "4px 0 0" }}>{error}</p>}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? "Posting…" : "Post Headline"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Headline Card ────────────────────────────────────────────────────────────
interface HeadlineCardProps {
  headline: any;
  branchName: string;
  onDelete: (id: Id<"headlines">) => void;
}

function HeadlineCard({ headline, branchName, onDelete }: HeadlineCardProps) {
  const cfg = PRIORITY_CONFIG[headline.priority as Priority];
  const expired = headline.expiresAt < Date.now();
  const timeStr = timeLeft(headline.expiresAt);

  return (
    <div style={{ ...styles.card, opacity: expired ? 0.65 : 1 }}>
      {/* Priority bar */}
      <div style={{ ...styles.priorityBar, background: cfg.color }} />

      <div style={styles.cardContent}>
        <div style={styles.cardTop}>
          <div style={styles.cardMeta}>
            <span style={{ ...styles.priorityBadge, background: cfg.bg, color: cfg.color }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
              {cfg.label}
            </span>
            <span style={styles.branchTag}>{branchName}</span>
          </div>

          <div style={styles.cardRight}>
            <span style={{ ...styles.timeBadge, color: expired ? "#a1a1aa" : timeStr.includes("soon") || timeStr.includes("tomorrow") ? "#f59e0b" : "#52525b" }}>
              <ClockIcon />
              {timeStr}
            </span>
            <button
              style={styles.deleteBtn}
              onClick={() => onDelete(headline._id)}
              title="Delete headline"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        <h3 style={styles.cardTitle}>{headline.title}</h3>
        {headline.body && <p style={styles.cardBody}>{headline.body}</p>}

        <p style={styles.cardFooter}>
          Posted {formatDate(headline.createdAt)} · Expires {formatDate(headline.expiresAt)}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminHeadlines() {
  const [filter, setFilter] = useState<FilterTab>("active");
  const [showModal, setShowModal] = useState(false);

  const branches = useQuery(api.branches.getActive) ?? [];
  const headlines = useQuery(api.headlines.getAll) ?? [];

  const createHeadline = useMutation(api.headlines.create);
  const deleteHeadline = useMutation(api.headlines.remove);

  const now = Date.now();

  const filtered = headlines.filter((h: any) => {
    if (filter === "active") return !h.isDeleted && h.expiresAt > now;
    if (filter === "expired") return !h.isDeleted && h.expiresAt <= now;
    return !h.isDeleted;
  });

  const activeCount = headlines.filter((h: any) => !h.isDeleted && h.expiresAt > now).length;

  function getBranchName(branchId?: Id<"branches">) {
    if (!branchId) return "All Branches";
    return branches.find((b: any) => b._id === branchId)?.name ?? "Unknown";
  }

  async function handleSave(data: any) {
    await createHeadline(data);
  }

  async function handleDelete(id: Id<"headlines">) {
    if (!window.confirm("Delete this headline?")) return;
  await deleteHeadline({ headlineId: id });
  }

  return (
    <div style={styles.page}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.pageTitle}>
            <MegaphoneIcon />
            <h1 style={styles.h1}>Headlines</h1>
            {activeCount > 0 && <span style={styles.activeBadge}>{activeCount} active</span>}
          </div>
          <p style={styles.pageSubtitle}>Post notices and updates visible to customers and staff at each branch.</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          <PlusIcon /> Add Headline
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={styles.tabs}>
        {(["active", "expired", "all"] as FilterTab[]).map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(filter === tab ? styles.tabActive : {}) }}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <MegaphoneIcon />
          <p style={{ margin: "8px 0 0", color: "#a1a1aa", fontSize: 14 }}>
            {filter === "active" ? "No active headlines. Add one above." : "No headlines here."}
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((h: any) => (
            <HeadlineCard
              key={h._id}
              headline={h}
              branchName={getBranchName(h.branchId)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddHeadlineModal
          branches={branches}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "28px 32px",
    maxWidth: 860,
    fontFamily: "'DM Sans', sans-serif",
  },
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
  },
  pageTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#18181b",
    marginBottom: 4,
  },
  h1: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.4px",
    color: "#18181b",
  },
  activeBadge: {
    background: "#dcfce7",
    color: "#16a34a",
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 99,
  },
  pageSubtitle: {
    margin: 0,
    color: "#71717a",
    fontSize: 14,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#18181b",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
    borderBottom: "1.5px solid #f4f4f5",
    paddingBottom: 0,
  },
  tab: {
    background: "none",
    border: "none",
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 500,
    color: "#71717a",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    marginBottom: -1.5,
    transition: "color .15s, border-color .15s",
  },
  tabActive: {
  color: "#18181b",
  borderBottom: "2px solid #18181b",
  fontWeight: 600,
},
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    display: "flex",
    background: "#fff",
    border: "1.5px solid #e4e4e7",
    borderRadius: 12,
    overflow: "hidden",
    transition: "box-shadow .15s",
  },
  priorityBar: {
    width: 4,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    padding: "14px 16px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
    flexWrap: "wrap",
  },
  cardMeta: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  priorityBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 99,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  branchTag: {
    fontSize: 12,
    color: "#52525b",
    background: "#f4f4f5",
    padding: "2px 8px",
    borderRadius: 99,
    fontWeight: 500,
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  timeBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 500,
  },
  deleteBtn: {
    background: "none",
    border: "1px solid #e4e4e7",
    borderRadius: 6,
    padding: "4px 6px",
    cursor: "pointer",
    color: "#a1a1aa",
    display: "flex",
    alignItems: "center",
    transition: "color .15s, border-color .15s",
  },
  cardTitle: {
    margin: "0 0 4px",
    fontSize: 15,
    fontWeight: 600,
    color: "#18181b",
    lineHeight: 1.35,
  },
  cardBody: {
    margin: "0 0 8px",
    fontSize: 13,
    color: "#52525b",
    lineHeight: 1.5,
  },
  cardFooter: {
    margin: 0,
    fontSize: 11,
    color: "#a1a1aa",
  },
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#a1a1aa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  // Modal
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px",
    borderBottom: "1px solid #f4f4f5",
  },
  modalTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    fontSize: 16,
    color: "#18181b",
  },
  modalBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "14px 20px",
    borderTop: "1px solid #f4f4f5",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#3f3f46",
  },
  input: {
    border: "1.5px solid #e4e4e7",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    color: "#18181b",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    border: "1.5px solid #e4e4e7",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    color: "#18181b",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    cursor: "pointer",
  },
  pillRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 12px",
    borderRadius: 99,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all .15s",
  },
  cancelBtn: {
    background: "#f4f4f5",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 500,
    color: "#52525b",
    cursor: "pointer",
  },
  saveBtn: {
    background: "#18181b",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#71717a",
    display: "flex",
    padding: 4,
  },
};
