'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut, Menu, Bell } from "lucide-react"
import { useMobileMenu } from "@/components/AdminLayout"
import { useQuery } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"

export function DashboardHeader() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { setOpen } = useMobileMenu()
  const router = useRouter()

  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0

  if (!isLoaded) {
    return (
      <header className='h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex h-full items-center justify-end px-6'>
          <div className='h-8 w-8 animate-pulse rounded-full bg-muted' />
        </div>
      </header>
    )
  }

  const userInitials =
    user?.firstName?.[0] && user?.lastName?.[0]
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"

  return (
    <header className='sticky top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='flex h-full items-center justify-between px-6'>
        {/* Mobile Menu Button */}
        <Button
          variant='ghost'
          size='icon'
          className='md:hidden h-9 w-9'
          onClick={() => setOpen(true)}
        >
          <Menu className='h-5 w-5' />
        </Button>

        <div className='flex-1' />

        <div className='flex items-center gap-4'>
          {/* Notification Bell */}
          <Button
            variant='ghost'
            size='icon'
            className='relative h-9 w-9'
            onClick={() => router.push("/dashboard/notifications")}
          >
            <Bell className='h-5 w-5' />
            {unreadCount > 0 && (
              <Badge
                variant='destructive'
                className='absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px] font-semibold'
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors'>
                <Avatar className='h-8 w-8'>
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={user?.fullName || "User"}
                  />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className='hidden md:block text-left'>
                  <p className='text-sm font-medium'>
                    {user?.fullName ||
                      user?.emailAddresses?.[0]?.emailAddress ||
                      "User"}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {user?.emailAddresses?.[0]?.emailAddress}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-medium leading-none'>
                    {user?.fullName || "User"}
                  </p>
                  <p className='text-xs leading-none text-muted-foreground'>
                    {user?.emailAddresses?.[0]?.emailAddress}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href='/dashboard/settings'
                  className='flex items-center cursor-pointer'
                >
                  <User className='mr-2 h-4 w-4' />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href='/dashboard/settings'
                  className='flex items-center cursor-pointer'
                >
                  <Settings className='mr-2 h-4 w-4' />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut(() => {
                    // Use window.location for a hard redirect to ensure navigation
                    window.location.href = "/sign-in"
                  })
                }}
                className='text-destructive focus:text-destructive cursor-pointer'
              >
                <LogOut className='mr-2 h-4 w-4' />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

