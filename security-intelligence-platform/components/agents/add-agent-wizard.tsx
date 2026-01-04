"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Bot,
    Server,
    Cloud,
    Container,
    ShieldCheck,
    Activity,
    Eye,
    Search,
    FileText,
    Lock,
    ArrowRight,
    ArrowLeft,
    Copy,
    Check,
    Terminal,
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AddAgentWizardProps {
    onSuggestClose: () => void
    onAgentCreated: () => void
}

type AgentPlatform = "endpoint_agent" | "network_sensor" | "cloud_vm_agent" | "container_k8s_agent"

const PLATFORMS = [
    {
        id: "endpoint_agent",
        name: "Endpoint Agent",
        icon: Server,
        description: "Monitoring for workstations and servers",
    },
    {
        id: "network_sensor",
        name: "Network Sensor",
        icon: Activity,
        description: "Traffic analysis and anomaly detection",
    },
    {
        id: "cloud_vm_agent",
        name: "Cloud / VM Agent",
        icon: Cloud,
        description: "Optimized for AWS, Azure, GCP instances",
    },
    {
        id: "container_k8s_agent",
        name: "Container / K8s Agent",
        icon: Container,
        description: "Kubernetes sidecar or daemonset",
    },
]

const CAPABILITIES = {
    endpoint_agent: [
        { id: "log_analysis", label: "Log Analysis", icon: FileText, default: true },
        { id: "threat_detection", label: "Threat Detection", icon: ShieldCheck, default: true },
        { id: "intrusion_detection", label: "Intrusion Detection (IDS)", icon: Eye, default: true },
        { id: "behavioral_analysis", label: "Behavioral Analysis", icon: Activity, default: true },
        { id: "tls_monitoring", label: "TLS / Cert Monitoring", icon: Lock, default: false },
    ],
    network_sensor: [
        { id: "network_monitoring", label: "Network Monitoring", icon: Activity, default: true },
        { id: "ids", label: "Intrusion Detection (IDS)", icon: Eye, default: true },
        { id: "asset_discovery", label: "Asset Discovery", icon: Search, default: true },
        { id: "tls_monitoring", label: "TLS / Cert Monitoring", icon: Lock, default: true },
    ],
    cloud_vm_agent: [
        { id: "log_analysis", label: "Log Analysis", icon: FileText, default: true },
        { id: "threat_detection", label: "Threat Detection", icon: ShieldCheck, default: true },
        { id: "workload_protection", label: "Cloud Workload Protection", icon: Cloud, default: true },
    ],
    container_k8s_agent: [
        { id: "container_security", label: "Container Security", icon: Container, default: true },
        { id: "image_scanning", label: "Runtime Image Scanning", icon: Search, default: true },
        { id: "behavioral_analysis", label: "Behavioral Analysis", icon: Activity, default: true },
    ]
}

