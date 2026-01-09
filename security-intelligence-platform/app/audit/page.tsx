"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { FileText, Search, Download, Eye } from "lucide-react"

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

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterAction, setFilterAction] = useState("all")
    const [filterUser, setFilterUser] = useState("all")

    // Fetch audit logs
    useEffect(() => {
        fetchLogs()
    }, [])

    const fetchLogs = async () => {
        try {
            setLoading(true)
            const res = await fetch("http://127.0.0.1:5000/api/v1/audit/logs?limit=200", {
                headers: {
                    "X-User-Role": "super_admin",
                },
            })
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs || [])
                setFilteredLogs(data.logs || [])
            }
        } catch (error) {
            console.error("Failed to fetch audit logs:", error)
        } finally {
            setLoading(false)
        }
    }

    // Apply filters
    useEffect(() => {
        let filtered = logs

        if (searchTerm) {
            filtered = filtered.filter(
                (log) =>
                    log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (filterAction !== "all") {
            filtered = filtered.filter((log) => log.action === filterAction)
        }

        if (filterUser !== "all") {
            filtered = filtered.filter((log) => log.user_email === filterUser)
        }

        setFilteredLogs(filtered)
    }, [searchTerm, filterAction, filterUser, logs])

    const getActionBadge = (action: string) => {
        if (action.includes("create")) return <Badge className="bg-green-500">Create</Badge>
        if (action.includes("delete")) return <Badge className="bg-red-500">Delete</Badge>
        if (action.includes("update")) return <Badge className="bg-blue-500">Update</Badge>
        if (action.includes("login")) return <Badge className="bg-purple-500">Login</Badge>
        if (action.includes("logout")) return <Badge className="bg-gray-500">Logout</Badge>
        return <Badge variant="outline">{action}</Badge>
    }

    const getRoleBadge = (role: string) => {
        if (role === "super_admin") return <Badge className="bg-red-600">Super Admin</Badge>
        if (role === "soc_analyst") return <Badge className="bg-blue-600">SOC Analyst</Badge>
        return <Badge variant="secondary">{role}</Badge>
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
    }

    const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))
    const uniqueUsers = Array.from(new Set(logs.map((log) => log.user_email)))

    if (loading) {
        return (
            <DashboardShell userRole="super_admin">
                <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Loading audit logs...</p>
                </div>
            </DashboardShell>
        )
    }

    return (
        <DashboardShell userRole="super_admin">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
                    <p className="text-muted-foreground">Complete activity history for all users</p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Activity Logs</CardTitle>
                                <CardDescription>
                                    {filteredLogs.length} of {logs.length} logs displayed
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={fetchLogs}>
                                    <Search className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                                <Button variant="outline" size="sm" onClick={exportToCSV}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by user, action, or resource..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <Select value={filterAction} onValueChange={setFilterAction}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Filter by action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {uniqueActions.map((action) => (
                                        <SelectItem key={action} value={action}>
                                            {action}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterUser} onValueChange={setFilterUser}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Filter by user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {uniqueUsers.map((user) => (
                                        <SelectItem key={user} value={user}>
                                            {user}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Table */}
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
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
                                    {filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                No audit logs found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                                                <TableCell className="font-mono text-xs">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </TableCell>
                                                <TableCell>{log.user_email || "System"}</TableCell>
                                                <TableCell>{getRoleBadge(log.user_role)}</TableCell>
                                                <TableCell>{getActionBadge(log.action)}</TableCell>
                                                <TableCell>
                                                    {log.resource_type && (
                                                        <div className="text-sm">
                                                            <span className="font-medium">{log.resource_type}</span>
                                                            {log.resource_id && (
                                                                <span className="text-muted-foreground ml-1 font-mono text-xs">
                                                                    ({log.resource_id.substring(0, 8)}...)
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{log.ip_address || "-"}</TableCell>
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
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <DialogDescription>Complete information for this activity</DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">User</p>
                                    <p className="text-sm">{selectedLog.user_email}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                                    <p className="text-sm">{getRoleBadge(selectedLog.user_role)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Action</p>
                                    <p className="text-sm">{getActionBadge(selectedLog.action)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                                    <p className="text-sm font-mono">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                                    <p className="text-sm font-mono">{selectedLog.ip_address || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Resource</p>
                                    <p className="text-sm">
                                        {selectedLog.resource_type || "N/A"}
                                        {selectedLog.resource_id && (
                                            <span className="text-muted-foreground ml-1">({selectedLog.resource_id})</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">User Agent</p>
                                <p className="text-xs font-mono bg-muted p-2 rounded">{selectedLog.user_agent || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Additional Details</p>
                                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
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
