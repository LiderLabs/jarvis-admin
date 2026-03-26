'use client'

import { useState } from "react"
import { useQuery, useMutation, useConvexAuth, usePaginatedQuery } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { Wrench, CheckCircle2, Trash2, Loader2, Building2, Clock, Filter, Plus } from "lucide-react"
import { format } from "date-fns"

const QUICK_FAULTS = ["Not spinning", "Coin stuck", "Not rolling", "Door won't close", "Water leaking", "Not draining", "Noisy", "Not starting"]

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
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "fixed">("all")
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null)

  // Add Fault modal state
  const [showAddFault, setShowAddFault] = useState(false)
  const [addBranchId, setAddBranchId] = useState("")
  const [addMachineId, setAddMachineId] = useState("")
  const [addFaultTypes, setAddFaultTypes] = useState<string[]>([])
  const [addDescription, setAddDescription] = useState("")
  const [adding, setAdding] = useState(false)

  const branchMachines = useQuery(
    (api as any).branchMachines.listByBranch,
    addBranchId ? { branchId: addBranchId as any } : "skip"
  ) ?? []

  const tickets = useQuery(
    (api as any).maintenanceTickets.listTickets,
    isAuthenticated ? {
      branchId: selectedBranchId !== "all" ? selectedBranchId as any : undefined,
      status: statusFilter !== "all" ? statusFilter as any : undefined,
    } : "skip"
  ) ?? []

  const markFixed = useMutation((api as any).maintenanceTickets.markFixed)
  const deleteTicket = useMutation((api as any).maintenanceTickets.deleteTicket)
  const reportFault = useMutation((api as any).maintenanceTickets.reportFault)

  const getBranchName = (branchId: string) => {
    const b = (branchList as any[]).find((b: any) => b._id === branchId)
    return b?.name ?? "Unknown Branch"
  }

  const handleMarkFixed = async (ticketId: string) => {
    if (!adminId) { toast.error("Not authenticated"); return }
    try {
      await markFixed({ ticketId: ticketId as any, adminId })
      toast.success("Marked as fixed")
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

  const handleAddFault = async () => {
    if (!addBranchId) { toast.error("Select a branch"); return }
    if (!addMachineId) { toast.error("Select a machine"); return }
    if (addFaultTypes.length === 0 && !addDescription.trim()) { toast.error("Select a fault type or describe the issue"); return }
    const machine = (branchMachines as any[]).find((m: any) => m._id === addMachineId)
    const machineName = machine?.name ?? addMachineId
    setAdding(true)
    try {
      await reportFault({
        branchId: addBranchId as any,
        machineId: addMachineId as any,
        machineName,
        faultTypes: addFaultTypes,
        description: addDescription.trim() || undefined,
        reportedBy: "Admin",
      })
      toast.success("Fault reported")
      setShowAddFault(false)
      setAddBranchId(""); setAddMachineId(""); setAddFaultTypes([]); setAddDescription("")
    } catch (e: any) { toast.error(e.message || "Failed to report") }
    setAdding(false)
  }

  const openCount = (tickets as any[]).filter((t: any) => t.status === "open").length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Maintenance</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track and resolve machine faults
            {openCount > 0 && <span className="ml-2 px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-full">{openCount} open</span>}
          </p>
        </div>
        <Button onClick={() => setShowAddFault(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Fault
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Branches</option>
            {(branchList as any[]).map((b: any) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {(["all", "open", "fixed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " + (statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-muted-foreground/30")}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets */}
      {tickets === undefined ? (
        <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : (tickets as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No maintenance tickets</h3>
            <p className="text-muted-foreground text-center">
              {statusFilter === "open" ? "No open faults reported" : statusFilter === "fixed" ? "No fixed tickets yet" : "No faults have been reported yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(tickets as any[]).map((ticket: any) => (
            <Card key={ticket._id} className={ticket.status === "fixed" ? "opacity-70" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={"w-10 h-10 rounded-xl flex items-center justify-center " + (ticket.status === "open" ? "bg-destructive/10" : "bg-green-500/10")}>
                      <Wrench className={"w-5 h-5 " + (ticket.status === "open" ? "text-destructive" : "text-green-500")} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{ticket.machineName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{getBranchName(ticket.branchId)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={ticket.status === "open" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-green-500/10 text-green-600 border-green-500/20"}>
                    {ticket.status === "open" ? "Open" : "Fixed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.faultTypes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.faultTypes.map((ft: string) => (
                      <span key={ft} className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full font-medium">{ft}</span>
                    ))}
                  </div>
                )}
                {ticket.description && (
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                )}
                <Separator />
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
                        Fixed {format(new Date(ticket.fixedAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {ticket.status === "open" && (
                      <Button size="sm" className="h-8 text-xs bg-green-500 hover:bg-green-600 text-white" onClick={() => handleMarkFixed(ticket._id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Fixed
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setTicketToDelete(ticket._id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Fault Modal */}
      <Dialog open={showAddFault} onOpenChange={setShowAddFault}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report a Fault</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Branch</label>
              <select
                value={addBranchId}
                onChange={e => { setAddBranchId(e.target.value); setAddMachineId("") }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select branch...</option>
                {(branchList as any[]).map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Machine</label>
              <select
                value={addMachineId}
                onChange={e => setAddMachineId(e.target.value)}
                disabled={!addBranchId}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Select machine...</option>
                {(branchMachines as any[]).map((m: any) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-2">Fault Type</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_FAULTS.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setAddFaultTypes(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                    className={"px-3 py-1 rounded-full text-xs font-medium border transition-all " + (addFaultTypes.includes(f) ? "bg-destructive text-destructive-foreground border-destructive" : "bg-muted text-muted-foreground border-border hover:border-destructive/50")}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Additional Details</label>
              <Textarea
                value={addDescription}
                onChange={e => setAddDescription(e.target.value)}
                placeholder="Describe the issue in more detail..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFault(false)}>Cancel</Button>
            <Button onClick={handleAddFault} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Report Fault
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this maintenance ticket? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTicketToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminMaintenance
