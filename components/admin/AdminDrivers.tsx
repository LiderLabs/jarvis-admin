"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@liderlabs/washlab-backend/api"
import { Id } from "@liderlabs/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Truck, UserPlus, MoreVertical, Phone, Building2,
  Loader2, CheckCircle2, XCircle, Edit, Trash2,
  Package, MapPin, Clock,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Driver {
  _id: string
  name: string
  phoneNumber: string
  branchId: Id<"branches">
  branchName: string
  isActive: boolean
  lastLoginAt?: number
  createdAt: number
}

function getServiceLabel(code: string) {
  const m: Record<string, string> = {
    wash_only: "Wash Only",
    wash_and_dry: "Wash & Dry",
    dry_only: "Dry Only",
  }
  return m[code] || code.replace(/_/g, " ")
}

export default function AdminDrivers() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [activeTab, setActiveTab] = useState<"drivers" | "deliveries">("drivers")

  // Form state
  const [form, setForm] = useState({
    name: "", phoneNumber: "", pin: "", confirmPin: "", branchId: "" as string,
  })
  const [editForm, setEditForm] = useState({
    name: "", phoneNumber: "", pin: "", branchId: "", isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const branches = useQuery((api as any).admin.getActiveBranchesList) ?? []
  const drivers = useQuery((api as any).drivers.listDrivers, {}) ?? []
  const deliveries = useQuery((api as any).drivers.getDeliveryOrdersForAdmin, {}) ?? []

  const createDriver = useMutation((api as any).drivers.createDriver)
  const updateDriver = useMutation((api as any).drivers.updateDriver)
  const deleteDriver = useMutation((api as any).drivers.deleteDriver)

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!form.phoneNumber.trim()) { toast.error("Phone number is required"); return }
    if (!form.pin || form.pin.length < 4) { toast.error("PIN must be at least 4 digits"); return }
    if (form.pin !== form.confirmPin) { toast.error("PINs do not match"); return }
    if (!form.branchId) { toast.error("Select a branch"); return }

    setSaving(true)
    try {
      await createDriver({
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        pin: form.pin,
        branchId: form.branchId as Id<"branches">,
      })
      toast.success(`Driver ${form.name} created`)
      setShowCreateDialog(false)
      setForm({ name: "", phoneNumber: "", pin: "", confirmPin: "", branchId: "" as string })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create driver")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedDriver) return
    setSaving(true)
    try {
      const updates: any = { driverId: selectedDriver._id }
      if (editForm.name.trim()) updates.name = editForm.name.trim()
      if (editForm.phoneNumber.trim()) updates.phoneNumber = editForm.phoneNumber.trim()
      if (editForm.pin.trim()) updates.pin = editForm.pin.trim()
      if (editForm.branchId) updates.branchId = editForm.branchId as Id<"branches">
      updates.isActive = editForm.isActive

      await updateDriver(updates)
      toast.success("Driver updated")
      setShowEditDialog(false)
      setSelectedDriver(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update driver")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDriver) return
    setDeleting(true)
    try {
      await deleteDriver({ driverId: selectedDriver._id })
      toast.success("Driver removed")
      setShowDeleteDialog(false)
      setSelectedDriver(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete driver")
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (driver: Driver) => {
    setSelectedDriver(driver)
    setEditForm({
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      pin: "",
      branchId: driver.branchId,
      isActive: driver.isActive,
    })
    setShowEditDialog(true)
  }

  const openDelete = (driver: Driver) => {
    setSelectedDriver(driver)
    setShowDeleteDialog(true)
  }

  // Delivery stats
  const pendingDeliveries = (deliveries as any[]).filter(
    d => !d.driverStatus || d.driverStatus === "pending_pickup"
  )
  const inTransit = (deliveries as any[]).filter(d => d.driverStatus === "picked_up")
  const delivered = (deliveries as any[]).filter(d => d.driverStatus === "delivered")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Drivers & Deliveries
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage delivery drivers and track orders
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <UserPlus className="w-4 h-4" />
          Add Driver
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Drivers", value: (drivers as Driver[]).length, color: "text-foreground" },
          { label: "Ready for Pickup", value: pendingDeliveries.length, color: "text-blue-600" },
          { label: "In Transit", value: inTransit.length, color: "text-orange-600" },
          { label: "Delivered Today", value: delivered.length, color: "text-green-600" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-border overflow-hidden w-fit">
        {[
          { key: "drivers" as const, label: "Drivers" },
          { key: "deliveries" as const, label: "Deliveries" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Drivers tab */}
      {activeTab === "drivers" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Drivers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(drivers as Driver[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Truck className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No drivers yet</p>
                <p className="text-xs mt-1">Add a driver to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Driver</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Branch</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Login</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drivers as Driver[]).map(driver => (
                      <tr key={driver._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{driver.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{driver.phoneNumber}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5" />
                            {driver.branchName}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {driver.isActive ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                              <CheckCircle2 className="w-3 h-3" />Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground gap-1">
                              <XCircle className="w-3 h-3" />Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {driver.lastLoginAt
                            ? format(new Date(driver.lastLoginAt), "d MMM, h:mm a")
                            : "Never"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(driver)}>
                                <Edit className="w-4 h-4 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDelete(driver)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deliveries tab */}
      {activeTab === "deliveries" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Delivery Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(deliveries as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No delivery orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Driver</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deliveries as any[]).map((order: any) => {
                      const statusConfig: Record<string, { label: string; class: string }> = {
                        pending_pickup: { label: "Awaiting Pickup", class: "bg-blue-100 text-blue-700 border-blue-200" },
                        picked_up: { label: "In Transit", class: "bg-orange-100 text-orange-700 border-orange-200" },
                        delivered: { label: "Delivered", class: "bg-green-100 text-green-700 border-green-200" },
                      }
                      const driverStatus = order.driverStatus ?? "pending_pickup"
                      const config = statusConfig[driverStatus] ?? statusConfig.pending_pickup

                      return (
                        <tr key={order._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-mono font-semibold text-primary">#{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">{order.branchName}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{order.customerName || "â€”"}</p>
                            <p className="text-xs text-muted-foreground">{order.customerPhoneNumber}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground flex items-start gap-1">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {[order.deliveryHall, order.deliveryRoom ? `Rm ${order.deliveryRoom}` : null]
                                .filter(Boolean).join(", ") || order.deliveryAddress || "â€”"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm">{order.driverName || <span className="text-muted-foreground italic">Unassigned</span>}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs border ${config.class}`}>
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"} className="text-xs">
                              {order.paymentStatus === "paid" ? "Paid" : "On Delivery"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            â‚µ{(order.finalPrice ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Driver Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Add New Driver
            </DialogTitle>
            <DialogDescription>
              Create a driver account. They'll log in at /driver/login with their phone and PIN.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. Kwame Mensah"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                placeholder="e.g. 0241234567"
                value={form.phoneNumber}
                onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={form.branchId || undefined} onValueChange={v => setForm(f => ({ ...f, branchId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {(branches as any[]).map((b: any) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Min 4 digits"
                  value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  maxLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Repeat PIN"
                  value={form.confirmPin}
                  onChange={e => setForm(f => ({ ...f, confirmPin: e.target.value.replace(/\D/g, '') }))}
                  maxLength={8}
                />
              </div>
            </div>
            {form.pin && form.confirmPin && form.pin !== form.confirmPin && (
              <p className="text-xs text-destructive">PINs do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Update driver details. Leave PIN blank to keep existing PIN.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                value={editForm.phoneNumber}
                onChange={e => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>New PIN (optional)</Label>
              <Input
                type="password"
                inputMode="numeric"
                placeholder="Leave blank to keep current"
                value={editForm.pin}
                onChange={e => setEditForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Driver is active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Driver</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{selectedDriver?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing...</> : "Remove Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

