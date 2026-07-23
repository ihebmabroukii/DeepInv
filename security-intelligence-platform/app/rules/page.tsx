"use client"
import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { RuleBuilder } from "@/components/rule-builder"

export default function RulesPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <RuleBuilder />
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
