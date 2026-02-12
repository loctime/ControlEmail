export type EventType =
  | "exceso_velocidad"
  | "vehiculo_no_identificado"
  | "desvio_ruta"
  | "parada_no_autorizada"
  | "conduccion_nocturna"

export type EventStatus = "pendiente" | "en_revision" | "resuelto" | "critico"

export interface VehicleEvent {
  id: string
  fecha: string
  hora: string
  patente: string
  vehiculo: string
  conductor: string
  tipo: EventType
  velocidad?: number
  limiteVelocidad?: number
  ubicacion: string
  estado: EventStatus
  descripcion: string
  notas: string[]
}

export interface Vehicle {
  id: string
  patente: string
  modelo: string
  marca: string
  anio: number
  conductor: string
  estado: "activo" | "inactivo" | "mantenimiento"
  ultimaUbicacion: string
  eventosHoy: number
}

export interface Alert {
  id: string
  tipo: "critica" | "advertencia" | "info"
  mensaje: string
  fecha: string
  hora: string
  leida: boolean
  eventoId?: string
}

export const eventTypeLabels: Record<EventType, string> = {
  exceso_velocidad: "Exceso de velocidad",
  vehiculo_no_identificado: "No identificado",
  desvio_ruta: "Desvio de ruta",
  parada_no_autorizada: "Parada no autorizada",
  conduccion_nocturna: "Conduccion nocturna",
}

export const eventStatusLabels: Record<EventStatus, string> = {
  pendiente: "Pendiente",
  en_revision: "En revision",
  resuelto: "Resuelto",
  critico: "Critico",
}

export const mockEvents: VehicleEvent[] = [
  {
    id: "EVT-001",
    fecha: "2026-02-05",
    hora: "08:32",
    patente: "AB 123 CD",
    vehiculo: "Toyota Hilux 2023",
    conductor: "Carlos Rodriguez",
    tipo: "exceso_velocidad",
    velocidad: 142,
    limiteVelocidad: 110,
    ubicacion: "Ruta 9, km 245",
    estado: "critico",
    descripcion:
      "Vehiculo registrado a 142 km/h en zona de limite 110 km/h. Exceso de 32 km/h detectado por radar fijo.",
    notas: [
      "Se notifico al supervisor de zona - 08:45",
      "Conductor contactado por radio - 08:50",
    ],
  },
  {
    id: "EVT-002",
    fecha: "2026-02-05",
    hora: "09:15",
    patente: "EF 456 GH",
    vehiculo: "Ford Ranger 2024",
    conductor: "Maria Lopez",
    tipo: "desvio_ruta",
    ubicacion: "Av. Libertador 3200",
    estado: "en_revision",
    descripcion:
      "Vehiculo detecto desvio de la ruta asignada. Se alejo 2.3 km del trayecto planificado.",
    notas: ["Conductor reporto desvio por corte de calle - 09:20"],
  },
  {
    id: "EVT-003",
    fecha: "2026-02-05",
    hora: "10:02",
    patente: "NO IDENT.",
    vehiculo: "Desconocido",
    conductor: "Sin datos",
    tipo: "vehiculo_no_identificado",
    ubicacion: "Planta Central, Sector B",
    estado: "pendiente",
    descripcion:
      "Vehiculo sin identificacion ingreso al perimetro de la planta central. No se encuentra registrado en el sistema.",
    notas: [],
  },
  {
    id: "EVT-004",
    fecha: "2026-02-05",
    hora: "11:45",
    patente: "IJ 789 KL",
    vehiculo: "Volkswagen Amarok 2022",
    conductor: "Juan Martinez",
    tipo: "parada_no_autorizada",
    ubicacion: "Zona Industrial Norte",
    estado: "resuelto",
    descripcion:
      "Vehiculo detenido 45 minutos en zona no autorizada para paradas.",
    notas: [
      "Conductor informo desperfecto mecanico - 12:00",
      "Asistencia enviada - 12:15",
      "Vehiculo reanudo marcha - 12:45",
    ],
  },
  {
    id: "EVT-005",
    fecha: "2026-02-05",
    hora: "06:20",
    patente: "MN 012 OP",
    vehiculo: "Chevrolet S10 2023",
    conductor: "Roberto Diaz",
    tipo: "conduccion_nocturna",
    ubicacion: "Ruta 3, km 180",
    estado: "pendiente",
    descripcion:
      "Vehiculo en circulacion fuera del horario autorizado (22:00 - 06:00).",
    notas: [],
  },
  {
    id: "EVT-006",
    fecha: "2026-02-04",
    hora: "14:22",
    patente: "QR 345 ST",
    vehiculo: "Toyota Hilux 2024",
    conductor: "Ana Garcia",
    tipo: "exceso_velocidad",
    velocidad: 128,
    limiteVelocidad: 100,
    ubicacion: "Autopista Sur, km 56",
    estado: "resuelto",
    descripcion:
      "Exceso de velocidad registrado. 28 km/h por encima del limite permitido.",
    notas: [
      "Sancion aplicada - 15:00",
      "Conductor recibio capacitacion - 16:00",
    ],
  },
  {
    id: "EVT-007",
    fecha: "2026-02-04",
    hora: "16:55",
    patente: "UV 678 WX",
    vehiculo: "Ford EcoSport 2023",
    conductor: "Pedro Fernandez",
    tipo: "desvio_ruta",
    ubicacion: "Centro Logistico Este",
    estado: "en_revision",
    descripcion:
      "Desvio significativo de la ruta programada. Diferencia de 5.1 km.",
    notas: ["Investigacion en curso"],
  },
  {
    id: "EVT-008",
    fecha: "2026-02-04",
    hora: "07:10",
    patente: "YZ 901 AB",
    vehiculo: "Renault Duster 2022",
    conductor: "Laura Sanchez",
    tipo: "exceso_velocidad",
    velocidad: 95,
    limiteVelocidad: 60,
    ubicacion: "Zona Urbana, Calle San Martin",
    estado: "critico",
    descripcion:
      "Exceso grave en zona urbana. 35 km/h por encima del limite permitido.",
    notas: [
      "Caso escalado a gerencia - 07:30",
      "Conductor suspendido temporalmente - 08:00",
    ],
  },
]

