import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Calendar, TrendingUp, AlertTriangle, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

  const userRole = profile?.role || "soc_analyst"

  return (
    <DashboardShell userRole={userRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security Reports</h1>
            <p className="text-muted-foreground">Generate and view security analysis reports</p>
          </div>
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Generate New Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Threats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">18</div>
              <p className="text-xs text-muted-foreground">Require immediate action</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">1,142</div>
              <p className="text-xs text-muted-foreground">91.6% resolution rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12 min</div>
              <p className="text-xs text-muted-foreground">-23% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Report Templates</CardTitle>
            <CardDescription>Pre-configured report templates for common security analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-base">Monthly Security Overview</CardTitle>
                    </div>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Comprehensive monthly security posture report including threat trends, incidents, and
                    recommendations.
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Generated on 1st of each month</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                    <Download className="h-3 w-3" />
                    Download Last Report
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <CardTitle className="text-base">Incident Response Report</CardTitle>
                    </div>
                    <Badge variant="outline">On-Demand</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Detailed analysis of security incidents including timeline, impact assessment, and remediation
                    steps.
                  </p>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">12 reports generated this month</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-500" />
                      <CardTitle className="text-base">Compliance Report</CardTitle>
                    </div>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Compliance status for regulatory frameworks including SOC2, ISO 27001, and GDPR requirements.
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Generated quarterly</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                    <Download className="h-3 w-3" />
                    Download Last Report
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-base">Threat Intelligence Report</CardTitle>
                    </div>
                    <Badge variant="outline">On-Demand</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    AI-powered threat intelligence including emerging threats, vulnerabilities, and attack patterns.
                  </p>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Updated daily</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports Data */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Incident Reports</CardTitle>
            <CardDescription>AI-generated cyber defense analyses pulled natively from the core engine.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ReportsList />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

// Client Component to fetch gracefully
async function ReportsList() {
  try {
    const res = await fetch('http://localhost:8001/api/v1/alerts/incidents', { next: { revalidate: 0 } })
    if (!res.ok) return <p className="text-muted-foreground p-4">Error loading AI reports.</p>
    const reports = await res.json()
    
    if (reports.length === 0) {
      return <p className="text-muted-foreground p-4">No AI reports generated yet.</p>
    }

    return (
      <>
        {reports.map((report: any) => (
          <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-500 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium text-sm">Target IP Analysis: {report.source_ip}</p>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                  <Badge variant={report.risk_score > 70 ? "destructive" : "secondary"} className="text-[10px] h-4">
                    Score: {report.risk_score}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-4 border-emerald-500 text-emerald-500">
                    Tactic: {report.mitre_tactic}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`/reports/${report.id}`}>
                <Button variant="outline" size="sm" className="gap-2 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-500">
                  <FileText className="h-3 w-3" />
                  View Detailed Report
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="gap-2">
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </>
    )
  } catch (error) {
    return <p className="text-muted-foreground p-4">Cannot connect to the SOC AI backend API.</p>
  }
}
