import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { AUTH_COOKIE_NAME } from "@/lib/auth-user"

/**
 * Proxy a controlfile: el rewrite global /api/* → Render a veces hace que
 * GET /api/admin/operations llegue como actor "anonymous" (sin Bearer).
 * Aquí leemos auth_token (misma sesión que el resto del front) y enviamos Authorization al upstream.
 */
const UPSTREAM_BASE =
  (process.env.CONTROLFILE_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://controlfile.onrender.com").replace(
    /\/$/,
    "",
  )

function bearerFrom(request: NextRequest): string | null {
  const h = request.headers.get("authorization")
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim()
  const c = request.cookies.get(AUTH_COOKIE_NAME)?.value
  return c?.trim() || null
}

function targetUrl(pathSegments: string[] | undefined, search: string): string {
  const base = `${UPSTREAM_BASE}/api/admin/operations`
  if (!pathSegments?.length) return `${base}${search}`
  const sub = pathSegments.map((s) => encodeURIComponent(s)).join("/")
  return `${base}/${sub}${search}`
}

async function proxy(request: NextRequest, pathSegments: string[] | undefined) {
  const token = bearerFrom(request)
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const url = targetUrl(pathSegments, request.nextUrl.search)
  const headers = new Headers()
  headers.set("Authorization", `Bearer ${token}`)
  const accept = request.headers.get("accept")
  if (accept) headers.set("Accept", accept)
  else headers.set("Accept", "application/json")
  const ct = request.headers.get("content-type")
  if (ct) headers.set("Content-Type", ct)

  let body: ArrayBuffer | undefined
  if (request.method !== "GET" && request.method !== "HEAD") {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 0) body = buf
  }

  const upstream = await fetch(url, { method: request.method, headers, body })

  const outBody = await upstream.arrayBuffer()
  const res = new NextResponse(outBody, { status: upstream.status })
  const outCt = upstream.headers.get("content-type")
  if (outCt) res.headers.set("Content-Type", outCt)
  return res
}

type Ctx = { params: Promise<{ path?: string[] }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  return proxy(request, path)
}
