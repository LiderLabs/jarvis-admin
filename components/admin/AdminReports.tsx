'use client';
import AdminReportDetail from './AdminReportDetail';

import { useState, useMemo } from 'react';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
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
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState('all');

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any) ?? [];
  const branches = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? [];
  const branchMap = Object.fromEntries(branches.map((b: any) => [b._id, b.name]));
  const { results: ordersPages } = usePaginatedQuery(api.admin.getOrders, {} as any, { initialNumItems: 200 });
  const orders = ordersPages?.flat() ?? [];

  const allRecentReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      ...(selectedBranch !== 'all' ? { branchId: selectedBranch } : {}),
      limit: 200,
    }
  ) ?? [];

  const startDateStr = format(dateFrom, 'yyyy-MM-dd');
  const endDateStr = format(dateTo, 'yyyy-MM-dd');

  const dailyReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: startDateStr,
      endDate: endDateStr,
      ...(selectedBranch !== 'all' ? { branchId: selectedBranch } : {}),
      limit: 100,
    }
  ) ?? [];

  const startTs = new Date(dateFrom).setHours(0, 0, 0, 0);
  const endTs = new Date(dateTo).setHours(23, 59, 59, 999);

  const filtered = useMemo(() =>
    orders.filter((o: any) => o._creationTime >= startTs && o._creationTime <= endTs &&
      (selectedBranch === 'all' || o.branchId === selectedBranch)),
    [orders, startTs, endTs, selectedBranch]
  );

  const prevFiltered = useMemo(() => {
    const rangeMs = dateTo.getTime() - dateFrom.getTime();
    const prevStart = new Date(dateFrom.getTime() - rangeMs).getTime();
    return orders.filter((o: any) => o._creationTime >= prevStart && o._creationTime < startTs);
  }, [orders, startTs, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalRevenue = (dailyReports as any[]).reduce((s: number, r: any) =>
      s + (r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0), 0);

    const mobileMoney = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.mobileMoneylAmount || 0), 0);
    const card = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cardAmount || 0) + (r.paystackAmount || 0), 0);
    const cash = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cashAmount || 0), 0);

    const dayMap: Record<string, { revenue: number; orders: number; mobileMoney: number; cash: number; card: number }> = {};
    const dDiff = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    for (let i = dDiff - 1; i >= 0; i--) {
      const d = format(subDays(dateTo, i), 'MMM d');
      dayMap[d] = { revenue: 0, orders: 0, mobileMoney: 0, cash: 0, card: 0 };
    }

    (dailyReports as any[]).forEach((r: any) => {
      const d = format(new Date(r.date), 'MMM d');
      if (dayMap[d]) {
        dayMap[d].revenue += (r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0);
        dayMap[d].mobileMoney += r.mobileMoneylAmount || 0;
        dayMap[d].cash += r.cashAmount || 0;
        dayMap[d].card += (r.cardAmount || 0) + (r.paystackAmount || 0);
      }
    });

    filtered.forEach((o: any) => {
      const d = format(new Date(o._creationTime), 'MMM d');
      if (dayMap[d]) dayMap[d].orders += 1;
    });

    const chartData = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));
    const step = dDiff <= 7 ? 1 : dDiff <= 30 ? 5 : 10;
    const chartDataLabeled = chartData.map((d, i) => ({ ...d, displayDate: i % step === 0 ? d.date : '' }));
    const totalTokens = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.totalTokensUsed || 0), 0);

    return { totalRevenue, mobileMoney, card, cash, chartData: chartDataLabeled, totalTokens, totalOrders: filtered.length };
  }, [filtered, prevFiltered, dateFrom, dateTo, dailyReports]);

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Allow popups to export');
    const reports = dailyReports as any[];
    const totalRevenue = reports.reduce((s:number, r:any) => s + (r.cashAmount||0) + (r.mobileMoneylAmount||0) + (r.cardAmount||0) + (r.paystackAmount||0), 0);
    const totalCash = reports.reduce((s:number, r:any) => s + (r.cashAmount||0), 0);
    const totalMobile = reports.reduce((s:number, r:any) => s + (r.mobileMoneylAmount||0), 0);
    const totalCard = reports.reduce((s:number, r:any) => s + (r.cardAmount||0) + (r.paystackAmount||0), 0);
    const totalTokens = reports.reduce((s:number, r:any) => s + (r.totalTokensUsed||0), 0);
    const totalFreeWash = reports.reduce((s:number, r:any) => s + (r.freeWashCount||0), 0);
    const dateLabel = startDateStr === endDateStr ? format(dateFrom, 'd MMM yyyy') : format(dateFrom, 'd MMM') + ' - ' + format(dateTo, 'd MMM yyyy');
    const branchLabel = selectedBranch === 'all' ? 'All Branches' : (branches.find((b:any) => b._id === selectedBranch)?.name || 'Branch');
    const branchRows = reports.map((r:any) => {
      const rev = (r.cashAmount||0)+(r.mobileMoneylAmount||0)+(r.cardAmount||0)+(r.paystackAmount||0);
      const card = (r.cardAmount||0)+(r.paystackAmount||0);
      const statusColor = r.status==='submitted'?'#16a34a':r.status==='submitted_with_outstanding'?'#ea580c':'#d97706';
      const statusLabel = r.status==='submitted'?'Closed':r.status==='submitted_with_outstanding'?'Outstanding':'Open';
      const vouchers = (r.voucherBreakdown||[]).map((v:any) => v.name+' x'+v.count+' GHS '+(v.totalDiscount||0).toFixed(2)).join(' | ');
      return '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;page-break-inside:avoid">'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:10px">'
        +'<div><div style="font-size:15px;font-weight:700">'+(r.branchName||branchMap[r.branchId]||'-')+'</div>'
        +'<div style="font-size:11px;color:#6b7280">'+format(new Date(r.date),'d MMM yyyy')+' | Attendants: '+(r.attendantsOnShift||[]).join(', ')+'</div></div>'
        +'<span style="font-size:11px;font-weight:600;color:'+statusColor+';padding:3px 10px;border-radius:99px;background:'+statusColor+'18">'+statusLabel+'</span></div>'
        +'<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:8px">'
        +'<div style="background:#f9fafb;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#6b7280;text-transform:uppercase">Total</div><div style="font-size:13px;font-weight:700">GHS '+rev.toFixed(2)+'</div></div>'
        +'<div style="background:#eff6ff;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#3b82f6;text-transform:uppercase">Mobile</div><div style="font-size:13px;font-weight:700;color:#1d4ed8">GHS '+(r.mobileMoneylAmount||0).toFixed(2)+'</div></div>'
        +'<div style="background:#f0fdf4;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#16a34a;text-transform:uppercase">Cash</div><div style="font-size:13px;font-weight:700;color:#15803d">GHS '+(r.cashAmount||0).toFixed(2)+'</div></div>'
        +'<div style="background:#f5f3ff;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#7c3aed;text-transform:uppercase">Card</div><div style="font-size:13px;font-weight:700;color:#6d28d9">GHS '+card.toFixed(2)+'</div></div>'
        +'<div style="background:#f9fafb;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#6b7280;text-transform:uppercase">Tokens</div><div style="font-size:13px;font-weight:700">'+(r.totalTokensUsed||0)+'</div></div>'
        +'<div style="background:#f9fafb;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#6b7280;text-transform:uppercase">Free</div><div style="font-size:13px;font-weight:700">'+(r.freeWashCount||0)+'</div></div>'
        +'</div>'
        +(vouchers?'<div style="font-size:11px;color:#6b7280;margin-bottom:4px">Discounts: '+vouchers+'</div>':'')
        +((r.outstandingOrderCount||0)>0?'<div style="padding:4px 8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;font-size:11px;color:#c2410c;margin-bottom:4px">Outstanding: '+r.outstandingOrderCount+' order(s) GHS '+(r.outstandingAmount||0).toFixed(2)+'</div>':'')
        +(r.technicalFaultNotes?'<div style="padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:11px;color:#b91c1c">'+r.technicalFaultNotes+'</div>':'')
        +(r.notes?'<div style="font-size:11px;color:#374151;font-style:italic;margin-top:4px">"'+r.notes+'"</div>':'')
        +'</div>';
    }).join('');
    w.document.write('<html><head><title>WashLab Report</title>'
      +'<style>body{font-family:system-ui,sans-serif;padding:32px;max-width:900px;margin:0 auto}@media print{button{display:none}}</style></head><body>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
      +'<div><h1 style="font-size:22px;font-weight:800;margin:0">WashLab Report</h1>'
      +'<p style="font-size:13px;color:#6b7280;margin:4px 0 0">'+dateLabel+' | '+branchLabel+'</p></div>'
      +'<button onclick="window.print()" style="padding:8px 16px;background:#111;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer">Print / Save PDF</button></div>'
      +'<hr style="border:none;border-top:2px solid #e5e7eb;margin:16px 0"/>'
      +'<div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:20px">'
      +'<h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 12px">Summary — '+reports.length+' Report(s)</h2>'
      +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">'
      +'<div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#6b7280;text-transform:uppercase">Total Revenue</div><div style="font-size:18px;font-weight:800;margin-top:4px">GHS '+totalRevenue.toFixed(2)+'</div></div>'
      +'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#3b82f6;text-transform:uppercase">Mobile Money</div><div style="font-size:18px;font-weight:800;color:#1d4ed8;margin-top:4px">GHS '+totalMobile.toFixed(2)+'</div></div>'
      +'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#16a34a;text-transform:uppercase">Cash</div><div style="font-size:18px;font-weight:800;color:#15803d;margin-top:4px">GHS '+totalCash.toFixed(2)+'</div></div>'
      +'<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#7c3aed;text-transform:uppercase">Card</div><div style="font-size:18px;font-weight:800;color:#6d28d9;margin-top:4px">GHS '+totalCard.toFixed(2)+'</div></div>'
      +'<div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#6b7280;text-transform:uppercase">Total Tokens</div><div style="font-size:18px;font-weight:800;margin-top:4px">'+totalTokens+'</div></div>'
      +'</div>'
      +(totalFreeWash>0?'<div style="margin-top:8px;font-size:12px;color:#6b7280">Free washes: <strong>'+totalFreeWash+'</strong></div>':'')
      +'</div>'
      +'<h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 10px">Branch Breakdown</h2>'
      +(branchRows||'<p style="color:#6b7280;font-size:13px">No reports found.</p>')
      +'</body></html>');
    w.document.close();
    setTimeout(()=>w.print(),400);
    toast.success('PDF ready');
  };

    const exportCSV = () => {
    const rows = [
      ['Date', 'Branch', 'Attendants', 'Tokens', 'Total Revenue', 'Cash', 'Mobile Money', 'Card/Paystack', 'Free Washes', 'Outstanding Orders', 'Outstanding Amount', 'Status'],
      ...(dailyReports as any[]).map((r: any) => {
        const card = (r.cardAmount || 0) + (r.paystackAmount || 0)
        const total = (r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + card
        return [
          r.date,
          r.branchName || branchMap[r.branchId] || '',
          (r.attendantsOnShift || []).join('|'),
          r.totalTokensUsed || 0,
          total.toFixed(2),
          (r.cashAmount || 0).toFixed(2),
          (r.mobileMoneylAmount || 0).toFixed(2),
          card.toFixed(2),
          r.freeWashCount || 0,
          r.outstandingOrderCount || 0,
          (r.outstandingAmount || 0).toFixed(2),
          r.status === 'submitted' ? 'Closed' : r.status === 'submitted_with_outstanding' ? 'Outstanding' : 'Open',
        ]
      }),
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor station performance and revenue across all branches.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
        <StatCard title="Tokens Sold" value={stats.totalTokens} />
        <StatCard title="Total Revenue" value={`GHS ${stats.totalRevenue.toLocaleString('en', { minimumFractionDigits: 0 })}`} />
        <StatCard title="Mobile Money" value={`GHS ${stats.mobileMoney.toLocaleString('en', { minimumFractionDigits: 0 })}`} />
        <StatCard title="Card Total" value={`GHS ${stats.card.toLocaleString('en', { minimumFractionDigits: 0 })}`} />
        <StatCard title="Cash Total" value={`GHS ${stats.cash.toLocaleString('en', { minimumFractionDigits: 0 })}`} />
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
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
              <BarChart data={stats.chartData.filter((_: any, i: number) => i % Math.max(1, Math.floor(stats.chartData.length / 14)) === 0)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
                {((allRecentReports as any[]) || []).slice(0, 10).map((r: any) => (
                  <tr key={r._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{format(new Date(r.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{r.branchName || branchMap[r.branchId] || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{(r.attendantsOnShift || []).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.totalTokensUsed ?? 0}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">GHS {((r.cashAmount || 0) + (r.mobileMoneylAmount || 0) + (r.cardAmount || 0) + (r.paystackAmount || 0)).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-xs capitalize ${
                          r.status === 'submitted_with_outstanding' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          r.status === 'submitted' ? 'bg-green-100 text-green-700 border-green-200' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                        {r.status === 'submitted_with_outstanding' ? 'Outstanding' : r.status === 'submitted' ? 'Closed' : 'Open'}
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

const AdminReports = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (selectedReportId) {
    return <AdminReportDetail reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />;
  }

  return <AdminReportsOverview onViewReport={(id) => setSelectedReportId(id)} />;
};

export default AdminReports;