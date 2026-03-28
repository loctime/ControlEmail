import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import {
  getDailyMetrics,
  getDailyConsistency,
  getVehicleByPlate,
  type DailyAlertsResponse,
} from "@/lib/firestore-read"
import {
  normalizeBusinessDate,
  getDateKeysLast7Days,
  getDateKeysInMonth,
  getDateKeysInYear,
  getDateKeysInclusiveRange,
} from "@/lib/domain/date"
import { aggregateEnriched } from "@/app/api/dashboard/aggregate-enriched"
import {
  buildVehicleDetailFromVehicle,
  buildAdminTotalsFromVehicles,
} from "@/app/api/dashboard/enrichment"
import { buildTopDriversKeysByOperation } from "@/app/api/dashboard/topDriversKeys"
import type { DashboardAggregatedPayload, DashboardVehicleDetailDTO } from "@/services/api/dashboard/types"

type Period = "day" | "week" | "month" | "year"

const YEAR_BATCH_SIZE = 31

async function enrichVehicleDetails(
  details: DashboardVehicleDetailDTO[],
): Promise<DashboardVehicleDetailDTO[]> {
  if (details.length === 0) return details
  const enriched = await Promise.all(
    details.map(async (v) => {
      try {
        const doc = await getVehicleByPlate(v.plate)
        if (!doc) return v
        const docResp = Array.isArray(doc.responsables)
          ? doc.responsables.map((x) => String(x).trim()).filter(Boolean)
          : []
        const base = {
          ...v,
          operacion: doc.operacion ?? v.operacion,
          responsable: docResp[0] ?? v.responsable,
        }
        if (docResp.length > 0) {
          return {
            ...base,
            responsables: docResp,
            responsablesNormalized: docResp.map((e) => e.toLowerCase()),
          }
        }
        return base
      } catch {
        return v
      }
    }),
  )
  return enriched
}

async function getRawPayload(
  period: Period,
  dateParam: string,
  auth: Awaited<ReturnType<typeof getAuthUserWithPlates>>,
): Promise<{ payload: DashboardAggregatedPayload; error?: never } | { payload?: never; error: string }> {
  if (!auth) return { error: "unauthorized" }

  if (period === "day") {
    const dateKey = normalizeBusinessDate(dateParam)
    const [metrics, consistency] = await Promise.all([
      getDailyMetrics(dateKey),
      getDailyConsistency(dateKey),
    ])
    const vehicles = metrics.vehicles.filter((v) => auth.allowedPlates.has(v.plate))
    const riskScores = vehicles.map((v) => v.riskScore ?? 0)
    const payload: DashboardAggregatedPayload = {
      stats: {
        totalAlerts: vehicles.length,
        alertsPending: vehicles.filter((v) => !v.alertSent).length,
        alertsSent: vehicles.filter((v) => v.alertSent).length,
        maxRisk: riskScores.length > 0 ? Math.max(...riskScores) : 0,
        avgRisk:
          riskScores.length > 0
            ? Math.round((riskScores.reduce((a, b) => a + b, 0) / riskScores.length) * 100) / 100
            : 0,
      },
      vehicles: vehicles
        .map((v) => ({ plate: v.plate, alerts: v.summary.totalEvents, maxRisk: v.riskScore ?? 0 }))
        .sort((a, b) => b.maxRisk - a.maxRisk || a.plate.localeCompare(b.plate)),
      pendingAlerts: vehicles
        .filter((v) => !v.alertSent)
        .map((v) => ({
          alertId: `${dateKey}_${v.plate}`,
          plate: v.plate,
          dateKey,
          riskScore: v.riskScore ?? 0,
          alertSent: false,
          lastEventAt: v.lastEventAt,
        })),
      consistency,
      vehicleDetails: vehicles.map(buildVehicleDetailFromVehicle),
      adminTotals: buildAdminTotalsFromVehicles(vehicles),
    }
    return { payload }
  }

  if (period === "week") {
    const dateKey = normalizeBusinessDate(dateParam)
    const dateKeys = getDateKeysLast7Days(dateKey)
    if (dateKeys.length === 0) return { error: "invalid_date" }
    const dailyResults = await Promise.all(
      dateKeys.map(async (dk) => ({ dateKey: dk, metrics: await getDailyMetrics(dk) })),
    )
    return { payload: aggregateEnriched(dailyResults, auth, { includeDailyBreakdown: true }) }
  }

  if (period === "month") {
    const month = dateParam.slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) return { error: "invalid_month" }
    const dateKeys = getDateKeysInMonth(month)
    const dailyResults = await Promise.all(
      dateKeys.map(async (dk) => ({ dateKey: dk, metrics: await getDailyMetrics(dk) })),
    )
    return {
      payload: aggregateEnriched(dailyResults, auth, { includeDailyBreakdown: true }),
    }
  }

  if (period === "year") {
    const year = dateParam.slice(0, 4)
    if (!/^\d{4}$/.test(year)) return { error: "invalid_year" }
    const dateKeys = getDateKeysInYear(year)
    const dailyResults: { dateKey: string; metrics: DailyAlertsResponse }[] = []
    for (let i = 0; i < dateKeys.length; i += YEAR_BATCH_SIZE) {
      const batch = dateKeys.slice(i, i + YEAR_BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (dk) => ({ dateKey: dk, metrics: await getDailyMetrics(dk) })),
      )
      dailyResults.push(...batchResults)
    }
    return {
      payload: aggregateEnriched(dailyResults, auth, { includeDailyBreakdown: true }),
    }
  }

  return { error: "invalid_period" }
}

