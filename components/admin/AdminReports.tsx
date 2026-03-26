'use client';
import AdminReportDetail from './AdminReportDetail';

import { useState, useMemo } from 'react';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, getISOWeek, getYear, startOfISOWeek, endOfISOWeek } from 'date-fns';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
  Download, TrendingUp, TrendingDown, Eye, BarChart2,
  X, Target, CheckCircle2, Minus, Calendar, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  title, value, change, prefix = '',
}: {
  title: string
  value: string | number
  change?: number
  prefix?: string
}) {
  const isPos = (change ?? 0) >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{prefix}{value}</p>
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
// Weekly Reports Modal
// Tab 1 — "This Week"     : per-branch progress vs target
// Tab 2 — "Past 12 Weeks" : historical totals from getRevenueTrends
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyReportsModal({
  weeklyStats,
  onClose,
}: {
  weeklyStats: any[]
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // Historical weekly totals — all branches combined
  const trends = useQuery((api as any).analytics.getRevenueTrends, {
    period: 'weekly',
    days: 84, // 12 weeks
  }) ?? [];

  // ── Current week metadata ──
  const now       = new Date();
  const weekNum   = getISOWeek(now);
  const weekYear  = getYear(now);
  const weekStart = startOfISOWeek(now);
  const weekEnd   = endOfISOWeek(now);
  const weekLabel = `W${weekNum} ${weekYear} · ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;

  // ── Per-branch progress rows ──
  const branchRows = weeklyStats.map((s: any) => {
    const pct   = s.weeklyTarget > 0 ? (s.weeklyOrders / s.weeklyTarget) * 100 : null;
    const hit   = pct !== null && pct >= 100;
    const close = pct !== null && pct >= 75 && !hit;
    return { ...s, pct, hit, close };
  });

  const hitCount      = branchRows.filter(r => r.hit).length;
  const progressCount = branchRows.filter(r => !r.hit && (r.weeklyTarget ?? 0) > 0).length;
  const noTargetCount = branchRows.filter(r => !r.weeklyTarget || r.weeklyTarget === 0).length;

  // ── History rows — most recent first ──
  const historyRows = useMemo(() =>
    [...(trends as any[])].reverse().slice(0, 12),
    [trends]
  );

  const completedWeeks = historyRows.slice(1);
  const avgOrders = completedWeeks.length > 0
    ? Math.round(completedWeeks.reduce((s: number, r: any) => s + r.orders, 0) / completedWeeks.length)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl z-10
                      flex flex-col max-h-[88vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Weekly Reports</h2>
              <p className="text-xs text-muted-foreground">Order targets &amp; performance history</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border shrink-0 px-6 gap-1 pt-1">
          {(['current', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px
                ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab === 'current' ? 'This Week' : 'Past 12 Weeks'}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* ══ THIS WEEK ══ */}
          {activeTab === 'current' && (
            <div className="p-6 space-y-5">

              {/* Week range + summary chips */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground
                                bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <Calendar className="w-3.5 h-3.5" />
                  {weekLabel}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full
                                   bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    {hitCount} {hitCount === 1 ? 'branch' : 'branches'} hit target
                  </span>
                  {progressCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full
                                     bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                      <TrendingUp className="w-3 h-3" />
                      {progressCount} in progress
                    </span>
                  )}
                  {noTargetCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full
                                     bg-muted text-muted-foreground">
                      <Minus className="w-3 h-3" />
                      {noTargetCount} no target set
                    </span>
                  )}
                </div>
              </div>

              {/* Per-branch table */}
              {branchRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Target className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No branch data available</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        {['Branch', 'Orders', 'Target', 'Progress', 'Status'].map(h => (
                          <th
                            key={h}
                            className={`text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3
                              ${h === 'Branch' ? 'text-left' : h === 'Progress' ? 'text-left w-36' : 'text-right'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {branchRows.map(r => (
                        <tr
                          key={r.branchId}
                          className={`border-b border-border last:border-0 transition-colors hover:bg-muted/20
                            ${r.hit ? 'bg-green-50/40 dark:bg-green-950/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-foreground">{r.branchName}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-foreground">{r.weeklyOrders}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r.weeklyTarget > 0
                              ? <span className="text-sm text-muted-foreground">{r.weeklyTarget}</span>
                              : <span className="text-xs italic text-muted-foreground">None</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {r.weeklyTarget > 0 && r.pct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700
                                      ${r.hit ? 'bg-green-500' : r.close ? 'bg-yellow-400' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(r.pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground w-8 text-right shrink-0">
                                  {r.pct.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!r.weeklyTarget || r.weeklyTarget === 0 ? (
                              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">No Target</Badge>
                            ) : r.hit ? (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">🎯 Hit</Badge>
                            ) : r.close ? (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">Almost</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">In Progress</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Targets reflect current branch settings. Go to the Dashboard to update a branch target.
              </p>
            </div>
          )}

          {/* ══ PAST 12 WEEKS ══ */}
          {activeTab === 'history' && (
            <div className="p-6 space-y-5">

              {/* Average callout */}
              {avgOrders > 0 && (
                <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/20
                                border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3">
                  <TrendingUp className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {avgOrders.toLocaleString()} orders{' '}
                      <span className="font-normal text-muted-foreground">per week on average</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on {completedWeeks.length} completed weeks · all branches combined
                    </p>
                  </div>
                </div>
              )}

              {/* History table */}
              {historyRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No history data available yet</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left   text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Week</th>
                        <th className="text-right  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Total Orders</th>
                        <th className="text-right  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Revenue</th>
                        <th className="text-right  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">vs Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((r: any, i: number) => {
                        const isCurrentWeek = i === 0;
                        const vsAvg  = avgOrders > 0 && !isCurrentWeek
                          ? ((r.orders - avgOrders) / avgOrders) * 100
                          : null;
                        const above  = vsAvg !== null && vsAvg >= 0;

                        return (
                          <tr
                            key={r.period}
                            className={`border-b border-border last:border-0 transition-colors hover:bg-muted/20
                              ${isCurrentWeek ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}`}
                          >
                            {/* Week */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{r.period}</span>
                                {isCurrentWeek && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                                                   bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                    This week
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Orders */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-bold text-foreground">
                                {r.orders.toLocaleString()}
                              </span>
                            </td>

                            {/* Revenue */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-foreground">
                                GHS {r.revenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* vs avg */}
                            <td className="px-4 py-3 text-right">
                              {vsAvg !== null ? (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold
                                  ${above ? 'text-green-600' : 'text-red-500'}`}>
                                  {above
                                    ? <ArrowUpRight className="w-3 h-3" />
                                    : <ArrowDownRight className="w-3 h-3" />}
                                  {above ? '+' : ''}{vsAvg.toFixed(1)}%
                                </span>
                              ) : isCurrentWeek ? (
                                <span className="text-xs italic text-muted-foreground">in progress</span>
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
              )}

              <p className="text-xs text-muted-foreground">
                Totals are across all branches combined. Per-branch weekly breakdown requires a future backend update.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">ISO W{weekNum} · {weekYear}</p>
          <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports Overview
// ─────────────────────────────────────────────────────────────────────────────

const AdminReportsOverview = ({ onViewReport }: { onViewReport?: (id: string) => void }) => {
  const [dateFrom, setDateFrom]                   = useState<Date>(new Date());
  const [dateTo, setDateTo]                       = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch]       = useState('all');
  const [showWeeklyReports, setShowWeeklyReports] = useState(false);

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];
  const branches    = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];
  const branchMap   = Object.fromEntries(branches.map((b: any) => [b._id, b.name]));

  const { results: ordersPages } = usePaginatedQuery(api.admin.getOrders, {} as any, { initialNumItems: 200 });
  const orders = ordersPages?.flat() ?? [];

  const weeklyStats = useQuery((api as any).admin.getWeeklyOrderStats) ?? [];

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
    const rangeMs  = dateTo.getTime() - dateFrom.getTime();
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
        dayMap[d].revenue    += (r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0);
        dayMap[d].mobileMoney += r.mobileMoneylAmount || 0;
        dayMap[d].cash        += r.cashAmount || 0;
        dayMap[d].card        += (r.cardAmount || 0) + (r.paystackAmount || 0);
      }
    });
    filtered.forEach((o: any) => {
      const d = format(new Date(o._creationTime), 'MMM d');
      if (dayMap[d]) dayMap[d].orders += 1;
    });

    const chartData       = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));
    const step            = dDiff <= 7 ? 1 : dDiff <= 30 ? 5 : 10;
    const chartDataLabeled = chartData.map((d, i) => ({ ...d, displayDate: i % step === 0 ? d.date : '' }));
    const totalTokens      = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.totalTokensUsed || 0), 0);

    return { totalRevenue, mobileMoney, card, cash, chartData: chartDataLabeled, totalTokens, totalOrders: filtered.length };
  }, [filtered, prevFiltered, dateFrom, dateTo, dailyReports]);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Branch', 'Attendants', 'Tokens', 'Total Revenue', 'Cash', 'Paystack', 'Free Washes', 'Status'],
      ...(dailyReports as any[]).map((r: any) => {
        const paystack = (r.cardAmount || 0) + (r.paystackAmount || 0) + (r.mobileMoneylAmount || 0);
        const total    = (r.cashAmount || 0) + paystack;
        return [
          r.date,
          r.branchName || branchMap[r.branchId] || '',
          (r.attendantsOnShift || []).join('|'),
          r.totalTokensUsed || 0,
          total.toFixed(2),
          (r.cashAmount || 0).toFixed(2),
          paystack.toFixed(2),
          r.freeWashCount || 0,
          r.status === 'submitted' ? 'Closed' : r.status === 'submitted_with_outstanding' ? 'Outstanding' : 'Open',
        ];
      }),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `washlab-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  // weekNum / weekYear needed for footer in modal — defined here so the modal can close cleanly
  const weekNum  = getISOWeek(new Date());
  const weekYear = getYear(new Date());

  return (
    <div className="space-y-6 pb-8">

      {/* ── Weekly Reports Modal ── */}
      {showWeeklyReports && (
        <WeeklyReportsModal
          weeklyStats={weeklyStats as any[]}
          onClose={() => setShowWeeklyReports(false)}
        />
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor station performance and revenue across all branches.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs px-3 gap-1.5"
            onClick={() => setShowWeeklyReports(true)}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Weekly Reports
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

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Tokens Sold"   value={stats.totalTokens} />
        <StatCard title="Total Revenue" value={`GHS ${stats.totalRevenue.toLocaleString('en', { minimumFractionDigits: 0 })}`} />
        <StatCard title="Mobile Money"  value={`GHS ${stats.mobileMoney.toLocaleString('en',  { minimumFractionDigits: 0 })}`} />
        <StatCard title="Card Total"    value={`GHS ${stats.card.toLocaleString('en',          { minimumFractionDigits: 0 })}`} />
        <StatCard title="Cash Total"    value={`GHS ${stats.cash.toLocaleString('en',          { minimumFractionDigits: 0 })}`} />
      </div>

      {/* ── Charts ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Revenue: {format(dateFrom, 'MMM d')} – {format(dateTo, 'MMM d, yyyy')}
                </CardTitle>
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
                data={stats.chartData.filter((_: any, i: number) =>
                  i % Math.max(1, Math.floor(stats.chartData.length / 14)) === 0
                )}
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

      {/* ── Recent Daily Reports table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Daily Reports</CardTitle>
            <Button variant="link" size="sm" className="text-primary text-xs p-0 h-auto">View All Reports</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Date', 'Branch', 'Attendants on Duty', 'Tokens', 'Revenue', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {((allRecentReports as any[]) || []).slice(0, 10).map((r: any) => (
                  <tr key={r._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {format(new Date(r.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {r.branchName || branchMap[r.branchId] || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {(r.attendantsOnShift || []).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {r.totalTokensUsed ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      GHS {((r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`text-xs capitalize ${
                          r.status === 'submitted_with_outstanding'
                            ? 'bg-orange-100 text-orange-700 border-orange-200'
                            : r.status === 'submitted'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {r.status === 'submitted_with_outstanding'
                          ? 'Outstanding'
                          : r.status === 'submitted'
                          ? 'Closed'
                          : 'Open'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onViewReport?.(r._id)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {(allRecentReports as any[]).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No reports found.
                    </td>
                  </tr>
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

const AdminReports = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (selectedReportId) {
    return <AdminReportDetail reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />;
  }

  return <AdminReportsOverview onViewReport={id => setSelectedReportId(id)} />;
};

export default AdminReports;