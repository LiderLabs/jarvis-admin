"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import {
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { TransactionTypeBadge } from "./TransactionTypeBadge"
import { User, Package, Eye } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface LoyaltyTransactionsTableRowProps {
  transaction: Doc<"loyaltyTransactions"> & {
    customer?: {
      _id: string
      name?: string
      phoneNumber?: string
      email?: string
    } | null
    order?: {
      _id: string
      orderNumber?: string
    } | null
    adjustedBy?: {
      _id: string
      name?: string
      email?: string
    } | null
  }
  onViewDetails: (transaction: Doc<"loyaltyTransactions">) => void
}

export const LoyaltyTransactionsTableRow = ({
  transaction,
  onViewDetails,
}: LoyaltyTransactionsTableRowProps) => {
  const pointsChange = transaction.points > 0 ? `+${transaction.points}` : `${transaction.points}`
  const isPositive = transaction.points > 0

  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{transaction.customer?.name || "Unknown Customer"}</div>
            {transaction.customer?.phoneNumber && (
              <div className="text-xs text-muted-foreground">
                {transaction.customer.phoneNumber}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <TransactionTypeBadge type={transaction.type} size="sm" />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <span className={cn(
          "font-semibold",
          isPositive ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
        )}>
          {pointsChange}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap font-medium">
        {transaction.balanceAfter}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {transaction.order ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{transaction.order.orderNumber}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground max-w-[200px] truncate">
        {transaction.description || "—"}
      </TableCell>
      {transaction.adjustedBy && (
        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
          {transaction.adjustedBy.name || transaction.adjustedBy.email || "Admin"}
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {format(new Date(transaction.createdAt), "MMM d, yyyy HH:mm")}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(transaction)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          View
        </Button>
      </TableCell>
    </TableRow>
  )
}

