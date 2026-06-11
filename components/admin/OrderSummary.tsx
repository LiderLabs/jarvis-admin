"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { OrderStatusBadge } from "./OrderStatusBadge"
import {
  Package,
  User,
  Calendar,
  MapPin,
  Building2,
  CreditCard,
} from "lucide-react"
import { format } from "date-fns"

interface OrderSummaryProps {
  order: Doc<"orders">
  customer?: {
    name: string
    phoneNumber: string
    email?: string
  } | null
  branch?: {
    name: string
    code: string
    address: string
    city: string
  } | null
  className?: string
}

export const OrderSummary = ({
  order,
  customer,
  branch,
  className,
}: OrderSummaryProps) => {
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-xl font-bold">{order.orderNumber}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <OrderStatusBadge status={order.status} size="md" />
            <Badge variant="outline" className="capitalize">
              {order.serviceType.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {order.orderType.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Customer Info */}
      <div className="space-y-3 mb-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>
            <span className="ml-2 font-medium">{customer?.name || "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Phone:</span>
            <span className="ml-2 font-medium">{order.customerPhoneNumber}</span>
          </div>
          {customer?.email && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Email:</span>
              <span className="ml-2 font-medium">{customer.email}</span>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Branch Info */}
      {branch && (
        <>
          <div className="space-y-3 mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Branch Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Branch:</span>
                <span className="ml-2 font-medium">{branch.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Code:</span>
                <span className="ml-2 font-medium">{branch.code}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Address:
                </span>
                <span className="ml-2 font-medium">
                  {branch.address}, {branch.city}
                </span>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
        </>
      )}

      {/* Service Details */}
      <div className="space-y-3 mb-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Package className="h-4 w-4" />
          Service Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {(order.actualWeight || order.estimatedWeight) && (
            <div>
              <span className="text-muted-foreground">Weight:</span>
              <span className="ml-2 font-medium">
                {order.actualWeight || order.estimatedWeight} kg
              </span>
            </div>
          )}
          {order.itemCount && (
            <div>
              <span className="text-muted-foreground">Item Count:</span>
              <span className="ml-2 font-medium">{order.itemCount} items</span>
            </div>
          )}
          {order.bagCardNumber && (
            <div>
              <span className="text-muted-foreground">Bag Card:</span>
              <span className="ml-2 font-medium">{order.bagCardNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Details */}
      {order.isDelivery && (
        <>
          <Separator className="my-4" />
          <div className="space-y-3 mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery Details
            </h4>
            <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
              {order.deliveryHall && (
                <div>
                  <span className="text-muted-foreground">Hall:</span>{" "}
                  <span className="font-medium">{order.deliveryHall}</span>
                </div>
              )}
              {order.deliveryRoom && (
                <div>
                  <span className="text-muted-foreground">Room:</span>{" "}
                  <span className="font-medium">{order.deliveryRoom}</span>
                </div>
              )}
              {order.deliveryAddress && (
                <div>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  <span className="font-medium">{order.deliveryAddress}</span>
                </div>
              )}
              {order.deliveryPhoneNumber && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  <span className="font-medium">{order.deliveryPhoneNumber}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator className="my-4" />

      {/* Pricing */}
      <div className="space-y-3 mb-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Pricing
        </h4>
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
              <span>-₵{(order.totalPrice - order.finalPrice).toFixed(2)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>₵{order.finalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Payment Status</span>
            <Badge
              variant={order.paymentStatus === "paid" ? "default" : "secondary"}
            >
              {order.paymentStatus}
            </Badge>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Timeline */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Timeline
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Created:</span>
            <span className="ml-2 font-medium">
              {format(new Date(order.createdAt), "PPp")}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>
            <span className="ml-2 font-medium">
              {format(new Date(order.updatedAt), "PPp")}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

