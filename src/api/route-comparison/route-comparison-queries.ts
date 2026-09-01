import axios from 'axios'
import { apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiErrorResponse, ApiResponse, PlannerRequest, RouteComparison } from '@/types'

export class ApiError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, message: string, retryable = true) {
    super(message)
    this.code = code
    this.retryable = retryable
  }
}

export async function compareRoutes(request: PlannerRequest, signal?: AbortSignal): Promise<RouteComparison> {
  try {
    const response = await apiClient.post<ApiResponse<RouteComparison>>(API_ENDPOINTS.routeComparisons, {
      origin: { latitude: request.origin.latitude, longitude: request.origin.longitude },
      destination: { latitude: request.destination.latitude, longitude: request.destination.longitude },
      mode: request.mode,
      preference: request.preference,
      sensitiveUser: request.sensitiveUser,
    }, { signal })
    return response.data.data
  } catch (error) {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      throw new ApiError(error.response?.data.error.code ?? 'request_failed', error.response?.data.error.message ?? 'Route comparison failed.', error.response?.data.error.retryable ?? true)
    }
    throw error
  }
}
