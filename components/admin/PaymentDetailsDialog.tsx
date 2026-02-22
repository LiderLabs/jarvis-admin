"use client"

import { Doc } from "@devlider001/washlab-backend/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PaymentStatusBadge } from "./PaymentStatusBadge"
import { PaymentMethodBadge } from "./PaymentMethodBadge"
import {
  CreditCard,
  User,
  Package,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { format } from "date-fns"

interface PaymentDetailsDialogProps {
  payment: (Doc<"payments"> & {
    order?: Doc<"orders"> | null
    customer?: Doc<"users"> | null
    branch?: Doc<"branches"> | null
  }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const PaymentDetailsDialog = ({
  payment,
  open,
  onOpenChange,
}: PaymentDetailsDialogProps) => {
  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <ScrollArea className="max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <CreditCard className="h-7 w-7 text-primary" />
              Payment Details
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Transaction ID: {payment._id.slice(-12).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Status & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                <PaymentStatusBadge status={payment.status} size="lg" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount</h3>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <DollarSign className="h-5 w-5" />
                  <span>
                    {payment.currency} {payment.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Method */}
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Method
              </h2>
              <PaymentMethodBadge method={payment.paymentMethod} variant="default" />
            </div>

            <Separator />

            {/* Order Details */}
            {payment.order && (
              <>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Package className="h-5 w-5 text-primary" />
                    Order Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Order Number:</span>{" "}
                      <span className="font-medium">{payment.order.orderNumber}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Order Status:</span>{" "}
                      <span className="font-medium capitalize">
                        {payment.order.status.replace(/_/g, " ")}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Order Total:</span>{" "}
                      <span className="font-medium">
                        ₵{payment.order.finalPrice.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Customer Details */}
            {payment.customer && (
              <>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-primary" />
                    Customer Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">{payment.customer.name}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      <span className="font-medium">{payment.customer.phoneNumber}</span>
                    </p>
                    {payment.customer.email && (
                      <p className="sm:col-span-2">
                        <span className="text-muted-foreground">Email:</span>{" "}
                        <span className="font-medium">{payment.customer.email}</span>
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Branch Details */}
            {payment.branch && (
              <>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    Branch Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">{payment.branch.name}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Code:</span>{" "}
                      <span className="font-medium">{payment.branch.code}</span>
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-muted-foreground">Address:</span>{" "}
                      <span className="font-medium">
                        {payment.branch.address}, {payment.branch.city}
                      </span>
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Transaction Details */}
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-primary" />
                Transaction Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Payment Created</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.createdAt), "MMM d, yyyy 'at' hh:mm a")}
                    </p>
                  </div>
                </div>

                {payment.completedAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Payment Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.completedAt), "MMM d, yyyy 'at' hh:mm a")}
                      </p>
                    </div>
                  </div>
                )}

                {payment.gatewayTransactionId && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Gateway Transaction ID
                    </p>
                    <p className="text-sm font-mono">{payment.gatewayTransactionId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

