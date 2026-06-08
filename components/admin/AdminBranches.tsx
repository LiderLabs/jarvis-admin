'use client';

import { useState, useRef } from 'react';
import { usePaginatedQuery, useMutation, useQuery, useConvexAuth } from "convex/react"
import { api } from "@liderlabs/washlab-backend/api"
import { Id } from "@liderlabs/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  Tag,
  ImagePlus,
  X,
  Cpu,
  EyeOff,
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

interface ServiceDraft {
  id: string
  name: string
  code: string
  price: number
  imageUrl?: string
  showOnCustomerSide: boolean
}

interface FormData {
  name: string
  code: string
  address: string
  city: string
  country: string
  phoneNumber: string
  email: string
  deliveryFee: number
  stationPin: string
  weeklyOrderTarget: number
}

interface MachineForm {
  name: string
  displayName: string
  serialNumber: string
  otherDetails: string
}

const BRANCHES_LIMIT = 20

const DEFAULT_IMAGES = [
  { label: "Wash & Dry", url: "/assets/laundry-hero-1.jpg" },
  { label: "Wash Only", url: "/assets/laundry-hero-2.jpg" },
  { label: "Dry Only",  url: "/assets/stacked-clothes.jpg" },
]

const toServiceCode = (name: string) =>
  name.toLowerCase().trim().replace(/&/g, "and").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")

