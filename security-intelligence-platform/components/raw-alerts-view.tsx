"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertTriangle,
  Server,
  Terminal,
  Bell,
  Play,
  Pause,
  Trash2,
  Search,
  Wifi,
  WifiOff,
  Copy,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NormalizedAlert {
  alert_id: string
  original_alert_id?: string
  timestamp: string
  source_system: string
  name: string
  description?: string
  severity: "low" | "medium" | "high" | "critical"
  src_ip?: string
  dst_ip?: string
  src_port?: number
  dst_port?: number
  hostname?: string
  user?: string
  file_path?: string
  process_name?: string
  file_hash?: string
  mitre_technique_id?: string
  mitre_technique_name?: string
  raw_data?: Record<string, any>
}

export function RawAlertsView() {
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  
  // Real-time WS connection state
  const [wsConnected, setWsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  // Modal for viewing raw alert JSON
  const [selectedAlert, setSelectedAlert] = useState<NormalizedAlert | null>(null)
  const [copied, setCopied] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  
  // Ref to hold current alerts state so WebSocket handler always has the latest state
  const alertsRef = useRef<NormalizedAlert[]>([])
  const isPausedRef = useRef(false)

  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  // Fetch initial history
  useEffect(() => {
    fetch("http://localhost:8001/api/v1/alerts/raw")
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status)
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAlerts(data)
        }
      })
      .catch((err) => {
        console.error("Failed to load initial raw alerts:", err)
      })
  }, [])

  // Establish WebSocket connection
  useEffect(() => {
    function connect() {
      setIsReconnecting(false)
      const socket = new WebSocket("ws://localhost:8001/ws")
      wsRef.current = socket

      socket.onopen = () => {
        console.log("WebSocket connected to raw alert stream")
        setWsConnected(true)
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === "raw_alert") {
            const rawAlert = payload.data as NormalizedAlert
            
            // Prepend new alert unless the stream is paused
            if (!isPausedRef.current) {
              setAlerts((prev) => {
                // Deduplicate just in case
                if (prev.some((a) => a.alert_id === rawAlert.alert_id)) {
                  return prev
                }
                // Prepend and limit size to 200
                return [rawAlert, ...prev].slice(0, 200)
              })
            }
          }
        } catch (err) {
          console.error("Error parsing WS message:", err)
        }
      }

      socket.onclose = () => {
        console.log("WebSocket closed. Attempting reconnect...")
        setWsConnected(false)
        setIsReconnecting(true)
        setTimeout(connect, 3000)
      }

      socket.onerror = (err) => {
        console.error("WebSocket error:", err)
        socket.close()
      }
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/30"
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
      case "low":
        return "bg-muted text-muted-foreground border-border"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  // Filter alerts by search query and severity
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.description && alert.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (alert.src_ip && alert.src_ip.includes(searchQuery)) ||
      (alert.hostname && alert.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      alert.source_system.toLowerCase().includes(searchQuery.toLowerCase())
      
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter

    return matchesSearch && matchesSeverity
  })

  // Separate into columns
  const suricataAlerts = filteredAlerts.filter((a) => a.source_system.toLowerCase() === "suricata" || a.source_system.toLowerCase() === "security_onion" || a.source_system.toLowerCase() === "security onion")
  const wazuhAlerts = filteredAlerts.filter((a) => a.source_system.toLowerCase() === "wazuh")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-balance bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent flex items-center gap-2">
            <Bell className="h-8 w-8 text-orange-500" />
            Raw Alert Stream
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time split telemetry sensors from Wazuh and Security Onion
          </p>
        </div>

        {/* Live Indicator / Stream Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-colors",
              wsConnected
                ? "bg-success/10 text-success border-success/30"
                : isReconnecting
                ? "bg-warning/10 text-warning border-warning/30 animate-pulse"
                : "bg-destructive/10 text-destructive border-destructive/30"
            )}
          >
            {wsConnected ? (
              <>
                <Wifi className="h-4 w-4 animate-pulse text-success" />
                <span>LIVE STREAMING</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <span>{isReconnecting ? "RECONNECTING..." : "DISCONNECTED"}</span>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="h-9 gap-2 border-border"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 text-success" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 text-warning" />
                <span>Pause</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAlerts([])}
            className="h-9 gap-2 border-border text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Grid</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search raw alerts by IP, title, host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        <div className="flex gap-2">
          {["all", "critical", "high", "medium", "low"].map((sev) => (
            <Button
              key={sev}
              variant={severityFilter === sev ? "default" : "outline"}
              size="sm"
              onClick={() => setSeverityFilter(sev)}
              className="capitalize"
            >
              {sev}
            </Button>
          ))}
        </div>
      </div>

      {/* Session Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Security Onion Alerts</p>
              <p className="text-2xl font-bold font-mono mt-1 text-emerald-400">
                {suricataAlerts.length}
              </p>
            </div>
            <Terminal className="h-8 w-8 text-emerald-500 opacity-40" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Wazuh Alerts</p>
              <p className="text-2xl font-bold font-mono mt-1 text-blue-400">
                {wazuhAlerts.length}
              </p>
            </div>
            <Server className="h-8 w-8 text-blue-500 opacity-40" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Cached</p>
              <p className="text-2xl font-bold font-mono mt-1 text-orange-400">
                {filteredAlerts.length}
              </p>
            </div>
            <Bell className="h-8 w-8 text-orange-500 opacity-40" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Stream State</p>
              <p className={cn("text-lg font-bold font-mono mt-1.5 uppercase", isPaused ? "text-warning" : "text-success")}>
                {isPaused ? "PAUSED" : "ACTIVE"}
              </p>
            </div>
            <AlertTriangle className={cn("h-8 w-8 opacity-40", isPaused ? "text-warning" : "text-success")} />
          </CardContent>
        </Card>
      </div>

      {/* Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Security Onion (Suricata) */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border/60 bg-emerald-500/5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-400">
                  <Terminal className="h-5 w-5 text-emerald-500" />
                  Security Onion (Suricata)
                </CardTitle>
                <CardDescription>Real-time network security monitor</CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">
                {suricataAlerts.length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {suricataAlerts.length === 0 ? (
                <div className="text-center p-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  Waiting for Security Onion alerts...
                </div>
              ) : (
                suricataAlerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    onClick={() => setSelectedAlert(alert)}
                    className="group flex flex-col p-3 rounded-lg bg-background border border-border hover:border-emerald-500/30 hover:bg-muted/10 transition duration-150 cursor-pointer text-left"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {alert.name}
                      </h4>
                      <Badge variant="outline" className={cn("text-xs font-mono uppercase", getSeverityBadgeColor(alert.severity))}>
                        {alert.severity}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground font-mono">
                      {alert.src_ip && (
                        <span>
                          Source: <strong className="text-foreground">{alert.src_ip}</strong>
                        </span>
                      )}
                      {alert.dst_ip && (
                        <span>
                          Dest: <strong className="text-foreground">{alert.dst_ip}</strong>
                        </span>
                      )}
                      <span>
                        Time: {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Wazuh */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border/60 bg-blue-500/5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                  <Server className="h-5 w-5 text-blue-500" />
                  Wazuh Agents
                </CardTitle>
                <CardDescription>Real-time endpoint security monitor</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono">
                {wazuhAlerts.length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {wazuhAlerts.length === 0 ? (
                <div className="text-center p-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  Waiting for Wazuh agent alerts...
                </div>
              ) : (
                wazuhAlerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    onClick={() => setSelectedAlert(alert)}
                    className="group flex flex-col p-3 rounded-lg bg-background border border-border hover:border-blue-500/30 hover:bg-muted/10 transition duration-150 cursor-pointer text-left"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold group-hover:text-blue-400 transition-colors line-clamp-1">
                        {alert.name}
                      </h4>
                      <Badge variant="outline" className={cn("text-xs font-mono uppercase", getSeverityBadgeColor(alert.severity))}>
                        {alert.severity}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground font-mono">
                      {alert.hostname && (
                        <span>
                          Host: <strong className="text-foreground">{alert.hostname}</strong>
                        </span>
                      )}
                      {alert.src_ip && (
                        <span>
                          Source IP: <strong className="text-foreground">{alert.src_ip}</strong>
                        </span>
                      )}
                      <span>
                        Time: {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw Payload Detail Modal */}
      <Dialog open={selectedAlert !== null} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center gap-2 pr-6">
              <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Telemetry Log Detail
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 font-mono"
                onClick={() =>
                  copyToClipboard(JSON.stringify(selectedAlert?.raw_data || selectedAlert, null, 2))
                }
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy JSON</span>
                  </>
                )}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-border/60 pb-3 font-mono">
                <div>
                  <span className="text-muted-foreground">Alert ID:</span>{" "}
                  <span className="text-foreground text-xs">{selectedAlert.alert_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Source System:</span>{" "}
                  <span className="text-foreground uppercase">{selectedAlert.source_system}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="text-foreground">{selectedAlert.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>{" "}
                  <span className="text-foreground">
                    {new Date(selectedAlert.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2 text-muted-foreground font-mono">Raw Event Payload (JSON):</p>
                <div className="bg-black/30 border border-border rounded-lg p-4 max-h-[380px] overflow-y-auto">
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(selectedAlert.raw_data || selectedAlert, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
