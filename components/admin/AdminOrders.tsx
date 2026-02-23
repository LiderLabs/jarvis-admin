"use client"

import { useState, useMemo } from "react"
import { usePaginatedQuery, useQuery, useMutation, useConvexAuth } from "convex/react"
import { api } from "@devlider001/washlab-backend/api"
import { Id, Doc } from "@devlider001/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { OrderTable } from "./OrderTable"
import { OrderDetailsDialog } from "./OrderDetailsDialog"
import { OrderStatusDialog } from "./OrderStatusDialog"
import {
  Search,
  Filter,
  Loader2,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { format, addDays, subDays, isToday } from "date-fns"

const ORDERS_LIMIT = 100

type OrderStatus =
  | "pending_dropoff"
  | "checked_in"
  | "sorting"
  | "washing"
  | "drying"
  | "folding"
  | "ready"
  | "completed"
  | "cancelled"
  | "pending"
  | "in_progress"
  | "ready_for_pickup"
  | "delivered"

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
  const [calendarOpen, setCalendarOpen] = useState(false)
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

  const {
    results: ordersPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.admin.getOrders,
    isAuthenticated
      ? {
          branchId:
            selectedBranchId && selectedBranchId !== "all"
              ? (selectedBranchId as Id<"branches">)
              : undefined,
          status:
            selectedStatus && selectedStatus !== "all"
              ? (selectedStatus as OrderStatus)
              : undefined,
        }
      : "skip",
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
  const isLoading =
    paginationStatus === "LoadingFirstPage" || paginationStatus === "LoadingMore"

  const { dayStart, dayEnd } = useMemo(() => {
    const d = new Date(selectedDate)
    d.setHours(0, 0, 0, 0)
    const dayStart = d.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    return { dayStart, dayEnd }
  }, [selectedDate])

  const dayOrders = useMemo(() => {
    return orders.filter(
      (o) => o._creationTime >= dayStart && o._creationTime < dayEnd
    )
  }, [orders, dayStart, dayEnd])

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

  const stats = useMemo(() => ({
    total: dayOrders.length,
    pending_dropoff: dayOrders.filter((o) => o.status === "pending_dropoff").length,
    checked_in: dayOrders.filter((o) => o.status === "checked_in").length,
    sorting: dayOrders.filter((o) => o.status === "sorting").length,
    washing: dayOrders.filter((o) => o.status === "washing").length,
    drying: dayOrders.filter((o) => o.status === "drying").length,
    folding: dayOrders.filter((o) => o.status === "folding").length,
    ready: dayOrders.filter((o) => o.status === "ready" || o.status === "ready_for_pickup").length,
    completed: dayOrders.filter((o) => o.status === "completed" || o.status === "delivered").length,
    cancelled: dayOrders.filter((o) => o.status === "cancelled").length,
  }), [dayOrders])

  const handleViewDetails = (order: Doc<"orders">) => {
    setSelectedOrder(order)
    setShowDetailsDialog(true)
  }

  const handleUpdateStatus = (order: Doc<"orders">) => {
    setOrderToUpdate(order)
    setShowStatusDialog(true)
  }

  const handleDelete = (order: Doc<"orders">) => {
    setOrderToDelete(order)
  }

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return
    try {
      await deleteOrder({ orderId: orderToDelete._id })
      toast.success("Order deleted successfully")
      setOrderToDelete(null)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete order"
      toast.error(errorMessage)
    }
  }

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: string,
    notes?: string
  ) => {
    try {
      await updateOrderStatus({
        orderId: orderId as Id<"orders">,
        newStatus: newStatus as OrderStatus,
        notes,
      })
      toast.success("Order status updated successfully")
      setShowStatusDialog(false)
      setOrderToUpdate(null)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update order status"
      toast.error(errorMessage)
    }
  }

  const goToPrevDay = () => setSelectedDate((d) => subDays(d, 1))
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1))
  const goToToday = () => setSelectedDate(new Date())

  const isSelectedToday = isToday(selectedDate)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage and track all orders
          </p>
        </div>
      </div>

      {/* Date Selector */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground shrink-0 mr-1">
              Viewing orders for:
            </span>

            {/* Prev */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevDay}
              className="h-9 w-9 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Calendar trigger */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 min-w-[200px] justify-start gap-2 font-medium border-2 border-primary/30 hover:border-primary/60 transition-colors"
                >
                  <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {isSelectedToday
                      ? "Today · " + format(selectedDate, "MMM d, yyyy")
                      : format(selectedDate, "EEE, MMM d, yyyy")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 shadow-lg border rounded-xl overflow-hidden"
                align="start"
                sideOffset={6}
              >
                {/* Calendar header */}
                <div className="bg-primary px-4 py-3">
                  <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">
                    Select Date
                  </p>
                  <p className="text-lg font-bold text-primary-foreground mt-0.5">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </p>
                </div>

                {/* Calendar widget */}
                <div className="p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date)
                        setCalendarOpen(false)
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    classNames={{
                      months: "flex flex-col space-y-4",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-muted rounded-md inline-flex items-center justify-center",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem] flex items-center justify-center",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-muted inline-flex items-center justify-center",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md font-semibold",
                      day_today: "bg-accent text-accent-foreground font-semibold",
                      day_outside: "text-muted-foreground opacity-40",
                      day_disabled: "text-muted-foreground opacity-25 cursor-not-allowed",
                      day_hidden: "invisible",
                    }}
                  />
                </div>

                {/* Footer: Today shortcut */}
                {!isSelectedToday && (
                  <div className="border-t px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs font-medium text-primary hover:text-primary"
                      onClick={() => {
                        setSelectedDate(new Date())
                        setCalendarOpen(false)
                      }}
                    >
                      Jump to Today
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Next */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="h-9 w-9 shrink-0"
              disabled={isSelectedToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Today pill — only when on a past date */}
            {!isSelectedToday && (
              <Button
                variant="secondary"
                size="sm"
                onClick={goToToday}
                className="h-9 px-4 font-medium"
              >
                Back to Today
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Orders</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{stats.total}</span>
                <span className="text-xs text-muted-foreground">
                  {isSelectedToday ? "today" : format(selectedDate, "MMM d")}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-600">{stats.completed}</span>
                <span className="text-xs text-muted-foreground">
                  {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">In Progress</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-yellow-600">
                  {stats.checked_in + stats.sorting + stats.washing + stats.drying + stats.folding}
                </span>
                <span className="text-xs text-muted-foreground">active now</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-3 px-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Wash Pipeline</p>
            <div className="grid grid-cols-7 divide-x divide-border">
              {[
                { label: "Pending\nDropoff",  value: stats.pending_dropoff, color: "text-orange-500" },
                { label: "Checked\nIn",       value: stats.checked_in,     color: "text-cyan-600"   },
                { label: "Sorting",           value: stats.sorting,         color: "text-purple-600" },
                { label: "Washing",           value: stats.washing,         color: "text-indigo-600" },
                { label: "Drying",            value: stats.drying,          color: "text-sky-600"    },
                { label: "Folding",           value: stats.folding,         color: "text-violet-600" },
                { label: "Ready",             value: stats.ready,           color: "text-blue-600"   },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center px-3 first:pl-0 last:pr-0">
                  <span className={`text-3xl font-bold ${color}`}>{value}</span>
                  <span className="text-xs text-muted-foreground text-center whitespace-pre-line leading-tight mt-1.5">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Order number or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger id="branch" className="mt-2">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branchesList.map((branch: Branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="mt-2">
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
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => loadMore(ORDERS_LIMIT)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Orders"
            )}
          </Button>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          customer={orderDetails?.customer || null}
          branch={orderDetails?.branch || null}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}

      {orderToUpdate && (
        <OrderStatusDialog
          order={orderToUpdate}
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          onUpdate={handleStatusUpdate}
        />
      )}

      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order{" "}
              <strong>{orderToDelete?.orderNumber}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminOrders