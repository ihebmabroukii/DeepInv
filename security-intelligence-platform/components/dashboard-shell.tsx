"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  Workflow,
  Brain,
  Clock,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Search,
  User,
  ChevronDown,
  Users,
  ShieldCheck,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, section: "main" },
  { name: "Assets & Trust", href: "/assets", icon: Shield, section: "main" },
  { name: "Security Events", href: "/events", icon: AlertTriangle, section: "main" },
  { name: "Rules & Automation", href: "/rules", icon: Workflow, section: "main" },
  { name: "AI Insights", href: "/ai-insights", icon: Brain, section: "main" },
  { name: "Timeline", href: "/timeline", icon: Clock, section: "main" },
  { name: "Reports", href: "/reports", icon: FileText, section: "bottom" },
  { name: "Users", href: "/settings/users", icon: Users, section: "bottom", adminOnly: true },
  { name: "Agents", href: "/admin/agents", icon: Bot, section: "bottom", superAdminOnly: true },
  { name: "Roles", href: "/admin/roles", icon: ShieldCheck, section: "bottom", superAdminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, section: "bottom" },
]

const regions = [
  { value: "global", label: "Global SOC" },
  { value: "us_east", label: "US East" },
  { value: "us_west", label: "US West" },
  { value: "eu_central", label: "EU Central" },
  { value: "asia_pacific", label: "Asia Pacific" },
]

const departments = [
  { value: "all", label: "All Departments" },
  { value: "security", label: "Security Department" },
  { value: "financial", label: "Financial Department" },
  { value: "hr", label: "HR Department" },
  { value: "it", label: "IT Department" },
  { value: "operations", label: "Operations Department" },
]

interface DashboardShellProps {
  children: React.ReactNode
  userRole: string
}

export function DashboardShell({ children, userRole }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState("global")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Prevent Hydration Mismatch for Radix UI Components
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const riskStatus = "orange" // Mock risk status

  const getRiskColor = (status: string) => {
    switch (status) {
      case "red":
        return "bg-destructive text-destructive-foreground"
      case "orange":
        return "bg-warning text-warning-foreground"
      case "yellow":
        return "bg-yellow-500 text-yellow-950"
      default:
        return "bg-success text-success-foreground"
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur fixed top-0 left-0 right-0 z-40">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">DeepInv</span>
            </div>

            <div className="flex items-center gap-2 ml-8">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {isMounted && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-2">
                        {regions.find((r) => r.value === selectedRegion)?.label}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Select Region</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {regions.map((region) => (
                        <DropdownMenuItem key={region.value} onClick={() => setSelectedRegion(region.value)}>
                          {region.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-2">
                        {departments.find((d) => d.value === selectedDepartment)?.label}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Select Department</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {departments.map((dept) => (
                        <DropdownMenuItem key={dept.value} onClick={() => setSelectedDepartment(dept.value)}>
                          {dept.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Environment:</span>
              <div className="bg-background border border-border rounded px-2 py-1 text-xs font-mono">Production</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Risk Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Risk Level:</span>
              <div className={cn("px-3 py-1 rounded text-xs font-medium uppercase", getRiskColor(riskStatus))}>
                {riskStatus}
              </div>
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets, events..." className="pl-9 bg-background border-border" />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 border-r border-border bg-sidebar transition-all duration-300 z-30",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="h-full flex flex-col">
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navigation
              .filter((item) => item.section === "main")
              .map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </button>
                )
              })}
          </nav>

          <div className="p-3 border-t border-sidebar-border space-y-1">
            {navigation
              .filter((item) => item.section === "bottom")
              .map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                const shouldHide =
                  (item.adminOnly && userRole === "soc_analyst") || (item.superAdminOnly && userRole !== "super_admin")

                if (shouldHide) return null

                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </button>
                )
              })}
          </div>

          <div className="p-3 border-t border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full justify-center"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn("pt-16 min-h-screen transition-all duration-300", sidebarCollapsed ? "pl-16" : "pl-64")}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
