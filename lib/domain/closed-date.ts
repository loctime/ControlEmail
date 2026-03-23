import { getYesterdayKey } from "@/lib/domain/date"

// ─── In-memory cache ─────────────────────────────────────────────────────────

let _lastDateCache: { value: string; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

/**
 * Devuelve el dateKey (YYYY-MM-DD) del último día que tiene datos reales
 * en Firestore (apps/emails/dailyAlerts/{date}/vehicles).
 *
 * - Cachea el resultado en memoria por 5 minutos para evitar queries repetidas.
 * - Escanea hasta 30 días hacia atrás, empezando por ayer.
 * - Fallback a getYesterdayKey() si no encuentra nada o hay un error.
 *
 * ⚠️  ASYNC — solo servidor. No llamar desde componentes cliente.
 *     El código cliente debe usar getYesterdayKey() directamente.
 */
export async function getLastClosedDateKey(): Promise<string> {
  const now = Date.now()

  if (_lastDateCache && now < _lastDateCache.expiresAt) {
    return _lastDateCache.value
  }

  try {
    const { findLastDateWithVehicleData } = await import("@/lib/firestore-read")
    const found = await findLastDateWithVehicleData(30)
    const value = found ?? getYesterdayKey()
    _lastDateCache = { value, expiresAt: now + CACHE_TTL_MS }
    console.log(`[closed-date] getLastClosedDateKey resolved to ${value} (cached for 5 min)`)
    return value
  } catch (err) {
    const fallback = getYesterdayKey()
    console.warn("[closed-date] getLastClosedDateKey error, using fallback:", err)
    _lastDateCache = { value: fallback, expiresAt: now + CACHE_TTL_MS }
    return fallback
  }
}

// ─── Sync helpers (client-safe) ───────────────────────────────────────────────
// Estas funciones siguen siendo síncronas para que el código cliente pueda
// usarlas sin await. Usan getYesterdayKey() como referencia temporal.

export function getLastClosedDate(): Date {
  const key = getYesterdayKey()
  return new Date(`${key}T00:00:00`)
}

export function isClosedDate(input: Date | string): boolean {
  const value = input instanceof Date ? input : new Date(`${input}T00:00:00`)
  if (Number.isNaN(value.getTime())) return false
  return value <= getLastClosedDate()
}

export function getClosedDateLabel(locale = "es-AR"): string {
  return `Ultimo cierre disponible: ${getLastClosedDate().toLocaleDateString(locale)}`
}
