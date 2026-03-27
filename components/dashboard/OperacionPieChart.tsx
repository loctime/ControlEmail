"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

interface TopOperacionRow {
  operacion: string
  excesos: number
  pct: number
}

interface OperacionPieChartProps {
  rows: TopOperacionRow[]
  selectedOperacion: string | null
  onOperacionSelect: (operacion: string | null) => void
  className?: string
}

const CHART_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]
const CHART_COLORS_LIGHT = ["#fca5a5", "#fed7aa", "#fef08a", "#86efac", "#93c5fd"]

const MAX_LABEL_NAME_LEN = 28

function pieSliceLabel(entry: { name: string; pct: number }) {
  const { name, pct } = entry
  const shown =
    name.length > MAX_LABEL_NAME_LEN ? `${name.slice(0, MAX_LABEL_NAME_LEN - 1)}…` : name
  return `${shown} (${pct}%)`
}

export function OperacionPieChart({
  rows,
  selectedOperacion,
  onOperacionSelect,
  className = "h-80",
}: OperacionPieChartProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-white/30">
        Sin datos disponibles
      </div>
    )
  }

  const data = rows.map((row) => ({
    name: row.operacion,
    value: row.excesos,
    pct: row.pct,
  }))

  const handlePieClick = (data: any) => {
    onOperacionSelect(selectedOperacion === data.name ? null : data.name)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, pct } = payload[0].payload
      return (
        <div
          className={cn(
            "z-50 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md",
          )}
        >
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-muted-foreground">{value} excesos</p>
          <p className="text-muted-foreground">{pct}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn("w-full -ml-4", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ left: 8, right: 12, top: 20, bottom: 20 }}>
          <Pie
            data={data}
            cx="45%"
            cy="50%"
            labelLine={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
            label={({ name, pct }) => pieSliceLabel({ name, pct })}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            onClick={handlePieClick}
            style={{ cursor: "pointer" }}
          >
            {data.map((entry, index) => {
              const isSelected = entry.name === selectedOperacion
              const color = CHART_COLORS[index % CHART_COLORS.length]
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isSelected ? CHART_COLORS_LIGHT[index % CHART_COLORS_LIGHT.length] : color}
                  opacity={isSelected ? 1 : 0.8}
                  style={{ filter: isSelected ? "drop-shadow(0 0 8px rgba(255,255,255,0.3))" : "none" }}
                />
              )
            })}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
