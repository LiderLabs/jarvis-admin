"use client"

import { Doc } from "@liderlabs/washlab-backend/dataModel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableRow, TableCell } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  MoreVertical,
  UserCheck,
  AlertTriangle,
  Trash2,
  Award,
  Eye,
} from "lucide-react"
import { format } from "date-fns"

interface CustomerTableRowProps {
  customer: Doc<"users"> & {
    orderCount?: number
    completedOrderCount?: number
    totalSpent?: number
    statusNote?: string
    statusChangedAt?: number
    branchName?: string
    allBranches?: string
    lastOrderDate?: number
    lastOrderNumber?: string
  }
  loyaltyPoints?: number
  onStatusChange: (
    customerId: string,
    customerName: string,
    currentStatus: string,
    newStatus: "active" | "blocked" | "suspended" | "restricted"
  ) => void
  onDelete: (customerId: string, customerName: string) => void
  onViewProfile: (customer: any) => void
}

function PointsBadge({ points }: { points: number }) {
  const freewashes = Math.floor(points / 10)
  if (points === 0) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-sm font-semibold text-foreground">{points}</span>
        {freewashes > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            🎁 {freewashes}
          </span>
        )}
      </div>
    </div>
  )
}

export const CustomerTableRow = ({
  customer,
  loyaltyPoints = 0,
  onStatusChange,
  onDelete,
  onViewProfile,
}: CustomerTableRowProps) => {
  const canActivate = customer.status !== "active"
  const canSuspend = customer.status !== "suspended"

  // Show branch code if available from branchName, else show name truncated
  const branchDisplay = (customer as any).branchName || "—"

  return (
    <TableRow className="hover:bg-muted/50">
      {/* Name */}
      <TableCell className="font-medium">
        <div className="font-semibold text-foreground">{customer.name}</div>
      </TableCell>

      {/* Contact */}
      <TableCell>
        <div className="space-y-0.5">
          <p className="text-sm text-foreground">{customer.phoneNumber}</p>
          {customer.email && (
            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{customer.email}</p>
          )}
        </div>
      </TableCell>

      {/* Type */}
      <TableCell>
        <Badge variant={customer.isRegistered ? "default" : "secondary"} className="text-xs">
          {customer.isRegistered ? "Online" : "Walk-in"}
        </Badge>
      </TableCell>

      {/* Branch — replaces Status column */}
      <TableCell>
        <span className="text-sm font-medium text-foreground">{branchDisplay}</span>
      </TableCell>

      {/* Orders */}
      <TableCell>
        <span className="text-sm font-semibold">{customer.orderCount || 0}</span>
      </TableCell>

      {/* Total Spent */}
      <TableCell>
        <span className="text-sm font-medium">₵{(customer.totalSpent || 0).toFixed(2)}</span>
      </TableCell>

      {/* Loyalty Points */}
      <TableCell>
        <PointsBadge points={loyaltyPoints} />
      </TableCell>

      {/* Actions — View Profile, Activate, Suspend, Delete */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {/* View Profile */}
            <DropdownMenuItem onClick={() => onViewProfile(customer)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>View Profile</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Activate — only show if not already active */}
            {canActivate && (
              <DropdownMenuItem
                onClick={() => onStatusChange(customer._id, customer.name, customer.status || "active", "active")}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                <span>Activate</span>
              </DropdownMenuItem>
            )}

            {/* Suspend — only show if not already suspended */}
            {canSuspend && (
              <DropdownMenuItem
                onClick={() => onStatusChange(customer._id, customer.name, customer.status || "active", "suspended")}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                <span>Suspend</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {customer.name}? This cannot be undone.
                    The customer will be soft-deleted and cannot place new orders.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(customer._id, customer.name)} className="bg-red-600 hover:bg-red-700">
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
