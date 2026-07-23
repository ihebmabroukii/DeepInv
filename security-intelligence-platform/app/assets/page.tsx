"use client"
import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { AssetTrustGraph } from "@/components/asset-trust-graph"

export default function AssetsPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <AssetTrustGraph />
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
