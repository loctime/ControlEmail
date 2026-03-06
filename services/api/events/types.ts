export interface VehicleEventLegacyDTO {
  id: string
  fecha: string
  hora: string
  patente: string
  vehiculo: string | null
  conductor: string | null
  tipo: string
  velocidad?: number
  limiteVelocidad?: number
  ubicacion: string | null
  estado: "pendiente" | "en_revision" | "resuelto" | "critico"
  descripcion: string
  notas: string[]
}
