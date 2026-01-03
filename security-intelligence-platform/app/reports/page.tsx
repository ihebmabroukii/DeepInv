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

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Previously generated security reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: "December 2024 - Monthly Security Overview",
                  date: "Dec 1, 2024",
                  size: "2.4 MB",
                  type: "PDF",
                },
                {
                  name: "Critical Incident IR-2024-0342",
                  date: "Nov 28, 2024",
                  size: "1.8 MB",
                  type: "PDF",
                },
                {
                  name: "Q4 2024 Compliance Report",
                  date: "Nov 25, 2024",
                  size: "3.2 MB",
                  type: "PDF",
                },
                {
                  name: "November 2024 - Threat Intelligence",
                  date: "Nov 20, 2024",
                  size: "5.1 MB",
                  type: "PDF",
                },
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.date} • {report.size} • {report.type}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
