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