async function getRawPayloadFromDateRange(
  startDate: string,
  endDate: string,
  auth: Awaited<ReturnType<typeof getAuthUserWithPlates>>,
): Promise<{ payload: DashboardAggregatedPayload; error?: never } | { payload?: never; error: string }> {
  if (!auth) return { error: "unauthorized" }
  const start = normalizeBusinessDate(startDate)
  const end = normalizeBusinessDate(endDate)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return { error: "invalid_date_range" }
  }
  if (start > end) return { error: "start_after_end" }
  const dateKeys = getDateKeysInclusiveRange(start, end)
  if (dateKeys.length === 0) return { error: "invalid_date_range" }
  const dailyResults: { dateKey: string; metrics: DailyAlertsResponse }[] = []
  for (let i = 0; i < dateKeys.length; i += YEAR_BATCH_SIZE) {
    const batch = dateKeys.slice(i, i + YEAR_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (dk) => ({ dateKey: dk, metrics: await getDailyMetrics(dk) })),
    )
    dailyResults.push(...batchResults)
  }
  return { payload: aggregateEnriched(dailyResults, auth, { includeDailyBreakdown: true }) }
}

/**
 * GET /api/dashboard/enriched?period=day|week|month|year&date=YYYY-MM-DD
 * GET /api/dashboard/enriched?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Unified dashboard endpoint that returns operacion and responsable always
 * up-to-date by reading from apps/emails/vehicles after aggregation.
 */
export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if ((startDate != null && startDate !== "") !== (endDate != null && endDate !== "")) {
      return NextResponse.json(
        { error: "startDate_and_endDate_required_together" },
        { status: 400 },
      )
    }

    if (startDate && endDate) {
      const result = await getRawPayloadFromDateRange(startDate, endDate, auth)
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      const payload = result.payload
      if (payload.vehicleDetails && payload.vehicleDetails.length > 0) {
        payload.vehicleDetails = await enrichVehicleDetails(payload.vehicleDetails)
      }
      payload.topDriversKeysByOperation = buildTopDriversKeysByOperation(payload.vehicleDetails ?? [])
      return NextResponse.json(payload)
    }

    const period = searchParams.get("period") as Period | null
    const date = searchParams.get("date")

    if (!period || !["day", "week", "month", "year"].includes(period)) {
      return NextResponse.json({ error: "period_required: day|week|month|year" }, { status: 400 })
    }
    if (!date) {
      return NextResponse.json({ error: "date_required" }, { status: 400 })
    }

    const result = await getRawPayload(period, date, auth)
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const payload = result.payload
    if (payload.vehicleDetails && payload.vehicleDetails.length > 0) {
      payload.vehicleDetails = await enrichVehicleDetails(payload.vehicleDetails)
    }
    payload.topDriversKeysByOperation = buildTopDriversKeysByOperation(payload.vehicleDetails ?? [])

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[api/dashboard/enriched] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
