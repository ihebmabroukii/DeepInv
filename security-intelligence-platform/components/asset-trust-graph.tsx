"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Server, Database, Globe, Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Asset {
  id: string
  name: string
  type: "server" | "loadbalancer" | "database"
  status: "healthy" | "warning" | "critical"
  tlsStatus: "strong" | "weak" | "none"
  connections: string[]
}

const assets: Asset[] = [
  {
    id: "lb-01",
    name: "prod-lb-01",
    type: "loadbalancer",
    status: "healthy",
    tlsStatus: "strong",
    connections: ["srv-01", "srv-02", "srv-03"],
  },
  {
    id: "srv-01",
    name: "prod-api-01",
    type: "server",
    status: "critical",
    tlsStatus: "none",
    connections: ["db-01", "db-02"],
  },
  {
    id: "srv-02",
    name: "prod-api-02",
    type: "server",
    status: "healthy",
    tlsStatus: "strong",
    connections: ["db-01"],
  },
  {
    id: "srv-03",
    name: "prod-api-03",
    type: "server",
    status: "warning",
    tlsStatus: "weak",
    connections: ["db-02"],
  },
  {
    id: "db-01",
    name: "prod-db-master",
    type: "database",
    status: "healthy",
    tlsStatus: "strong",
    connections: [],
  },
  {
    id: "db-02",
    name: "prod-db-replica",
    type: "database",
    status: "healthy",
    tlsStatus: "strong",
    connections: [],
  },
]

