"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import type { UserSession } from "@/lib/auth"

interface RequireAuthProps {
  children: (user: UserSession) => React.ReactNode
  requiredRole?: string[]
}

export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
    if (!isLoading && user && requiredRole && !requiredRole.includes(user.role)) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router, requiredRole])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">Verifying identity...</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  if (requiredRole && !requiredRole.includes(user.role)) return null

  return <>{children(user)}</>
}
