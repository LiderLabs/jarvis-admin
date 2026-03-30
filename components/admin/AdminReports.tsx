'use client';
import AdminReportDetail from './AdminReportDetail';

import { useState, useMemo } from 'react';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  format, subDays, getISOWeek, getYear,
  startOfISOWeek, endOfISOWeek, addWeeks, subWeeks, isSameWeek,
} from 'date-fns';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
  Download, TrendingUp, TrendingDown, Eye, BarChart2,
  ArrowLeft, Target, Calendar, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Week Picker — navigate ISO weeks with arrows, no calendar popup needed
// ─────────────────────────────────────────────────────────────────────────────

function WeekPicker({
  value,
  onChange,
}: {
  value: Date
  onChange: (weekStart: Date) => void
}) {
  const now        = new Date()
  const isThisWeek = isSameWeek(value, now, { weekStartsOn: 1 })
  const weekNum    = getISOWeek(value)
  const weekYear   = getYear(value)
  const weekStart  = startOfISOWeek(value)
  const weekEnd    = endOfISOWeek(value)

  return (
    <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg px-1 py-1 h-9">
      <button
        onClick={() => onChange(startOfISOWeek(subWeeks(value, 1)))}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Previous week"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1.5 px-2 min-w-[200px] justify-center">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          W{weekNum} {weekYear}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          · {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
        </span>
        {isThisWeek && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            Now
          </span>
        )}
      </div>

      <button
        onClick={() => { if (!isThisWeek) onChange(startOfISOWeek(addWeeks(value, 1))) }}
        disabled={isThisWeek}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next week"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ title, value, change }: { title: string; value: string | number; change?: number }) {
  const isPos = (change ?? 0) >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPos ? 'text-green-600' : 'text-red-500'}`}>
          {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPos ? '+' : ''}{change}%
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart Tooltip
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? `GHS ${p.value.toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV helper
// ─────────────────────────────────────────────────────────────────────────────

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv  = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Exported');
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Reports Page
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyReportsPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // Week picker — defaults to current ISO week
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());

  const weekNum   = getISOWeek(selectedWeek)
  const weekYear  = getYear(selectedWeek)
  const weekStart = startOfISOWeek(selectedWeek)
  const weekEnd   = endOfISOWeek(selectedWeek)

  const weeklyStats = useQuery((api as any).admin.getWeeklyOrderStats) ?? [];

  // 12 weeks of history (84 days)
  const trends = useQuery((api as any).analytics.getRevenueTrends, {
    period: 'weekly',
    days: 84,
  }) ?? [];

  // Current week branch rows
  const branchRows = useMemo(() => (weeklyStats as any[]).map((s: any) => {
    const target   = s.weeklyTarget ?? 0;
    const orders   = s.weeklyOrders ?? 0;
    const pct      = target > 0 ? (orders / target) * 100 : null;
    const hit      = pct !== null && pct >= 100;
    const exceeded = hit && orders > target;
    return { ...s, target, orders, pct, hit, exceeded };
  }), [weeklyStats]);

  // History rows: newest first, up to 12
  const historyRows = useMemo(() =>
    [...(trends as any[])].reverse().slice(0, 12),
    [trends]
  );

  // Average based on fully completed weeks (skip the current in-progress one)
  const completedWeeks = historyRows.slice(1);
  const avgOrders = completedWeeks.length > 0
    ? Math.round(completedWeeks.reduce((s: number, r: any) => s + r.orders, 0) / completedWeeks.length)
    : 0;
  const avgRevenue = completedWeeks.length > 0
    ? completedWeeks.reduce((s: number, r: any) => s + r.revenue, 0) / completedWeeks.length
    : 0;

  // Export current week
  const exportCurrentWeek = () => {
    const rows = [
      ['Week', 'Dates', 'Branch', 'Target', 'Total Orders', 'Status', 'Gap / Surplus'],
      ...branchRows.map(r => {
        let status = 'In Progress';
        let gap    = '';
        if (!r.target)        { status = 'No Target'; }
        else if (r.exceeded)  { status = 'Exceeded'; gap = `+${r.orders - r.target}`; }
        else if (r.hit)       { status = 'Target Hit'; gap = '0'; }
        else                  { status = 'Unachieved'; gap = `-${r.target - r.orders}`; }
        return [
          `W${weekNum} ${weekYear}`,
          `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
          r.branchName, r.target || '—', r.orders, status, gap,
        ];
      }),
    ];
    downloadCSV(rows, `weekly-report-W${weekNum}-${weekYear}.csv`);
  };

  // Export history
  const exportHistory = () => {
    const rows = [
      ['Week', 'Mon – Sun', 'Total Orders', 'Revenue (GHS)', 'vs Weekly Average'],
      ...historyRows.map((r: any, i: number) => {
        const vsAvg = avgOrders > 0 && i > 0
          ? ((r.orders - avgOrders) / avgOrders * 100).toFixed(1) + '%'
          : i === 0 ? 'In Progress' : '—';

        let weekRangeLabel = '';
        try {
          const [wPart, yPart] = (r.period as string).split(' ');
          const wn   = parseInt(wPart.replace('W', ''));
          const yr   = parseInt(yPart);
          const jan4 = new Date(yr, 0, 4);
          const ws   = startOfISOWeek(new Date(jan4.getTime() + (wn - 1) * 7 * 86400000));
          const we   = endOfISOWeek(ws);
          weekRangeLabel = `${format(ws, 'MMM d')} – ${format(we, 'MMM d')}`;
        } catch {}

        return [r.period, weekRangeLabel, r.orders, r.revenue.toFixed(2), vsAvg];
      }),
    ];
    downloadCSV(rows, `weekly-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Weekly Reports</h1>
            <p className="text-xs text-muted-foreground">Branch targets and weekly performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'current' && (
            <>
              <WeekPicker value={selectedWeek} onChange={setSelectedWeek} />
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCurrentWeek}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </>
          )}
          {activeTab === 'history' && (
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportHistory}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {(['current', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab === 'current' ? 'This Week' : 'Week History'}
          </button>
        ))}
      </div>

      {/* ══ THIS WEEK ══ */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              W{weekNum} {weekYear}
            </span>
            <span>·</span>
            <span>{format(weekStart, 'EEEE, MMM d')} – {format(weekEnd, 'EEEE, MMM d')}</span>
          </div>

          {branchRows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Target className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No branch data available.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Branch</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Target</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Orders</th>
                        <th className="text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3 w-44">Progress</th>
                        <th className="text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchRows.map(r => {
                        const pct      = r.pct !== null ? Math.min(r.pct, 100) : 0;
                        const barColor = r.exceeded ? 'bg-purple-500' : r.hit ? 'bg-green-500' : r.pct !== null && r.pct >= 75 ? 'bg-yellow-400' : 'bg-blue-500';

                        let resultNode: React.ReactNode;
                        if (!r.target) {
                          resultNode = <span className="text-xs text-muted-foreground italic">No target set</span>;
                        } else if (r.exceeded) {
                          resultNode = (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Exceeded by {r.orders - r.target}
                            </span>
                          );
                        } else if (r.hit) {
                          resultNode = (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Target hit
                            </span>
                          );
                        } else {
                          const gap = r.target - r.orders;
                          resultNode = (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                              <XCircle className="w-3.5 h-3.5" />
                              {gap} order{gap !== 1 ? 's' : ''} to go
                            </span>
                          );
                        }

                        return (
                          <tr key={r.branchId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <p className="text-sm font-semibold text-foreground">{r.branchName}</p>
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                              {r.target > 0 ? r.target : <span className="italic">—</span>}
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-bold text-foreground">
                              {r.orders}
                            </td>
                            <td className="px-5 py-3">
                              {r.target > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                                    {r.pct !== null ? `${r.pct.toFixed(0)}%` : '—'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3">{resultNode}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══ WEEK HISTORY ══ */}
      {activeTab === 'history' && (
        <div className="space-y-4">

          {/* Explanation banner */}
          <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-foreground">Week-by-week breakdown</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each row is one ISO week (Monday – Sunday), newest at the top.
              The <strong className="text-foreground">vs Average</strong> column shows how that week compared
              to the typical weekly performance. The current week is marked "In Progress" — its numbers will
              change until the week ends on Sunday.
            </p>
          </div>

          {/* Averages summary */}
          {avgOrders > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl px-4 py-3">
                <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg orders / week</p>
                  <p className="text-base font-bold text-foreground">{avgOrders.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl px-4 py-3">
                <BarChart2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg revenue / week</p>
                  <p className="text-base font-bold text-foreground">
                    GHS {avgRevenue.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {historyRows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BarChart2 className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No history available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Week</th>
                        <th className="text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Mon – Sun</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Total Orders</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">Revenue</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-5 py-3">vs Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((r: any, i: number) => {
                        const isCurrent = i === 0;
                        const vsAvg = avgOrders > 0 && !isCurrent
                          ? ((r.orders - avgOrders) / avgOrders) * 100
                          : null;
                        const above = vsAvg !== null && vsAvg >= 0;

                        // Derive Mon–Sun label from the period string e.g. "W12 2025"
                        let weekRangeLabel = '';
                        try {
                          const [wPart, yPart] = (r.period as string).split(' ');
                          const wn   = parseInt(wPart.replace('W', ''));
                          const yr   = parseInt(yPart);
                          const jan4 = new Date(yr, 0, 4);
                          const ws   = startOfISOWeek(new Date(jan4.getTime() + (wn - 1) * 7 * 86400000));
                          const we   = endOfISOWeek(ws);
                          weekRangeLabel = `${format(ws, 'MMM d')} – ${format(we, 'MMM d')}`;
                        } catch {}

                        return (
                          <tr
                            key={r.period}
                            className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors
                              ${isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}`}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">{r.period}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                    In Progress
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs text-muted-foreground">{weekRangeLabel}</span>
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-bold text-foreground">
                              {r.orders.toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-foreground">
                              GHS {r.revenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {vsAvg !== null ? (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${above ? 'text-green-600' : 'text-red-500'}`}>
                                  {above ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {above ? '+' : ''}{vsAvg.toFixed(1)}%
                                </span>
                              ) : isCurrent ? (
                                <span className="text-xs text-muted-foreground italic">In progress</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Showing up to 12 weeks · all branches combined · based on {completedWeeks.length} completed weeks for averages.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports Overview
// ─────────────────────────────────────────────────────────────────────────────

const AdminReportsOverview = ({ onViewReport, onWeeklyReports }: {
  onViewReport?: (id: string) => void
  onWeeklyReports: () => void
}) => {
  const [dateFrom, setDateFrom]             = useState<Date>(new Date());
  const [dateTo, setDateTo]                 = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [showAllReports, setShowAllReports] = useState(false);

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];
  const branches    = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];
  const branchMap   = Object.fromEntries(branches.map((b: any) => [b._id, b.name]));

  const { results: ordersPages } = usePaginatedQuery(api.admin.getOrders, {} as any, { initialNumItems: 200 });
  const orders = ordersPages?.flat() ?? [];

  const allRecentReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
      endDate:   format(new Date(), 'yyyy-MM-dd'),
      ...(selectedBranch !== 'all' ? { branchId: selectedBranch } : {}),
      limit: 200,
    }
  ) ?? [];

  const startDateStr = format(dateFrom, 'yyyy-MM-dd');
  const endDateStr   = format(dateTo,   'yyyy-MM-dd');

  const dailyReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: startDateStr,
      endDate:   endDateStr,
      ...(selectedBranch !== 'all' ? { branchId: selectedBranch } : {}),
      limit: 100,
    }
  ) ?? [];

  const startTs = new Date(dateFrom).setHours(0, 0, 0, 0);
  const endTs   = new Date(dateTo).setHours(23, 59, 59, 999);

  const filtered = useMemo(() =>
    orders.filter((o: any) =>
      o._creationTime >= startTs && o._creationTime <= endTs &&
      (selectedBranch === 'all' || o.branchId === selectedBranch)
    ),
    [orders, startTs, endTs, selectedBranch]
  );

  const prevFiltered = useMemo(() => {
    const rangeMs   = dateTo.getTime() - dateFrom.getTime();
    const prevStart = new Date(dateFrom.getTime() - rangeMs).getTime();
    return orders.filter((o: any) => o._creationTime >= prevStart && o._creationTime < startTs);
  }, [orders, startTs, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalRevenue = (dailyReports as any[]).reduce((s: number, r: any) =>
      s + (r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0), 0);
    const mobileMoney  = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.mobileMoneylAmount || 0), 0);
    const card         = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cardAmount || 0) + (r.paystackAmount || 0), 0);
    const cash         = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cashAmount || 0), 0);

    const dDiff  = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1);
    const dayMap: Record<string, { revenue: number; orders: number; mobileMoney: number; cash: number; card: number }> = {};
    for (let i = dDiff - 1; i >= 0; i--) {
      const d = format(subDays(dateTo, i), 'MMM d');
      dayMap[d] = { revenue: 0, orders: 0, mobileMoney: 0, cash: 0, card: 0 };
    }

    (dailyReports as any[]).forEach((r: any) => {
      const d = format(new Date(r.date), 'MMM d');
      if (dayMap[d]) {
        dayMap[d].revenue     += (r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0);
        dayMap[d].mobileMoney += r.mobileMoneylAmount || 0;
        dayMap[d].cash        += r.cashAmount || 0;
        dayMap[d].card        += (r.cardAmount || 0) + (r.paystackAmount || 0);
      }
    });
    filtered.forEach((o: any) => {
      const d = format(new Date(o._creationTime), 'MMM d');
      if (dayMap[d]) dayMap[d].orders += 1;
    });

    const chartData        = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));
    const step             = dDiff <= 7 ? 1 : dDiff <= 30 ? 5 : 10;
    const chartDataLabeled = chartData.map((d, i) => ({ ...d, displayDate: i % step === 0 ? d.date : '' }));

    const totalTokens = (dailyReports as any[])
      .filter((r: any) => r.status === 'submitted' || r.status === 'submitted_with_outstanding')
      .reduce((s: number, r: any) => s + (r.totalTokensUsed || 0), 0);

    return { totalRevenue, mobileMoney, card, cash, chartData: chartDataLabeled, totalTokens, totalOrders: filtered.length };
  }, [filtered, prevFiltered, dateFrom, dateTo, dailyReports]);

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['Date', 'Branch', 'Attendants', 'Tokens Used', 'Token Value (GHS)', 'Unpaid Amount (GHS)', 'Outstanding Payment Received (GHS)', 'Cash (GHS)', 'Mobile Money (GHS)', 'Card (GHS)', 'Total Revenue (GHS)', 'Vouchers Used', 'Status'],
      ...(dailyReports as any[]).map((r: any) => {
        const cash         = r.cashAmount || 0;
        const mobile       = r.mobileMoneylAmount || 0;
        const card         = (r.cardAmount || 0) + (r.paystackAmount || 0);
        const totalRevenue = cash + mobile + card;

        // Calculate token value from fields saved on the report
        // washerPrice/dryerPrice default to 25 if not stored (matches backend default)
        const washerPrice  = r.washerPrice || 25;
        const dryerPrice   = r.dryerPrice  || 25;
        const tokenValue   = ((r.washerTokensUsed || 0) * washerPrice)
                           + ((r.dryerTokensUsed  || 0) * dryerPrice);

        // Unpaid: orders from this day not fully paid
        const reportDateStart = new Date(r.date + 'T00:00:00.000Z').getTime();
        const reportDateEnd   = new Date(r.date + 'T23:59:59.999Z').getTime();
        const dayOrders       = orders.filter((o: any) =>
          o.branchId === r.branchId &&
          o._creationTime >= reportDateStart &&
          o._creationTime <= reportDateEnd
        );
        const unpaidAmt = dayOrders
          .filter((o: any) => o.paymentStatus !== 'paid')
          .reduce((s: number, o: any) => s + Math.max(0, (o.finalPrice || 0) - (o.amountPaid || 0)), 0);

        // Outstanding payment received = saved on report when submitted
        // This is the total outstanding amount recorded at submission time
        const outstandingReceived = r.outstandingAmount || 0;

        const vouchersUsed = (r.voucherBreakdown || []).reduce((s: number, v: any) => s + v.count, 0)
                           || r.vouchersUsed || r.freeWashCount || 0;
        const statusLabel  = r.status === 'submitted' ? 'Closed'
                           : r.status === 'submitted_with_outstanding' ? 'Outstanding'
                           : 'Draft';

        return [
          r.date,
          r.branchName || branchMap[r.branchId] || '',
          (r.attendantsOnShift || []).join(' | '),
          r.totalTokensUsed || 0,
          tokenValue.toFixed(2),
          unpaidAmt.toFixed(2),
          outstandingReceived.toFixed(2),
          cash.toFixed(2),
          mobile.toFixed(2),
          card.toFixed(2),
          totalRevenue.toFixed(2),
          vouchersUsed,
          statusLabel,
        ];
      }),
    ];
    downloadCSV(rows, `washlab-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor station performance and revenue across all branches.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-9 text-xs px-3 gap-1.5" onClick={onWeeklyReports}>
            <BarChart2 className="w-3.5 h-3.5" /> Weekly Reports
          </Button>
          <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="All Branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (<SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Tokens Sold"   value={stats.totalTokens} />
        <StatCard title="Total Revenue" value={`GHS ${stats.totalRevenue.toLocaleString('en', { minimumFractionDigits: 0 })}`} />
        <StatCard title="Mobile Money"  value={`GHS ${stats.mobileMoney.toLocaleString('en',  { minimumFractionDigits: 0 })}`} />
        <StatCard title="Card Total"    value={`GHS ${stats.card.toLocaleString('en',          { minimumFractionDigits: 0 })}`} />
        <StatCard title="Cash Total"    value={`GHS ${stats.cash.toLocaleString('en',          { minimumFractionDigits: 0 })}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Revenue: {format(dateFrom, 'MMM d')} – {format(dateTo, 'MMM d, yyyy')}</CardTitle>
                <CardDescription className="text-xs">Daily received payments</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-600">GHS {stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total this period</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Payment Distribution</CardTitle>
                <CardDescription className="text-xs">Mobile Money vs Card vs Cash</CardDescription>
              </div>
              {stats.totalRevenue > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(((stats.mobileMoney + stats.card) / stats.totalRevenue) * 100)}% DIGITAL
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.chartData.filter((_: any, i: number) => i % Math.max(1, Math.floor(stats.chartData.length / 14)) === 0)}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="mobileMoney" name="Mobile Money" fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="card"        name="Card"         fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="cash"        name="Cash"         fill="#10b981" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Daily Reports</CardTitle>
            <Button variant="link" size="sm" className="text-primary text-xs p-0 h-auto" onClick={() => setShowAllReports(v => !v)}>{showAllReports ? 'Show Less' : `View All (${(allRecentReports as any[]).length})`}</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Date', 'Branch', 'Attendants on Duty', 'Tokens', 'Revenue', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {((allRecentReports as any[]) || []).slice(0, showAllReports ? undefined : 10).map((r: any) => (
                  <tr key={r._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{format(new Date(r.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{r.branchName || branchMap[r.branchId] || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{(r.attendantsOnShift || []).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {r.status === 'submitted' || r.status === 'submitted_with_outstanding'
                        ? (r.totalTokensUsed ?? 0)
                        : <span className="text-muted-foreground italic text-xs">Draft</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      GHS {((r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-xs capitalize ${r.status === 'submitted_with_outstanding' ? 'bg-orange-100 text-orange-700 border-orange-200' : r.status === 'submitted' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {r.status === 'submitted_with_outstanding' ? 'Outstanding' : r.status === 'submitted' ? 'Closed' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => onViewReport?.(r._id)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {(allRecentReports as any[]).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No reports found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

type View = 'overview' | 'weekly' | 'detail';

const AdminReports = () => {
  const [view, setView]                         = useState<View>('overview');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (view === 'detail' && selectedReportId) {
    return <AdminReportDetail reportId={selectedReportId} onBack={() => setView('overview')} />;
  }
  if (view === 'weekly') {
    return <WeeklyReportsPage onBack={() => setView('overview')} />;
  }
  return (
    <AdminReportsOverview
      onViewReport={id => { setSelectedReportId(id); setView('detail'); }}
      onWeeklyReports={() => setView('weekly')}
    />
  );
};

export default AdminReports;