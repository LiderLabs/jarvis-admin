"use client"

import { Doc } from "@devlider001/washlab-backend/dataModel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrderTableRow } from "./OrderTableRow"
import { Loader2, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface OrderTableProps {
  orders: Doc<"orders">[]
  isLoading?: boolean
  onViewDetails: (order: Doc<"orders">) => void
  onUpdateStatus: (order: Doc<"orders">) => void
  onDelete: (order: Doc<"orders">) => void
}

export const OrderTable = ({
  orders,
  isLoading = false,
  onViewDetails,
  onUpdateStatus,
  onDelete,
}: OrderTableProps) => {
  if (isLoading && orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No orders found</h3>
          <p className="text-muted-foreground text-center">
            No orders match your search criteria
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
              <TableHead className="w-[140px] whitespace-nowrap">Order Number</TableHead>
              <TableHead className="w-[130px] whitespace-nowrap">Customer</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Service Type</TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Order Type</TableHead>
              <TableHead className="w-[130px] whitespace-nowrap">Status</TableHead>
              <TableHead className="w-[110px] whitespace-nowrap">Payment</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Payment Method</TableHead>
              <TableHead className="w-[80px] whitespace-nowrap">Weight</TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Amount</TableHead>
              <TableHead className="w-[110px] whitespace-nowrap">Date</TableHead>
              <TableHead className="w-[70px] text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <OrderTableRow
                key={order._id}
                order={order}
                onViewDetails={onViewDetails}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

