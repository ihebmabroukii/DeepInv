"use client"

import type React from "react"

import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Bot,
  Plus,
  Search,
  MoreVertical,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Globe,
  Lock,
  FileText,
  Server,
  Cloud,
  Container
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AddAgentWizard } from "@/components/agents/add-agent-wizard"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Agent {
  id: string
  name: string
  platform: string
  status: "active" | "inactive" | "error" | "pending"
  region: string
  last_heartbeat: string
  // eventsProcessed: number // Removed for now as it wasn't in DB schema yet
  description: string
  trust_score: number
  capabilities: string[]
  tags: string[]
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

      setCurrentUser(profile)

      if (profile?.role !== "super_admin") {
        router.push("/dashboard")
        return
      }

      fetchAgents()
    }

    checkAccess()
  }, [router])

  const fetchAgents = async () => {
    try {
      // In a real app we'd fetch from our Flask API which proxies Supabase or adds logic
      // For this demo let's hit the flask endpoint we built
      const res = await fetch('http://127.0.0.1:5000/api/v1/agents/')
      if (res.ok) {
        const data = await res.json()
        setAgents(data || [])
      }
    } catch (e) {
      console.error("Failed to fetch agents", e)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
      case "inactive":
        return <Badge variant="secondary" className="gap-1"><Activity className="h-3 w-3" /> Inactive</Badge>
      case "error":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>
      case "pending":
        return <Badge variant="outline" className="gap-1 text-orange-500 border-orange-500"><Loader2 className="h-3 w-3 animate-spin" /> Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 50) return "text-orange-500"
    return "text-red-500"
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'endpoint_agent': return <Server className="h-4 w-4" />
      case 'network_sensor': return <Activity className="h-4 w-4" />
      case 'cloud_vm_agent': return <Cloud className="h-4 w-4" />
      case 'container_k8s_agent': return <Container className="h-4 w-4" />
      default: return <Bot className="h-4 w-4" />
    }
  }

  const mapCapabilityIcon = (cap: string) => {
    if (cap.includes('log')) return <FileText className="h-3 w-3" />
    if (cap.includes('behavior')) return <Activity className="h-3 w-3" />
    if (cap.includes('network')) return <Globe className="h-3 w-3" />
    if (cap.includes('tls')) return <Lock className="h-3 w-3" />
    if (cap.includes('threat') || cap.includes('ids')) return <Shield className="h-3 w-3" />
    return <Bot className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <DashboardShell userRole={currentUser?.role || "super_admin"}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    )
  }

  const activeAgents = agents.filter((a) => a.status === "active").length
  const inactiveAgents = agents.filter((a) => a.status === "inactive" || a.status === "pending").length
  const errorAgents = agents.filter((a) => a.status === "error").length

  return (
    <DashboardShell userRole={currentUser?.role || "super_admin"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Platform</h1>
            <p className="text-muted-foreground">Manage distributed security sensors and policies</p>
          </div>

          <Button className="gap-2" onClick={() => setIsWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>

          <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>Deploy New Agent</DialogTitle>
                <DialogDescription>Configure identity, platform, and security policies</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden p-6">
                <AddAgentWizard
                  onSuggestClose={() => setIsWizardOpen(false)}
                  onAgentCreated={() => {
                    fetchAgents()
                    // Keep modal open to show success screen, user closes manually or we could set timeout
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{agents.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-500">{activeAgents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trust Score (Avg)</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Quick calc for demo */}
              <div className="text-3xl font-bold text-emerald-500">
                {agents.length > 0 ? Math.round(agents.reduce((acc, curr) => acc + (curr.trust_score || 0), 0) / agents.length) : 0}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{errorAgents}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connected Agents</CardTitle>
                <CardDescription>
                  Agents are generic secure sensors, governed by central policies.
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search agents..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Identity</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-xs text-muted-foreground">{agent.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2" title={agent.platform}>
                        {getPlatformIcon(agent.platform)}
                        <span className="capitalize text-sm">{agent.platform?.replace(/_/g, " ").replace("agent", "")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getTrustScoreColor(agent.trust_score)}`}>{agent.trust_score}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          {(agent.capabilities || []).slice(0, 4).map((cap) => (
                            <Tooltip key={cap}>
                              <TooltipTrigger asChild>
                                <div className="p-1 rounded bg-secondary text-secondary-foreground hover:bg-primary/20">
                                  {mapCapabilityIcon(cap)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="capitalize">{cap.replace("_", " ")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {(agent.capabilities || []).length > 4 && (
                            <span className="text-xs text-muted-foreground flex items-center">+{agent.capabilities.length - 4}</span>
                          )}
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{agent.region}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>View Logs</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Revoke Agent</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {agents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No agents deployed. Click "Add Agent" to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
