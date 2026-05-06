"use client"
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@liderlabs/washlab-backend/api";
import { Id } from "@liderlabs/washlab-backend/dataModel";

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

type Priority = "info" | "warning" | "urgent";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  info:    { label: "Info",    color: "#3b82f6", bg: "#eff6ff" },
  warning: { label: "Warning", color: "#f59e0b", bg: "#fffbeb" },
  urgent:  { label: "Urgent",  color: "#ef4444", bg: "#fef2f2" },
};

// Quick-pick presets (shown as chips); user can also pick a custom date
const QUICK_PRESETS = [
  { label: "2 hours",  minutes: 120 },
  { label: "Tomorrow", minutes: 24 * 60 },
  { label: "3 days",   minutes: 3 * 24 * 60 },
  { label: "1 week",   minutes: 7 * 24 * 60 },
  { label: "Custom…",  minutes: -1 }, // signals custom date input
];

function toLocalDatetimeValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins  = Math.floor(diff / (1000 * 60));
  if (days > 1)   return `${days}d left`;
  if (days === 1) return "Expires tomorrow";
  if (hours >= 1) return `${hours}h left`;
  if (mins >= 1)  return `${mins}m left`;
  return "Expires soon";
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface AddModalProps {
  branches: Array<{ _id: Id<"branches">; name: string }>;
  onClose: () => void;
  onSave: (data: {
    title: string;
    body: string;
    branchId: Id<"branches"> | null;
    priority: Priority;
    expiresAt: number;
  }) => Promise<void>;
}

function AddHeadlineModal({ branches, onClose, onSave }: AddModalProps) {
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [priority, setPriority] = useState<Priority>("info");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  // Expiry: selected preset index (or -1 = custom), and a custom datetime string
  const [presetIdx, setPresetIdx]     = useState(2); // default "3 days"
  const [customDatetime, setCustomDatetime] = useState(() =>
    toLocalDatetimeValue(Date.now() + 3 * 24 * 60 * 60 * 1000)
  );

  const isCustom = QUICK_PRESETS[presetIdx]?.minutes === -1;

  function getExpiresAt(): number {
    if (isCustom) {
      const ts = new Date(customDatetime).getTime();
      return isNaN(ts) ? 0 : ts;
    }
    return Date.now() + QUICK_PRESETS[presetIdx].minutes * 60 * 1000;
  }

  // When selecting a preset (not custom), sync the datetime input to match
  function handlePresetSelect(idx: number) {
    setPresetIdx(idx);
    const preset = QUICK_PRESETS[idx];
    if (preset.minutes > 0) {
      setCustomDatetime(toLocalDatetimeValue(Date.now() + preset.minutes * 60 * 1000));
    }
  }

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required."); return; }
    const expiresAt = getExpiresAt();
    if (expiresAt <= Date.now()) { setError("Expiry must be in the future."); return; }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        body: body.trim(),
        branchId: branchId === "all" ? null : (branchId as Id<"branches">),
        priority,
        expiresAt,
      });
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const expiresAt  = getExpiresAt();
  const previewStr = expiresAt > Date.now() ? formatDateTime(expiresAt) : null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
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
                const cfg    = PRIORITY_CONFIG[p];
                const active = priority === p;
                return (
                  <button key={p} style={{ ...styles.pill, background: active ? cfg.color : "#f4f4f5", color: active ? "#fff" : "#52525b", border: active ? `1.5px solid ${cfg.color}` : "1.5px solid #e4e4e7" }} onClick={() => setPriority(p)}>
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
            <input style={styles.input} placeholder="e.g. Academic City is on break this week" value={title} onChange={e => { setTitle(e.target.value); setError(""); }} />
          </div>

          {/* Details */}
          <div style={styles.field}>
            <label style={styles.label}>Details <span style={{ color: "#a1a1aa", fontWeight: 400 }}>(optional)</span></label>
            <textarea style={{ ...styles.input, minHeight: 80, resize: "vertical" }} placeholder="Additional info customers or staff should know..." value={body} onChange={e => setBody(e.target.value)} />
          </div>

          {/* Expiry */}
          <div style={styles.field}>
            <label style={styles.label}>Expires</label>

            {/* Quick presets */}
            <div style={styles.pillRow}>
              {QUICK_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  style={{
                    ...styles.pill,
                    background: presetIdx === i ? "#18181b" : "#f4f4f5",
                    color: presetIdx === i ? "#fff" : "#52525b",
                    border: presetIdx === i ? "1.5px solid #18181b" : "1.5px solid #e4e4e7",
                  }}
                  onClick={() => handlePresetSelect(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date/time input — always visible, updates when preset changes */}
            <div style={{ marginTop: 10 }}>
              <input
                type="datetime-local"
                style={{
                  ...styles.input,
                  color: "#18181b",
                  cursor: "pointer",
                  // highlight border when user is in custom mode
                  borderColor: isCustom ? "#18181b" : "#e4e4e7",
                }}
                value={customDatetime}
                min={toLocalDatetimeValue(Date.now() + 60 * 1000)}
                onChange={e => {
                  setCustomDatetime(e.target.value);
                  // switch to custom mode if the user manually edits
                  setPresetIdx(QUICK_PRESETS.length - 1);
                  setError("");
                }}
              />
            </div>

            {/* Preview */}
            {previewStr && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#71717a", display: "flex", alignItems: "center", gap: 4 }}>
                <ClockIcon />
                Expires <strong style={{ color: "#18181b", marginLeft: 2 }}>{previewStr}</strong>
              </p>
            )}
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "4px 0 0" }}>{error}</p>}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>{saving ? "Posting…" : "Post Headline"}</button>
        </div>
      </div>
    </div>
  );
}

