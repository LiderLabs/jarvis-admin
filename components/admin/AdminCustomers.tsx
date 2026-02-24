"use client"

import { useState } from "react"
import { useQuery, usePaginatedQuery, useMutation } from "convex/react"
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
  Ban,
  Search,
  Filter,
  AlertTriangle,
  MapPin,
} from "lucide-react"
import { CustomerTableRow } from "./CustomerTableRow"
import { CustomersSkeleton } from "@/components/loaders/CustomersSkeleton"
import { CustomersTableSkeleton } from "@/components/loaders/CustomersTableSkeleton"
import { CustomersStatsSkeleton } from "@/components/loaders/CustomersStatsSkeleton"
import { Id } from "@jordan6699/washlab-backend/dataModel"

const AdminCustomers = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: Id<"users">
    name: string
    currentStatus: string
    newStatus: "active" | "blocked" | "suspended" | "restricted" | null
  } | null>(null)
  const [statusNote, setStatusNote] = useState("")

  // Get customer stats
  const customerStats = useQuery(api.admin.getCustomerStats)

  // Get branches for filter dropdown
  const branches = useQuery(api.branches.getActive, {}) ?? []

  // Get customers with pagination (using debounced search)
  const {
    results: customersPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.admin.getCustomers,
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

  const customers = customersPages?.flat() || []
  const hasMore = paginationStatus === "CanLoadMore"

  // Mutations
  const changeCustomerStatus = useMutation(api.admin.changeCustomerStatus)
  const deleteCustomer = useMutation(api.admin.deleteCustomer)

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
  const isLoadingMore = paginationStatus === "LoadingMore"

  if (isStatsLoading && isTableLoading) {
    return <CustomersSkeleton />
  }

  const walkInCount = customerStats ? customerStats.walkInCustomers : 0

  const stats = customerStats ? [
    {
      label: "Total Customers",
      value: customerStats.totalCustomers.toString(),
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Online Users",
      value: customerStats.registeredCustomers.toString(),
      icon: UserCheck,
      color: "bg-green-500",
    },
    {
      label: "Walk-in Users",
      value: walkInCount.toString(),
      icon: UserX,
      color: "bg-purple-500",
    },
    {
      label: "Active",
      value: customerStats.activeCustomers.toString(),
      icon: UserCheck,
      color: "bg-emerald-500",
    },
    {
      label: "Blocked",
      value: customerStats.blockedCustomers.toString(),
      icon: Ban,
      color: "bg-red-500",
    },
    {
      label: "Suspended",
      value: customerStats.suspendedCustomers.toString(),
      icon: AlertTriangle,
      color: "bg-orange-500",
    },
  ] : []

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage and view all customer accounts</p>
        </div>
      </div>

      {/* Stats Grid */}
      {isStatsLoading ? (
        <CustomersStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters and Search */}
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
        {/* Branch Filter */}
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
      </div>

      {/* Active branch filter indicator */}
      {branchFilter !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {branches.find((b: any) => b._id === branchFilter)?.name ?? "Branch"}
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
                {selectedCustomer && selectedCustomer.newStatus && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {selectedCustomer.newStatus.charAt(0).toUpperCase() + selectedCustomer.newStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="statusNote">Note <span className="text-destructive">*</span></Label>
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
              onClick={() => { setStatusChangeDialogOpen(false); setSelectedCustomer(null); setStatusNote("") }}
            >
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={!statusNote.trim() || statusNote.trim().length < 3}>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <CustomerTableRow
                      key={customer._id}
                      customer={customer}
                      onStatusChange={openStatusDialog}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
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

      {/* Load More */}
      {!isTableLoading && hasMore && (
        <div className="mt-6 flex justify-center">
          <Button onClick={() => loadMore(20)} disabled={isLoadingMore} variant="outline" className="min-w-[150px]">
            {isLoadingMore ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading...
              </>
            ) : (
              <>Load More<Users className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}

      {!isTableLoading && !hasMore && customers.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">All customers loaded ({customers.length} total)</p>
        </div>
      )}
    </div>
  )
}

export default AdminCustomers