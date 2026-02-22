"use client"

import { Doc } from "@devlider001/washlab-backend/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TransactionTypeBadge } from "./TransactionTypeBadge"
import { User, Package, Calendar, Award, FileText } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface TransactionDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Doc<"loyaltyTransactions">
}

export const TransactionDetailsDialog = ({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailsDialogProps) => {
  const pointsChange = transaction.points > 0 ? `+${transaction.points}` : `${transaction.points}`
  const isPositive = transaction.points > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            View detailed information about this loyalty point transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>Transaction Type</span>
            </div>
            <TransactionTypeBadge type={transaction.type} size="md" />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>Points Change</span>
            </div>
            <div className="text-2xl font-bold">
              <span
                className={cn(
                  isPositive ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                )}
              >
                {pointsChange}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>Balance After</span>
            </div>
            <div className="text-lg font-semibold">{transaction.balanceAfter} points</div>
          </div>

          {transaction.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Description</span>
                </div>
                <p className="text-sm">{transaction.description}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Date & Time</span>
            </div>
            <p className="text-sm">
              {format(new Date(transaction.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

