"use client"

import { useState } from "react"
import {
  useQuery,
  useMutation,
  useConvexAuth,
  usePaginatedQuery,
} from "convex/react"
import { api } from "@liderlabs/washlab-backend/api"
import { Id } from "@liderlabs/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Users,
  UserPlus,
  Copy,
  Mail,
  Phone,
  MessageSquare,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Lock,
  MoreVertical,
  Shield,
  ShieldOff,
  Unlock,
  Ban,
  RotateCcw,
  LogOut,
  Building2,
} from "lucide-react"

interface Attendant {
  id: Id<"attendants">
  name: string
  email: string
  phoneNumber: string
  branchId: Id<"branches">
  branchIds?: Id<"branches">[]
  enrollmentStatus:
    | "invited"
    | "enrolling"
    | "biometric_complete"
    | "active"
    | "suspended"
    | "locked"
  enrolledAt?: number
  enrollmentTokenExpiresAt?: number
  lastVerificationAt?: number
  consecutiveFailures: number
  createdAt: number
}

interface Branch {
  _id: Id<"branches">
  name: string
  code: string
}

const AdminStaff = () => {
  const { isAuthenticated } = useConvexAuth()
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<Attendant["enrollmentStatus"] | undefined>(undefined)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [createdLink, setCreatedLink] = useState<{ link: string; token: string; expiresAt: number } | null>(null)
  const [resendingId, setResendingId] = useState<Id<"attendants"> | null>(null)
  const [pendingLinks, setPendingLinks] = useState<Map<Id<"attendants">, { link: string; expiresAt: number }>>(new Map())

  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "suspend" | "activate" | "lock" | "reset" | "revoke" | "delete" | "password_reset" | null
    attendant: Attendant | null
  }>({ open: false, type: null, attendant: null })
  const [actionReason, setActionReason] = useState("")
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Multi-branch access dialog state
  const [branchAccessDialog, setBranchAccessDialog] = useState<{
    open: boolean
    attendant: Attendant | null
  }>({ open: false, attendant: null })
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set())
  const [isSavingBranchAccess, setIsSavingBranchAccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    branchId: "" as string,
    expiresInHours: 72,
  })

  const { results: branchesPages } = usePaginatedQuery(
    api.admin.getBranches,
    isAuthenticated ? { includeInactive: false } : "skip",
    { initialNumItems: 100 }
  )
  const branches = branchesPages?.flat() || []

  const statusForQuery: Exclude<Attendant["enrollmentStatus"], "biometric_complete"> | undefined =
    selectedStatus === "biometric_complete" ? undefined : selectedStatus

  const attendants =
    useQuery(
      api.admin.listAttendantEnrollments,
      isAuthenticated ? { branchId: selectedBranch, status: statusForQuery } : "skip"
    ) || []

  const getBranchName = (branchId: Id<"branches">) => {
    if (!branches || branches.length === 0) return "Unknown Branch"
    const branch = branches.find((b: Branch) => b._id === branchId)
    return branch?.name || "Unknown Branch"
  }

  const createEnrollment = useMutation(api.admin.createAttendantEnrollment)
  const resendLink = useMutation(api.admin.resendEnrollmentLink)
  const suspendAttendant = useMutation(api.admin.suspendAttendant)
  const activateAttendant = useMutation(api.admin.activateAttendant)
  const lockAttendant = useMutation(api.admin.lockAttendant)
  const resetFailures = useMutation(api.admin.resetAttendantFailures)
  const revokeSessions = useMutation(api.admin.revokeAttendantSessions)
  const updateAttendant = useMutation(api.admin.updateAttendant)
  const deleteAttendant = useMutation(api.admin.deleteAttendant)
  const sendPasswordReset = useMutation((api as any).admin.sendAttendantPasswordReset)
  // This mutation needs to be added to your backend:
  // api.admin.updateAttendantBranchAccess({ attendantId, branchIds })
  const updateBranchAccess = useMutation((api as any).admin.updateAttendantBranchAccess)

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message
    if (typeof error === "string") return error
    if (typeof error === "object" && error !== null && "message" in error) return String(error.message)
    if (typeof error === "object" && error !== null && "data" in error && typeof error.data === "object" && error.data !== null && "message" in error.data) return String(error.data.message)
    return "An unexpected error occurred. Please try again."
  }

  const resetForm = () => {
    setFormData({ name: "", email: "", phoneNumber: "", branchId: branches[0]?._id || "", expiresInHours: 72 })
  }

  const handleOpenCreateDialog = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const handleCreateEnrollment = async () => {
    if (!formData.name || !formData.email || !formData.phoneNumber || !formData.branchId) {
      toast.error("Please fill in all required fields")
      return
    }
    if (!formData.branchId || formData.branchId.trim() === "") {
      toast.error("Please select a valid branch")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address")
      return
    }
    const phoneRegex = /^(?:\+233|0)[0-9]{9}$/
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s+/g, ""))) {
      toast.error("Please enter a valid phone number (e.g., 0201234567 or +233201234567)")
      return
    }
    const selectedBranchObj = branches.find((b: Branch) => b._id === formData.branchId)
    if (!selectedBranchObj) {
      toast.error("Selected branch not found. Please refresh and try again.")
      return
    }
    try {
      const result = await createEnrollment({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        branchId: formData.branchId as Id<"branches">,
        expiresInHours: formData.expiresInHours,
      })
      setCreatedLink({ link: result.enrollmentLink, token: result.enrollmentToken, expiresAt: result.expiresAt })
      resetForm()
      setShowCreateDialog(false)
      setShowLinkDialog(true)
      toast.success("Enrollment link created successfully!")
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
        toast.error("An attendant with this email already exists")
      } else if (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("inactive") || errorMessage.toLowerCase().includes("branch")) {
        toast.error("The selected branch is not available. Please select a different branch.")
      } else if (errorMessage.toLowerCase().includes("authentication") || errorMessage.toLowerCase().includes("unauthorized")) {
        toast.error("Authentication required. Please refresh the page and try again.")
      } else if (errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("forbidden")) {
        toast.error("You don't have permission to perform this action.")
      } else {
        toast.error(errorMessage || "Failed to create enrollment link. Please try again.")
      }
    }
  }

  const handleResendLink = async (attendantId: Id<"attendants">) => {
    setResendingId(attendantId)
    try {
      const result = await resendLink({ attendantId, expiresInHours: 72 })
      setCreatedLink({ link: result.enrollmentLink, token: result.enrollmentToken, expiresAt: result.expiresAt })
      setPendingLinks(new Map(pendingLinks.set(attendantId, { link: result.enrollmentLink, expiresAt: result.expiresAt })))
      setShowLinkDialog(true)
      toast.success("Enrollment link resent successfully!")
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      if (errorMessage.toLowerCase().includes("already enrolled") || errorMessage.toLowerCase().includes("active")) {
        toast.error("This attendant is already enrolled and active.")
      } else if (errorMessage.toLowerCase().includes("not found")) {
        toast.error("Attendant not found. Please refresh the page and try again.")
      } else {
        toast.error(errorMessage || "Failed to resend enrollment link. Please try again.")
      }
    } finally {
      setResendingId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard!")
    } catch (error: unknown) {
      toast.error(`Failed to copy: ${getErrorMessage(error)}`)
    }
  }

  const openActionDialog = (
    type: "suspend" | "activate" | "lock" | "reset" | "revoke" | "delete" | "password_reset",
    attendant: Attendant
  ) => {
    setActionDialog({ open: true, type, attendant })
    setActionReason("")
  }

  const closeActionDialog = () => {
    setActionDialog({ open: false, type: null, attendant: null })
    setActionReason("")
  }

  // Open the branch access dialog for a specific attendant
  const openBranchAccessDialog = (attendant: Attendant) => {
    // Pre-select: home branch + any already granted branches
    const existing = new Set<string>([
      attendant.branchId as string,
      ...(attendant.branchIds?.map((id) => id as string) ?? []),
    ])
    setSelectedBranchIds(existing)
    setBranchAccessDialog({ open: true, attendant })
  }

  const toggleBranchSelection = (branchId: string, isHomeBranch: boolean) => {
    // Home branch cannot be deselected
    if (isHomeBranch) return
    setSelectedBranchIds((prev) => {
      const next = new Set(prev)
      if (next.has(branchId)) {
        next.delete(branchId)
      } else {
        next.add(branchId)
      }
      return next
    })
  }

  const handleSaveBranchAccess = async () => {
    if (!branchAccessDialog.attendant) return
    setIsSavingBranchAccess(true)
    try {
      await updateBranchAccess({
        attendantId: branchAccessDialog.attendant.id,
        branchIds: Array.from(selectedBranchIds) as Id<"branches">[],
      })
      toast.success(`Branch access updated for ${branchAccessDialog.attendant.name}`)
      setBranchAccessDialog({ open: false, attendant: null })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to update branch access")
    } finally {
      setIsSavingBranchAccess(false)
    }
  }

  const handleAction = async () => {
    if (!actionDialog.attendant || !actionDialog.type) return
    setIsActionLoading(true)
    try {
      const attendantId = actionDialog.attendant.id
      let result
      switch (actionDialog.type) {
        case "suspend":
          result = await suspendAttendant({ attendantId, reason: actionReason.trim() || undefined })
          toast.success(`${actionDialog.attendant.name} has been suspended successfully`)
          break
        case "activate":
          result = await activateAttendant({ attendantId, reason: actionReason.trim() || undefined })
          toast.success(`${actionDialog.attendant.name} has been activated successfully`)
          break
        case "lock":
          result = await lockAttendant({ attendantId, reason: actionReason.trim() || undefined })
          toast.success(`${actionDialog.attendant.name} has been locked successfully`)
          break
        case "reset":
          result = await resetFailures({ attendantId, reason: actionReason.trim() || undefined })
          toast.success(`Verification failures reset for ${actionDialog.attendant.name}`)
          break
        case "revoke":
          result = await revokeSessions({ attendantId, reason: actionReason.trim() || undefined })
          toast.success(`${result.sessionsRevoked || 0} session(s) revoked for ${actionDialog.attendant.name}`)
          break
        case "delete":
          result = await deleteAttendant({ attendantId })
          toast.success(`${actionDialog.attendant.name} has been deleted successfully`)
          break
        case "password_reset":
          result = await sendPasswordReset({ attendantId })
          const attendantPhone = actionDialog.attendant.phoneNumber
          const attendantName = actionDialog.attendant.name
          const resetUrl = "https://staging.attendant.washlab.app/sign-in"
          const resetMsg = `Hi ${attendantName}! 👋\n\nYour Javis password reset has been initiated.\n\nPlease follow these steps:\n1. Go to: ${resetUrl}\n2. Click *"Forgot Password"*\n3. Enter your email: ${actionDialog.attendant.email}\n4. Check your email for the reset link\n\nIf you need help, contact your branch manager.`
          const formattedPhone = attendantPhone.startsWith("+") ? attendantPhone.slice(1) : attendantPhone.startsWith("0") ? `233${attendantPhone.slice(1)}` : attendantPhone
          const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(resetMsg)}`
          window.open(waUrl, "_blank")
          toast.success(`Password reset sent & WhatsApp opened for ${attendantName}`)
          break
      }
      closeActionDialog()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to perform action. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  const sendWhatsApp = (phone: string, link: string, name: string, branchName: string) => {
    try {
      const message = `Hi ${name}! 👋\n\nYou've been invited to enroll as an attendant at *Javis ${branchName}*.\n\nPlease complete your biometric enrollment by clicking this link:\n\n${link}\n\nThis link will expire in 72 hours.`
      const formattedPhone = phone.startsWith("+") ? phone.slice(1) : phone.startsWith("0") ? `233${phone.slice(1)}` : phone
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      const whatsappWindow = window.open(url, "_blank")
      if (!whatsappWindow) toast.error("Popup blocked. Please allow popups for this site and try again.")
    } catch (error: unknown) {
      toast.error(`Failed to open WhatsApp: ${getErrorMessage(error)}`)
      throw error
    }
  }

  const getStatusBadge = (status: Attendant["enrollmentStatus"]) => {
    const statusConfig = {
      invited: { label: "Invited", icon: Mail, className: "bg-blue-100 text-blue-700 border-blue-200" },
      enrolling: { label: "Enrolling", icon: Clock, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      biometric_complete: { label: "Biometric Complete", icon: CheckCircle2, className: "bg-blue-100 text-blue-700 border-blue-200" },
      active: { label: "Active", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
      suspended: { label: "Suspended", icon: AlertCircle, className: "bg-orange-100 text-orange-700 border-orange-200" },
      locked: { label: "Locked", icon: Lock, className: "bg-red-100 text-red-700 border-red-200" },
    }
    const config = statusConfig[status] || statusConfig.invited
    const Icon = config.icon
    return (
      <Badge className={`${config.className} border gap-1.5`} variant='outline'>
        <Icon className='w-3 h-3' />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const isLinkExpired = (expiresAt?: number) => {
    if (!expiresAt) return false
    return Date.now() > expiresAt
  }

  const filteredAttendants = selectedStatus
    ? attendants.filter((attendant: Attendant) => attendant.enrollmentStatus === selectedStatus)
    : attendants

  return (
    <div>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Staff Management</h1>
          <p className='text-sm sm:text-base text-muted-foreground mt-1'>Manage staff enrollment and biometric setup</p>
        </div>
        <Button onClick={handleOpenCreateDialog} className='gap-2 w-full sm:w-auto'>
          <UserPlus className='w-4 h-4' />
          Create Enrollment
        </Button>
      </div>

      {/* Filters */}
      <div className='bg-card rounded-lg border border-border p-4 mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <Label className='mb-2 block'>Filter by Branch</Label>
            <Select
              value={selectedBranch || "all"}
              onValueChange={(value) => setSelectedBranch(value === "all" ? undefined : (value as Id<"branches">))}
            >
              <SelectTrigger>
                <SelectValue placeholder='All branches' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Branches</SelectItem>
                {branches && branches.length > 0
                  ? branches.map((branch: Branch) => (
                      <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className='mb-2 block'>Filter by Status</Label>
            <Select
              value={selectedStatus || "all"}
              onValueChange={(value) =>
                setSelectedStatus(value === "all" ? undefined : (value as Attendant["enrollmentStatus"]))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='All statuses' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value='invited'>Invited</SelectItem>
                <SelectItem value='active'>Active</SelectItem>
                <SelectItem value='suspended'>Suspended</SelectItem>
                <SelectItem value='locked'>Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <div className='bg-card rounded-lg border border-border p-4'>
          <div className='text-2xl font-bold text-foreground'>{attendants.length}</div>
          <div className='text-sm text-muted-foreground'>Total Staff</div>
        </div>
        <div className='bg-card rounded-lg border border-border p-4'>
          <div className='text-2xl font-bold text-blue-600'>
            {attendants.filter((a: Attendant) => a.enrollmentStatus === "invited").length}
          </div>
          <div className='text-sm text-muted-foreground'>Invited</div>
        </div>
        <div className='bg-card rounded-lg border border-border p-4'>
          <div className='text-2xl font-bold text-green-600'>
            {attendants.filter((a: Attendant) => a.enrollmentStatus === "active").length}
          </div>
          <div className='text-sm text-muted-foreground'>Active</div>
        </div>
        <div className='bg-card rounded-lg border border-border p-4'>
          <div className='text-2xl font-bold text-red-600'>
            {attendants.filter((a: Attendant) => a.enrollmentStatus === "locked" || a.enrollmentStatus === "suspended").length}
          </div>
          <div className='text-sm text-muted-foreground'>Locked/Suspended</div>
        </div>
      </div>

      {/* Staff Table */}
      <div className='bg-card rounded-xl border border-border overflow-hidden'>
        {!isAuthenticated ? (
          <div className='p-8 text-center text-muted-foreground'>
            <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2' />
            Authenticating...
          </div>
        ) : filteredAttendants.length === 0 ? (
          <div className='p-8 text-center text-muted-foreground'>
            <Users className='w-12 h-12 mx-auto mb-4 opacity-50' />
            <p className='text-lg font-medium mb-1'>No staff members found</p>
            <p className='text-sm'>Create an enrollment link to get started</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='text-left p-4 font-semibold text-foreground'>Staff</th>
                  <th className='text-left p-4 font-semibold text-foreground'>Home Branch</th>
                  <th className='text-left p-4 font-semibold text-foreground'>Branch Access</th>
                  <th className='text-left p-4 font-semibold text-foreground'>Status</th>
                  <th className='text-left p-4 font-semibold text-foreground'>Enrollment</th>
                  <th className='text-left p-4 font-semibold text-foreground text-nowrap'>Last Activity</th>
                  <th className='text-left p-4 font-semibold text-foreground'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendants.map((attendant: Attendant) => {
                  // Extra branches beyond home branch
                  const extraBranches = (attendant.branchIds ?? []).filter(
                    (id) => id !== attendant.branchId
                  )
                  return (
                    <tr key={attendant.id} className='border-t border-border hover:bg-muted/30 transition-colors'>
                      <td className='p-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                            <Users className='w-5 h-5 text-primary' />
                          </div>
                          <div>
                            <p className='font-semibold text-foreground'>{attendant.name}</p>
                            <div className='flex flex-col gap-0.5 text-sm text-muted-foreground mt-0.5'>
                              <span className='flex items-center gap-1'>{attendant.email}</span>
                              <span className='flex items-center gap-1'>{attendant.phoneNumber}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Home branch */}
                      <td className='p-4 text-foreground text-nowrap'>
                        <div className='flex items-center gap-1.5'>
                          {getBranchName(attendant.branchId)}
                        </div>
                      </td>

                      {/* Extra branch access */}
                      <td className='p-4'>
                        {extraBranches.length === 0 ? (
                          <span className='text-xs text-muted-foreground'>Home only</span>
                        ) : (
                          <div className='flex flex-wrap gap-1'>
                            {extraBranches.map((id) => (
                              <Badge key={id as string} variant='secondary' className='text-[10px] gap-1'>
                                <Building2 className='w-2.5 h-2.5' />
                                {getBranchName(id)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className='p-4'>
                        {getStatusBadge(attendant.enrollmentStatus)}
                        {attendant.consecutiveFailures > 0 && (
                          <div className='text-xs text-muted-foreground mt-1'>
                            {attendant.consecutiveFailures} failed attempt{attendant.consecutiveFailures !== 1 ? "s" : ""}
                          </div>
                        )}
                      </td>
                      <td className='p-4 text-sm text-muted-foreground text-nowrap'>
                        {attendant.enrolledAt ? (
                          <div className='flex items-center gap-1 text-green-600'>
                            <CheckCircle2 className='w-3 h-3' />
                            Enrolled {formatDate(attendant.enrolledAt)}
                          </div>
                        ) : attendant.enrollmentTokenExpiresAt ? (
                          isLinkExpired(attendant.enrollmentTokenExpiresAt) ? (
                            <div className='flex items-center gap-1 text-red-600'>
                              <XCircle className='w-3 h-3' />
                              Expired
                            </div>
                          ) : (
                            <div className='flex items-center gap-1 text-yellow-600'>
                              <Clock className='w-3 h-3' />
                              Expires {formatDate(attendant.enrollmentTokenExpiresAt)}
                            </div>
                          )
                        ) : (
                          <span>No enrollment link</span>
                        )}
                      </td>
                      <td className='p-4 text-sm text-muted-foreground'>
                        {attendant.lastVerificationAt ? formatDate(attendant.lastVerificationAt) : "Never"}
                      </td>
                      <td className='p-4'>
                        <div className='flex items-center gap-2'>
                          {attendant.enrollmentStatus !== "active" && (
                            <>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleResendLink(attendant.id)}
                                disabled={resendingId === attendant.id}
                                className='gap-1'
                              >
                                {resendingId === attendant.id ? <Loader2 className='w-3 h-3 animate-spin' /> : <RefreshCw className='w-3 h-3' />}
                                Resend
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={async () => {
                                  const storedLink = pendingLinks.get(attendant.id)
                                  if (storedLink && !isLinkExpired(storedLink.expiresAt)) {
                                    try { sendWhatsApp(attendant.phoneNumber, storedLink.link, attendant.name, getBranchName(attendant.branchId)) }
                                    catch (error: unknown) { toast.error(`Failed to open WhatsApp: ${getErrorMessage(error)}`) }
                                  } else {
                                    try {
                                      setResendingId(attendant.id)
                                      const result = await resendLink({ attendantId: attendant.id, expiresInHours: 72 })
                                      const newLink = { link: result.enrollmentLink, expiresAt: result.expiresAt }
                                      setPendingLinks(new Map(pendingLinks.set(attendant.id, newLink)))
                                      sendWhatsApp(attendant.phoneNumber, result.enrollmentLink, attendant.name, getBranchName(attendant.branchId))
                                      toast.success("Link resent and opened in WhatsApp")
                                    } catch (error: unknown) {
                                      toast.error(getErrorMessage(error) || "Failed to resend link. Please try again.")
                                    } finally {
                                      setResendingId(null)
                                    }
                                  }
                                }}
                                disabled={resendingId === attendant.id}
                                className='gap-1 text-green-600 border-green-600 hover:bg-green-50'
                              >
                                {resendingId === attendant.id ? <Loader2 className='w-3 h-3 animate-spin' /> : <MessageSquare className='w-3 h-3' />}
                                WhatsApp
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='outline' size='sm'><MoreVertical className='w-4 h-4' /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-52'>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Branch Access — always visible */}
                              <DropdownMenuItem onClick={() => openBranchAccessDialog(attendant)} className='text-blue-600'>
                                <Building2 className='w-4 h-4 mr-2' />Manage Branch Access
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {attendant.enrollmentStatus === "active" && (
                                <>
                                  <DropdownMenuItem onClick={() => openActionDialog("suspend", attendant)} className='text-orange-600'>
                                    <ShieldOff className='w-4 h-4 mr-2' />Suspend
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openActionDialog("lock", attendant)} className='text-red-600'>
                                    <Lock className='w-4 h-4 mr-2' />Lock
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(attendant.enrollmentStatus === "suspended" || attendant.enrollmentStatus === "locked") && (
                                <DropdownMenuItem onClick={() => openActionDialog("activate", attendant)} className='text-green-600'>
                                  <Shield className='w-4 h-4 mr-2' />Activate
                                </DropdownMenuItem>
                              )}
                              {attendant.consecutiveFailures > 0 && (
                                <DropdownMenuItem onClick={() => openActionDialog("reset", attendant)} className='text-blue-600'>
                                  <RotateCcw className='w-4 h-4 mr-2' />Reset Failures
                                </DropdownMenuItem>
                              )}
                              {attendant.enrollmentStatus === "active" && (
                                <DropdownMenuItem onClick={() => openActionDialog("revoke", attendant)} className='text-amber-600'>
                                  <LogOut className='w-4 h-4 mr-2' />Revoke Sessions
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openActionDialog("password_reset", attendant)} className='text-blue-600'>
                                <Lock className='w-4 h-4 mr-2' />Send Password Reset
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActionDialog("delete", attendant)} className='text-red-600'>
                                <Ban className='w-4 h-4 mr-2' />Delete Attendant
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Branch Access Dialog ──────────────────────────────────────────────── */}
      <Dialog open={branchAccessDialog.open} onOpenChange={(open) => { if (!open) setBranchAccessDialog({ open: false, attendant: null }) }}>
        <DialogContent className='sm:max-w-[440px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Building2 className='w-5 h-5 text-primary' />
              Manage Branch Access
            </DialogTitle>
            <DialogDescription>
              {branchAccessDialog.attendant?.name} can log in and work at any branch ticked below.
              Their home branch is always included.
            </DialogDescription>
          </DialogHeader>

          <div className='py-2 space-y-2 max-h-72 overflow-y-auto'>
            {branches.map((branch: Branch) => {
              const isHome = branch._id === branchAccessDialog.attendant?.branchId
              const isChecked = selectedBranchIds.has(branch._id as string)
              return (
                <label
                  key={branch._id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors
                    ${isChecked ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-muted/40'}
                    ${isHome ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isHome}
                    onCheckedChange={() => toggleBranchSelection(branch._id as string, isHome)}
                  />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-foreground'>{branch.name}</p>
                    <p className='text-xs text-muted-foreground'>{branch.code}</p>
                  </div>
                  {isHome && (
                    <Badge variant='secondary' className='text-[10px] shrink-0'>Home</Badge>
                  )}
                  {isChecked && !isHome && (
                    <Badge className='text-[10px] bg-primary/10 text-primary border-primary/20 shrink-0' variant='outline'>
                      Access granted
                    </Badge>
                  )}
                </label>
              )
            })}
          </div>

          <div className='pt-2 border-t text-xs text-muted-foreground'>
            {selectedBranchIds.size - 1 > 0
              ? `${selectedBranchIds.size - 1} additional branch${selectedBranchIds.size - 1 !== 1 ? 'es' : ''} granted`
              : 'Home branch only — no additional access'}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setBranchAccessDialog({ open: false, attendant: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveBranchAccess} disabled={isSavingBranchAccess}>
              {isSavingBranchAccess && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              Save Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Enrollment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Create Enrollment Link</DialogTitle>
            <DialogDescription>Create a new biometric enrollment link for an attendant.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div>
              <Label htmlFor='name'>Full Name *</Label>
              <Input id='name' value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder='John Doe' className='mt-1' />
            </div>
            <div>
              <Label htmlFor='email'>Email Address *</Label>
              <Input id='email' type='email' value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder='john.doe@example.com' className='mt-1' />
            </div>
            <div>
              <Label htmlFor='phone'>Phone Number *</Label>
              <Input id='phone' type='tel' value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder='0201234567 or +233201234567' className='mt-1' />
            </div>
            <div>
              <Label htmlFor='branch'>Branch *</Label>
              <Select
                value={formData.branchId || undefined}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                disabled={!branches || branches.length === 0}
              >
                <SelectTrigger className='mt-1'>
                  <SelectValue placeholder={branches && branches.length > 0 ? "Select a branch" : "Loading branches..."} />
                </SelectTrigger>
                <SelectContent>
                  {branches && branches.length > 0 && branches.map((branch: Branch) => (
                    <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor='expires'>Link Expires In (Hours)</Label>
              <Input id='expires' type='number' min='1' max='168' value={formData.expiresInHours} onChange={(e) => setFormData({ ...formData, expiresInHours: parseInt(e.target.value) || 72 })} className='mt-1' />
              <p className='text-xs text-muted-foreground mt-1'>Default: 72 hours (3 days)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateEnrollment}>Create Enrollment Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollment Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Enrollment Link Created</DialogTitle>
            <DialogDescription>Share this link with the attendant to complete biometric enrollment.</DialogDescription>
          </DialogHeader>
          {createdLink && (
            <div className='space-y-4 py-4'>
              <div className='bg-muted rounded-lg p-4'>
                <Label className='text-xs text-muted-foreground mb-2 block'>Enrollment Link</Label>
                <div className='flex items-center gap-2'>
                  <Input value={createdLink.link} readOnly className='font-mono text-sm' />
                  <Button variant='outline' size='sm' onClick={() => copyToClipboard(createdLink.link)}><Copy className='w-4 h-4' /></Button>
                </div>
              </div>
              <div className='bg-amber-50 border border-amber-200 rounded-lg p-3'>
                <p className='text-sm text-amber-800'>
                  <strong>Important:</strong> This link will expire on {formatDate(createdLink.expiresAt)}.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => { setShowLinkDialog(false); setCreatedLink(null) }}>Close</Button>
            {createdLink && (
              <Button onClick={() => copyToClipboard(createdLink.link)}><Copy className='w-4 h-4 mr-2' />Copy Link</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => { if (!open) closeActionDialog() }}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "suspend" && "Suspend Attendant"}
              {actionDialog.type === "activate" && "Activate Attendant"}
              {actionDialog.type === "lock" && "Lock Attendant"}
              {actionDialog.type === "reset" && "Reset Verification Failures"}
              {actionDialog.type === "revoke" && "Revoke All Sessions"}
              {actionDialog.type === "delete" && "Delete Attendant"}
              {actionDialog.type === "password_reset" && "Send Password Reset"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "suspend" && `Are you sure you want to suspend ${actionDialog.attendant?.name}? They will be unable to log in until reactivated.`}
              {actionDialog.type === "activate" && `Activate ${actionDialog.attendant?.name}? This will allow them to log in again.`}
              {actionDialog.type === "lock" && `Are you sure you want to lock ${actionDialog.attendant?.name}? This will prevent them from logging in.`}
              {actionDialog.type === "reset" && `Reset verification failures for ${actionDialog.attendant?.name}? This will clear the consecutive failure count.`}
              {actionDialog.type === "revoke" && `Revoke all active sessions for ${actionDialog.attendant?.name}? They will need to log in again.`}
              {actionDialog.type === "delete" && `Are you sure you want to delete ${actionDialog.attendant?.name}? This action cannot be undone.`}
              {actionDialog.type === "password_reset" && `Send a password reset email to ${actionDialog.attendant?.email}. They will receive a link to set a new password.`}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div>
              <Label htmlFor='reason'>Reason {actionDialog.type === "delete" ? "(Required)" : "(Optional)"}</Label>
              <Textarea
                id='reason'
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder='Enter a reason for this action...'
                className='mt-1 min-h-[100px]'
                required={actionDialog.type === "delete"}
              />
              {(actionDialog.type === "suspend" || actionDialog.type === "lock" || actionDialog.type === "revoke") && (
                <p className='text-xs text-muted-foreground mt-1'>All active sessions will be invalidated.</p>
              )}
              {actionDialog.type === "delete" && (
                <p className='text-xs text-red-600 mt-1'>This will permanently delete the attendant record. Use with caution.</p>
              )}
            </div>
            {actionDialog.attendant && (
              <div className='bg-muted rounded-lg p-3 space-y-1 text-sm'>
                <div className='font-semibold'>Attendant Details:</div>
                <div>Name: {actionDialog.attendant.name}</div>
                <div>Email: {actionDialog.attendant.email}</div>
                <div>Status: {actionDialog.attendant.enrollmentStatus}</div>
                {actionDialog.attendant.consecutiveFailures > 0 && (
                  <div className='text-orange-600'>Failures: {actionDialog.attendant.consecutiveFailures}</div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={closeActionDialog} disabled={isActionLoading}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={isActionLoading || (actionDialog.type === "delete" && !actionReason.trim())}
              variant={actionDialog.type === "delete" ? "destructive" : "default"}
              className={actionDialog.type === "suspend" || actionDialog.type === "lock" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              {isActionLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              {actionDialog.type === "suspend" && "Suspend"}
              {actionDialog.type === "activate" && "Activate"}
              {actionDialog.type === "lock" && "Lock"}
              {actionDialog.type === "reset" && "Reset"}
              {actionDialog.type === "revoke" && "Revoke"}
              {actionDialog.type === "delete" && "Delete"}
              {actionDialog.type === "password_reset" && "Send Reset Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminStaff
