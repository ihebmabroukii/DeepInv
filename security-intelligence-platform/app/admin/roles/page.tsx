import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Eye, Edit, Trash } from "lucide-react"

export default async function RolesPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is super admin
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const roles = [
    {
      name: "Super Admin",
      value: "super_admin",
      description: "Full system access with all permissions",
      userCount: 1,
      permissions: ["all"],
      color: "red",
    },
    {
      name: "SOC Expert",
      value: "soc_expert",
      description: "Advanced security operations and analysis capabilities",
      userCount: 4,
      permissions: [
        "View all security events",
        "Manage security events",
        "Create and modify rules",
        "Access AI insights",
        "Generate reports",
        "View all regions",
      ],
      color: "orange",
    },
    {
      name: "SOC Analyst",
      value: "soc_analyst",
      description: "Standard security analyst with regional access",
      userCount: 12,
      permissions: [
        "View security events in assigned region",
        "Update event status",
        "View AI insights",
        "View reports",
        "Access assigned region only",
      ],
      color: "blue",
    },
  ]

  const rolePermissions = {
    super_admin: {
      category: "System Administration",
      permissions: [
        "Create, edit, and delete users",
        "Manage roles and permissions",
        "Access all regions and departments",
        "View and modify all security events",
        "Configure system settings",
        "Access audit logs",
        "Generate all types of reports",
        "Manage integrations",
      ],
    },
    soc_expert: {
      category: "Security Operations",
      permissions: [
        "View all security events across regions",
        "Create and update security events",
        "Manage security rules and automation",
        "Access AI-powered analysis",
        "Generate security reports",
        "Assign events to analysts",
        "Configure alert thresholds",
        "View asset trust graphs",
      ],
    },
    soc_analyst: {
      category: "Monitoring & Response",
      permissions: [
        "View security events in assigned region",
        "Update event status and add notes",
        "View AI recommendations",
        "Execute remediation commands",
        "View regional reports",
        "Access asset information",
        "View security timeline",
        "Receive notifications for assigned events",
      ],
    },
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Configure roles and permissions for security platform access</p>
          <div className="mt-2 flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Shield className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Super Admin Access Required - Only super admins can view and manage roles
            </p>
          </div>
        </div>

        {/* Role Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.value} className="relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-${role.color}-500`}
                style={{
                  backgroundColor: role.color === "red" ? "#ef4444" : role.color === "orange" ? "#f97316" : "#3b82f6",
                }}
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={`bg-${role.color}-500/10 text-${role.color}-600 border-${role.color}-500/20`}
                  >
                    {role.userCount} {role.userCount === 1 ? "User" : "Users"}
                  </Badge>
                </div>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Permissions:</p>
                  {role.permissions.slice(0, 3).map((permission, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {permission}
                    </div>
                  ))}
                  {role.permissions.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{role.permissions.length - 3} more...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions Matrix</CardTitle>
            <CardDescription>Detailed breakdown of permissions for each role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(rolePermissions).map(([roleValue, data]) => {
                const role = roles.find((r) => r.value === roleValue)
                return (
                  <div key={roleValue} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`${
                          role?.color === "red"
                            ? "bg-red-500"
                            : role?.color === "orange"
                              ? "bg-orange-500"
                              : "bg-blue-500"
                        }`}
                      >
                        {role?.name}
                      </Badge>
                      <h3 className="font-semibold">{data.category}</h3>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {data.permissions.map((permission, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-muted-foreground">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Role Assignment Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Role Assignment Guidelines</CardTitle>
            <CardDescription>Best practices for assigning roles to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <h4 className="font-medium">Super Admin</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Assign sparingly to trusted personnel only. Recommended for IT security leadership, CISO, and senior
                  security architects. Super admins have unrestricted access to all system functions including user
                  management and sensitive configuration.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  <h4 className="font-medium">SOC Expert</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Suitable for senior security analysts, SOC team leads, and incident response specialists. These users
                  can manage security events across all regions and create automation rules but cannot modify system
                  settings or user accounts.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium">SOC Analyst</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Default role for security analysts and monitoring personnel. Analysts can view and respond to events
                  within their assigned region and department but have limited system-wide visibility. Perfect for
                  day-to-day security monitoring tasks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Actions (Future Enhancement) */}
        <Card>
          <CardHeader>
            <CardTitle>Role Management Actions</CardTitle>
            <CardDescription>Administrative actions for role configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Modify Role Permissions</p>
                    <p className="text-xs text-muted-foreground">Customize permissions for existing roles</p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Bulk Role Assignment</p>
                    <p className="text-xs text-muted-foreground">Assign roles to multiple users at once</p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Trash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Custom Role Creation</p>
                    <p className="text-xs text-muted-foreground">Create custom roles with specific permissions</p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
