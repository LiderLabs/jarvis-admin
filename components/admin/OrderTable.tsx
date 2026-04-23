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
import { OrderTableRow } from "./OrderTableRow"
import { OrderStatusBadge } from "./OrderStatusBadge"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, User, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"

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
    <>
      {/* ── Mobile card list (< md) ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {orders.map((order) => {
          const customerName =
            (order as any).customerName || (order as any).customer?.name || null
          return (
            <Card
              key={order._id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onViewDetails(order)}
            >
              <CardContent className="py-4 px-4 space-y-3">
                {/* Top row: order number + date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-sm">{order.orderNumber}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    {customerName && (
                      <span className="text-sm font-medium text-foreground">
                        {customerName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {order.customerPhoneNumber}
                    </span>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {order.serviceType.replace(/_/g, " ")}
                  </Badge>
                  <OrderStatusBadge status={order.status} size="sm" />
                  <Badge
                    variant={order.paymentStatus === "paid" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>

                {/* Amount row */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {order.paymentMethod === "cash"
                      ? "Cash"
                      : order.paymentMethod === "mobile_money"
                        ? "Mobile Money"
                        : order.paymentMethod === "card"
                          ? "Card"
                          : "—"}
                  </span>
                  <div className="flex flex-col items-end gap-0.5">
                    {order.finalPrice === 0 ? (
                      <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        FREE
                      </span>
                    ) : (
                      <span className="font-semibold text-green-600">
                        ₵{(order.finalPrice ?? order.totalPrice ?? 0).toFixed(2)}
                      </span>
                    )}
                    {order.finalPrice != null &&
                      order.totalPrice != null &&
                      order.finalPrice < order.totalPrice && (
                        <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1">
                          -₵{(order.totalPrice - order.finalPrice).toFixed(2)} off
                        </span>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Desktop table (≥ md) ─────────────────────────────────────────── */}
      <div className="hidden md:block rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] whitespace-nowrap">Order Number</TableHead>
                <TableHead className="w-[180px] whitespace-nowrap">Customer</TableHead>
                <TableHead className="w-[120px] whitespace-nowrap">Service Type</TableHead>
                <TableHead className="w-[100px] whitespace-nowrap">Order Type</TableHead>
                <TableHead className="w-[130px] whitespace-nowrap">Status</TableHead>
                <TableHead className="w-[110px] whitespace-nowrap">Payment</TableHead>
                <TableHead className="w-[120px] whitespace-nowrap">Payment Method</TableHead>
                <TableHead className="w-[80px] whitespace-nowrap">Weight</TableHead>
                <TableHead className="w-[100px] whitespace-nowrap">Amount</TableHead>
                <TableHead className="w-[110px] whitespace-nowrap">Final Paid</TableHead>
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
    </>
  )
}