"use client"

import { useState, useMemo, useEffect } from "react"
import { usePaginatedQuery, useQuery, useMutation } from "convex/react"
import { useDebounce } from "use-debounce"
import { api } from "@jordan6699/washlab-backend/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  MapPin,
  Download,
  Award,
  ArrowUpDown,
} from "lucide-react"
import { CustomerTableRow } from "./CustomerTableRow"
import { CustomersSkeleton } from "@/components/loaders/CustomersSkeleton"
import { CustomersTableSkeleton } from "@/components/loaders/CustomersTableSkeleton"
import { CustomersStatsSkeleton } from "@/components/loaders/CustomersStatsSkeleton"
import { Id } from "@jordan6699/washlab-backend/dataModel"

const BRANCH_COLORS = [
  "bg-orange-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-yellow-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-violet-500",
]

type SortOption = "default" | "points_desc" | "points_asc" | "orders_desc" | "spent_desc"

function downloadCSV(rows: (string | number | null | undefined)[][], filename: string) {
  const csv = rows
    .map((r) => r.map((cell) => '"' + String(cell ?? "").replace(/"/g, '""') + '"').join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const AdminCustomers = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("default")
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: Id<"users">
    name: string
    currentStatus: string
    newStatus: "active" | "blocked" | "suspended" | "restricted" | null
  } | null>(null)
  const [statusNote, setStatusNote] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  const customerStats = useQuery(api.admin.getCustomerStats, {
    branchId: branchFilter === "all" ? undefined : branchFilter as any,
  } as any)

  const branches = useQuery(api.branches.getActive, {}) ?? []

  // ── Fetch ALL loyalty points, auto-paginate until complete ────────────────
  const {
    results: loyaltyPages,
    status: loyaltyStatus,
    loadMore: loadMoreLoyalty,
  } = usePaginatedQuery(
    (api as any).loyalty.getAllLoyaltyPoints,
    { searchQuery: undefined },
    { initialNumItems: 500 }
  )

  // Keep fetching until the entire loyalty table is in memory
  useEffect(() => {
    if (loyaltyStatus === "CanLoadMore") loadMoreLoyalty(500)
  }, [loyaltyStatus, loadMoreLoyalty])

  // Build map: customerId → current points balance
  const loyaltyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const lp of loyaltyPages ?? []) {
      if (lp.customerId) map.set(lp.customerId as string, lp.points ?? 0)
    }
    return map
  }, [loyaltyPages])

  // ── Export query (unpaginated) ─────────────────────────────────────────────
  const allCustomersForExport = useQuery(
    (api.admin as any).getAllCustomersForExport,
    {
      search: debouncedSearchQuery || undefined,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as "active" | "blocked" | "suspended" | "restricted"),
      isRegistered:
        typeFilter === "registered"
          ? true
          : typeFilter === "walkin"
            ? false
            : undefined,
      branchId: branchFilter === "all" ? undefined : branchFilter as any,
    }
  )

  // ── Paginated customers table ──────────────────────────────────────────────
  const {
    results: customersPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    (api.admin.getCustomers as any),
    {
      search: debouncedSearchQuery || undefined,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as "active" | "blocked" | "suspended" | "restricted"),
      isRegistered:
        typeFilter === "registered"
          ? true
          : typeFilter === "walkin"
            ? false
            : undefined,
      branchId: branchFilter === "all" ? undefined : branchFilter as any,
    },
    { initialNumItems: 20 }
  )

  const rawCustomers = customersPages?.flat() || []
  const hasMore = paginationStatus === "CanLoadMore"
  const isLoadingMore = paginationStatus === "LoadingMore"

  // ── Sort customers client-side using loyalty map ───────────────────────────
  const customers = useMemo(() => {
    if (sortBy === "default") return rawCustomers
    return [...rawCustomers].sort((a, b) => {
      if (sortBy === "points_desc")
        return (loyaltyMap.get(b._id as string) ?? 0) - (loyaltyMap.get(a._id as string) ?? 0)
      if (sortBy === "points_asc")
        return (loyaltyMap.get(a._id as string) ?? 0) - (loyaltyMap.get(b._id as string) ?? 0)
      if (sortBy === "orders_desc")
        return (b.orderCount ?? 0) - (a.orderCount ?? 0)
      if (sortBy === "spent_desc")
        return (b.totalSpent ?? 0) - (a.totalSpent ?? 0)
      return 0
    })
  }, [rawCustomers, sortBy, loyaltyMap])

  // ── Top 3 loyalty holders from loaded customers ────────────────────────────
  const topLoyaltyCustomers = useMemo(() => {
    return [...rawCustomers]
      .map((c) => ({ ...c, pts: loyaltyMap.get(c._id as string) ?? 0 }))
      .filter((c) => c.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3)
  }, [rawCustomers, loyaltyMap])

  const changeCustomerStatus = useMutation(api.admin.changeCustomerStatus)
  const deleteCustomer = useMutation(api.admin.deleteCustomer)

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    const data: any[] = allCustomersForExport ?? []
    if (data.length === 0) {
      toast.error("No customers to export — data may still be loading")
      return
    }

    setIsExporting(true)
    try {
      const customerHeaders = [
        "Name", "Phone", "Email", "Type", "Status",
        "Branch", "Orders", "Total Spent (GHS)", "Loyalty Points", "Joined",
      ]
      const customerRows = data.map((c: any) => [
        c.name ?? "",
        c.phoneNumber ?? "",
        c.email ?? "",
        c.isRegistered ? "Online" : "Walk-in",
        c.status ?? "active",
        c.branchName ?? "",
        c.orderCount ?? 0,
        (c.totalSpent ?? 0).toFixed(2),
        loyaltyMap.get(c._id as string) ?? 0,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "",
      ])
      downloadCSV(
        [customerHeaders, ...customerRows],
        `customers-${new Date().toISOString().split("T")[0]}.csv`
      )

      const branchSummaryMap = new Map<string, {
        name: string; customers: number; orders: number; revenue: number
      }>()
      for (const c of data) {
        const key = (c.branchName as string) || "Unknown / No Branch"
        if (!branchSummaryMap.has(key))
          branchSummaryMap.set(key, { name: key, customers: 0, orders: 0, revenue: 0 })
        const b = branchSummaryMap.get(key)!
        b.customers += 1
        b.orders += (c.orderCount as number) ?? 0
        b.revenue += (c.totalSpent as number) ?? 0
      }

      const branchCounts: any[] = (customerStats as any)?.branchCustomerCounts ?? []
      for (const bc of branchCounts) {
        if (!branchSummaryMap.has(bc.branchName))
          branchSummaryMap.set(bc.branchName, { name: bc.branchName, customers: 0, orders: 0, revenue: 0 })
      }

      const branchHeaders = [
        "Branch", "Customers", "Total Orders", "Total Revenue (GHS)",
        "Avg Spend per Customer (GHS)", "Avg Orders per Customer",
      ]
      const branchRows = Array.from(branchSummaryMap.values())
        .sort((a, b) => b.orders - a.orders)
        .map((b) => [
          b.name, b.customers, b.orders, b.revenue.toFixed(2),
          b.customers > 0 ? (b.revenue / b.customers).toFixed(2) : "0.00",
          b.customers > 0 ? (b.orders / b.customers).toFixed(1) : "0",
        ])

      downloadCSV(
        [branchHeaders, ...branchRows],
        `branch-orders-summary-${new Date().toISOString().split("T")[0]}.csv`
      )

      toast.success(`Exported ${data.length} customers + branch summary (2 files)`)
    } catch {
      toast.error("Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedCustomer || !selectedCustomer.newStatus) return
    if (!statusNote.trim() || statusNote.trim().length < 3) {
      toast.error("Please provide a note (at least 3 characters)")
      return
    }
    try {
      await changeCustomerStatus({
        customerId: selectedCustomer.id,
        status: selectedCustomer.newStatus,
        note: statusNote.trim(),
      })
      toast.success(`${selectedCustomer.name} status changed to ${selectedCustomer.newStatus}`)
      setStatusChangeDialogOpen(false)
      setSelectedCustomer(null)
      setStatusNote("")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(errorMessage || "Failed to change customer status")
    }
  }

  const openStatusDialog = (
    customerId: Id<"users"> | string,
    customerName: string,
    currentStatus: string,
    newStatus: "active" | "blocked" | "suspended" | "restricted"
  ) => {
    setSelectedCustomer({ id: customerId as Id<"users">, name: customerName, currentStatus, newStatus })
    setStatusNote("")
    setStatusChangeDialogOpen(true)
  }

  const handleDelete = async (customerId: Id<"users"> | string, customerName: string) => {
    try {
      await deleteCustomer({ customerId: customerId as Id<"users"> })
      toast.success(`${customerName} has been deleted`)
      setSelectedCustomer(null)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(errorMessage || "Failed to delete customer")
    }
  }

  const isStatsLoading = customerStats === undefined
  const isTableLoading = paginationStatus === "LoadingFirstPage"
  const isExportDataLoading = allCustomersForExport === undefined

  if (isStatsLoading && isTableLoading) {
    return <CustomersSkeleton />
  }

  const branchCounts = (customerStats as any)?.branchCustomerCounts ?? []
  const exportCount = allCustomersForExport?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage and view all customer accounts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={isExporting || isExportDataLoading || exportCount === 0}
          className="gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          {isExporting
            ? "Exporting..."
            : isExportDataLoading
              ? "Loading..."
              : `Export CSV${exportCount > 0 ? ` (${exportCount})` : ""}`}
        </Button>
      </div>

      {/* Stats Grid */}
      {isStatsLoading ? (
        <CustomersStatsSkeleton />
      ) : customerStats ? (
        <div className="mb-8 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              onClick={() => setBranchFilter("all")}
              className={`col-span-2 sm:col-span-1 bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 border shadow-sm cursor-pointer transition-all hover:shadow-md hover:brightness-105 ${branchFilter === "all" ? "ring-2 ring-primary ring-offset-2" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/80">Total Customers</p>
                  <p className="text-2xl font-bold text-primary-foreground">{customerStats.totalCustomers}</p>
                  {branchFilter === "all" && (
                    <p className="text-xs text-primary-foreground/70 font-medium mt-0.5">All branches</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-green-500 p-3 rounded-lg">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Online Users</p>
                  <p className="text-2xl font-bold text-foreground">{customerStats.registeredCustomers}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <UserX className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Walk-in Users</p>
                  <p className="text-2xl font-bold text-foreground">{customerStats.walkInCustomers}</p>
                </div>
              </div>
            </div>
          </div>

          {branchCounts.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {branchCounts.map((b: any, i: number) => {
                const isActive = branchFilter === b.branchId
                return (
                  <div
                    key={b.branchId}
                    onClick={() => setBranchFilter(isActive ? "all" : b.branchId)}
                    className={`bg-card rounded-xl p-4 border shadow-sm cursor-pointer transition-all hover:shadow-md ${isActive ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${BRANCH_COLORS[i % BRANCH_COLORS.length]} p-2.5 rounded-lg shrink-0`}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{b.branchName}</p>
                        <p className="text-xl font-bold text-foreground">{b.customerCount}</p>
                        {isActive && <p className="text-xs text-primary font-medium">Filtering</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Top Loyalty Customers callout */}
          {topLoyaltyCustomers.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm font-semibold text-foreground">Top Loyalty Customers</p>
                <button
                  onClick={() => setSortBy("points_desc")}
                  className="ml-auto text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                >
                  Sort by points ↓
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {topLoyaltyCustomers.map((c, i) => (
                  <div
                    key={c._id as string}
                    className="flex items-center gap-1.5 bg-white dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5"
                  >
                    <span className="text-base">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{c.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Filters, Search, Sort */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="registered">Online Users</SelectItem>
            <SelectItem value="walkin">Walk-in Users</SelectItem>
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((branch: any) => (
              <SelectItem key={branch._id} value={branch._id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default order</SelectItem>
            <SelectItem value="points_desc">🏆 Most loyalty points</SelectItem>
            <SelectItem value="points_asc">Fewest loyalty points</SelectItem>
            <SelectItem value="orders_desc">Most orders</SelectItem>
            <SelectItem value="spent_desc">Highest spend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {branchFilter !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {branches.find((b: any) => b._id === branchFilter)?.name
              ?? branchCounts.find((b: any) => b.branchId === branchFilter)?.branchName
              ?? "Branch"}
          </Badge>
          <button
            onClick={() => setBranchFilter("all")}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Customer Status</DialogTitle>
            <DialogDescription>
              Change status for {selectedCustomer?.name}. A note is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Status</Label>
              <div className="mt-1">
                {selectedCustomer && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {selectedCustomer.currentStatus.charAt(0).toUpperCase() +
                      selectedCustomer.currentStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label>New Status</Label>
              <div className="mt-1">
                {selectedCustomer?.newStatus && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {selectedCustomer.newStatus.charAt(0).toUpperCase() +
                      selectedCustomer.newStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="statusNote">
                Note <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="statusNote"
                placeholder="Enter a note explaining why you're changing this customer's status (minimum 3 characters)..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="mt-1 min-h-[100px]"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This note will be recorded in the audit log and visible to other admins.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusChangeDialogOpen(false)
                setSelectedCustomer(null)
                setStatusNote("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={!statusNote.trim() || statusNote.trim().length < 3}
            >
              Change Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customers Table */}
      {isTableLoading ? (
        <CustomersTableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      Points
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <CustomerTableRow
                      key={customer._id}
                      customer={customer}
                      loyaltyPoints={loyaltyMap.get(customer._id as string) ?? 0}
                      onStatusChange={openStatusDialog}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {branchFilter !== "all"
                          ? "No customers found for this branch"
                          : "No customers found"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!isTableLoading && hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => loadMore(20)}
            disabled={isLoadingMore}
            variant="outline"
            className="min-w-[150px]"
          >
            {isLoadingMore ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <Users className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {!isTableLoading && !hasMore && customers.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Showing {customers.length} of {exportCount} total customers
          </p>
        </div>
      )}
    </div>
  )
}

export default AdminCustomers