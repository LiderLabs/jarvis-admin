'use client'

import { useState, useMemo } from "react"
import { usePaginatedQuery, useQuery, useConvexAuth } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Id, Doc } from "@jordan6699/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { PaymentTable } from "./PaymentTable"
import { PaymentDetailsDialog } from "./PaymentDetailsDialog"
import { Download } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"



type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded"
type PaymentMethod = "mobile_money" | "card" | "cash"

type PaymentWithDetails = Doc<"payments"> & {
  order?: Doc<"orders"> | null
  customer?: Doc<"users"> | null
  branch?: Doc<"branches"> | null
}

interface Branch {
  _id: Id<'branches'>
  name: string
  code: string
}

function downloadCSV(rows: (string | number | null | undefined)[][], filename: string) {
  const csv = rows
    .map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  toast.success("Exported successfully")
}

const AdminPayments = () => {
  const { isAuthenticated } = useConvexAuth()
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedMethod, setSelectedMethod] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date>(new Date())
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null)

  // Branches
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

  const branchMap = useMemo(
    () => Object.fromEntries(branchesList.map((b) => [b._id, b.name])),
    [branchesList]
  )

  const startTimestamp = useMemo(
    () => new Date(dateFrom).setHours(0, 0, 0, 0),
    [dateFrom]
  )
  const endTimestamp = useMemo(
    () => new Date(dateTo).setHours(23, 59, 59, 999),
    [dateTo]
  )

  // Payments — usePaginatedQuery with a large initialNumItems to load everything at once
  const {
    results: paymentsPages,
    status: paymentsStatus,
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
    { initialNumItems: 5000 }
  )

  const isLoading = paymentsStatus === "LoadingFirstPage"
  const allPayments: any[] = paymentsPages?.flat() ?? []

  // Summary — separate query, always accurate
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
    total: summary?.totalAmount ?? 0,
    count: summary?.totalTransactions ?? 0,
    mobileMoney: summary?.byMethod?.mobile_money ?? 0,
    card: summary?.byMethod?.card ?? 0,
    cash: summary?.byMethod?.cash ?? 0,
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

  const handleExport = () => {
    if (allPayments.length === 0) {
      toast.error("No payments to export")
      return
    }

    const rows: (string | number | null | undefined)[][] = [
      [
        "Date", "Time", "Transaction Ref", "Order Number", "Customer Name",
        "Customer Phone", "Branch", "Payment Method", "Amount (GHS)", "Status",
        "Voucher Applied", "Voucher Code", "Loyalty Discount (GHS)",
        "Original Price (GHS)", "Final Price (GHS)",
      ],
      ...allPayments.map((p: any) => {
        const createdAt = new Date(p._creationTime)
        const order = p.order
        const voucherApplied = order?.voucherCode ? "Yes" : "No"
        const loyaltyDiscount =
          order?.totalPrice && order?.finalPrice
            ? Math.max(0, order.totalPrice - order.finalPrice - (order.voucherDiscount || 0))
            : 0

        return [
          format(createdAt, "yyyy-MM-dd"),
          format(createdAt, "HH:mm:ss"),
          p.reference || p._id,
          order?.orderNumber || "",
          p.customer?.name || order?.customerName || "",
          p.customer?.phoneNumber || order?.customerPhoneNumber || "",
          p.branch?.name || branchMap[p.branchId] || "",
          p.paymentMethod === "mobile_money" ? "Mobile Money"
            : p.paymentMethod === "card" ? "Card"
            : p.paymentMethod === "cash" ? "Cash"
            : p.paymentMethod || "",
          (p.amount || 0).toFixed(2),
          p.status || "",
          voucherApplied,
          order?.voucherCode || "",
          loyaltyDiscount > 0 ? loyaltyDiscount.toFixed(2) : "0.00",
          order?.totalPrice != null ? order.totalPrice.toFixed(2) : "",
          order?.finalPrice != null ? order.finalPrice.toFixed(2) : "",
        ]
      }),
    ]

    downloadCSV(
      rows,
      `payments-${format(dateFrom, "yyyy-MM-dd")}-to-${format(dateTo, "yyyy-MM-dd")}.csv`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all payment transactions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={allPayments.length === 0}
          className="h-9 gap-1.5 w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV{allPayments.length > 0 ? ` (${allPayments.length})` : ''}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-auto">
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f)
              setDateTo(t)
            }}
          />
        </div>

        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
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

      {/* Payments Table — no Load More, 5000 item limit loads everything */}
      <PaymentTable
        payments={allPayments}
        isLoading={isLoading}
        onViewDetails={handleViewDetails}
      />

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