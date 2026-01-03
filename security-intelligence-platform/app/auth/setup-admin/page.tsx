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

export default function SetupAdminPage() {
  const [username, setUsername] = useState("badi")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("badi123456")
  const [confirmPassword, setConfirmPassword] = useState("badi123456")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    const cleanUsername = username.trim()
    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setError("Please enter a valid email address used for verification.")
      setIsLoading(false)
      return
    }

    console.log(`[v0] Creating super admin account with username: ${cleanUsername}, email: ${cleanEmail}`)

    try {
      const supabase = createClient()

      console.log("[v0] Creating auth user")

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            username: cleanUsername,
            full_name: "Super Administrator",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      let user = authData.user

      if (authError) {
        console.log("[v0] Auth error:", authError)
        if (authError.message.includes("security purposes")) {
          throw new Error("Please wait a few seconds before trying again (rate limit).")
        }
        if (authError.message.includes("already registered")) {
          console.log("[v0] User already registered, attempting to sign in...")
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          })

          if (signInError) {
            throw new Error("Account already exists. Please try logging in.")
          }
          user = signInData.user
        } else {
          throw authError
        }
      }

      console.log("[v0] Auth user:", user?.id)

      if (user) {
        // Create user profile with super_admin role
        console.log("[v0] Creating/Checking user profile")

        // Check if profile already exists
        const { data: existingProfile } = await supabase.from("users").select("id").eq("id", user.id).single()

        if (!existingProfile) {
          const { error: profileError } = await supabase.from("users").insert({
            id: user.id,
            username: cleanUsername,
            full_name: "Super Administrator",
            role: "super_admin",
            region: "global",
            department: "security",
          })

          if (profileError) {
            console.log("[v0] Profile creation error:", profileError)
            throw profileError
          }
        } else {
          console.log("[v0] Profile already exists")
        }

        console.log("[v0] Super admin account created/verified successfully")
        setSuccess("Super admin account ready! Redirecting to login... (Check your email for confirmation if required)")

        // Sign out and redirect to login
        await supabase.auth.signOut()

        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      }
    } catch (error: unknown) {
      console.error("Setup error:", error)
      setError(error instanceof Error ? error.message : "Failed to create super admin account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-10 w-10 text-emerald-500" />
            <h1 className="text-3xl font-bold text-white">DeepInv</h1>
          </div>
          <p className="text-sm text-slate-400">Security Intelligence Platform</p>
        </div>

        <Card className="border-slate-700 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Setup Super Admin</CardTitle>
            <CardDescription className="text-slate-400">
              Create the super administrator account with default credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup}>
              <div className="flex flex-col gap-4">
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-2">Default Credentials</h3>
                  <p className="text-sm text-slate-300 mb-1">
                    Username: <span className="font-mono text-emerald-400">{username}</span>
                  </p>
                  <p className="text-sm text-slate-300 mb-1">
                    Email: <span className="font-mono text-emerald-400">{email || "Your Email"}</span>
                  </p>
                  <p className="text-sm text-slate-300">
                    Password: <span className="font-mono text-emerald-400">{password}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">Check your email for verification link!</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-slate-200">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-slate-200">
                    Email Address (For Verification)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your valid email"
                    required
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-slate-200">
                    Password (default: badi123456)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" className="text-slate-200">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>
                {error && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <p className="text-sm text-emerald-400">{success}</p>
                  </div>
                )}
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Super Admin Account"}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-slate-400"
                    onClick={() => router.push("/auth/login")}
                  >
                    Already have an account? Sign in
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
