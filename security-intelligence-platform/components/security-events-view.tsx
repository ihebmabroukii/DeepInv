"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  Server,
  Brain,
  CheckCircle2,
  Copy,
  Terminal,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SecurityEvent {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  asset: string
  timestamp: string
  status: "active" | "investigating" | "resolved"
  aiConfidence: number
  whatHappened: string
  aiReasoning: string
  remediation: {
    description: string
    commands: string[]
  }
}

// Removed static events array in favor of dynamic fetching

import { useGetIncidents } from "@/lib/api"

export function SecurityEventsView() {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const { data: events, isLoading } = useGetIncidents()


  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const copyCommands = (eventId: string, commands: string[]) => {
    navigator.clipboard.writeText(commands.join("\n"))
    setCopiedCommand(eventId)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive"
      case "high":
        return "bg-warning/10 text-warning border-warning"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500"
      case "low":
        return "bg-muted text-muted-foreground border-muted"
      default:
        return "bg-muted text-muted-foreground border-muted"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-destructive/10 text-destructive"
      case "investigating":
        return "bg-warning/10 text-warning"
      case "resolved":
        return "bg-success/10 text-success"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-balance">Security Events</h1>
          <p className="text-muted-foreground mt-1">AI-powered threat detection and remediation guidance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Terminal className="h-4 w-4 mr-2" />
            Export Events
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Active</p>
                <p className="text-2xl font-bold font-mono mt-1">{events.filter(e => e.status === 'active').length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Investigating</p>
                <p className="text-2xl font-bold font-mono mt-1">{events.filter(e => e.status === 'investigating').length}</p>
              </div>
              <Shield className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Resolved Today</p>
                <p className="text-2xl font-bold font-mono mt-1">{events.filter(e => e.status === 'resolved').length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Avg Confidence</p>
                <p className="text-2xl font-bold font-mono mt-1">
                  {events.length > 0 ? Math.round(events.reduce((acc, e) => acc + e.aiConfidence, 0) / events.length) : 0}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Security Events</CardTitle>
          <CardDescription>Click on an event to view AI analysis and remediation steps</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading AI Incidents...</div>
          ) : events.length === 0 ? (
            <div className="flex justify-center p-8 text-muted-foreground">No incidents found in the database.</div>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => {
                const isExpanded = expandedEvents.has(event.id)
                return (
                  <div
                    key={event.id}
                    className="border border-border rounded-lg bg-background overflow-hidden transition-all"
                  >
                    {/* Event Header */}
                    <button
                      onClick={() => toggleEvent(event.id)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{event.id}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs uppercase font-medium", getSeverityColor(event.severity))}
                          >
                            {event.severity}
                          </Badge>
                          <Badge variant="secondary" className={cn("text-xs", getStatusColor(event.status))}>
                            {event.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Brain className="h-3 w-3 text-primary" />
                            <span className="font-mono text-primary">{event.aiConfidence}%</span>
                          </div>
                        </div>
                        <h3 className="text-sm font-semibold text-balance">{event.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            <span className="font-mono">{event.asset}</span>
                          </div>
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-6 bg-muted/20">
                        {/* What Happened */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            What Happened
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                            {event.whatHappened}
                          </p>
                        </div>

                        {/* AI Reasoning */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            AI Reasoning
                            <span className="text-xs font-normal text-primary font-mono">
                              {event.aiConfidence}% confidence
                            </span>
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{event.aiReasoning}</p>
                        </div>

                        {/* Remediation */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Terminal className="h-4 w-4 text-success" />
                              Remediation
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyCommands(event.id, event.remediation.commands)}
                              className="h-7 text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              {copiedCommand === event.id ? "Copied!" : "Copy Commands"}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            {event.remediation.description}
                          </p>
                          <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs overflow-x-auto">
                            <pre className="text-foreground whitespace-pre-wrap break-words">
                              {event.remediation.commands.join("\n")}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
