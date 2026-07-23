"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/auth"
import { Shield, Lock, User, AlertCircle } from "lucide-react"
import { AttijariLogo } from "@/components/AttijariLogo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { user, error: authError } = await signIn(email.trim(), password.trim())

      if (authError || !user) {
        setError(authError || "Authentication failed.")
        return
      }

      // Full page reload so AuthProvider reads the new session from localStorage
      window.location.href = "/dashboard"
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-900/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-6 relative z-10">
        {/* Logo & Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-b from-orange-500/20 to-red-500/10 border border-orange-500/20 backdrop-blur-xl shadow-2xl shadow-orange-500/10">
            <AttijariLogo className="h-16 w-16 rounded-xl drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Attijari CyberGuard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Security Operations Center</p>
          </div>
        </div>

        <Card className="border-orange-500/10 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Secure Sign In
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="admin@attijari.tn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-background/50 border-orange-500/10 focus:border-orange-500/40"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-background/50 border-orange-500/10 focus:border-orange-500/40"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground font-semibold mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs font-mono text-muted-foreground">
                <p>👑 <span className="text-orange-400">admin@attijari.tn</span> / admin123</p>
                <p>🛡️ <span className="text-blue-400">expert@attijari.tn</span> / expert123</p>
                <p>🔍 <span className="text-green-400">analyst@attijari.tn</span> / analyst123</p>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              <p>🔒 Bank-Grade Security • JWT Authenticated</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
