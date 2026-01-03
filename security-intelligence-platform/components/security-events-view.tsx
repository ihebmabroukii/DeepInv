"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  Server,
  Brain,
  CheckCircle2,
  Copy,
  Terminal,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SecurityEvent {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  asset: string
  timestamp: string
  status: "active" | "investigating" | "resolved"
  aiConfidence: number
  whatHappened: string
  aiReasoning: string
  remediation: {
    description: string
    commands: string[]
  }
}

const events: SecurityEvent[] = [
  {
    id: "EVT-2024-001",
    title: "TLS Certificate Expired on Production API Server",
    severity: "critical",
    asset: "prod-api-01.securebank.com",
    timestamp: "2024-12-22T14:23:00Z",
    status: "active",
    aiConfidence: 98,
    whatHappened:
      "The TLS certificate for prod-api-01.securebank.com expired 7 days ago. All HTTPS connections are now failing with certificate validation errors. This is causing service disruption and exposing the API to potential man-in-the-middle attacks.",
    aiReasoning:
      "Analysis of certificate metadata shows the certificate expired on 2024-12-15. Server logs indicate 1,247 failed SSL handshakes in the last hour. The certificate was issued by Let's Encrypt with a 90-day validity period. Auto-renewal appears to have failed due to misconfigured DNS validation. This is classified as critical because it affects a production service and creates an immediate security vulnerability.",
    remediation: {
      description:
        "Generate a new certificate using Let's Encrypt and update the Nginx configuration. This will restore HTTPS functionality immediately.",
      commands: [
        "# Stop Nginx to free port 80 for certificate generation",
        "sudo systemctl stop nginx",
        "",
        "# Generate new certificate with certbot",
        "sudo certbot certonly --standalone -d prod-api-01.securebank.com",
        "",
        "# Update Nginx SSL configuration",
        "sudo sed -i 's|ssl_certificate .*|ssl_certificate /etc/letsencrypt/live/prod-api-01.securebank.com/fullchain.pem;|' /etc/nginx/sites-available/default",
        "sudo sed -i 's|ssl_certificate_key .*|ssl_certificate_key /etc/letsencrypt/live/prod-api-01.securebank.com/privkey.pem;|' /etc/nginx/sites-available/default",
        "",
        "# Test configuration and restart",
        "sudo nginx -t && sudo systemctl start nginx",
        "",
        "# Verify certificate is valid",
        "openssl s_client -connect prod-api-01.securebank.com:443 -servername prod-api-01.securebank.com < /dev/null | openssl x509 -noout -dates",
      ],
    },
  },
  {
    id: "EVT-2024-002",
    title: "Weak Cipher Suites Detected on Load Balancer",
    severity: "high",
    asset: "prod-lb-03.securebank.com",
    timestamp: "2024-12-22T13:45:00Z",
    status: "investigating",
    aiConfidence: 92,
    whatHappened:
      "Security scan detected that prod-lb-03 is configured to accept weak cipher suites including TLS_RSA_WITH_3DES_EDE_CBC_SHA and TLS_RSA_WITH_RC4_128_SHA. These ciphers are vulnerable to known attacks and do not provide adequate encryption for banking data.",
    aiReasoning:
      "SSL Labs scan results show a grade of B due to weak cipher support. These legacy ciphers were likely left enabled for backwards compatibility but are now deprecated. RC4 is vulnerable to the NOMORE attack, and 3DES is susceptible to the SWEET32 attack. Given that this is a banking application handling sensitive financial data, only TLS 1.2+ with strong AEAD ciphers should be permitted. PCI DSS compliance requires disabling these weak ciphers.",
    remediation: {
      description:
        "Update the load balancer configuration to disable weak ciphers and enforce TLS 1.2+ with strong cipher suites only.",
      commands: [
        "# Edit HAProxy configuration",
        "sudo nano /etc/haproxy/haproxy.cfg",
        "",
        "# Add this to the frontend section:",
        "bind *:443 ssl crt /etc/ssl/certs/prod-lb-03.pem ssl-min-ver TLSv1.2 ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384 ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256",
        "",
        "# Validate configuration",
        "sudo haproxy -c -f /etc/haproxy/haproxy.cfg",
        "",
        "# Reload HAProxy with zero downtime",
        "sudo systemctl reload haproxy",
      ],
    },
  },
  {
    id: "EVT-2024-003",
    title: "Unencrypted Database Connection Detected",
    severity: "critical",
    asset: "prod-api-02.securebank.com → prod-db-replica",
    timestamp: "2024-12-22T12:10:00Z",
    status: "investigating",
    aiConfidence: 87,
    whatHappened:
      "Network traffic analysis shows that prod-api-02 is connecting to the database replica without TLS encryption. Database credentials and query results containing customer PII are being transmitted in plaintext over the internal network.",
    aiReasoning:
      "Packet capture shows PostgreSQL protocol handshake without SSL negotiation. The application's database connection string is missing sslmode=require parameter. While this is on an internal network segment, defense-in-depth principles require encryption of all database connections, especially those handling financial data. An attacker with network access could eavesdrop on sensitive queries and credentials.",
    remediation: {
      description:
        "Enable SSL for the PostgreSQL connection by updating the connection string and ensuring the database server has SSL configured.",
      commands: [
        "# Update application configuration",
        'export DATABASE_URL="postgresql://dbuser@prod-db-replica:5432/bankdb?sslmode=require"',
        "",
        "# Verify database server has SSL enabled",
        "psql -h prod-db-replica -U dbuser -d bankdb -c 'SHOW ssl;'",
        "",
        "# If SSL is not enabled on the server, enable it:",
        "sudo nano /etc/postgresql/14/main/postgresql.conf",
        "# Set: ssl = on",
        "# Set: ssl_cert_file = '/etc/ssl/certs/server.crt'",
        "# Set: ssl_key_file = '/etc/ssl/private/server.key'",
        "",
        "# Restart PostgreSQL",
        "sudo systemctl restart postgresql",
        "",
        "# Restart application to pick up new connection string",
        "sudo systemctl restart api-service",
      ],
    },
  },
  {
    id: "EVT-2024-004",
    title: "Suspicious Authentication Pattern from prod-api-03",
    severity: "medium",
    asset: "prod-api-03.securebank.com",
    timestamp: "2024-12-22T11:30:00Z",
    status: "resolved",
    aiConfidence: 74,
    whatHappened:
      "Detected 347 failed authentication attempts over 15 minutes from prod-api-03 to the identity service. The failure rate is 23x higher than normal baseline for this service.",
    aiReasoning:
      "Log aggregation shows authentication failures clustered around a service restart. The pattern suggests a misconfigured API key or expired service account token rather than a malicious attack. Normal authentication failure rate for this service is 15 attempts per hour. The spike occurred immediately after a deployment, which deployed old configuration. Issue appears to have self-resolved after configuration rollback.",
    remediation: {
      description: "This event auto-resolved after configuration was rolled back. No manual action required.",
      commands: [
        "# Event resolved automatically",
        "# Future prevention: implement configuration validation in CI/CD pipeline",
        "",
        "# Add this check to deployment script:",
        "#!/bin/bash",
        "if [ -z '$API_KEY' ]; then",
        '  echo "Error: API_KEY not set in configuration"',
        "  exit 1",
        "fi",
      ],
    },
  },
]

