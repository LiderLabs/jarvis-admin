"use client"

import { useMemo, useState } from "react"
import { usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import {
  ShoppingBag, ArrowUpRight, ArrowDownRight, Zap, Target, BarChart2,
  Calendar, ChevronLeft, ChevronRight,
} from "lucide-react"
import { DashboardSkeleton } from "@/components/loaders/DashboardSkeleton"
import { format, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts"

// ─────────────────────────────────────────────────────────────────────────────
// Sunday-start week helpers
// ─────────────────────────────────────────────────────────────────────────────

const WEEK_OPTS = { weekStartsOn: 0 } as const

function getSundayWeekNumber(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1)
  const startOfJan1Week = startOfWeek(jan1, WEEK_OPTS)
  const diff = startOfWeek(date, WEEK_OPTS).getTime() - startOfJan1Week.getTime()
  return Math.round(diff / (7 * 24 * 60 * 60 * 1000)) + 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Week Picker
// ─────────────────────────────────────────────────────────────────────────────

function WeekPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const now        = new Date()
  const isThisWeek = isSameWeek(value, now, WEEK_OPTS)
  const weekNum    = getSundayWeekNumber(value)
  const weekYear   = startOfWeek(value, WEEK_OPTS).getFullYear()
  const weekStart  = startOfWeek(value, WEEK_OPTS)
  const weekEnd    = endOfWeek(value, WEEK_OPTS)

  return (
    <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg px-1 py-1">
      <button
        onClick={() => onChange(startOfWeek(subWeeks(value, 1), WEEK_OPTS))}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-1.5 px-2 min-w-[180px] justify-center">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">W{weekNum} {weekYear}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">· {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}</span>
        {isThisWeek && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">Now</span>
        )}
      </div>
      <button
        onClick={() => { if (!isThisWeek) onChange(startOfWeek(addWeeks(value, 1), WEEK_OPTS)) }}
        disabled={isThisWeek}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card — exactly one sub-line, no duplicates
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  title, value, change, sub, color, isAllTime,
}: {
  title: string
  value: string | number
  change?: number
  sub?: string
  color: string
  isAllTime?: boolean
}) {
  const isPos = (change ?? 0) >= 0
  return (
    <div className={`bg-card border-l-4 ${color} border border-border rounded-xl p-4`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change !== undefined && !isAllTime ? (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPos ? "text-green-600" : "text-red-500"}`}>
          {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isPos ? "+" : ""}{change.toFixed(1)}% vs avg
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">
          {isAllTime ? "All time" : sub}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart Tooltip
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard helpers
// ─────────────────────────────────────────────────────────────────────────────

function sortByLeaderboard(branches: any[]) {
  return [...branches].sort((a, b) => {
    const pctA = a.weeklyTarget > 0 ? (a.weeklyOrders / a.weeklyTarget) * 100 : -1
    const pctB = b.weeklyTarget > 0 ? (b.weeklyOrders / b.weeklyTarget) * 100 : -1
    return pctB - pctA
  })
}

const MEDALS = ["🥇", "🥈", "🥉"]

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Target Card
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyTargetCard({
  branchName, weeklyOrders, weeklyTarget, rank,
}: {
  branchName: string; weeklyOrders: number; weeklyTarget: number; rank: number
}) {
  const pct        = weeklyTarget > 0 ? Math.min((weeklyOrders / weeklyTarget) * 100, 100) : 0
  const isComplete = pct >= 100
  const isClose    = pct >= 75

  const barColor  = isComplete ? "bg-green-500" : isClose ? "bg-yellow-400" : "bg-blue-500"
  const textColor = isComplete ? "text-green-600" : isClose ? "text-yellow-600" : "text-blue-600"
  const wrapColor = isComplete
    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
    : isClose
    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
    : "bg-card border-border"

  const medal = weeklyTarget > 0 && rank <= 3 ? MEDALS[rank - 1] : null

  return (
    <div className={`border rounded-xl px-4 py-3 ${wrapColor} w-full`}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-7 text-center">
          {medal
            ? <span className="text-base leading-none">{medal}</span>
            : weeklyTarget > 0
            ? <span className="text-xs font-semibold text-muted-foreground">{rank}</span>
            : <span className="text-xs text-muted-foreground">—</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{branchName}</p>
          <p className="text-xs text-muted-foreground">
            {weeklyTarget > 0 ? `${weeklyOrders} / ${weeklyTarget} orders` : "No target set"}
          </p>
        </div>
        {weeklyTarget > 0 ? (
          <div className="flex-1 hidden sm:block">
            <div className="h-3 bg-muted rounded-full overflow-hidden border border-border relative">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
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
          <div className="flex-1 hidden sm:block h-3 bg-muted rounded-full opacity-40" />
        )}
        <div className={`text-right shrink-0 flex items-center gap-1 ${textColor}`}>
          <p className="text-sm font-bold">{pct.toFixed(0)}%</p>
          {isComplete && <span className="text-xs">🎯</span>}
        </div>
      </div>
      {weeklyTarget > 0 && (
        <div className="mt-2 sm:hidden">
          <div className="h-2 bg-muted rounded-full overflow-hidden border border-border">
            <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const AdminOverview = () => {
  const router = useRouter()

  const [selectedBranch, setSelectedBranch] = useState("all")
  const [dateFrom, setDateFrom]             = useState<Date>(new Date())
  const [dateTo, setDateTo]                 = useState<Date>(new Date())

  const startDateStr = format(dateFrom, "yyyy-MM-dd")
  const endDateStr   = format(dateTo,   "yyyy-MM-dd")

  const dDiff     = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1)
 const isAllTime = dDiff > 364

  // Only 8 rows for the recent orders table — stats come from server queries
  const { results: ordersPages, status } = usePaginatedQuery(
    api.admin.getOrders,
    selectedBranch === "all" ? {} : { branchId: selectedBranch as any },
    { initialNumItems: 8 }
  )
  const recentOrders = ordersPages?.flat().slice(0, 8) || []
  const isLoading    = status === "LoadingFirstPage"

  const branchesRaw = useQuery(api.admin.getBranches, { paginationOpts: { numItems: 100, cursor: null } } as any)
  const branches: any[] = Array.isArray(branchesRaw) ? branchesRaw : (branchesRaw as any)?.page ?? []

  // Server-side payment stats — accurate for any date range
  const selectedStats = useQuery(api.admin.getPaymentStats, {
    startDate: startDateStr,
    endDate:   endDateStr,
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
  }) ?? { totalRevenue: 0, cashAmount: 0, mobileMoneylAmount: 0, cardAmount: 0, byDay: {}, byDayByMethod: {} }

  // Server-side analytics for order counts
  const analyticsStats = useQuery(api.admin.getAnalytics, {
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
    startDate: new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0, 0, 0).getTime(),
    endDate:   new Date(dateTo.getFullYear(),   dateTo.getMonth(),   dateTo.getDate(),   23, 59, 59).getTime(),
  })

  // Last 30 days for vs-avg comparison (only used when not all-time)
  const last30Stats = useQuery(api.admin.getPaymentStats, {
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate:   format(new Date(), "yyyy-MM-dd"),
    ...(selectedBranch !== "all" ? { branchId: selectedBranch as any } : {}),
  }) ?? { totalRevenue: 0 }

  const weeklyStats = useQuery((api as any).admin.getWeeklyOrderStats) ?? []

  const stats = useMemo(() => {
    const totalMobileMoney = (selectedStats as any)?.mobileMoneylAmount ?? 0
    const totalCard        = (selectedStats as any)?.cardAmount ?? 0
    const totalCash        = (selectedStats as any)?.cashAmount ?? 0
    const selectedRevenue  = (selectedStats as any)?.totalRevenue ?? 0
    const byDayByMethod    = (selectedStats as any)?.byDayByMethod ?? {}

    const selectedOrders   = analyticsStats?.totalOrders ?? 0
   const completedInRange = ((analyticsStats?.ordersByStatus as any)?.completed ?? 0) +
                         ((analyticsStats?.ordersByStatus as any)?.delivered ?? 0)
    const pendingStatuses  = ["pending","pending_dropoff","in_progress","washing","drying","folding","sorting","checked_in"]
    const pendingOrders    = pendingStatuses.reduce(
      (sum, s) => sum + ((analyticsStats?.ordersByStatus as any)?.[s] ?? 0), 0
    )

    // Cap at 60 data points so the chart renders cleanly at any range
    const MAX_POINTS = 60
    const bucketDays = dDiff <= MAX_POINTS ? 1 : Math.ceil(dDiff / MAX_POINTS)
    const chartData: any[] = []

   // Only use dates that actually have data to avoid empty bars packing chart
const activeDates = Object.keys(byDayByMethod).sort()

if (activeDates.length === 0) {
  // fallback: show last 7 days empty
  for (let i = 6; i >= 0; i--) {
    chartData.push({
      date: format(subDays(dateTo, i), "MMM d"),
      displayDate: format(subDays(dateTo, i), "MMM d"),
      mobileMoney: 0, card: 0, cash: 0,
    })
  }
} else {
  // Group active dates into MAX_POINTS buckets
  const bucketSize = Math.ceil(activeDates.length / MAX_POINTS)
  for (let i = 0; i < activeDates.length; i += bucketSize) {
    const bucket = activeDates.slice(i, i + bucketSize)
    let mm = 0, card = 0, cash = 0
    for (const dateStr of bucket) {
      const d = byDayByMethod[dateStr] ?? { cash: 0, mobile_money: 0, card: 0 }
      mm   += d.mobile_money ?? 0
      card += d.card         ?? 0
      cash += d.cash         ?? 0
    }
    const label = bucket.length === 1
      ? format(new Date(bucket[0] + 'T00:00:00'), "MMM d")
      : `${format(new Date(bucket[0] + 'T00:00:00'), "MMM d")}–${format(new Date(bucket[bucket.length - 1] + 'T00:00:00'), "MMM d")}`
    chartData.push({
      date: label, displayDate: label,
      mobileMoney: Math.round(mm   * 100) / 100,
      card:        Math.round(card * 100) / 100,
      cash:        Math.round(cash * 100) / 100,
    })
  }
}

    const totalRevenue30  = (last30Stats as any)?.totalRevenue ?? 0
    const avgDailyRevenue = totalRevenue30 / 30
    const expectedRevenue = avgDailyRevenue * dDiff
    const revenueChange   = !isAllTime && expectedRevenue > 0
      ? ((selectedRevenue - expectedRevenue) / expectedRevenue) * 100
      : undefined

    return {
      selectedOrders, selectedRevenue, totalMobileMoney, totalCard, totalCash,
      pendingOrders, completedInRange, revenueChange, chartData,
    }
  }, [analyticsStats, last30Stats, selectedStats, dateFrom, dateTo, dDiff, isAllTime])

  const filteredWeeklyStats = useMemo(() => {
    const base = selectedBranch === "all"
      ? (weeklyStats as any[])
      : (weeklyStats as any[]).filter((s: any) => s.branchId === selectedBranch)
    return sortByLeaderboard(base)
  }, [weeklyStats, selectedBranch])

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700", delivered: "bg-green-100 text-green-700",
    ready: "bg-blue-100 text-blue-700", in_progress: "bg-yellow-100 text-yellow-700",
    pending: "bg-yellow-100 text-yellow-700", pending_dropoff: "bg-yellow-100 text-yellow-700",
    checked_in: "bg-cyan-100 text-cyan-700", sorting: "bg-purple-100 text-purple-700",
    washing: "bg-indigo-100 text-indigo-700", drying: "bg-sky-100 text-sky-700",
    folding: "bg-violet-100 text-violet-700", cancelled: "bg-gray-100 text-gray-700",
  }
  const formatStatus = (s: string) =>
    s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-4 pb-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome to Javis Admin</p>
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

      {/* Stat cards — one clean sub-line each, no duplicates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Revenue"
          value={`₵${stats.selectedRevenue.toFixed(2)}`}
          change={stats.revenueChange}
          color="border-l-green-500"
          isAllTime={isAllTime}
        />
        <StatCard
          title="Orders"
          value={stats.selectedOrders}
          color="border-l-blue-500"
          isAllTime={isAllTime}
        />
        <StatCard
          title="In Progress"
          value={stats.pendingOrders}
          sub="Require attention"
          color="border-l-yellow-500"
        />
        <StatCard
          title="Completed"
          value={stats.completedInRange}
          sub="In selected period"
          color="border-l-emerald-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Weekly Target Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" /> Weekly Order Target
                </CardTitle>
                <CardDescription className="text-xs">Ranked by completion % — Sun to Sat</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs">
                    {filteredWeeklyStats.length} {filteredWeeklyStats.length === 1 ? "branch" : "branches"}
                  </span>
                </div>
                {/* Goes to /dashboard/reports — click "Weekly Target Reports" button there */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/dashboard/reports?view=weekly")}
                >
                  <BarChart2 className="w-3 h-3 mr-1" /> Details
                </Button>
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
              <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: "260px", scrollbarWidth: "thin" }}>
                {filteredWeeklyStats.map((b: any, idx: number) => (
                  <WeeklyTargetCard
                    key={b.branchId}
                    branchName={b.branchName}
                    weeklyOrders={b.weeklyOrders}
                    weeklyTarget={b.weeklyTarget}
                    rank={idx + 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Distribution */}
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
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="mobileMoney" name="Mobile Money" fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="card"        name="Card"         fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="cash"        name="Cash"         fill="#10b981" radius={[3,3,0,0]} />
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
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {order.customerName || order.customerPhoneNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {branches.find((b: any) => b._id === order.branchId)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-xs ${statusColors[order.status] || "bg-yellow-100 text-yellow-700"}`}>
                        {formatStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-bold ${order.paymentStatus !== "paid" ? "text-muted-foreground" : ""}`}>
                        ₵{(order.finalPrice || 0).toFixed(2)}
                      </p>
                      {order.paymentStatus !== "paid" && <p className="text-xs text-orange-500">Unpaid</p>}
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
