"use client"

import { cn } from "@/lib/utils"
import { Award } from "lucide-react"

interface LoyaltyPointsBadgeProps {
  points: number
  size?: "sm" | "md" | "lg"
}

export const LoyaltyPointsBadge = ({ points, size = "md" }: LoyaltyPointsBadgeProps) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
        sizeClasses[size]
      )}
    >
      <Award className="w-3.5 h-3.5" />
      {points} {points === 1 ? "point" : "points"}
    </span>
  )
}

