import type { Severity } from "@/services/dto"

export function getSeverityLabel(severity: Severity): string {
  switch (severity) {
    case "LOW":
      return "Baja"
    case "MEDIUM":
      return "Media"
    case "HIGH":
      return "Alta"
    case "CRITICAL":
      return "Crítica"
    default:
      return severity
  }
}

export function getSeverityBadgeVariant(severity: Severity): "default" | "secondary" | "destructive" {
  switch (severity) {
    case "LOW":
      return "secondary"
    case "MEDIUM":
      return "default"
    case "HIGH":
    case "CRITICAL":
      return "destructive"
    default:
      return "default"
  }
}

/**
 * Única función de negocio para mapear un riskScore agregado a una severidad de dominio.
 * Cualquier cambio en la fórmula de clasificación debe hacerse aquí.
 */
export function getSeverityFromRiskScore(score: number): Severity {
  if (score >= 80) return "CRITICAL"
  if (score >= 50) return "HIGH"
  if (score >= 20) return "MEDIUM"
  return "LOW"
}


