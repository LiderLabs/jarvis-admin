"use client"

import { useState } from "react"
import { Doc } from "@liderlabs/washlab-backend/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Minus } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@liderlabs/washlab-backend/api"
import { toast } from "sonner"

interface AdjustPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loyaltyPoints: Doc<"loyaltyPoints"> & {
    customer?: {
      _id: string
      name?: string
      phoneNumber?: string
      email?: string
    } | null
  }
}

export const AdjustPointsDialog = ({
  open,
  onOpenChange,
  loyaltyPoints,
}: AdjustPointsDialogProps) => {
  const [points, setPoints] = useState<string>("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adjustPoints = useMutation(api.loyalty.adjustPoints)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!points.trim() || !description.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    const pointsValue = parseInt(points)
    if (isNaN(pointsValue) || pointsValue === 0) {
      toast.error("Please enter a valid number of points")
      return
    }

    setIsSubmitting(true)
    try {
      await adjustPoints({
        customerId: loyaltyPoints.customerId as any,
        points: pointsValue,
        description: description.trim(),
      })

      toast.success(
        `Successfully ${pointsValue > 0 ? "added" : "deducted"} ${Math.abs(pointsValue)} point${Math.abs(pointsValue) === 1 ? "" : "s"}`
      )
      onOpenChange(false)
      setPoints("")
      setDescription("")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to adjust points"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickAdd = (value: number) => {
    setPoints(value.toString())
  }

  const currentBalance = loyaltyPoints.points

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Loyalty Points</DialogTitle>
          <DialogDescription>
            Add or deduct points for {loyaltyPoints.customer?.name || "this customer"}. Current balance: {currentBalance} points.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="points">Points Adjustment *</Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Enter positive to add, negative to deduct"
              required
            />
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(1)}
                className="flex-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                +1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(5)}
                className="flex-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                +5
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(10)}
                className="flex-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                +10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(-1)}
                className="flex-1"
              >
                <Minus className="h-3.5 w-3.5 mr-1.5" />
                -1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(-5)}
                className="flex-1"
              >
                <Minus className="h-3.5 w-3.5 mr-1.5" />
                -5
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              New balance will be: {points ? (currentBalance + parseInt(points) || 0) : currentBalance} points
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Reason *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter reason for adjustment..."
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adjusting...
                </>
              ) : (
                "Adjust Points"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

