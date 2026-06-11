"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery, useConvexAuth } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { Id } from "@jordan6699/washlab-backend/dataModel"

export function useCurrentAdmin() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const {
    isLoading: isConvexAuthLoading,
    isAuthenticated: isConvexAuthenticated,
  } = useConvexAuth()

  // Only query Convex when user is authenticated to Clerk AND Convex auth is ready
  // Pass undefined to skip the query when not authenticated (prevents "Authentication required" errors)
  const convexUser = useQuery(
    api.admin.getCurrentUser,
    clerkUser && isConvexAuthenticated && !isConvexAuthLoading ? {} : "skip"
  )

  // const isLoading = !isClerkLoaded || (clerkUser && convexUser === undefined)
  const isLoading = (clerkUser && convexUser === undefined) || !isClerkLoaded
  const isAdmin =
    convexUser?.role === "admin" || convexUser?.role === "super_admin"
  const adminId = convexUser?._id as Id<"admins"> | undefined

  // isAuthenticated should reflect Clerk authentication, not admin status
  // A user can be authenticated with Clerk but not be an admin (should see unauthorized page)
  const isAuthenticated = !!clerkUser

  return {
    clerkUser,
    convexUser,
    isLoading,
    isAdmin,
    adminId,
    isAuthenticated,
  }
}
