"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DashboardRangePreset } from "@/services/dashboard-api"
import { cn } from "@/lib/utils"

interface DateRangeSelectorProps {
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
  { key: "custom", label: "Rango custom" },
]

function dateToLabel(value: string): string {
  if (!value) return "Seleccionar fecha"
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return "Seleccionar fecha"
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

export function DateRangeSelector({
  range,
  startDate,
  endDate,
  onChangePreset,
  onChangeStartDate,
  onChangeEndDate,
}: DateRangeSelectorProps) {
  return (
    <section
      aria-label="Selector de rango temporal"
      className="rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm"
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            size="sm"
            aria-label={`Seleccionar rango ${preset.label}`}
            variant={range === preset.key ? "default" : "outline"}
            className={cn(
              "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary",
              range === preset.key && "shadow-md",
            )}
            onClick={() => onChangePreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {range === "custom" && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start"
                aria-label="Seleccionar fecha de inicio"
              >
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
              <Button
                variant="outline"
                className="justify-start"
                aria-label="Seleccionar fecha de fin"
              >
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
      )}
    </section>
  )
}

