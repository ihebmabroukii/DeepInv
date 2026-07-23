"use client"

import { useEffect, useRef } from "react"
import { logAuditEvent } from "@/lib/auth"

// Invisible helper: records that the current analyst opened this incident so the
// audit trail shows "who looked at / took care of" each incident. Fires once per
// mount and de-dupes within a session to avoid spamming on quick re-renders.
export function IncidentViewLogger({ incidentId, sourceIp }: { incidentId: string; sourceIp?: string }) {
  const logged = useRef(false)

  useEffect(() => {
    if (logged.current || !incidentId) return
    logged.current = true
    const key = `viewed:${incidentId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {}
    logAuditEvent("view_incident", "incident", incidentId, sourceIp ? { source_ip: sourceIp } : undefined)
  }, [incidentId, sourceIp])

  return null
}
