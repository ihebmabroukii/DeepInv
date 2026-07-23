"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Hexagon, BrainCircuit, Globe, ExternalLink, CheckCircle2 } from "lucide-react"
import { getSession } from "@/lib/auth"

interface IntegrationActionsProps {
  event: any // Pass the whole event object
}

// Auth header so the backend can record WHO triggered each SOC action.
function authHeaders(): Record<string, string> {
  const token = getSession()?.token
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" }
}

// Turn any backend error payload into a plain string. FastAPI 422s return
// `detail` as an array of {type, loc, msg, input} objects — rendering that
// object directly crashes React, so always collapse it to text.
function formatError(data: any): string {
  const d = data?.detail
  if (!d) return "Integration failed."
  if (typeof d === "string") return d
  if (Array.isArray(d)) return d.map((e: any) => e?.msg || JSON.stringify(e)).join("; ")
  if (typeof d === "object") return d.msg || JSON.stringify(d)
  return String(d)
}

export function IntegrationActions({ event }: IntegrationActionsProps) {
  // State for TheHive
  const [hiveOpen, setHiveOpen] = useState(false)
  const [hiveLoading, setHiveLoading] = useState(false)
  const [hiveData, setHiveData] = useState<any>(null)

  // State for Cortex
  const [cortexOpen, setCortexOpen] = useState(false)
  const [cortexLoading, setCortexLoading] = useState(false)
  const [cortexData, setCortexData] = useState<any>(null)

  // State for OpenCTI
  const [ctiOpen, setCtiOpen] = useState(false)
  const [ctiLoading, setCtiLoading] = useState(false)
  const [ctiData, setCtiData] = useState<any>(null)

  const handleTheHive = async () => {
    setHiveOpen(true)
    setHiveLoading(true)
    try {
      const res = await fetch("http://localhost:8001/api/v1/integrations/thehive/check-or-create", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          incident_id: event.id,
          source_ip: event.asset,
          risk_score: event.aiConfidence || 50,
          narrative: event.whatHappened || "No narrative provided",
          ai_reasoning: event.aiReasoning || "No reasoning",
          ai_recommendations: event.remediation?.description || "No recommendations",
          mitre_tactic: event.mitre_tactic || "Unknown"
        })
      })
      const data = await res.json()
      setHiveData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setHiveLoading(false)
    }
  }

  const handleCortex = async () => {
    setCortexOpen(true)
    setCortexLoading(true)
    try {
      const res = await fetch("http://localhost:8001/api/v1/integrations/cortex/analyze", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          observable: event.asset,
          type: "ip"
        })
      })
      const data = await res.json()
      setCortexData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCortexLoading(false)
    }
  }

  const handleOpenCTI = async () => {
    setCtiOpen(true)
    setCtiLoading(true)
    try {
      const res = await fetch("http://localhost:8001/api/v1/integrations/opencti/add", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          observable: event.asset,
          type: "IPv4-Addr",
          description: `Identified in incident ${event.id}: ${event.title}`,
          score: event.aiConfidence || 50
        })
      })
      const data = await res.json()
      setCtiData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCtiLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-2">SOC Integrations:</p>
      
      <Button variant="outline" size="sm" onClick={handleTheHive} className="h-8 bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/20 hover:text-[#FFD700]">
        <Hexagon className="h-3.5 w-3.5 mr-1.5" />
        TheHive
      </Button>

      <Button variant="outline" size="sm" onClick={handleCortex} className="h-8 bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30 hover:bg-[#4CAF50]/20 hover:text-[#4CAF50]">
        <BrainCircuit className="h-3.5 w-3.5 mr-1.5" />
        Cortex
      </Button>

      <Button variant="outline" size="sm" onClick={handleOpenCTI} className="h-8 bg-[#2196F3]/10 text-[#2196F3] border-[#2196F3]/30 hover:bg-[#2196F3]/20 hover:text-[#2196F3]">
        <Globe className="h-3.5 w-3.5 mr-1.5" />
        OpenCTI
      </Button>

      {/* TheHive Modal */}
      <Dialog open={hiveOpen} onOpenChange={setHiveOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hexagon className="h-5 w-5 text-[#FFD700]" />
              TheHive Case Integration
            </DialogTitle>
            <DialogDescription>
              Checking and managing case for {event.asset}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {hiveLoading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <Loader2 className="h-8 w-8 text-[#FFD700] animate-spin" />
                <p className="text-sm text-muted-foreground">Communicating with TheHive...</p>
              </div>
            ) : hiveData?.case ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-medium">
                    {hiveData.action === "found" ? "Existing Case Found" : "New Case Created"}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Case ID</span>
                    <span className="text-xs font-mono">{hiveData.case?.caseId || hiveData.case?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{hiveData.case?.status || "New"}</Badge>
                  </div>
                </div>
                <Button className="w-full gap-2" variant="default" asChild>
                  <a href={hiveData.case?.url} target="_blank" rel="noopener noreferrer">
                    Open in TheHive <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-red-500">{formatError(hiveData)}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cortex Modal */}
      <Dialog open={cortexOpen} onOpenChange={setCortexOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#4CAF50]" />
              Cortex Analysis
            </DialogTitle>
            <DialogDescription>
              Running analyzers on {event.asset}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {cortexLoading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <Loader2 className="h-8 w-8 text-[#4CAF50] animate-spin" />
                <p className="text-sm text-muted-foreground">Triggering Cortex Analyzers...</p>
              </div>
            ) : cortexData?.job ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-medium">
                    {cortexData.action === "found" ? "Recent Analysis Found" : "New Analysis Triggered"}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Analyzer</span>
                    <span className="text-xs font-mono">{cortexData.job?.analyzerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{cortexData.job?.status || "InProgress"}</Badge>
                  </div>
                </div>
                {cortexData.job?.url && (
                   <Button className="w-full gap-2" variant="default" asChild>
                    <a href={cortexData.job?.url} target="_blank" rel="noopener noreferrer">
                      View Report <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-500">{formatError(cortexData)}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* OpenCTI Modal */}
      <Dialog open={ctiOpen} onOpenChange={setCtiOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#2196F3]" />
              OpenCTI Intelligence
            </DialogTitle>
            <DialogDescription>
              Syncing observable {event.asset}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {ctiLoading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <Loader2 className="h-8 w-8 text-[#2196F3] animate-spin" />
                <p className="text-sm text-muted-foreground">Syncing with OpenCTI...</p>
              </div>
            ) : ctiData?.observable ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-medium">
                    {ctiData.action === "found" ? "Observable Already Exists" : "Observable Added to OpenCTI"}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Value</span>
                    <span className="text-xs font-mono">{ctiData.observable?.observable_value}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Risk Score</span>
                    <span className="text-xs font-mono text-destructive">{ctiData.observable?.x_opencti_score || 0}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500">{formatError(ctiData)}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
