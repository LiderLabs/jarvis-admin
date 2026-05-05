"use client"

import * as Clerk from "@clerk/elements/common"
import * as SignIn from "@clerk/elements/sign-in"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"
import { Loader } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useConvexAuth } from "convex/react"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, isLoaded: isClerkLoaded } = useAuth()
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } =
    useConvexAuth()
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard"
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    if (
      isClerkLoaded &&
      isSignedIn &&
      !isConvexLoading &&
      isConvexAuthenticated
    ) {
      const timer = setTimeout(() => {
        setShouldRedirect(true)
        router.push(redirectUrl)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isClerkLoaded, isSignedIn, isConvexLoading, isConvexAuthenticated, router, redirectUrl])

  if (shouldRedirect && isClerkLoaded && isSignedIn) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <div className='flex flex-col items-center gap-6 p-8'>
          <div className='relative'>
            <div className='h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin' />
            <div className='absolute inset-0 flex items-center justify-center'>
              <Loader className='h-6 w-6 text-primary animate-spin' />
            </div>
          </div>
          <div className='text-center space-y-2'>
            <h2 className='text-xl font-semibold'>Login Successful!</h2>
            <p className='text-sm text-muted-foreground'>Redirecting you to the dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex'>
      {/* Left panel — form */}
      <div className='w-full lg:w-1/2 flex flex-col min-h-screen bg-background'>
        {/* Logo at top */}
        <div className='p-8'>
          <Logo size='md' />
        </div>

        {/* Centered form content */}
        <div className='flex-1 flex items-center justify-center px-8 pb-12'>
          <div className='w-full max-w-sm'>
            <SignIn.Root>
              <Clerk.Loading>
                {(isGlobalLoading) => (
                  <>
                    <SignIn.Step name='start'>
                      <div className='flex flex-col gap-8'>
                        <div className='flex flex-col gap-2'>
                          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                            Welcome back
                          </h1>
                          <p className='text-sm text-muted-foreground'>
                            Sign in to your WashLab admin account to continue
                          </p>
                        </div>

                        <div className='flex flex-col gap-5'>
                          <Clerk.Field name='identifier' className='flex flex-col gap-2'>
                            <Clerk.Label asChild>
                              <Label className='text-sm font-medium'>Email address</Label>
                            </Clerk.Label>
                            <Clerk.Input type='email' placeholder='you@example.com' required asChild>
                              <Input className='h-11' />
                            </Clerk.Input>
                            <Clerk.FieldError className='text-xs text-destructive' />
                          </Clerk.Field>

                          <SignIn.Action submit asChild>
                            <Button disabled={isGlobalLoading} className='h-11 w-full font-medium'>
                              <Clerk.Loading>
                                {(isLoading) =>
                                  isLoading ? <Loader className='size-4 animate-spin' /> : "Continue"
                                }
                              </Clerk.Loading>
                            </Button>
                          </SignIn.Action>
                        </div>
                      </div>
                    </SignIn.Step>

                    <SignIn.Step name='choose-strategy'>
                      <div className='flex flex-col gap-8'>
                        <div className='flex flex-col gap-2'>
                          <h1 className='text-2xl font-bold tracking-tight'>Use another method</h1>
                          <p className='text-sm text-muted-foreground'>
                            Facing issues? Choose a different sign-in method.
                          </p>
                        </div>
                        <div className='flex flex-col gap-3'>
                          <SignIn.SupportedStrategy name='email_code' asChild>
                            <Button type='button' variant='outline' disabled={isGlobalLoading} className='h-11'>
                              Email code
                            </Button>
                          </SignIn.SupportedStrategy>
                          <SignIn.SupportedStrategy name='password' asChild>
                            <Button type='button' variant='outline' disabled={isGlobalLoading} className='h-11'>
                              Password
                            </Button>
                          </SignIn.SupportedStrategy>
                          <SignIn.Action navigate='previous' asChild>
                            <Button disabled={isGlobalLoading} className='h-11'>
                              <Clerk.Loading>
                                {(isLoading) =>
                                  isLoading ? <Loader className='size-4 animate-spin' /> : "Go back"
                                }
                              </Clerk.Loading>
                            </Button>
                          </SignIn.Action>
                        </div>
                      </div>
                    </SignIn.Step>

                    <SignIn.Step name='sso-callback'>
                      <Clerk.GlobalError className='text-sm text-destructive mb-4' />
                      <div className='flex flex-col gap-8'>
                        <div className='flex flex-col gap-2'>
                          <h1 className='text-2xl font-bold tracking-tight'>Sign in with SSO</h1>
                          <p className='text-sm text-muted-foreground'>
                            You are being redirected to your SSO provider.
                          </p>
                        </div>
                        <Clerk.Loading>
                          {(isLoading) =>
                            isLoading ? <Loader className='size-4 animate-spin' /> : "Redirecting..."
                          }
                        </Clerk.Loading>
                      </div>
                      <SignIn.Captcha className='empty:hidden' />
                    </SignIn.Step>

                    <SignIn.Step name='verifications'>
                      <Clerk.GlobalError className='text-sm text-destructive mb-4' />

                      <SignIn.Strategy name='email_code'>
                        <Clerk.GlobalError className='text-sm text-destructive mb-4' />
                        <div className='flex flex-col gap-8'>
                          <div className='flex flex-col gap-2'>
                            <h1 className='text-2xl font-bold tracking-tight'>Check your email</h1>
                            <p className='text-sm text-muted-foreground'>
                              Enter the verification code sent to your email
                            </p>
                          </div>
                          <div className='flex flex-col gap-5'>
                            <Clerk.Field name='code'>
                              <Clerk.Label className='sr-only'>Email verification code</Clerk.Label>
                              <div className='flex flex-col gap-3 items-center'>
                                <div className='flex justify-center'>
                                  <Clerk.Input
                                    type='otp'
                                    autoSubmit
                                    className='flex justify-center has-[:disabled]:opacity-50'
                                    render={({ value, status }) => (
                                      <div
                                        data-status={status}
                                        className={cn(
                                          "relative flex size-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
                                          {
                                            "z-10 ring-2 ring-ring ring-offset-background":
                                              status === "cursor" || status === "selected",
                                          }
                                        )}
                                      >
                                        {value}
                                        {status === "cursor" && (
                                          <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                                            <div className='animate-caret-blink h-4 w-px bg-foreground duration-1000' />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  />
                                </div>
                                <Clerk.FieldError className='text-xs text-destructive text-center' />
                                <SignIn.Action
                                  asChild
                                  resend
                                  className='text-muted-foreground'
                                  fallback={({ resendableAfter }: { resendableAfter: number }) => (
                                    <Button variant='link' size='sm' disabled>
                                      Didn&apos;t receive a code? Resend (
                                      <span className='tabular-nums'>{resendableAfter}</span>)
                                    </Button>
                                  )}
                                >
                                  <Button variant='link' size='sm'>
                                    Didn&apos;t receive a code? Resend
                                  </Button>
                                </SignIn.Action>
                              </div>
                            </Clerk.Field>

                            <SignIn.Action submit asChild>
                              <Button disabled={isGlobalLoading} className='h-11 w-full font-medium'>
                                <Clerk.Loading>
                                  {(isLoading) =>
                                    isLoading ? <Loader className='size-4 animate-spin' /> : "Verify"
                                  }
                                </Clerk.Loading>
                              </Button>
                            </SignIn.Action>
                          </div>
                        </div>
                      </SignIn.Strategy>

                      <SignIn.Strategy name='password'>
                        <div className='flex flex-col gap-8'>
                          <div className='flex flex-col gap-2'>
                            <h1 className='text-2xl font-bold tracking-tight'>
                              Welcome back, <SignIn.SafeIdentifier />
                            </h1>
                            <p className='text-sm text-muted-foreground'>Enter your password to continue</p>
                          </div>
                          <div className='flex flex-col gap-5'>
                            <Clerk.Field name='password' className='flex flex-col gap-2'>
                              <Clerk.Label asChild>
                                <Label className='text-sm font-medium'>Password</Label>
                              </Clerk.Label>
                              <Clerk.Input type='password' placeholder='Enter your password' asChild>
                                <PasswordInput className='h-11' />
                              </Clerk.Input>
                              <Clerk.FieldError className='text-xs text-destructive' />
                            </Clerk.Field>

                            <SignIn.Action submit asChild>
                              <Button disabled={isGlobalLoading} className='h-11 w-full font-medium'>
                                <Clerk.Loading>
                                  {(isLoading) =>
                                    isLoading ? <Loader className='size-4 animate-spin' /> : "Sign in"
                                  }
                                </Clerk.Loading>
                              </Button>
                            </SignIn.Action>

                            <SignIn.Action navigate='choose-strategy' asChild>
                              <Button type='button' size='sm' variant='ghost' className='text-muted-foreground'>
                                Use another method
                              </Button>
                            </SignIn.Action>
                          </div>
                        </div>
                      </SignIn.Strategy>

                    </SignIn.Step>
                  </>
                )}
              </Clerk.Loading>
            </SignIn.Root>
          </div>
        </div>

        {/* Footer */}
        <div className='p-8 text-center'>
          <p className='text-xs text-muted-foreground'>
            © {new Date().getFullYear()} WashLab · Powered by Lider Technologies LTD
          </p>
        </div>
      </div>

      {/* Right panel — image */}
      <div className='hidden lg:block lg:w-1/2 relative overflow-hidden'>
        <Image
          src='/assets/stacked-clothes.jpg'
          alt='WashLab laundry service'
          fill
          className='object-cover'
          priority
          quality={90}
        />
        {/* Overlay gradient */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent' />

        {/* Bottom text on image */}
        <div className='absolute bottom-12 left-10 right-10 text-white'>
          <p className='text-3xl font-bold leading-tight mb-2'>
            Life made simple.
          </p>
          <p className='text-white/75 text-sm'>
            Professional laundry management at your fingertips.
          </p>
        </div>
      </div>
    </div>
  )
}
