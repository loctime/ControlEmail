Frontend Data Contract

This guide describes how the frontend should consume the finalized RSV backend without guessing or recomputing backend semantics.

Primary entities
The backend now exposes three distinct data layers:

daily vehicle document
A per-vehicle, per-day summary built from canonical RSV events.

speedIncidents[]
Grouped speeding incidents derived from raw speed events.

fleet metrics
Daily/monthly/yearly aggregate KPIs for dashboards.

Use each layer for its intended purpose. Do not rebuild grouping, deduplication, or risk logic in the frontend.

1. Daily Vehicle Alert Data Model

A daily vehicle document is the source of truth for a vehicle on a given dateKey.

Example shape:

{
  "id": "AG338XC",
  "plate": "AG338XC",
  "dateKey": "2026-03-12",
  "brand": "Nissan",
  "model": "Frontier",
  "operationName": "Operacion Norte",
  "operacion": "Operacion Norte",
  "responsables": ["ops@example.com"],
  "responsablesNormalized": ["ops@example.com"],
  "alertSent": false,
  "sentAt": null,
  "createdAt": "FirestoreTimestamp",
  "lastEventAt": "FirestoreTimestamp",

  "summary": {
    "excesos": 3,
    "no_identificados": 1,
    "contactos": 0,
    "llave_sin_cargar": 0,
    "conductor_inactivo": 0
  },

  "incidentSummary": {
    "totalUniqueIncidents": 2,
    "uniqueOperationalIncidents": 1,
    "uniqueTechnicalIncidents": 0,
    "totalSpeedIncidents": 1,
    "bySubtype": {
      "CONTACT_NO_DRIVER": 0,
      "DRIVER_NOT_IDENTIFIED": 1,
      "UNKNOWN_KEY": 0,
      "INACTIVE_DRIVER": 0
    },
    "speedIncidents": []
  },

  "speedIncidents": [
    {
      "incidentKey": "AG338XC_2026-03-12_RP51_SPEED_EXCESS",
      "eventCategory": "SPEEDING",
      "eventSubtype": "SPEED_EXCESS",
      "groupedEventsCount": 2,
      "maxSpeed": 151,
      "avgSpeed": 150,
      "durationSeconds": 27,
      "severity": "critical",
      "location": "RP51",
      "plate": "AG338XC",
      "firstEventAt": "2026-03-12T05:19:33-03:00",
      "lastEventAt": "2026-03-12T05:20:00-03:00",
      "driverName": "RUIZ CESAR",
      "keyId": "LLAVE-12",
      "causeSubtype": "DRIVER_NOT_IDENTIFIED",
      "eventIds": ["evt-1", "evt-2"]
    }
  ],

  "events": [
    {
      "eventId": "evt-1",
      "plate": "AG338XC",
      "type": "exceso",
      "eventSource": "RSV",
      "eventCategory": "SPEEDING",
      "eventSubtype": "SPEED_EXCESS",
      "incidentKey": "AG338XC_2026-03-12_RP51_SPEED_EXCESS",
      "groupedEventsCount": 2,
      "groupedSpeedIncidentKey": "AG338XC_2026-03-12_RP51_SPEED_EXCESS",
      "speedSeverity": "critical",
      "speed": 151,
      "maxSpeed": 151,
      "hasSpeed": true,
      "eventTimestamp": "2026-03-12T05:19:33-03:00",
      "locationRaw": "RP51",
      "location": "RP51",
      "severity": "critico",
      "driverName": "RUIZ CESAR",
      "keyId": "LLAVE-12",
      "reason": null,
      "reasonRaw": null
    },
    {
      "eventId": "evt-9",
      "plate": "AG338XC",
      "type": "no_identificado",
      "eventSource": "RSV",
      "eventCategory": "DRIVER_IDENTIFICATION",
      "eventSubtype": "DRIVER_NOT_IDENTIFIED",
      "incidentKey": "AG338XC_2026-03-12_DRIVER_NOT_IDENTIFIED",
      "groupedEventsCount": null,
      "speed": null,
      "maxSpeed": null,
      "hasSpeed": false,
      "eventTimestamp": "2026-03-12T06:00:00-03:00",
      "locationRaw": "Base",
      "location": "Base",
      "severity": "critico",
      "driverName": null,
      "keyId": null,
      "reason": "No identificado",
      "reasonRaw": "No identificado"
    }
  ],

  "eventIdsSeen": ["evt-1", "evt-2", "evt-9"],
  "totalEventsCount": 3,
  "storedEventsCount": 2,
  "eventsTruncated": true,
  "truncatedEventsCount": 1,
  "speedingDrivers": ["RUIZ CESAR"],
  "riskScore": 13
}
Field descriptions
events[]
Stored recent event rows for the vehicle/day.
Important: this array may be truncated.

