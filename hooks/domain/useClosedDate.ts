"use client"

import { getYesterdayKey } from "@/lib/domain/date"
import { getLastClosedDate, getClosedDateLabel, isClosedDate } from "@/lib/domain/closed-date"

export function useClosedDate() {
  // Sync: usa getYesterdayKey() como referencia de fecha para UI.
  // El servidor usa getLastClosedDateKey() (async) para buscar datos reales.
  const lastClosedDateKey = getYesterdayKey()
  const lastClosedDate = getLastClosedDate()
  const closedDateLabel = getClosedDateLabel()

  return {
    lastClosedDate,
    lastClosedDateKey,
    closedDateLabel,
    isClosedDate,
  }
}
