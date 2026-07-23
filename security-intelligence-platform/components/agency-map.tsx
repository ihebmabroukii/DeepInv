"use client"

import React, { useState, useEffect } from "react"
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, ShieldAlert, ShieldCheck } from "lucide-react"

const geoUrl = "/features.json"

const agencies = [
  { id: "tunis", name: "Tunis HQ", coordinates: [10.1815, 36.8065] },
  { id: "sousse", name: "Sousse Branch", coordinates: [10.6369, 35.8256] },
  { id: "sfax", name: "Sfax Branch", coordinates: [10.7600, 34.7400] },
  { id: "gafsa", name: "Gafsa Branch", coordinates: [8.7842, 34.4250] },
  { id: "bizerte", name: "Bizerte Branch", coordinates: [9.8739, 37.2744] },
  { id: "paris", name: "Paris Int. Branch", coordinates: [2.3522, 48.8566] },
  { id: "dakar", name: "Dakar Sub-Branch", coordinates: [-17.4677, 14.7167] },
  { id: "abidjan", name: "Abidjan Hub", coordinates: [-4.0083, 5.3600] }
]

export function AgencyMap({ incidents = [] }: { incidents?: any[] }) {
  const [mounted, setMounted] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([9, 25]) // Centered around North/West Africa

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-[400px] bg-muted/20 animate-pulse rounded-lg" />

  // Map incidents to agencies to create dynamic 'lighting'
  // In a real app, incidents would have geographic data. Here we pseudo-randomly map them for the demo.
  const agencyStatus = agencies.map((agency, i) => {
    const matchingIncidents = incidents.filter((_, index) => (index % agencies.length) === i)
    
    let status = "ok"
    let description = "Normal Operations"
    
    if (matchingIncidents.length > 0) {
      const hasCritical = matchingIncidents.some(inc => inc.severity === "critical" || inc.risk_score >= 80)
      if (hasCritical) {
        status = "critical"
        description = `Critical Threat Detected: ${matchingIncidents[0].title}`
      } else {
        status = "warning"
        description = `Elevated Risk: ${matchingIncidents[0].title}`
      }
    }

    return { ...agency, status, description }
  })

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Global Attijari Agencies
        </CardTitle>
        <CardDescription>Real-time geographic threat mapping</CardDescription>
      </CardHeader>
      <CardContent className="p-0 relative">
        <div className="h-[400px] w-full bg-[#0a0a0a]">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 600,
            }}
            width={800}
            height={400}
          >
            <ZoomableGroup center={mapCenter} zoom={1} minZoom={1} maxZoom={5}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#1a1a1a"
                      stroke="#333333"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#2a2a2a", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {agencyStatus.map(({ id, name, coordinates, status, description }) => (
                <Marker key={id} coordinates={coordinates as [number, number]}>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g cursor="pointer">
                          {status === "critical" && (
                            <>
                              <circle r={12} fill="#ef4444" opacity={0.3} className="animate-ping origin-center" />
                              <circle r={6} fill="#ef4444" />
                            </>
                          )}
                          {status === "warning" && (
                            <>
                              <circle r={12} fill="#f59e0b" opacity={0.3} className="animate-pulse origin-center" />
                              <circle r={6} fill="#f59e0b" />
                            </>
                          )}
                          {status === "ok" && (
                            <circle r={4} fill="#10b981" opacity={0.8} />
                          )}
                          <text
                            textAnchor="middle"
                            y={-15}
                            style={{ fill: "#fff", fontSize: "10px", fontWeight: "600", pointerEvents: "none" }}
                            className="drop-shadow-md"
                          >
                            {name}
                          </text>
                        </g>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="border-border bg-card/95 backdrop-blur z-50">
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-sm">{name}</p>
                          <div className="flex items-center gap-2 text-xs">
                            {status === "critical" && <ShieldAlert className="h-3 w-3 text-destructive" />}
                            {status === "warning" && <ShieldAlert className="h-3 w-3 text-warning" />}
                            {status === "ok" && <ShieldCheck className="h-3 w-3 text-success" />}
                            <span className={
                              status === "critical" ? "text-destructive" :
                              status === "warning" ? "text-warning" : "text-success"
                            }>
                              {description}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </CardContent>
    </Card>
  )
}
