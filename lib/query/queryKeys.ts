"use client"

export const queryKeys = {
  dashboard: {
    myData: (dateKey: string) => ["dashboard", "myData", dateKey] as const,
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

