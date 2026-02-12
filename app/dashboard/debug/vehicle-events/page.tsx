import { DebugVehicleEventsClient } from "./vehicle-events.client"

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function Page({ searchParams }: PageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams?.token : ""

  const serverToken = process.env.DEBUG_ADMIN_TOKEN
  const tokenConfigured = Boolean(serverToken)
  const allowed =
    (tokenConfigured && token && token === serverToken) ||
    (!tokenConfigured && process.env.NODE_ENV !== "production")

  const tokenHint = tokenConfigured
    ? "Acceso restringido: agrega `?token=...` (token server-side)."
    : process.env.NODE_ENV === "production"
      ? "Bloqueado en producción. Configura `DEBUG_ADMIN_TOKEN`."
      : "Sin token configurado: habilitado solo en development."

  return (
    <DebugVehicleEventsClient
      allowed={allowed}
      tokenHint={tokenHint}
    />
  )
}

