import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, AlertTriangle, Target, Sparkles, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AIInsightsPage() {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">AI-powered threat analysis and predictions</p>
        </div>

        {/* AI Summary Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle>AI Security Summary</CardTitle>
            </div>
            <CardDescription>Analysis generated at {new Date().toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-base leading-relaxed">
                Our AI models have analyzed 1,247 security events across your infrastructure in the last 24 hours.
                Critical patterns detected include increased SSH brute-force attempts (+34%) and unusual data
                exfiltration patterns in EU Central region. Immediate action recommended for 3 critical threats.
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Confidence: 94%
                </Badge>
                <Badge variant="outline">Last updated: 2 minutes ago</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Predictions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-lg">Threat Predictions</CardTitle>
                </div>
                <Badge variant="destructive">High Risk</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">Ransomware Attack Vector</p>
                    <p className="text-sm text-muted-foreground">Predicted within next 48 hours</p>
                  </div>
                  <Badge variant="outline" className="text-orange-500">
                    82%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on increased phishing attempts and suspicious email attachments detected in HR department.
                </p>
                <Button size="sm" variant="outline" className="w-full gap-2 bg-transparent">
                  View Recommended Actions <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">DDoS Attack Preparation</p>
                    <p className="text-sm text-muted-foreground">Potential threat next 7 days</p>
                  </div>
                  <Badge variant="outline" className="text-yellow-600">
                    64%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Anomalous traffic patterns from botnet IPs. Recommend activating DDoS protection.
                </p>
                <Button size="sm" variant="outline" className="w-full gap-2 bg-transparent">
                  View Recommended Actions <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Attack Surface Analysis</CardTitle>
                </div>
                <Badge variant="secondary">Monitored</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Exposed Services</span>
                  <span className="text-sm font-mono">42 endpoints</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unpatched Vulnerabilities</span>
                  <span className="text-sm font-mono text-orange-500">12 critical</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Open Ports</span>
                  <span className="text-sm font-mono">218 ports</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Weak Credentials Detected</span>
                  <span className="text-sm font-mono text-red-500">8 accounts</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium">Top Recommendations:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Patch Apache Log4j vulnerability on 4 servers</li>
                  <li>Enforce MFA for privileged accounts</li>
                  <li>Close unnecessary ports on public-facing servers</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Behavioral Anomalies */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle>Behavioral Anomalies Detected</CardTitle>
            </div>
            <CardDescription>AI-detected unusual patterns in user and system behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: "Unusual Database Access Pattern",
                  user: "admin@finance.local",
                  description: "Database queries at unusual hours (02:00-04:00 AM) for 3 consecutive days",
                  severity: "medium",
                  confidence: 0.87,
                },
                {
                  title: "Privilege Escalation Attempt",
                  user: "user042@hr.local",
                  description: "Multiple failed attempts to access admin panel and system files",
                  severity: "high",
                  confidence: 0.93,
                },
                {
                  title: "Data Exfiltration Pattern",
                  user: "contractor@external.com",
                  description: "Large file downloads outside normal working hours (450GB transferred)",
                  severity: "critical",
                  confidence: 0.91,
                },
              ].map((anomaly, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{anomaly.title}</p>
                      <Badge
                        variant={
                          anomaly.severity === "critical"
                            ? "destructive"
                            : anomaly.severity === "high"
                              ? "default"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{anomaly.user}</p>
                    <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                    <p className="text-xs text-muted-foreground">
                      AI Confidence: {(anomaly.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Investigate
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
