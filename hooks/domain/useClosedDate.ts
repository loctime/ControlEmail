"use client"

import { getClosedDateLabel, getLastClosedDate, getLastClosedDateKey, isClosedDate } from "@/lib/domain/closed-date"

export function useClosedDate() {
  const lastClosedDate = getLastClosedDate()
  const lastClosedDateKey = getLastClosedDateKey()
  const closedDateLabel = getClosedDateLabel()

  return {
    lastClosedDate,
    lastClosedDateKey,
    closedDateLabel,
    isClosedDate,
  }
}
