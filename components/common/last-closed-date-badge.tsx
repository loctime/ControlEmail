"use client"

import { Badge } from "@/components/ui/badge"
import { useClosedDate } from "@/hooks/domain/useClosedDate"

export function LastClosedDateBadge() {
  const { closedDateLabel } = useClosedDate()
  return <Badge variant="outline">{closedDateLabel}</Badge>
}
