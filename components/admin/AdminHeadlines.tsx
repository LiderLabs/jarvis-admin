"use client"
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@jordan6699/washlab-backend/api";
import { Id } from "@jordan6699/washlab-backend/dataModel";

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

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; darkBg: string }> = {
  info:    { label: "Info",    color: "#3b82f6", bg: "#eff6ff", darkBg: "rgba(59,130,246,0.15)" },
  warning: { label: "Warning", color: "#f59e0b", bg: "#fffbeb", darkBg: "rgba(245,158,11,0.15)" },
  urgent:  { label: "Urgent",  color: "#ef4444", bg: "#fef2f2", darkBg: "rgba(239,68,68,0.15)"  },
};

const QUICK_PRESETS = [
  { label: "2 hours",  duration: "2 hours", minutes: 120 },
  { label: "Tomorrow", duration: "1 day",   minutes: 24 * 60 },
  { label: "3 days",   duration: "3 days",  minutes: 3 * 24 * 60 },
  { label: "1 week",   duration: "1 week",  minutes: 7 * 24 * 60 },
  { label: "Custom…",  duration: "",        minutes: -1 },
];

function toLocalDatetimeValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function getDurationLabel(createdAt: number, expiresAt: number): string {
  const diffMs    = expiresAt - createdAt;
  const diffMins  = Math.round(diffMs / 60000);
  if (diffMins < 60)  return `Runs for ${diffMins}m`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `Runs for ${diffHours}h`;
  const diffDays  = Math.round(diffHours / 24);
  if (diffDays === 1) return `Runs for 1 day`;
  if (diffDays < 14)  return `Runs for ${diffDays} days`;
  const diffWeeks = Math.round(diffDays / 7);
  return `Runs for ${diffWeeks} week${diffWeeks > 1 ? "s" : ""}`;
}

// ── Add Modal ────────────────────────────────────────────────────────────────

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
  const [title, setTitle]               = useState("");
  const [body, setBody]                 = useState("");
  const [branchId, setBranchId]         = useState<string>("all");
  const [priority, setPriority]         = useState<Priority>("info");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [presetIdx, setPresetIdx]       = useState(2);
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

  const expiresAt   = getExpiresAt();
  const previewStr  = expiresAt > Date.now() ? formatDateTime(expiresAt) : null;
  const durationStr = !isCustom && QUICK_PRESETS[presetIdx]?.duration
    ? `Runs for ${QUICK_PRESETS[presetIdx].duration}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-card text-card-foreground rounded-2xl w-full max-w-[520px] shadow-2xl overflow-hidden border border-border" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 font-bold text-base text-foreground">
            <MegaphoneIcon />
            <span>New Headline</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground p-1" onClick={onClose}><XIcon /></button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Branch</label>
            <select
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none cursor-pointer w-full"
              value={branchId} onChange={e => setBranchId(e.target.value)}
            >
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {(["info", "warning", "urgent"] as Priority[]).map(p => {
                const cfg    = PRIORITY_CONFIG[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{ borderColor: active ? cfg.color : undefined, background: active ? cfg.color : undefined }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? "text-white" : "border-border bg-muted text-muted-foreground"}`}
                  >
                    <span style={{ background: active ? "#fff" : cfg.color }} className="w-1.5 h-1.5 rounded-full inline-block" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Title <span className="text-red-500">*</span></label>
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none w-full placeholder:text-muted-foreground"
              placeholder="e.g. Academic City is on break this week"
              value={title} onChange={e => { setTitle(e.target.value); setError(""); }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Details <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none w-full placeholder:text-muted-foreground resize-y min-h-[80px]"
              placeholder="Additional info customers or staff should know..."
              value={body} onChange={e => setBody(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Duration</label>
            <div className="flex gap-2 flex-wrap">
              {QUICK_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => handlePresetSelect(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${presetIdx === i ? "bg-blue-600 text-white border-blue-600" : "bg-muted text-muted-foreground border-border"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              className={`mt-1 border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none w-full cursor-pointer ${isCustom ? "border-blue-500" : "border-border"}`}
              value={customDatetime}
              min={toLocalDatetimeValue(Date.now() + 60 * 1000)}
              onChange={e => { setCustomDatetime(e.target.value); setPresetIdx(QUICK_PRESETS.length - 1); setError(""); }}
            />
            {previewStr && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <ClockIcon />
                {durationStr && <><strong className="text-foreground">{durationStr}</strong>&nbsp;·&nbsp;</>}
                Ends <strong className="text-foreground ml-1">{previewStr}</strong>
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" onClick={handleSubmit} disabled={saving}>
            {saving ? "Posting…" : "Post Headline"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Headline Card ─────────────────────────────────────────────────────────────

function HeadlineCard({ headline, branchName, onDelete }: { headline: any; branchName: string; onDelete: (id: Id<"headlines">) => void }) {
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const cfg         = PRIORITY_CONFIG[headline.priority as Priority];
  const durationStr = getDurationLabel(headline.createdAt, headline.expiresAt);
  const endStr      = formatDateTime(headline.expiresAt);
  const showDelete  = clickCount >= 3;

  function handleClick() {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (clickTimer) clearTimeout(clickTimer);
    const t = setTimeout(() => setClickCount(0), 2000);
    setClickTimer(t);
  }

  return (
    <div
      className="flex w-full rounded-xl overflow-hidden border border-border bg-card cursor-default"
      onClick={handleClick}
    >
      {/* Priority bar */}
      <div className="w-1 shrink-0" style={{ background: cfg.color }} />

      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority badge */}
            <span
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ color: cfg.color, background: cfg.darkBg }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
              {cfg.label}
            </span>
            {/* Branch tag */}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {branchName}
            </span>
          </div>

          {showDelete && (
            <button
              className="flex items-center gap-1.5 text-xs font-medium text-red-500 border border-red-300 dark:border-red-800 rounded-lg px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
              onClick={e => { e.stopPropagation(); onDelete(headline._id); }}
            >
              <TrashIcon />
              Delete
            </button>
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-1 leading-snug">{headline.title}</h3>
        {headline.body && <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{headline.body}</p>}
        <p className="text-[11px] text-muted-foreground">
          <strong className="text-foreground">Posted {formatDate(headline.createdAt)}</strong>
          {" · "}
          <strong className="text-foreground">{durationStr}</strong>
          {" · Ends "}
          <strong className="text-foreground">{endStr}</strong>
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminHeadlines() {
  const [showModal, setShowModal] = useState(false);

  const branches       = useQuery(api.branches.getActive) ?? [];
  const headlines      = useQuery(api.headlines.getAll) ?? [];
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
    <div className="p-6 w-full box-border font-sans text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Headlines</h1>
          {active.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {active.length} active
            </span>
          )}
        </div>
        <button
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          onClick={() => setShowModal(true)}
        >
          <PlusIcon /> Add Headline
        </button>
      </div>

      {/* Cards */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MegaphoneIcon />
          <p className="mt-2 text-sm">No active headlines. Add one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {active.map((h: any) => (
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
          onSave={async (data) => { await createHeadline(data); }}
        />
      )}
    </div>
  );
}
