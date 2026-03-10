"use client"

import { useState } from "react"
import { usePaginatedQuery, useQuery, useConvexAuth } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Id, Doc } from "@jordan6699/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { PaymentTable } from "./PaymentTable"
import { PaymentDetailsDialog } from "./PaymentDetailsDialog"
import { format } from "date-fns"

const PAYMENTS_LIMIT = 20

type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"

type PaymentMethod = "mobile_money" | "card" | "cash"

interface Branch {
  _id: Id<"branches">
  name: string
  code: string
}

const AdminPayments = () => {
  const { isAuthenticated } = useConvexAuth()
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedMethod, setSelectedMethod] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedPayment, setSelectedPayment] = useState<
    (Doc<"payments"> & {
      order?: Doc<"orders"> | null
      customer?: Doc<"users"> | null
      branch?: Doc<"branches"> | null
    }) | null
  >(null)

  const {
    results: branchesPages,
  } = usePaginatedQuery(
    api.admin.getBranches,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 100 }
  )
  const branchesList = branchesPages?.flat() || []

  const startTimestamp = startDate ? new Date(startDate).getTime() : undefined
  const endTimestamp = endDate
    ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1
    : undefined

  const {
    results: paymentsPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.payments.getTransactionHistory,
    isAuthenticated
      ? {
          branchId:
            selectedBranchId && selectedBranchId !== "all"
              ? (selectedBranchId as Id<"branches">)
              : undefined,
          status:
            selectedStatus && selectedStatus !== "all"
              ? (selectedStatus as PaymentStatus)
              : undefined,
          paymentMethod:
            selectedMethod && selectedMethod !== "all"
              ? (selectedMethod as PaymentMethod)
              : undefined,
          startDate: startTimestamp,
          endDate: endTimestamp,
        }
      : "skip",
    { initialNumItems: PAYMENTS_LIMIT }
  )

  const allPayments = paymentsPages?.flat() || []
  const isLoading =
    paginationStatus === "LoadingFirstPage" ||
    paginationStatus === "LoadingMore"
  const hasMore = paginationStatus === "CanLoadMore"

  const payments = allPayments

  const summary = useQuery(
    api.payments.getTransactionSummary,
    isAuthenticated
      ? {
          branchId:
            selectedBranchId && selectedBranchId !== "all"
              ? (selectedBranchId as Id<"branches">)
              : undefined,
          startDate: startTimestamp,
          endDate: endTimestamp,
        }
      : "skip"
  )

  const completedPayments = payments.filter((p: any) => p.status === "completed")
  const stats = {
    total: completedPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0),
    count: summary?.totalTransactions || 0,
    mobileMoney: completedPayments.filter((p: any) => p.paymentMethod === "mobile_money").reduce((s: number, p: any) => s + (p.amount || 0), 0),
    card: completedPayments.filter((p: any) => p.paymentMethod === "card").reduce((s: number, p: any) => s + (p.amount || 0), 0),
    cash: completedPayments.filter((p: any) => p.paymentMethod === "cash").reduce((s: number, p: any) => s + (p.amount || 0), 0),
  }

    const handleViewDetails = (payment: Doc<"payments">) => {
    const paymentWithDetails = payments.find((p) => p._id === payment._id)
    setSelectedPayment(paymentWithDetails || payment)
  }

  const handleClearFilters = () => {
    setSelectedBranchId("all")
    setSelectedStatus("all")
    setSelectedMethod("all")
    setStartDate("")
    setEndDate("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all payment transactions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800">
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

            {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Branch Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
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

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <PaymentTable
        payments={payments as any}
        isLoading={isLoading && payments.length === 0}
        onViewDetails={handleViewDetails}
      />

      {/* Load More */}
      {hasMore && payments.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => loadMore(PAYMENTS_LIMIT)}
            disabled={isLoading}
          >
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