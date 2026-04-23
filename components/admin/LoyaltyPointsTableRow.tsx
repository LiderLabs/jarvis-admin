"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import {
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LoyaltyPointsBadge } from "./LoyaltyPointsBadge"
import { User, Edit } from "lucide-react"
import { format } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface LoyaltyPointsTableRowProps {
  loyaltyPoints: Doc<"loyaltyPoints"> & {
    customer?: {
      _id: string
      name?: string
      phoneNumber?: string
      email?: string
    } | null
  }
  onAdjustPoints: (loyaltyPoints: Doc<"loyaltyPoints"> & { customer?: { _id: string; name?: string; phoneNumber?: string; email?: string } | null }) => void
  onViewTransactions: (customerId: string) => void
}

export const LoyaltyPointsTableRow = ({
  loyaltyPoints,
  onAdjustPoints,
  onViewTransactions,
}: LoyaltyPointsTableRowProps) => {
  const customer = loyaltyPoints.customer
  const initials = customer?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  const freeWashesEarned = Math.floor(loyaltyPoints.totalEarned / 10)
  const currentProgress = loyaltyPoints.points % 10
  const pointsUntilNextReward = 10 - currentProgress

  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{customer?.name || "Unknown Customer"}</div>
            {customer?.email && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                
                {customer.email}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {customer?.phoneNumber ? (
          <div className="flex items-center gap-1.5 text-sm">
            
            {customer.phoneNumber}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <LoyaltyPointsBadge points={loyaltyPoints.points} size="sm" />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        <div className="space-y-1">
          <div className="font-medium text-green-600 dark:text-green-400">
            +{loyaltyPoints.totalEarned}
          </div>
          <div className="text-xs text-muted-foreground">
            Earned
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        <div className="space-y-1">
          <div className="font-medium text-orange-600 dark:text-orange-400">
            -{loyaltyPoints.totalRedeemed}
          </div>
          <div className="text-xs text-muted-foreground">
            Redeemed
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {freeWashesEarned} free {freeWashesEarned === 1 ? "wash" : "washes"}
          </div>
          {pointsUntilNextReward < 10 && (
            <div className="text-xs text-muted-foreground">
              {pointsUntilNextReward} pts to next
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {loyaltyPoints.lastEarnedAt
          ? format(new Date(loyaltyPoints.lastEarnedAt), "MMM d, yyyy")
          : "—"}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewTransactions(customer?._id || "")}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAdjustPoints(loyaltyPoints)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Adjust
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}


