"use client"

import { Doc } from "@liderlabs/washlab-backend/dataModel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PaymentTableRow } from "./PaymentTableRow"
import { Loader2, CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface PaymentTableProps {
  payments: (Doc<"payments"> & {
    order?: Doc<"orders"> | null
    customer?: Doc<"users"> | null
  })[]
  isLoading?: boolean
  onViewDetails: (payment: Doc<"payments">) => void
}

export const PaymentTable = ({
  payments,
  isLoading = false,
  onViewDetails,
}: PaymentTableProps) => {
  if (isLoading && payments.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No payments found</h3>
          <p className="text-muted-foreground text-center">
            No payments match your search criteria
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
              <TableHead className="w-[120px] whitespace-nowrap">Transaction ID</TableHead>
              <TableHead className="w-[140px] whitespace-nowrap">Order Number</TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">Customer</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Amount</TableHead>
              <TableHead className="w-[130px] whitespace-nowrap">Payment Method</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Status</TableHead>
              <TableHead className="w-[110px] whitespace-nowrap">Date</TableHead>
              <TableHead className="w-[80px] whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <PaymentTableRow
                key={payment._id}
                payment={payment}
                onViewDetails={onViewDetails}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

