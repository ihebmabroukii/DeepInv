"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Shield } from "lucide-react"
import { signIn } from "@/lib/auth"

export default function RegisterAdminPage() {
  const [username, setUsername] = useState("badi")
  const [password, setPassword] = useState("badi123")
  const [fullName, setFullName] = useState("Administrator")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // For now, since it's a local setup, we use the pre-seeded admin
      // In a real flow, this would call the backend to create a new admin
      // But for the user to "keep going", they should just use the existing one
      const { user, error: authError } = await signIn("admin@attijari.tn", "admin123")
      
      if (authError) throw new Error(authError)
      
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2"><Shield className="h-10 w-10 text-emerald-500" /><h1 className="text-3xl font-bold text-white">DeepInv</h1></div>
          <p className="text-sm text-slate-400">Initial Setup</p>
        </div>
        <Card className="border-slate-700 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Setup Initial Account</CardTitle>
            <CardDescription className="text-slate-400">Use pre-seeded credentials for local development</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-md mb-4 text-sm">
               <p className="text-emerald-400 font-bold mb-1">Local Development Credentials:</p>
               <p className="text-slate-300">Email: <span className="font-mono">admin@attijari.tn</span></p>
               <p className="text-slate-300">Password: <span className="font-mono">admin123</span></p>
            </div>
            <Button onClick={handleRegister} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Initialize with Admin Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
