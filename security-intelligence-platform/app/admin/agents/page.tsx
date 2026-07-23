"use client"

import type React from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { RequireAuth } from "@/components/require-auth"
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
import { AddAgentWizard } from "@/components/agents/add-agent-wizard"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Agent {
  id: string
  name: string
  platform: string
  status: "active" | "inactive" | "error" | "pending"
  region: string
  last_heartbeat: string
  description: string
  trust_score: number
  capabilities: string[]
  tags: string[]
  system_info?: {
    hostname?: string
    os?: string
    kernel?: string
    uptime?: string
    security_software?: string[]
    interfaces?: { ip: string; interface: string; mac?: string }[]
  }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "agent-001",
      name: "HQ-DC-01",
      platform: "endpoint_agent",
      status: "active",
      region: "Tunis",
      last_heartbeat: new Date().toISOString(),
      description: "Primary Domain Controller",
      trust_score: 98,
      capabilities: ["log_collection", "behavior_monitoring"],
      tags: ["critical", "windows", "dc"]
    },
    {
      id: "agent-002",
      name: "Sousse-Gateway",
      platform: "network_sensor",
      status: "active",
      region: "Sousse",
      last_heartbeat: new Date().toISOString(),
      description: "Regional Edge Gateway",
      trust_score: 95,
      capabilities: ["network_inspection", "tls_decryption"],
      tags: ["edge", "linux", "network"]
    },
    {
      id: "agent-003",
      name: "Paris-App-Server",
      platform: "cloud_vm_agent",
      status: "error",
      region: "Paris",
      last_heartbeat: new Date(Date.now() - 3600000).toISOString(),
      description: "Customer Portal Backend",
      trust_score: 45,
      capabilities: ["log_collection", "process_monitoring"],
      tags: ["cloud", "linux", "web"]
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const fetchAgents = async () => {
    // Mocking a network delay
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this agent? This action cannot be undone.")) return
    
    // Optimistic UI update for mock data
    setAgents(prev => prev.filter(a => a.id !== id))
    alert("Agent revoked successfully (mock)")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
      case "inactive": return <Badge variant="secondary" className="gap-1"><Activity className="h-3 w-3" /> Inactive</Badge>
      case "error": return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>
      case "pending": return <Badge variant="outline" className="gap-1 text-orange-500 border-orange-500"><Loader2 className="h-3 w-3 animate-spin" /> Pending</Badge>
      default: return <Badge variant="outline">{status}</Badge>
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

  const activeAgents = agents.filter((a) => a.status === "active").length
  const errorAgents = agents.filter((a) => a.status === "error").length

  return (
    <RequireAuth requiredRole={["super_admin"]}>
      {(user) => (
        <DashboardShell userRole={user.role}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Agent Platform</h1>
                <p className="text-muted-foreground">Manage distributed security sensors and policies</p>
              </div>

              <Button className="gap-2" onClick={() => setIsWizardOpen(true)}>
                <Plus className="h-4 w-4" /> Add Agent
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
                      onAgentCreated={() => fetchAgents()}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{agents.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-emerald-500">{activeAgents}</div></CardContent></Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Trust Score (Avg)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-emerald-500">{agents.length > 0 ? Math.round(agents.reduce((acc, curr) => acc + (curr.trust_score || 0), 0) / agents.length) : 0}%</div></CardContent></Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Issues</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-destructive">{errorAgents}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Connected Agents</CardTitle>
                    <CardDescription>Agents are generic secure sensors, governed by central policies.</CardDescription>
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
                        <TableCell><div className="flex flex-col"><span className="font-medium">{agent.name}</span><span className="text-xs text-muted-foreground">{agent.description}</span></div></TableCell>
                        <TableCell><div className="flex items-center gap-2">{getPlatformIcon(agent.platform)}<span className="capitalize text-sm">{agent.platform?.replace(/_/g, " ").replace("agent", "")}</span></div></TableCell>
                        <TableCell><span className={`font-bold ${getTrustScoreColor(agent.trust_score)}`}>{agent.trust_score}%</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              {(agent.capabilities || []).slice(0, 4).map((cap) => (
                                <Tooltip key={cap}>
                                  <TooltipTrigger asChild><div className="p-1 rounded bg-secondary text-secondary-foreground hover:bg-primary/20">{mapCapabilityIcon(cap)}</div></TooltipTrigger>
                                  <TooltipContent><p className="capitalize">{cap.replace("_", " ")}</p></TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell><Badge variant="secondary">{agent.region}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedAgent(agent); setIsDetailsOpen(true); }}>View Details</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleRevoke(agent.id)}>Revoke Agent</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Agent Details</DialogTitle><DialogDescription>Technical specs for {selectedAgent?.name}</DialogDescription></DialogHeader>
              {selectedAgent && (
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm border">
                      <div className="flex justify-between"><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{selectedAgent.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedAgent.name}</span></div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm border">
                      <div className="flex justify-between items-center"><span className="text-muted-foreground">State:</span> {getStatusBadge(selectedAgent.status)}</div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Trust Score:</span> <span className={getTrustScoreColor(selectedAgent.trust_score)}>{selectedAgent.trust_score}%</span></div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </DashboardShell>
      )}
    </RequireAuth>
  )
}
