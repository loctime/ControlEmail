import { NextResponse } from "next/server"
import { getEmailConfig, updateEmailConfig, upsertEmailAccess } from "@/lib/firestore-read"
import { hasValidAdminSession, unauthorizedResponse } from "@/lib/admin-session"

// Emails gestionados manualmente en Firestore — nunca tocar via esta sincronización.
const PROTECTED_EMAILS = new Set(["diegobertosi@gmail.com"])

function checkAdmin(request: Request) {
  if (!hasValidAdminSession(request)) return null
  return true
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) return unauthorizedResponse()
  try {
    const config = await getEmailConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("[api/admin/email-config] GET error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  if (!checkAdmin(request)) return unauthorizedResponse()
  try {
    const body = await request.json()
    const toStrArr = (v: unknown): string[] => {
      if (!Array.isArray(v)) return []
      return (v as unknown[])
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean)
    }
    const generalRecipients = toStrArr(body?.generalRecipients)
    const ccRecipients = toStrArr(body?.ccRecipients)
    const reportRecipients = toStrArr(body?.reportRecipients)

    // Leer config anterior para detectar emails removidos
    const oldConfig = await getEmailConfig()
    const previousActive = new Set(
      [...oldConfig.generalRecipients, ...oldConfig.ccRecipients]
        .map((e) => e.trim().toLowerCase())
        .filter((e) => !PROTECTED_EMAILS.has(e)),
    )

    // Guardar nueva configuración
    await updateEmailConfig({ generalRecipients, ccRecipients, reportRecipients })

    // Calcular nuevo conjunto activo (general + cc, sin protegidos)
    const newActive = new Set(
      [...generalRecipients, ...ccRecipients]
        .map((e) => e.trim().toLowerCase())
        .filter((e) => !PROTECTED_EMAILS.has(e)),
    )

    // Emails que ya no están en ninguna lista → deshabilitar acceso
    const toDisable = Array.from(previousActive).filter((e) => !newActive.has(e))

    // Sincronizar en paralelo (errores individuales se loguean pero no cortan el guardado)
    await Promise.all([
      ...Array.from(newActive).map((email) =>
        upsertEmailAccess(email, true).catch((err) =>
          console.error("[email-config] sync enable failed:", email, err),
        ),
      ),
      ...toDisable.map((email) =>
        upsertEmailAccess(email, false).catch((err) =>
          console.error("[email-config] sync disable failed:", email, err),
        ),
      ),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/admin/email-config] PATCH error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
