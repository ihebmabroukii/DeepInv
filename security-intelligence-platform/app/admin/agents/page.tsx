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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Plus, Search, MoreVertical, Activity, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Agent {
  id: string
  name: string
  type: string
  status: "active" | "inactive" | "error"
  region: string
  lastSeen: string
  eventsProcessed: number
  description: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "ThreatHunter-US-East",
      type: "Threat Detection",
      status: "active",
      region: "us_east",
      lastSeen: "2 minutes ago",
      eventsProcessed: 1547,
      description: "AI-powered threat detection agent for US East region",
    },
    {
      id: "2",
      name: "Analyzer-EU-Central",
      type: "Log Analysis",
      status: "active",
      region: "eu_central",
      lastSeen: "5 minutes ago",
      eventsProcessed: 892,
      description: "Real-time log analysis and anomaly detection",
    },
    {
      id: "3",
      name: "Sentinel-Global",
      type: "Network Monitoring",
      status: "inactive",
      region: "global",
      lastSeen: "2 hours ago",
      eventsProcessed: 3421,
      description: "Global network traffic monitoring and analysis",
    },
    {
      id: "4",
      name: "Guardian-Asia-Pacific",
      type: "Intrusion Detection",
      status: "error",
      region: "asia_pacific",
      lastSeen: "30 minutes ago",
      eventsProcessed: 654,
      description: "IDS agent for Asia Pacific region",
    },
  ])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    type: "threat_detection",
    region: "global",
    description: "",
  })

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

      setIsLoading(false)
    }

    checkAccess()
  }, [router])

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const newAgent: Agent = {
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type,
        status: "inactive",
        region: formData.region,
        lastSeen: "Just now",
        eventsProcessed: 0,
        description: formData.description,
      }

      setAgents([...agents, newAgent])

      setFormData({
        name: "",
        type: "threat_detection",
        region: "global",
        description: "",
      })

      setIsDialogOpen(false)
      alert("Agent created successfully!")
    } catch (error) {
      console.error("[v0] Error creating agent:", error)
      alert("Error creating agent")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleAgent = (agentId: string) => {
    setAgents(
      agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, status: agent.status === "active" ? "inactive" : ("active" as const) }
          : agent,
      ),
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-3 w-3" />
            Inactive
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
  const inactiveAgents = agents.filter((a) => a.status === "inactive").length
  const errorAgents = agents.filter((a) => a.status === "error").length

  return (
    <DashboardShell userRole={currentUser?.role || "super_admin"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
            <p className="text-muted-foreground">Monitor and manage AI security agents</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateAgent}>
                <DialogHeader>
                  <DialogTitle>Add New Agent</DialogTitle>
                  <DialogDescription>Deploy a new AI security agent</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="agentName">Agent Name</Label>
                    <Input
                      id="agentName"
                      placeholder="ThreatHunter-US-West"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentType">Agent Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger id="agentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="threat_detection">Threat Detection</SelectItem>
                        <SelectItem value="log_analysis">Log Analysis</SelectItem>
                        <SelectItem value="network_monitoring">Network Monitoring</SelectItem>
                        <SelectItem value="intrusion_detection">Intrusion Detection</SelectItem>
                        <SelectItem value="behavior_analysis">Behavior Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentRegion">Region</Label>
                    <Select
                      value={formData.region}
                      onValueChange={(value) => setFormData({ ...formData, region: value })}
                    >
                      <SelectTrigger id="agentRegion">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="us_east">US East</SelectItem>
                        <SelectItem value="us_west">US West</SelectItem>
                        <SelectItem value="eu_central">EU Central</SelectItem>
                        <SelectItem value="asia_pacific">Asia Pacific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentDescription">Description</Label>
                    <Input
                      id="agentDescription"
                      placeholder="Agent description..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Add Agent"
                    )}
                  </Button>
                </DialogFooter>
              </form>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground">{inactiveAgents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
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
                <CardDescription>Manage all deployed AI security agents</CardDescription>
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
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{agent.region.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{agent.lastSeen}</TableCell>
                    <TableCell className="font-mono text-sm">{agent.eventsProcessed.toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleAgent(agent.id)}>
                            {agent.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem>View Logs</DropdownMenuItem>
                          <DropdownMenuItem>Configure</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Remove Agent</DropdownMenuItem>
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
    </DashboardShell>
  )
}
