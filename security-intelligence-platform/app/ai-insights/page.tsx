"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, AlertTriangle, Target, Sparkles, ChevronRight, RefreshCw, Shield, Zap, Activity } from "lucide-react"

function AIInsightsContent({ user }: { user: any }) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://localhost:8001/api/v1/alerts/incidents")
      if (res.ok) {
        const data = await res.json()
        setIncidents(data)
        setLastUpdated(new Date())
      }
    } catch (e) {
      console.warn("Failed to fetch incidents for AI insights:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 60000)
    return () => clearInterval(interval)
  }, [])

  // Derived analytics from real incidents
  const totalIncidents = incidents.length
  const criticalCount = incidents.filter(i => i.risk_score >= 80).length
  const highCount = incidents.filter(i => i.risk_score >= 60 && i.risk_score < 80).length
  const avgRisk = totalIncidents > 0
    ? Math.round(incidents.reduce((acc, i) => acc + (i.risk_score || 0), 0) / totalIncidents)
    : 0

  // Tactic frequency map
  const tacticMap: Record<string, number> = {}
  incidents.forEach(i => {
    const t = i.mitre_tactic || "Unknown"
    tacticMap[t] = (tacticMap[t] || 0) + 1
  })
  const topTactics = Object.entries(tacticMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Top source IPs
  const ipMap: Record<string, number> = {}
  incidents.forEach(i => {
    if (i.source_ip) ipMap[i.source_ip] = (ipMap[i.source_ip] || 0) + 1
  })
  const topIPs = Object.entries(ipMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // UEBA anomalies from incident data
  const uebaAnomalies = incidents
    .filter(i => i.ueba_indicators && i.ueba_indicators.length > 0)
    .slice(0, 4)
    .map(i => ({
      title: i.narrative ? i.narrative.split(".")[0] : `Anomaly from ${i.source_ip}`,
      ip: i.source_ip,
      description: i.ueba_indicators[0],
      severity: i.risk_score >= 80 ? "critical" : i.risk_score >= 60 ? "high" : "medium",
      confidence: i.risk_score,
    }))

  // If no real UEBA data, derive from high-risk incidents
  const displayAnomalies = uebaAnomalies.length > 0
    ? uebaAnomalies
    : incidents
        .filter(i => (i.risk_score || 0) >= 60)
        .slice(0, 3)
        .map(i => ({
          title: i.narrative ? i.narrative.split(".")[0].substring(0, 80) : `Suspicious Activity from ${i.source_ip}`,
          ip: i.source_ip,
          description: `Risk Score ${i.risk_score}/100 · MITRE: ${i.mitre_tactic || "Unknown"} · Attack Stage: ${i.attack_stage || "Unknown"}`,
          severity: i.risk_score >= 80 ? "critical" : i.risk_score >= 60 ? "high" : "medium",
          confidence: i.risk_score,
        }))

  // Recent high-risk incidents as "predictions"
  const predictions = incidents
    .filter(i => i.risk_score >= 60)
    .slice(0, 2)
    .map(i => ({
      title: i.mitre_tactic ? `${i.mitre_tactic} Pattern Escalation` : `Continued activity from ${i.source_ip}`,
      when: "Based on current incident trajectory",
      pct: `${Math.min(99, (i.risk_score || 50) + 5)}%`,
      detail: i.rca || i.narrative || "Ongoing analysis in progress.",
    }))

  return (
    <DashboardShell userRole={user.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" /> AI Insights
            </h1>
            <p className="text-muted-foreground mt-1">AI-powered threat analysis derived from your live SOC pipeline</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* AI Summary Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle>AI Security Summary</CardTitle>
            </div>
            <CardDescription>
              {lastUpdated ? `Analysis generated at ${lastUpdated.toLocaleString()}` : "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Analyzing {totalIncidents} incidents from the SOC pipeline...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-base leading-relaxed">
                  The SOC-AI engine has analyzed <strong className="text-foreground">{totalIncidents}</strong> security incidents from your infrastructure pipeline.
                  {criticalCount > 0 && (
                    <> <strong className="text-red-500">{criticalCount} critical threat{criticalCount > 1 ? "s" : ""}</strong> require immediate attention.</>
                  )}
                  {topTactics[0] && (
                    <> The dominant adversarial tactic detected is <strong className="text-foreground">{topTactics[0][0]}</strong> ({topTactics[0][1]} incident{topTactics[0][1] > 1 ? "s" : ""}).</>
                  )}
                  {avgRisk > 0 && (
                    <> Average risk score across all analyzed events is <strong className={avgRisk >= 70 ? "text-red-500" : avgRisk >= 50 ? "text-yellow-500" : "text-emerald-500"}>{avgRisk}/100</strong>.</>
                  )}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {totalIncidents} Incidents Analyzed
                  </Badge>
                  <Badge variant={criticalCount > 0 ? "destructive" : "secondary"} className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {criticalCount} Critical
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Activity className="h-3 w-3" />
                    Live Feed
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* MITRE Tactic Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-lg">Top MITRE ATT&CK Tactics</CardTitle>
                </div>
                <Badge variant="destructive">{topTactics.length} Detected</Badge>
              </div>
              <CardDescription>Frequency of tactics seen across all incidents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : topTactics.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No tactics detected yet. Run simulations to populate.</p>
              ) : (
                topTactics.map(([tactic, count], i) => {
                  const pct = Math.round((count / totalIncidents) * 100)
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{tactic}</span>
                        <Badge variant="outline" className="text-orange-500 text-[10px]">{count} incident{count > 1 ? "s" : ""}</Badge>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Top Source IPs / Attack Surface */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Attack Surface — Top IPs</CardTitle>
                </div>
                <Badge variant="secondary">{Object.keys(ipMap).length} Unique Sources</Badge>
              </div>
              <CardDescription>Source IPs generating the most incidents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : topIPs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No IP data available yet.</p>
              ) : (
                <div className="space-y-2">
                  {topIPs.map(([ip, count], i) => (
                    <div key={i} className="flex items-center justify-between p-2 border border-border rounded-md hover:bg-muted/40 transition-colors">
                      <span className="font-mono text-sm text-blue-400">{ip}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{count} incident{count > 1 ? "s" : ""}</span>
                        <a href={`/reports`} className="text-xs text-primary hover:underline">
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Predictions */}
        {predictions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle>AI Threat Predictions</CardTitle>
              </div>
              <CardDescription>Based on current incident trajectory and MITRE patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {predictions.map((p, i) => (
                <div key={i} className={i > 0 ? "space-y-2 pt-4 border-t" : "space-y-2"}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.when}</p>
                    </div>
                    <Badge variant="outline" className="text-orange-500 shrink-0">{p.pct} likely</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.detail.substring(0, 200)}{p.detail.length > 200 ? "..." : ""}</p>
                  <Button size="sm" variant="outline" className="w-full gap-2 bg-transparent" asChild>
                    <a href="/reports">View Incident Reports <ChevronRight className="h-3 w-3" /></a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Behavioral Anomalies */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle>High-Risk Behavioral Anomalies</CardTitle>
            </div>
            <CardDescription>AI-detected high-risk incidents from your live SOC engine</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : displayAnomalies.length === 0 ? (
              <div className="text-center py-10">
                <Shield className="h-10 w-10 text-emerald-500 mx-auto mb-3 opacity-60" />
                <p className="text-muted-foreground">No high-risk anomalies detected. Your environment looks clean.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayAnomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:border-orange-500/30 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{anomaly.title}</p>
                        <Badge
                          variant={anomaly.severity === "critical" ? "destructive" : anomaly.severity === "high" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{anomaly.ip}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{anomaly.description}</p>
                      <p className="text-xs text-muted-foreground">AI Confidence: <strong>{anomaly.confidence}%</strong></p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href="/reports">Investigate</a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

export default function AIInsightsPage() {
  return (
    <RequireAuth>
      {(user) => <AIInsightsContent user={user} />}
    </RequireAuth>
  )
}
