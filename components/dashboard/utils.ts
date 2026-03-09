/**
 * Utilidades compartidas para componentes del dashboard.
 */

export function getRiskColor(risk: number): string {
  if (risk >= 15) return "text-red-500 bg-red-500/10 border-red-500/20"
  if (risk >= 8) return "text-orange-500 bg-orange-500/10 border-orange-500/20"
  if (risk >= 4) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
  return "text-green-500 bg-green-500/10 border-green-500/20"
}

export function getRiskBarWidth(risk: number, max: number): string {
  if (max === 0) return "0%"
  return `${Math.min(100, (risk / max) * 100)}%`
}
