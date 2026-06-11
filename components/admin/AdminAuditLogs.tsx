"use client"

import { useState } from "react"
import { usePaginatedQuery } from "convex/react"
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
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { format } from "date-fns"
import { Doc } from "@jordan6699/washlab-backend/dataModel"
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  Building2,
  Activity,
  Clock,
  ChevronDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const AUDIT_LOG_LIMIT = 50

const AdminAuditLogs = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500)
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all")
  const [actorTypeFilter, setActorTypeFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<Doc<"auditLogs"> | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: null,
    end: null,
  })

  // Get audit logs with pagination and filters
  const {
    results: logsPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.audit.getAll,
    {
      entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
      actorType:
        actorTypeFilter !== "all"
          ? (actorTypeFilter as "customer" | "attendant" | "admin")
          : undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      startTimestamp: dateRange.start ? dateRange.start.getTime() : undefined,
      endTimestamp: dateRange.end
        ? dateRange.end.getTime() + 86400000 - 1
        : undefined, // End of day
    },
    { initialNumItems: AUDIT_LOG_LIMIT }
  )

  // Flatten all pages into a single array
  const logs = logsPages?.flat() || []

  // Filter by search query (client-side for action/actorId)
  const filteredLogs = logs.filter((log) => {
    if (!debouncedSearchQuery) return true
    const search = debouncedSearchQuery.toLowerCase()
    return (
      log.action?.toLowerCase().includes(search) ||
      log.actorId?.toLowerCase().includes(search) ||
      log.entityId?.toLowerCase().includes(search) ||
      log.entityType?.toLowerCase().includes(search)
    )
  })

  // Check if there are more items to load
  const hasMore = paginationStatus === "CanLoadMore"

  const handleViewDetails = (log: Doc<"auditLogs">) => {
    setSelectedLog(log)
    setDetailsDialogOpen(true)
  }

  const getActionBadgeVariant = (action: string) => {
    if (action?.includes("create") || action?.includes("add")) return "default"
    if (action?.includes("update") || action?.includes("change"))
      return "secondary"
    if (action?.includes("delete") || action?.includes("remove"))
      return "destructive"
    if (action?.includes("payment") || action?.includes("complete"))
      return "default"
    return "outline"
  }

  const getActorTypeBadgeVariant = (actorType: string) => {
    switch (actorType) {
      case "admin":
        return "destructive"
      case "attendant":
        return "secondary"
      case "customer":
        return "default"
      default:
        return "outline"
    }
  }

  const getEntityTypeIcon = (entityType: string) => {
    switch (entityType?.toLowerCase()) {
      case "order":
        return "📦"
      case "payment":
        return "💳"
      case "customer":
      case "user":
        return "👤"
      case "attendant":
        return "👨‍💼"
      case "branch":
        return "🏢"
      default:
        return "📄"
    }
  }

  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Timestamp",
      "Actor Type",
      "Actor ID",
      "Action",
      "Entity Type",
      "Entity ID",
      "Details",
    ]
    const rows = filteredLogs.map((log) => [
      format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      log.actorType || "",
      log.actorId || "",
      log.action || "",
      log.entityType || "",
      log.entityId || "",
      log.details || "",
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setEntityTypeFilter("all")
    setActorTypeFilter("all")
    setActionFilter("all")
    setDateRange({ start: null, end: null })
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Audit Logs</h1>
          <p className='text-muted-foreground mt-1'>
            Track and monitor all system activities and changes
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={handleExport} className='gap-2'>
            <Download className='h-4 w-4' />
            Export CSV
          </Button>
          <Button variant='outline' onClick={clearFilters} className='gap-2'>
            <RefreshCw className='h-4 w-4' />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Logs</CardTitle>
            <FileText className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{filteredLogs.length}</div>
            <p className='text-xs text-muted-foreground'>All audit entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Admin Actions</CardTitle>
            <User className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {filteredLogs.filter((log) => log.actorType === "admin").length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Administrator activities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Attendant Actions
            </CardTitle>
            <Building2 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {
                filteredLogs.filter((log) => log.actorType === "attendant")
                  .length
              }
            </div>
            <p className='text-xs text-muted-foreground'>Staff activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Customer Actions
            </CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {
                filteredLogs.filter((log) => log.actorType === "customer")
                  .length
              }
            </div>
            <p className='text-xs text-muted-foreground'>Customer activities</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Filter className='h-5 w-5' />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Search</label>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search logs...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Entity Type</label>
              <Select
                value={entityTypeFilter}
                onValueChange={setEntityTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder='All entities' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Entities</SelectItem>
                  <SelectItem value='order'>Orders</SelectItem>
                  <SelectItem value='payment'>Payments</SelectItem>
                  <SelectItem value='customer'>Customers</SelectItem>
                  <SelectItem value='attendant'>Attendants</SelectItem>
                  <SelectItem value='branch'>Branches</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Actor Type</label>
              <Select
                value={actorTypeFilter}
                onValueChange={setActorTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder='All actors' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Actors</SelectItem>
                  <SelectItem value='admin'>Admin</SelectItem>
                  <SelectItem value='attendant'>Attendant</SelectItem>
                  <SelectItem value='customer'>Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='All actions' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Actions</SelectItem>
                  <SelectItem value='create'>Create</SelectItem>
                  <SelectItem value='update'>Update</SelectItem>
                  <SelectItem value='delete'>Delete</SelectItem>
                  <SelectItem value='payment'>Payment</SelectItem>
                  <SelectItem value='status'>Status Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2 sm:col-span-2 lg:col-span-1 xl:col-span-1'>
              <label className='text-sm font-medium'>Date Range</label>
              <div className='flex flex-col sm:flex-row gap-2'>
                <Input
                  type='date'
                  value={
                    dateRange.start ? format(dateRange.start, "yyyy-MM-dd") : ""
                  }
                  onChange={(e) =>
                    setDateRange({
                      ...dateRange,
                      start: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  className='flex-1 min-w-0'
                />
                <Input
                  type='date'
                  value={
                    dateRange.end ? format(dateRange.end, "yyyy-MM-dd") : ""
                  }
                  onChange={(e) =>
                    setDateRange({
                      ...dateRange,
                      end: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  className='flex-1 min-w-0'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Entries</CardTitle>
          <CardDescription>
            {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}{" "}
            found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <FileText className='h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>
                No audit logs found
              </h3>
              <p className='text-sm text-muted-foreground'>
                {searchQuery ||
                entityTypeFilter !== "all" ||
                actorTypeFilter !== "all"
                  ? "Try adjusting your filters to see more results"
                  : "No audit logs have been recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[180px]'>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className='text-right'>Options</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log._id} className='hover:bg-muted/50'>
                        <TableCell className='font-medium'>
                          <div className='flex flex-col gap-1'>
                            <span className='text-sm'>
                              {format(new Date(log.timestamp), "MMM dd, yyyy")}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {format(new Date(log.timestamp), "HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant={getActorTypeBadgeVariant(
                                  log.actorType
                                )}
                              >
                                {log.actorType}
                              </Badge>
                              <span className='text-xs text-muted-foreground'>
                                {log.actorRole}
                              </span>
                            </div>
                            <span className='text-xs font-mono text-muted-foreground truncate max-w-[200px]'>
                              {log.actorId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <span className='text-lg'>
                              {getEntityTypeIcon(log.entityType)}
                            </span>
                            <div className='flex flex-col'>
                              <span className='text-sm font-medium'>
                                {log.entityType}
                              </span>
                              {log.entityId && (
                                <span className='text-xs text-muted-foreground font-mono truncate max-w-[150px]'>
                                  {log.entityId}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='max-w-[300px]'>
                            {log.details ? (
                              <p className='text-sm text-muted-foreground truncate'>
                                {log.details.length > 50
                                  ? `${log.details.substring(0, 50)}...`
                                  : log.details}
                              </p>
                            ) : (
                              <span className='text-xs text-muted-foreground'>
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleViewDetails(log)}
                            className='gap-2'
                          >
                            View Details
                            <ChevronDown className='h-4 w-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className='flex justify-center mt-4'>
                  <Button
                    onClick={() => loadMore(50)}
                    variant='outline'
                    className='gap-2'
                  >
                    <RefreshCw className='h-4 w-4' />
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className='max-w-2xl max-h-[80vh]'>
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className='max-h-[60vh] pr-4'>
              <div className='space-y-4'>
                {/* Basic Info */}
                <div className='space-y-2'>
                  <h4 className='font-semibold text-sm flex items-center gap-2'>
                    <Clock className='h-4 w-4' />
                    Timestamp
                  </h4>
                  <p className='text-sm text-muted-foreground'>
                    {format(new Date(selectedLog.timestamp), "PPpp")}
                  </p>
                </div>

                <Separator />

                {/* Actor Info */}
                <div className='space-y-2'>
                  <h4 className='font-semibold text-sm flex items-center gap-2'>
                    <User className='h-4 w-4' />
                    Actor Information
                  </h4>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-xs text-muted-foreground mb-1'>Type</p>
                      <Badge
                        variant={getActorTypeBadgeVariant(
                          selectedLog.actorType
                        )}
                      >
                        {selectedLog.actorType}
                      </Badge>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground mb-1'>Role</p>
                      <p className='text-sm'>{selectedLog.actorRole}</p>
                    </div>
                    <div className='col-span-2'>
                      <p className='text-xs text-muted-foreground mb-1'>
                        Actor ID
                      </p>
                      <p className='text-sm font-mono break-all'>
                        {selectedLog.actorId}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Action Info */}
                <div className='space-y-2'>
                  <h4 className='font-semibold text-sm flex items-center gap-2'>
                    <Activity className='h-4 w-4' />
                    Action
                  </h4>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>

                <Separator />

                {/* Entity Info */}
                <div className='space-y-2'>
                  <h4 className='font-semibold text-sm flex items-center gap-2'>
                    <FileText className='h-4 w-4' />
                    Entity Information
                  </h4>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-xs text-muted-foreground mb-1'>Type</p>
                      <div className='flex items-center gap-2'>
                        <span className='text-lg'>
                          {getEntityTypeIcon(selectedLog.entityType)}
                        </span>
                        <p className='text-sm'>{selectedLog.entityType}</p>
                      </div>
                    </div>
                    {selectedLog.entityId && (
                      <div>
                        <p className='text-xs text-muted-foreground mb-1'>
                          Entity ID
                        </p>
                        <p className='text-sm font-mono break-all'>
                          {selectedLog.entityId}
                        </p>
                      </div>
                    )}
                    {selectedLog.branchId && (
                      <div className='col-span-2'>
                        <p className='text-xs text-muted-foreground mb-1'>
                          Branch ID
                        </p>
                        <p className='text-sm font-mono break-all'>
                          {selectedLog.branchId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                {selectedLog.details && (
                  <>
                    <Separator />
                    <div className='space-y-2'>
                      <h4 className='font-semibold text-sm'>Details</h4>
                      <div className='bg-muted p-3 rounded-md'>
                        <pre className='text-xs whitespace-pre-wrap break-words'>
                          {typeof selectedLog.details === "string"
                            ? selectedLog.details
                            : JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}

                {/* Old/New Values */}
                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <>
                    <Separator />
                    <div className='space-y-3'>
                      <h4 className='font-semibold text-sm'>Value Changes</h4>
                      {selectedLog.oldValue && (
                        <div>
                          <p className='text-xs text-muted-foreground mb-1'>
                            Old Value
                          </p>
                          <div className='bg-destructive/10 p-3 rounded-md border border-destructive/20'>
                            <pre className='text-xs whitespace-pre-wrap break-words'>
                              {typeof selectedLog.oldValue === "string"
                                ? selectedLog.oldValue
                                : JSON.stringify(selectedLog.oldValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      {selectedLog.newValue && (
                        <div>
                          <p className='text-xs text-muted-foreground mb-1'>
                            New Value
                          </p>
                          <div className='bg-primary/10 p-3 rounded-md border border-primary/20'>
                            <pre className='text-xs whitespace-pre-wrap break-words'>
                              {typeof selectedLog.newValue === "string"
                                ? selectedLog.newValue
                                : JSON.stringify(selectedLog.newValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Device Info */}
                {selectedLog.deviceId && (
                  <>
                    <Separator />
                    <div className='space-y-2'>
                      <h4 className='font-semibold text-sm'>
                        Device Information
                      </h4>
                      <p className='text-sm font-mono break-all'>
                        {selectedLog.deviceId}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminAuditLogs
