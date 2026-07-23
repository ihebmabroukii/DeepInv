"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Eye, RefreshCw, Clock, AlertTriangle, Shield, Zap, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReportEntry {
  id: string
  title: string
  timestamp: string
  severity: "critical" | "high" | "medium" | "low"
  risk_score: number
  mitre_tactic: string | null
  source_ip: string
  status: string
}

function severityColor(severity: string) {
  switch (severity) {
    case "critical": return "text-red-500 bg-red-500/10 border-red-500/30"
    case "high":     return "text-orange-500 bg-orange-500/10 border-orange-500/30"
    case "medium":   return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30"
    default:         return "text-blue-500 bg-blue-500/10 border-blue-500/30"
  }
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical": return <AlertTriangle className="h-3.5 w-3.5" />
    case "high":     return <Zap className="h-3.5 w-3.5" />
    case "medium":   return <TrendingUp className="h-3.5 w-3.5" />
    default:         return <Shield className="h-3.5 w-3.5" />
  }
}

export function ReportCenter() {
  const [reports, setReports] = useState<ReportEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("http://localhost:8001/api/v1/alerts/incidents")
      if (res.ok) {
        const incidents = await res.json()
        const mapped: ReportEntry[] = incidents.map((inc: any) => {
          let severity: ReportEntry["severity"] = "low"
          if (inc.risk_score >= 80) severity = "critical"
          else if (inc.risk_score >= 60) severity = "high"
          else if (inc.risk_score >= 40) severity = "medium"

          // Best-effort title
          const title =
            inc.narrative
              ? inc.narrative.split(".")[0].substring(0, 72)
              : inc.mitre_tactic
              ? `${inc.mitre_tactic} — ${inc.attack_stage || "Detected"}`
              : `Suspicious Activity from ${inc.source_ip}`

          return {
            id: inc.id,
            title,
            timestamp: inc.created_at || new Date().toISOString(),
            severity,
            risk_score: inc.risk_score || 0,
            mitre_tactic: inc.mitre_tactic || null,
            source_ip: inc.source_ip || "Unknown",
            status: inc.status || "pending",
          }
        })

        // Newest first (risk as tiebreaker) so freshly analyzed incidents always
        // surface at the top instead of being buried under old high-risk ones.
        mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() || b.risk_score - a.risk_score)
        setReports(mapped)
        setLastRefresh(new Date())
      }
    } catch (e) {
      console.warn("ReportCenter: failed to fetch incidents", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
    const iv = setInterval(fetchReports, 60_000)
    return () => clearInterval(iv)
  }, [])

  const displayed = reports.slice(0, 6)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <CardTitle>Report Center</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchReports}
            disabled={isLoading}
            title="Refresh reports"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
        <CardDescription className="flex items-center justify-between">
          <span>AI-analyzed incident reports from the SOC engine</span>
          {lastRefresh && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {isLoading && reports.length === 0 ? (
            /* Skeleton loaders */
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 animate-pulse">
                <div className="h-8 w-8 rounded bg-muted/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted/60 rounded w-3/4" />
                  <div className="h-2 bg-muted/40 rounded w-1/2" />
                </div>
                <div className="h-6 w-16 bg-muted/40 rounded" />
              </div>
            ))
          ) : displayed.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reports yet.</p>
              <p className="text-xs mt-1">Run a simulation to generate AI incident reports.</p>
            </div>
          ) : (
            displayed.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-colors group"
              >
                {/* Left — icon + info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("p-1.5 rounded shrink-0", severityColor(report.severity))}>
                    {severityIcon(report.severity)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-1">{report.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(report.timestamp).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">· {report.source_ip}</span>
                      {report.mitre_tactic && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 hidden sm:inline-flex">
                          {report.mitre_tactic}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right — risk + badge + view */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {/* Risk pill */}
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                    severityColor(report.severity)
                  )}>
                    {report.risk_score}/100
                  </span>

                  <Badge
                    className={cn(
                      "text-[10px] capitalize hidden sm:inline-flex",
                      report.severity === "critical" ? "bg-red-600 text-white" :
                      report.severity === "high"     ? "bg-orange-600 text-white" :
                      report.severity === "medium"   ? "bg-yellow-600 text-white" :
                                                       "bg-blue-600 text-white"
                    )}
                  >
                    {report.severity}
                  </Badge>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 group-hover:text-primary transition-colors"
                    asChild
                  >
                    <a href={`/reports/${encodeURIComponent(report.id)}`}>
                      <Eye className="h-3 w-3" /> View
                    </a>
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* Footer actions */}
          {!isLoading && reports.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-muted-foreground">
                Showing {displayed.length} of {reports.length} incident reports
              </p>
              <Button variant="outline" size="sm" className="text-xs gap-1 border-dashed h-7" asChild>
                <a href="/reports">
                  <FileText className="h-3 w-3" /> View All Reports
                </a>
              </Button>
            </div>
          )}

          {!isLoading && reports.length === 0 && (
            <Button variant="outline" className="w-full text-xs gap-2 border-dashed mt-1" asChild>
              <a href="/reports">Open Report Center</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