export function SecurityEventsView() {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const copyCommands = (eventId: string, commands: string[]) => {
    navigator.clipboard.writeText(commands.join("\n"))
    setCopiedCommand(eventId)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive"
      case "high":
        return "bg-warning/10 text-warning border-warning"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500"
      case "low":
        return "bg-muted text-muted-foreground border-muted"
      default:
        return "bg-muted text-muted-foreground border-muted"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-destructive/10 text-destructive"
      case "investigating":
        return "bg-warning/10 text-warning"
      case "resolved":
        return "bg-success/10 text-success"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-balance">Security Events</h1>
          <p className="text-muted-foreground mt-1">AI-powered threat detection and remediation guidance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Terminal className="h-4 w-4 mr-2" />
            Export Events
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Active</p>
                <p className="text-2xl font-bold font-mono mt-1">2</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Investigating</p>
                <p className="text-2xl font-bold font-mono mt-1">2</p>
              </div>
              <Shield className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Resolved Today</p>
                <p className="text-2xl font-bold font-mono mt-1">1</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Avg Confidence</p>
                <p className="text-2xl font-bold font-mono mt-1">88%</p>
              </div>
              <Brain className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Security Events</CardTitle>
          <CardDescription>Click on an event to view AI analysis and remediation steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.map((event) => {
              const isExpanded = expandedEvents.has(event.id)
              return (
                <div
                  key={event.id}
                  className="border border-border rounded-lg bg-background overflow-hidden transition-all"
                >
                  {/* Event Header */}
                  <button
                    onClick={() => toggleEvent(event.id)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{event.id}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs uppercase font-medium", getSeverityColor(event.severity))}
                        >
                          {event.severity}
                        </Badge>
                        <Badge variant="secondary" className={cn("text-xs", getStatusColor(event.status))}>
                          {event.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className="font-mono text-primary">{event.aiConfidence}%</span>
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-balance">{event.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Server className="h-3 w-3" />
                          <span className="font-mono">{event.asset}</span>
                        </div>
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-6 bg-muted/20">
                      {/* What Happened */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          What Happened
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                          {event.whatHappened}
                        </p>
                      </div>

                      {/* AI Reasoning */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          AI Reasoning
                          <span className="text-xs font-normal text-primary font-mono">
                            {event.aiConfidence}% confidence
                          </span>
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{event.aiReasoning}</p>
                      </div>

                      {/* Remediation */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-success" />
                            Remediation
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyCommands(event.id, event.remediation.commands)}
                            className="h-7 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {copiedCommand === event.id ? "Copied!" : "Copy Commands"}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {event.remediation.description}
                        </p>
                        <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs overflow-x-auto">
                          <pre className="text-foreground whitespace-pre-wrap break-words">
                            {event.remediation.commands.join("\n")}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
