"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Edit } from "lucide-react"

interface TransactionTypeBadgeProps {
  type: "earned" | "redeemed" | "adjusted" | "expired"
  size?: "sm" | "md"
}

export const TransactionTypeBadge = ({
  type,
  size = "md",
}: TransactionTypeBadgeProps) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  }

  const config = {
    earned: {
      label: "Earned",
      icon: TrendingUp,
      className:
        "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    },
    redeemed: {
      label: "Redeemed",
      icon: TrendingDown,
      className:
        "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    },
    adjusted: {
      label: "Adjusted",
      icon: Edit,
      className:
        "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    expired: {
      label: "Expired",
      icon: TrendingDown,
      className:
        "bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    },
  }

  const typeConfig = config[type]
  const Icon = typeConfig.icon

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold border leading-none",
        sizeClasses[size],
        typeConfig.className
      )}
    >
      <Icon className='w-3 h-3' />
      {typeConfig.label}
    </span>
  )
}

