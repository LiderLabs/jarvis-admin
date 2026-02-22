"use client"

import { cn } from "@/lib/utils"

type OrderStatus =
  | "pending_dropoff"
  | "checked_in"
  | "sorting"
  | "washing"
  | "drying"
  | "folding"
  | "ready"
  | "completed"
  | "cancelled"
  // Legacy statuses
  | "pending"
  | "in_progress"
  | "ready_for_pickup"
  | "delivered"

interface OrderStatusBadgeProps {
  status: OrderStatus | string
  size?: "sm" | "md" | "lg"
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  pending_dropoff: {
    label: "Pending Dropoff",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  checked_in: {
    label: "Checked In",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  sorting: {
    label: "Sorting",
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-100 dark:bg-indigo-950",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  washing: {
    label: "Washing",
    color: "text-cyan-700 dark:text-cyan-300",
    bgColor: "bg-cyan-100 dark:bg-cyan-950",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
  drying: {
    label: "Drying",
    color: "text-sky-700 dark:text-sky-300",
    bgColor: "bg-sky-100 dark:bg-sky-950",
    borderColor: "border-sky-200 dark:border-sky-800",
  },
  folding: {
    label: "Folding",
    color: "text-teal-700 dark:text-teal-300",
    bgColor: "bg-teal-100 dark:bg-teal-950",
    borderColor: "border-teal-200 dark:border-teal-800",
  },
  ready: {
    label: "Ready",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-950",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
  },
  // Legacy statuses
  pending: {
    label: "Pending",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
  },
  delivered: {
    label: "Delivered",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
}

const sizeClasses = {
  sm: "text-xs px-2.5 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5",
}

export const OrderStatusBadge = ({ status, size = "md" }: OrderStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.pending_dropoff || {
    label: status,
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-950",
    borderColor: "border-gray-200 dark:border-gray-800",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium leading-none border",
        sizeClasses[size],
        config.color,
        config.bgColor,
        config.borderColor
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current/40" />
      {config.label}
    </span>
  )
}

