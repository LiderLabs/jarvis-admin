"use client"

import { useMemo } from "react"
import { usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle,
  Package,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react"
import { DashboardSkeleton } from "@/components/loaders/DashboardSkeleton"
import { format, subDays } from "date-fns"

const AdminOverview = () => {
  const { results: ordersPages, status } = usePaginatedQuery(
    api.admin.getOrders,
    {},
    { initialNumItems: 100 }
  )

  const orders = ordersPages?.flat() || []
  const isLoading = status === 'LoadingFirstPage'

  // Payment stats from payments table directly (accurate — no dependency on daily reports)
  const todayStats = useQuery(api.admin.getPaymentStats, {
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }) ?? { totalRevenue: 0, cashAmount: 0, mobileMoneylAmount: 0, cardAmount: 0 }

  const last30Stats = useQuery(api.admin.getPaymentStats, {
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }) ?? { totalRevenue: 0, cashAmount: 0, mobileMoneylAmount: 0, cardAmount: 0 }

  const last7Stats = useQuery(api.admin.getPaymentStats, {
    startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }) ?? { totalRevenue: 0, cashAmount: 0, mobileMoneylAmount: 0, cardAmount: 0 }

    const stats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000)

    const todayOrders = orders.filter((o: any) => o._creationTime >= todayStart)
    const last30DaysOrders = orders.filter((o: any) => o._creationTime >= thirtyDaysAgo)

    // Revenue from payments table directly (no dependency on daily reports)
    const todayRevenue = todayStats?.totalRevenue ?? 0
    const totalRevenue = last30Stats?.totalRevenue ?? 0

        const completedOrders = last30DaysOrders.filter((o: any) => o.status === 'completed').length
    const pendingOrders = orders.filter((o: any) =>
      o.status === 'pending' ||
      o.status === 'pending_dropoff' ||
      o.status === 'in_progress' ||
      o.status === 'washing' ||
      o.status === 'drying' ||
      o.status === 'folding' ||
      o.status === 'sorting' ||
      o.status === 'checked_in'
    ).length

    const todayCompletedOrders = todayOrders.filter((o: any) => o.status === 'completed').length

    // Revenue trend from daily reports per day (last 7 days)
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      const dayEnd = dayStart + (24 * 60 * 60 * 1000)

      const dayRevenue = 0 // Per-day breakdown uses order-based fallback
            const dayOrders = orders.filter((o: any) =>
        o._creationTime >= dayStart && o._creationTime < dayEnd
      )

      last7Days.push({
        period: date.toISOString(),
        revenue: dayRevenue,
        orders: dayOrders.length,
      })
    }

    const avgDailyRevenue = totalRevenue / 30
    const revenueChange = avgDailyRevenue > 0
      ? ((todayRevenue - avgDailyRevenue) / avgDailyRevenue) * 100
      : 0

    const avgDailyOrders = last30DaysOrders.length / 30
    const ordersChange = avgDailyOrders > 0
      ? ((todayOrders.length - avgDailyOrders) / avgDailyOrders) * 100
      : 0

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      totalOrders: last30DaysOrders.length,
      totalRevenue,
      completedOrders,
      pendingOrders,
      todayCompletedOrders,
      revenueChange,
      ordersChange,
      revenueTrends: last7Days,
    }
  }, [orders, todayStats, last30Stats, last7Stats])

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders])

  const maxRevenue = useMemo(() => {
    if (stats.revenueTrends.length === 0) return 0
    return Math.max(...stats.revenueTrends.map((t: any) => t.revenue))
  }, [stats.revenueTrends])

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ready_for_pickup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    ready: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    pending_dropoff: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    checked_in: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    sorting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    washing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    drying: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    folding: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  }

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome to WashLab Admin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                <p className="text-3xl font-bold tracking-tight">₵{stats.todayRevenue.toFixed(2)}</p>
                <div className="flex items-center gap-1 text-xs">
                  {stats.revenueChange >= 0 ? (
                    <><ArrowUpRight className="w-3 h-3 text-green-600" /><span className="text-green-600 font-medium">+{stats.revenueChange.toFixed(1)}%</span></>
                  ) : (
                    <><ArrowDownRight className="w-3 h-3 text-red-600" /><span className="text-red-600 font-medium">{stats.revenueChange.toFixed(1)}%</span></>
                  )}
                  <span className="text-muted-foreground">vs avg • received only</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
                <p className="text-3xl font-bold tracking-tight">{stats.todayOrders}</p>
                <div className="flex items-center gap-1 text-xs">
                  {stats.ordersChange >= 0 ? (
                    <><ArrowUpRight className="w-3 h-3 text-green-600" /><span className="text-green-600 font-medium">+{stats.ordersChange.toFixed(1)}%</span></>
                  ) : (
                    <><ArrowDownRight className="w-3 h-3 text-red-600" /><span className="text-red-600 font-medium">{stats.ordersChange.toFixed(1)}%</span></>
                  )}
                  <span className="text-muted-foreground">vs avg</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Orders in Progress</p>
                <p className="text-3xl font-bold tracking-tight">{stats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Orders Completed Today</p>
                <p className="text-3xl font-bold tracking-tight">{stats.todayCompletedOrders}</p>
                <p className="text-xs text-muted-foreground">Successfully delivered</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue (30d)</p>
                <p className="text-2xl font-bold">₵{stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Received payments only</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" /><span>Last 30 days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders (30d)</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" /><span>Last 30 days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Orders Completed (30d)</p>
                <p className="text-2xl font-bold">{stats.completedOrders}</p>
              </div>
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" /><span>Last 30 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="w-5 h-5" />
                Performance Trend (Last 7 Days)
              </CardTitle>
              <CardDescription className="text-xs mt-1">Daily received revenue and order volume</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500" /><span>Revenue</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-cyan-400" /><span>Orders</span></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.revenueTrends.length > 0 ? (
            <div className="space-y-3">
              {stats.revenueTrends.map((trend: any) => {
                const revenuePercentage = maxRevenue > 0 ? (trend.revenue / maxRevenue) * 100 : 0
                const maxOrders = Math.max(...stats.revenueTrends.map((t: any) => t.orders), 1)
                const ordersPercentage = (trend.orders / maxOrders) * 100
                return (
                  <div key={trend.period} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground w-24">{format(new Date(trend.period), 'EEE, MMM d')}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{trend.orders} orders</span>
                        <span className="font-bold text-foreground tabular-nums">₵{trend.revenue.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="relative h-7 bg-muted/40 rounded-lg overflow-hidden border border-border/30">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(revenuePercentage, 2)}%` }}
                      >
                        {revenuePercentage > 20 && (
                          <span className="text-[10px] font-semibold text-white">₵{trend.revenue.toLocaleString('en', { minimumFractionDigits: 0 })}</span>
                        )}
                      </div>
                      <div
                        className="absolute inset-y-0 left-0 bg-cyan-400/20 border-r-2 border-cyan-400 transition-all duration-700"
                        style={{ width: `${Math.max(ordersPercentage, 1)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" />Recent Orders</span>
            <Badge variant="secondary">{recentOrders.length}</Badge>
          </CardTitle>
          <CardDescription>Latest customer orders and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order: any) => (
                <div key={order._id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-lg">{order.orderNumber}</p>
                      <Badge variant="secondary" className={`text-xs ${statusColors[order.status] || 'bg-yellow-100 text-yellow-700'}`}>
                        {formatStatus(order.status)}
                      </Badge>
                      {order.paymentStatus !== 'paid' && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Unpaid</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{order.customerName || order.customerPhoneNumber}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(order._creationTime), 'MMM d, yyyy • h:mm a')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${order.paymentStatus !== 'paid' ? 'text-muted-foreground' : ''}`}>
                      ₵{(order.finalPrice || 0).toFixed(2)}
                    </p>
                    {order.paymentStatus !== 'paid' && (
                      <p className="text-xs text-orange-500">Not counted in revenue</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminOverview