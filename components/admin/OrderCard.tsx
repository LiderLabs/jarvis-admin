"use client"

import { Doc } from "@devlider001/washlab-backend/dataModel"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "./OrderStatusBadge"
import {
  Package,
  User,
  MapPin,
  Calendar,
  DollarSign,
  MoreVertical,
  Eye,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface OrderCardProps {
  order: Doc<"orders">
  onViewDetails: (order: Doc<"orders">) => void
  onUpdateStatus: (order: Doc<"orders">) => void
  onDelete: (order: Doc<"orders">) => void
}

export const OrderCard = ({
  order,
  onViewDetails,
  onUpdateStatus,
  onDelete,
}: OrderCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate">{order.orderNumber}</h3>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span className="capitalize">{order.serviceType.replace(/_/g, " ")}</span>
              <span>•</span>
              <span className="capitalize">{order.orderType.replace(/_/g, " ")}</span>
            </div>
          </div>
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
                Update Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(order)} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {format(new Date(order.createdAt), "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">₵{order.finalPrice.toFixed(2)}</span>
            </div>
            {order.isDelivery && (
              <Badge variant="outline" className="text-xs">
                Delivery
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

