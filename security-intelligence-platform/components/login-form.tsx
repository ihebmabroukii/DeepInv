"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Shield, Key } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [enterpriseId, setEnterpriseId] = useState("")
  const [password, setPassword] = useState("")
  const [useMFA, setUseMFA] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock authentication - redirect to dashboard
    router.push("/dashboard")
  }

  return (
    <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold">SecureBank SOC</CardTitle>
        <CardDescription className="text-muted-foreground">Security Intelligence Platform</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enterprise-id">Enterprise ID</Label>
            <Input
              id="enterprise-id"
              type="text"
              placeholder="SOC-####"
              value={enterpriseId}
              onChange={(e) => setEnterpriseId(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="mfa"
              checked={useMFA}
              onChange={(e) => setUseMFA(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background"
            />
            <Label htmlFor="mfa" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              Use Hardware Key (MFA)
            </Label>
          </div>

          <Button type="submit" className="w-full mt-6">
            Authenticate
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Bank-Grade Security • End-to-End Encrypted</p>
        </div>
      </CardContent>
    </Card>
  )
}
