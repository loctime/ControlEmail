"use client"

import { ArrowLeft, ArrowRight, CalendarIcon, RefreshCw } from "lucide-react"
import type { Matcher } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { normalizeBusinessDate } from "@/lib/domain/date"
import { cn } from "@/lib/utils"
import { es } from "date-fns/locale"

export interface DateControlsProps {
  selectedDate: string | undefined
  selectedDateLabel: string
  selectedDateObj: Date | undefined
  disabledDays: Matcher | undefined
  canGoPrev: boolean
  canGoNext: boolean
  loadingLastDate: boolean
  loading: boolean
  lastDateData: { date?: string; minDate?: string; maxDate?: string } | undefined
  onPrev: () => void
  onNext: () => void
  onRefetch: () => void
  onSetDate: (date: string) => void
}

export function DateControls({
  selectedDate,
  selectedDateLabel,
  selectedDateObj,
  disabledDays,
  canGoPrev,
  canGoNext,
  loadingLastDate,
  loading,
  lastDateData,
  onPrev,
  onNext,
  onRefetch,
  onSetDate,
}: DateControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04]">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-r-none text-white/60 hover:text-white disabled:opacity-30"
          disabled={!canGoPrev}
          onClick={onPrev}
        >
          <ArrowLeft size={15} />
        </Button>
        <div className="h-5 w-px bg-white/10" />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-l-none text-white/60 hover:text-white disabled:opacity-30"
          disabled={!canGoNext}
          onClick={onNext}
        >
          <ArrowRight size={15} />
        </Button>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={loadingLastDate}
            className="h-9 gap-2 border-white/10 bg-white/[0.04] text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
          >
            <CalendarIcon size={14} className="text-white/40" />
            {selectedDateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto border-white/10 bg-zinc-900 p-0">
          <Calendar
            mode="single"
            locale={es}
            selected={selectedDateObj}
            onSelect={(d) => {
              if (d) onSetDate(normalizeBusinessDate(d))
            }}
            disabled={disabledDays}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        disabled={loadingLastDate || !lastDateData?.date}
        className="h-9 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
        onClick={() => lastDateData?.date && onSetDate(normalizeBusinessDate(lastDateData.date))}
      >
        Último con datos
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefetch}
        disabled={loading || !selectedDate}
        className="h-9 gap-1.5 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
      >
        <RefreshCw size={13} className={cn(loading && "animate-spin")} />
        Actualizar
      </Button>
    </div>
  )
}
