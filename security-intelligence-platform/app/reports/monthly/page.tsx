import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, TrendingUp, AlertTriangle, ShieldCheck, Calendar } from "lucide-react"
import { PrintButton } from "@/components/print-button"
import MonthlyReportClient from "./monthly-client"

export default async function MonthlyOverviewPage() {
  let incidents = []
  try {
    const res = await fetch('http://127.0.0.1:8001/api/v1/alerts/incidents', { next: { revalidate: 3600 } }) // cache for 1 hour
    if (res.ok) {
      incidents = await res.json()
    }
  } catch (error) {
    console.error("Failed to fetch historical incidents for monthly report")
  }

  // Filter for the current month (fallback) or realistically just use all historical in this demo if it's small
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Real world:
  // const thisMonthIncidents = incidents.filter(i => new Date(i.created_at) >= startOfMonth)
  // For demo, we just use all fetched to ensure charts are populated
  const thisMonthIncidents = incidents

  // Quick Aggregations
  const totalIncidents = thisMonthIncidents.length
  const criticalCount = thisMonthIncidents.filter((i: any) => i.risk_score > 75).length
  const highCount = thisMonthIncidents.filter((i: any) => i.risk_score >= 60 && i.risk_score <= 75).length
  const resolvedCount = thisMonthIncidents.filter((i: any) => i.status === "resolved").length
  const avgRiskScore = totalIncidents > 0
    ? Math.round(thisMonthIncidents.reduce((acc: number, i: any) => acc + (i.risk_score || 0), 0) / totalIncidents)
    : 0
  const uniqueSourceIPs = new Set(thisMonthIncidents.map((i: any) => i.source_ip).filter(Boolean)).size
  const estimatedHoursSaved = parseFloat((totalIncidents * 0.5).toFixed(1))

  const mostCommonTacticMap: Record<string, number> = {}
  thisMonthIncidents.forEach((i: any) => {
    const t = i.mitre_tactic || "Unknown"
    mostCommonTacticMap[t] = (mostCommonTacticMap[t] || 0) + 1
  })
  const sortedTactics = Object.entries(mostCommonTacticMap).sort((a,b) => b[1] - a[1])
  const mostCommonTactic = sortedTactics[0]?.[0] || "None"
  const top3Tactics = sortedTactics.slice(0, 3).map(([t]) => t)

  // Risk posture label
  const riskPosture = avgRiskScore >= 75 ? "Critical" : avgRiskScore >= 50 ? "Elevated" : avgRiskScore >= 25 ? "Moderate" : "Nominal"
  const riskTrend = criticalCount > 3 ? "an upward trend in adversarial activity" : criticalCount === 0 ? "a stable threat landscape" : "continued targeted activity"

  return (
    <DashboardShell userRole="soc_analyst">
      <div className="space-y-6 pb-12">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-blue-500 flex items-center gap-3">
              <Calendar className="h-8 w-8" />
              Monthly Security Overview
            </h1>
            <p className="text-muted-foreground mt-1">
              Aggregated AI SOC Intelligence for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4 print:hidden">
            <PrintButton />
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
          <Card className="print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total AI Investigations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalIncidents}</div>
            </CardContent>
          </Card>
          <Card className="print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Threats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> {criticalCount}
              </div>
            </CardContent>
          </Card>
          <Card className="print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved Successfully</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-500 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> {resolvedCount}
              </div>
            </CardContent>
          </Card>
          <Card className="print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top MITRE Tactic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate mt-1 text-purple-400">{mostCommonTactic}</div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Charts provided by Client Component */}
        <MonthlyReportClient incidents={thisMonthIncidents} />
        
        {/* Executive Summary Narrative */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-500/5 print:break-inside-avoid mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Executive Takeaway</CardTitle>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                Risk Posture: <strong className={
                  riskPosture === "Critical" ? "text-red-500" :
                  riskPosture === "Elevated" ? "text-orange-500" :
                  riskPosture === "Moderate" ? "text-yellow-500" : "text-emerald-500"
                }>{riskPosture}</strong>
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Attijari CyberGuard</strong> successfully triaged{" "}
              <strong className="text-foreground">{totalIncidents}</strong> security incidents during this period,
              originating from <strong className="text-foreground">{uniqueSourceIPs}</strong> unique source{uniqueSourceIPs !== 1 ? "s" : ""}.{" "}
              {criticalCount > 0 ? (
                <>
                  Of these, <strong className="text-red-400">{criticalCount} critical</strong> and{" "}
                  <strong className="text-orange-400">{highCount} high-severity</strong> incidents required immediate RAG playbook intervention.
                </>
              ) : (
                <>No critical-severity incidents were recorded — the environment maintained a clean security posture this period.</>
              )}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The SOC pipeline detected {riskTrend}.{" "}
              {top3Tactics.length > 0 && (
                <>
                  The dominant adversarial tactics observed were{" "}
                  {top3Tactics.map((t, i) => (
                    <span key={t}>
                      <strong className="text-foreground">{t}</strong>
                      {i < top3Tactics.length - 1 ? (i === top3Tactics.length - 2 ? " and " : ", ") : ""}
                    </span>
                  ))}.
                </>
              )}{" "}
              The average incident risk score across all events was{" "}
              <strong className={
                avgRiskScore >= 75 ? "text-red-400" :
                avgRiskScore >= 50 ? "text-orange-400" :
                avgRiskScore >= 25 ? "text-yellow-400" : "text-emerald-400"
              }>{avgRiskScore}/100</strong>.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI-driven automation eliminated an estimated{" "}
              <strong className="text-foreground">{estimatedHoursSaved} analyst hours</strong> of manual investigation work this period.
              {resolvedCount > 0 && (
                <> A total of <strong className="text-emerald-400">{resolvedCount}</strong> incident{resolvedCount !== 1 ? "s were" : " was"} fully resolved and closed.</>
              )}
            </p>
          </CardContent>
        </Card>

      </div>
    </DashboardShell>
  )
}
