import { DashboardShell } from "@/components/dashboard-shell"
import { OverviewDashboard } from "@/components/overview-dashboard"

export default async function DashboardPage() {
  return (
    <DashboardShell userRole="super_admin">
      <OverviewDashboard />
    </DashboardShell>
  )
}
