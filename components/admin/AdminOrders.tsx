"use client"

import { useState, useMemo } from "react"
import { usePaginatedQuery, useQuery, useMutation, useConvexAuth } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Id, Doc } from "@jordan6699/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { OrderTable } from "./OrderTable"
import { OrderDetailsDialog } from "./OrderDetailsDialog"
import { OrderStatusDialog } from "./OrderStatusDialog"
import { Search, Filter, Loader2, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { format, addDays, subDays, isToday } from "date-fns"

const ORDERS_LIMIT = 100

type OrderStatus =
  | "pending_dropoff" | "checked_in" | "sorting" | "washing"
  | "drying" | "folding" | "ready" | "completed"
  | "cancelled" | "pending" | "in_progress" | "ready_for_pickup" | "delivered"

interface Branch {
  _id: Id<"branches">
  name: string
  code: string
}

const AdminOrders = () => {
  const { isAuthenticated } = useConvexAuth()
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedOrder, setSelectedOrder] = useState<Doc<"orders"> | null>(null)
  const [orderToUpdate, setOrderToUpdate] = useState<Doc<"orders"> | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<Doc<"orders"> | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  const { results: branchesPages } = usePaginatedQuery(
    api.admin.getBranches,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 100 }
  )
  const branchesList = branchesPages?.flat() || []

  const { results: ordersPages, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.admin.getOrders,
    isAuthenticated ? {
      branchId: selectedBranchId && selectedBranchId !== "all" ? (selectedBranchId as Id<"branches">) : undefined,
      status: selectedStatus && selectedStatus !== "all" ? (selectedStatus as OrderStatus) : undefined,
    } : "skip",
    { initialNumItems: ORDERS_LIMIT }
  )

  const orderDetails = useQuery(
    api.admin.getOrderDetails,
    selectedOrder && isAuthenticated ? { orderId: selectedOrder._id } : "skip"
  )

  const updateOrderStatus = useMutation(api.admin.updateOrderStatus)
  const deleteOrder = useMutation(api.admin.deleteOrder)

  const orders = ordersPages?.flat() || []
  const hasMore = paginationStatus === "CanLoadMore"
  const isLoading = paginationStatus === "LoadingFirstPage" || paginationStatus === "LoadingMore"

  const { dayStart, dayEnd } = useMemo(() => {
    const d = new Date(selectedDate)
    d.setHours(0, 0, 0, 0)
    const dayStart = d.getTime()
    return { dayStart, dayEnd: dayStart + 86400000 }
  }, [selectedDate])

  const dayOrders = useMemo(() =>
    orders.filter(o => o._creationTime >= dayStart && o._creationTime < dayEnd),
    [orders, dayStart, dayEnd]
  )

  const filteredOrders = useMemo(() => dayOrders.filter(order => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!order.orderNumber.toLowerCase().includes(q) && !order.customerPhoneNumber.toLowerCase().includes(q)) return false
    }
    return true
  }), [dayOrders, searchQuery])

  const stats = useMemo(() => ({
    total: dayOrders.length,
    pending_dropoff: dayOrders.filter(o => o.status === "pending_dropoff").length,
    checked_in: dayOrders.filter(o => o.status === "checked_in").length,
    sorting: dayOrders.filter(o => o.status === "sorting").length,
    washing: dayOrders.filter(o => o.status === "washing").length,
    drying: dayOrders.filter(o => o.status === "drying").length,
    folding: dayOrders.filter(o => o.status === "folding").length,
    ready: dayOrders.filter(o => o.status === "ready" || o.status === "ready_for_pickup").length,
    completed: dayOrders.filter(o => o.status === "completed" || o.status === "delivered").length,
    cancelled: dayOrders.filter(o => o.status === "cancelled").length,
  }), [dayOrders])

  const handleViewDetails = (order: Doc<"orders">) => { setSelectedOrder(order); setShowDetailsDialog(true) }
  const handleUpdateStatus = (order: Doc<"orders">) => { setOrderToUpdate(order); setShowStatusDialog(true) }
  const handleDelete = (order: Doc<"orders">) => { setOrderToDelete(order) }

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return
    try {
      await deleteOrder({ orderId: orderToDelete._id })
      toast.success("Order deleted successfully")
      setOrderToDelete(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete order")
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string, notes?: string) => {
    try {
      await updateOrderStatus({ orderId: orderId as Id<"orders">, newStatus: newStatus as OrderStatus, notes })
      toast.success("Order status updated successfully")
      setShowStatusDialog(false)
      setOrderToUpdate(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update order status")
    }
  }

  const isSelectedToday = isToday(selectedDate)

  const pipeline = [
    { label: "Dropoff", value: stats.pending_dropoff, color: "text-orange-500" },
    { label: "Checked In", value: stats.checked_in, color: "text-cyan-600" },
    { label: "Sorting", value: stats.sorting, color: "text-purple-600" },
    { label: "Washing", value: stats.washing, color: "text-indigo-600" },
    { label: "Drying", value: stats.drying, color: "text-sky-600" },
    { label: "Folding", value: stats.folding, color: "text-violet-600" },
    { label: "Ready", value: stats.ready, color: "text-blue-600" },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage and track all orders</p>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Viewing:</span>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative flex items-center">
              <CalendarIcon className="absolute left-2.5 h-3.5 w-3.5 text-primary pointer-events-none z-10" />
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={e => { if (e.target.value) setSelectedDate(new Date(e.target.value + "T12:00:00")) }}
                className="h-8 pl-8 pr-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedDate(d => addDays(d, 1))} disabled={isSelectedToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isSelectedToday && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(new Date())}>Today</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-3 sm:px-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total</p>
            <p className="text-2xl sm:text-4xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{isSelectedToday ? "today" : format(selectedDate, "MMM d")}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="py-3 px-3 sm:px-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Done</p>
            <p className="text-2xl sm:text-4xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">{stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardContent className="py-3 px-3 sm:px-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Active</p>
            <p className="text-2xl sm:text-4xl font-bold text-yellow-600">
              {stats.checked_in + stats.sorting + stats.washing + stats.drying + stats.folding}
            </p>
            <p className="text-xs text-muted-foreground">in progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline - scrollable on mobile */}
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Wash Pipeline</p>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="flex gap-0 min-w-max divide-x divide-border">
              {pipeline.map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center px-4 first:pl-0 last:pr-0 min-w-[60px]">
                  <span className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="py-4 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="search" className="text-xs">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="search" placeholder="Order number or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            <div>
              <Label htmlFor="branch" className="text-xs">Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger id="branch" className="mt-1 h-9">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branchesList.map((branch: Branch) => (
                    <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="mt-1 h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_dropoff">Pending Dropoff</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="sorting">Sorting</SelectItem>
                  <SelectItem value="washing">Washing</SelectItem>
                  <SelectItem value="drying">Drying</SelectItem>
                  <SelectItem value="folding">Folding</SelectItem>
                  <SelectItem value="ready">Ready for Pickup</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <OrderTable
        orders={filteredOrders}
        isLoading={isLoading && orders.length === 0}
        onViewDetails={handleViewDetails}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => loadMore(ORDERS_LIMIT)} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : "Load More Orders"}
          </Button>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsDialog order={selectedOrder} customer={orderDetails?.customer || null} branch={orderDetails?.branch || null} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
      )}
      {orderToUpdate && (
        <OrderStatusDialog order={orderToUpdate} open={showStatusDialog} onOpenChange={setShowStatusDialog} onUpdate={handleStatusUpdate} />
      )}

      <AlertDialog open={!!orderToDelete} onOpenChange={open => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order <strong>{orderToDelete?.orderNumber}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminOrders
