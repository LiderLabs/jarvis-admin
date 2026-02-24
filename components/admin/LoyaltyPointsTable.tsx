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
import { LoyaltyPointsTableRow } from "./LoyaltyPointsTableRow"
import { Loader2, Award } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface LoyaltyPointsTableProps {
  loyaltyPoints: (Doc<"loyaltyPoints"> & {
    customer?: {
      _id: string
      name?: string
      phoneNumber?: string
      email?: string
    } | null
  })[]
  isLoading?: boolean
  onAdjustPoints: (loyaltyPoints: Doc<"loyaltyPoints"> & { customer?: { _id: string; name?: string; phoneNumber?: string; email?: string } | null }) => void
  onViewTransactions: (customerId: string) => void
}

export const LoyaltyPointsTable = ({
  loyaltyPoints,
  isLoading = false,
  onAdjustPoints,
  onViewTransactions,
}: LoyaltyPointsTableProps) => {
  if (isLoading && loyaltyPoints.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (loyaltyPoints.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No loyalty points found</h3>
          <p className="text-muted-foreground text-center">
            No customers have loyalty points yet
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
              <TableHead className="w-[200px] whitespace-nowrap">Customer</TableHead>
              <TableHead className="w-[140px] whitespace-nowrap">Phone</TableHead>
              <TableHead className="w-[130px] whitespace-nowrap">Current Points</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Total Earned</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Total Redeemed</TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">Rewards</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Last Earned</TableHead>
              <TableHead className="w-[140px] text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loyaltyPoints.map((lp) => (
              <LoyaltyPointsTableRow
                key={lp._id}
                loyaltyPoints={lp}
                onAdjustPoints={onAdjustPoints}
                onViewTransactions={onViewTransactions}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

