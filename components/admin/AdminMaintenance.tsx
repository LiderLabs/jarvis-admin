'use client'

import { useState, useMemo } from "react"
import { useQuery, useMutation, useConvexAuth, usePaginatedQuery } from "convex/react"
import { api } from "@liderlabs/washlab-backend/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Wrench, CheckCircle2, Trash2, Loader2, Building2, Clock,
  Filter, Plus, Ticket, Info,
} from "lucide-react"
import { format } from "date-fns"

const QUICK_TICKET_TYPES = [
  "Not spinning", "Coin stuck", "Not rolling", "Door won't close",
  "Water leaking", "Not draining", "Noisy", "Not starting",
]

const AdminMaintenance = () => {
  const { isAuthenticated } = useConvexAuth()
  const adminId = (useQuery(api.admin.getCurrentUser) as any)?._id

  const { results: branches } = usePaginatedQuery(
    api.admin.getBranches,
    isAuthenticated ? { includeInactive: undefined } : "skip",
    { initialNumItems: 100 }
  )
  const branchList = branches ?? []

  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [statusFilter, setStatusFilter]         = useState<"all" | "open" | "fixed">("all")
  const [ticketToDelete, setTicketToDelete]     = useState<string | null>(null)

  // Open Ticket modal
  const [showAddTicket, setShowAddTicket]   = useState(false)
  const [addBranchId, setAddBranchId]       = useState("")
  const [addMachineId, setAddMachineId]     = useState("")
  const [addTicketTypes, setAddTicketTypes] = useState<string[]>([])
  const [addDescription, setAddDescription] = useState("")
  const [adding, setAdding]                 = useState(false)

  // Machines for the selected branch in the modal (active only)
  const branchMachines = useQuery(
    (api as any).branchMachines.getActiveMachines,
    addBranchId ? { branchId: addBranchId as any } : "skip"
  ) ?? []

  const allTicketsRaw = useQuery(
    (api as any).maintenanceTickets.listTickets,
    isAuthenticated ? {} : "skip"
  ) ?? []

  const tickets = useMemo(() => {
    let result = allTicketsRaw as any[]
    if (selectedBranchId !== "all") {
      result = result.filter((t: any) => t.branchId === selectedBranchId)
    }
    if (statusFilter !== "all") {
      result = result.filter((t: any) => t.status === statusFilter)
    }
    return result
  }, [allTicketsRaw, selectedBranchId, statusFilter])

  const markFixed    = useMutation((api as any).maintenanceTickets.markFixed)
  const deleteTicket = useMutation((api as any).maintenanceTickets.deleteTicket)
  const reportFault  = useMutation((api as any).maintenanceTickets.reportFault)

  const getBranchName = (branchId: string) => {
    const b = (branchList as any[]).find((b: any) => b._id === branchId)
    return b?.name ?? "Unknown Branch"
  }

  const handleMarkFixed = async (ticketId: string) => {
    if (!adminId) { toast.error("Not authenticated"); return }
    try {
      await markFixed({ ticketId: ticketId as any, adminId })
      toast.success("Ticket marked as resolved")
    } catch (e: any) { toast.error(e.message || "Failed to update") }
  }

  const handleDelete = async () => {
    if (!ticketToDelete || !adminId) return
    try {
      await deleteTicket({ ticketId: ticketToDelete as any, adminId })
      toast.success("Ticket deleted")
      setTicketToDelete(null)
    } catch (e: any) { toast.error(e.message || "Failed to delete") }
  }

  const handleAddTicket = async () => {
    if (!addBranchId)  { toast.error("Select a branch"); return }
    if (!addMachineId) { toast.error("Select a machine"); return }
    if (addTicketTypes.length === 0 && !addDescription.trim()) {
      toast.error("Select an issue type or describe the problem"); return
    }
    // Find the machine — store full name + displayName so admin sees detail
    const machine = (branchMachines as any[]).find((m: any) => m._id === addMachineId)
    setAdding(true)
    try {
      await reportFault({
        branchId:      addBranchId as any,
        machineId:     addMachineId as any,
        // machineName stores the internal full name
        machineName:   machine?.name ?? addMachineId,
        // displayName is what the attendant saw when they selected
        displayName:   machine?.displayName ?? machine?.name ?? addMachineId,
        serialNumber:  machine?.serialNumber,
        otherDetails:  machine?.otherDetails,
        faultTypes:    addTicketTypes,
        description:   addDescription.trim() || undefined,
        reportedBy:    "Admin",
      })
      toast.success("Ticket opened")
      setShowAddTicket(false)
      setAddBranchId(""); setAddMachineId(""); setAddTicketTypes([]); setAddDescription("")
    } catch (e: any) { toast.error(e.message || "Failed to open ticket") }
    setAdding(false)
  }

  const allTickets   = allTicketsRaw as any[]
  const openTickets  = allTickets.filter((t: any) => t.status === "open")
  const fixedTickets = allTickets.filter((t: any) => t.status === "fixed")

  const ticketBreakdown = QUICK_TICKET_TYPES.reduce<Record<string, number>>((acc, f) => {
    acc[f] = openTickets.filter(t => t.faultTypes?.includes(f)).length
    return acc
  }, {})
  const topTicketTypes = Object.entries(ticketBreakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div>
      {/* -- Header -- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Maintenance</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track and resolve machine tickets
          </p>
        </div>
        <Button onClick={() => setShowAddTicket(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Open Ticket
        </Button>
      </div>

      {/* -- Stat cards -- */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Tickets</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{allTickets.length}</span>
                <span className="text-xs text-muted-foreground">all time</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Open Tickets</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-red-600">{openTickets.length}</span>
                <span className="text-xs text-muted-foreground">need attention</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Resolved</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-600">{fixedTickets.length}</span>
                <span className="text-xs text-muted-foreground">
                  {allTickets.length > 0
                    ? `${Math.round((fixedTickets.length / allTickets.length) * 100)}% resolution rate`
                    : "–"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-3 px-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top Open Ticket Types</p>
            {topTicketTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-1">No open tickets — all machines running smoothly.</p>
            ) : (
              <div className="grid grid-cols-4 divide-x divide-border">
                {topTicketTypes.map(([label, count]) => (
                  <div key={label} className="flex flex-col items-center px-3 first:pl-0 last:pr-0">
                    <span className="text-3xl font-bold text-red-500">{count}</span>
                    <span className="text-xs text-muted-foreground text-center leading-tight mt-1.5">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* -- Filters -- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="branch-filter">Branch</Label>
              <select
                id="branch-filter"
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="mt-2 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Branches</option>
                {(branchList as any[]).map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-2 flex gap-2">
                {(["all", "open", "fixed"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={
                      "flex-1 py-1.5 rounded-md text-sm font-medium border transition-all " +
                      (statusFilter === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-muted-foreground/40")
                    }
                  >
                    {s === "all" ? "All" : s === "open" ? "Open" : "Resolved"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -- Ticket list -- */}
      {allTicketsRaw === undefined ? (
        <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Wrench className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="font-semibold text-lg mb-1">No tickets found</h3>
            <p className="text-sm text-center">
              {selectedBranchId !== "all" && statusFilter === "all"
                ? "No tickets for this branch."
                : statusFilter === "open"
                ? "No open tickets for the selected filters."
                : statusFilter === "fixed"
                ? "No resolved tickets for the selected filters."
                : "No tickets have been reported yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => {
            const isOpen = ticket.status === "open"
            return (
              <Card key={ticket._id} className={`transition-opacity ${isOpen ? "" : "opacity-60"}`}>
                <CardContent className="p-0">
                  <div className="flex items-start gap-4 p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isOpen ? "bg-red-100 dark:bg-red-950/40" : "bg-green-100 dark:bg-green-950/40"}`}>
                      <Wrench className={`w-5 h-5 ${isOpen ? "text-red-500" : "text-green-500"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          {/* Admin sees: full machine name prominently */}
                          <p className="font-semibold text-foreground">{ticket.machineName}</p>

                          {/* Machine detail row — serial, displayName, otherDetails */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{getBranchName(ticket.branchId)}</span>
                            </div>
                            {ticket.displayName && ticket.displayName !== ticket.machineName && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                                Attendant saw: {ticket.displayName}
                              </span>
                            )}
                            {ticket.serialNumber && (
                              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                SN: {ticket.serialNumber}
                              </span>
                            )}
                          </div>
                          {/* Brand / other details */}
                          {ticket.otherDetails && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Info className="w-3 h-3 shrink-0" />
                              {ticket.otherDetails}
                            </p>
                          )}
                        </div>

                        <Badge className={isOpen
                          ? "bg-red-100 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                          : "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                        }>
                          {isOpen ? "Open" : "Resolved"}
                        </Badge>
                      </div>

                      {/* Issue type tags */}
                      {ticket.faultTypes?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {ticket.faultTypes.map((ft: string) => (
                            <span key={ft} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/20 dark:border-red-800 rounded-full font-medium">
                              {ft}
                            </span>
                          ))}
                        </div>
                      )}

                      {ticket.description && (
                        <p className="text-sm text-muted-foreground mt-2">{ticket.description}</p>
                      )}

                      <Separator className="my-3" />

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Reported {format(new Date(ticket.reportedAt), "MMM d, yyyy 'at' h:mm a")}
                            {ticket.reportedBy && <span>· by {ticket.reportedBy}</span>}
                          </div>
                          {ticket.fixedAt && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved {format(new Date(ticket.fixedAt), "MMM d, yyyy 'at' h:mm a")}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isOpen && (
                            <Button size="sm" className="h-8 text-xs bg-green-500 hover:bg-green-600 text-white" onClick={() => handleMarkFixed(ticket._id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Resolved
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setTicketToDelete(ticket._id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* -- Open Ticket Modal -- */}
      <Dialog open={showAddTicket} onOpenChange={setShowAddTicket}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open a Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Branch</Label>
              <select
                value={addBranchId}
                onChange={e => { setAddBranchId(e.target.value); setAddMachineId("") }}
                className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select branch…</option>
                {(branchList as any[]).map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Machine dropdown — admin modal shows both display + full name */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine</Label>
              <select
                value={addMachineId}
                onChange={e => setAddMachineId(e.target.value)}
                disabled={!addBranchId}
                className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Select machine…</option>
                {(branchMachines as any[]).map((m: any) => (
                  <option key={m._id} value={m._id}>
                    {m.displayName}{m.name !== m.displayName ? ` — ${m.name}` : ""}
                    {m.serialNumber ? ` (SN: ${m.serialNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Issue Type</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_TICKET_TYPES.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setAddTicketTypes(prev =>
                      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
                    )}
                    className={
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all " +
                      (addTicketTypes.includes(f)
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-muted text-muted-foreground border-border hover:border-destructive/50")
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Additional Details</Label>
              <Textarea
                value={addDescription}
                onChange={e => setAddDescription(e.target.value)}
                placeholder="Describe the issue in more detail…"
                rows={3}
                className="mt-1.5 text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTicket(false)}>Cancel</Button>
            <Button onClick={handleAddTicket} disabled={adding}>
              {adding
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Opening…</>
                : <><Ticket className="w-4 h-4 mr-2" />Open Ticket</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Delete confirm -- */}
      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTicketToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminMaintenance