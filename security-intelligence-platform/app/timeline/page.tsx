import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function TimelinePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

  const userRole = profile?.role || "soc_analyst"

  const events = [
    {
      time: "14:32:18",
      date: "Today",
      type: "critical",
      title: "Critical: Data Exfiltration Detected",
      description: "Large volume of data transferred to external endpoint 203.0.113.45",
      region: "EU Central",
      department: "Financial",
    },
    {
      time: "12:15:42",
      date: "Today",
      type: "resolved",
      title: "Resolved: Malware Signature Detected",
      description: "Ransomware variant quarantined and removed from system",
      region: "Global",
      department: "IT",
    },
    {
      time: "09:44:23",
      date: "Today",
      type: "high",
      title: "High: Suspicious SSH Login Attempts",
      description: "Multiple failed SSH login attempts from IP 192.168.1.100",
      region: "US East",
      department: "Security",
    },
    {
      time: "08:20:11",
      date: "Today",
      type: "info",
      title: "System Update: Firewall Rules Updated",
      description: "New firewall rules deployed across all regions",
      region: "Global",
      department: "Security",
    },
    {
      time: "23:17:05",
      date: "Yesterday",
      type: "medium",
      title: "Medium: Unusual Port Scan Detected",
      description: "Port scanning activity detected from external IP",
      region: "US West",
      department: "IT",
    },
    {
      time: "19:42:33",
      date: "Yesterday",
      type: "info",
      title: "User Login: Admin Access",
      description: "Super admin badi logged in from secure network",
      region: "Global",
      department: "Security",
    },
    {
      time: "16:28:19",
      date: "Yesterday",
      type: "resolved",
      title: "Resolved: Phishing Email Blocked",
      description: "Phishing attempt blocked by email security gateway",
      region: "EU Central",
      department: "HR",
    },
  ]

  const getEventIcon = (type: string) => {
    switch (type) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-5 w-5 text-destructive" />
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case "resolved":
        return <CheckCircle2 className="h-5 w-5 text-success" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-l-destructive"
      case "high":
        return "border-l-orange-500"
      case "medium":
        return "border-l-warning"
      case "resolved":
        return "border-l-success"
      default:
        return "border-l-blue-500"
    }
  }

  return (
    <DashboardShell userRole={userRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security Timeline</h1>
            <p className="text-muted-foreground">Chronological view of all security events and activities</p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {events.map((event, index) => (
              <Card key={index} className={`ml-16 border-l-4 ${getEventColor(event.type)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="absolute left-5 -ml-2.5 mt-1 rounded-full bg-background p-1.5 border-2 border-border">
                      {getEventIcon(event.type)}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-semibold">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="outline" className="font-mono">
                            {event.time}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{event.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {event.region}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.department}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
