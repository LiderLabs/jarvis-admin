"use client"

import { Doc } from "@liderlabs/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OrderStatusBadge } from "./OrderStatusBadge"
import { TableRow, TableCell } from "@/components/ui/table"
import { Eye, Copy, Check } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { toast } from "sonner"

interface OrderTableRowProps {
  order: Doc<"orders">
  onViewDetails: (order: Doc<"orders">) => void
}

export const OrderTableRow = ({
  order,
  onViewDetails,
}: OrderTableRowProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber)
      setCopied(true)
      toast.success("Copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const customerName = (order as any).customerName || (order as any).customer?.name || null

  const paymentMethodLabel =
    order.paymentMethod === "cash" ? "Cash" :
    order.paymentMethod === "mobile_money" ? "MoMo" :
    order.paymentMethod === "card" ? "Card" : "—"

  return (
    <TableRow className="hover:bg-muted/50 text-sm">

      {/* Order Number */}
      <TableCell className="whitespace-nowrap font-medium">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-primary">{order.orderNumber}</span>
          <button
            onClick={handleCopy}
            className="p-0.5 hover:bg-muted rounded transition-colors"
            title="Copy"
          >
            {copied
              ? <Check className="h-3 w-3 text-green-600" />
              : <Copy className="h-3 w-3 text-muted-foreground" />
            }
          </button>
        </div>
      </TableCell>

      {/* Customer */}
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col">
          {customerName && (
            <span className="text-xs font-medium truncate max-w-[130px]">{customerName}</span>
          )}
          <span className="text-xs text-muted-foreground">{order.customerPhoneNumber}</span>
        </div>
      </TableCell>

      {/* Service */}
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className="text-xs capitalize">
          {order.serviceType.replace(/_/g, " ")}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <OrderStatusBadge status={order.status} size="sm" />
      </TableCell>

      {/* Payment */}
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <Badge
            variant={order.paymentStatus === "paid" ? "default" : "secondary"}
            className="text-xs w-fit"
          >
            {order.paymentStatus}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{paymentMethodLabel}</span>
        </div>
      </TableCell>

      {/* Amount */}
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          {order.finalPrice === 0 ? (
            <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 w-fit">
              FREE
            </span>
          ) : (
            <span className="font-semibold text-green-600 text-sm">
              ₵{(order.finalPrice ?? order.totalPrice ?? 0).toFixed(2)}
            </span>
          )}
          {order.finalPrice != null &&
            order.totalPrice != null &&
            order.finalPrice < order.totalPrice && (
              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 w-fit">
                −₵{(order.totalPrice - order.finalPrice).toFixed(2)} off
              </span>
            )}
        </div>
      </TableCell>

      {/* Date */}
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {format(new Date(order.createdAt), "MMM d, h:mm a")}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onViewDetails(order)}
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>

    </TableRow>
  )
}