speedIncidents[]
Grouped speeding incidents. This is the canonical grouped representation for repeated speed events.

totalEventsCount
Total logical event count for the vehicle/day after backend processing.
Frontend should prefer this for counts.

storedEventsCount
How many events are actually present in events[].

eventsTruncated
Whether the backend trimmed old events from events[].

truncatedEventsCount
How many events were omitted from events[].

riskScore
Final backend-computed vehicle risk score.
Do not recompute in the frontend.

eventIdsSeen
Backend deduplication memory.
Do not display it. Do not use it for UI counts.

summary
Per-type totals for the vehicle/day. Safe for badges and breakdown chips.

incidentSummary
Backend incident aggregates. Useful for summary UI, but not required to render raw event tables.

speedingDrivers
Unique driver names from grouped speed incidents.

alertSent, sentAt
Delivery state, unchanged semantically.

createdAt, lastEventAt
Document lifecycle timestamps.
These may be Firestore timestamps depending on the endpoint layer.

Note: there is no per-vehicle top-level maxSpeedRecorded field in the daily vehicle document. Maximum speed for a vehicle should come from speedIncidents[].maxSpeed or from the fleet-level metrics endpoint.

2. Rendering Rules

Raw event table
Render events[] as the event source, but hide only the speed events that belong to a grouped speedIncident.

Rule set:

Single speed event:
render as a normal event row.

Speed event included inside a speedIncident:
hide the raw event row.

speedIncident with 2+ grouped events:
render separately as an incident card or incident row.

Duplicate-avoidance rule
Build a set of grouped speed event IDs:

const groupedSpeedEventIds = new Set(
  speedIncidents.flatMap(incident => incident.eventIds ?? [])
)
Then render:

const visibleEventRows = events.filter(e => !groupedSpeedEventIds.has(e.eventId))
This avoids double display.

Do not hide non-speed events.
Do not hide a lone speed event.
Do not group client-side.

3. Event Counts

Vehicle-level totals
Use:

totalEventsCount as the vehicle total
not events.length
Reason:
events[] may be truncated and may exclude grouped speed rows from visible rendering.

Display label
If eventsTruncated === true, show:

240 eventos (mostrando 250 recientes)

Use:

total = totalEventsCount
visible storage context = storedEventsCount
Recommended logic:

const label = eventsTruncated
  ? `${totalEventsCount} eventos (mostrando ${storedEventsCount} recientes)`
  : `${totalEventsCount} eventos`
Dashboard totals
For fleet totals, use backend aggregate endpoints.

Use:

/api/email/daily-metrics?date=YYYY-MM-DD for type totals
/api/dashboard/day|month|year for risk and alert KPIs
Do not sum events[].length from loaded vehicles to build dashboard totals.

Table counts
For:

vehicle table badge counts
per-vehicle header counts
detail page totals
Prefer:

totalEventsCount
summary
speedIncidents.length
Never assume events.length is the full day.

4. Risk Metrics

Per vehicle
riskScore
Backend-provided final score for that vehicle/day.
Use it for:

heatmap color
sorting
badges
severity buckets
Do not recompute from event counts in the frontend.

Fleet/dashboard metrics
From /api/dashboard/day, /api/dashboard/month, /api/dashboard/year:

