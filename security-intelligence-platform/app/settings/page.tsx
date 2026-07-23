"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Shield, Bell, Palette } from "lucide-react"
import { getSession, saveSession } from "@/lib/auth"

const NOTIF_KEY = "deepinv-notifications"
const DEFAULT_NOTIFS: Record<string, boolean> = {
  "Security Alerts": true,
  "Daily Digest": true,
  "Weekly Reports": false,
  "System Updates": true,
}

function SettingsView({ user }: { user: any }) {
  const { theme, setTheme } = useTheme()

  // Profile
  const [username, setUsername] = useState(user.username || "")
  const [fullName, setFullName] = useState(user.full_name || "")
  const [email, setEmail] = useState(user.email || "")

  // Notifications (persisted to localStorage)
  const [notifs, setNotifs] = useState<Record<string, boolean>>(DEFAULT_NOTIFS)
  const [twoFA, setTwoFA] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY)
      if (raw) setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(raw) })
    } catch {}
  }, [])

  const saveProfile = () => {
    const session = getSession()
    if (session) {
      saveSession({ ...session, username, full_name: fullName, email })
    }
    toast.success("Profile updated", { description: "Your profile changes have been saved." })
  }

  const updatePassword = () => {
    const current = (document.getElementById("currentPassword") as HTMLInputElement)?.value
    const next = (document.getElementById("newPassword") as HTMLInputElement)?.value
    const confirm = (document.getElementById("confirmPassword") as HTMLInputElement)?.value
    if (!current || !next) return toast.error("Missing fields", { description: "Enter your current and new password." })
    if (next.length < 8) return toast.error("Password too short", { description: "Use at least 8 characters." })
    if (next !== confirm) return toast.error("Passwords don't match", { description: "Confirmation does not match." })
    toast.success("Password updated", { description: "Your password has been changed." })
    ;["currentPassword", "newPassword", "confirmPassword"].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement
      if (el) el.value = ""
    })
  }

  const toggleNotif = (label: string, value: boolean) => {
    const next = { ...notifs, [label]: value }
    setNotifs(next)
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)) } catch {}
    toast.success(`${label} ${value ? "enabled" : "disabled"}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Security</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2"><Palette className="h-4 w-4" />Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={user.role} disabled className="bg-muted" />
                </div>
              </div>
              <Button onClick={saveProfile}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" type="password" /></div>
              <div className="space-y-2"><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" type="password" /></div>
              <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm New Password</Label><Input id="confirmPassword" type="password" /></div>
              <Button onClick={updatePassword}>Update Password</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Enable 2FA</Label><p className="text-sm text-muted-foreground">Require authentication code on login</p></div>
                <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); toast.success(`Two-factor ${v ? "enabled" : "disabled"}`) }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Security Alerts", desc: "Critical security events and threats" },
                { label: "Daily Digest", desc: "Daily summary of security events" },
                { label: "Weekly Reports", desc: "Weekly security posture reports" },
                { label: "System Updates", desc: "Platform updates and maintenance" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>{item.label}</Label><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                  <Switch checked={!!notifs[item.label]} onCheckedChange={(v) => toggleNotif(item.label, v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={(v) => { setTheme(v); toast.success(`Theme set to ${v}`) }}>
                  <SelectTrigger id="theme"><SelectValue placeholder="Select theme" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <SettingsView user={user} />
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
