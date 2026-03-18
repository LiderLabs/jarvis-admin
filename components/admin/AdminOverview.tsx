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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
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
          {p.name}: ₵{p.value.toFixed(2)}
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
    <div className={`border rounded-xl px-4 py-3 ${bgColor} transition-all w-full`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{branchName}</p>
          <p className="text-xs text-muted-foreground">
            {weeklyTarget > 0 ? `${weeklyOrders} / ${weeklyTarget} orders` : "No target set"}
          </p>
        </div>

        {/* Progress bar — desktop */}
        {weeklyTarget > 0 ? (
          <div className="flex-1 hidden sm:block">
            <div className="h-3 bg-muted rounded-full overflow-hidden border border-border relative">
              <div
                className={`h-full ${color} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
                style={{ width: `${pct}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
              {[25, 50, 75].map(s => (
                <div key={s} className="absolute top-0 bottom-0 w-px bg-background/40" style={{ left: `${s}%` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden sm:block h-3 bg-muted rounded-full" />
        )}

        <div className={`text-right flex-shrink-0 flex items-center gap-1 ${textColor}`}>
          <p className="text-sm font-bold">{pct.toFixed(0)}%</p>
          {isComplete && <span className="text-xs">🎯</span>}
        </div>
      </div>

      {/* Progress bar — mobile */}
      {weeklyTarget > 0 && (
        <div className="mt-2 sm:hidden">
          <div className="h-2 bg-muted rounded-full overflow-hidden border border-border">
            <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
          </div>
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

  const last30Stats = useQuery(api.admin.getPaymentStats, {
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
  }) ?? { totalRevenue: 0 }

  const weeklyStats = useQuery((api as any).admin.getWeeklyOrderStats) ?? []

  // Daily reports — source of truth for payment method amounts
  const dailyReports = useQuery(
    (api as any).dailyReports.getAll,
    {
      startDate: startDateStr,
      endDate: endDateStr,
      ...(selectedBranch !== "all" ? { branchId: selectedBranch } : {}),
      limit: 100,
    }
  ) ?? []

  const stats = useMemo(() => {
    const startTs = new Date(dateFrom).setHours(0, 0, 0, 0)
    const endTs = new Date(dateTo).setHours(23, 59, 59, 999)

    const selectedOrders = orders.filter((o: any) => o._creationTime >= startTs && o._creationTime <= endTs)
    const totalRevenue30 = (last30Stats as any)?.totalRevenue ?? 0

    const pendingOrders = orders.filter((o: any) =>
      ["pending", "pending_dropoff", "in_progress", "washing", "drying", "folding", "sorting", "checked_in"].includes(o.status)
    ).length

    const completedInRange = selectedOrders.filter((o: any) => o.status === "completed").length

    const dDiff = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    // Accurate payment totals from submitted daily reports only
    const totalMobileMoney = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.mobileMoneylAmount || 0), 0)
    const totalCard = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cardAmount || 0) + (r.paystackAmount || 0), 0)
    const totalCash = (dailyReports as any[]).reduce((s: number, r: any) => s + (r.cashAmount || 0), 0)
    const selectedRevenue = totalMobileMoney + totalCard + totalCash

    const avgDailyRevenue = totalRevenue30 / 30
    const expectedRevenue = avgDailyRevenue * dDiff
    const revenueChange = expectedRevenue > 0 ? ((selectedRevenue - expectedRevenue) / expectedRevenue) * 100 : 0

    const avgDailyOrders = orders.length / 30
    const expectedOrders = avgDailyOrders * dDiff
    const ordersChange = expectedOrders > 0 ? ((selectedOrders.length - expectedOrders) / expectedOrders) * 100 : 0

    // Build per-day chart data from daily reports
    const step = dDiff <= 7 ? 1 : dDiff <= 30 ? 5 : 10
    const dayMap: Record<string, { mobileMoney: number; cash: number; card: number; displayDate: string }> = {}
    for (let i = dDiff - 1; i >= 0; i--) {
      const date = subDays(dateTo, i)
      const key = format(date, "MMM d")
      dayMap[key] = {
        mobileMoney: 0,
        cash: 0,
        card: 0,
        displayDate: (dDiff - 1 - i) % step === 0 ? key : "",
      }
    }

    ;(dailyReports as any[]).forEach((r: any) => {
      const key = format(new Date(r.date), "MMM d")
      if (dayMap[key]) {
        dayMap[key].mobileMoney += r.mobileMoneylAmount || 0
        dayMap[key].cash += r.cashAmount || 0
        dayMap[key].card += (r.cardAmount || 0) + (r.paystackAmount || 0)
      }
    })

    const chartData = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }))

    return {
      selectedOrders: selectedOrders.length,
      selectedRevenue,
      totalMobileMoney,
      totalCard,
      totalCash,
      pendingOrders,
      completedInRange,
      revenueChange,
      ordersChange,
      chartData,
    }
  }, [orders, last30Stats, dailyReports, dateFrom, dateTo])

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders])

  const filteredWeeklyStats = useMemo(() => {
    if (selectedBranch === "all") return weeklyStats as any[]
    return (weeklyStats as any[]).filter((s: any) => s.branchId === selectedBranch)
  }, [weeklyStats, selectedBranch])

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
      {/* Header — filters on the right */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome to WashLab Admin</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Revenue" value={`₵${stats.selectedRevenue.toFixed(2)}`} change={stats.revenueChange} color="border-l-green-500" />
        <StatCard title="Orders" value={stats.selectedOrders} change={stats.ordersChange} color="border-l-blue-500" />
        <StatCard title="In Progress" value={stats.pendingOrders} sub="Require attention" color="border-l-yellow-500" />
        <StatCard title="Completed" value={stats.completedInRange} sub="In selected period" color="border-l-emerald-500" />
      </div>

      {/* Charts */}
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
                  {filteredWeeklyStats.length} {filteredWeeklyStats.length === 1 ? "branch" : "branches"}
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
              <div
                className="flex flex-col gap-2 overflow-y-auto pr-1"
                style={{ maxHeight: "260px", scrollbarWidth: "thin" }}
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
            )}
          </CardContent>
        </Card>

        {/* Payment Distribution Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Payment Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Mobile Money · Card · Cash — {format(dateFrom, "MMM d")} – {format(dateTo, "MMM d")}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">₵{stats.selectedRevenue.toFixed(2)}</p>
                {stats.selectedRevenue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(((stats.totalMobileMoney + stats.totalCard) / stats.selectedRevenue) * 100)}% digital
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="mobileMoney" name="Mobile Money" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="card" name="Card" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cash" name="Cash" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
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