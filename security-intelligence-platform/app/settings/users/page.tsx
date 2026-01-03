"use client"

import type React from "react"

import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Search, MoreVertical, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    role: "soc_analyst",
    region: "global",
    department: "security",
  })

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

      setCurrentUser(profile)

      if (profile?.role !== "super_admin" && profile?.role !== "soc_expert") {
        router.push("/dashboard")
        return
      }

      // Fetch all users
      const { data: usersData, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && usersData) {
        setUsers(usersData)
      }

      setIsLoading(false)
    }

    loadData()
  }, [router])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.includes("@") ? formData.email : `${formData.email}@deepinv.local`,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            full_name: formData.fullName,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          username: formData.username,
          full_name: formData.fullName,
          role: formData.role,
          region: formData.region,
          department: formData.department,
        })

        if (profileError) throw profileError

        // Refresh users list
        const { data: usersData } = await supabase.from("users").select("*").order("created_at", { ascending: false })
        if (usersData) setUsers(usersData)

        // Reset form
        setFormData({
          username: "",
          fullName: "",
          email: "",
          password: "",
          role: "soc_analyst",
          region: "global",
          department: "security",
        })

        setIsDialogOpen(false)
        alert("User created successfully!")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      alert(`Error creating user: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return

    try {
      const supabase = createClient()
      // In a real app, you'd update user status or delete
      await supabase.from("users").delete().eq("id", userId)

      setUsers(users.filter((u) => u.id !== userId))
      alert("User deactivated successfully!")
    } catch (error) {
      console.error("[v0] Error deactivating user:", error)
      alert("Error deactivating user")
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-red-500">Super Admin</Badge>
      case "soc_expert":
        return <Badge className="bg-orange-500">SOC Expert</Badge>
      case "soc_analyst":
        return <Badge variant="secondary">SOC Analyst</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  if (isLoading) {
    return (
      <DashboardShell userRole={currentUser?.role || "soc_analyst"}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell userRole={currentUser?.role || "soc_analyst"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts and permissions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the security platform</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUsername">Username</Label>
                    <Input
                      id="newUsername"
                      placeholder="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newFullName">Full Name</Label>
                    <Input
                      id="newFullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="user@deepinv.local"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newRole">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger id="newRole">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="soc_expert">SOC Expert</SelectItem>
                          <SelectItem value="soc_analyst">SOC Analyst</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newRegion">Region</Label>
                      <Select
                        value={formData.region}
                        onValueChange={(value) => setFormData({ ...formData, region: value })}
                      >
                        <SelectTrigger id="newRegion">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global</SelectItem>
                          <SelectItem value="us_east">US East</SelectItem>
                          <SelectItem value="us_west">US West</SelectItem>
                          <SelectItem value="eu_central">EU Central</SelectItem>
                          <SelectItem value="asia_pacific">Asia Pacific</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newDepartment">Department</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger id="newDepartment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="it">IT</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage user accounts</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.username}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.region.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.department}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit User</DropdownMenuItem>
                          <DropdownMenuItem>Reset Password</DropdownMenuItem>
                          <DropdownMenuItem>View Activity</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeactivateUser(user.id)}>
                            Deactivate User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