export function AssetTrustGraph() {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "loadbalancer":
        return Globe
      case "server":
        return Server
      case "database":
        return Database
      default:
        return Server
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "border-success bg-success/10"
      case "warning":
        return "border-warning bg-warning/10"
      case "critical":
        return "border-destructive bg-destructive/10"
      default:
        return "border-border bg-card"
    }
  }

  const getTlsColor = (tlsStatus: string) => {
    switch (tlsStatus) {
      case "strong":
        return "text-success"
      case "weak":
        return "text-warning"
      case "none":
        return "text-destructive"
      default:
        return "text-muted-foreground"
    }
  }

  const getTlsLabel = (tlsStatus: string) => {
    switch (tlsStatus) {
      case "strong":
        return "Strong TLS"
      case "weak":
        return "Weak TLS"
      case "none":
        return "No TLS"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-balance">Assets & Trust Graph</h1>
        <p className="text-muted-foreground mt-1">Visual representation of infrastructure and trust relationships</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph Visualization */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Infrastructure Topology</CardTitle>
            <CardDescription>Node-link visualization of assets and TLS trust relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[600px] bg-background rounded-lg border border-border p-8">
              {/* Network topology visualization */}
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                {/* Draw connection lines */}
                {assets.map((asset) =>
                  asset.connections.map((connId) => {
                    const targetAsset = assets.find((a) => a.id === connId)
                    if (!targetAsset) return null

                    // Simple positioning logic
                    const sourceX =
                      asset.type === "loadbalancer"
                        ? 150
                        : asset.id === "srv-01"
                          ? 300
                          : asset.id === "srv-02"
                            ? 400
                            : 500
                    const sourceY = asset.type === "loadbalancer" ? 100 : 250
                    const targetX = targetAsset.type === "database" ? (targetAsset.id === "db-01" ? 350 : 500) : 0
                    const targetY = targetAsset.type === "database" ? 450 : 0

                    const strokeColor =
                      asset.tlsStatus === "strong" && targetAsset.tlsStatus === "strong"
                        ? "stroke-success"
                        : asset.tlsStatus === "none" || targetAsset.tlsStatus === "none"
                          ? "stroke-destructive"
                          : "stroke-warning"

                    return (
                      <line
                        key={`${asset.id}-${connId}`}
                        x1={sourceX}
                        y1={sourceY}
                        x2={targetX}
                        y2={targetY}
                        className={cn("opacity-50", strokeColor)}
                        strokeWidth="2"
                        strokeDasharray={asset.tlsStatus === "none" || targetAsset.tlsStatus === "none" ? "5,5" : "0"}
                      />
                    )
                  }),
                )}
              </svg>

              {/* Load Balancer */}
              <div className="absolute left-8 top-8">
                <AssetNode
                  asset={assets[0]}
                  icon={getAssetIcon(assets[0].type)}
                  statusColor={getStatusColor(assets[0].status)}
                  tlsColor={getTlsColor(assets[0].tlsStatus)}
                  onClick={() => setSelectedAsset(assets[0])}
                  selected={selectedAsset?.id === assets[0].id}
                />
              </div>

              {/* Servers */}
              <div className="absolute left-32 top-32">
                <AssetNode
                  asset={assets[1]}
                  icon={getAssetIcon(assets[1].type)}
                  statusColor={getStatusColor(assets[1].status)}
                  tlsColor={getTlsColor(assets[1].tlsStatus)}
                  onClick={() => setSelectedAsset(assets[1])}
                  selected={selectedAsset?.id === assets[1].id}
                />
              </div>
              <div className="absolute left-64 top-32">
                <AssetNode
                  asset={assets[2]}
                  icon={getAssetIcon(assets[2].type)}
                  statusColor={getStatusColor(assets[2].status)}
                  tlsColor={getTlsColor(assets[2].tlsStatus)}
                  onClick={() => setSelectedAsset(assets[2])}
                  selected={selectedAsset?.id === assets[2].id}
                />
              </div>
              <div className="absolute left-96 top-32">
                <AssetNode
                  asset={assets[3]}
                  icon={getAssetIcon(assets[3].type)}
                  statusColor={getStatusColor(assets[3].status)}
                  tlsColor={getTlsColor(assets[3].tlsStatus)}
                  onClick={() => setSelectedAsset(assets[3])}
                  selected={selectedAsset?.id === assets[3].id}
                />
              </div>

              {/* Databases */}
              <div className="absolute left-48 bottom-16">
                <AssetNode
                  asset={assets[4]}
                  icon={getAssetIcon(assets[4].type)}
                  statusColor={getStatusColor(assets[4].status)}
                  tlsColor={getTlsColor(assets[4].tlsStatus)}
                  onClick={() => setSelectedAsset(assets[4])}
                  selected={selectedAsset?.id === assets[4].id}
                />
              </div>
              <div className="absolute left-96 bottom-16">
                <AssetNode
                  asset={assets[5]}
                  icon={getAssetIcon(assets[5].type)}
                  statusColor={getStatusColor(assets[5].status)}
                  tlsColor={getTlsColor(assets[5].tlsStatus)}
                  onClick={() => setSelectedAsset(assets[5])}
                  selected={selectedAsset?.id === assets[5].id}
                />
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Trust Status</p>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-0.5 bg-success" />
                  <span className="text-muted-foreground">Strong TLS</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-0.5 bg-warning" />
                  <span className="text-muted-foreground">Weak TLS</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-0.5 bg-destructive border-destructive border-dashed" />
                  <span className="text-muted-foreground">No TLS</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Details Panel */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Asset Details</CardTitle>
            <CardDescription>
              {selectedAsset ? "Detailed information and connections" : "Select an asset to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedAsset ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  {(() => {
                    const Icon = getAssetIcon(selectedAsset.type)
                    return <Icon className="h-6 w-6 text-primary" />
                  })()}
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold">{selectedAsset.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{selectedAsset.type}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-2">Status</p>
                    <div className="flex items-center gap-2">
                      {selectedAsset.status === "healthy" && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {selectedAsset.status === "warning" && <AlertTriangle className="h-4 w-4 text-warning" />}
                      {selectedAsset.status === "critical" && <XCircle className="h-4 w-4 text-destructive" />}
                      <span className="text-sm capitalize">{selectedAsset.status}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-2">TLS Configuration</p>
                    <div className="flex items-center gap-2">
                      <Shield className={cn("h-4 w-4", getTlsColor(selectedAsset.tlsStatus))} />
                      <span className={cn("text-sm", getTlsColor(selectedAsset.tlsStatus))}>
                        {getTlsLabel(selectedAsset.tlsStatus)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-2">Connections</p>
                    <div className="space-y-2">
                      {selectedAsset.connections.length > 0 ? (
                        selectedAsset.connections.map((connId) => {
                          const connectedAsset = assets.find((a) => a.id === connId)
                          if (!connectedAsset) return null
                          return (
                            <div
                              key={connId}
                              className="flex items-center gap-2 p-2 rounded bg-background border border-border"
                            >
                              {(() => {
                                const Icon = getAssetIcon(connectedAsset.type)
                                return <Icon className="h-3 w-3 text-muted-foreground" />
                              })()}
                              <span className="text-xs font-mono">{connectedAsset.name}</span>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">No outgoing connections</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-2">Metrics</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uptime</span>
                        <span className="font-mono">99.97%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Response</span>
                        <span className="font-mono">24ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Scan</span>
                        <span className="font-mono">5 min ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <p className="text-sm">Click on an asset node to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface AssetNodeProps {
  asset: Asset
  icon: React.ElementType
  statusColor: string
  tlsColor: string
  onClick: () => void
  selected: boolean
}

function AssetNode({ asset, icon: Icon, statusColor, tlsColor, onClick, selected }: AssetNodeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 relative z-10",
        statusColor,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <Icon className={cn("h-6 w-6", tlsColor)} />
      <span className="text-xs font-mono whitespace-nowrap">{asset.name}</span>
    </button>
  )
}
