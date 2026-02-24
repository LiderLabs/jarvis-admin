"use client"

import { useState } from "react"
import { usePaginatedQuery, useMutation, useQuery } from "convex/react"
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
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Plus,
  Search,
  Filter,
  Send,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShoppingBag,
  CreditCard,
  Settings,
  RefreshCw,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Doc, Id } from "@jordan6699/washlab-backend/dataModel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const NOTIFICATIONS_LIMIT = 50

const AdminNotifications = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500)
  const [recipientTypeFilter, setRecipientTypeFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [readFilter, setReadFilter] = useState<string>("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] =
    useState<Doc<"notifications"> | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  // Form state for creating notification
  const [formData, setFormData] = useState({
    recipientId: "",
    recipientType: "all" as "customer" | "attendant" | "admin" | "station" | "all",
    title: "",
    message: "",
    type: "info" as
      | "info"
      | "success"
      | "warning"
      | "error"
      | "order"
      | "payment"
      | "system",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    actionUrl: "",
    actionLabel: "",
    entityType: "",
    entityId: "",
  })

  // Get notifications with pagination and filters
  const {
    results: notificationsPages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.notifications.getAllNotifications,
    {
      recipientType:
        recipientTypeFilter !== "all"
          ? (recipientTypeFilter as "customer" | "attendant" | "admin" | "station" | "all")
          : undefined,
      type:
        typeFilter !== "all"
          ? (typeFilter as
              | "info"
              | "success"
              | "warning"
              | "error"
              | "order"
              | "payment"
              | "system")
          : undefined,
      isRead: readFilter === "all" ? undefined : readFilter === "read",
    },
    { initialNumItems: NOTIFICATIONS_LIMIT }
  )

  // Get unread count
  const unreadCount = useQuery(api.notifications.getUnreadCount)

  // Mutations
  const createNotification = useMutation(api.notifications.createNotification)
  const markAsRead = useMutation(api.notifications.markAsRead)
  const markAllAsRead = useMutation(api.notifications.markAllAsRead)
  const deleteNotification = useMutation(
    api.notifications.adminDeleteNotification
  )

  // Flatten all pages into a single array
  const notifications = notificationsPages?.flat() || []

  // Filter by search query (client-side)
  const filteredNotifications = notifications.filter((notification) => {
    if (!debouncedSearchQuery) return true
    const search = debouncedSearchQuery.toLowerCase()
    return (
      notification.title?.toLowerCase().includes(search) ||
      notification.message?.toLowerCase().includes(search) ||
      notification.recipientId?.toLowerCase().includes(search)
    )
  })

  // Check if there are more items to load
  const hasMore = paginationStatus === "CanLoadMore"

  const handleCreateNotification = async () => {
    try {
      if (!formData.title || !formData.message) {
        toast.error("Title and message are required")
        return
      }

      await createNotification({
        recipientId:
          formData.recipientType === "all" ? undefined : formData.recipientId,
        recipientType: formData.recipientType,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
        actionUrl: formData.actionUrl || undefined,
        actionLabel: formData.actionLabel || undefined,
        entityType: formData.entityType || undefined,
        entityId: formData.entityId || undefined,
      })

      toast.success("Notification created successfully")
      setCreateDialogOpen(false)
      setFormData({
        recipientId: "",
        recipientType: "all",
        title: "",
        message: "",
        type: "info",
        priority: "normal",
        actionUrl: "",
        actionLabel: "",
        entityType: "",
        entityId: "",
      })
    } catch (error) {
      toast.error("Failed to create notification")
      console.error(error)
    }
  }

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    try {
      await markAsRead({ notificationId })
      toast.success("Notification marked as read")
    } catch (error) {
      toast.error("Failed to mark notification as read")
      console.error(error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({})
      toast.success("All notifications marked as read")
    } catch (error) {
      toast.error("Failed to mark all as read")
      console.error(error)
    }
  }

  const handleDelete = async (notificationId: Id<"notifications">) => {
    try {
      await deleteNotification({ notificationId })
      toast.success("Notification deleted")
    } catch (error) {
      toast.error("Failed to delete notification")
      console.error(error)
    }
  }

  const handleViewDetails = async (notification: Doc<"notifications">) => {
    setSelectedNotification(notification)
    setDetailsDialogOpen(true)

    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: notification._id })
      } catch (error) {
        // Silently fail - don't show error toast for auto-marking
        console.error("Failed to mark notification as read:", error)
      }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case "warning":
        return <AlertTriangle className='h-4 w-4 text-yellow-500' />
      case "error":
        return <XCircle className='h-4 w-4 text-red-500' />
      case "order":
        return <ShoppingBag className='h-4 w-4 text-blue-500' />
      case "payment":
        return <CreditCard className='h-4 w-4 text-purple-500' />
      case "system":
        return <Settings className='h-4 w-4 text-gray-500' />
      default:
        return <Info className='h-4 w-4 text-blue-500' />
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default"
      case "warning":
        return "secondary"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
            Notifications
          </h1>
          <p className='text-muted-foreground mt-1 text-sm sm:text-base'>
            Manage and send system notifications to users
          </p>
        </div>
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Button
              variant='outline'
              onClick={handleMarkAllAsRead}
              className='gap-2 w-full sm:w-auto'
            >
              <CheckCheck className='h-4 w-4' />
              <span className='hidden sm:inline'>Mark All Read</span>
              <span className='sm:hidden'>Mark All Read ({unreadCount})</span>
              <span className='hidden sm:inline'>({unreadCount})</span>
            </Button>
          )}
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className='gap-2 w-full sm:w-auto'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline'>Create Notification</span>
            <span className='sm:hidden'>Create</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Notifications
            </CardTitle>
            <Bell className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {filteredNotifications.length}
            </div>
            <p className='text-xs text-muted-foreground'>All notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Unread</CardTitle>
            <BellOff className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {filteredNotifications.filter((n) => !n.isRead).length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Unread notifications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Read</CardTitle>
            <CheckCheck className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {filteredNotifications.filter((n) => n.isRead).length}
            </div>
            <p className='text-xs text-muted-foreground'>Read notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>System</CardTitle>
            <Settings className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {filteredNotifications.filter((n) => n.type === "system").length}
            </div>
            <p className='text-xs text-muted-foreground'>
              System notifications
            </p>
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
            Filter notifications by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Search</label>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search notifications...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Recipient Type</label>
              <Select
                value={recipientTypeFilter}
                onValueChange={setRecipientTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder='All recipients' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Recipients</SelectItem>
                  <SelectItem value='attendant'>Attendants</SelectItem>
                  <SelectItem value='admin'>Admins</SelectItem>
                  <SelectItem value='all'>System-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='All types' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Types</SelectItem>
                  <SelectItem value='info'>Info</SelectItem>
                  <SelectItem value='success'>Success</SelectItem>
                  <SelectItem value='warning'>Warning</SelectItem>
                  <SelectItem value='error'>Error</SelectItem>
                  <SelectItem value='order'>Order</SelectItem>
                  <SelectItem value='payment'>Payment</SelectItem>
                  <SelectItem value='system'>System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Status</label>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='All statuses' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Statuses</SelectItem>
                  <SelectItem value='unread'>Unread</SelectItem>
                  <SelectItem value='read'>Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notification List</CardTitle>
          <CardDescription>
            {filteredNotifications.length} notification
            {filteredNotifications.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <Bell className='h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>
                No notifications found
              </h3>
              <p className='text-sm text-muted-foreground'>
                {searchQuery ||
                recipientTypeFilter !== "all" ||
                typeFilter !== "all"
                  ? "Try adjusting your filters to see more results"
                  : "No notifications have been created yet"}
              </p>
            </div>
          ) : (
            <>
              <div className='rounded-md border overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[50px]'>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notification) => (
                      <TableRow
                        key={notification._id}
                        className={`hover:bg-muted/50 ${!notification.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                      >
                        <TableCell>
                          {notification.isRead ? (
                            <CheckCheck className='h-4 w-4 text-muted-foreground' />
                          ) : (
                            <Bell className='h-4 w-4 text-blue-500' />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {getTypeIcon(notification.type)}
                            <Badge
                              variant={getTypeBadgeVariant(notification.type)}
                            >
                              {notification.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col gap-1'>
                            <span className='font-medium'>
                              {notification.title}
                            </span>
                            <span className='text-xs text-muted-foreground line-clamp-1'>
                              {notification.message}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col gap-1'>
                            <Badge variant='outline'>
                              {notification.recipientType}
                            </Badge>
                            {notification.recipientId !== "all" && (
                              <span className='text-xs text-muted-foreground font-mono truncate max-w-[150px]'>
                                {notification.recipientId}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPriorityBadgeVariant(
                              notification.priority
                            )}
                          >
                            {notification.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col gap-1'>
                            <span className='text-sm'>
                              {format(
                                new Date(notification.createdAt),
                                "MMM dd, yyyy"
                              )}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {format(
                                new Date(notification.createdAt),
                                "HH:mm:ss"
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            {!notification.isRead && (
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() =>
                                  handleMarkAsRead(notification._id)
                                }
                                className='gap-2'
                              >
                                <Check className='h-4 w-4' />
                              </Button>
                            )}
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleViewDetails(notification)}
                            >
                              View
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleDelete(notification._id)}
                              className='text-red-600 hover:text-red-700'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
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

      {/* Create Notification Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className='max-w-2xl max-h-[90vh]'>
          <DialogHeader>
            <DialogTitle>Create New Notification</DialogTitle>
            <DialogDescription>
              Send a notification to users, attendants, admins, or all users
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className='max-h-[60vh] pr-4'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label>Recipient Type</Label>
                <Select
                  value={formData.recipientType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      recipientType: value as
                        | "customer"
                        | "attendant"
                        | "admin"
                        | "station"
                        | "all",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Users (System-wide)</SelectItem>
                    <SelectItem value='customer'>Customers</SelectItem>
                    <SelectItem value='attendant'>Attendants</SelectItem>
                    <SelectItem value='station'>Stations</SelectItem>
                    <SelectItem value='admin'>Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recipientType !== "all" && (
                <div className='space-y-2'>
                  <Label>
                    Recipient ID (optional - leave empty for all of this type)
                  </Label>
                  <Input
                    placeholder='User ID (leave empty for all)'
                    value={formData.recipientId}
                    onChange={(e) =>
                      setFormData({ ...formData, recipientId: e.target.value })
                    }
                  />
                </div>
              )}

              <div className='space-y-2'>
                <Label>Title *</Label>
                <Input
                  placeholder='Notification title'
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label>Message *</Label>
                <Textarea
                  placeholder='Notification message'
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: value as
                          | "info"
                          | "success"
                          | "warning"
                          | "error"
                          | "order"
                          | "payment"
                          | "system",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='info'>Info</SelectItem>
                      <SelectItem value='success'>Success</SelectItem>
                      <SelectItem value='warning'>Warning</SelectItem>
                      <SelectItem value='error'>Error</SelectItem>
                      <SelectItem value='order'>Order</SelectItem>
                      <SelectItem value='payment'>Payment</SelectItem>
                      <SelectItem value='system'>System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        priority: value as "low" | "normal" | "high" | "urgent",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='low'>Low</SelectItem>
                      <SelectItem value='normal'>Normal</SelectItem>
                      <SelectItem value='high'>High</SelectItem>
                      <SelectItem value='urgent'>Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label>Action URL (optional)</Label>
                <Input
                  placeholder='/dashboard/orders/123'
                  value={formData.actionUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, actionUrl: e.target.value })
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label>Action Label (optional)</Label>
                <Input
                  placeholder='View Order'
                  value={formData.actionLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, actionLabel: e.target.value })
                  }
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>Entity Type (optional)</Label>
                  <Input
                    placeholder='order'
                    value={formData.entityType}
                    onChange={(e) =>
                      setFormData({ ...formData, entityType: e.target.value })
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <Label>Entity ID (optional)</Label>
                  <Input
                    placeholder='Entity ID'
                    value={formData.entityId}
                    onChange={(e) =>
                      setFormData({ ...formData, entityId: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateNotification} className='gap-2'>
              <Send className='h-4 w-4' />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className='max-w-2xl max-h-[80vh]'>
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              Complete information about this notification
            </DialogDescription>
          </DialogHeader>
          {selectedNotification ? (
            <ScrollArea className='max-h-[60vh] pr-4'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <h4 className='font-semibold text-sm flex items-center gap-2'>
                    {getTypeIcon(selectedNotification.type)}
                    Title
                  </h4>
                  <p className='text-sm'>{selectedNotification.title}</p>
                </div>

                <Separator />

                <div className='space-y-2'>
                  <h4 className='font-semibold text-sm'>Message</h4>
                  <p className='text-sm text-muted-foreground'>
                    {selectedNotification.message}
                  </p>
                </div>

                <Separator />

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-xs text-muted-foreground mb-1'>Type</p>
                    <Badge
                      variant={getTypeBadgeVariant(selectedNotification.type)}
                    >
                      {selectedNotification.type}
                    </Badge>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground mb-1'>
                      Priority
                    </p>
                    <Badge
                      variant={getPriorityBadgeVariant(
                        selectedNotification.priority
                      )}
                    >
                      {selectedNotification.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground mb-1'>
                      Recipient Type
                    </p>
                    <Badge variant='outline'>
                      {selectedNotification.recipientType}
                    </Badge>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground mb-1'>Status</p>
                    <Badge
                      variant={
                        selectedNotification.isRead ? "outline" : "default"
                      }
                    >
                      {selectedNotification.isRead ? "Read" : "Unread"}
                    </Badge>
                  </div>
                </div>

                {selectedNotification.recipientId !== "all" && (
                  <>
                    <Separator />
                    <div className='space-y-2'>
                      <h4 className='font-semibold text-sm'>Recipient ID</h4>
                      <p className='text-sm font-mono break-all'>
                        {selectedNotification.recipientId}
                      </p>
                    </div>
                  </>
                )}

                {selectedNotification.actionUrl && (
                  <>
                    <Separator />
                    <div className='space-y-2'>
                      <h4 className='font-semibold text-sm'>Action</h4>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm'>
                          {selectedNotification.actionLabel || "View"}
                        </span>
                        <span className='text-xs text-muted-foreground font-mono'>
                          {selectedNotification.actionUrl}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {selectedNotification.entityType && (
                  <>
                    <Separator />
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <p className='text-xs text-muted-foreground mb-1'>
                          Entity Type
                        </p>
                        <p className='text-sm'>
                          {selectedNotification.entityType}
                        </p>
                      </div>
                      {selectedNotification.entityId && (
                        <div>
                          <p className='text-xs text-muted-foreground mb-1'>
                            Entity ID
                          </p>
                          <p className='text-sm font-mono break-all'>
                            {selectedNotification.entityId}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-xs text-muted-foreground mb-1'>
                      Created At
                    </p>
                    <p className='text-sm'>
                      {format(new Date(selectedNotification.createdAt), "PPpp")}
                    </p>
                  </div>
                  {selectedNotification.readAt && (
                    <div>
                      <p className='text-xs text-muted-foreground mb-1'>
                        Read At
                      </p>
                      <p className='text-sm'>
                        {format(new Date(selectedNotification.readAt), "PPpp")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminNotifications
