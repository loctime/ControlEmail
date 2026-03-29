/**
 * Lista eventos en dailyAlerts donde `driverName` parece ubicación, código de ruta,
 * coordenadas, placeholder u otros valores que no son un nombre de persona.
 *
 * Uso (desde la raíz del repo):
 *   npx tsx scripts/audit-suspicious-driver-names.ts --date=2026-03-16
 *
 * Credenciales: clave de cuenta de servicio en JSON (gitignored). Se busca en:
 *   - SCRIPTS/serviceAccountKey-controlfile.json
 *   - scripts/serviceAccountKey-controlfile.json
 */

import * as fs from "fs"
import * as path from "path"
import * as admin from "firebase-admin"

function resolveServiceAccountPath(): string {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, "SCRIPTS", "serviceAccountKey-controlfile.json"),
    path.join(cwd, "scripts", "serviceAccountKey-controlfile.json"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error(
    "No se encontró serviceAccountKey-controlfile.json. Colócalo en SCRIPTS/ o scripts/ (raíz del repo)."
  )
}

function getFirestoreForScript(): FirebaseFirestore.Firestore {
  if (admin.apps.length > 0) {
    return admin.firestore(admin.app())
  }
  const keyPath = resolveServiceAccountPath()
  const raw = JSON.parse(fs.readFileSync(keyPath, "utf8")) as Record<string, unknown>
  admin.initializeApp({
    credential: admin.credential.cert(raw as admin.ServiceAccount),
  })
  return admin.firestore()
}

const ACCENT_STRIP = /\p{M}/gu

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(ACCENT_STRIP, "")
}

function norm(s: string): string {
  return stripAccents(s).toUpperCase()
}

/** Palabras que en tus correos suelen ser sitios / operación, no personas. Amplía esta lista según veas falsos negativos. */
const LOCATION_KEYWORDS = [
  "RP5",
  "RP6",
  "RP7",
  "CHIHUIDO",
  "CENTENARIO",
  "NEUQUEN",
  "NEUQUÉN",
  "HAMACA",
  "PATAGONIA",
  "CINCO SALTOS",
  "PLAZA",
  "BASE",
  "YACIMIENTO",
  "POZO",
]

const PLACEHOLDER_SUBSTRINGS = [
  "SIN CONDUCTOR",
  "SIN ASIGNAR",
  "DESCONOCIDO",
  "NO IDENTIFICADO",
  "S/D",
  "---",
]

type SuspicionReason =
  | { code: "ubicacion_clave"; match: string }
  | { code: "placeholder"; match: string }
  | { code: "patron_rp_numero" }
  | { code: "patron_km" }
  | { code: "posible_coordenadas" }
  | { code: "mucho_digitos"; ratio: string }
  | { code: "sin_letras" }
  | { code: "solo_mayusculas_muy_largo"; len: number }
  | { code: "separadores_datos" }

function analyzeDriverName(raw: unknown): { suspicious: boolean; reasons: SuspicionReason[] } {
  const reasons: SuspicionReason[] = []
  if (raw == null) return { suspicious: false, reasons: [] }

  const s = String(raw).trim()
  if (s.length === 0) return { suspicious: false, reasons: [] }

  const upper = norm(s)

  for (const kw of LOCATION_KEYWORDS) {
    const nk = norm(kw)
    if (nk.length > 0 && upper.includes(nk)) {
      reasons.push({ code: "ubicacion_clave", match: kw })
    }
  }

  for (const ph of PLACEHOLDER_SUBSTRINGS) {
    const np = norm(ph)
    if (np.length > 0 && upper.includes(np)) {
      reasons.push({ code: "placeholder", match: ph })
    }
  }

  if (/\bRP\s*\d+\b/i.test(s)) reasons.push({ code: "patron_rp_numero" })
  if (/\bKM\.?\s*\d+/i.test(s)) reasons.push({ code: "patron_km" })

  // Dos decimales separados por coma (lat,lng aproximado)
  if (/-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+/.test(s)) {
    reasons.push({ code: "posible_coordenadas" })
  }

  const letters = (s.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length
  const digits = (s.match(/\d/g) ?? []).length
  if (letters === 0 && digits > 0) reasons.push({ code: "sin_letras" })
  if (s.length >= 4 && digits / s.length > 0.35) {
    reasons.push({ code: "mucho_digitos", ratio: (digits / s.length).toFixed(2) })
  }

  // Nombres reales suelen tener mezcla; cadenas MUY largas todo en mayúsculas a menudo son descripciones
  if (s.length >= 48 && s === s.toUpperCase() && /[A-Z]/.test(s)) {
    reasons.push({ code: "solo_mayusculas_muy_largo", len: s.length })
  }

  if (/[|/\\]{2,}/.test(s) || /\s;\s/.test(s)) {
    reasons.push({ code: "separadores_datos" })
  }

  const unique = new Map<string, SuspicionReason>()
  for (const r of reasons) {
    unique.set(JSON.stringify(r), r)
  }
  const list = [...unique.values()]
  return { suspicious: list.length > 0, reasons: list }
}

function parseArgs(): { date: string } {
  const arg = process.argv.find((a) => a.startsWith("--date="))
  const date = arg?.slice("--date=".length)?.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("Uso: npx tsx scripts/audit-suspicious-driver-names.ts --date=YYYY-MM-DD")
    process.exit(1)
  }
  return { date }
}

type FirestoreEvent = Record<string, unknown>

async function main() {
  const { date } = parseArgs()
  const db = getFirestoreForScript()
  const vehiclesRef = db
    .collection("apps")
    .doc("emails")
    .collection("dailyAlerts")
    .doc(date)
    .collection("vehicles")

  const snapshot = await vehiclesRef.get()
  const findings: Array<{
    vehicleId: string
    eventIndex: number
    plate: unknown
    driverName: unknown
    location: unknown
    eventTimestamp: unknown
    reasons: SuspicionReason[]
  }> = []

  for (const vehicleDoc of snapshot.docs) {
    const data = vehicleDoc.data() as { events?: unknown }
    const events = Array.isArray(data.events) ? data.events : []
    events.forEach((ev, idx) => {
      const event = ev as FirestoreEvent
      const driverName = event.driverName ?? event.driver
      const { suspicious, reasons } = analyzeDriverName(driverName)
      if (!suspicious) return
      findings.push({
        vehicleId: vehicleDoc.id,
        eventIndex: idx,
        plate: event.plate ?? vehicleDoc.id,
        driverName,
        location: event.location ?? event.locationRaw,
        eventTimestamp: event.eventTimestamp,
        reasons,
      })
    })
  }

  console.log(JSON.stringify({ date, totalVehicles: snapshot.size, suspiciousEvents: findings.length, findings }, null, 2))

  if (findings.length > 0) {
    console.error("\n📋 Resumen sospechoso:")
    findings.forEach((f) => {
      console.error(
        `  ${f.vehicleId} evento #${f.eventIndex}: "${f.driverName}" (debería ser ubicación "${f.location}")`,
      )
      console.error(`    Razones: ${f.reasons.map((r) => r.code).join(", ")}`)
    })
  } else {
    console.log("✅ No se encontraron driverNames sospechosos.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
