import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecentEvent } from "@/services/dashboard-api"

interface RecentEventsProps {
  events: RecentEvent[]
  loading?: boolean
}

function eventLabel(value: string): string {
  return value.replace(/_/g, " ")
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return "--:--"
  return format(date, "HH:mm")
}

export function RecentEvents({ events, loading = false }: RecentEventsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, idx) => (
              <div
                key={`${event.plate}-${event.timestamp}-${idx}`}
                className="grid grid-cols-4 gap-2 rounded-md border p-2 text-sm"
              >
                <span className="font-medium">{formatTime(event.timestamp)}</span>
                <span className="font-semibold">{event.plate}</span>
                <span className="text-muted-foreground">{eventLabel(event.eventType)}</span>
                <span className="text-right font-medium">riesgo {event.riskScore}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