export const mockVehicles: Vehicle[] = [
  {
    id: "VEH-001",
    patente: "AB 123 CD",
    modelo: "Hilux",
    marca: "Toyota",
    anio: 2023,
    conductor: "Carlos Rodriguez",
    estado: "activo",
    ultimaUbicacion: "Ruta 9, km 280",
    eventosHoy: 1,
  },
  {
    id: "VEH-002",
    patente: "EF 456 GH",
    modelo: "Ranger",
    marca: "Ford",
    anio: 2024,
    conductor: "Maria Lopez",
    estado: "activo",
    ultimaUbicacion: "Av. Libertador 3200",
    eventosHoy: 1,
  },
  {
    id: "VEH-003",
    patente: "IJ 789 KL",
    modelo: "Amarok",
    marca: "Volkswagen",
    anio: 2022,
    conductor: "Juan Martinez",
    estado: "mantenimiento",
    ultimaUbicacion: "Taller Central",
    eventosHoy: 1,
  },
  {
    id: "VEH-004",
    patente: "MN 012 OP",
    modelo: "S10",
    marca: "Chevrolet",
    anio: 2023,
    conductor: "Roberto Diaz",
    estado: "activo",
    ultimaUbicacion: "Ruta 3, km 200",
    eventosHoy: 1,
  },
  {
    id: "VEH-005",
    patente: "QR 345 ST",
    modelo: "Hilux",
    marca: "Toyota",
    anio: 2024,
    conductor: "Ana Garcia",
    estado: "activo",
    ultimaUbicacion: "Base Sur",
    eventosHoy: 0,
  },
  {
    id: "VEH-006",
    patente: "UV 678 WX",
    modelo: "EcoSport",
    marca: "Ford",
    anio: 2023,
    conductor: "Pedro Fernandez",
    estado: "inactivo",
    ultimaUbicacion: "Deposito Norte",
    eventosHoy: 0,
  },
]

export const mockAlerts: Alert[] = [
  {
    id: "ALR-001",
    tipo: "critica",
    mensaje:
      "Exceso grave de velocidad detectado: AB 123 CD a 142 km/h en zona de 110 km/h",
    fecha: "2026-02-05",
    hora: "08:32",
    leida: false,
    eventoId: "EVT-001",
  },
  {
    id: "ALR-002",
    tipo: "advertencia",
    mensaje:
      "Vehiculo no identificado ingreso al perimetro de Planta Central",
    fecha: "2026-02-05",
    hora: "10:02",
    leida: false,
    eventoId: "EVT-003",
  },
  {
    id: "ALR-003",
    tipo: "info",
    mensaje: "Desvio de ruta reportado por conductor Maria Lopez - justificado",
    fecha: "2026-02-05",
    hora: "09:20",
    leida: true,
    eventoId: "EVT-002",
  },
  {
    id: "ALR-004",
    tipo: "critica",
    mensaje:
      "Exceso grave en zona urbana: YZ 901 AB a 95 km/h en zona de 60 km/h",
    fecha: "2026-02-04",
    hora: "07:10",
    leida: true,
    eventoId: "EVT-008",
  },
  {
    id: "ALR-005",
    tipo: "advertencia",
    mensaje: "Conduccion fuera de horario autorizado: MN 012 OP",
    fecha: "2026-02-05",
    hora: "06:20",
    leida: false,
    eventoId: "EVT-005",
  },
  {
    id: "ALR-006",
    tipo: "info",
    mensaje:
      "Evento EVT-004 resuelto: parada no autorizada justificada por desperfecto",
    fecha: "2026-02-05",
    hora: "12:45",
    leida: true,
  },
]

export const chartData = [
  { hora: "06:00", excesos: 1, desvios: 0, otros: 1 },
  { hora: "07:00", excesos: 2, desvios: 0, otros: 0 },
  { hora: "08:00", excesos: 3, desvios: 1, otros: 0 },
  { hora: "09:00", excesos: 1, desvios: 2, otros: 1 },
  { hora: "10:00", excesos: 2, desvios: 1, otros: 2 },
  { hora: "11:00", excesos: 1, desvios: 0, otros: 1 },
  { hora: "12:00", excesos: 0, desvios: 1, otros: 0 },
  { hora: "13:00", excesos: 1, desvios: 0, otros: 0 },
  { hora: "14:00", excesos: 2, desvios: 1, otros: 1 },
  { hora: "15:00", excesos: 1, desvios: 0, otros: 0 },
  { hora: "16:00", excesos: 0, desvios: 2, otros: 1 },
  { hora: "17:00", excesos: 1, desvios: 0, otros: 0 },
]
