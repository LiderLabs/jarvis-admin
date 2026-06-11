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
  // Default to most orders
  const [sortBy, setSortBy] = useState<SortOption>("orders_desc")
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: Id<"users">
    name: string
    currentStatus: string
    newStatus: "active" | "blocked" | "suspended" | "restricted" | null
  } | null>(null)
  const [statusNote, setStatusNote] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  // Profile dialog state
  const [profileCustomer, setProfileCustomer] = useState<any | null>(null)

  const customerStats = useQuery(api.admin.getCustomerStats, {
    branchId: branchFilter === "all" ? undefined : branchFilter as any,
  } as any)

  const branches = useQuery(api.branches.getActive, {}) ?? []

  // Fetch ALL loyalty points
  const {
    results: loyaltyPages,
    status: loyaltyStatus,
    loadMore: loadMoreLoyalty,
  } = usePaginatedQuery(
    (api as any).loyalty.getAllLoyaltyPoints,
    { searchQuery: undefined },
    { initialNumItems: 500 }
  )
  useEffect(() => {
    if (loyaltyStatus === "CanLoadMore") loadMoreLoyalty(500)
  }, [loyaltyStatus, loadMoreLoyalty])

  const loyaltyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const lp of loyaltyPages ?? []) {
      if (lp.customerId) map.set(lp.customerId as string, lp.points ?? 0)
    }
    return map
  }, [loyaltyPages])

  // Export query
  const allCustomersForExport = useQuery(
    (api.admin as any).getAllCustomersForExport,
    {
      search: debouncedSearchQuery || undefined,
      status: statusFilter === "all" ? undefined : (statusFilter as any),
      isRegistered: typeFilter === "registered" ? true : typeFilter === "walkin" ? false : undefined,
      branchId: branchFilter === "all" ? undefined : branchFilter as any,
    }
  )

  // Paginated table — load 100 at a time to reduce reload flicker
  const {
    results: customersPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    (api.admin.getCustomers as any),
    {
      search: debouncedSearchQuery || undefined,
      status: statusFilter === "all" ? undefined : (statusFilter as any),
      isRegistered: typeFilter === "registered" ? true : typeFilter === "walkin" ? false : undefined,
      branchId: branchFilter === "all" ? undefined : branchFilter as any,
    },
    { initialNumItems: 100 }  // increased from 20 to reduce re-load frequency
  )

  const rawCustomers = customersPages?.flat() || []
  const hasMore = paginationStatus === "CanLoadMore"
  const isLoadingMore = paginationStatus === "LoadingMore"

  const customers = useMemo(() => {
    const list = sortBy === "default" ? rawCustomers : [...rawCustomers].sort((a, b) => {
      if (sortBy === "points_desc") return (loyaltyMap.get(b._id as string) ?? 0) - (loyaltyMap.get(a._id as string) ?? 0)
      if (sortBy === "points_asc") return (loyaltyMap.get(a._id as string) ?? 0) - (loyaltyMap.get(b._id as string) ?? 0)
      if (sortBy === "orders_desc") return (b.orderCount ?? 0) - (a.orderCount ?? 0)
      if (sortBy === "spent_desc") return (b.totalSpent ?? 0) - (a.totalSpent ?? 0)
      return 0
    })
    return list
  }, [rawCustomers, sortBy, loyaltyMap])

  const topLoyaltyCustomers = useMemo(() => {
    return [...rawCustomers]
      .map((c) => ({ ...c, pts: loyaltyMap.get(c._id as string) ?? 0 }))
      .filter((c) => c.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3)
  }, [rawCustomers, loyaltyMap])

  const changeCustomerStatus = useMutation(api.admin.changeCustomerStatus)
  const deleteCustomer = useMutation(api.admin.deleteCustomer)

  const handleExportCSV = async () => {
    const data: any[] = allCustomersForExport ?? []
    if (data.length === 0) { toast.error("No customers to export — data may still be loading"); return }
    setIsExporting(true)
    try {
      const customerHeaders = ["Name", "Phone", "Email", "Type", "Status", "Branch", "Orders", "Total Spent (GHS)", "Loyalty Points", "Joined"]
      const customerRows = data.map((c: any) => [
        c.name ?? "", c.phoneNumber ?? "", c.email ?? "",
        c.isRegistered ? "Online" : "Walk-in", c.status ?? "active",
        c.branchName ?? "", c.orderCount ?? 0,
        (c.totalSpent ?? 0).toFixed(2),
        loyaltyMap.get(c._id as string) ?? 0,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "",
      ])
      downloadCSV([customerHeaders, ...customerRows], `customers-${new Date().toISOString().split("T")[0]}.csv`)
      toast.success(`Exported ${data.length} customers`)
    } catch { toast.error("Export failed") } finally { setIsExporting(false) }
  }

  const handleStatusChange = async () => {
    if (!selectedCustomer || !selectedCustomer.newStatus) return
    if (!statusNote.trim() || statusNote.trim().length < 3) { toast.error("Please provide a note (at least 3 characters)"); return }
    try {
      await changeCustomerStatus({ customerId: selectedCustomer.id, status: selectedCustomer.newStatus, note: statusNote.trim() })
      toast.success(`${selectedCustomer.name} status changed to ${selectedCustomer.newStatus}`)
      setStatusChangeDialogOpen(false); setSelectedCustomer(null); setStatusNote("")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to change customer status")
    }
  }

  const openStatusDialog = (
    customerId: Id<"users"> | string, customerName: string,
    currentStatus: string, newStatus: "active" | "blocked" | "suspended" | "restricted"
  ) => {
    setSelectedCustomer({ id: customerId as Id<"users">, name: customerName, currentStatus, newStatus })
    setStatusNote(""); setStatusChangeDialogOpen(true)
  }

  const handleDelete = async (customerId: Id<"users"> | string, customerName: string) => {
    try {
      await deleteCustomer({ customerId: customerId as Id<"users"> })
      toast.success(`${customerName} has been deleted`)
      setSelectedCustomer(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete customer")
    }
  }

  const handleViewProfile = (customer: any) => setProfileCustomer(customer)

  const isStatsLoading = customerStats === undefined
  const isTableLoading = paginationStatus === "LoadingFirstPage"
  const isExportDataLoading = allCustomersForExport === undefined

  if (isStatsLoading && isTableLoading) return <CustomersSkeleton />

  const branchCounts = (customerStats as any)?.branchCustomerCounts ?? []
  const exportCount = allCustomersForExport?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage and view all customer accounts</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}
          disabled={isExporting || isExportDataLoading || exportCount === 0}
          className="gap-2 self-start sm:self-auto">
          <Download className="w-4 h-4" />
          {isExporting ? "Exporting..." : isExportDataLoading ? "Loading..." : `Export CSV${exportCount > 0 ? ` (${exportCount})` : ""}`}
        </Button>
      </div>

      {/* Stats Grid */}
      {isStatsLoading ? <CustomersStatsSkeleton /> : customerStats ? (
        <div className="mb-8 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div onClick={() => setBranchFilter("all")}
              className={`col-span-2 sm:col-span-1 bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 border shadow-sm cursor-pointer transition-all hover:shadow-md hover:brightness-105 ${branchFilter === "all" ? "ring-2 ring-primary ring-offset-2" : ""}`}>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-lg"><Users className="w-6 h-6 text-white" /></div>
                <div>
                  <p className="text-sm text-primary-foreground/80">Total Customers</p>
                  <p className="text-2xl font-bold text-primary-foreground">{customerStats.totalCustomers}</p>
                  {branchFilter === "all" && <p className="text-xs text-primary-foreground/70 font-medium mt-0.5">All branches</p>}
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-green-500 p-3 rounded-lg"><UserCheck className="w-6 h-6 text-white" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Online Users</p>
                  <p className="text-2xl font-bold text-foreground">{customerStats.registeredCustomers}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500 p-3 rounded-lg"><UserX className="w-6 h-6 text-white" /></div>
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
                  <div key={b.branchId} onClick={() => setBranchFilter(isActive ? "all" : b.branchId)}
                    className={`bg-card rounded-xl p-4 border shadow-sm cursor-pointer transition-all hover:shadow-md ${isActive ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary"}`}>
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

          {/* Top Loyalty — no "Sort by points" button */}
          {topLoyaltyCustomers.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm font-semibold text-foreground">Top Loyalty Customers</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {topLoyaltyCustomers.map((c, i) => (
                  <div key={c._id as string}
                    className="flex items-center gap-1.5 bg-white dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5">
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

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search by name or phone number..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" />
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
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="registered">Online Users</SelectItem>
            <SelectItem value="walkin">Walk-in Users</SelectItem>
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <MapPin className="w-4 h-4 mr-2" /><SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((branch: any) => (
              <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="orders_desc">Most orders</SelectItem>
            <SelectItem value="spent_desc">Highest spend</SelectItem>
            <SelectItem value="points_desc">🏆 Most loyalty points</SelectItem>
            <SelectItem value="points_asc">Fewest loyalty points</SelectItem>
            <SelectItem value="default">Default order</SelectItem>
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
          <button onClick={() => setBranchFilter("all")} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
        </div>
      )}

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Customer Status</DialogTitle>
            <DialogDescription>Change status for {selectedCustomer?.name}. A note is required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Status</Label>
              <div className="mt-1">
                {selectedCustomer && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {selectedCustomer.currentStatus.charAt(0).toUpperCase() + selectedCustomer.currentStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label>New Status</Label>
              <div className="mt-1">
                {selectedCustomer?.newStatus && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {selectedCustomer.newStatus.charAt(0).toUpperCase() + selectedCustomer.newStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="statusNote">Note <span className="text-destructive">*</span></Label>
              <Textarea id="statusNote" placeholder="Explain why you're changing this status (minimum 3 characters)..."
                value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className="mt-1 min-h-[100px]" required />
              <p className="text-xs text-muted-foreground mt-1">Recorded in the audit log and visible to other admins.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStatusChangeDialogOpen(false); setSelectedCustomer(null); setStatusNote("") }}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={!statusNote.trim() || statusNote.trim().length < 3}>Change Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Profile Dialog */}
      <Dialog open={!!profileCustomer} onOpenChange={(open) => !open && setProfileCustomer(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Profile</DialogTitle>
            <DialogDescription>{profileCustomer?.name}</DialogDescription>
          </DialogHeader>
          {profileCustomer && (
            <div className="space-y-4 py-2">
              {/* Identity */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Identity</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Name</span><span className="font-medium">{profileCustomer.name}</span>
                  <span className="text-muted-foreground">Phone</span><span className="font-medium">{profileCustomer.phoneNumber}</span>
                  {profileCustomer.email && <><span className="text-muted-foreground">Email</span><span className="font-medium break-all">{profileCustomer.email}</span></>}
                  <span className="text-muted-foreground">Type</span>
                  <span><Badge variant={profileCustomer.isRegistered ? "default" : "secondary"}>{profileCustomer.isRegistered ? "Online" : "Walk-in"}</Badge></span>
                  <span className="text-muted-foreground">Status</span>
                  <span><Badge variant="outline">{profileCustomer.status || "active"}</Badge></span>
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium">{profileCustomer.createdAt ? new Date(profileCustomer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                </div>
              </div>

              {/* Branch */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Branch</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Primary branch</span>
                  <span className="font-medium">{(profileCustomer as any).branchName || "—"}</span>
                  {(profileCustomer as any).allBranches && (profileCustomer as any).allBranches !== (profileCustomer as any).branchName && (
                    <><span className="text-muted-foreground">All branches</span><span className="font-medium">{(profileCustomer as any).allBranches}</span></>
                  )}
                </div>
              </div>

              {/* Order analytics */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Order Analytics</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Total orders</span>
                  <span className="font-medium">{profileCustomer.orderCount ?? 0}</span>
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{profileCustomer.completedOrderCount ?? 0}</span>
                  <span className="text-muted-foreground">Total spent</span>
                  <span className="font-medium text-primary">₵{(profileCustomer.totalSpent ?? 0).toFixed(2)}</span>
                  <span className="text-muted-foreground">Avg per order</span>
                  <span className="font-medium">
                    {profileCustomer.orderCount > 0
                      ? `₵${((profileCustomer.totalSpent ?? 0) / profileCustomer.orderCount).toFixed(2)}`
                      : "—"}
                  </span>
                  <span className="text-muted-foreground">Last order</span>
                  <span className="font-medium">
                    {profileCustomer.lastOrderDate
                      ? new Date(profileCustomer.lastOrderDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                  {profileCustomer.lastOrderNumber && (
                    <><span className="text-muted-foreground">Last order #</span><span className="font-mono text-xs">{profileCustomer.lastOrderNumber}</span></>
                  )}
                </div>
              </div>

              {/* Loyalty */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Loyalty</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Points balance</span>
                  <span className="font-bold text-amber-600">{loyaltyMap.get(profileCustomer._id as string) ?? 0} pts</span>
                  <span className="text-muted-foreground">Free washes earned</span>
                  <span className="font-medium">{Math.floor((loyaltyMap.get(profileCustomer._id as string) ?? 0) / 10)}</span>
                </div>
              </div>

              {/* Status note */}
              {profileCustomer.statusNote && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Status Note</p>
                  <p className="text-sm">{profileCustomer.statusNote}</p>
                  {profileCustomer.statusChangedAt && (
                    <p className="text-xs text-muted-foreground mt-1">{new Date(profileCustomer.statusChangedAt).toLocaleDateString("en-GB")}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileCustomer(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {isTableLoading ? <CustomersTableSkeleton /> : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />Points
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
                      onViewProfile={handleViewProfile}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {branchFilter !== "all" ? "No customers found for this branch" : "No customers found"}
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
          <Button onClick={() => loadMore(100)} disabled={isLoadingMore} variant="outline" className="min-w-[150px]">
            {isLoadingMore ? (
              <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Loading...</>
            ) : (
              <>Load More <Users className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}

      {!isTableLoading && !hasMore && customers.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">Showing all {customers.length} customers</p>
        </div>
      )}
    </div>
  )
}

export default AdminCustomers
