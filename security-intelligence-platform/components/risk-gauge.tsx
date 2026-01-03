"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface RiskGaugeProps {
  score: number // 0-100
}

export function RiskGauge({ score }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score)
    }, 100)
    return () => clearTimeout(timer)
  }, [score])

  // Calculate color based on score (higher score = higher risk)
  const getColor = () => {
    if (score >= 75) return "text-destructive"
    if (score >= 50) return "text-warning"
    return "text-success"
  }

  const getStrokeColor = () => {
    if (score >= 75) return "stroke-destructive"
    if (score >= 50) return "stroke-warning"
    return "stroke-success"
  }

  const getLabel = () => {
    if (score >= 75) return "High Risk"
    if (score >= 50) return "Moderate Risk"
    return "Low Risk"
  }

  // SVG circle parameters
  const size = 200
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-secondary"
          />
          {/* Animated progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", getStrokeColor())}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-4xl font-bold font-mono transition-colors", getColor())}>{score}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Risk Score</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className={cn("text-sm font-semibold", getColor())}>{getLabel()}</p>
        <p className="text-xs text-muted-foreground mt-1">Based on 23 security metrics</p>
      </div>
    </div>
  )
}
