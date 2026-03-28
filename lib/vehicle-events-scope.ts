import { normalizePlate } from "@/lib/utils"

export function normalizedAllowedPlates(allowed: Set<string>): Set<string> {
  const out = new Set<string>()
  for (const p of allowed) {
    const n = normalizePlate(p)
    if (n) out.add(n)
  }
  return out
}

export function filterEventsByAllowedPlates(
  events: unknown[],
  normalizedAllowed: Set<string>,
): unknown[] {
  return events.filter((ev) => {
    if (!ev || typeof ev !== "object") return false
    const plate = (ev as { plate?: unknown }).plate
    if (typeof plate !== "string") return false
    const n = normalizePlate(plate)
    return n !== "" && normalizedAllowed.has(n)
  })
}
