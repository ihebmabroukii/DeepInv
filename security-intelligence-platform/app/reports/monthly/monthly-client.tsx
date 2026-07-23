"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"

interface MonthlyReportClientProps {
  incidents: any[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function MonthlyReportClient({ incidents }: MonthlyReportClientProps) {
  // Process Data for Risk Bar Chart
  // We'll bucket risk scores: Low (0-39), Medium (40-69), High (70-100)
  const riskBuckets = { Low: 0, Medium: 0, High: 0 }
  incidents.forEach(i => {
    if(i.risk_score < 40) riskBuckets.Low++
    else if(i.risk_score < 70) riskBuckets.Medium++
    else riskBuckets.High++
  })

  const riskData = [
    { name: 'Low (<40)', count: riskBuckets.Low, fill: '#10b981' },
    { name: 'Medium (40-69)', count: riskBuckets.Medium, fill: '#f59e0b' },
    { name: 'High (70+)', count: riskBuckets.High, fill: '#ef4444' },
  ]

  // Process Data for Tactics Pie Chart
  const tacticCounts: any = {}
  incidents.forEach(i => {
    const t = i.mitre_tactic || "Unknown"
    tacticCounts[t] = (tacticCounts[t] || 0) + 1
  })
  
  const tacticData = Object.keys(tacticCounts).map((k, idx) => ({
    name: k,
    value: tacticCounts[k]
  })).sort((a,b) => b.value - a.value).slice(0, 5) // Top 5

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6 print:grid-cols-2">
      <Card className="print:break-inside-avoid shadow-sm group hover:border-blue-500/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-lg">Risk Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid shadow-sm group hover:border-purple-500/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-lg">Top Attacker Tactics (MITRE)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            {tacticData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tacticData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {tacticData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="text-muted-foreground">No tactic data available.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
