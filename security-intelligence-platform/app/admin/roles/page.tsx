"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAllUsers } from "@/lib/auth"

const roles = [
  { value: "super_admin", name: "Super Admin", color: "red", description: "Full system access", permissions: ["Manage all users", "View all regions", "Configure system", "Manage alerts", "Access audit logs"] },
  { value: "soc_expert", name: "SOC Expert", color: "orange", description: "Advanced SOC operations", permissions: ["View all events", "Create automation rules", "Manage incidents", "Generate reports"] },
  { value: "soc_analyst", name: "SOC Analyst", color: "blue", description: "Standard SOC operations", permissions: ["View assigned events", "Basic incident response", "View dashboards"] },
]

function RolesView() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getAllUsers()
      .then((u) => setUsers(Array.isArray(u) ? u : []))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">Configure roles and permissions for platform access</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => {
          const roleUsers = users.filter((u) => u.role === role.value)
          return (
            <Card key={role.value} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: role.color === "red" ? "#ef4444" : role.color === "orange" ? "#f97316" : "#3b82f6" }} />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  <Badge variant="secondary">{isLoading ? "…" : `${roleUsers.length} Users`}</Badge>
                </div>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Permissions:</p>
                  {role.permissions.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {p}
                    </div>
                  ))}
                </div>

                {!isLoading && roleUsers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned</p>
                    {roleUsers.slice(0, 6).map((u, i) => (
                      <div key={i} className="text-sm text-muted-foreground truncate">
                        {u.full_name || u.username || u.email}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function RolesPage() {
  return (
    <RequireAuth requiredRole={["super_admin"]}>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <RolesView />
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
