"use client"

import { Doc } from "@devlider001/washlab-backend/dataModel"
import { Badge } from "@/components/ui/badge"
import { Wallet, CreditCard, DollarSign } from "lucide-react"

interface PaymentMethodBadgeProps {
  method: Doc<"payments">["paymentMethod"]
  variant?: "default" | "outline"
}

const methodConfig: Record<
  Doc<"payments">["paymentMethod"],
  { label: string; icon: typeof Wallet }
> = {
  mobile_money: { label: "Mobile Money", icon: Wallet },
  card: { label: "Card", icon: CreditCard },
  cash: { label: "Cash", icon: DollarSign },
}

export const PaymentMethodBadge = ({
  method,
  variant = "outline",
}: PaymentMethodBadgeProps) => {
  const { label, icon: Icon } = methodConfig[method] || {
    label: method,
    icon: Wallet,
  }

  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

