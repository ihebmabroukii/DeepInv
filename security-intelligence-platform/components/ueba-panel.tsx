"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, AlertTriangle, RefreshCw, Clock, Globe, Shield,
  Monitor, Network, Activity, ChevronDown, ChevronUp, Skull,
  MapPin, Server, Cpu, Moon
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UEBAProfile {
  username: string
  anomaly_score: number
  known_ips: string[]
  internal_ips: string[]
  external_ips: string[]
  destination_ips: string[]
  known_processes: string[]
  suspicious_processes: string[]
  known_hosts: string[]
  active_hours: number[]
  off_hours_activity: number[]
  hours_breakdown: Record<string, number>
  total_activity_events: number
}

function scoreColor(score: number) {
  if (score >= 0.8) return { text: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    bar: "bg-red-500",    label: "CRITICAL" }
  if (score >= 0.5) return { text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", bar: "bg-orange-500", label: "HIGH" }
  if (score >= 0.2) return { text: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", bar: "bg-yellow-500", label: "MEDIUM" }
  return               { text: "text-emerald-500",  bg: "bg-emerald-500/10", border: "border-emerald-500/30", bar: "bg-emerald-500", label: "NORMAL" }
}

function HourHeatmap({ hours }: { hours: Record<string, number> }) {
  const max = Math.max(...Object.values(hours).map(Number), 1)
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
        <Moon className="h-3 w-3" /> Access Hours (24h clock)
      </p>
      <div className="flex gap-px">
        {Array.from({ length: 24 }, (_, h) => {
          const count = Number(hours[String(h)] || 0)
          const intensity = count / max
          const isOffHour = h < 6 || h > 22
          return (
            <div key={h} className="flex flex-col items-center gap-0.5 flex-1" title={`${h}:00 — ${count} event${count !== 1 ? 's' : ''}`}>
              <div
                className={cn(
                  "w-full rounded-sm transition-all",
                  count === 0 ? "bg-muted/30 h-3" :
                  isOffHour   ? "bg-red-500 h-3"  : "bg-indigo-500 h-3",
                )}
                style={{ opacity: count === 0 ? 0.2 : Math.max(0.3, intensity) }}
              />
              {(h % 6 === 0) && <span className="text-[8px] text-muted-foreground/60">{h}</span>}
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-1">
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" /> Business hours</span>
        <span className="flex items-center gap-1 text-[9px] text-red-400"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Off-hours (suspicious)</span>
      </div>
    </div>
  )
}

function ProfileCard({ profile }: { profile: UEBAProfile }) {
  const [open, setOpen] = useState(profile.anomaly_score >= 0.5)
  const c = scoreColor(profile.anomaly_score)
  const pct = Math.round(profile.anomaly_score * 100)

  return (
    <div className={cn("border rounded-lg overflow-hidden", c.border, c.bg)}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", c.bg, c.border, "border")}>
          <Users className={cn("h-4 w-4", c.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-foreground">{profile.username}</span>
            <Badge className={cn("text-[10px] px-1.5", c.bg, c.text, "border", c.border)}>{c.label}</Badge>
            {profile.suspicious_processes.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 gap-1">
                <Skull className="h-2.5 w-2.5" /> {profile.suspicious_processes.length} malicious proc{profile.suspicious_processes.length > 1 ? 's' : ''}
              </Badge>
            )}
            {profile.external_ips.length > 0 && (
              <Badge className="text-[10px] px-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 gap-1">
                <Globe className="h-2.5 w-2.5" /> {profile.external_ips.length} external IP{profile.external_ips.length > 1 ? 's' : ''}
              </Badge>
            )}
            {profile.off_hours_activity.length > 0 && (
              <Badge className="text-[10px] px-1.5 bg-red-500/10 text-red-400 border border-red-500/30 gap-1">
                <Moon className="h-2.5 w-2.5" /> off-hours
              </Badge>
            )}
          </div>
          {/* Anomaly score bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", c.bar)} style={{ width: `${pct}%` }} />
            </div>
            <span className={cn("text-[10px] font-mono font-bold shrink-0", c.text)}>{pct}% anomaly</span>
          </div>
        </div>

        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-border/40 p-4 space-y-4 bg-background/50">

          {/* Row 1: Who / Where from */}
          <div className="grid grid-cols-2 gap-3">
            {/* Source IPs */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Source IPs
              </p>
              <div className="space-y-1">
                {profile.internal_ips.map(ip => (
                  <div key={ip} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-mono text-xs text-foreground">{ip}</span>
                    <span className="text-[9px] text-emerald-400 ml-auto">internal</span>
                  </div>
                ))}
                {profile.external_ips.map(ip => (
                  <div key={ip} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="font-mono text-xs text-red-400 font-bold">{ip}</span>
                    <span className="text-[9px] text-red-400 ml-auto">EXTERNAL</span>
                  </div>
                ))}
                {profile.known_ips.length === 0 && <p className="text-xs text-muted-foreground italic">No IPs recorded</p>}
              </div>
            </div>

            {/* Destination IPs (blast radius) */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <Network className="h-3 w-3" /> Accessed Systems
              </p>
              <div className="space-y-1">
                {profile.destination_ips.map(ip => (
                  <div key={ip} className="flex items-center gap-1.5">
                    <Server className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span className="font-mono text-xs text-foreground">{ip}</span>
                  </div>
                ))}
                {profile.known_hosts.map(h => (
                  <div key={h} className="flex items-center gap-1.5">
                    <Monitor className="h-3 w-3 text-blue-400 shrink-0" />
                    <span className="font-mono text-xs text-foreground">{h}</span>
                  </div>
                ))}
                {profile.destination_ips.length === 0 && profile.known_hosts.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No lateral movement recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Processes */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Process Execution Profile
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.known_processes.map(proc => {
                const isSus = profile.suspicious_processes.includes(proc)
                return (
                  <span
                    key={proc}
                    className={cn(
                      "inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border",
                      isSus
                        ? "bg-red-500/20 text-red-400 border-red-500/40 font-bold"
                        : "bg-muted/40 text-muted-foreground border-border/40"
                    )}
                  >
                    {isSus && <Skull className="h-2.5 w-2.5" />}
                    {proc}
                  </span>
                )
              })}
              {profile.known_processes.length === 0 && <p className="text-xs text-muted-foreground italic">No process telemetry</p>}
            </div>
          </div>

          {/* Row 3: Hour heatmap */}
          {Object.keys(profile.hours_breakdown).length > 0 && (
            <HourHeatmap hours={profile.hours_breakdown} />
          )}

          {/* Row 4: Off-hours warning */}
          {profile.off_hours_activity.length > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">
                Activity detected outside business hours at:{" "}
                <span className="font-mono font-bold">
                  {profile.off_hours_activity.map(h => `${String(h).padStart(2,'0')}:00`).join(', ')}
                </span>
                {" "}— potential insider threat or compromised account.
              </p>
            </div>
          )}

          {/* Row 5: Summary stats */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Total Events",   value: profile.total_activity_events, icon: <Activity className="h-3 w-3" /> },
              { label: "Unique Src IPs", value: profile.known_ips.length,      icon: <MapPin className="h-3 w-3" /> },
              { label: "Systems Hit",    value: profile.destination_ips.length + profile.known_hosts.length, icon: <Server className="h-3 w-3" /> },
            ].map(s => (
              <div key={s.label} className="bg-muted/20 rounded p-2 text-center border border-border/30">
                <div className="flex justify-center text-muted-foreground mb-0.5">{s.icon}</div>
                <div className="text-lg font-bold font-mono">{s.value}</div>
                <div className="text-[9px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function UEBAPanel() {
  const [profiles, setProfiles] = useState<UEBAProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/soc-api/api/v1/alerts/ueba/profiles")
      if (res.ok) {
        setProfiles(await res.json())
        setLastUpdated(new Date())
      }
    } catch (e) {
      console.warn("UEBA fetch failed", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 60_000)
    return () => clearInterval(iv)
  }, [])

  const anomalous = profiles.filter(p => p.anomaly_score > 0)
  const critical  = profiles.filter(p => p.anomaly_score >= 0.8)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-lg">UEBA — User Behavior Analytics</CardTitle>
            {critical.length > 0 && (
              <Badge className="bg-red-600 text-white text-[10px]">{critical.length} critical</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
        <CardDescription className="flex items-center justify-between">
          <span>Per-user behavioral profiles — who, where, what, and when</span>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary strip */}
        {!loading && profiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: "Users Tracked",  value: profiles.length,   color: "text-indigo-400" },
              { label: "Anomalous",      value: anomalous.length,  color: "text-orange-400" },
              { label: "Critical Risk",  value: critical.length,   color: "text-red-500"    },
            ].map(s => (
              <div key={s.label} className="bg-muted/30 rounded-lg p-2 border border-border/40 text-center">
                <div className={cn("text-xl font-bold font-mono", s.color)}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && profiles.length === 0 ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse border border-border/30" />)}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-10">
            <Shield className="h-10 w-10 text-emerald-500 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground font-medium">No user profiles yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run simulations to build behavioral baselines</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map(p => <ProfileCard key={p.username} profile={p} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