// ─── Image Picker ─────────────────────────────────────────────────────────────
const ServiceImagePicker = ({
  value,
  onChange,
  generateUploadUrl,
}: {
  value?: string
  onChange: (url: string) => void
  generateUploadUrl: () => Promise<string>
}) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const res = await fetch("/api/upload-proxy", {
        method: "POST",
        headers: {
          "x-upload-url": uploadUrl,
          "x-content-type": file.type,
        },
        body: file,
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Upload failed (${res.status}): ${errText}`)
      }
      const { storageId } = await res.json()
      if (!storageId) throw new Error("No storageId returned")
      onChange(`convex-storage:${storageId}`)
    } catch (err: any) {
      console.error("Image upload error:", err)
      toast.error(err?.message || "Failed to upload image")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const preview = value?.startsWith("convex-storage:") ? null : value

  return (
    <div className="space-y-2">
      <Label className="text-xs">Service Image (optional)</Label>
      <div className="flex gap-2 flex-wrap">
        {DEFAULT_IMAGES.map((img) => (
          <button
            key={img.url}
            type="button"
            onClick={() => onChange(img.url)}
            className={`relative rounded-lg overflow-hidden border-2 transition-all w-16 h-16 ${value === img.url ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
          >
            <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
            {value === img.url && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-muted/50 transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
          <span className="text-[9px] text-muted-foreground">{uploading ? "Uploading…" : "Upload"}</span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-destructive/40 flex flex-col items-center justify-center gap-1 hover:bg-destructive/10 transition-all"
          >
            <X className="h-4 w-4 text-destructive" />
            <span className="text-[9px] text-destructive">Clear</span>
          </button>
        )}
      </div>
      {preview && !DEFAULT_IMAGES.find(d => d.url === preview) && (
        <div className="mt-1">
          <img src={preview} alt="Preview" className="h-16 w-24 object-cover rounded-lg border" />
        </div>
      )}
      {value?.startsWith("convex-storage:") && (
        <p className="text-xs text-muted-foreground">✓ Image ready — will be saved when you click Save / Add Service</p>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}

// ─── Service Image Resolver ───────────────────────────────────────────────────
const ServiceImage = ({ imageUrl, alt, className }: { imageUrl: string; alt: string; className: string }) => {
  const isStorageId = imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/") && !imageUrl.startsWith("convex-storage:")
  const storageUrl = useQuery(
    api.admin.getServiceImageUrl,
    isStorageId ? { storageId: imageUrl as any } : "skip"
  )
  const fixUrl = (url: string | null) => {
    if (!url) return null
    return url.replace("convex-dashboard.washlab.app", "convex-backend.washlab.app")
      .replace("staging.convex-backend.washlab.app", (process.env.NEXT_PUBLIC_CONVEX_URL || "").replace("https://", "").replace("convex-dashboard", "convex-backend"))
  }
  const resolvedUrl = isStorageId ? fixUrl(storageUrl ?? null) : imageUrl
  if (!resolvedUrl) return <div className={className + " bg-muted flex items-center justify-center"}><ImagePlus className="h-4 w-4 text-muted-foreground" /></div>
  return <img src={resolvedUrl} alt={alt} className={className} />
}

// ─── Customer Visibility Toggle ───────────────────────────────────────────────
const CustomerVisibilityToggle = ({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) => (
  <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/30">
    <div className="flex items-center gap-2">
      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium">Show on customer side</p>
        <p className="text-[10px] text-muted-foreground">Customers will see this service in the app</p>
      </div>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
)

// ─── Branch Services Panel ────────────────────────────────────────────────────
const BranchServicesPanel = ({ branchId }: { branchId: Id<"branches"> }) => {
  const services = useQuery(api.admin.getBranchServices, { branchId })
  const createBranchService = useMutation(api.admin.createBranchService)
  const updateBranchService = useMutation(api.admin.updateBranchService)
  const deleteBranchService = useMutation(api.admin.deleteBranchService)
  const generateUploadUrl = useMutation(api.admin.generateServiceImageUploadUrl)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<Id<"branchServices"> | null>(null)
  const [form, setForm] = useState({ name: "", price: 0, imageUrl: "", showOnCustomerSide: true, extraWashPrice: "", extraDryPrice: "" })

  const resetForm = () => setForm({ name: "", price: 0, imageUrl: "", showOnCustomerSide: true, extraWashPrice: "", extraDryPrice: "" })

  const handleAdd = async () => {
    if (!form.name || form.price <= 0) { toast.error("Service name and price are required"); return }
    try {
      const imageUrl = form.imageUrl?.startsWith("convex-storage:")
        ? form.imageUrl.replace("convex-storage:", "")
        : form.imageUrl || undefined
      await (createBranchService as any)({
        branchId,
        name: form.name.trim(),
        code: toServiceCode(form.name),
        price: form.price,
        imageUrl,
        showOnCustomerSide: form.showOnCustomerSide,
        extraWashPrice: form.extraWashPrice !== "" ? parseFloat(form.extraWashPrice as any) || undefined : undefined,
        extraDryPrice: form.extraDryPrice !== "" ? parseFloat(form.extraDryPrice as any) || undefined : undefined,
      })
      toast.success("Service added")
      setShowAdd(false)
      resetForm()
    } catch (e: any) { toast.error(e.message || "Failed to add service") }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    if (!form.name || form.price <= 0) { toast.error("Service name and price are required"); return }
    try {
      const imageUrl = form.imageUrl?.startsWith("convex-storage:")
        ? form.imageUrl.replace("convex-storage:", "")
        : form.imageUrl || undefined
      await (updateBranchService as any)({
        serviceId: editingId,
        name: form.name.trim(),
        price: form.price,
        imageUrl,
        showOnCustomerSide: form.showOnCustomerSide,
        extraWashPrice: form.extraWashPrice !== "" ? parseFloat(form.extraWashPrice as any) || undefined : undefined,
        extraDryPrice: form.extraDryPrice !== "" ? parseFloat(form.extraDryPrice as any) || undefined : undefined,
      })
      toast.success("Service updated")
      setEditingId(null)
      resetForm()
    } catch (e: any) { toast.error(e.message || "Failed to update service") }
  }

  const handleDelete = async (serviceId: Id<"branchServices">) => {
    try {
      await deleteBranchService({ serviceId })
      toast.success("Service deleted")
    } catch (e: any) { toast.error(e.message || "Failed to delete service") }
  }

  const startEdit = (s: any) => {
    setEditingId(s._id)
    setForm({
      name: s.name,
      price: s.price,
      imageUrl: s.imageUrl || "",
      showOnCustomerSide: s.showOnCustomerSide ?? true,
      extraWashPrice: s.extraWashPrice != null ? String(s.extraWashPrice) : "",
      extraDryPrice: s.extraDryPrice != null ? String(s.extraDryPrice) : "",
    })
    setShowAdd(false)
  }

  const getDisplayImage = (s: any) => {
    if (s.imageUrl) return s.imageUrl
    const match = DEFAULT_IMAGES.find(d => s.name?.toLowerCase().includes(d.label.toLowerCase().split(" ")[0]))
    return match?.url || DEFAULT_IMAGES[0].url
  }

  return (
    <div className="space-y-3">
      {services === undefined ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No services yet. Add the services offered at this branch.</p>
      ) : (
        <div className="space-y-2">
          {services.map((s: any) => (
            editingId === s._id ? (
              <div key={s._id} className="border rounded-lg p-3 space-y-2 bg-background">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Service name" className="h-8 text-sm" />
                  <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="Price" className="h-8 text-sm" min="0" step="0.01" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Extra Wash Price (&#8373;) <span className="text-muted-foreground">optional</span></Label>
                    <Input type="number" value={form.extraWashPrice} onChange={(e) => setForm({ ...form, extraWashPrice: e.target.value })} placeholder="Leave blank = default" className="h-8 text-sm" min="0" step="0.01" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Extra Dry Price (&#8373;) <span className="text-muted-foreground">optional</span></Label>
                    <Input type="number" value={form.extraDryPrice} onChange={(e) => setForm({ ...form, extraDryPrice: e.target.value })} placeholder="Leave blank = default" className="h-8 text-sm" min="0" step="0.01" />
                  </div>
                </div>
                <ServiceImagePicker value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} generateUploadUrl={generateUploadUrl} />
                <CustomerVisibilityToggle value={form.showOnCustomerSide} onChange={(v) => setForm({ ...form, showOnCustomerSide: v })} />
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-8 text-xs" onClick={handleUpdate}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditingId(null); resetForm() }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div key={s._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3 flex-1">
                  <ServiceImage imageUrl={getDisplayImage(s)} alt={s.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{s.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!s.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                      {!s.showOnCustomerSide && (
                        <Badge variant="secondary" className="text-[10px] gap-1 py-0">
                          <EyeOff className="h-2.5 w-2.5" />Hidden from customers
                        </Badge>
                      )}
                      {s.extraWashPrice != null && <Badge variant="outline" className="text-[10px] py-0">+wash &#8373;{s.extraWashPrice}</Badge>}
                      {s.extraDryPrice != null && <Badge variant="outline" className="text-[10px] py-0">+dry &#8373;{s.extraDryPrice}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-primary text-sm">&#8373;{s.price.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">/ load</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )
          ))}
        </div>
      )}
      {showAdd ? (
        <div className="border rounded-lg p-3 space-y-2 bg-background">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Service Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Wash & Dry" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per load (&#8373;) *</Label>
              <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} min="0" step="0.01" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Extra Wash Price (&#8373;) <span className="text-muted-foreground">optional</span></Label>
              <Input type="number" value={form.extraWashPrice} onChange={(e) => setForm({ ...form, extraWashPrice: e.target.value })} placeholder="Leave blank = default" className="h-8 text-sm" min="0" step="0.01" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Extra Dry Price (&#8373;) <span className="text-muted-foreground">optional</span></Label>
              <Input type="number" value={form.extraDryPrice} onChange={(e) => setForm({ ...form, extraDryPrice: e.target.value })} placeholder="Leave blank = default" className="h-8 text-sm" min="0" step="0.01" />
            </div>
          </div>
          <ServiceImagePicker value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} generateUploadUrl={generateUploadUrl} />
          <CustomerVisibilityToggle value={form.showOnCustomerSide} onChange={(v) => setForm({ ...form, showOnCustomerSide: v })} />
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={() => { setShowAdd(true); setEditingId(null) }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Add Service
        </Button>
      )}
    </div>
  )
}

// ─── Service Drafts Panel ─────────────────────────────────────────────────────
const ServiceDraftsPanel = ({
  drafts,
  onChange,
  generateUploadUrl,
}: {
  drafts: ServiceDraft[]
  onChange: (drafts: ServiceDraft[]) => void
  generateUploadUrl: () => Promise<string>
}) => {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", price: 0, imageUrl: "", showOnCustomerSide: true })
  const [editId, setEditId] = useState<string | null>(null)

  const resetForm = () => setForm({ name: "", price: 0, imageUrl: "", showOnCustomerSide: true })

  const handleAdd = () => {
    if (!form.name || form.price <= 0) { toast.error("Service name and price are required"); return }
    onChange([...drafts, {
      id: `draft_${Date.now()}`,
      name: form.name.trim(),
      code: toServiceCode(form.name),
      price: form.price,
      imageUrl: form.imageUrl || undefined,
      showOnCustomerSide: form.showOnCustomerSide,
    }])
    setShowAdd(false)
    resetForm()
  }

  const handleUpdate = () => {
    if (!editId) return
    onChange(drafts.map(d => d.id === editId ? {
      ...d,
      name: form.name,
      code: toServiceCode(form.name),
      price: form.price,
      imageUrl: form.imageUrl || undefined,
      showOnCustomerSide: form.showOnCustomerSide,
    } : d))
    setEditId(null)
    resetForm()
  }

  const handleDelete = (id: string) => onChange(drafts.filter(d => d.id !== id))

  const startEdit = (d: ServiceDraft) => {
    setEditId(d.id)
    setForm({ name: d.name, price: d.price, imageUrl: d.imageUrl || "", showOnCustomerSide: d.showOnCustomerSide })
    setShowAdd(false)
  }

  const getDisplayImage = (d: ServiceDraft) => {
    if (d.imageUrl && !d.imageUrl.startsWith("convex-storage:")) return d.imageUrl
    const match = DEFAULT_IMAGES.find(img => d.name?.toLowerCase().includes(img.label.toLowerCase().split(" ")[0]))
    return match?.url || DEFAULT_IMAGES[0].url
  }

  return (
    <div className="space-y-3">
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No services yet. Add the services offered at this branch.</p>
      ) : (
        <div className="space-y-2">
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border">
              {editId === d.id ? (
                <div className="flex-1 space-y-2 mr-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Service name" className="h-8 text-sm" />
                    <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" min="0" step="0.01" />
                  </div>
                  <ServiceImagePicker value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} generateUploadUrl={generateUploadUrl} />
                  <CustomerVisibilityToggle value={form.showOnCustomerSide} onChange={(v) => setForm({ ...form, showOnCustomerSide: v })} />
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <ServiceImage imageUrl={getDisplayImage(d)} alt={d.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{d.name}</span>
                    {!d.showOnCustomerSide && (
                      <Badge variant="secondary" className="text-[10px] gap-1 py-0 w-fit">
                        <EyeOff className="h-2.5 w-2.5" />Hidden from customers
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0">
                {editId === d.id ? (
                  <>
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={handleUpdate}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditId(null); resetForm() }}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-primary text-sm">&#8373;{d.price.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">/ load</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(d)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd ? (
        <div className="border rounded-lg p-3 space-y-2 bg-background">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Service Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Wash & Dry" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per load (&#8373;) *</Label>
              <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} min="0" step="0.01" className="h-8 text-sm" />
            </div>
          </div>
          <ServiceImagePicker value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} generateUploadUrl={generateUploadUrl} />
          <CustomerVisibilityToggle value={form.showOnCustomerSide} onChange={(v) => setForm({ ...form, showOnCustomerSide: v })} />
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={() => { setShowAdd(true); setEditId(null) }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Add Service
        </Button>
      )}
    </div>
  )
}

// ─── Machine Form Fields (lifted out to module level to prevent focus loss) ───
const MachineFormFields = ({
  form,
  setForm,
}: {
  form: MachineForm
  setForm: React.Dispatch<React.SetStateAction<MachineForm>>
}) => (
  <div className="space-y-2">
    {/* Row 1: Machine Name + Display Name */}
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Machine Name * <span className="text-muted-foreground font-normal">(internal)</span></Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Samsung WF45 Washer"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Display Name * <span className="text-muted-foreground font-normal">(attendant sees)</span></Label>
        <Input
          value={form.displayName}
          onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
          placeholder="e.g., Big Washer"
          className="h-8 text-sm"
        />
      </div>
    </div>
    {/* Row 2: Serial Number */}
    <div className="space-y-1">
      <Label className="text-xs">Serial Number <span className="text-muted-foreground">(optional)</span></Label>
      <Input
        value={form.serialNumber}
        onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
        placeholder="e.g., SN-20240001"
        className="h-8 text-sm font-mono"
      />
    </div>
    {/* Row 3: Other Details */}
    <div className="space-y-1">
      <Label className="text-xs">Other Details <span className="text-muted-foreground">(brand, capacity, notes — optional)</span></Label>
      <Textarea
        value={form.otherDetails}
        onChange={(e) => setForm((prev) => ({ ...prev, otherDetails: e.target.value }))}
        placeholder="e.g., Samsung, 18kg, front-load"
        rows={2}
        className="text-sm resize-none"
      />
    </div>
  </div>
)

// ─── Branch Machines Panel ────────────────────────────────────────────────────
const BranchMachinesPanel = ({ branchId }: { branchId: Id<"branches"> }) => {
  const machines = useQuery((api as any).branchMachines.listByBranch, { branchId }) ?? []
  const createMachine = useMutation((api as any).branchMachines.create)
  const updateMachine = useMutation((api as any).branchMachines.update)
  const removeMachine = useMutation((api as any).branchMachines.remove)
  const adminId = (useQuery(api.admin.getCurrentUser) as any)?._id

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MachineForm>({
    name: "",
    displayName: "",
    serialNumber: "",
    otherDetails: "",
  })

  const resetForm = () => setForm({ name: "", displayName: "", serialNumber: "", otherDetails: "" })

  const handleAdd = async () => {
    if (!form.name.trim())        { toast.error("Machine name is required"); return }
    if (!form.displayName.trim()) { toast.error("Display name is required"); return }
    if (!adminId)                 { toast.error("Not authenticated"); return }
    try {
      await createMachine({
        branchId,
        name:         form.name.trim(),
        displayName:  form.displayName.trim(),
        serialNumber: form.serialNumber.trim() || undefined,
        otherDetails: form.otherDetails.trim() || undefined,
        adminId,
      })
      toast.success("Machine added")
      setShowAdd(false)
      resetForm()
    } catch (e: any) { toast.error(e.message || "Failed to add machine") }
  }

  const handleUpdate = async () => {
    if (!editingId || !adminId) return
    if (!form.name.trim())        { toast.error("Machine name is required"); return }
    if (!form.displayName.trim()) { toast.error("Display name is required"); return }
    try {
      await updateMachine({
        machineId:    editingId as any,
        name:         form.name.trim(),
        displayName:  form.displayName.trim(),
        serialNumber: form.serialNumber.trim() || undefined,
        otherDetails: form.otherDetails.trim() || undefined,
        adminId,
      })
      toast.success("Machine updated")
      setEditingId(null)
      resetForm()
    } catch (e: any) { toast.error(e.message || "Failed to update machine") }
  }

  const handleToggle = async (machine: any) => {
    if (!adminId) return
    try {
      await updateMachine({ machineId: machine._id, isActive: !machine.isActive, adminId })
      toast.success(machine.isActive ? "Deactivated" : "Activated")
    } catch (e: any) { toast.error(e.message || "Failed") }
  }

  const handleRemove = async (machineId: string) => {
    if (!adminId) return
    try {
      await removeMachine({ machineId: machineId as any, adminId })
      toast.success("Machine removed")
    } catch (e: any) { toast.error(e.message || "Failed") }
  }

  const startEdit = (m: any) => {
    setEditingId(m._id)
    setForm({
      name:         m.name || "",
      displayName:  m.displayName || "",
      serialNumber: m.serialNumber || "",
      otherDetails: m.otherDetails || "",
    })
    setShowAdd(false)
  }

  return (
    <div className="space-y-3">
      {machines.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          No machines configured. Add machines to enable fault tracking.
        </p>
      ) : (
        <div className="space-y-2">
          {(machines as any[]).map((m: any) => (
            editingId === m._id ? (
              <div key={m._id} className="border rounded-lg p-3 space-y-2 bg-background">
                <MachineFormFields form={form} setForm={setForm} />
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-8 text-xs" onClick={handleUpdate}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditingId(null); resetForm() }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                key={m._id}
                className={"flex items-start justify-between px-3 py-2.5 rounded-lg border gap-3 " +
                  (m.isActive ? "bg-muted/50" : "bg-muted/20 opacity-60")}
              >
                {/* Left: icon + info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Full name (admin) */}
                    <span className="font-medium text-sm leading-tight">{m.name}</span>
                    {/* Display name pill */}
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded w-fit font-medium">
                      Attendants see: {m.displayName}
                    </span>
                    {/* Serial + other details */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {m.serialNumber && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          SN: {m.serialNumber}
                        </span>
                      )}
                      {m.otherDetails && (
                        <span className="text-[10px] text-muted-foreground italic truncate max-w-[160px]">
                          {m.otherDetails}
                        </span>
                      )}
                      {!m.isActive && <Badge variant="outline" className="text-[10px] py-0">Inactive</Badge>}
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(m)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => handleToggle(m)}
                    title={m.isActive ? "Deactivate" : "Activate"}
                  >
                    <span className="text-xs font-medium">{m.isActive ? "Off" : "On"}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleRemove(m._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd ? (
        <div className="border rounded-lg p-3 space-y-2 bg-background">
          <MachineFormFields form={form} setForm={setForm} />
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Machine</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs border-dashed"
          onClick={() => { setShowAdd(true); setEditingId(null) }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />Add Machine
        </Button>
      )}
    </div>
  )
}

// ─── Branch Form Fields ───────────────────────────────────────────────────────
const BranchFormFields = ({
  prefix = "",
  formData,
  setFormData,
  selectedBranch,
}: {
  prefix?: string
  formData: FormData
  setFormData: (data: FormData) => void
  selectedBranch: Branch | null
}) => (
  <>
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-2'>
        <Label htmlFor={`${prefix}name`}>Branch Name *</Label>
        <Input id={`${prefix}name`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder='e.g., Independence Hall' />
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`${prefix}code`}>Branch Code *</Label>
        <Input id={`${prefix}code`} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder='e.g., IND' maxLength={10} />
      </div>
    </div>
    <div className='space-y-2'>
      <Label htmlFor={`${prefix}address`}>Address *</Label>
      <Input id={`${prefix}address`} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder='Street address' />
    </div>
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-2'>
        <Label htmlFor={`${prefix}city`}>City *</Label>
        <Input id={`${prefix}city`} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder='e.g., Accra' />
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`${prefix}country`}>Country</Label>
        <Input id={`${prefix}country`} value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder='e.g., Ghana' />
      </div>
    </div>
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-2'>
        <Label htmlFor={`${prefix}phoneNumber`}>Phone Number *</Label>
        <Input id={`${prefix}phoneNumber`} type='tel' value={formData.phoneNumber} onChange={(e) => { const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10); setFormData({ ...formData, phoneNumber: digits }); }} placeholder='0XX XXX XXXX' maxLength={10} inputMode='numeric' />
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`${prefix}email`}>Email</Label>
        <Input id={`${prefix}email`} type='email' value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder='branch@washlab.com' />
      </div>
    </div>
    <Separator />
    <div className='space-y-2'>
      <Label htmlFor={`${prefix}deliveryFee`}>Delivery Fee (&#8373;)</Label>
      <Input id={`${prefix}deliveryFee`} type='number' min='0' step='0.01' value={formData.deliveryFee || ""} onChange={(e) => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })} />
    </div>
    <Separator />
    <div className='space-y-2'>
      <Label htmlFor={`${prefix}weeklyOrderTarget`}>Weekly Order Target</Label>
      <Input id={`${prefix}weeklyOrderTarget`} type='number' min='0' value={formData.weeklyOrderTarget || ""} onChange={(e) => setFormData({ ...formData, weeklyOrderTarget: parseInt(e.target.value) || 0 })} placeholder='e.g., 150' />
      <p className='text-xs text-muted-foreground'>Target number of orders per week for this branch.</p>
    </div>
    <Separator />
    <div className='space-y-2'>
      <Label htmlFor={`${prefix}stationPin`} className='flex items-center gap-2'>
        <Lock className='h-4 w-4' />
        Station PIN {prefix === "" ? "*" : (selectedBranch && !(selectedBranch as any).stationPinHash ? "*" : "")}
      </Label>
      <Input
        id={`${prefix}stationPin`}
        type='password'
        placeholder={prefix !== "" && selectedBranch && (selectedBranch as any).stationPinHash ? 'Leave empty to keep current PIN' : 'Enter 4-6 digit PIN'}
        value={formData.stationPin}
        onChange={(e) => setFormData({ ...formData, stationPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
        maxLength={6}
      />
      <p className='text-xs text-muted-foreground'>
        {prefix !== "" && selectedBranch && (selectedBranch as any).stationPinHash
          ? 'Leave empty to keep current PIN, or enter new PIN (4-6 digits) to change'
          : '4-6 digits. Required to secure station login.'}
      </p>
    </div>
  </>
)

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminBranches = () => {
  const { isAuthenticated } = useConvexAuth()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Id<"branches"> | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [serviceDrafts, setServiceDrafts] = useState<ServiceDraft[]>([])

  const [formData, setFormData] = useState<FormData>({
    name: "", code: "", address: "", city: "", country: "Ghana",
    phoneNumber: "", email: "", deliveryFee: 10, stationPin: "", weeklyOrderTarget: 0,
  })

  const { results: branchesPages, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.admin.getBranches,
    isAuthenticated ? { includeInactive: includeInactive || undefined } : "skip",
    { initialNumItems: BRANCHES_LIMIT }
  )

  const branches = branchesPages?.flat() || []
  const hasMore = paginationStatus === "CanLoadMore"
  const isLoading = paginationStatus === "LoadingFirstPage" || paginationStatus === "LoadingMore"

  const createBranch = useMutation(api.admin.createBranch)
  const updateBranch = useMutation(api.admin.updateBranch)
  const toggleBranchStatus = useMutation(api.admin.toggleBranchStatus)
  const deleteBranch = useMutation(api.admin.deleteBranch)
  const createBranchService = useMutation(api.admin.createBranchService)
  const generateUploadUrl = useMutation(api.admin.generateServiceImageUploadUrl)

  const resetForm = () => {
    setFormData({ name: "", code: "", address: "", city: "", country: "Ghana", phoneNumber: "", email: "", deliveryFee: 10, stationPin: "", weeklyOrderTarget: 0 })
    setServiceDrafts([])
  }

  const handleOpenAddDialog = () => { resetForm(); setShowAddDialog(true) }

  const handleOpenEditDialog = (branch: Branch) => {
    setSelectedBranch(branch)
    setFormData({
      name: branch.name, code: branch.code, address: branch.address,
      city: branch.city, country: branch.country, phoneNumber: branch.phoneNumber,
      email: branch.email || "", deliveryFee: branch.deliveryFee, stationPin: "",
      weeklyOrderTarget: (branch as any).weeklyOrderTarget || 0,
    })
    setShowEditDialog(true)
  }

  const handleCloseDialogs = () => {
    setShowAddDialog(false); setShowEditDialog(false)
    setSelectedBranch(null); resetForm()
  }

  const handleCreateBranch = async () => {
    if (!formData.name || !formData.code || !formData.address || !formData.city || !formData.phoneNumber) {
      toast.error("Please fill in all required fields"); return
    }
    if (!formData.stationPin || formData.stationPin.trim().length < 4) {
      toast.error("Station PIN is required and must be at least 4 characters"); return
    }
    try {
      const normalizedCode = formData.code.toUpperCase().trim().replace(/\s+/g, "")
      const branchId = await createBranch({
        name: formData.name.trim(), code: normalizedCode, address: formData.address.trim(),
        city: formData.city.trim(), country: formData.country.trim(), phoneNumber: formData.phoneNumber.trim(),
        email: formData.email?.trim() || undefined, pricingPerKg: 0, deliveryFee: formData.deliveryFee,
        stationPin: formData.stationPin.trim(), weeklyOrderTarget: formData.weeklyOrderTarget || undefined,
      } as any)
      for (const draft of serviceDrafts) {
        const imageUrl = draft.imageUrl?.startsWith("convex-storage:")
          ? draft.imageUrl.replace("convex-storage:", "") : draft.imageUrl || undefined
        await (createBranchService as any)({
          branchId: branchId as Id<"branches">, name: draft.name, code: draft.code,
          price: draft.price, imageUrl, showOnCustomerSide: draft.showOnCustomerSide,
        })
      }
      toast.success("Branch created successfully!")
      handleCloseDialogs()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create branch")
    }
  }

  const handleUpdateBranch = async () => {
    if (!selectedBranch) return
    if (!formData.name || !formData.code || !formData.address || !formData.city || !formData.phoneNumber) {
      toast.error("Please fill in all required fields"); return
    }
    if (formData.stationPin && formData.stationPin.trim().length < 4) {
      toast.error("Station PIN must be at least 4 characters"); return
    }
    if (!formData.stationPin && !(selectedBranch as any).stationPinHash) {
      toast.error("Station PIN is required. Please enter a PIN for this branch"); return
    }
    try {
      const normalizedCode = formData.code.toUpperCase().trim().replace(/\s+/g, "")
      await updateBranch({
        branchId: selectedBranch._id, name: formData.name.trim(), code: normalizedCode,
        address: formData.address.trim(), city: formData.city.trim(), country: formData.country.trim(),
        phoneNumber: formData.phoneNumber.trim(), email: formData.email?.trim() || undefined,
        deliveryFee: formData.deliveryFee, stationPin: formData.stationPin?.trim() || undefined,
        weeklyOrderTarget: formData.weeklyOrderTarget || undefined,
      } as any)
      toast.success("Branch updated successfully!")
      handleCloseDialogs()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update branch")
    }
  }

  const handleToggleStatus = async (branchId: Id<"branches">) => {
    try {
      await toggleBranchStatus({ branchId })
      toast.success("Branch status updated")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update branch status")
    }
  }

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return
    try {
      await deleteBranch({ branchId: branchToDelete })
      toast.success("Branch deleted successfully")
      setShowDeleteDialog(false); setBranchToDelete(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete branch")
    }
  }

  return (
    <div>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Branches</h1>
          <p className='text-sm sm:text-base text-muted-foreground mt-1'>Manage Rapid Wash locations</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => setIncludeInactive(!includeInactive)}>
            {includeInactive ? "Show Active Only" : "Show All"}
          </Button>
          <Button onClick={handleOpenAddDialog} className='gap-2 w-full sm:w-auto'>
            <Plus className='w-4 h-4 shrink-0' /><span>Add Branch</span>
          </Button>
        </div>
      </div>

      {branches.length === 0 && paginationStatus === "LoadingFirstPage" ? (
        <Card><CardContent className='flex items-center justify-center py-12'><Loader2 className='h-8 w-8 animate-spin text-muted-foreground' /></CardContent></Card>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Building2 className='h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='font-semibold text-lg mb-2'>No branches found</h3>
            <p className='text-muted-foreground mb-4'>{includeInactive ? "No branches in the system" : "No active branches found"}</p>
            <Button onClick={handleOpenAddDialog}><Plus className='w-4 h-4 mr-2' />Add First Branch</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6'>
            {branches.map((branch: Branch) => (
              <Card key={branch._id} className={branch.isActive ? "border-border" : "border-border/50 opacity-60"}>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div className='w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center'>
                      <Building2 className='w-6 h-6 text-primary' />
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant={branch.isActive ? "default" : "secondary"}>{branch.isActive ? "Active" : "Inactive"}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='h-8 w-8'><MoreVertical className='h-4 w-4' /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(branch)}><Edit2 className='h-4 w-4 mr-2' />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(branch._id)}>{branch.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setBranchToDelete(branch._id); setShowDeleteDialog(true) }} className='text-destructive'><Trash2 className='h-4 w-4 mr-2' />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className='text-lg font-bold text-foreground mb-1'>{branch.name}</h3>
                  <p className='text-sm text-muted-foreground flex items-center gap-1 mb-2'><MapPin className='w-3 h-3' />{branch.address}, {branch.city}</p>
                  <p className='text-xs text-muted-foreground mb-2'>Code: {branch.code}</p>
                  <Separator className='my-4' />
                  <div className='space-y-2 text-sm'>
                    {branch.phoneNumber && <div className='flex items-center gap-2 text-muted-foreground'><Phone className='h-3 w-3' /><span>{branch.phoneNumber}</span></div>}
                    {branch.email && <div className='flex items-center gap-2 text-muted-foreground'><Mail className='h-3 w-3' /><span>{branch.email}</span></div>}
                  </div>
                  <Separator className='my-4' />
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Delivery fee:</span>
                    <span className='font-semibold'>&#8373;{branch.deliveryFee.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {hasMore && (
            <div className='flex justify-center mt-6'>
              <Button variant='outline' onClick={() => loadMore(BRANCHES_LIMIT)} disabled={isLoading}>
                {isLoading ? <><Loader2 className='w-4 h-4 mr-2 animate-spin' />Loading...</> : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Add Branch Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>Create a new Rapid Wash branch location</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <BranchFormFields prefix="" formData={formData} setFormData={setFormData} selectedBranch={selectedBranch} />
            <Separator />
            <div>
              <div className='flex items-center gap-2 mb-3'>
                <Tag className='h-4 w-4 text-primary' />
                <Label className='text-base font-semibold'>Services & Pricing</Label>
              </div>
              <p className='text-xs text-muted-foreground mb-3'>Add the services this branch offers. Toggle visibility to control what customers see.</p>
              <ServiceDraftsPanel drafts={serviceDrafts} onChange={setServiceDrafts} generateUploadUrl={generateUploadUrl} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCloseDialogs}>Cancel</Button>
            <Button onClick={handleCreateBranch}>Create Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Branch Dialog ────────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update branch information</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <BranchFormFields prefix="edit-" formData={formData} setFormData={setFormData} selectedBranch={selectedBranch} />
            <Separator />
            <div>
              <div className='flex items-center gap-2 mb-3'>
                <Tag className='h-4 w-4 text-primary' />
                <Label className='text-base font-semibold'>Services & Pricing</Label>
              </div>
              <p className='text-xs text-muted-foreground mb-3'>Manage the services this branch offers. Toggle visibility to control what customers see.</p>
              {selectedBranch && <BranchServicesPanel branchId={selectedBranch._id} />}
            </div>
            <Separator />
            <div>
              <div className='flex items-center gap-2 mb-3'>
                <Cpu className='h-4 w-4 text-primary' />
                <Label className='text-base font-semibold'>Machines</Label>
              </div>
              <p className='text-xs text-muted-foreground mb-3'>
                Configure machines for fault tracking. The display name is what attendants see when reporting a fault.
              </p>
              {selectedBranch && <BranchMachinesPanel branchId={selectedBranch._id} />}
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCloseDialogs}>Cancel</Button>
            <Button onClick={handleUpdateBranch}>Update Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this branch? This action cannot be undone.
              <br /><br />
              <strong>Note:</strong> You cannot delete a branch with active orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBranchToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBranch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminBranches;
