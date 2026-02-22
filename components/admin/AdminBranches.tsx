'use client';

import { useState } from 'react';
import { usePaginatedQuery, useMutation, useConvexAuth } from "convex/react"
import { api } from "@devlider001/washlab-backend/api"
import { Id } from "@devlider001/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PRICING_CONFIG } from "@/config/pricing"
import { toast } from "sonner"
import {
  Building2,
  Plus,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
  Phone,
  Mail,
  MoreVertical,
  Lock,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Branch {
  _id: Id<"branches">
  name: string
  code: string
  address: string
  city: string
  country: string
  phoneNumber: string
  email?: string
  pricingPerKg: number
  deliveryFee: number
  isActive: boolean
  createdAt: number
}

const BRANCHES_LIMIT = 20

const AdminBranches = () => {
  const { isAuthenticated } = useConvexAuth()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Id<"branches"> | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    country: "Ghana",
    phoneNumber: "",
    email: "",
    pricingPerKg: PRICING_CONFIG.services[1].price, // Default to wash_and_dry price
    deliveryFee: 10,
    stationPin: "",
  })

  const {
    results: branchesPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.admin.getBranches,
    isAuthenticated
      ? {
          includeInactive: includeInactive || undefined,
        }
      : "skip",
    { initialNumItems: BRANCHES_LIMIT }
  )

  const branches = branchesPages?.flat() || []
  const hasMore = paginationStatus === "CanLoadMore"
  const isLoading =
    paginationStatus === "LoadingFirstPage" ||
    paginationStatus === "LoadingMore"

  const createBranch = useMutation(api.admin.createBranch)
  const updateBranch = useMutation(api.admin.updateBranch)
  const toggleBranchStatus = useMutation(api.admin.toggleBranchStatus)
  const deleteBranch = useMutation(api.admin.deleteBranch)

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      country: "Ghana",
      phoneNumber: "",
      email: "",
      pricingPerKg: PRICING_CONFIG.services[1].price,
      deliveryFee: 10,
      stationPin: "",
    })
  }

  const handleOpenAddDialog = () => {
    resetForm()
    setShowAddDialog(true)
  }

  const handleOpenEditDialog = (branch: Branch) => {
    setSelectedBranch(branch)
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      city: branch.city,
      country: branch.country,
      phoneNumber: branch.phoneNumber,
      email: branch.email || "",
      pricingPerKg: branch.pricingPerKg,
      deliveryFee: branch.deliveryFee,
      stationPin: "",
    })
    setShowEditDialog(true)
  }

  const handleCloseDialogs = () => {
    setShowAddDialog(false)
    setShowEditDialog(false)
    setSelectedBranch(null)
    resetForm()
  }

  const handleCreateBranch = async () => {
    if (
      !formData.name ||
      !formData.code ||
      !formData.address ||
      !formData.city ||
      !formData.phoneNumber
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!formData.stationPin || formData.stationPin.trim().length < 4) {
      toast.error("Station PIN is required and must be at least 4 characters")
      return
    }

    try {
      const normalizedCode = formData.code
        .toUpperCase()
        .trim()
        .replace(/\s+/g, "")

      const branchData: any = {
        name: formData.name.trim(),
        code: normalizedCode,
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email?.trim() || undefined,
        pricingPerKg: formData.pricingPerKg,
        deliveryFee: formData.deliveryFee,
        stationPin: formData.stationPin.trim(),
      }
      await createBranch(branchData)
      toast.success("Branch created successfully!")
      handleCloseDialogs()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create branch"
      toast.error(errorMessage)
    }
  }

  const handleUpdateBranch = async () => {
    if (!selectedBranch) return

    if (
      !formData.name ||
      !formData.code ||
      !formData.address ||
      !formData.city ||
      !formData.phoneNumber
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.stationPin && formData.stationPin.trim().length < 4) {
      toast.error("Station PIN must be at least 4 characters")
      return
    }

    if (
      !formData.stationPin &&
      selectedBranch &&
      !(selectedBranch as any).stationPinHash
    ) {
      toast.error("Station PIN is required. Please enter a PIN for this branch")
      return
    }

    try {
      const normalizedCode = formData.code
        .toUpperCase()
        .trim()
        .replace(/\s+/g, "")

      const updateData = {
        branchId: selectedBranch._id,
        name: formData.name.trim(),
        code: normalizedCode,
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email?.trim() || undefined,
        pricingPerKg: formData.pricingPerKg,
        deliveryFee: formData.deliveryFee,
        stationPin: formData.stationPin?.trim() || undefined,
      } as any
      await updateBranch(updateData)
      toast.success("Branch updated successfully!")
      handleCloseDialogs()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update branch"
      toast.error(errorMessage)
    }
  }

  const handleToggleStatus = async (branchId: Id<"branches">) => {
    try {
      await toggleBranchStatus({ branchId })
      toast.success("Branch status updated")
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update branch status"
      toast.error(errorMessage)
    }
  }

  const handleDeleteClick = (branchId: Id<"branches">) => {
    setBranchToDelete(branchId)
    setShowDeleteDialog(true)
  }

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return

    try {
      await deleteBranch({ branchId: branchToDelete })
      toast.success("Branch deleted successfully")
      setShowDeleteDialog(false)
      setBranchToDelete(null)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete branch"
      toast.error(errorMessage)
    }
  }

  return (
    <div>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>
            Branches
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground mt-1'>
            Manage WashLab locations
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={() => setIncludeInactive(!includeInactive)}
          >
            {includeInactive ? "Show Active Only" : "Show All"}
          </Button>
          <Button
            onClick={handleOpenAddDialog}
            className='gap-2 w-full sm:w-auto'
          >
            <Plus className='w-4 h-4 shrink-0' />
            <span>Add Branch</span>
          </Button>
        </div>
      </div>

      {/* Branches Grid */}
      {branches.length === 0 && paginationStatus === "LoadingFirstPage" ? (
        <Card>
          <CardContent className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </CardContent>
        </Card>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Building2 className='h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='font-semibold text-lg mb-2'>No branches found</h3>
            <p className='text-muted-foreground mb-4'>
              {includeInactive
                ? "No branches in the system"
                : "No active branches found"}
            </p>
            <Button onClick={handleOpenAddDialog}>
              <Plus className='w-4 h-4 mr-2' />
              Add First Branch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6'>
            {branches.map((branch: Branch) => (
              <Card
                key={branch._id}
                className={
                  branch.isActive
                    ? "border-border"
                    : "border-border/50 opacity-60"
                }
              >
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div className='w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center'>
                      <Building2 className='w-6 h-6 text-primary' />
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge
                        variant={branch.isActive ? "default" : "secondary"}
                      >
                        {branch.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                          >
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => handleOpenEditDialog(branch)}
                          >
                            <Edit2 className='h-4 w-4 mr-2' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(branch._id)}
                          >
                            {branch.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(branch._id)}
                            className='text-destructive'
                          >
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className='text-lg font-bold text-foreground mb-1'>
                    {branch.name}
                  </h3>
                  <p className='text-sm text-muted-foreground flex items-center gap-1 mb-2'>
                    <MapPin className='w-3 h-3' />
                    {branch.address}, {branch.city}
                  </p>
                  <p className='text-xs text-muted-foreground mb-2'>
                    Code: {branch.code}
                  </p>

                  <Separator className='my-4' />

                  <div className='space-y-2 text-sm'>
                    {branch.phoneNumber && (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Phone className='h-3 w-3' />
                        <span>{branch.phoneNumber}</span>
                      </div>
                    )}
                    {branch.email && (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Mail className='h-3 w-3' />
                        <span>{branch.email}</span>
                      </div>
                    )}
                  </div>

                  <Separator className='my-4' />

                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        Price per kg:
                      </span>
                      <span className='font-semibold'>
                        ₵{branch.pricingPerKg.toFixed(2)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        Delivery fee:
                      </span>
                      <span className='font-semibold'>
                        ₵{branch.deliveryFee.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className='flex justify-center mt-6'>
              <Button
                variant='outline'
                onClick={() => loadMore(BRANCHES_LIMIT)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add Branch Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>
              Create a new WashLab branch location
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Branch Name *</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='e.g., Independence Hall'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='code'>Branch Code *</Label>
                <Input
                  id='code'
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder='e.g., IND'
                  maxLength={10}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='address'>Address *</Label>
              <Input
                id='address'
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder='Street address'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='city'>City *</Label>
                <Input
                  id='city'
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder='e.g., Accra'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='country'>Country *</Label>
                <Input
                  id='country'
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  placeholder='e.g., Ghana'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='phoneNumber'>Phone Number *</Label>
                <Input
                  id='phoneNumber'
                  type='tel'
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder='0XX XXX XXXX'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder='branch@washlab.com'
                />
              </div>
            </div>
            <Separator />
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='pricingPerKg'>Price per kg (₵) *</Label>
                <Input
                  id='pricingPerKg'
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.pricingPerKg}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricingPerKg: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='deliveryFee'>Delivery Fee (₵) *</Label>
                <Input
                  id='deliveryFee'
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.deliveryFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryFee: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <Separator />
            <div className='space-y-2'>
              <Label htmlFor='stationPin' className='flex items-center gap-2'>
                <Lock className='h-4 w-4' />
                Station PIN *
              </Label>
              <Input
                id='stationPin'
                type='password'
                placeholder='Enter 4-6 digit PIN'
                value={formData.stationPin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stationPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                  })
                }
                maxLength={6}
                minLength={4}
                required
              />
              <p className='text-xs text-muted-foreground'>
                4-6 digits. Required to secure station login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCloseDialogs}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch}>Create Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update branch information</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-name'>Branch Name *</Label>
                <Input
                  id='edit-name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='e.g., Independence Hall'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-code'>Branch Code *</Label>
                <Input
                  id='edit-code'
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder='e.g., IND'
                  maxLength={10}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-address'>Address *</Label>
              <Input
                id='edit-address'
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder='Street address'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-city'>City *</Label>
                <Input
                  id='edit-city'
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder='e.g., Accra'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-country'>Country *</Label>
                <Input
                  id='edit-country'
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  placeholder='e.g., Ghana'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-phoneNumber'>Phone Number *</Label>
                <Input
                  id='edit-phoneNumber'
                  type='tel'
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder='0XX XXX XXXX'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-email'>Email</Label>
                <Input
                  id='edit-email'
                  type='email'
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder='branch@washlab.com'
                />
              </div>
            </div>
            <Separator />
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-pricingPerKg'>Price per kg (₵) *</Label>
                <Input
                  id='edit-pricingPerKg'
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.pricingPerKg}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricingPerKg: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-deliveryFee'>Delivery Fee (₵) *</Label>
                <Input
                  id='edit-deliveryFee'
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.deliveryFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryFee: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <Separator />
            <div className='space-y-2'>
              <Label htmlFor='edit-stationPin' className='flex items-center gap-2'>
                <Lock className='h-4 w-4' />
                Station PIN {selectedBranch && !(selectedBranch as any).stationPinHash ? '*' : ''}
              </Label>
              <Input
                id='edit-stationPin'
                type='password'
                placeholder={selectedBranch && (selectedBranch as any).stationPinHash ? 'Enter new PIN to change (leave empty to keep current)' : 'Enter 4-6 digit PIN *'}
                value={formData.stationPin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stationPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                  })
                }
                maxLength={6}
                minLength={formData.stationPin ? 4 : 0}
              />
              <p className='text-xs text-muted-foreground'>
                {selectedBranch && (selectedBranch as any).stationPinHash
                  ? 'Leave empty to keep current PIN, or enter new PIN (4-6 digits) to change'
                  : '4-6 digits. Required to secure station login.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCloseDialogs}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBranch}>Update Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this branch? This action cannot be undone.
              <br />
              <br />
              <strong>Note:</strong> You cannot delete a branch with active orders. Please complete or cancel all orders first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBranchToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminBranches;