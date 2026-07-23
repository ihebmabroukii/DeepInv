"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, AlertTriangle, CheckCircle2, Shield, RefreshCw, Search, Filter } from "lucide-react"

function TimelineContent({ user }: { user: any }) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [severityFilter, setSeverityFilter] = useState("all")

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://localhost:8001/api/v1/alerts/incidents")
      if (res.ok) {
        const data = await res.json()
        // Sort newest first
        data.sort((a: any, b: any) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0
          return tb - ta
        })
        setIncidents(data)
        setFiltered(data)
      }
    } catch (e) {
      console.warn("Timeline fetch failed:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let result = incidents
    if (search) {
      result = result.filter(i =>
        i.source_ip?.includes(search) ||
        i.mitre_tactic?.toLowerCase().includes(search.toLowerCase()) ||
        i.narrative?.toLowerCase().includes(search.toLowerCase()) ||
        i.attack_stage?.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (severityFilter !== "all") {
      result = result.filter(i => {
        const score = i.risk_score || 0
        if (severityFilter === "critical") return score >= 80
        if (severityFilter === "high")     return score >= 60 && score < 80
        if (severityFilter === "medium")   return score >= 40 && score < 60
        if (severityFilter === "low")      return score < 40
        return true
      })
    }
    setFiltered(result)
  }, [search, severityFilter, incidents])

  const getSeverity = (score: number) => {
    if (score >= 80) return "critical"
    if (score >= 60) return "high"
    if (score >= 40) return "medium"
    return "low"
  }

  const getSeverityStyles = (score: number) => {
    const sev = getSeverity(score)
    const map: Record<string, { border: string; dot: string; badge: string }> = {
      critical: { border: "border-l-red-500",    dot: "bg-red-500",    badge: "bg-red-500/10 text-red-500 border-red-500/30" },
      high:     { border: "border-l-orange-500", dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
      medium:   { border: "border-l-yellow-500", dot: "bg-yellow-500", badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
      low:      { border: "border-l-blue-500",   dot: "bg-blue-500",   badge: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
    }
    return map[sev]
  }

  const getIcon = (score: number) => {
    if (score >= 80) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (score >= 60) return <AlertTriangle className="h-4 w-4 text-orange-500" />
    if (score >= 40) return <Shield className="h-4 w-4 text-yellow-500" />
    return <CheckCircle2 className="h-4 w-4 text-blue-500" />
  }

  // Group by date
  const groupedByDate: Record<string, any[]> = {}
  filtered.forEach(inc => {
    const dateStr = inc.created_at
      ? new Date(inc.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : "Unknown Date"
    if (!groupedByDate[dateStr]) groupedByDate[dateStr] = []
    groupedByDate[dateStr].push(inc)
  })

  return (
    <DashboardShell userRole={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              Security Timeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Chronological view of all AI-analyzed security incidents — live feed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, tactic, or narrative..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {["all", "critical", "high", "medium", "low"].map(level => (
              <Button
                key={level}
                variant={severityFilter === level ? "default" : "outline"}
                size="sm"
                onClick={() => setSeverityFilter(level)}
                className="capitalize"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-4 text-sm">
          {[
            { label: "Total", count: incidents.length, color: "text-foreground" },
            { label: "Critical", count: incidents.filter(i => (i.risk_score || 0) >= 80).length, color: "text-red-500" },
            { label: "High",     count: incidents.filter(i => (i.risk_score || 0) >= 60 && (i.risk_score || 0) < 80).length, color: "text-orange-500" },
            { label: "Medium",   count: incidents.filter(i => (i.risk_score || 0) >= 40 && (i.risk_score || 0) < 60).length, color: "text-yellow-500" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md bg-card">
              <span className="text-muted-foreground">{s.label}:</span>
              <span className={`font-bold font-mono ${s.color}`}>{s.count}</span>
            </div>
          ))}
          <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Showing {filtered.length} of {incidents.length}
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="ml-16 h-24 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground">No incidents match your filters.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([date, dayIncidents]) => (
                <div key={date}>
                  {/* Date label */}
                  <div className="relative flex items-center mb-4 ml-16">
                    <div className="absolute -left-12 w-6 h-6 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-background px-2">
                      {date}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dayIncidents.map((inc, idx) => {
                      const score = inc.risk_score || 0
                      const styles = getSeverityStyles(score)
                      const sev = getSeverity(score)
                      const timeStr = inc.created_at
                        ? new Date(inc.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                        : "—"

                      return (
                        <div key={idx} className="relative ml-16">
                          {/* Dot on the line */}
                          <div className={`absolute -left-[2.35rem] top-4 w-3 h-3 rounded-full border-2 border-background ${styles.dot}`} />

                          <Card className={`border-l-4 ${styles.border} hover:shadow-md transition-shadow`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="mt-0.5 shrink-0">{getIcon(score)}</div>
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    {/* Title line */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-sm leading-tight">
                                        {inc.mitre_tactic
                                          ? `${inc.mitre_tactic} — ${inc.attack_stage || "Attack Detected"}`
                                          : `Suspicious Activity from ${inc.source_ip}`}
                                      </p>
                                      <Badge variant="outline" className={`text-[10px] shrink-0 ${styles.badge}`}>
                                        {sev}
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                                        Risk: {score}/100
                                      </Badge>
                                    </div>
                                    {/* Narrative */}
                                    {inc.narrative && (
                                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                        {inc.narrative}
                                      </p>
                                    )}
                                    {/* Meta badges */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="secondary" className="text-[10px]">
                                        {inc.source_ip || "Unknown IP"}
                                      </Badge>
                                      {inc.mitre_tactic && (
                                        <Badge variant="outline" className="text-[10px]">{inc.mitre_tactic}</Badge>
                                      )}
                                      {inc.status && (
                                        <Badge
                                          className={`text-[10px] ${inc.status === "resolved" ? "bg-emerald-600" : "bg-gray-600"} text-white`}
                                        >
                                          {inc.status}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {/* Right side: time + action */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <Badge variant="outline" className="font-mono text-[10px]">{timeStr}</Badge>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2" asChild>
                                    <a href={`/reports/${encodeURIComponent(inc.id)}`}>View Report →</a>
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

export default function TimelinePage() {
  return (
    <RequireAuth>
      {(user) => <TimelineContent user={user} />}
    </RequireAuth>
  )
}
