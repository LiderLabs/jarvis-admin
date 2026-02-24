"use client"

import { Doc } from "@jordan6699/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreVertical,
  UserCheck,
  Ban,
  AlertTriangle,
  Shield,
  Trash2,
  Eye,
  Phone,
  Mail,
  ShoppingBag,
  DollarSign,
  Calendar,
} from "lucide-react"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CustomerTableRowProps {
  customer: Doc<"users"> & {
    orderCount?: number
    totalSpent?: number
    statusNote?: string
    statusChangedAt?: number
  }
  onStatusChange: (
    customerId: string,
    customerName: string,
    currentStatus: string,
    newStatus: "active" | "blocked" | "suspended" | "restricted"
  ) => void
  onDelete: (customerId: string, customerName: string) => void
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: {
      label: "Active",
      variant: "default" as const,
      className: "bg-green-50 text-green-700 border-green-200",
    },
    blocked: {
      label: "Blocked",
      variant: "destructive" as const,
      className: "bg-red-50 text-red-700 border-red-200",
    },
    suspended: {
      label: "Suspended",
      variant: "outline" as const,
      className: "bg-orange-50 text-orange-700 border-orange-200",
    },
    restricted: {
      label: "Restricted",
      variant: "outline" as const,
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

export const CustomerTableRow = ({
  customer,
  onStatusChange,
  onDelete,
}: CustomerTableRowProps) => {
  const canActivate = customer.status !== "active"
  const canBlock = customer.status !== "blocked"
  const canSuspend = customer.status !== "suspended"
  const canRestrict = customer.status !== "restricted"

  return (
    <TableRow className="hover:bg-muted/50">
      {/* Name */}
      <TableCell className="font-medium">
        <div className="font-semibold text-foreground">
          {customer.name}
        </div>
      </TableCell>

      {/* Contact */}
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-3 h-3" />
            {customer.phoneNumber}
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-3 h-3" />
              {customer.email}
            </div>
          )}
        </div>
      </TableCell>

      {/* Type */}
      <TableCell>
        <Badge variant={customer.isRegistered ? "default" : "secondary"}>
          {customer.isRegistered ? "Online" : "Walk-in"}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <div className="space-y-1">
          {getStatusBadge(customer.status || "active")}
          {customer.statusNote && customer.statusChangedAt && (
            <div className="text-xs text-muted-foreground mt-1">
              <div className="truncate max-w-[200px]" title={customer.statusNote}>
                {customer.statusNote}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(customer.statusChangedAt), "MMM d, yyyy")}
              </div>
            </div>
          )}
        </div>
      </TableCell>

      {/* Orders */}
      <TableCell>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{customer.orderCount || 0}</span>
        </div>
      </TableCell>

      {/* Total Spent */}
      <TableCell>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            ₵{(customer.totalSpent || 0).toFixed(2)}
          </span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Status Actions */}
            {canActivate && (
              <DropdownMenuItem
                onClick={() =>
                  onStatusChange(customer._id, customer.name, customer.status || "active", "active")
                }
              >
                <UserCheck className="mr-2 h-4 w-4" />
                <span>Activate</span>
              </DropdownMenuItem>
            )}
            {canBlock && (
              <DropdownMenuItem
                onClick={() =>
                  onStatusChange(customer._id, customer.name, customer.status || "active", "blocked")
                }
              >
                <Ban className="mr-2 h-4 w-4" />
                <span>Block</span>
              </DropdownMenuItem>
            )}
            {canSuspend && (
              <DropdownMenuItem
                onClick={() =>
                  onStatusChange(customer._id, customer.name, customer.status || "active", "suspended")
                }
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                <span>Suspend</span>
              </DropdownMenuItem>
            )}
            {canRestrict && (
              <DropdownMenuItem
                onClick={() =>
                  onStatusChange(customer._id, customer.name, customer.status || "active", "restricted")
                }
              >
                <Shield className="mr-2 h-4 w-4" />
                <span>Restrict</span>
              </DropdownMenuItem>
            )}

            {(canActivate || canBlock || canSuspend || canRestrict) && (
              <DropdownMenuSeparator />
            )}

            {/* Delete Action */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {customer.name}? This action cannot be
                    undone. The customer will be soft-deleted and cannot place new orders.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(customer._id, customer.name)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