function HeadlineCard({ headline, branchName, onDelete }: { headline: any; branchName: string; onDelete: (id: Id<"headlines">) => void }) {
  const cfg     = PRIORITY_CONFIG[headline.priority as Priority];
  const timeStr = timeLeft(headline.expiresAt);
  return (
    <div style={styles.card}>
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
            <span style={{ ...styles.timeBadge, color: timeStr.includes("soon") || timeStr.includes("tomorrow") || timeStr.includes("h left") || timeStr.includes("m left") ? "#f59e0b" : "#52525b" }}>
              <ClockIcon />{timeStr}
            </span>
            <button style={styles.deleteBtn} onClick={() => onDelete(headline._id)} title="Delete headline"><TrashIcon /></button>
          </div>
        </div>
        <h3 style={styles.cardTitle}>{headline.title}</h3>
        {headline.body && <p style={styles.cardBody}>{headline.body}</p>}
        <p style={styles.cardFooter}>Posted {formatDate(headline.createdAt)} · Expires {formatDateTime(headline.expiresAt)}</p>
      </div>
    </div>
  );
}

export default function AdminHeadlines() {
  const [showModal, setShowModal] = useState(false);
  const branches  = useQuery(api.branches.getActive) ?? [];
  const headlines = useQuery(api.headlines.getAll) ?? [];
  const createHeadline = useMutation(api.headlines.create);
  const deleteHeadline = useMutation(api.headlines.remove);
  const now    = Date.now();
  const active = headlines.filter((h: any) => !h.isDeleted && h.expiresAt > now);

  function getBranchName(branchId?: Id<"branches">) {
    if (!branchId) return "All Branches";
    return branches.find((b: any) => b._id === branchId)?.name ?? "Unknown";
  }

  async function handleDelete(id: Id<"headlines">) {
    if (!window.confirm("Delete this headline?")) return;
    await deleteHeadline({ headlineId: id });
  }

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.pageTitle}>
          <h1 style={styles.h1}>Headlines</h1>
          {active.length > 0 && <span style={styles.activeBadge}>{active.length} active</span>}
        </div>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          <PlusIcon /> Add Headline
        </button>
      </div>

      {active.length === 0 ? (
        <div style={styles.empty}>
          <MegaphoneIcon />
          <p style={{ margin: "8px 0 0", color: "#a1a1aa", fontSize: 14 }}>No active headlines. Add one above.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {active.map((h: any) => (
            <HeadlineCard key={h._id} headline={h} branchName={getBranchName(h.branchId)} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <AddHeadlineModal
          branches={branches}
          onClose={() => setShowModal(false)}
          onSave={async (data) => { await createHeadline(data); }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "28px 32px", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" },
  pageTitle: { display: "flex", alignItems: "center", gap: 10 },
  h1: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: "#18181b" },
  activeBadge: { background: "#dcfce7", color: "#16a34a", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 99 },
  addBtn: { display: "flex", alignItems: "center", gap: 6, background: "#18181b", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  grid: { display: "flex", flexDirection: "column", gap: 12, width: "100%" },
  card: { display: "flex", background: "#fff", border: "1.5px solid #e4e4e7", borderRadius: 12, overflow: "hidden", width: "100%", boxSizing: "border-box" },
  priorityBar: { width: 4, flexShrink: 0 },
  cardContent: { flex: 1, padding: "14px 16px", minWidth: 0 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" },
  cardMeta: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  priorityBadge: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.4px" },
  branchTag: { fontSize: 12, color: "#52525b", background: "#f4f4f5", padding: "2px 8px", borderRadius: 99, fontWeight: 500 },
  cardRight: { display: "flex", alignItems: "center", gap: 10 },
  timeBadge: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500 },
  deleteBtn: { background: "none", border: "1px solid #e4e4e7", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#a1a1aa", display: "flex", alignItems: "center" },
  cardTitle: { margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#18181b", lineHeight: 1.35 },
  cardBody: { margin: "0 0 8px", fontSize: 13, color: "#52525b", lineHeight: 1.5 },
  cardFooter: { margin: 0, fontSize: 11, color: "#a1a1aa" },
  empty: { textAlign: "center", padding: "60px 20px", color: "#a1a1aa", display: "flex", flexDirection: "column", alignItems: "center" },
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #f4f4f5" },
  modalTitle: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16, color: "#18181b" },
  modalBody: { padding: "20px", display: "flex", flexDirection: "column", gap: 16 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid #f4f4f5" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#3f3f46" },
  input: { border: "1.5px solid #e4e4e7", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#18181b", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const },
  select: { border: "1.5px solid #e4e4e7", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#18181b", background: "#fff", outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer" },
  pillRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  pill: { display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s" },
  cancelBtn: { background: "#f4f4f5", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 500, color: "#52525b", cursor: "pointer" },
  saveBtn: { background: "#18181b", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#71717a", display: "flex", padding: 4 },
};