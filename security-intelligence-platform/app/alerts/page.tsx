"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { RawAlertsView } from "@/components/raw-alerts-view"

export default function AlertsPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <RawAlertsView />
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
