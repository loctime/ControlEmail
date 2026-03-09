"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useQuery } from "@tanstack/react-query"
import type { Matcher } from "react-day-picker"
import { dashboardApi } from "@/services/api"
import { queryKeys } from "@/lib/query/queryKeys"
import { getYesterdayKey, normalizeBusinessDate } from "@/lib/domain/date"

const STORAGE_KEY = "dashboard:selectedDate"
const STALE_TIME = 5 * 60_000

function readStoredDate(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function writeStoredDate(date: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, date)
  } catch {
    // quota / private mode
  }
}

type DateState =
  | { status: "pending" }
  | { status: "ready"; date: string }

type DateAction =
  | { type: "RESTORE"; date: string }
  | { type: "SET"; date: string }
  | { type: "INIT_FROM_API"; date: string }
  | { type: "INIT_FALLBACK" }

function dateReducer(state: DateState, action: DateAction): DateState {
  switch (action.type) {
    case "RESTORE":
    case "SET":
      return { status: "ready", date: action.date }
    case "INIT_FROM_API":
      if (state.status === "ready") return state
      return { status: "ready", date: action.date }
    case "INIT_FALLBACK":
      if (state.status === "ready") return state
      return { status: "ready", date: getYesterdayKey() }
    default:
      return state
  }
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return format(d, "dd MMM yyyy", { locale: es })
}

export interface UseDashboardDateResult {
  selectedDate: string | undefined
  selectedDateLabel: string
  selectedDateObj: Date | undefined
  disabledDays: Matcher | undefined
  canGoPrev: boolean
  canGoNext: boolean
  loadingLastDate: boolean
  lastDateData: { date?: string; minDate?: string; maxDate?: string } | undefined
  setDate: (date: string) => void
  handlePrev: () => void
  handleNext: () => void
}

export function useDashboardDate(): UseDashboardDateResult {
  const [dateState, dispatch] = useReducer(dateReducer, { status: "pending" })
  const hasRestoredRef = useRef(false)

  const selectedDate = dateState.status === "ready" ? dateState.date : undefined

  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = readStoredDate()
    if (stored) dispatch({ type: "RESTORE", date: stored })
  }, [])

  const {
    data: lastDateData,
    isLoading: loadingLastDate,
    error: lastDateError,
  } = useQuery({
    queryKey: queryKeys.dashboard.lastDate(),
    queryFn: dashboardApi.myLastDateWithData,
    staleTime: STALE_TIME,
  })

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateData?.date) {
      dispatch({ type: "INIT_FROM_API", date: normalizeBusinessDate(lastDateData.date) })
    }
  }, [lastDateData?.date])

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateError) dispatch({ type: "INIT_FALLBACK" })
  }, [lastDateError])

  useEffect(() => {
    if (selectedDate) writeStoredDate(selectedDate)
  }, [selectedDate])

  const setDate = useCallback((date: string) => {
    dispatch({ type: "SET", date })
  }, [])

  const maxAvailableDate = useMemo(
    () =>
      lastDateData?.maxDate ?? lastDateData?.date
        ? normalizeBusinessDate((lastDateData?.maxDate ?? lastDateData?.date)!)
        : undefined,
    [lastDateData?.maxDate, lastDateData?.date]
  )

  const minAvailableDate = useMemo(
    () => (lastDateData?.minDate ? normalizeBusinessDate(lastDateData.minDate) : undefined),
    [lastDateData?.minDate]
  )

  const selectedDateLabel = useMemo(
    () => (selectedDate ? formatDateLabel(selectedDate) : "Seleccionar fecha"),
    [selectedDate]
  )

  const selectedDateObj = useMemo(
    () => (selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined),
    [selectedDate]
  )

  const maxDateObj = useMemo(
    () => (maxAvailableDate ? new Date(`${maxAvailableDate}T00:00:00`) : undefined),
    [maxAvailableDate]
  )

  const disabledDays: Matcher | undefined = maxDateObj ? { after: maxDateObj } : undefined

  const canGoPrev =
    !!selectedDate &&
    !!minAvailableDate &&
    normalizeBusinessDate(selectedDate) > minAvailableDate
  const canGoNext =
    !!selectedDate &&
    !!maxAvailableDate &&
    normalizeBusinessDate(selectedDate) < maxAvailableDate

  const handlePrev = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    d.setDate(d.getDate() - 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, setDate])

  const handleNext = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    d.setDate(d.getDate() + 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, setDate])

  return {
    selectedDate,
    selectedDateLabel,
    selectedDateObj,
    disabledDays,
    canGoPrev,
    canGoNext,
    loadingLastDate,
    lastDateData,
    setDate,
    handlePrev,
    handleNext,
  }
}
