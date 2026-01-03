"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  GitBranch,
  Play,
  Plus,
  Settings,
  Shield,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Rule {
  id: string
  name: string
  status: "active" | "draft" | "disabled"
  trigger: string
  conditions: string[]
  actions: string[]
  lastTriggered?: string
  executionCount: number
}

const rules: Rule[] = [
  {
    id: "rule-001",
    name: "Auto-Fix Expired TLS Certificates",
    status: "active",
    trigger: "TLS Certificate Expiring",
    conditions: ["Asset Type = Production", "Days Until Expiry < 7"],
    actions: ["Generate AI Analysis", "Require Manual Approval", "Execute Auto-Fix Script"],
    lastTriggered: "2 hours ago",
    executionCount: 3,
  },
  {
    id: "rule-002",
    name: "Escalate Critical Security Events",
    status: "active",
    trigger: "Security Event Detected",
    conditions: ["Severity = Critical", "Asset Type = Production"],
    actions: ["Send Slack Alert", "Create PagerDuty Incident", "Notify Security Team"],
    lastTriggered: "15 minutes ago",
    executionCount: 12,
  },
  {
    id: "rule-003",
    name: "Automated Weak Cipher Remediation",
    status: "draft",
    trigger: "Weak Cipher Suite Detected",
    conditions: ["Asset Type = Load Balancer", "Cipher Grade < B"],
    actions: ["Generate Remediation Plan", "Schedule Maintenance Window", "Apply Configuration"],
    executionCount: 0,
  },
]

const flowSteps = [
  { id: "trigger", type: "trigger", label: "TLS Issue Detected", icon: AlertTriangle, color: "destructive" },
  { id: "condition1", type: "condition", label: "Asset = Production?", icon: GitBranch, color: "warning" },
  { id: "action1", type: "action", label: "Ask AI for Analysis", icon: Brain, color: "primary" },
  { id: "condition2", type: "condition", label: "Require Approval?", icon: Shield, color: "warning" },
  { id: "action2", type: "action", label: "Execute Auto-Fix", icon: Zap, color: "success" },
]

export function RuleBuilder() {
  const [selectedRule, setSelectedRule] = useState<Rule | null>(rules[0])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-balance">Rules & Automation</h1>
          <p className="text-muted-foreground mt-1">Visual rule builder for automated security workflows</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules List */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Automation Rules</CardTitle>
            <CardDescription>Select a rule to view or edit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => setSelectedRule(rule)}
                  className={cn(
                    "w-full p-3 rounded-lg border transition-all text-left",
                    selectedRule?.id === rule.id
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-border hover:border-primary/50",
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-balance">{rule.name}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          rule.status === "active" && "bg-success/10 text-success",
                          rule.status === "draft" && "bg-muted text-muted-foreground",
                          rule.status === "disabled" && "bg-destructive/10 text-destructive",
                        )}
                      >
                        {rule.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{rule.id}</span>
                      <span>Triggered: {rule.executionCount}x</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visual Flow Builder */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Rule Workflow</CardTitle>
                <CardDescription>
                  {selectedRule ? `Visual flow for ${selectedRule.name}` : "Select a rule to view workflow"}
                </CardDescription>
              </div>
              {selectedRule && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" className="gap-2">
                    <Play className="h-4 w-4" />
                    Test Run
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedRule ? (
              <div className="space-y-8">
                {/* Flow Canvas */}
                <div className="relative min-h-[500px] bg-background rounded-lg border border-border p-8">
                  <div className="flex flex-col items-center gap-6">
                    {flowSteps.map((step, index) => {
                      const Icon = step.icon
                      const isLastStep = index === flowSteps.length - 1

                      return (
                        <div key={step.id} className="flex flex-col items-center gap-4 w-full max-w-md">
                          {/* Flow Step */}
                          <div
                            className={cn(
                              "w-full p-4 rounded-lg border-2 transition-all hover:scale-105 cursor-pointer",
                              step.type === "trigger" && "bg-destructive/10 border-destructive",
                              step.type === "condition" && "bg-warning/10 border-warning",
                              step.type === "action" && "bg-primary/10 border-primary",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-2 rounded",
                                  step.type === "trigger" && "bg-destructive/20",
                                  step.type === "condition" && "bg-warning/20",
                                  step.type === "action" && "bg-primary/20",
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "h-5 w-5",
                                    step.type === "trigger" && "text-destructive",
                                    step.type === "condition" && "text-warning",
                                    step.type === "action" && "text-primary",
                                  )}
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold">{step.label}</p>
                                <p className="text-xs text-muted-foreground capitalize">{step.type}</p>
                              </div>
                            </div>
                          </div>

                          {/* Connector Arrow */}
                          {!isLastStep && (
                            <div className="flex flex-col items-center">
                              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Completion Indicator */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-success/10 border border-success rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs font-medium text-success">Flow Complete</span>
                  </div>
                </div>

                {/* Rule Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Trigger</p>
                    <div className="p-3 rounded-lg bg-background border border-border">
                      <p className="text-sm font-mono">{selectedRule.trigger}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Conditions</p>
                    <div className="space-y-2">
                      {selectedRule.conditions.map((condition, index) => (
                        <div key={index} className="p-2 rounded bg-background border border-border">
                          <p className="text-xs font-mono">{condition}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Actions</p>
                    <div className="space-y-2">
                      {selectedRule.actions.map((action, index) => (
                        <div key={index} className="p-2 rounded bg-background border border-border">
                          <p className="text-xs font-mono">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Execution Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
                    <p
                      className={cn(
                        "text-sm font-semibold capitalize",
                        selectedRule.status === "active" && "text-success",
                        selectedRule.status === "draft" && "text-muted-foreground",
                        selectedRule.status === "disabled" && "text-destructive",
                      )}
                    >
                      {selectedRule.status}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Executions</p>
                    <p className="text-sm font-semibold font-mono">{selectedRule.executionCount}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Last Triggered</p>
                    <p className="text-sm font-semibold">{selectedRule.lastTriggered || "Never"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <p className="text-sm">Select a rule to view workflow</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rule Templates */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Rule Templates</CardTitle>
          <CardDescription>Quick start templates for common security automation scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-1">Certificate Auto-Renewal</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automatically renew TLS certificates before expiration
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-1">Incident Response</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Escalate critical events with automated workflows
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-success/10">
                  <Zap className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-1">Compliance Checks</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enforce security policies automatically
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
