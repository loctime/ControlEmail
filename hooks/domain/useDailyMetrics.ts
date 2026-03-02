"use client"

import { useDailyMetrics as useFeatureDailyMetrics } from "@/features/email-dashboard/hooks/useDailyMetrics"

// Wrapper de dominio para mantener un punto de entrada estable.

export function useDailyMetrics(date: string) {
  return useFeatureDailyMetrics(date)
}

