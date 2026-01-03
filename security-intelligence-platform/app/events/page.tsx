import { DashboardShell } from "@/components/dashboard-shell"
import { SecurityEventsView } from "@/components/security-events-view"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function EventsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

  const userRole = profile?.role || "soc_analyst"

  return (
    <DashboardShell userRole={userRole}>
      <SecurityEventsView />
    </DashboardShell>
  )
}
