'use client';

import { useEffect, useState, createContext, useContext } from "react"
import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "@/components/Logo"
import { DashboardHeader } from "@/components/DashboardHeader"
import { useCurrentAdmin } from "@/hooks/use-current-admin"
import { cn } from "@/lib/utils"
import { useQuery } from "convex/react"
import { api } from "@liderlabs/washlab-backend/api"
import {
  LayoutDashboard,
  Building2, Wrench,
  Users,
  Clock,
  Ticket,
  Award,
  FileText,
  Banknote,
  MessageSquare,
  Settings,
  UserPlus,
  ChevronRight,
  Bell,
  Package,
  CreditCard,
  Boxes,
  Tag,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

const sidebarItems = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    path: "/dashboard",
    group: "main",
  },
  {
    id: "headlines",
    label: "Headlines",
    icon: MessageSquare,
    path: "/dashboard/headlines",
    group: "main",
  },
  {
    id: "branches",
    label: "Branches",
    icon: Building2,
    path: "/dashboard/branches",
    group: "management",
  },
  {
    id: "orders",
    label: "Orders",
    icon: Package,
    path: "/dashboard/orders",
    group: "management",
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    path: "/dashboard/payments",
    group: "management",
  },
  {
    id: "staff",
    label: "Staff",
    icon: Users,
    path: "/dashboard/staff",
    group: "management",
  },
  {
    id: "drivers",
    label: "Drivers",
    icon: Truck,
    path: "/dashboard/drivers",
    group: "management",
  },
  {
    id: "station-attendance",
    label: "Station Attendance",
    icon: Building2,
    path: "/dashboard/station-attendance",
    group: "management",
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    path: "/dashboard/customers",
    group: "management",
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    path: "/dashboard/reports",
    group: "management",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    path: "/dashboard/maintenance",
    group: "management",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    path: "/dashboard/inventory",
    group: "management",
  },
  {
    id: "vouchers",
    label: "Vouchers",
    icon: Tag,
    path: "/dashboard/vouchers",
    group: "features",
  },
  {
    id: "loyalty",
    label: "Loyalty",
    icon: Award,
    path: "/dashboard/loyalty",
    group: "features",
  },
  {
    id: "reconciliation",
    label: "Cash Reconciliation",
    icon: Banknote,
    path: "/dashboard/reconciliation",
    group: "features",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/dashboard/settings",
    group: "system",
  },
]

const groupLabels: Record<string, string> = {
  main: "",
  management: "Management",
  features: "Features",
  system: "System",
}

const MobileMenuContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

export const useMobileMenu = () => useContext(MobileMenuContext)

type SidebarContentProps = {
  groupedItems: Record<string, typeof sidebarItems>
  isActive: (path: string) => boolean
  onLinkClick: () => void
}

const SidebarContent = ({
  groupedItems,
  isActive,
  onLinkClick,
}: SidebarContentProps) => {
  const unreadCount = useQuery(api.notifications?.getUnreadCount)

  return (
    <>
      {/* Logo */}
      <div className='flex items-center justify-between p-6 py-4 border-b border-sidebar-border'>
        <Link
          href='/dashboard'
          className='flex items-center gap-2'
          onClick={onLinkClick}
        >
          <Logo size='sm' />
        </Link>
      </div>

      {/* Navigation */}
      <nav className='flex-1 overflow-y-auto px-3 py-4 space-y-6'>
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group}>
            {groupLabels[group] && (
              <div className='px-3 mb-2'>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  {groupLabels[group]}
                </p>
              </div>
            )}
            <div className='space-y-1'>
              {items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                const isNotifications = item.id === "notifications"
                const showUnreadBadge =
                  isNotifications &&
                  unreadCount !== undefined &&
                  unreadCount > 0

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={onLinkClick}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        active && "scale-110"
                      )}
                    />
                    <span className='flex-1'>{item.label}</span>
                    {active && !showUnreadBadge && (
                      <ChevronRight className='h-4 w-4 transition-all duration-200' />
                    )}
                    {showUnreadBadge && (
                      <Badge
                        variant='destructive'
                        className='h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-semibold'
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAdmin, isLoading, isAuthenticated, clerkUser } = useCurrentAdmin()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [isAdmin, isLoading, isAuthenticated, router])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (!clerkUser && !isLoading) {
    return null
  }

  if (isLoading || (isAuthenticated && !isAdmin)) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Checking permissions...</p>
        </div>
      </div>
    )
  }

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname?.startsWith(path) || false
  }

  const groupedItems = sidebarItems.reduce(
    (acc, item) => {
      const group = item.group || "main"
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(item)
      return acc
    },
    {} as Record<string, typeof sidebarItems>
  )

  return (
    <MobileMenuContext.Provider
      value={{ open: mobileMenuOpen, setOpen: setMobileMenuOpen }}
    >
      <div className='min-h-screen bg-background flex'>

        {/* Desktop Sidebar */}
        <aside className='hidden md:flex fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex-col'>
          <SidebarContent
            groupedItems={groupedItems}
            isActive={isActive}
            onLinkClick={() => {}}
          />
        </aside>

        {/* Mobile Sidebar â€” solid overlay, not transparent */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent
            side='left'
            className='w-72 max-w-[85vw] p-0 flex flex-col h-full overflow-hidden border-r border-sidebar-border [&>button]:z-10'
            style={{
              backgroundColor: 'hsl(var(--sidebar, var(--card, var(--background))))',
              zIndex: 9999,
            }}
          >
            <SheetTitle className='sr-only'>Navigation Menu</SheetTitle>
            <div className='flex flex-col flex-1 overflow-hidden bg-sidebar min-h-0'>
              <SidebarContent
                groupedItems={groupedItems}
                isActive={isActive}
                onLinkClick={() => setMobileMenuOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className='flex-1 md:ml-64 flex flex-col min-w-0'>
          <DashboardHeader />
          <main className='flex-1 p-4 md:p-8'>{children}</main>
        </div>

      </div>
    </MobileMenuContext.Provider>
  )
}

