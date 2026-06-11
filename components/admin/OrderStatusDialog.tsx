"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { OrderStatusBadge } from "./OrderStatusBadge"
import { ArrowRight } from "lucide-react"
import { useState } from "react"

interface OrderStatusDialogProps {
  order: Doc<"orders"> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (orderId: string, newStatus: string, notes?: string) => void
  isLoading?: boolean
}

const statusOptions: Array<{
  value: string
  label: string
}> = [
  { value: "pending_dropoff", label: "Pending Dropoff" },
  { value: "checked_in", label: "Checked In" },
  { value: "sorting", label: "Sorting" },
  { value: "washing", label: "Washing" },
  { value: "drying", label: "Drying" },
  { value: "folding", label: "Folding" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  // Legacy statuses
  { value: "pending", label: "Pending (Legacy)" },
  { value: "in_progress", label: "In Progress (Legacy)" },
  { value: "ready_for_pickup", label: "Ready for Pickup (Legacy)" },
  { value: "delivered", label: "Delivered (Legacy)" },
]

export const OrderStatusDialog = ({
  order,
  open,
  onOpenChange,
  onUpdate,
  isLoading = false,
}: OrderStatusDialogProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(
    order?.status || "pending"
  )
  const [notes, setNotes] = useState("")

  const handleSubmit = () => {
    if (!order || !selectedStatus) return
    onUpdate(order._id, selectedStatus, notes.trim() || undefined)
    setNotes("")
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change the status for order {order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div>
            <Label>Current Status</Label>
            <div className="mt-2">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* New Status */}
          <div>
            <Label htmlFor="status">New Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={isLoading}
            >
              <SelectTrigger id="status" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedStatus}>
            {isLoading ? "Updating..." : "Update Status"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

