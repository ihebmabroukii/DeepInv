"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Shield } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    console.log("[v0] Login attempt for username:", username)

    try {
      const cleanUsername = username.trim()
      const cleanPassword = password.trim()

      // Use the entered value as email
      const email = cleanUsername

      console.log("[v0] Attempting login with email:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPassword,
      })

      if (error) {
        console.log("[v0] Auth error:", error)
        // Check if it's an invalid credentials error
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid credentials. Please ensure you have created the account and verified your email if required.")
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error("Please verify your email address before logging in.")
        }
        throw error
      }

      console.log("[v0] Login successful, fetching user profile")

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role, username")
        .eq("id", data.user.id)
        .single()

      if (profileError || !profile) {
        console.log("[v0] Profile error:", profileError)
        throw new Error("User profile not found. Please contact administrator.")
      }

      console.log("[v0] User profile found:", profile)

      // Use window.location.href to ensure a full page load and update of auth state
      window.location.href = "/dashboard"
    } catch (error: unknown) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 light:from-slate-50 light:via-slate-100 light:to-slate-200">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-10 w-10 text-emerald-500" />
            <h1 className="text-3xl font-bold text-white dark:text-white light:text-slate-900">DeepInv</h1>
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600">
            Security Intelligence Platform
          </p>
        </div>

        <Card className="border-slate-700 bg-slate-900/50 backdrop-blur dark:border-slate-700 dark:bg-slate-900/50 light:border-slate-300 light:bg-white">
          <CardHeader>
            <CardTitle className="text-2xl text-white dark:text-white light:text-slate-900">Sign In</CardTitle>
            <CardDescription className="text-slate-400 dark:text-slate-400 light:text-slate-600">
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-slate-200 dark:text-slate-200 light:text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter email address"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white light:border-slate-300 light:bg-white light:text-slate-900"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-slate-200 dark:text-slate-200 light:text-slate-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white light:border-slate-300 light:bg-white light:text-slate-900"
                  />
                </div>
                {error && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <div className="text-center space-y-2">
                  <p className="text-xs text-slate-500">First time? Set up the super admin account</p>
                  <Button
                    type="button"
                    variant="link"
                    className="text-emerald-400 hover:text-emerald-300 h-auto p-0"
                    onClick={() => router.push("/auth/setup-admin")}
                  >
                    Create Super Admin Account
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
