"use client"

import { Doc } from "@devlider001/washlab-backend/dataModel"
import { cn } from "@/lib/utils"

interface PaymentStatusBadgeProps {
  status: Doc<"payments">["status"]
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<
  Doc<"payments">["status"],
  { label: string; color: string }
> = {
  pending: { label: "Pending", color: "bg-yellow-500" },
  processing: { label: "Processing", color: "bg-blue-500" },
  completed: { label: "Completed", color: "bg-green-500" },
  failed: { label: "Failed", color: "bg-red-500" },
  refunded: { label: "Refunded", color: "bg-purple-500" },
}

export const PaymentStatusBadge = ({
  status,
  size = 'md',
}: PaymentStatusBadgeProps) => {
  const { label, color } = statusConfig[status] || {
    label: status,
    color: "bg-gray-500",
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium text-white',
        sizeClasses[size],
        color
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
      {label}
    </span>
  )
}

