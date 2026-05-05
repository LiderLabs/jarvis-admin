"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths, addMonths, getDaysInMonth, startOfDay } from "date-fns";

const PRESETS = [
  { label: "Today",       getRange: () => ({ from: new Date(), to: new Date() }), display: () => format(new Date(), "d MMM") },
  { label: "Last 7 days", getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }), display: () => `${format(subDays(new Date(), 6), "d MMM")} - ${format(new Date(), "d MMM")}` },
  { label: "This month",  getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }), display: () => format(new Date(), "MMM") },
  { label: "Last month",  getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }), display: () => format(subMonths(new Date(), 1), "MMM") },
  { label: "All time",    getRange: () => ({ from: new Date("2020-01-01"), to: new Date() }), display: () => "" },
  { label: "Custom",      getRange: () => null, display: () => "" },
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Detect which preset label matches a given from/to pair ────────────────────
// Compares dates by formatted string so minor time differences don't matter.
function detectPreset(from: Date, to: Date): string {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr   = format(to,   "yyyy-MM-dd");
  for (const p of PRESETS) {
    if (p.label === "Custom") continue;
    const r = p.getRange();
    if (!r) continue;
    if (
      format(r.from, "yyyy-MM-dd") === fromStr &&
      format(r.to,   "yyyy-MM-dd") === toStr
    ) {
      return p.label;
    }
  }
  return "Custom";
}

function MiniCalendar({ month, selected, onSelect }: { month: Date; selected: { from?: Date; to?: Date }; onSelect: (d: Date) => void }) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = getDaysInMonth(month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (day: number) => {
    const d = new Date(year, mon, day);
    if (selected.from && format(d, "yyyy-MM-dd") === format(selected.from, "yyyy-MM-dd")) return "from";
    if (selected.to && format(d, "yyyy-MM-dd") === format(selected.to, "yyyy-MM-dd")) return "to";
    return false;
  };

  const isInRange = (day: number) => {
    if (!selected.from || !selected.to) return false;
    const d = new Date(year, mon, day);
    return d > selected.from && d < selected.to;
  };

  const isToday = (day: number) => format(new Date(year, mon, day), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const isFuture = (day: number) => new Date(year, mon, day) > new Date();

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const sel = isSelected(day);
          const inRange = isInRange(day);
          const future = isFuture(day);
          return (
            <button key={i} disabled={future} onClick={() => !future && onSelect(new Date(year, mon, day))}
              className={`h-8 w-full text-sm flex items-center justify-center rounded-full transition-colors
                ${future ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-muted cursor-pointer"}
                ${sel === "from" || sel === "to" ? "bg-green-600 text-white hover:bg-green-700 font-semibold" : ""}
                ${inRange ? "bg-green-50 dark:bg-green-950/30 rounded-none text-green-700" : ""}
                ${isToday(day) && !sel ? "text-green-600 font-semibold" : ""}
              `}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  // ── FIX: derive the initial active preset from the props, not hardcoded "Today"
  const [activePreset, setActivePreset] = useState(() => detectPreset(from, to));

  const [calMonth, setCalMonth] = useState(new Date());
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  // Keep activePreset in sync if the parent changes from/to externally
  useEffect(() => {
    setActivePreset(detectPreset(from, to));
  }, [from, to]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setShowCustom(false); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handlePreset = (preset: typeof PRESETS[0]) => {
    if (preset.label === "Custom") { setShowCustom(true); setCustomFrom(undefined); setCustomTo(undefined); return; }
    const r = preset.getRange();
    if (r) { setActivePreset(preset.label); onChange(r.from, r.to); setOpen(false); }
  };

  const handleCalSelect = (d: Date) => {
    if (!customFrom || (customFrom && customTo)) { setCustomFrom(d); setCustomTo(undefined); }
    else if (d < customFrom) { setCustomTo(customFrom); setCustomFrom(d); }
    else { setCustomTo(d); }
  };

  const handleApply = () => {
    if (customFrom && customTo) { setActivePreset("Custom"); onChange(customFrom, customTo); setOpen(false); setShowCustom(false); }
  };

  const handleReset = () => { setCustomFrom(undefined); setCustomTo(undefined); };

  const displayText = activePreset === "Custom"
    ? `${format(from, "d MMM")} - ${format(to, "d MMM, yyyy")}`
    : activePreset === "All time" ? "All time"
    : `${activePreset}  ${PRESETS.find(p => p.label === activePreset)?.display() || ""}`;

  const dropdownClass = "fixed left-1/2 -translate-x-1/2 sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 top-auto z-50 bg-card border border-border rounded-xl shadow-xl";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); setShowCustom(false); }}
        className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-card border border-border rounded-lg hover:bg-muted transition-colors">
        <span>{displayText}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
      </button>

      {open && !showCustom && (
        <div className={`${dropdownClass} w-52 py-1 mt-2 sm:mt-0 sm:top-11`}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => handlePreset(p)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <span className={activePreset === p.label ? "font-semibold" : ""}>{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.display()}</span>
            </button>
          ))}
        </div>
      )}

      {open && showCustom && (
        <div className={`${dropdownClass} w-[min(288px,90vw)] p-4 mt-2 sm:mt-0 sm:top-11`}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCalMonth(m => addMonths(m, -1))} className="p-1 hover:bg-muted rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold">{format(calMonth, "MMMM yyyy")}</span>
            <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="p-1 hover:bg-muted rounded" disabled={calMonth >= new Date()}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <MiniCalendar month={calMonth} selected={{ from: customFrom, to: customTo }} onSelect={handleCalSelect} />
          <div className="mt-3 space-y-2">
            <Input readOnly placeholder="Start date" value={customFrom ? format(customFrom, "MMM d, yyyy") : ""} className="text-sm h-9" />
            <Input readOnly placeholder="End date" value={customTo ? format(customTo, "MMM d, yyyy") : ""} className="text-sm h-9" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">Reset</Button>
            <Button size="sm" onClick={handleApply} disabled={!customFrom || !customTo} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Filter</Button>
          </div>
        </div>
      )}
    </div>
  );
}
