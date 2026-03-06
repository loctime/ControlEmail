import { getYesterdayKey } from "@/lib/domain/date"

export function getLastClosedDateKey(): string {
  return getYesterdayKey()
}

export function getLastClosedDate(): Date {
  const key = getLastClosedDateKey()
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
