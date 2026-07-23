"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crosshair, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetIncidents } from "@/lib/api"

// Human-readable names for the techniques this platform commonly observes.
const TECHNIQUE_NAMES: Record<string, string> = {
  T1566: "Phishing",
  T1059: "Command & Scripting Interpreter",
  T1071: "Application Layer Protocol",
  "T1071.004": "Application Layer Protocol: DNS",
  T1003: "OS Credential Dumping",
  "T1003.008": "Credential Dumping: /etc/shadow",
  T1046: "Network Service Discovery",
  T1110: "Brute Force",
  "T1110.001": "Brute Force: Password Guessing",
  "T1110.003": "Brute Force: Password Spraying",
  T1078: "Valid Accounts",
  T1548: "Abuse Elevation Control Mechanism",
  "T1548.003": "Sudo and Sudo Caching",
  T1098: "Account Manipulation",
  "T1098.004": "SSH Authorized Keys",
  T1053: "Scheduled Task/Job",
  "T1053.005": "Scheduled Task/Job: Cron",
  T1021: "Remote Services",
  "T1021.004": "Remote Services: SSH",
  T1074: "Data Staged",
  "T1074.001": "Local Data Staging",
  T1048: "Exfiltration Over Alternative Protocol",
  T1070: "Indicator Removal",
  "T1070.002": "Clear Linux or Mac System Logs",
  T1105: "Ingress Tool Transfer",
  T1086: "PowerShell",
  "T1059.001": "PowerShell",
  T1077: "Windows Admin Shares",
  "T1077.001": "Windows Admin Shares",
  "T1021.002": "SMB/Windows Admin Shares",
  T1136: "Create Account",
  T1190: "Exploit Public-Facing Application",
  T1133: "External Remote Services",
}

const techName = (id: string) =>
  TECHNIQUE_NAMES[id] || TECHNIQUE_NAMES[id.split(".")[0]] || "MITRE Technique"

const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }

const sevClass = (s: string) =>
  s === "critical"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : s === "high"
    ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
    : s === "medium"
    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"

const barColor = (s: string) =>
  s === "critical" ? "bg-destructive" : s === "high" ? "bg-orange-500" : s === "medium" ? "bg-blue-500" : "bg-emerald-500"

export function MitreTactics() {
  const { data: incidents, isLoading } = useGetIncidents()

  // Aggregate techniques across all analysed incidents: frequency + worst severity.
  const techniques = useMemo(() => {
    const list = (incidents as any[]) || []
    const map = new Map<string, { id: string; count: number; sev: string; tactic: string }>()
    for (const inc of list) {
      const ttps: string[] = inc.exact_mitre_ttps || []
      const sev: string = inc.severity || "low"
      const tactic: string = inc.mitre_tactic || ""
      for (const raw of ttps) {
        const id = String(raw).trim().toUpperCase()
        if (!/^T\d{4}/.test(id)) continue
        const e = map.get(id) || { id, count: 0, sev: "low", tactic: "" }
        e.count += 1
        if ((SEV_RANK[sev] || 0) > (SEV_RANK[e.sev] || 0)) e.sev = sev
        if (!e.tactic && tactic) e.tactic = tactic.split(",")[0].trim()
        map.set(id, e)
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || (SEV_RANK[b.sev] || 0) - (SEV_RANK[a.sev] || 0),
    )
  }, [incidents])

  const incidentCount = ((incidents as any[]) || []).length
  const maxCount = techniques.length ? techniques[0].count : 1
  const top = techniques.slice(0, 7)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-destructive" />
            <CardTitle>MITRE ATT&CK® Matrix</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </Badge>
        </div>
        <CardDescription>
          {techniques.length > 0
            ? `${techniques.length} techniques observed across ${incidentCount} analysed incidents`
            : "Techniques mapped from analysed incidents"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center animate-pulse">Loading live ATT&CK context…</p>
        ) : top.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No MITRE techniques observed yet.</p>
        ) : (
          <div className="space-y-3">
            {top.map((t) => (
              <div
                key={t.id}
                className="group relative flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-background/50 hover:border-destructive/30 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{t.id}</span>
                    <span className="text-sm font-semibold truncate">{techName(t.id)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground" title="Times observed">×{t.count}</span>
                    <Badge variant="secondary" className={cn("text-[10px] px-1 py-0 border", sevClass(t.sev))}>
                      {t.sev}
                    </Badge>
                  </div>
                </div>

                {/* Frequency bar — how often this technique appears across incidents */}
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", barColor(t.sev))}
                    style={{ width: `${Math.max(8, Math.round((t.count / maxCount) * 100))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground italic truncate">{t.tactic || "Unmapped tactic"}</span>
                  <a
                    href={`https://attack.mitre.org/techniques/${t.id.replace(".", "/")}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    View TTP <ExternalLink className="h-2 w-2" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
