"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DashboardRangePreset } from "@/services/dashboard-api"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  range: DashboardRangePreset
  startDate: string
  endDate: string
  onChangePreset: (preset: DashboardRangePreset) => void
  onChangeStartDate: (date: string) => void
  onChangeEndDate: (date: string) => void
}

const PRESETS: Array<{ key: DashboardRangePreset; label: string }> = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "7d", label: "Ultimos 7 dias" },
  { key: "30d", label: "Ultimos 30 dias" },
  { key: "custom", label: "Manual" },
]

function dateToLabel(value: string): string {
  if (!value) return "Seleccionar"
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return "Seleccionar"
  return format(parsed, "dd MMM yyyy", { locale: es })
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function toDateKey(date: Date | undefined): string | null {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DashboardHeader({
  range,
  startDate,
  endDate,
  onChangePreset,
  onChangeStartDate,
  onChangeEndDate,
}: DashboardHeaderProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">Monitoreo de flota</CardTitle>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              size="sm"
              variant={range === preset.key ? "default" : "outline"}
              onClick={() => onChangePreset(preset.key)}
              className={cn("min-w-[120px]", range === preset.key && "shadow-sm")}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      {range === "custom" && (
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Desde: {dateToLabel(startDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseDate(startDate)}
                  onSelect={(date) => {
                    const dateKey = toDateKey(date)
                    if (dateKey) onChangeStartDate(dateKey)
                  }}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Hasta: {dateToLabel(endDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseDate(endDate)}
                  onSelect={(date) => {
                    const dateKey = toDateKey(date)
                    if (dateKey) onChangeEndDate(dateKey)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
