'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '@liderlabs/washlab-backend/api'
import { Id, Doc } from '@liderlabs/washlab-backend/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrderTable } from './OrderTable'
import { OrderDetailsDialog } from './OrderDetailsDialog'
import {
  Search,
  Filter,
  Loader2,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, subDays } from 'date-fns'

type OrderStatus =
  | 'pending_dropoff'
  | 'checked_in'
  | 'sorting'
  | 'washing'
  | 'drying'
  | 'folding'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'pending'
  | 'in_progress'
  | 'ready_for_pickup'
  | 'delivered'

interface Branch {
  _id: Id<'branches'>
  name: string
  code: string
}

function downloadCSV(rows: (string | number | null | undefined)[][], filename: string) {
  const csv = rows
    .map((r) => r.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getLocalDayBounds(dateStr: string): { dayStart: number; dayEnd: number } {
  const start = new Date(dateStr + 'T00:00:00')
  const end = new Date(dateStr + 'T00:00:00')
  end.setDate(end.getDate() + 1)
  return { dayStart: start.getTime(), dayEnd: end.getTime() }
}

const AdminOrders = () => {
  const { isAuthenticated } = useConvexAuth()
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr)

  const [selectedOrder, setSelectedOrder] = useState<Doc<'orders'> | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Branches — plain query with paginationOpts to match backend signature
  const branchesResult = useQuery(
    api.admin.getBranches,
    isAuthenticated ? { paginationOpts: { numItems: 100, cursor: null } } : 'skip'
  )
  const branchesList: Branch[] = useMemo(() => {
    if (!branchesResult) return []
    if (Array.isArray(branchesResult)) return branchesResult
    if ((branchesResult as any).page) return (branchesResult as any).page
    return []
  }, [branchesResult])

  const { dayStart, dayEnd } = useMemo(
    () => getLocalDayBounds(selectedDateStr),
    [selectedDateStr]
  )

  // Orders — plain useQuery so ALL orders for the day load at once
  // This means stat boxes always reflect the full day, not just one page
  const ordersQueryArgs = isAuthenticated
    ? {
        ...(selectedBranchId !== 'all'
          ? { branchId: selectedBranchId as Id<'branches'> }
          : {}),
        ...(selectedStatus !== 'all'
          ? { status: selectedStatus as OrderStatus }
          : {}),
        startDate: dayStart,
        endDate: dayEnd,
        paginationOpts: { numItems: 1000, cursor: null },
      }
    : ('skip' as const)

  const ordersResult = useQuery(api.admin.getOrders, ordersQueryArgs)
  const isLoading = ordersResult === undefined

  const orders: Doc<'orders'>[] = useMemo(() => {
    if (!ordersResult) return []
    if (Array.isArray(ordersResult)) return ordersResult
    if ((ordersResult as any).page) return (ordersResult as any).page
    return []
  }, [ordersResult])

  const orderDetails = useQuery(
    api.admin.getOrderDetails,
    selectedOrder && isAuthenticated ? { orderId: selectedOrder._id } : 'skip'
  )


  // dayOrders = all orders (already filtered by date in the query args)
  const dayOrders = orders

  const filteredOrders = useMemo(() => {
    return dayOrders.filter((order) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        if (
          !order.orderNumber.toLowerCase().includes(query) &&
          !order.customerPhoneNumber.toLowerCase().includes(query)
        )
          return false
      }
      return true
    })
  }, [dayOrders, searchQuery])

  const stats = useMemo(
    () => ({
      total: dayOrders.length,
      pending_dropoff: dayOrders.filter((o) => o.status === 'pending_dropoff').length,
      checked_in: dayOrders.filter((o) => o.status === 'checked_in').length,
      ready: dayOrders.filter(
        (o) => o.status === 'ready' || o.status === 'ready_for_pickup'
      ).length,
      completed: dayOrders.filter(
        (o) => o.status === 'completed' || o.status === 'delivered'
      ).length,
      cancelled: dayOrders.filter((o) => o.status === 'cancelled').length,
      in_progress: dayOrders.filter((o) =>
        ['sorting', 'washing', 'drying', 'folding'].includes(o.status)
      ).length,
    }),
    [dayOrders]
  )

  const handleExportCSV = async () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders to export')
      return
    }
    setIsExporting(true)
    try {
      const branchMap = Object.fromEntries(
        branchesList.map((b) => [b._id, b.name])
      )

      const headers = [
        'Order Number', 'Date', 'Time', 'Branch', 'Customer Name', 'Customer Phone',
        'Service Type', 'Order Type', 'Status', 'Payment Status', 'Payment Method',
        'Base Price (GHS)', 'Final Price (GHS)', 'Estimated Loads', 'Bag Card',
      ]

      const buildRow = (o: any) => {
        const date = new Date(o.createdAt ?? o._creationTime)
        const customerName = o.customerName || o.name || o.customer?.name || ''
        return [
          o.orderNumber,
          date.toLocaleDateString('en-GB'),
          date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          branchMap[o.branchId] ?? o.branchId,
          customerName,
          o.customerPhoneNumber ?? '',
          o.serviceType ?? '',
          o.orderType ?? 'walk_in',
          o.status,
          o.paymentStatus ?? '',
          o.paymentMethod ?? '',
          (o.basePrice ?? 0).toFixed(2),
          (o.finalPrice ?? 0).toFixed(2),
          o.estimatedLoads ?? '',
          o.bagCardNumber ?? '',
        ]
      }

      downloadCSV(
        [headers, ...filteredOrders.map(buildRow)],
        `orders-all-${selectedDateStr}.csv`
      )

      const ordersByBranch = new Map<string, { name: string; orders: any[] }>()
      for (const o of filteredOrders as any[]) {
        const branchName = branchMap[o.branchId] ?? 'Unknown'
        if (!ordersByBranch.has(o.branchId)) {
          ordersByBranch.set(o.branchId, { name: branchName, orders: [] })
        }
        ordersByBranch.get(o.branchId)!.orders.push(o)
      }

      if (ordersByBranch.size > 1) {
        for (const { name, orders: branchOrders } of ordersByBranch.values()) {
          downloadCSV(
            [headers, ...branchOrders.map(buildRow)],
            `orders-${name.replace(/\s+/g, '-').toLowerCase()}-${selectedDateStr}.csv`
          )
        }
        toast.success(`Exported ${filteredOrders.length} orders across ${ordersByBranch.size} branches`)
      } else {
        toast.success(`Exported ${filteredOrders.length} orders`)
      }
    } catch {
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleViewDetails = (order: Doc<'orders'>) => {
    setSelectedOrder(order)
    setShowDetailsDialog(true)
  }

  const isSelectedToday = selectedDateStr === todayStr

  const goToPrevDay = () => {
    const d = new Date(selectedDateStr + 'T12:00:00')
    setSelectedDateStr(format(subDays(d, 1), 'yyyy-MM-dd'))
  }

  const goToNextDay = () => {
    const d = new Date(selectedDateStr + 'T12:00:00')
    setSelectedDateStr(format(addDays(d, 1), 'yyyy-MM-dd'))
  }

  const selectedDateForDisplay = new Date(selectedDateStr + 'T12:00:00')

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage and track all orders
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={isExporting || filteredOrders.length === 0}
          className="gap-1.5 shrink-0 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isExporting ? 'Exporting…' : `Export${filteredOrders.length > 0 ? ` (${filteredOrders.length})` : ''}`}
          </span>
          <span className="sm:hidden">{isExporting ? '…' : 'CSV'}</span>
        </Button>
      </div>

      {/* ── Date Selector ── */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevDay} className="h-9 w-9 shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="relative flex items-center">
              <CalendarIcon className="absolute left-2.5 h-3.5 w-3.5 text-primary pointer-events-none z-10" />
              <input
                type="date"
                value={selectedDateStr}
                max={todayStr}
                onChange={(e) => { if (e.target.value) setSelectedDateStr(e.target.value) }}
                className="h-9 w-[160px] pl-8 pr-2 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
              />
            </div>

            {!isSelectedToday && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs px-3 shrink-0"
                onClick={() => setSelectedDateStr(todayStr)}
              >
                Today
              </Button>
            )}

            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            )}

            <div className="flex-1" />

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="h-9 w-9 shrink-0"
              disabled={isSelectedToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <div className="space-y-3 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 col-span-2 sm:col-span-1">
            <CardContent className="py-3 px-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Total Orders
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-primary">{stats.total}</span>
                <span className="text-xs text-muted-foreground">
                  {isSelectedToday ? 'today' : format(selectedDateForDisplay, 'MMM d')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="py-3 px-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Completed
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-green-600">{stats.completed}</span>
                <span className="text-xs text-muted-foreground">
                  {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
            <CardContent className="py-3 px-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                In Progress
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-yellow-600">{stats.in_progress}</span>
                <span className="text-xs text-muted-foreground">active</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Wash Pipeline
            </p>
            <div className="grid grid-cols-4 divide-x divide-border">
              {[
                { label: 'Pending\nDropoff', value: stats.pending_dropoff, color: 'text-orange-500' },
                { label: 'Checked\nIn',      value: stats.checked_in,     color: 'text-cyan-600'   },
                { label: 'In\nProgress',     value: stats.in_progress,    color: 'text-indigo-600' },
                { label: 'Ready',            value: stats.ready,           color: 'text-blue-600'   },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center px-2 first:pl-0 last:pr-0">
                  <span className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground text-center whitespace-pre-line leading-tight mt-1">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <Card className="mb-5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="search" className="text-xs">Search Orders</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Order number or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="branch" className="text-xs">Branch</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="branch" className="mt-1.5 h-9 text-xs">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branchesList.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status" className="text-xs">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status" className="mt-1.5 h-9 text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_dropoff">Pending Dropoff</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Orders Table — no Load More, all orders fetched at once ── */}
      <OrderTable
        orders={filteredOrders}
        isLoading={isLoading}
        onViewDetails={handleViewDetails}
      />

      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          customer={orderDetails?.customer || null}
          branch={orderDetails?.branch || null}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}
    </div>
  )
}

export default AdminOrders
