'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  DollarSign,
  Package,
  TrendingUp,
  Users,
  BarChart3,
  RefreshCw,
  CheckCircle,
  Clock,
  Store,
  Globe,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const AdminReports = () => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'overview' | 'revenue' | 'customers' | 'orders'>('overview');

  const startTimestamp = useMemo(() => new Date(startDate).getTime(), [startDate]);
  const endTimestamp = useMemo(() => {
    const date = new Date(endDate);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }, [endDate]);

  const { results: ordersPages, status } = usePaginatedQuery(api.admin.getOrders, {}, { initialNumItems: 100 });
  const orders = ordersPages?.flat() || [];

  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const orderTime = order._creationTime;
      return orderTime >= startTimestamp && orderTime <= endTimestamp;
    });
  }, [orders, startTimestamp, endTimestamp]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum: number, order: any) => sum + (order.finalPrice || 0), 0);
    const completedOrders = filteredOrders.filter((o: any) => o.status === 'completed').length;
    const pendingOrders = filteredOrders.filter((o: any) => o.status === 'pending' || o.status === 'pending_dropoff').length;
    const walkInOrders = filteredOrders.filter((o: any) => o.orderType === 'walk_in').length;
    const onlineOrders = filteredOrders.filter((o: any) => o.orderType === 'online').length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const ordersByStatus = filteredOrders.reduce((acc: any, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const dailyRevenue: any = {};
    filteredOrders.forEach((order: any) => {
      const date = format(new Date(order._creationTime), 'yyyy-MM-dd');
      if (!dailyRevenue[date]) dailyRevenue[date] = { revenue: 0, orders: 0 };
      dailyRevenue[date].revenue += order.finalPrice || 0;
      dailyRevenue[date].orders += 1;
    });

    const revenueTrends = Object.entries(dailyRevenue)
      .map(([date, data]: [string, any]) => ({ period: date, revenue: data.revenue, orders: data.orders }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const customerStats: any = {};
    filteredOrders.forEach((order: any) => {
      const phone = order.customerPhoneNumber;
      if (!customerStats[phone]) {
        customerStats[phone] = {
          customerId: phone,
          name: order.customerName || phone,
          phoneNumber: phone,
          orderCount: 0,
          totalRevenue: 0,
        };
      }
      customerStats[phone].orderCount += 1;
      customerStats[phone].totalRevenue += order.finalPrice || 0;
    });

    const topCustomers = Object.values(customerStats)
      .map((c: any) => ({ ...c, averageOrderValue: c.totalRevenue / c.orderCount }))
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    return {
      totalOrders,
      totalRevenue,
      completedOrders,
      pendingOrders,
      walkInOrders,
      onlineOrders,
      avgOrderValue,
      ordersByStatus,
      revenueTrends,
      topCustomers,
    };
  }, [filteredOrders]);

  const maxRevenue = useMemo(() => {
    if (!stats.revenueTrends || stats.revenueTrends.length === 0) return 0;
    return Math.max(...stats.revenueTrends.map((t: any) => t.revenue));
  }, [stats.revenueTrends]);

  const exportCSV = () => {
    const csvRows = [
      ['WashLab Reports'],
      [`${startDate} to ${endDate}`],
      [],
      ['Metric', 'Value'],
      ['Total Orders', stats.totalOrders],
      ['Total Revenue', `₵${stats.totalRevenue.toFixed(2)}`],
      ['Completed', stats.completedOrders],
      ['Pending', stats.pendingOrders],
      ['Walk-in', stats.walkInOrders],
      ['Online', stats.onlineOrders],
      ['Avg Order', `₵${stats.avgOrderValue.toFixed(2)}`],
    ];
    const csv = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `washlab-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Allow popups');
    w.document.write(`
      <html><head><title>WashLab Report</title>
      <style>
        body{font-family:Arial;padding:40px}
        h1{border-bottom:3px solid #3b82f6;padding-bottom:10px}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin:20px 0}
        .card{background:#f9fafb;padding:20px;border-radius:8px;border-left:4px solid #3b82f6}
        .label{font-size:14px;color:#6b7280}
        .value{font-size:24px;font-weight:bold}
      </style></head><body>
      <h1>WashLab Report</h1>
      <p><b>Period:</b> ${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}</p>
      <div class="grid">
        <div class="card"><div class="label">Revenue</div><div class="value">₵${stats.totalRevenue.toFixed(2)}</div></div>
        <div class="card"><div class="label">Orders</div><div class="value">${stats.totalOrders}</div></div>
      </div></body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 250);
    toast.success('PDF generated');
  };

  if (status === 'LoadingFirstPage') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Business analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} size="sm">
            <Download className="w-4 h-4 mr-2" />CSV
          </Button>
          <Button variant="outline" onClick={exportPDF} size="sm">
            <FileText className="w-4 h-4 mr-2" />PDF
          </Button>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="revenue">Revenue Trends</SelectItem>
                  <SelectItem value="customers">Top Customers</SelectItem>
                  <SelectItem value="orders">All Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportType === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-3xl font-bold">₵{stats.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-3xl font-bold">{stats.totalOrders}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Order</p>
                    <p className="text-3xl font-bold">₵{stats.avgOrderValue.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.revenueTrends?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />Revenue (Last 14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.revenueTrends.slice(-14).map((t: any) => (
                    <div key={t.period} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{format(new Date(t.period), 'MMM d')}</span>
                        <div className="flex gap-3">
                          <span className="text-xs text-muted-foreground">{t.orders} orders</span>
                          <span className="font-semibold">₵{t.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: `${maxRevenue > 0 ? (t.revenue / maxRevenue) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Order Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="font-medium">Walk-in</span>
                    </div>
                    <span className="text-2xl font-bold">{stats.walkInOrders}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-cyan-600" />
                      </div>
                      <span className="font-medium">Online</span>
                    </div>
                    <span className="text-2xl font-bold">{stats.onlineOrders}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {Object.entries(stats.ordersByStatus || {}).map(([s, c]) => (
                    <div key={s} className="flex justify-between p-2 hover:bg-muted/50 rounded">
                      <span className="capitalize text-sm">{s.replace(/_/g, ' ')}</span>
                      <Badge variant="secondary">{c as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Top 3 Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topCustomers?.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-4">
                  {stats.topCustomers.slice(0, 3).map((c: any, i: number) => (
                    <div key={c.customerId} className="relative bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-5 border-2">
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">#{i + 1}</div>
                      <div className="space-y-3">
                        <div>
                          <p className="font-bold text-lg truncate">{c.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{c.phoneNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Orders</p>
                            <p className="text-2xl font-bold">{c.orderCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-2xl font-bold">₵{c.totalRevenue.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingOrders}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Done</p>
                  <p className="text-3xl font-bold">{stats.completedOrders}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border">
                  <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Active</p>
                  <p className="text-3xl font-bold">
                    {Object.entries(stats.ordersByStatus || {})
                      .filter(([s]) => ['in_progress', 'washing', 'drying', 'folding'].includes(s))
                      .reduce((a, [, c]) => a + (c as number), 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-3xl font-bold">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'revenue' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />All Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.revenueTrends?.length > 0 ? (
              <div className="space-y-3">
                {stats.revenueTrends.map((t: any) => (
                  <div key={t.period} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{format(new Date(t.period), 'EEEE, MMM d, yyyy')}</span>
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">{t.orders} orders</span>
                        <span className="font-bold text-lg">₵{t.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full" style={{ width: `${maxRevenue > 0 ? (t.revenue / maxRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data</p>
            )}
          </CardContent>
        </Card>
      )}

      {reportType === 'customers' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Top 10 Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topCustomers?.length > 0 ? (
              <div className="space-y-4">
                {stats.topCustomers.slice(0, 10).map((c: any, i: number) => (
                  <div key={c.customerId} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border hover:bg-muted/50">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg truncate">{c.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{c.phoneNumber}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Orders</p>
                        <p className="text-xl font-bold">{c.orderCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="text-xl font-bold">₵{c.totalRevenue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Avg</p>
                        <p className="text-xl font-bold">₵{c.averageOrderValue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">No data</p>
            )}
          </CardContent>
        </Card>
      )}

      {reportType === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Order #</th>
                      <th className="text-left py-3 px-2">Customer</th>
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-right py-3 px-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o: any) => (
                      <tr key={o._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{o.orderNumber}</td>
                        <td className="py-3 px-2">{o.customerName || o.customerPhoneNumber}</td>
                        <td className="py-3 px-2">{format(new Date(o._creationTime), 'MMM d, yyyy')}</td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary">{o.status.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="text-right py-3 px-2 font-semibold">₵{(o.finalPrice || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No orders</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReports;