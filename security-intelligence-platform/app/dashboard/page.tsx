"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { OverviewDashboard } from "@/components/overview-dashboard"

export default function DashboardPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <OverviewDashboard />
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
