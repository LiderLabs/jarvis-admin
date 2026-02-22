"use client"

import { Doc } from "@devlider001/washlab-backend/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OrderStatusBadge } from "./OrderStatusBadge"
import {
  Package,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Building2,
} from "lucide-react"
import { format } from "date-fns"

interface OrderDetailsDialogProps {
  order: Doc<"orders"> | null
  customer: { name: string; phoneNumber: string; email?: string } | null
  branch: { name: string; code: string; address: string; city: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const OrderDetailsDialog = ({
  order,
  customer,
  branch,
  open,
  onOpenChange,
}: OrderDetailsDialogProps) => {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details - {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Complete order information and status
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-6">
            {/* Status and Type */}
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <OrderStatusBadge status={order.status} size="md" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order Type</p>
                <Badge variant="outline" className="capitalize">
                  {order.orderType.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                <Badge
                  variant={order.paymentStatus === "paid" ? "default" : "secondary"}
                >
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{customer?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </p>
                  <p className="font-medium">{order.customerPhoneNumber}</p>
                </div>
                {customer?.email && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </p>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Branch Information */}
            {branch && (
              <>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Branch Information
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-medium">{branch.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Code</p>
                      <p className="font-medium">{branch.code}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Address
                      </p>
                      <p className="font-medium">
                        {branch.address}, {branch.city}
                      </p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Service Details */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Service Details
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <p className="font-medium capitalize">
                    {order.serviceType.replace(/_/g, " ")}
                  </p>
                </div>
                {(order.actualWeight || order.estimatedWeight) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">
                      {order.actualWeight || order.estimatedWeight} kg
                    </p>
                  </div>
                )}
                {order.itemCount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Item Count</p>
                    <p className="font-medium">{order.itemCount} items</p>
                  </div>
                )}
                {order.bagCardNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bag Card Number</p>
                    <p className="font-medium">{order.bagCardNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Details */}
            {order.isDelivery && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Delivery Details</h3>
                  <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
                    {order.deliveryHall && (
                      <p>
                        <span className="text-muted-foreground">Hall:</span>{" "}
                        <span className="font-medium">{order.deliveryHall}</span>
                      </p>
                    )}
                    {order.deliveryRoom && (
                      <p>
                        <span className="text-muted-foreground">Room:</span>{" "}
                        <span className="font-medium">{order.deliveryRoom}</span>
                      </p>
                    )}
                    {order.deliveryAddress && (
                      <p>
                        <span className="text-muted-foreground">Address:</span>{" "}
                        <span className="font-medium">{order.deliveryAddress}</span>
                      </p>
                    )}
                    {order.deliveryPhoneNumber && (
                      <p>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        <span className="font-medium">{order.deliveryPhoneNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {order.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Pricing */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </h3>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Price</span>
                  <span className="font-medium">₵{order.basePrice.toFixed(2)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="font-medium">₵{order.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {order.finalPrice < order.totalPrice && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>
                      -₵{(order.totalPrice - order.finalPrice).toFixed(2)}
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₵{order.finalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Created</p>
                  <p className="font-medium">
                    {format(new Date(order.createdAt), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Last Updated</p>
                  <p className="font-medium">
                    {format(new Date(order.updatedAt), "PPp")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

