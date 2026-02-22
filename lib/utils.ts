import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza una patente eliminando todos los caracteres especiales
 * (guiones, puntos, espacios) y convirtiendo a uppercase.
 * 
 * Ejemplos:
 * - "af-999-ef" -> "AF999EF"
 * - "af 999 ef" -> "AF999EF"
 * - "AF.999.EF" -> "AF999EF"
 * 
 * Esta función asegura compatibilidad total entre patentes ingresadas
 * manualmente y patentes parseadas de emails.
 */
export function normalizePlate(plate: string): string {
  if (!plate) return ""
  return plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim()
}
