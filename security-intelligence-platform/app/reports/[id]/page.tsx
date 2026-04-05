import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShieldAlert, Cpu, Activity, Database, Scale, Layers } from "lucide-react"

export default async function DetailedReportPage({ params }: { params: { id: string } }) {
  // Next.js may URL-encode special chars in the route segment (e.g. dots)
  const rawId = decodeURIComponent(params.id)
  let report = null;
  try {
    const res = await fetch('http://localhost:8001/api/v1/alerts/incidents', { cache: 'no-store' });
    if (res.ok) {
      const incidents = await res.json();
      // Try exact match first, then startsWith to handle Next.js segment trimming
      report = incidents.find((i: any) => i.id === rawId)
             || incidents.find((i: any) => i.id.startsWith(rawId))
             || incidents.find((i: any) => rawId.startsWith(i.id));
    }
  } catch (error) {
    console.error("Failed to fetch specific report:", error);
  }

  if (!report) {
    return (
      <DashboardShell userRole="soc_analyst">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Report Not Found</h2>
          <a href="/reports"><Button variant="outline">Return to Reports Hub</Button></a>
        </div>
      </DashboardShell>
    )
  }

  // Parse threat intel safe-fallback
  const intel = report.threat_intel || { opencti: [], cortex: [], thehive: [] };

  return (
    <DashboardShell userRole="soc_analyst">
      <div className="space-y-6 pb-12">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <a href="/reports" className="flex items-center text-sm text-muted-foreground hover:text-white mb-2 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub
            </a>
            <h1 className="text-3xl font-bold tracking-tight text-red-500 flex items-center gap-3">
              <ShieldAlert className="h-8 w-8" /> 
              {report.mitre_tactic || "Threat"} detected on {report.source_ip}
            </h1>
            <p className="text-muted-foreground mt-1">Incident ID: {report.id}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Assessed Risk</span>
            <div className={`text-4xl font-black ${report.risk_score > 75 ? 'text-red-500' : report.risk_score > 40 ? 'text-yellow-500' : 'text-emerald-500'}`}>
              {report.risk_score}/100
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-500" /> Executive Summary & Root Cause
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-1">Narrative</h4>
              <p className="text-sm leading-relaxed">{report.narrative}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-1">Root Cause Analysis (RCA)</h4>
              <p className="text-sm leading-relaxed text-yellow-400/90">{report.rca}</p>
            </div>
          </CardContent>
        </Card>

        {/* DUAL RECOMMENDATION DASHBOARD */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card className="border-t-4 border-t-purple-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Cpu className="h-24 w-24" /></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Activity className="h-5 w-5" /> 1. Dynamic AI Recommendations
              </CardTitle>
              <CardDescription>Real-time tactical mitigations generated specifically for this event.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-background p-4 rounded-md border text-muted-foreground">
                {report.ai_recommendations || "No specific AI recommendations were formulated for this contextual setup."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-emerald-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Scale className="h-24 w-24" /></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-400">
                <Scale className="h-5 w-5" /> 2. Official Procedure (Playbook RAG)
              </CardTitle>
              <CardDescription>Mandatory company Standard Operating Procedure for {report.mitre_tactic}.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-background p-4 rounded-md border">
                {report.recommended_playbook ? (
                    <div dangerouslySetInnerHTML={{ __html: report.recommended_playbook.replace(/\n/g, '<br/>') }} />
                ) : (
                    <p className="text-muted-foreground italic">No specialized playbook found in the knowledge base.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Logic & Threat Intel Pipeline */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-400">
                <Layers className="h-5 w-5" /> AI Diagnostic Reasoning
              </CardTitle>
              <CardDescription>How the AI evaluated risk and arrived at this conclusion.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-orange-500/10 p-4 rounded-md border border-orange-500/20 italic">
                {report.ai_reasoning || "Reasoning context was not provided for this node execution."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Database className="h-5 w-5" /> Security Tools (CTI)
              </CardTitle>
              <CardDescription>Linked external intelligence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-2">OpenCTI Identifiers</h4>
                {intel.opencti?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intel.opencti.map((i: string, idx: number) => <Badge key={idx} variant="outline" className="text-[10px]">{i}</Badge>)}
                  </div>
                ) : <span className="text-xs text-muted-foreground">- No OpenCTI hits</span>}
              </div>
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-2">Cortex Analyzers</h4>
                {intel.cortex?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intel.cortex.map((i: string, idx: number) => <Badge key={idx} variant="outline" className="border-blue-500/50 text-blue-400 text-[10px]">{i}</Badge>)}
                  </div>
                ) : <span className="text-xs text-muted-foreground">- No Cortex hits</span>}
              </div>
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-2">TheHive Integration</h4>
                {intel.thehive?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intel.thehive.map((i: string, idx: number) => <Badge key={idx} variant="secondary" className="text-[10px]">{i}</Badge>)}
                  </div>
                ) : <span className="text-xs text-muted-foreground">- No active cases matched</span>}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardShell>
  )
}
