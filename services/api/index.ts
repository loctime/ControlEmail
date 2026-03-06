export { apiClient } from "@/services/api/client"
export type { ApiAuthMode, ApiClientError } from "@/services/api/client"

export { authApi } from "@/services/api/auth/authApi"
export type * from "@/services/api/auth/types"

export { dashboardApi } from "@/services/api/dashboard/dashboardApi"
export type * from "@/services/api/dashboard/types"

export { vehiclesApi } from "@/services/api/vehicles/vehiclesApi"
export type * from "@/services/api/vehicles/types"

export { eventsApi } from "@/services/api/events/eventsApi"
export type * from "@/services/api/events/types"

export { alertsApi } from "@/services/api/alerts/alertsApi"
export type * from "@/services/api/alerts/types"

export { qualityApi } from "@/services/api/quality/qualityApi"
export type * from "@/services/api/quality/types"

export { adminApi } from "@/services/api/admin/adminApi"
export type * from "@/services/api/admin/types"

export { emailApiFetch, sessionApiFetch } from "@/services/api/http"
export type { ApiError } from "@/services/api/http"
