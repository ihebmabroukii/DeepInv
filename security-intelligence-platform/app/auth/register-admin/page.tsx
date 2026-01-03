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

export default function RegisterAdminPage() {
  const [username, setUsername] = useState("badi")
  const [password, setPassword] = useState("badi")
  const [fullName, setFullName] = useState("Administrator")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const email = `${username}@deepinv.local`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            username,
            full_name: fullName,
            role: "super_admin",
            region: "global",
            department: "security",
          },
        },
      })

      if (error) throw error

      setSuccess(true)

      // Auto-login after 2 seconds
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Success!</CardTitle>
            <CardDescription className="text-slate-400">
              Super admin account created. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-10 w-10 text-emerald-500" />
            <h1 className="text-3xl font-bold text-white">DeepInv</h1>
          </div>
          <p className="text-sm text-slate-400">Initial Setup</p>
        </div>

        <Card className="border-slate-700 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Create Super Admin</CardTitle>
            <CardDescription className="text-slate-400">Register the initial super admin account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-slate-200">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName" className="text-slate-200">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-slate-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white"
                  />
                </div>
                {error && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Super Admin"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
