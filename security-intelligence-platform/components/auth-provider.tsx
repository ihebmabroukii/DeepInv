"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { type UserSession, getSession, clearSession } from "@/lib/auth"

interface AuthContextValue {
  user: UserSession | null
  isLoading: boolean
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true, refresh: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = () => {
    const session = getSession()
    setUser(session)
    setIsLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return <AuthContext.Provider value={{ user, isLoading, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
