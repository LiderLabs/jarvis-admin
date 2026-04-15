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

  const convexUser = useQuery(
    api.admin.getCurrentUser,
    clerkUser && isConvexAuthenticated && !isConvexAuthLoading ? {} : "skip"
  )

  console.log("AUTH DEBUG", { isClerkLoaded, isConvexAuthLoading, isConvexAuthenticated, clerkUser: !!clerkUser, convexUser })

  const isLoading = !isClerkLoaded || isConvexAuthLoading || (isConvexAuthenticated && convexUser === undefined)
  const isAdmin = convexUser?.role === "admin" || convexUser?.role === "super_admin"
  const adminId = convexUser?._id as Id<"admins"> | undefined
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