{
  "ok": true,
  "dateKey": "2026-03-12",
  "metrics": {
    "totalAlerts": 18,
    "alertsSent": 10,
    "alertsPending": 8,
    "maxRisk": 19,
    "avgRisk": 7.6,
    "vehiclesWithAlerts": 18,
    "updatedAt": "2026-03-13T01:20:00.000Z"
  }
}
Interpretation:

riskScore
Per-vehicle score from the daily vehicle doc.

riskAverage
Use backend avgRisk.

riskMax
Use backend maxRisk.

vehiclesWithHighRisk
Not provided by backend as a finalized field.
If the frontend needs it, derive it purely as a presentation bucket from riskScore using an explicit UI threshold.
Do not treat it as a backend metric.

5. Speed Incident Rendering

speedIncidents[] is the backend-approved grouped speeding model.

Important fields:

firstEventAt
lastEventAt
maxSpeed
avgSpeed
groupedEventsCount
durationSeconds
severity
driverName
keyId
location
eventIds[]
Recommended UI behavior:

Show each speedIncident as a card or expandable row.
Primary fields:
max speed
start time
end time
duration
grouped event count
driver
location
severity
Use eventIds[] only for dedupe/linkage, not as a user-facing field.
Sort incidents by lastEventAt descending when showing newest first.
Keep grouped speed incidents visually distinct from normal events.
Good labels:

“Exceso de velocidad”
“2 eventos agrupados”
“Velocidad máxima: 151 km/h”
6. Timestamp Handling

Canonical event timestamps
Event timestamps are stored as ISO strings with offset:

2026-03-12T05:19:33-03:00
This timezone is Argentina local time (-03:00).

Applies to:

eventTimestamp
firstEventAt
lastEventAt
Frontend formatting rule
Format these timestamps in America/Argentina/Buenos_Aires.

Do not rely on the browser’s local timezone if the user may be elsewhere.

Recommended:

parse as ISO
display in Argentina timezone consistently
Example display:

12/03/2026 05:19
Metadata timestamps
Fields like createdAt, sentAt, lastEventAt at document level may come through API normalization or Firestore serialization depending on endpoint.
Frontend code should defensively handle:

ISO string
Firestore timestamp converted by backend
null
But for event rendering, trust the canonical event ISO fields above.

7. Performance Recommendations

Large event lists
Virtualize long vehicle/event tables.
Do not eagerly render every vehicle’s full event list on first paint.
Expand details on demand.
Truncated daily events
Treat truncation as expected backend behavior.
Do not attempt client-side reconstruction of missing historical rows.
Use eventsTruncated and storedEventsCount to communicate partial storage.
Pagination and filtering
Paginate at the vehicle list level when possible.
Filter and sort by backend-provided fields like riskScore, summary, alertSent, lastEventAt.
Avoid recomputing heavy aggregates from nested arrays on every render.
Recommended loading strategy
KPI cards: use dashboard metrics endpoints.
Vehicle list: use daily vehicle summaries.
Expanded detail: render speedIncidents[] plus filtered events[].
8. Compatibility Notes

These semantics did not change and should remain safe for existing UI:

summary remains the per-vehicle per-type breakdown.
riskScore remains backend-owned.
alertSent and sentAt remain delivery-state fields.
responsables, operationName, brand, model, plate remain safe display fields.
events[] is still the event detail array, but it is no longer safe to interpret as the full event count for the day.
Speed grouping is additive:
existing event rendering can continue if it applies the new dedupe rule against speedIncidents[].eventIds.
Main compatibility caution:
do not use events.length as the source of truth for totals.

Recommended UI Behavior

Fleet Risk Dashboard
Use backend aggregate endpoints for:

total alerts
pending/sent
avg risk
max risk
Use /api/email/daily-metrics for type totals like:

excesos
no identificados
contactos
llave sin cargar
conductor inactivo
Vehicle Risk Heatmap
Use per-vehicle riskScore.
Color buckets are frontend presentation only.

Vehicles table
Show:

plate
operation
responsables
riskScore
totalEventsCount
summary
alertSent
optional max speed derived from speedIncidents
Event table / vehicle detail
Show:

speed incidents first or in a dedicated section
raw event rows excluding grouped speed rows
truncation label when eventsTruncated === true