export function AddAgentWizard({ onSuggestClose, onAgentCreated }: AddAgentWizardProps) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        environment: "prod",
        criticality: "medium",
        platform: "" as AgentPlatform | "",
        target_os: "linux" as "linux" | "windows",
        capabilities: [] as string[],
        region: "",
        network_zone: "internal",
        tags: "",
        trust_mtls: true,
        trust_hardware: true,
        trust_autorevoke: true,
        trust_remote: false,
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [installCommands, setInstallCommands] = useState<{ linux: string, windows: string } | null>(null)
    const [copied, setCopied] = useState<string | null>(null)

    const handleCapabilityToggle = (capId: string) => {
        setFormData(prev => {
            const caps = prev.capabilities.includes(capId)
                ? prev.capabilities.filter(c => c !== capId)
                : [...prev.capabilities, capId]
            return { ...prev, capabilities: caps }
        })
    }

    const handlePlatformSelect = (platformId: string) => {
        setFormData(prev => ({
            ...prev,
            platform: platformId as AgentPlatform,
            capabilities: ((CAPABILITIES as any)[platformId] || [])
                .filter((c: any) => c.default)
                .map((c: any) => c.id)
        }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            // Prepare data for backend
            const payload = {
                ...formData,
                tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
                trust_configuration: {
                    mtls: formData.trust_mtls,
                    hardware_bound: formData.trust_hardware,
                    auto_revoke: formData.trust_autorevoke,
                    remote_actions: formData.trust_remote
                }
            }

            // Call backend API
            // Use trailing slash to avoid redirect issues with CORS
            const response = await fetch("http://127.0.0.1:5000/api/v1/agents/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to create agent")
            }

            const data = await response.json()
            setInstallCommands({
                linux: data.install_command_linux,
                windows: data.install_command_windows
            })

            setStep(6) // Success Screen
            onAgentCreated()
        } catch (error: any) {
            console.error("Error creating agent:", error)
            alert(`Failed to create agent: ${error.message || "Unknown error"}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    // --- Step Components ---

    const renderStepIndicator = () => (
        <div className="flex justify-center mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                    <div
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                            step === s
                                ? "bg-primary text-primary-foreground"
                                : step > s
                                    ? "bg-emerald-500 text-white"
                                    : "bg-muted text-muted-foreground"
                        )}
                    >
                        {step > s ? <Check className="h-4 w-4" /> : s}
                    </div>
                    {s < 5 && (
                        <div
                            className={cn(
                                "w-12 h-1 mx-2 rounded transition-colors",
                                step > s ? "bg-emerald-500" : "bg-muted"
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    )

    const renderStep1_Identity = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Agent Name</Label>
                    <Input
                        placeholder="e.g. prod-db-monitor-01"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Environment</Label>
                    <Select value={formData.environment} onValueChange={v => setFormData({ ...formData, environment: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="prod">Production</SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                            <SelectItem value="lab">Lab / Test</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Description</Label>
                <Input
                    placeholder="Purpose of this agent..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <Label>Criticality</Label>
                <div className="flex gap-4">
                    {['low', 'medium', 'high'].map(level => (
                        <div
                            key={level}
                            className={cn(
                                "flex-1 p-3 border rounded-lg cursor-pointer text-center capitalize hover:bg-muted/50 transition-all",
                                formData.criticality === level ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                            )}
                            onClick={() => setFormData({ ...formData, criticality: level })}
                        >
                            {level}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    const renderStep2_Platform = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
                <Label>Select Platform</Label>
                <div className="grid grid-cols-2 gap-4">
                    {PLATFORMS.map((platform) => {
                        const Icon = platform.icon
                        const isSelected = formData.platform === platform.id
                        return (
                            <div
                                key={platform.id}
                                onClick={() => handlePlatformSelect(platform.id)}
                                className={cn(
                                    "p-4 border rounded-xl cursor-pointer transition-all hover:bg-muted/50",
                                    isSelected
                                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                        : "border-border"
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn("p-2 rounded-lg", isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{platform.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{platform.description}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="space-y-3">
                <Label>Target Operating System</Label>
                <div className="flex gap-4">
                    <div
                        onClick={() => setFormData({ ...formData, target_os: 'linux' })}
                        className={cn(
                            "flex-1 p-4 border rounded-xl cursor-pointer flex items-center gap-3 transition-all",
                            formData.target_os === 'linux' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                        )}
                    >
                        <Terminal className="h-5 w-5" />
                        <div>
                            <div className="font-semibold">Linux / macOS</div>
                            <div className="text-xs text-muted-foreground">Debian, Ubuntu, CentOS, macOS</div>
                        </div>
                    </div>
                    <div
                        onClick={() => setFormData({ ...formData, target_os: 'windows' })}
                        className={cn(
                            "flex-1 p-4 border rounded-xl cursor-pointer flex items-center gap-3 transition-all",
                            formData.target_os === 'windows' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                        )}
                    >
                        <div className="h-5 w-5 flex items-center justify-center font-bold border rounded bg-muted">W</div>
                        <div>
                            <div className="font-semibold">Windows</div>
                            <div className="text-xs text-muted-foreground">Server 2016+, Windows 10/11</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderStep3_Capabilities = () => {
        if (!formData.platform) return <div className="text-center text-muted-foreground">Select a platform first</div>

        const availableCaps = (CAPABILITIES as any)[formData.platform] || []

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-3">
                    {availableCaps.map((cap: any) => {
                        const Icon = cap.icon
                        const isChecked = formData.capabilities.includes(cap.id)
                        return (
                            <div
                                key={cap.id}
                                onClick={() => handleCapabilityToggle(cap.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all",
                                    isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                )}
                            >
                                <div className={cn("flex-shrink-0", isChecked ? "text-primary" : "text-muted-foreground")}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <span className="font-medium text-sm">{cap.label}</span>
                                </div>
                                {isChecked && <Check className="h-4 w-4 text-primary" />}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    const renderStep4_RegionTrust = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={formData.region} onValueChange={v => setFormData({ ...formData, region: v })}>
                        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                            <SelectItem value="eu-central-1">EU Central (Frankfurt)</SelectItem>
                            <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Network Zone</Label>
                    <Select value={formData.network_zone} onValueChange={v => setFormData({ ...formData, network_zone: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="internal">Internal Network</SelectItem>
                            <SelectItem value="dmz">DMZ</SelectItem>
                            <SelectItem value="cloud">Public Cloud</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                    placeholder="web-server, pci-dss, v1.2"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
            </div>

            <div className="border rounded-lg p-4 bg-muted/20">
                <h4 className="font-semibold flex items-center gap-2 mb-4">
                    <Lock className="h-4 w-4 text-primary" />
                    Trust Configuration
                </h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="mtls"
                            checked={formData.trust_mtls}
                            onCheckedChange={(c: boolean) => setFormData({ ...formData, trust_mtls: c })}
                        />
                        <Label htmlFor="mtls" className="cursor-pointer">Require Mutual TLS (mTLS) for all communications</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="hw"
                            checked={formData.trust_hardware}
                            onCheckedChange={(c: boolean) => setFormData({ ...formData, trust_hardware: c })}
                        />
                        <Label htmlFor="hw" className="cursor-pointer">Bind agent identity to hardware fingerprint</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="revoke"
                            checked={formData.trust_autorevoke}
                            onCheckedChange={(c: boolean) => setFormData({ ...formData, trust_autorevoke: c })}
                        />
                        <Label htmlFor="revoke" className="cursor-pointer">Auto-revoke certificate if tampering detected</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="remote"
                            checked={formData.trust_remote}
                            onCheckedChange={(c: boolean) => setFormData({ ...formData, trust_remote: c })}
                        />
                        <Label htmlFor="remote" className="cursor-pointer text-destructive">Allow remote administrative actions (Dangerous)</Label>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderStep5_Confirmation = () => (
        <div className="py-8 text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold">Ready to Deploy?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
                You are about to create a <strong>{formData.criticality}</strong> criticality <strong>{formData.platform.replace("_", " ")}</strong> agent on <strong>{(formData.target_os === 'linux' ? "Linux" : "Windows")}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-4 text-left max-w-lg mx-auto bg-muted/30 p-4 rounded-lg text-sm">
                <div>
                    <span className="text-muted-foreground block">Capabilities</span>
                    <ul>
                        {formData.capabilities.slice(0, 3).map(c => <li key={c} className="font-medium">• {c.replace("_", " ")}</li>)}
                        {formData.capabilities.length > 3 && <li>...and {formData.capabilities.length - 3} more</li>}
                    </ul>
                </div>
                <div>
                    <span className="text-muted-foreground block">Trust Policy</span>
                    <ul>
                        {formData.trust_mtls && <li className="text-emerald-500">• mTLS Enabled</li>}
                        {formData.trust_hardware && <li className="text-emerald-500">• HW Bound</li>}
                        <li className="text-blue-500">• Target: {formData.target_os === 'linux' ? 'Linux' : 'Windows'}</li>
                    </ul>
                </div>
            </div>
        </div>
    )

    const renderSuccessScreen = () => {
        if (!installCommands) return null

        // Only show the command for the selected OS, but allow toggling if user made a mistake?
        // User asked "select which agent type ill be choosing; linux or windows" implies filtering.
        // We will show the selected one prominently.

        const isLinux = formData.target_os === 'linux'

        return (
            <div className="space-y-6 animate-in zoom-in duration-300">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                        <Check className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-bold">Agent Created Successfully</h2>
                    <p className="text-muted-foreground">Run this command on your {isLinux ? "Linux Device" : "Windows Machine"} to install the agent.</p>
                </div>

                {isLinux && (
                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Terminal className="h-4 w-4" />
                                <span>Linux / macOS</span>
                            </div>
                            <span className="text-xs text-orange-400 flex items-center gap-1">⏱ Expires in 10m</span>
                        </div>
                        <div className="relative group">
                            <pre className="text-slate-50 font-mono text-sm overflow-x-auto p-2 bg-slate-900/50 rounded">
                                {installCommands.linux}
                            </pre>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1 text-slate-400 hover:text-white hover:bg-slate-800"
                                onClick={() => copyToClipboard(installCommands.linux, 'linux')}
                            >
                                {copied === 'linux' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                {!isLinux && (
                    <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <Terminal className="h-4 w-4" />
                                <span>Windows (PowerShell)</span>
                            </div>
                            <span className="text-xs text-orange-400 flex items-center gap-1">⏱ Expires in 10m</span>
                        </div>
                        <div className="relative group">
                            <pre className="text-slate-900 font-mono text-sm overflow-x-auto p-2 bg-white rounded border">
                                {installCommands.windows}
                            </pre>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1 text-slate-400 hover:text-slate-900"
                                onClick={() => copyToClipboard(installCommands.windows, 'windows')}
                            >
                                {copied === 'windows' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex justify-center pt-4">
                    <Button onClick={onSuggestClose} className="w-full sm:w-auto">Done</Button>
                </div>
            </div>
        )
    }

    // --- Main Render ---

    if (step === 6) return renderSuccessScreen()

    return (
        <div className="h-full flex flex-col">
            {renderStepIndicator()}

            <div className="flex-1 overflow-y-auto px-1">
                {step === 1 && renderStep1_Identity()}
                {step === 2 && renderStep2_Platform()}
                {step === 3 && renderStep3_Capabilities()}
                {step === 4 && renderStep4_RegionTrust()}
                {step === 5 && renderStep5_Confirmation()}
            </div>

            <div className="pt-6 mt-6 border-t flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => step === 1 ? onSuggestClose() : setStep(s => s - 1)}
                    disabled={isSubmitting}
                >
                    {step === 1 ? "Cancel" : "Back"}
                </Button>
                <Button
                    onClick={() => step === 5 ? handleSubmit() : setStep(s => s + 1)}
                    disabled={(step === 1 && !formData.name) || (step === 2 && !formData.platform) || isSubmitting}
                    className="gap-2"
                >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {step === 5 ? "Create Agent" : "Next Step"}
                    {!isSubmitting && step < 5 && <ArrowRight className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    )
}
