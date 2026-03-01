'use client';

import { useState, useMemo } from 'react';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Download, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const RANGES = [
  { label: 'Today', days: 1 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

function StatCard({ title, value, change, prefix = '' }: { title: string; value: string | number; change?: number; prefix?: string }) {
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

const AdminReportsOverview = ({ onViewReport }: { onViewReport?: (id: string) => void }) => {
  const [rangeDays, setRangeDays] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState('all');

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];
  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];
  const { results: ordersPages } = usePaginatedQuery(api.admin.getOrders, {} as any, { initialNumItems: 200 });
  const orders = ordersPages?.flat() ?? [];

  const dailyReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      limit: 50,
    }
  ) ?? [];

  const startTs = subDays(new Date(), rangeDays).getTime();
  const endTs = new Date().getTime();

  const filtered = useMemo(() =>
    orders.filter((o: any) => o._creationTime >= startTs && o._creationTime <= endTs &&
      (selectedBranch === 'all' || o.branchId === selectedBranch)),
    [orders, startTs, endTs, selectedBranch]
  );

  const prevFiltered = useMemo(() => {
    const prevStart = subDays(new Date(), rangeDays * 2).getTime();
    return orders.filter((o: any) => o._creationTime >= prevStart && o._creationTime < startTs);
  }, [orders, startTs, rangeDays]);

  const stats = useMemo(() => {
    const totalRevenue = filtered.reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);
    const prevRevenue = prevFiltered.reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);
    const revChange = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    const mobileMoney = filtered.filter((o: any) => o.paymentMethod === 'mobile_money').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);
    const card = filtered.filter((o: any) => o.paymentMethod === 'card').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);
    const cash = filtered.filter((o: any) => o.paymentMethod === 'cash').reduce((s: number, o: any) => s + (o.finalPrice || 0), 0);

    // Build daily chart data
    const dayMap: Record<string, { revenue: number; orders: number; mobileMoney: number; cash: number; card: number }> = {};
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'MMM d');
      dayMap[d] = { revenue: 0, orders: 0, mobileMoney: 0, cash: 0, card: 0 };
    }
    filtered.forEach((o: any) => {
      const d = format(new Date(o._creationTime), 'MMM d');
      if (dayMap[d]) {
        dayMap[d].revenue += o.finalPrice || 0;
        dayMap[d].orders += 1;
        if (o.paymentMethod === 'mobile_money') dayMap[d].mobileMoney += o.finalPrice || 0;
        if (o.paymentMethod === 'cash') dayMap[d].cash += o.finalPrice || 0;
        if (o.paymentMethod === 'card') dayMap[d].card += o.finalPrice || 0;
      }
    });

    const chartData = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));
    // Show only every Nth label to avoid crowding
    const step = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 5 : 10;
    const chartDataLabeled = chartData.map((d, i) => ({ ...d, displayDate: i % step === 0 ? d.date : '' }));

    // Token counts from daily reports
    const totalTokens = dailyReports.reduce((s: number, r: any) => s + (r.totalTokensUsed || 0), 0);

    return { totalRevenue, revChange, mobileMoney, card, cash, chartData: chartDataLabeled, totalTokens, totalOrders: filtered.length };
  }, [filtered, prevFiltered, rangeDays, dailyReports]);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Branch', 'Attendant', 'Tokens', 'Revenue', 'Status'],
      ...dailyReports.map((r: any) => [
        r.date,
        r.branchName || '',
        (r.attendantsOnShift || []).join('|'),
        r.totalTokensUsed,
        r.totalRevenue?.toFixed(2),
        r.status,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `washlab-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor station performance and revenue across all branches.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(rangeDays)} onValueChange={v => setRangeDays(Number(v))}>
            <SelectTrigger className="w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map(r => (
                <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-36 text-sm">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Tokens Sold" value={stats.totalTokens} change={12} />
        <StatCard title="Total Revenue" value={`GHS ${stats.totalRevenue.toLocaleString('en', { minimumFractionDigits: 0 })}`} change={stats.revChange} />
        <StatCard title="Total Mobile Money" value={`GHS ${stats.mobileMoney.toLocaleString('en', { minimumFractionDigits: 0 })}`} change={-5} />
        <StatCard title="Card Total" value={`GHS ${stats.card.toLocaleString('en', { minimumFractionDigits: 0 })}`} change={15} />
        <StatCard title="Cash Total" value={`GHS ${stats.cash.toLocaleString('en', { minimumFractionDigits: 0 })}`} change={15} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Revenue Over Time - Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
                <CardDescription className="text-xs">Daily financial growth tracking</CardDescription>
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Distribution - Bar Chart */}
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
              <BarChart data={stats.chartData.filter((_, i) => i % Math.max(1, Math.floor(stats.chartData.length / 14)) === 0)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="mobileMoney" name="Mobile Money" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="card" name="Card" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cash" name="Cash" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Daily Reports Table */}
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
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {((dailyReports as any[]) || []).slice(0, 10).map((r: any) => (
                  <tr key={r._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {format(new Date(r.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{r.branchName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {(r.attendantsOnShift || []).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.totalTokensUsed ?? 0}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      GHS {(r.totalRevenue || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={r.status === 'submitted' ? 'default' : 'secondary'}
                        className={`text-xs capitalize ${r.status === 'submitted' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}
                      >
                        {r.status === 'submitted' ? 'Closed' : 'Open'}
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
                {dailyReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No reports found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {dailyReports.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Showing 1 to {Math.min(10, dailyReports.length)} of {dailyReports.length} reports</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled className="text-xs">Previous</Button>
                <Button variant="outline" size="sm" className="text-xs">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportsOverview;