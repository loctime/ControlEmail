/**
 * Utilidades compartidas para componentes del dashboard.
 */

export function getRiskColor(risk: number): string {
  if (risk >= 15) return "text-red-400 bg-red-400/10 border-red-400/20"
  if (risk >= 8) return "text-orange-400 bg-orange-400/10 border-orange-400/20"
  if (risk >= 4) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
  return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
}

export function getRiskBarWidth(risk: number, max: number): string {
  if (max === 0) return "0%"
  return `${Math.min(100, (risk / max) * 100)}%`
}
