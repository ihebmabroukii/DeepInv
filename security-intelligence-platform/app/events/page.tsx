"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { SecurityEventsView } from "@/components/security-events-view"

export default function EventsPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <SecurityEventsView />
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
