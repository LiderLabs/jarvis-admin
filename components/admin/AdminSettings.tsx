'use client';

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQuery, useMutation } from "convex/react"
import { api } from "@devlider001/washlab-backend/api"
import { Id } from "@devlider001/washlab-backend/dataModel"
import { toast } from "sonner"
import {
  Settings,
  DollarSign,
  Bell,
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    businessName: "WashLab",
    contactPhone: "",
    contactEmail: "",
    notifyNewOrders: true,
    notifyCompletedOrders: true,
    requireBiometricPayment: true,
    autoLogoutMinutes: 30,
  })

  const [showServiceDialog, setShowServiceDialog] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)
  const [serviceForm, setServiceForm] = useState({
    name: "",
    code: "",
    description: "",
    imageStorageId: null as string | null,
    imageUrl: "",
    basePrice: 0,
    pricingType: "per_kg" as "per_kg" | "per_load",
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Fetch settings
  const systemSettings = useQuery(api.admin.getSystemSettings)
  const services = useQuery(api.admin.getServices)
  const updateSettings = useMutation(api.admin.updateSystemSettings)
  const createService = useMutation(api.admin.createService)
  const updateService = useMutation(api.admin.updateService)
  const deleteService = useMutation(api.admin.deleteService)
  const generateUploadUrl = useMutation(api.admin.generateServiceImageUploadUrl)
  const getImageUrl = useQuery(
    api.admin.getServiceImageUrl,
    serviceForm.imageStorageId
      ? { storageId: serviceForm.imageStorageId as any }
      : "skip"
  )

  useEffect(() => {
    if (
      systemSettings &&
      typeof systemSettings === "object" &&
      !("error" in systemSettings)
    ) {
      setSettings({
        businessName: systemSettings.businessName || "WashLab",
        contactPhone: systemSettings.contactPhone || "",
        contactEmail: systemSettings.contactEmail || "",
        notifyNewOrders: systemSettings.notifyNewOrders ?? true,
        notifyCompletedOrders: systemSettings.notifyCompletedOrders ?? true,
        requireBiometricPayment: systemSettings.requireBiometricPayment ?? true,
        autoLogoutMinutes: systemSettings.autoLogoutMinutes || 30,
      })
    }
  }, [systemSettings])

  // Update image preview when getImageUrl query result changes
  useEffect(() => {
    if (getImageUrl && serviceForm.imageStorageId) {
      setImagePreview(getImageUrl)
    }
  }, [getImageUrl, serviceForm.imageStorageId])

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settings)
      toast.success("Settings saved successfully!")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      )
    }
  }

  const handleOpenServiceDialog = (service?: any) => {
    if (service) {
      setEditingService(service)
      setServiceForm({
        name: service.name,
        code: service.code,
        description: service.description || "",
        imageStorageId: service.imageStorageId || null,
        imageUrl: service.imageUrl || "",
        basePrice: service.basePrice,
        pricingType: service.pricingType,
      })
      // Set preview - will be updated by useEffect when getImageUrl loads
      if (service.imageStorageId) {
        // Preview will be set by useEffect when query completes
        setImagePreview(null)
      } else if (service.imageUrl) {
        setImagePreview(service.imageUrl)
      } else {
        setImagePreview(null)
      }
    } else {
      setEditingService(null)
      setServiceForm({
        name: "",
        code: "",
        description: "",
        imageStorageId: null,
        imageUrl: "",
        basePrice: 0,
        pricingType: "per_kg",
      })
      setImagePreview(null)
    }
    setShowServiceDialog(true)
  }

  const handleCloseServiceDialog = () => {
    setShowServiceDialog(false)
    setEditingService(null)
    setServiceForm({
      name: "",
      code: "",
      description: "",
      imageStorageId: null,
      imageUrl: "",
      basePrice: 0,
      pricingType: "per_kg",
    })
    setImagePreview(null)
    setUploadingImage(false)
  }

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    setUploadingImage(true)
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl()

      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })

      const { storageId } = await result.json()

      // Update form with storage ID
      setServiceForm({
        ...serviceForm,
        imageStorageId: storageId,
        imageUrl: "", // Clear URL when using storage
      })

      // Set preview using the storage ID (will be fetched by query)
      setImagePreview(URL.createObjectURL(file))

      toast.success("Image uploaded successfully!")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image"
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveService = async () => {
    try {
      if (editingService) {
        await updateService({
          serviceId: editingService._id,
          name: serviceForm.name,
          description: serviceForm.description || undefined,
          imageStorageId: (serviceForm.imageStorageId as any) || undefined,
          imageUrl: serviceForm.imageUrl || undefined,
          basePrice: serviceForm.basePrice,
          pricingType: serviceForm.pricingType,
        })
        toast.success("Service updated successfully!")
      } else {
        await createService({
          name: serviceForm.name,
          code: serviceForm.code,
          description: serviceForm.description || undefined,
          imageStorageId: (serviceForm.imageStorageId as any) || undefined,
          imageUrl: serviceForm.imageUrl || undefined,
          basePrice: serviceForm.basePrice,
          pricingType: serviceForm.pricingType,
        })
        toast.success("Service created successfully!")
      }
      handleCloseServiceDialog()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save service"
      )
    }
  }

  const handleDeleteService = async (serviceId: Id<"services">) => {
    if (!confirm("Are you sure you want to delete this service?")) return

    try {
      await deleteService({ serviceId })
      toast.success("Service deleted successfully!")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete service"
      )
    }
  }

  // Show loading state if settings are still loading
  if (systemSettings === undefined) {
    return (
      <div>
        <div className='mb-8'>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>
            Settings
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground mt-1'>
            Configure WashLab preferences and services
          </p>
        </div>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>
          Settings
        </h1>
        <p className='text-sm sm:text-base text-muted-foreground mt-1'>
          Configure WashLab preferences and services
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='w-5 h-5 text-primary' />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label>Business Name</Label>
              <Input
                value={settings.businessName}
                onChange={(e) =>
                  setSettings({ ...settings, businessName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={settings.contactPhone}
                onChange={(e) =>
                  setSettings({ ...settings, contactPhone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type='email'
                value={settings.contactEmail}
                onChange={(e) =>
                  setSettings({ ...settings, contactEmail: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Services Management */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='flex items-center gap-2'>
                <DollarSign className='w-5 h-5 text-primary' />
                Services & Pricing
              </CardTitle>
              <Button size='sm' onClick={() => handleOpenServiceDialog()}>
                <Plus className='w-4 h-4 mr-2' />
                Add Service
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {services === undefined ? (
              <div className='text-center py-4 text-muted-foreground'>
                <Loader2 className='w-4 h-4 animate-spin mx-auto mb-2' />
                Loading services...
              </div>
            ) : services.length === 0 ? (
              <div className='text-center py-4 text-muted-foreground'>
                No services configured. Add your first service.
              </div>
            ) : (
              <div className='space-y-3'>
                {services.map((service) => (
                  <div
                    key={service._id}
                    className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'
                  >
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-foreground'>
                          {service.name}
                        </span>
                        {!service.isActive && (
                          <Badge variant='outline'>Inactive</Badge>
                        )}
                        <Badge variant='secondary' className='text-xs'>
                          {service.pricingType === "per_kg"
                            ? "Per kg"
                            : "Per load"}
                        </Badge>
                      </div>
                      {service.description && (
                        <p className='text-xs text-muted-foreground mt-1'>
                          {service.description}
                        </p>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-lg font-bold text-primary'>
                        ₵{service.basePrice.toFixed(2)}
                      </span>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenServiceDialog(service)}
                      >
                        <Edit className='w-4 h-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteService(service._id)}
                        className='text-destructive'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Bell className='w-5 h-5 text-primary' />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>Notify on new orders</Label>
                <p className='text-xs text-muted-foreground mt-1'>
                  Send notifications when new orders are created
                </p>
              </div>
              <Switch
                checked={settings.notifyNewOrders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, notifyNewOrders: checked })
                }
              />
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <Label>Notify on completed orders</Label>
                <p className='text-xs text-muted-foreground mt-1'>
                  Send notifications when orders are completed
                </p>
              </div>
              <Switch
                checked={settings.notifyCompletedOrders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, notifyCompletedOrders: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='w-5 h-5 text-primary' />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>Require biometric for payments</Label>
                <p className='text-xs text-muted-foreground mt-1'>
                  Staff must verify identity before processing payments
                </p>
              </div>
              <Switch
                checked={settings.requireBiometricPayment}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireBiometricPayment: checked })
                }
              />
            </div>
            <div>
              <Label>Auto-logout after (minutes)</Label>
              <Input
                type='number'
                value={settings.autoLogoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoLogoutMinutes: parseInt(e.target.value) || 30,
                  })
                }
                min={5}
                max={120}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className='mt-6 flex justify-end'>
        <Button onClick={handleSaveSettings} className='gap-2'>
          <Save className='w-4 h-4' />
          Save Settings
        </Button>
      </div>

      {/* Service Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className='max-h-[90vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Create New Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update service details and pricing"
                : "Add a new service type with pricing"}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 overflow-y-auto flex-1 pr-2'>
            <div>
              <Label>Service Name *</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, name: e.target.value })
                }
                placeholder='e.g., Wash & Fold'
              />
            </div>
            {!editingService && (
              <div>
                <Label>Service Code *</Label>
                <Input
                  value={serviceForm.code}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      code: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    })
                  }
                  placeholder='e.g., wash_and_fold'
                />
                <p className='text-xs text-muted-foreground mt-1'>
                  Unique identifier (lowercase, underscores)
                </p>
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    description: e.target.value,
                  })
                }
                placeholder='Service description (optional)'
                rows={3}
              />
            </div>
            <div>
              <Label>Service Image (Optional)</Label>
              <div className='space-y-2'>
                <Input
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleImageUpload(file)
                    }
                  }}
                  disabled={uploadingImage}
                  className='cursor-pointer'
                />
                <p className='text-xs text-muted-foreground'>
                  Upload an image for this service. If not provided, a default
                  image will be used based on service type.
                </p>
                {(imagePreview ||
                  (getImageUrl && typeof getImageUrl === "string")) && (
                  <div className='mt-2'>
                    <img
                      src={
                        imagePreview ||
                        (typeof getImageUrl === "string" ? getImageUrl : "") ||
                        ""
                      }
                      alt='Service preview'
                      className='w-full h-32 object-cover rounded-lg border border-border'
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                    {(serviceForm.imageStorageId || serviceForm.imageUrl) && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='mt-2 text-destructive'
                        onClick={() => {
                          setServiceForm({
                            ...serviceForm,
                            imageStorageId: null,
                            imageUrl: "",
                          })
                          setImagePreview(null)
                        }}
                      >
                        Remove Image
                      </Button>
                    )}
                  </div>
                )}
                {uploadingImage && (
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Uploading image...
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Pricing Type *</Label>
              <Select
                value={serviceForm.pricingType}
                onValueChange={(value: "per_kg" | "per_load") =>
                  setServiceForm({ ...serviceForm, pricingType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='per_kg'>Per Kilogram</SelectItem>
                  <SelectItem value='per_load'>Per Load</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Price (₵) *</Label>
              <Input
                type='number'
                step='0.01'
                min='0'
                value={serviceForm.basePrice}
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    basePrice: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder='0.00'
              />
            </div>
          </div>
          <div className='flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0'>
            <Button variant='outline' onClick={handleCloseServiceDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveService}>
              {editingService ? "Update" : "Create"} Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminSettings;
