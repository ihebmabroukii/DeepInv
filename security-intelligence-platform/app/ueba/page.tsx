"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { UEBAPanel } from "@/components/ueba-panel"

export default function UebaPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Behavior Analytics</h1>
              <p className="text-muted-foreground">
                Behavioral baselines and anomaly detection across every monitored identity — who, where, what, and when.
              </p>
            </div>
            <UEBAPanel />
          </div>
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
