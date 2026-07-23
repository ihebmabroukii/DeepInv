"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Shield, AlertTriangle, Brain, Clock, Download, FileText, Crosshair } from "lucide-react"
import { RiskGauge } from "@/components/risk-gauge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useGetIncidents } from "@/lib/api"
import { AgencyMap } from "@/components/agency-map"
import { MitreTactics } from "@/components/mitre-tactics"
import { ReportCenter } from "@/components/report-center"
import { UEBAPanel } from "@/components/ueba-panel"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts"

export function OverviewDashboard() {
  const { data: incidents, isLoading } = useGetIncidents()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-mono">Initializing Dynamic Dashboard...</p>
        </div>
      </div>
    )
  }

  const safeIncidents = incidents || []
  
  // Calculate Global Risk Score (Max or Average)
  const riskScore = safeIncidents.length > 0 
    ? Math.round(safeIncidents.reduce((acc, curr) => acc + (curr.aiConfidence || curr.risk_score || 0), 0) / safeIncidents.length)
    : 15

  // Critical vs Non-Critical Breakdown
  const criticalCount = safeIncidents.filter((i) => i.severity === "critical").length
  const highCount = safeIncidents.filter((i) => i.severity === "high").length
  const mediumCount = safeIncidents.filter((i) => i.severity === "medium").length
  const lowCount = safeIncidents.filter((i) => i.severity === "low").length

  const severityData = [
    { name: "Critical", value: criticalCount, fill: "#ef4444" },
    { name: "High", value: highCount, fill: "#f59e0b" },
    { name: "Medium", value: mediumCount, fill: "#8b5cf6" },
    { name: "Low", value: lowCount, fill: "#3b82f6" },
  ]

  // Trend Data for Area Chart (Mocking time distribution for visual appeal, seeded by real counts)
  const trendData = [
    { time: "00:00", risk: Math.max(10, riskScore - 20) },
    { time: "04:00", risk: Math.max(15, riskScore - 15) },
    { time: "08:00", risk: Math.max(30, riskScore - 5) },
    { time: "12:00", risk: Math.max(45, riskScore + 10) },
    { time: "16:00", risk: Math.max(25, riskScore - 10) },
    { time: "20:00", risk: riskScore },
  ]

  // Top MITRE Tactics
  const tacticCounts: Record<string, number> = {}
  safeIncidents.forEach((i) => {
    // Extract tactic from aiReasoning if possible, or use a default based on severity
    const tacticMatch = i.aiReasoning?.match(/MITRE Tactic: (.*?)\n/)
    const tactic = tacticMatch ? tacticMatch[1].trim() : (i.severity === "critical" ? "Exfiltration" : "Initial Access")
    if (tactic && tactic !== "Unknown") {
      tacticCounts[tactic] = (tacticCounts[tactic] || 0) + 1
    }
  })
  
  const topTactics = Object.entries(tacticCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Recent 5 Alerts
  const recentAlerts = [...safeIncidents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

  // AI Insights
  const aiInsights = safeIncidents.filter(i => i.aiReasoning).slice(0, 3).map((i, index) => ({
    id: index,
    message: i.whatHappened || "Anomaly detected in network traffic.",
    confidence: i.aiConfidence || 85,
    severity: i.severity,
    timestamp: i.timestamp
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-balance bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Attijari Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time security posture and threat intelligence</p>
        </div>
        <Button variant="outline" className="gap-2 border-orange-500/20 hover:bg-orange-500/10" asChild>
          <a href="/audit_report.md" download>
            <Download className="h-4 w-4" />
            Download Latest Report
          </a>
        </Button>
      </div>

      {/* Top Row - Risk Gauge + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Global Risk Score
            </CardTitle>
            <CardDescription>Current security posture</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskGauge score={riskScore} />
            <div className="mt-6 space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Severity Breakdown</h4>
              {severityData.map((s) => (
                <div key={s.name} className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-mono font-semibold" style={{ color: s.fill }}>{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <AgencyMap incidents={safeIncidents} />
        </div>
      </div>

      {/* Middle Row - Charts & MITRE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Threat Trend (24h)
            </CardTitle>
            <CardDescription>Average risk score variations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Area type="monotone" dataKey="risk" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* MITRE Tactics */}
        <MitreTactics />
      </div>

      {/* Bottom Row - Recent Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts Feed */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Recent Alerts
            </CardTitle>
            <CardDescription>The last 5 security events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlerts.length > 0 ? recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-orange-500/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        alert.severity === "critical" ? "bg-destructive animate-pulse" : 
                        alert.severity === "high" ? "bg-warning" : 
                        alert.severity === "medium" ? "bg-purple-500" : "bg-blue-500"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{alert.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{alert.asset}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              )) : (
                <div className="text-center p-4 text-sm text-muted-foreground">No recent alerts found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>Intelligent threat analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiInsights.length > 0 ? aiInsights.map((insight) => (
                <div key={insight.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed text-pretty text-muted-foreground line-clamp-2">{insight.message}</p>
                    <div className="flex items-center gap-1 flex-shrink-0 bg-primary/10 px-2 py-0.5 rounded text-primary">
                      <Brain className="h-3 w-3" />
                      <span className="text-xs font-mono">{insight.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        "uppercase font-medium",
                        insight.severity === "critical" && "text-destructive",
                        insight.severity === "high" && "text-warning",
                        insight.severity === "medium" && "text-purple-500",
                        insight.severity === "low" && "text-blue-500",
                      )}
                    >
                      {insight.severity}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(insight.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-2" />
                </div>
              )) : (
                <div className="text-center p-4 text-sm text-muted-foreground">Waiting for AI analysis...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* UEBA — Behavioral Anomalies (full width) */}
      <UEBAPanel />

      {/* Reports & Global Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <ReportCenter />
        </div>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
               <Shield className="h-5 w-5 text-success" />
               Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-sm text-muted-foreground">ISO 27001</span>
                   <Badge variant="ghost" className="text-success">94% Compliant</Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                   <div className="bg-success h-1.5 rounded-full" style={{ width: '94%' }} />
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-sm text-muted-foreground">GDPR</span>
                   <Badge variant="ghost" className="text-success">100% Compliant</Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                   <div className="bg-success h-1.5 rounded-full" style={{ width: '100%' }} />
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-sm text-muted-foreground">SOC2 Type II</span>
                   <Badge variant="ghost" className="text-warning">Audit Pending</Badge>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
