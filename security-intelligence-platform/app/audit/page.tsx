"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    FileText, Search, Download, Eye, RefreshCw, LogIn, LogOut,
    UserPlus, UserMinus, ShieldAlert, Activity, Users, AlertTriangle,
    Briefcase, Microscope, Globe, CheckCircle2
} from "lucide-react"
import { getSession, logAuditEvent } from "@/lib/auth"

interface AuditLog {
    id: string
    user_id: string
    user_email: string
    user_role: string
    action: string
    resource_type: string | null
    resource_id: string | null
    details: Record<string, any>
    ip_address: string | null
    user_agent: string | null
    timestamp: string
}

function AuditPageContent({ user }: { user: any }) {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterAction, setFilterAction] = useState("all")
    const [filterUser, setFilterUser] = useState("all")
    const [stats, setStats] = useState({ logins: 0, failures: 0, creates: 0, deletes: 0 })

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true)
            const token = getSession()?.token
            const res = await fetch("http://127.0.0.1:8001/api/v1/auth/audit/logs?limit=200", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                const fetchedLogs: AuditLog[] = data.logs || []
                setLogs(fetchedLogs)
                setFilteredLogs(fetchedLogs)
                // Calculate stats
                setStats({
                    logins: fetchedLogs.filter(l => l.action === "login").length,
                    failures: fetchedLogs.filter(l => l.action === "login_failed").length,
                    creates: fetchedLogs.filter(l => l.action === "create_user").length,
                    deletes: fetchedLogs.filter(l => l.action === "delete_user").length,
                })
            }
        } catch (error) {
            console.error("Failed to fetch audit logs:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchLogs, 30000)
        return () => clearInterval(interval)
    }, [fetchLogs])

    // Apply filters
    useEffect(() => {
        let filtered = logs
        if (searchTerm) {
            filtered = filtered.filter(
                (log) =>
                    log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }
        if (filterAction !== "all") filtered = filtered.filter((log) => log.action === filterAction)
        if (filterUser !== "all") filtered = filtered.filter((log) => log.user_email === filterUser)
        setFilteredLogs(filtered)
    }, [searchTerm, filterAction, filterUser, logs])

    const getActionBadge = (action: string) => {
        const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
            login:               { label: "Login",          color: "bg-emerald-600", icon: <LogIn className="h-3 w-3" /> },
            login_failed:        { label: "Login Failed",   color: "bg-red-600",     icon: <AlertTriangle className="h-3 w-3" /> },
            logout:              { label: "Logout",         color: "bg-gray-500",    icon: <LogOut className="h-3 w-3" /> },
            create_user:         { label: "User Created",   color: "bg-blue-600",    icon: <UserPlus className="h-3 w-3" /> },
            delete_user:         { label: "User Deleted",   color: "bg-orange-600",  icon: <UserMinus className="h-3 w-3" /> },
            thehive_case:        { label: "TheHive Case",   color: "bg-yellow-600",  icon: <Briefcase className="h-3 w-3" /> },
            cortex_analysis:     { label: "Cortex Scan",    color: "bg-green-600",   icon: <Microscope className="h-3 w-3" /> },
            opencti_observable:  { label: "OpenCTI IOC",    color: "bg-sky-600",     icon: <Globe className="h-3 w-3" /> },
            download_report:     { label: "Report Export",  color: "bg-purple-600",  icon: <Download className="h-3 w-3" /> },
            view_incident:       { label: "Incident Viewed",color: "bg-slate-600",   icon: <Eye className="h-3 w-3" /> },
            export_audit:        { label: "Audit Export",   color: "bg-gray-600",    icon: <Download className="h-3 w-3" /> },
            acknowledge_incident:{ label: "Acknowledged",   color: "bg-teal-600",    icon: <CheckCircle2 className="h-3 w-3" /> },
        }
        const cfg = map[action]
        if (cfg) {
            return (
                <Badge className={`${cfg.color} gap-1 text-white text-[10px]`}>
                    {cfg.icon} {cfg.label}
                </Badge>
            )
        }
        return <Badge variant="outline" className="text-xs">{action}</Badge>
    }

    const getRoleBadge = (role: string) => {
        if (role === "super_admin") return <Badge className="bg-red-700 text-white text-[10px]">Super Admin</Badge>
        if (role === "soc_expert")  return <Badge className="bg-purple-700 text-white text-[10px]">SOC Expert</Badge>
        if (role === "soc_analyst") return <Badge className="bg-blue-700 text-white text-[10px]">SOC Analyst</Badge>
        return <Badge variant="secondary" className="text-[10px]">{role}</Badge>
    }

    const exportToCSV = () => {
        const headers = ["Timestamp", "User", "Role", "Action", "Resource Type", "Resource ID", "IP Address"]
        const rows = filteredLogs.map((log) => [
            new Date(log.timestamp).toLocaleString(),
            log.user_email,
            log.user_role,
            log.action,
            log.resource_type || "",
            log.resource_id || "",
            log.ip_address || "",
        ])
        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `audit_logs_${new Date().toISOString()}.csv`
        a.click()
        logAuditEvent("export_audit", "audit_log", undefined, { count: filteredLogs.length })
    }

    const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))
    const uniqueUsers = Array.from(new Set(logs.map((log) => log.user_email).filter(Boolean)))

    return (
        <DashboardShell userRole={user.role}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <ShieldAlert className="h-8 w-8 text-orange-500" />
                            Audit Log
                        </h1>
                        <p className="text-muted-foreground mt-1">Real-time activity history — every login, action, and change is recorded.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid gap-4 md:grid-cols-4">
                    {[
                        { label: "Successful Logins",  value: stats.logins,   icon: <LogIn className="h-5 w-5 text-emerald-500" />,  color: "text-emerald-500" },
                        { label: "Failed Logins",      value: stats.failures, icon: <AlertTriangle className="h-5 w-5 text-red-500" />, color: "text-red-500" },
                        { label: "Users Created",      value: stats.creates,  icon: <UserPlus className="h-5 w-5 text-blue-500" />,   color: "text-blue-500" },
                        { label: "Total Events",       value: logs.length,    icon: <Activity className="h-5 w-5 text-orange-500" />, color: "text-orange-500" },
                    ].map(stat => (
                        <Card key={stat.label}>
                            <CardContent className="pt-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                        <p className={`text-3xl font-bold font-mono mt-1 ${stat.color}`}>{stat.value}</p>
                                    </div>
                                    {stat.icon}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" /> Activity Logs
                                </CardTitle>
                                <CardDescription>
                                    {loading ? "Loading..." : `${filteredLogs.length} of ${logs.length} events displayed`}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by user, action, IP, resource..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={filterAction} onValueChange={setFilterAction}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Filter by action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {uniqueActions.map((action) => (
                                        <SelectItem key={action} value={action}>{action}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterUser} onValueChange={setFilterUser}>
                                <SelectTrigger className="w-52">
                                    <SelectValue placeholder="Filter by user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {uniqueUsers.map((u) => (
                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Table */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead className="text-right">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                                Loading audit logs...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12">
                                                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                                                <p className="text-muted-foreground text-sm">No audit events yet.</p>
                                                <p className="text-muted-foreground text-xs mt-1">Events will appear here as users login and perform actions.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <TableRow
                                                key={log.id}
                                                className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                                                    log.action === "login_failed" ? "border-l-2 border-l-red-500/50" :
                                                    log.action === "login" ? "border-l-2 border-l-emerald-500/30" : ""
                                                }`}
                                            >
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">{log.user_email || "System"}</TableCell>
                                                <TableCell>{getRoleBadge(log.user_role)}</TableCell>
                                                <TableCell>{getActionBadge(log.action)}</TableCell>
                                                <TableCell>
                                                    {log.resource_type && (
                                                        <div className="text-xs">
                                                            <span className="font-medium text-muted-foreground">{log.resource_type}</span>
                                                            {log.resource_id && (
                                                                <span className="text-muted-foreground/60 ml-1 font-mono">
                                                                    ({log.resource_id.substring(0, 12)}...)
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{log.ip_address || "—"}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Details Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" /> Audit Event Details
                        </DialogTitle>
                        <DialogDescription>Full information for this security event</DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "User", value: selectedLog.user_email },
                                    { label: "Role", value: getRoleBadge(selectedLog.user_role) },
                                    { label: "Action", value: getActionBadge(selectedLog.action) },
                                    { label: "Timestamp", value: <span className="font-mono text-xs">{new Date(selectedLog.timestamp).toLocaleString()}</span> },
                                    { label: "IP Address", value: <span className="font-mono text-xs">{selectedLog.ip_address || "N/A"}</span> },
                                    { label: "Resource", value: selectedLog.resource_type ? `${selectedLog.resource_type}${selectedLog.resource_id ? ` (${selectedLog.resource_id})` : ""}` : "N/A" },
                                ].map(item => (
                                    <div key={item.label}>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                                        <div className="text-sm">{item.value}</div>
                                    </div>
                                ))}
                            </div>
                            {selectedLog.user_agent && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Browser / Agent</p>
                                    <p className="text-xs font-mono bg-muted p-2 rounded break-all">{selectedLog.user_agent}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Additional Details</p>
                                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-48 font-mono">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardShell>
    )
}

export default function AuditPage() {
    return (
        <RequireAuth>
            {(user) => <AuditPageContent user={user} />}
        </RequireAuth>
    )
}
