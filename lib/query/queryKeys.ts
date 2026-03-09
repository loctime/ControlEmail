"use client"

export const queryKeys = {
  dashboard: {
    /** [mode, param] e.g. ["day","2026-03-04"] | ["month","2026-03"] | ["year","2026"] */
    aggregated: (mode: "day" | "month" | "year", param: string) =>
      ["dashboard", mode, param] as const,
    lastDate: () => ["dashboard", "lastDate"] as const,
  },
  vehicles: {
    myVehicles: () => ["vehicles", "myVehicles"] as const,
    myAlertsVehicles: () => ["vehicles", "myAlertsVehicles"] as const,
  },
  alerts: {
    pendingDaily: () => ["alerts", "pendingDaily"] as const,
  },
} as const

