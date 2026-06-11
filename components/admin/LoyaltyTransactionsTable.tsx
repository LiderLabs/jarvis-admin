"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LoyaltyTransactionsTableRow } from "./LoyaltyTransactionsTableRow"
import { Loader2, History } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface LoyaltyTransactionsTableProps {
  transactions: (Doc<"loyaltyTransactions"> & {
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
  })[]
  isLoading?: boolean
  showAdjuster?: boolean
  onViewDetails: (transaction: Doc<"loyaltyTransactions">) => void
}

export const LoyaltyTransactionsTable = ({
  transactions,
  isLoading = false,
  showAdjuster = false,
  onViewDetails,
}: LoyaltyTransactionsTableProps) => {
  if (isLoading && transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No transactions found</h3>
          <p className="text-muted-foreground text-center">
            No loyalty point transactions match your criteria
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] whitespace-nowrap">Customer</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Type</TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Points</TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Balance After</TableHead>
              <TableHead className="w-[140px] whitespace-nowrap">Order</TableHead>
              <TableHead className="w-[200px] whitespace-nowrap">Description</TableHead>
              {showAdjuster && (
                <TableHead className="w-[150px] whitespace-nowrap">Adjusted By</TableHead>
              )}
              <TableHead className="w-[150px] whitespace-nowrap">Date</TableHead>
              <TableHead className="w-[80px] text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <LoyaltyTransactionsTableRow
                key={transaction._id}
                transaction={transaction}
                onViewDetails={onViewDetails}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

