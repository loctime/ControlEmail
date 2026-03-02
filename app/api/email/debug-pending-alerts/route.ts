import { NextResponse } from "next/server"

// Placeholder simple: en esta fase inicial devolvemos un array vacío tipado correctamente.
// Más adelante se puede conectar con lógica real en backend/Firestore.

export async function GET() {
  try {
    return NextResponse.json([])
  } catch (error) {
    console.error("[api/email/debug-pending-alerts] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}

