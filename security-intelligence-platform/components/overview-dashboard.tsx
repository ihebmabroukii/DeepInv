"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Brain, Clock } from "lucide-react"
import { RiskGauge } from "@/components/risk-gauge"
import { cn } from "@/lib/utils"
import { useGetDashboardOverview, useGetAiInsights } from "@/lib/api"

// Mock data for things not yet in backend (TLS Health, Recent Activity)
const criticalEvents = [
  { id: 1, title: "TLS Certificate Expired", severity: "critical", trend: "up", count: 2 },
  { id: 2, title: "Weak Cipher Suites Detected", severity: "high", trend: "down", count: 5 },
  { id: 3, title: "Unauthorized Access Attempt", severity: "critical", trend: "up", count: 8 },
  { id: 4, title: "Database Connection Unencrypted", severity: "high", trend: "stable", count: 3 },
]

const tlsHealth = [
  { name: "prod-api-01.securebank.com", daysUntilExpiry: 7, status: "critical" },
  { name: "prod-lb-03.securebank.com", daysUntilExpiry: 15, status: "warning" },
  { name: "prod-db-master.securebank.com", daysUntilExpiry: 45, status: "ok" },
  { name: "prod-auth-service.securebank.com", daysUntilExpiry: 89, status: "ok" },
]

const recentActivity = [
  { action: "Security scan completed", target: "Production Environment", time: "5 min ago", status: "success" },
  { action: "Certificate renewal", target: "prod-api-01.securebank.com", time: "12 min ago", status: "pending" },
  { action: "Policy update deployed", target: "Global SOC", time: "23 min ago", status: "success" },
  { action: "Threat detected", target: "prod-db-replica-02", time: "45 min ago", status: "warning" },
]

export function OverviewDashboard() {
  const { data: overviewData, isLoading: isOverviewLoading } = useGetDashboardOverview()
  const { data: insightsData, isLoading: isInsightsLoading } = useGetAiInsights()

  if (isOverviewLoading || isInsightsLoading) {
    return <div className="text-white">Loading dashboard data...</div>
  }

  const riskScore = overviewData?.risk_score ?? 0
  const aiInsights = insightsData?.insights ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-balance">Overview Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time security posture and threat intelligence</p>
      </div>

      {/* Top Row - Risk Gauge + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Risk Score */}
        <Card className="lg:col-span-1 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Global Risk Score
            </CardTitle>
            <CardDescription>Current security posture</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskGauge score={riskScore} />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Critical Issues</span>
                <span className="font-mono font-semibold text-destructive">3</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">High Priority</span>
                <span className="font-mono font-semibold text-warning">8</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Medium Priority</span>
                <span className="font-mono font-semibold text-muted-foreground">12</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Events */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Critical Events
            </CardTitle>
            <CardDescription>Active security threats requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        event.severity === "critical" ? "bg-destructive" : "bg-warning",
                      )}
                    />
                    <span className="text-sm">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">{event.count}</span>
                    {event.trend === "up" && <TrendingUp className="h-4 w-4 text-destructive" />}
                    {event.trend === "down" && <TrendingDown className="h-4 w-4 text-success" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - TLS Health + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TLS Trust Health */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              TLS Trust Health
            </CardTitle>
            <CardDescription>Certificate expiration monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tlsHealth.map((cert, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-muted-foreground">{cert.name}</span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        cert.status === "critical" && "bg-destructive/10 text-destructive",
                        cert.status === "warning" && "bg-warning/10 text-warning",
                        cert.status === "ok" && "bg-success/10 text-success",
                      )}
                    >
                      {cert.daysUntilExpiry} days
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        cert.status === "critical" && "bg-destructive",
                        cert.status === "warning" && "bg-warning",
                        cert.status === "ok" && "bg-success",
                      )}
                      style={{ width: `${Math.min((cert.daysUntilExpiry / 90) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top AI Insights */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Top AI Insights
            </CardTitle>
            <CardDescription>Intelligent threat analysis and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiInsights.map((insight: any) => (
                <div key={insight.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed text-pretty">{insight.message || insight.text}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Brain className="h-3 w-3 text-primary" />
                      <span className="text-xs font-mono text-primary">{(insight.confidence || insight.confidence_score) ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded uppercase font-medium",
                        (insight.severity || insight.priority) === "critical" && "bg-destructive/10 text-destructive",
                        (insight.severity || insight.priority) === "high" && "bg-warning/10 text-warning",
                        (insight.severity || insight.priority) === "medium" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {insight.severity || insight.priority}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(insight.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Recent Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest security operations and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      activity.status === "success" && "bg-success",
                      activity.status === "pending" && "bg-warning",
                      activity.status === "warning" && "bg-destructive",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground font-mono">{activity.target}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
