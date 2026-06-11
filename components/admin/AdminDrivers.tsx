"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Truck, Package, MapPin, Loader2, Save, DollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

function getDeliveryOptionLabel(option?: string) {
  const map: Record<string, string> = {
    dropoff_self: "Drop-off & Collect",
    dropoff_delivery: "Drop-off + Delivery",
    pickup_self: "We Pickup, Self Collect",
    full_service: "Full Service",
  }
  return option ? (map[option] || option) : "Delivery"
}

function getDeliveryOptionBadgeClass(option?: string) {
  const map: Record<string, string> = {
    dropoff_self: "bg-gray-100 text-gray-700 border-gray-200",
    dropoff_delivery: "bg-blue-100 text-blue-700 border-blue-200",
    pickup_self: "bg-purple-100 text-purple-700 border-purple-200",
    full_service: "bg-amber-100 text-amber-700 border-amber-200",
  }
  return map[option || ""] || "bg-blue-100 text-blue-700 border-blue-200"
}

export default function AdminDeliveries() {
  const deliveries = useQuery((api as any).drivers.getDeliveryOrdersForAdmin, {}) ?? []
  const deliveryPricing = useQuery((api as any).admin.getDeliveryPricing)
  const updateDeliveryPricing = useMutation((api as any).admin.updateDeliveryPricing)

  const [prices, setPrices] = useState<{
    dropoff_self: string
    dropoff_delivery: string
    pickup_self: string
    full_service: string
  } | null>(null)
  const [savingPrices, setSavingPrices] = useState(false)

  // Initialize form when data loads
  if (deliveryPricing !== undefined && !prices) {
    setPrices({
      dropoff_self: String(deliveryPricing?.dropoff_self ?? 0),
      dropoff_delivery: String(deliveryPricing?.dropoff_delivery ?? 0),
      pickup_self: String(deliveryPricing?.pickup_self ?? 0),
      full_service: String(deliveryPricing?.full_service ?? 0),
    })
  }

  const handleSavePrices = async () => {
    if (!prices) return
    setSavingPrices(true)
    try {
      await updateDeliveryPricing({
        dropoff_self: parseFloat(prices.dropoff_self) || 0,
        dropoff_delivery: parseFloat(prices.dropoff_delivery) || 0,
        pickup_self: parseFloat(prices.pickup_self) || 0,
        full_service: parseFloat(prices.full_service) || 0,
      })
      toast.success("Delivery pricing updated!")
    } catch (e: any) {
      toast.error(e.message || "Failed to save pricing")
    } finally {
      setSavingPrices(false)
    }
  }

  // Delivery stats
  const pending = (deliveries as any[]).filter(d => !d.driverStatus || d.driverStatus === "pending_pickup")
  const inTransit = (deliveries as any[]).filter(d => d.driverStatus === "picked_up")
  const delivered = (deliveries as any[]).filter(d => d.driverStatus === "delivered")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track delivery orders and manage global pricing
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: (deliveries as any[]).length, color: "text-foreground" },
          { label: "Awaiting Pickup", value: pending.length, color: "text-blue-600" },
          { label: "In Transit", value: inTransit.length, color: "text-orange-600" },
          { label: "Delivered", value: delivered.length, color: "text-green-600" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Global Delivery Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Global Delivery Pricing
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            These prices apply to all branches. Set to 0 for free options.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!prices ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: "dropoff_self", label: "Drop-off & Collect", desc: "Customer drops off and collects themselves" },
                  { key: "dropoff_delivery", label: "Drop-off + Delivery", desc: "Customer drops off, we deliver back" },
                  { key: "pickup_self", label: "We Pickup, Self Collect", desc: "We collect from customer, they pick up" },
                  { key: "full_service", label: "Full Service", desc: "We collect from and deliver back to customer" },
                ] as const).map(opt => (
                  <div key={opt.key} className="space-y-1.5">
                    <Label className="text-sm font-medium">{opt.label}</Label>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">₵</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prices[opt.key]}
                        onChange={e => setPrices(p => p ? { ...p, [opt.key]: e.target.value } : p)}
                        className="h-9 text-sm w-32"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSavePrices} disabled={savingPrices} className="gap-2">
                  {savingPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Pricing
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Delivery Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Delivery Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(deliveries as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No delivery orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Option</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Driver</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(deliveries as any[]).map((order: any) => {
                    const statusConfig: Record<string, { label: string; class: string }> = {
                      pending_pickup: { label: "Awaiting Pickup", class: "bg-blue-100 text-blue-700 border-blue-200" },
                      picked_up: { label: "In Transit", class: "bg-orange-100 text-orange-700 border-orange-200" },
                      delivered: { label: "Delivered", class: "bg-green-100 text-green-700 border-green-200" },
                    }
                    const driverStatus = order.driverStatus ?? "pending_pickup"
                    const config = statusConfig[driverStatus] ?? statusConfig.pending_pickup

                    return (
                      <tr key={order._id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-mono font-semibold text-primary">#{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{order.branchName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{order.customerName || "—"}</p>
                          <p className="text-xs text-muted-foreground">{order.customerPhoneNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs border ${getDeliveryOptionBadgeClass(order.deliveryOption)}`}>
                            {getDeliveryOptionLabel(order.deliveryOption)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {[order.deliveryHall, order.deliveryRoom ? `Rm ${order.deliveryRoom}` : null]
                              .filter(Boolean).join(", ") || order.deliveryAddress || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{order.driverName || <span className="text-muted-foreground italic">Unassigned</span>}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs border ${config.class}`}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"} className="text-xs">
                            {order.paymentStatus === "paid" ? "Paid" : "On Delivery"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          ₵{(order.finalPrice ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
