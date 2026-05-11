"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import { useCurrentAdmin } from "@/hooks/use-current-admin"
import { Logo } from "@/components/Logo"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Mail, LogOut, User } from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const { convexUser, isAdmin, isLoading } = useCurrentAdmin()

  // If user becomes admin, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAdmin) {
      router.push("/dashboard")
    }
  }, [isAdmin, isLoading, router])

  // Show loading only while checking (Clerk not loaded or query still pending)
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Checking permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center space-y-4'>
          <div className='flex justify-center mb-4'>
            <Logo size='md' />
          </div>
          <div className='mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center'>
            <AlertTriangle className='h-8 w-8 text-destructive' />
          </div>
          <div>
            <CardTitle className='text-2xl'>Access Denied</CardTitle>
            <CardDescription className='mt-2'>
              You don&apos;t have permission to access the Javis Admin Panel
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='space-y-6'>
          {/* User Info */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>
                Signed in as:
              </span>
              <Badge variant='outline' className='gap-1'>
                <User className='h-3 w-3' />
                {clerkUser?.emailAddresses[0]?.emailAddress ||
                  clerkUser?.username ||
                  "Unknown"}
              </Badge>
            </div>

            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Role:</span>
              <Badge variant='secondary' className='gap-1'>
                {convexUser?.role || "Customer / Not an Admin"}
              </Badge>
            </div>
          </div>

          {/* Info message */}
          <div className='bg-muted/50 p-4 rounded-lg'>
            <h4 className='font-medium mb-2'>Admin Access Required</h4>
            <p className='text-sm text-muted-foreground'>
              This application is the <strong>Javis Admin Panel</strong>,
              designed exclusively for platform administrators. Admin accounts
              are created and managed directly by system administrators - there
              is no public registration.
            </p>
          </div>

          {/* Different apps info */}
          <div className='bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
            <h4 className='font-medium mb-2 text-blue-900 dark:text-blue-100'>
              Looking for something else?
            </h4>
            <div className='text-sm text-blue-800 dark:text-blue-200 space-y-1'>
              <p>
                • <strong>Branch managers/staff:</strong> Use the Javis Staff
                app
              </p>
              <p>
                • <strong>Customers:</strong> Use the Javis mobile app
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className='space-y-3'>
            <div className='text-center'>
              <p className='text-sm text-muted-foreground mb-3'>
                If you believe you should have admin access, please contact your
                system administrator or support team.
              </p>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() =>
                  window.open("mailto:support@washlab.com", "_blank")
                }
              >
                <Mail className='h-4 w-4 mr-2' />
                Contact Support
              </Button>

              <Button
                variant='destructive'
                className='flex-1'
                onClick={() => signOut(() => router.push("/sign-in"))}
              >
                <LogOut className='h-4 w-4 mr-2' />
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
