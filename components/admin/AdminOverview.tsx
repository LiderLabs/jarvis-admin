"use client"

import { useMemo, useState } from "react"
import { usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import {
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
} from "lucide-react"
import { DashboardSkeleton } from "@/components/loaders/DashboardSkeleton"
import { format, subDays } from "date-fns"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

function StatCard({ title, value, change, sub, color }: {
  title: string
  value: string | number
  change?: number
  sub?: string
  color: string
}) {
  const isPos = (change ?? 0) >= 0
  return (
    <div className={`bg-card border-l-4 ${color} border border-border rounded-xl p-4`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPos ? "text-green-600" : "text-red-500"}`}>
          {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isPos ? "+" : ""}{change.toFixed(1)}% vs avg
        </div>
      )}
      {sub && change === undefined && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.dataKey === "revenue" ? `GHS ${p.value.toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  )
}

function WeeklyTargetCard({ branchName, weeklyOrders, weeklyTarget }: {
  branchName: string
  weeklyOrders: number
  weeklyTarget: number
}) {
  const pct = weeklyTarget > 0 ? Math.min((weeklyOrders / weeklyTarget) * 100, 100) : 0
  const isComplete = pct >= 100
  const isClose = pct >= 75
  const color = isComplete ? "bg-green-500" : isClose ? "bg-yellow-400" : "bg-blue-500"
  const textColor = isComplete ? "text-green-600" : isClose ? "text-yellow-600" : "text-blue-600"
  const bgColor = isComplete
    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
    : isClose
    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
    : "bg-card border-border"

  return (
    <div className={`border rounded-xl p-4 ${bgColor} transition-all flex-shrink-0 w-56`}>
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0 flex-1 mr-2">
          <p className="text-sm font-semibold text-foreground truncate">{branchName}</p>
          <p className="text-xs text-muted-foreground">
            {weeklyTarget > 0 ? `${weeklyOrders} / ${weeklyTarget}` : "No target set"}
          </p>
        </div>
        <div className={`text-right flex-shrink-0 ${textColor}`}>
          <p className="text-lg font-bold">{pct.toFixed(0)}%</p>
          {isComplete && <p className="text-xs font-medium">🎯</p>}
        </div>
      </div>

      {weeklyTarget > 0 ? (
        <div className="relative">
          <div className="flex items-center gap-1">
            <div className="flex-1 h-4 bg-muted rounded-lg overflow-hidden border border-border relative">
              <div
                className={`h-full ${color} rounded-lg transition-all duration-1000 ease-out relative overflow-hidden`}
                style={{ width: `${pct}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
              {[25, 50, 75].map(s => (
                <div key={s} className="absolute top-0 bottom-0 w-px bg-background/40" style={{ left: `${s}%` }} />
              ))}
            </div>
            <div className={`w-1.5 h-3 ${color} rounded-r-sm opacity-70`} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{Math.round(weeklyTarget * 0.5)}</span>
            <span>{weeklyTarget}</span>
          </div>
        </div>
      ) : (
        <div className="h-4 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-[10px] text-muted-foreground">Set in branch settings</p>
        </div>
      )}
    </div>
  )
}

const AdminOverview = () => {
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date>(new Date())
  const [dateTo, setDateTo] = useState<Date>(new Date())

  const startDateStr = format(dateFrom, "yyyy-MM-dd")
  const endDateStr = format(dateTo, "yyyy-MM-dd")

  const { results: ordersPages, status } = usePaginatedQuery(
    api.admin.getOrders,
    selectedBranch === "all" ? {} : { branchId: selectedBranch as any },
    { initialNumItems: 200 }
  )

  const orders = ordersPages?.flat() || []
  const isLoading = status === "LoadingFirstPage"

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any)
  const branches: any[] = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? []

  const selectedStats = useQuery(api.admin.getPaymentStats, {
    startDate: startDateStr,
    endDate: endDateStr,
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
  }) ?? { totalRevenue: 0, byDay: {} }

  const last30Stats = useQuery(api.admin.getPaymentStats, {
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
  }) ?? { totalRevenue: 0 }

  const weeklyStats = useQuery((api as any).admin.getWeeklyOrderStats) ?? []

  const stats = useMemo(() => {
    const startTs = new Date(dateFrom).setHours(0, 0, 0, 0)
    const endTs = new Date(dateTo).setHours(23, 59, 59, 999)

    const selectedOrders = orders.filter((o: any) => o._creationTime >= startTs && o._creationTime <= endTs)
    const selectedRevenue = selectedStats?.totalRevenue ?? 0
    const totalRevenue30 = last30Stats?.totalRevenue ?? 0

    const pendingOrders = orders.filter((o: any) =>
      ["pending", "pending_dropoff", "in_progress", "washing", "drying", "folding", "sorting", "checked_in"].includes(o.status)
    ).length

    const completedInRange = selectedOrders.filter((o: any) => o.status === "completed").length

    // Compare selected period revenue vs 30-day daily avg
    const dDiff = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    const avgDailyRevenue = totalRevenue30 / 30
    const expectedRevenue = avgDailyRevenue * dDiff
    const revenueChange = expectedRevenue > 0 ? ((selectedRevenue - expectedRevenue) / expectedRevenue) * 100 : 0

    const avgDailyOrders = orders.length / 30
    const expectedOrders = avgDailyOrders * dDiff
    const ordersChange = expectedOrders > 0 ? ((selectedOrders.length - expectedOrders) / expectedOrders) * 100 : 0

    const chartData = []
    for (let i = dDiff - 1; i >= 0; i--) {
      const date = subDays(dateTo, i)
      const dateStr = format(date, "yyyy-MM-dd")
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      const dayEnd = dayStart + 86400000
      const dayRevenue = (selectedStats as any)?.byDay?.[dateStr] ?? 0
      const dayOrders = orders.filter((o: any) => o._creationTime >= dayStart && o._creationTime < dayEnd).length
      chartData.push({
        date: format(date, "MMM d"),
        revenue: dayRevenue,
        orders: dayOrders,
      })
    }

    return {
      selectedOrders: selectedOrders.length,
      selectedRevenue,
      pendingOrders,
      completedInRange,
      revenueChange,
      ordersChange,
      chartData,
      dDiff,
    }
  }, [orders, last30Stats, selectedStats, dateFrom, dateTo])

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders])

  const filteredWeeklyStats = useMemo(() => {
    if (selectedBranch === "all") return weeklyStats as any[]
    return (weeklyStats as any[]).filter((s: any) => s.branchId === selectedBranch)
  }, [weeklyStats, selectedBranch])

  const isToday = startDateStr === endDateStr && startDateStr === format(new Date(), "yyyy-MM-dd")

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    ready: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    pending: "bg-yellow-100 text-yellow-700",
    pending_dropoff: "bg-yellow-100 text-yellow-700",
    checked_in: "bg-cyan-100 text-cyan-700",
    sorting: "bg-purple-100 text-purple-700",
    washing: "bg-indigo-100 text-indigo-700",
    drying: "bg-sky-100 text-sky-700",
    folding: "bg-violet-100 text-violet-700",
    cancelled: "bg-gray-100 text-gray-700",
  }

  const formatStatus = (s: string) => s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-4 pb-8">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome to WashLab Admin</p>
        </div>
        {/* Filters row — wraps naturally on mobile */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
          />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-36 text-sm h-9">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat Cards — reflect selected date range */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Revenue" value={`₵${stats.selectedRevenue.toFixed(2)}`} change={stats.revenueChange} color="border-l-green-500" />
        <StatCard title="Orders" value={stats.selectedOrders} change={stats.ordersChange} color="border-l-blue-500" />
        <StatCard title="In Progress" value={stats.pendingOrders} sub="Require attention" color="border-l-yellow-500" />
        <StatCard title="Completed" value={stats.completedInRange} sub={`In selected period`} color="border-l-emerald-500" />
      </div>

      {/* Charts: stacks on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Weekly Target */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" /> Weekly Order Target
                </CardTitle>
                <CardDescription className="text-xs">Orders this week vs target</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">
                  {(filteredWeeklyStats as any[]).reduce((s: number, b: any) => s + b.weeklyOrders, 0)} orders
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {filteredWeeklyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Target className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No branch data available</p>
              </div>
            ) : (
              <>
                {/* Horizontal scroll — fixed height so only cards scroll, not page */}
                <div
                  className="flex gap-3 overflow-x-auto pb-2"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {filteredWeeklyStats.map((b: any) => (
                    <WeeklyTargetCard
                      key={b.branchId}
                      branchName={b.branchName}
                      weeklyOrders={b.weeklyOrders}
                      weeklyTarget={b.weeklyTarget}
                    />
                  ))}
                </div>
                {filteredWeeklyStats.length > 1 && (
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
                    ← swipe to see all branches →
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Revenue: {format(dateFrom, "MMM d")} – {format(dateTo, "MMM d")}
                </CardTitle>
                <CardDescription className="text-xs">Daily received payments</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">₵{stats.selectedRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{isToday ? "Today" : "Period"}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Recent Orders
            </CardTitle>
            <Badge variant="secondary">{recentOrders.length}</Badge>
          </div>
          <CardDescription className="text-xs">Latest customer orders</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Order", "Customer", "Branch", "Status", "Amount"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? recentOrders.map((order: any) => (
                  <tr key={order._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(order._creationTime), "MMM d, h:mm a")}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.customerName || order.customerPhoneNumber || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{branches.find((b: any) => b._id === order.branchId)?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-xs ${statusColors[order.status] || "bg-yellow-100 text-yellow-700"}`}>
                        {formatStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-bold ${order.paymentStatus !== "paid" ? "text-muted-foreground" : ""}`}>
                        ₵{(order.finalPrice || 0).toFixed(2)}
                      </p>
                      {order.paymentStatus !== "paid" && (
                        <p className="text-xs text-orange-500">Unpaid</p>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No orders yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminOverview