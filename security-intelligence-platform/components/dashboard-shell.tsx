"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
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
  User,
  Users,
  ShieldCheck,
  MessageSquare,
  Bell,
  Fingerprint,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useGetIncidents } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { AttijariLogo } from "@/components/AttijariLogo"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, section: "main" },
  { name: "Assets & Trust", href: "/assets", icon: Shield, section: "main" },
  { name: "Security Events", href: "/events", icon: AlertTriangle, section: "main" },
  { name: "Raw Alerts", href: "/alerts", icon: Bell, section: "main" },
  { name: "Rules & Automation", href: "/rules", icon: Workflow, section: "main" },
  { name: "AI Insights", href: "/ai-insights", icon: Brain, section: "main" },
  { name: "UEBA", href: "/ueba", icon: Fingerprint, section: "main" },
  { name: "SOC Copilot", href: "/copilot", icon: MessageSquare, section: "main" },
  { name: "Timeline", href: "/timeline", icon: Clock, section: "main" },
  { name: "Audit Log", href: "/audit", icon: FileText, section: "bottom", superAdminOnly: true },
  { name: "Reports", href: "/reports", icon: FileText, section: "bottom" },
  { name: "Users", href: "/settings/users", icon: Users, section: "bottom", adminOnly: true },
  { name: "Roles", href: "/admin/roles", icon: ShieldCheck, section: "bottom", superAdminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, section: "bottom" },
]

interface DashboardShellProps {
  children: React.ReactNode
  userRole: string
}

export function DashboardShell({ children, userRole }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Prevent Hydration Mismatch for Radix UI Components
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Global risk level derived from live incidents (highest active threat).
  const { data: incidents } = useGetIncidents()
  const riskStatus = useMemo(() => {
    const list = (incidents as any[]) || []
    if (list.length === 0) return "green"
    const maxRisk = Math.max(...list.map((i) => i.aiConfidence ?? i.risk_score ?? 0))
    const hasCritical = list.some((i) => i.severity === "critical")
    if (maxRisk >= 80 || hasCritical) return "red"
    if (maxRisk >= 60) return "orange"
    if (maxRisk >= 40) return "yellow"
    return "green"
  }, [incidents])

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

  const { user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur fixed top-0 left-0 right-0 z-40 print:hidden">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <AttijariLogo className="h-9 w-9 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] rounded" />
              <span className="font-semibold text-lg bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Attijari CyberGuard</span>
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

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile */}
            {isMounted && (
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
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 border-r border-border bg-sidebar transition-all duration-300 z-30 print:hidden",
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
      <main className={cn("pt-16 min-h-screen transition-all duration-300 print:pl-0 print:pt-0", sidebarCollapsed ? "pl-16" : "pl-64")}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
