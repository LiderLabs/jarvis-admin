"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { PaymentStatusBadge } from "./PaymentStatusBadge"
import { PaymentMethodBadge } from "./PaymentMethodBadge"
import {
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Eye,
  Calendar,
  DollarSign,
  CreditCard,
  User,
  Package,
} from "lucide-react"
import { format } from "date-fns"

interface PaymentTableRowProps {
  payment: Doc<"payments"> & {
    order?: Doc<"orders"> | null
    customer?: Doc<"users"> | null
  }
  onViewDetails: (payment: Doc<"payments">) => void
}

export const PaymentTableRow = ({
  payment,
  onViewDetails,
}: PaymentTableRowProps) => {
  return (
    <TableRow className="hover:bg-muted/50">
      {/* Transaction ID */}
      <TableCell className="font-medium whitespace-nowrap">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-mono text-sm">{payment._id.slice(-8).toUpperCase()}</span>
        </div>
      </TableCell>

      {/* Order Number */}
      <TableCell className="whitespace-nowrap">
        {payment.order ? (
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{payment.order.orderNumber}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">N/A</span>
        )}
      </TableCell>

      {/* Customer */}
      <TableCell className="whitespace-nowrap">
        {payment.customer ? (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{payment.customer.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">N/A</span>
        )}
      </TableCell>

      {/* Amount */}
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          {(payment.order?.finalPrice != null ? payment.order.finalPrice : payment.amount) === 0 ? (
            <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 w-fit">FREE</span>
          ) : (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-green-600">
                {payment.currency} {(payment.order?.finalPrice != null ? payment.order.finalPrice : (payment.amount ?? 0)).toFixed(2)}
              </span>
            </div>
          )}
          {payment.order?.finalPrice != null && payment.order?.totalPrice != null && payment.order.totalPrice > payment.order.finalPrice && (
            <span className="text-xs text-muted-foreground line-through ml-1">₵{payment.order.totalPrice.toFixed(2)}</span>
          )}
          {payment.order && (payment.order as any).voucherCode && (
            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 w-fit">{(payment.order as any).voucherCode}</span>
          )}
        </div>
      </TableCell>

      {/* Payment Method */}
      <TableCell className="whitespace-nowrap">
        <PaymentMethodBadge method={payment.paymentMethod} />
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <PaymentStatusBadge status={payment.status} size="sm" />
      </TableCell>

      {/* Date */}
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(payment.createdAt), "MMM d, yyyy")}</span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="whitespace-nowrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(payment)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </TableCell>
    </TableRow>
  )
}

