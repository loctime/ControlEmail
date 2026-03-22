// This route is unused. The frontend calls /api/vehicles/events-history instead.
// Kept as a redirect for safety in case any old client hits this path.
export async function GET() {
  return new Response(
    JSON.stringify({ error: "use /api/vehicles/events-history" }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
}
