"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Calendar, TrendingUp, AlertTriangle, Shield } from "lucide-react"
import { useGetIncidents } from "@/lib/api"
import { logAuditEvent } from "@/lib/auth"
import { toast } from "sonner"

const SOC_API = "/soc-api"

function buildReportText(inc: any): string {
  const line = "=".repeat(70)
  const list = (v: any) => Array.isArray(v) && v.length ? v.map((x: string) => `  - ${x}`).join("\n") : "  (none)"
  const ti = inc.threat_intel || {}
  return [
    line,
    `  SECURITY INCIDENT REPORT — ${inc.id}`,
    line,
    `Generated      : ${new Date().toISOString()}`,
    `Source IP      : ${inc.source_ip || "N/A"}`,
    `Victim         : ${inc.victim_ip || "N/A"}`,
    `Risk Score     : ${inc.risk_score ?? "N/A"} / 100`,
    `Attack Stage   : ${inc.attack_stage || "N/A"}`,
    `MITRE Tactic   : ${inc.mitre_tactic || "N/A"}`,
    `Status         : ${inc.status || "N/A"}`,
    `Alerts         : ${inc.alerts ? inc.alerts.length : 0}`,
    "",
    "NARRATIVE",
    "-".repeat(70),
    inc.narrative || "N/A",
    "",
    "ROOT CAUSE ANALYSIS",
    "-".repeat(70),
    inc.rca || "N/A",
    "",
    "AI REASONING",
    "-".repeat(70),
    inc.ai_reasoning || "N/A",
    "",
    "MITRE ATT&CK TTPs",
    "-".repeat(70),
    list(inc.exact_mitre_ttps),
    "",
    "UEBA BEHAVIORAL ANOMALIES",
    "-".repeat(70),
    list(inc.ueba_indicators),
    "",
    "BLAST RADIUS",
    "-".repeat(70),
    list(inc.blast_radius),
    "",
    "CVEs",
    "-".repeat(70),
    list(inc.cves_exploited),
    "",
    "PREDICTED NEXT STEPS",
    "-".repeat(70),
    inc.predicted_next_steps || "N/A",
    "",
    "AI RECOMMENDATIONS",
    "-".repeat(70),
    inc.ai_recommendations || "N/A",
    "",
    "RECOMMENDED PLAYBOOK",
    "-".repeat(70),
    inc.recommended_playbook || "N/A",
    "",
    "THREAT INTEL",
    "-".repeat(70),
    `  OpenCTI : ${(ti.opencti || []).join(", ") || "none"}`,
    `  Cortex  : ${(ti.cortex || []).join(", ") || "none"}`,
    `  TheHive : ${(ti.thehive || []).join(", ") || "none"}`,
    line,
  ].join("\n")
}

async function downloadLatestReport() {
  const t = toast.loading("Generating latest report…")
  try {
    const res = await fetch(`${SOC_API}/api/v1/alerts/incidents`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const incidents = await res.json()
    const analyzed = (Array.isArray(incidents) ? incidents : []).filter((i: any) => i.narrative)
    if (analyzed.length === 0) { toast.error("No analyzed report available yet.", { id: t }); return }
    const latest = analyzed[0]
    const blob = new Blob([buildReportText(latest)], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `SOC-Report-${latest.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    logAuditEvent("download_report", "incident", latest.id, { risk_score: latest.risk_score, source_ip: latest.source_ip })
    toast.success("Report downloaded", { id: t, description: latest.id })
  } catch (e: any) {
    toast.error("Failed to generate report", { id: t, description: String(e?.message || e) })
  }
}

function ReportsList() {
  const { data: incidents, isLoading } = useGetIncidents()

  if (isLoading) return <p className="text-muted-foreground p-4 text-sm animate-pulse">Loading reports...</p>
  if (!incidents || incidents.length === 0) return <p className="text-muted-foreground p-4 text-sm">No AI reports generated yet.</p>

  return (
    <>
      {incidents.slice(0, 10).map((report: any) => (
        <div key={report.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-orange-500/30 transition-colors">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-orange-400" />
            <div>
              <p className="font-medium text-sm">{report.title}</p>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-xs text-muted-foreground">{new Date(report.timestamp).toLocaleString()}</span>
                <Badge variant={report.severity === "critical" ? "destructive" : "secondary"} className="text-[10px] h-4">{report.severity}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-500" asChild>
              <a href={`/reports/${report.id}`}><FileText className="h-3 w-3" /> View</a>
            </Button>
          </div>
        </div>
      ))}
    </>
  )
}

export default function ReportsPage() {
  return (
    <RequireAuth>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Security Reports</h1>
                <p className="text-muted-foreground">Generate and view security analysis reports</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-base">Monthly Security Overview</CardTitle>
                    </div>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">Comprehensive monthly security posture report.</p>
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <a href="/reports/monthly"><TrendingUp className="h-3 w-3" /> View Overview</a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-500" />
                      <CardTitle className="text-base">Compliance Report</CardTitle>
                    </div>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">SOC2, ISO 27001, and GDPR compliance status.</p>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadLatestReport}>
                    <Download className="h-3 w-3" /> Download Last Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historical Incident Reports</CardTitle>
                <CardDescription>AI-generated cyber defense analyses from the SOC engine.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ReportsList />
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
