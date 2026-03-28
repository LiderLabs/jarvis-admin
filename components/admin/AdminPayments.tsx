"use client"

import { useState } from "react"
import { usePaginatedQuery, useQuery, useConvexAuth } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Id, Doc } from "@jordan6699/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { PaymentTable } from "./PaymentTable"
import { PaymentDetailsDialog } from "./PaymentDetailsDialog"

const PAYMENTS_LIMIT = 20

type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded"
type PaymentMethod = "mobile_money" | "card" | "cash"

const AdminPayments = () => {
  const { isAuthenticated } = useConvexAuth()
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedMethod, setSelectedMethod] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date>(new Date())
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [selectedPayment, setSelectedPayment] = useState<
    (Doc<"payments"> & {
      order?: Doc<"orders"> | null
      customer?: Doc<"users"> | null
      branch?: Doc<"branches"> | null
    }) | null
  >(null)

  const { results: branchesPages } = usePaginatedQuery(
    api.admin.getBranches,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 100 }
  )
  const branchesList = branchesPages?.flat() || []

  const startTimestamp = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : undefined
  const endTimestamp = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : undefined

  const {
    results: paymentsPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.payments.getTransactionHistory,
    isAuthenticated
      ? {
          branchId: selectedBranchId !== "all" ? (selectedBranchId as Id<"branches">) : undefined,
          status: selectedStatus !== "all" ? (selectedStatus as PaymentStatus) : undefined,
          paymentMethod: selectedMethod !== "all" ? (selectedMethod as PaymentMethod) : undefined,
          startDate: startTimestamp,
          endDate: endTimestamp,
        }
      : "skip",
    { initialNumItems: PAYMENTS_LIMIT }
  )

  const allPayments = paymentsPages?.flat() || []
  const isLoading = paginationStatus === "LoadingFirstPage" || paginationStatus === "LoadingMore"
  const hasMore = paginationStatus === "CanLoadMore"

  const summary = useQuery(
    api.payments.getTransactionSummary,
    isAuthenticated
      ? {
          branchId: selectedBranchId !== "all" ? (selectedBranchId as Id<"branches">) : undefined,
          startDate: startTimestamp,
          endDate: endTimestamp,
        }
      : "skip"
  )

  const stats = {
    total: summary?.totalAmount || 0,
    count: summary?.totalTransactions || 0,
    mobileMoney: summary?.byMethod?.mobile_money || 0,
    card: summary?.byMethod?.card || 0,
    cash: summary?.byMethod?.cash || 0,
  }

  const handleViewDetails = (payment: Doc<"payments">) => {
    const paymentWithDetails = allPayments.find((p) => p._id === payment._id)
    setSelectedPayment(paymentWithDetails || payment)
  }

  const handleClearFilters = () => {
    setSelectedBranchId("all")
    setSelectedStatus("all")
    setSelectedMethod("all")
    setDateFrom(new Date())
    setDateTo(new Date())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage all payment transactions</p>
      </div>

      {/* Filters — full width row, wraps on mobile */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date picker takes full width on mobile, auto on larger screens */}
        <div className="w-full sm:w-auto">
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
          />
        </div>

        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branchesList.map((branch) => (
              <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedMethod} onValueChange={setSelectedMethod}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-9 w-full sm:w-auto">
          Clear Filters
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{stats.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Received payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
            <p className="text-xs text-muted-foreground">All payments</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Money</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₵{stats.mobileMoney.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">MoMo payments</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Card</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₵{stats.card.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Card payments</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₵{stats.cash.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Cash payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <PaymentTable
        payments={allPayments as any}
        isLoading={isLoading && allPayments.length === 0}
        onViewDetails={handleViewDetails}
      />

      {/* Load More */}
      {hasMore && allPayments.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => loadMore(PAYMENTS_LIMIT)} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More Payments"}
          </Button>
        </div>
      )}

      {/* Payment Details Dialog */}
      {selectedPayment && (
        <PaymentDetailsDialog
          payment={selectedPayment}
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
        />
      )}
    </div>
  )
}

export default AdminPayments