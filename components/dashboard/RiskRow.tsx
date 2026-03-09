"use client"

import { getRiskBarWidth, getRiskColor } from "./utils"
import { cn } from "@/lib/utils"

export interface RiskRowProps {
  plate: string
  alerts: number
  maxRisk: number
  globalMax: number
  index: number
}

export function RiskRow({ plate, alerts, maxRisk, globalMax, index }: RiskRowProps) {
  const barWidth = getRiskBarWidth(maxRisk, globalMax)
  const colorClass = getRiskColor(maxRisk)

  return (
    <div className="group relative flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 transition-all duration-150 hover:bg-white/[0.05]">
      <span className="w-5 text-right text-xs font-medium text-white/25 tabular-nums">
        {index + 1}
      </span>
      <span className="flex-1 font-mono text-sm font-medium tracking-wider text-white/90">
        {plate}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/40">
          {alerts} {alerts === 1 ? "evento" : "eventos"}
        </span>
        <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: barWidth,
              background:
                maxRisk >= 15
                  ? "rgb(248 113 113)"
                  : maxRisk >= 8
                    ? "rgb(251 146 60)"
                    : maxRisk >= 4
                      ? "rgb(250 204 21)"
                      : "rgb(52 211 153)",
            }}
          />
        </div>
        <span
          className={cn(
            "min-w-[2rem] rounded border px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
            colorClass
          )}
        >
          {maxRisk}
        </span>
      </div>
    </div>
  )
}
