"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OrderStatusBadge } from "./OrderStatusBadge"
import {
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Package,
  User,
  Calendar,
  Copy,
  Check,
} from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { toast } from "sonner"

interface OrderTableRowProps {
  order: Doc<"orders">
  onViewDetails: (order: Doc<"orders">) => void
  onUpdateStatus: (order: Doc<"orders">) => void
  onDelete: (order: Doc<"orders">) => void
}

export const OrderTableRow = ({
  order,
  onViewDetails,
  onUpdateStatus,
  onDelete,
}: OrderTableRowProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber)
      setCopied(true)
      toast.success("Order number copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy order number")
    }
  }

  return (
    <TableRow className="hover:bg-muted/50">
      {/* Order Number */}
      <TableCell className="font-medium whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="min-w-0">{order.orderNumber}</span>
          <button
            onClick={handleCopyOrderNumber}
            className="shrink-0 p-1 hover:bg-muted rounded transition-colors"
            title="Copy order number"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        </div>
      </TableCell>

      {/* Customer */}
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{order.customerPhoneNumber}</span>
        </div>
      </TableCell>

      {/* Service Type */}
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className="capitalize text-xs">
          {order.serviceType.replace(/_/g, " ")}
        </Badge>
      </TableCell>

      {/* Order Type */}
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className="text-xs">
          <span className="capitalize">{order.orderType.replace(/_/g, " ")}</span>
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <OrderStatusBadge status={order.status} size="sm" />
      </TableCell>

      {/* Payment Status */}
      <TableCell className="whitespace-nowrap">
        <Badge
          variant={order.paymentStatus === "paid" ? "default" : "secondary"}
          className="text-xs"
        >
          {order.paymentStatus}
        </Badge>
      </TableCell>

      {/* Payment Method */}
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {order.paymentMethod === "cash"
          ? "Cash"
          : order.paymentMethod === "mobile_money"
            ? "Mobile Money"
            : order.paymentMethod === "card"
              ? "Card"
              : "—"}
      </TableCell>

      {/* Weight */}
      <TableCell className="whitespace-nowrap">
        <span className="text-sm text-muted-foreground">
          {(order.actualWeight || order.estimatedWeight || 0).toFixed(1)} kg
        </span>
      </TableCell>

      {/* Amount */}
      <TableCell className="whitespace-nowrap">
        <span className="text-sm text-muted-foreground">₵{(order.totalPrice ?? 0).toFixed(2)}</span>
      </TableCell>

      {/* Final Paid */}
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          {order.finalPrice === 0 ? (
            <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 w-fit">FREE</span>
          ) : (
            <span className="font-semibold text-green-600">₵{(order.finalPrice ?? order.totalPrice ?? 0).toFixed(2)}</span>
          )}
          {order.finalPrice != null && order.totalPrice != null && order.finalPrice < order.totalPrice && (
            <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 w-fit">-₵{(order.totalPrice - order.finalPrice).toFixed(2)} off</span>
          )}
          {(order as any).voucherCode && (
            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 w-fit">{(order as any).voucherCode}</span>
          )}
        </div>
      </TableCell>

      {/* Date */}
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="whitespace-nowrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(order)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus(order)}>
              <Edit className="h-4 w-4 mr-2" />
              Update Status
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(order)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

