"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OrderStatusBadge } from "./OrderStatusBadge"
import {
  Package,
  User,
  Calendar,
  MapPin,
  Phone,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface OrderItemProps {
  order: Doc<"orders">
  variant?: "default" | "compact" | "detailed"
  className?: string
  showActions?: boolean
  children?: React.ReactNode // For action buttons
}

export const OrderItem = ({
  order,
  variant = "default",
  className,
  showActions = false,
  children,
}: OrderItemProps) => {
  const isCompact = variant === "compact"
  const isDetailed = variant === "detailed"

  if (isCompact) {
    return (
      <div className={cn("flex items-center justify-between p-3 border rounded-lg", className)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{order.orderNumber}</span>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {order.customerPhoneNumber}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 font-bold">₵</span>
                ₵{order.finalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {children && <div className="shrink-0 ml-4">{children}</div>}
      </div>
    )
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className={cn(isDetailed ? "pb-3" : "pb-3")}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-lg truncate">{order.orderNumber}</h3>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{order.serviceType.replace(/_/g, " ")}</span>
              <span>•</span>
              <span className="capitalize">{order.orderType.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium">{order.customerPhoneNumber}</span>
          </div>

          {(order.actualWeight || order.estimatedWeight) && (
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Weight:</span>
              <span className="font-medium">
                {order.actualWeight || order.estimatedWeight} kg
              </span>
            </div>
          )}

          {isDetailed && order.isDelivery && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-muted-foreground">Delivery:</span>
                <div className="mt-1 space-y-1">
                  {order.deliveryHall && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Hall:</span>{" "}
                      <span className="font-medium">{order.deliveryHall}</span>
                    </div>
                  )}
                  {order.deliveryRoom && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Room:</span>{" "}
                      <span className="font-medium">{order.deliveryRoom}</span>
                    </div>
                  )}
                  {order.deliveryAddress && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Address:</span>{" "}
                      <span className="font-medium">{order.deliveryAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {format(new Date(order.createdAt), isDetailed ? "PPp" : "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 text-muted-foreground font-bold">₵</span>
              <span className="text-lg font-bold">₵{order.finalPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={order.paymentStatus === "paid" ? "default" : "secondary"}
                className="text-xs"
              >
                {order.paymentStatus}
              </Badge>
              {order.isDelivery && (
                <Badge variant="outline" className="text-xs">
                  Delivery
                </Badge>
              )}
            </div>
          </div>

          {showActions && children && (
            <div className="pt-2 border-t">{children}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

