import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ShieldAlert, FileSignature, CheckCircle2, AlertOctagon, Info, Clock, Activity, Fingerprint, Users, Terminal } from "lucide-react"
import { PrintButton } from "@/components/print-button"
import { IncidentViewLogger } from "@/components/incident-view-logger"

export default async function DetailedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const rawId = decodeURIComponent(resolvedParams.id || "")
  let report = null;
  
  try {
    const res = await fetch('http://127.0.0.1:8001/api/v1/alerts/incidents', { cache: 'no-store', next: { revalidate: 0 } });
    if (res.ok) {
      const incidents = await res.json();
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
        <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
          <AlertOctagon className="h-16 w-16 text-red-500 mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-muted-foreground mb-4">Report Document Not Found</h2>
          <a href="/reports"><Button variant="outline">Return to Reports Hub</Button></a>
        </div>
      </DashboardShell>
    )
  }

  const intel = report.threat_intel || { opencti: [], cortex: [], thehive: [] };
  const generatedDate = new Date(report.created_at || Date.now()).toLocaleString()

  return (
    <DashboardShell userRole="soc_analyst">
      <IncidentViewLogger incidentId={report.id} sourceIp={report.source_ip} />
      <div className="space-y-8 pb-12 max-w-5xl mx-auto print:mx-0 print:max-w-full">

        {/* Navigation & Actions (Hidden on Print) */}
        <div className="flex items-center justify-between print:hidden mb-2">
          <a href="/reports" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Return to Reports
          </a>
          <PrintButton />
        </div>

        {/* --- OFFICIAL REPORT DOCUMENT STARTS HERE --- */}
        <div className="bg-card border rounded-lg shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-transparent">
          
          {/* Document Header */}
          <div className="p-8 border-b bg-muted/20 print:bg-transparent print:border-b-2 print:border-foreground pb-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <ShieldAlert className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight uppercase text-primary">Security Incident Report</h1>
                  <p className="text-sm tracking-widest text-muted-foreground font-mono mt-1">ID: {report.id}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-wider mb-2">
                  CONFIDENTIAL
                </div>
                <div className="text-sm font-mono text-muted-foreground flex items-center justify-end gap-2">
                  <Clock className="h-4 w-4" /> {generatedDate}
                </div>
              </div>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-4 gap-6 pt-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Target Asset</p>
                <p className="font-mono text-sm">{report.source_ip || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Threat Tactic</p>
                <Badge variant="outline" className="border-red-500/30 text-red-500 hover:bg-transparent mb-1 block w-max">{report.mitre_tactic || "Unknown"}</Badge>
                {report.exact_mitre_ttps?.map((ttp: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-[9px] bg-red-500/10 border-red-500/20 text-red-400 mr-1">{ttp}</Badge>
                ))}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Status</p>
                <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'} className="uppercase">
                  {report.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Assessed Risk</p>
                <div className={`text-2xl font-black ${report.risk_score > 75 ? 'text-red-500' : report.risk_score > 40 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                  {report.risk_score}/100
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-10">
            
            {/* 1.0 INTRODUCTION & RCA */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <FileSignature className="h-5 w-5 text-blue-500" />
                <h3 className="text-xl font-bold tracking-tight">1.0 Executive Introduction & Narrative</h3>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <p className="leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold">Incident Overview:</strong> {report.narrative || "No narrative provided by the engine."}
                </p>
                <div className="bg-blue-500/5 border-l-4 border-blue-500 p-4 rounded-r-md mt-4">
                  <p className="text-sm">
                    <strong className="text-blue-500 uppercase tracking-wider text-xs block mb-1">Root Cause Analysis (RCA)</strong>
                    {report.rca || "Insufficient data to determine a definitive root cause."}
                  </p>
                </div>
              </div>
            </section>

            {/* 2.0 AI DIAGNOSTIC REASONING */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <Activity className="h-5 w-5 text-orange-500" />
                <h3 className="text-xl font-bold tracking-tight">2.0 AI Diagnostic Reasoning</h3>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/20 p-5 rounded-md">
                <p className="text-sm leading-relaxed text-muted-foreground font-medium italic">
                  "{report.ai_reasoning || "Reasoning context was not provided for this node execution."}"
                </p>
              </div>
            </section>

            {/* 2.5 PREDICTIVE EMULATION & CVEs */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <AlertOctagon className="h-5 w-5 text-purple-500" />
                <h3 className="text-xl font-bold tracking-tight">2.5 Predictive Emulation & Vulnerability Analysis</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-purple-500/5 border border-purple-500/20 p-5 rounded-md">
                   <p className="text-xs uppercase tracking-wider text-purple-400 font-bold mb-2">Adversary Next Steps (Predicted)</p>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                     {report.predicted_next_steps || "No predictive emulation generated for this sequence."}
                   </p>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-md">
                   <p className="text-xs uppercase tracking-wider text-red-400 font-bold mb-2">Exploited Vulnerabilities (CVE)</p>
                   {report.cves_exploited?.length > 0 ? (
                     <div className="flex flex-wrap gap-2 mt-2">
                       {report.cves_exploited.map((cve: string, idx: number) => (
                          <Badge key={idx} variant="destructive" className="font-mono text-xs">{cve}</Badge>
                       ))}
                     </div>
                   ) : (
                     <p className="text-sm text-muted-foreground leading-relaxed italic mt-2">No specific CVEs mapped from current telemetry.</p>
                   )}
                </div>
              </div>
            </section>

            {/* 3.0 THREAT INTELLIGENCE */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <Fingerprint className="h-5 w-5 text-cyan-500" />
                <h3 className="text-xl font-bold tracking-tight">3.0 Extended Threat Intelligence (CTI)</h3>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <Card className="shadow-none border-muted bg-transparent">
                  <CardContent className="p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> OpenCTI
                    </h4>
                    {intel.opencti?.length > 0 ? (
                      <ul className="space-y-2">
                        {intel.opencti.map((i: string, idx: number) => (
                          <li key={idx} className="text-xs font-mono bg-muted/50 p-2 rounded border-l-2 border-blue-500">{i}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 mt-2">
                        <p className="text-xs font-semibold text-blue-400 mb-1">Indicator Not Mapped</p>
                        <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                          This IP ({report.source_ip}) is currently unknown to your OpenCTI instance. To map it:
                        </p>
                        <ol className="text-[10px] text-muted-foreground list-decimal list-inside space-y-1">
                          <li>Open your <strong>OpenCTI Dashboard</strong>.</li>
                          <li>Navigate to <strong>Data -&gt; Observables</strong>.</li>
                          <li>Click <strong>+ Create</strong>, select <strong>IPv4-Addr</strong>.</li>
                          <li>Input <span className="font-mono text-white bg-muted px-1 rounded">{report.source_ip}</span>.</li>
                          <li>Link to the <strong>APT29</strong> Campaign.</li>
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-none border-muted bg-transparent">
                  <CardContent className="p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Cortex Analyzers
                    </h4>
                    {intel.cortex?.length > 0 ? (
                      <ul className="space-y-2">
                        {intel.cortex.map((i: string, idx: number) => (
                          <li key={idx} className="text-xs font-mono bg-muted/50 p-2 rounded border-l-2 border-purple-500">{i}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded p-3 mt-2">
                        <p className="text-xs font-semibold text-purple-400 mb-1">Trigger Analyzers</p>
                        <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                          No automated cortex scan hits. To manually investigate:
                        </p>
                        <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-1">
                          <li>Access the <strong>Cortex Dashboard</strong>.</li>
                          <li>Open the <strong>Analyzers</strong> tab.</li>
                          <li>Select <strong>VirusTotal_GetReport</strong> or <strong>MaxMind</strong>.</li>
                          <li>Run it against <span className="font-mono text-white bg-muted px-1 rounded">{report.source_ip}</span>.</li>
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-none border-muted bg-transparent">
                  <CardContent className="p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> TheHive Cases
                    </h4>
                    {intel.thehive?.length > 0 ? (
                      <ul className="space-y-2">
                        {intel.thehive.map((i: string, idx: number) => (
                          <li key={idx} className="text-xs font-mono bg-muted/50 p-2 rounded border-l-2 border-emerald-500">{i}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3 mt-2">
                        <p className="text-xs font-semibold text-emerald-400 mb-1">Escalate to Case</p>
                        <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                          This indicator isn't tethered to an established TheHive case.
                        </p>
                        <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-1">
                          <li>Login to <strong>TheHive</strong> console.</li>
                          <li>Click <strong>+ Create Case</strong>.</li>
                          <li>Title as: <em>Threat - {report.source_ip}</em>.</li>
                          <li>Add the IP as an <strong>Observable</strong>.</li>
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator className="print:hidden" />

            {/* 4.0 TACTICAL MITIGATIONS (AI) */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <AlertOctagon className="h-5 w-5 text-purple-500" />
                <h3 className="text-xl font-bold tracking-tight">4.0 Dynamic AI Recommendations</h3>
              </div>
              <div className="bg-background border border-purple-500/20 rounded-md p-5 shadow-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {report.ai_recommendations || "No specific AI recommendations were formulated for this contextual setup."}
                </p>
              </div>
            </section>

            {/* 5.0 OFFICIAL PLAYBOOK (SOP) */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h3 className="text-xl font-bold tracking-tight">5.0 Enforced Standard Operating Procedure (SOP)</h3>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-5">
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                  {report.recommended_playbook ? (
                      <div dangerouslySetInnerHTML={{ __html: report.recommended_playbook.replace(/\n/g, '<br/>') }} />
                  ) : (
                      <p className="text-muted-foreground italic flex items-center gap-2">
                        <Info className="h-4 w-4" /> No specialized playbook found in the knowledge base.
                      </p>
                  )}
                </div>
              </div>
            </section>

            {/* 6.0 UEBA (User & Entity Behavior Analytics) */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <Users className="h-5 w-5 text-indigo-500" />
                <h3 className="text-xl font-bold tracking-tight">6.0 UEBA (User & Entity Behavior Analytics)</h3>
              </div>
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-md p-5">
                 {report.ueba_indicators?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-foreground">
                       {report.ueba_indicators.map((ind: string, idx: number) => <li key={idx} className="font-mono">{ind}</li>)}
                    </ul>
                 ) : (
                    <p className="text-muted-foreground italic text-sm">No significant behavioral anomalies detected for the extracted entities.</p>
                 )}
              </div>

              {/* Blast Radius Mapping */}
              <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-md p-5">
                <h4 className="text-sm font-bold tracking-wider uppercase text-red-500 mb-3 flex items-center gap-2">
                   <Activity className="h-4 w-4" /> Blast Radius Mapping
                </h4>
                {report.blast_radius?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-foreground">
                       {report.blast_radius.map((ind: string, idx: number) => <li key={idx} className="font-mono text-red-400">{ind}</li>)}
                    </ul>
                 ) : (
                    <p className="text-muted-foreground italic text-sm">No explicit blast radius calculated for this incident.</p>
                 )}
              </div>
            </section>

            {/* 7.0 RAW TELEMETRY */}
            <section className="print:break-inside-avoid">
              <div className="flex items-center gap-2 border-b pb-2 mb-6">
                <Terminal className="h-5 w-5 text-zinc-500" />
                <h3 className="text-xl font-bold tracking-tight">7.0 Raw Telemetry & Detection Evidence</h3>
              </div>
              
              <div className="space-y-6">
                {/* 7.1 Wazuh Alerts */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-cyan-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Wazuh (HIDS) Alerts
                  </h4>
                  <div className="space-y-4">
                    {report.alerts?.filter((a: any) => a.source_system === 'wazuh').length > 0 ? 
                      report.alerts.filter((a: any) => a.source_system === 'wazuh').map((alert: any, idx: number) => (
                      <div key={idx} className="bg-black border border-cyan-500/20 rounded-md p-4 overflow-x-auto">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono text-cyan-400/70">TIME: {new Date(alert.timestamp).toLocaleString()}</span>
                          <Badge variant="outline" className="text-[10px] bg-zinc-900 border-cyan-500/30 text-cyan-400">{alert.name}</Badge>
                        </div>
                        <pre className="text-[10px] font-mono text-cyan-300/80 mt-2 bg-zinc-950 p-3 rounded whitespace-pre-wrap">
                          {JSON.stringify(alert.raw_data || alert, null, 2)}
                        </pre>
                      </div>
                    )) : (
                      <p className="text-muted-foreground italic text-xs bg-zinc-100 dark:bg-zinc-900/50 p-3 border rounded border-dashed">No Wazuh telemetry correlated for this incident.</p>
                    )}
                  </div>
                </div>

                {/* 7.2 Security Onion / Suricata Alerts */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-orange-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Security Onion (Suricata NIDS)
                  </h4>
                  <div className="space-y-4">
                    {report.alerts?.filter((a: any) => a.source_system === 'suricata').length > 0 ? 
                      report.alerts.filter((a: any) => a.source_system === 'suricata').map((alert: any, idx: number) => (
                      <div key={idx} className="bg-black border border-orange-500/20 rounded-md p-4 overflow-x-auto">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono text-orange-400/70">TIME: {new Date(alert.timestamp).toLocaleString()}</span>
                          <Badge variant="outline" className="text-[10px] bg-zinc-900 border-orange-500/30 text-orange-400">{alert.name}</Badge>
                        </div>
                        <pre className="text-[10px] font-mono text-orange-300/80 mt-2 bg-zinc-950 p-3 rounded whitespace-pre-wrap">
                          {JSON.stringify(alert.raw_data || alert, null, 2)}
                        </pre>
                      </div>
                    )) : (
                      <p className="text-muted-foreground italic text-xs bg-zinc-100 dark:bg-zinc-900/50 p-3 border rounded border-dashed">No Security Onion telemetry correlated for this incident.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="bg-muted/10 p-6 border-t text-center text-xs text-muted-foreground font-mono print:border-t-2 print:border-foreground">
            GENERATED BY DEEPINV SOC-AI PIPELINE • CONFIDENTIAL • END OF DOCUMENT
          </div>

        </div>
      </div>
    </DashboardShell>
  )
}
