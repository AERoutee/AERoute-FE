import axios from 'axios'
import { apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiErrorResponse, ApiResponse, PlacePhoto, PlannerRequest, RouteComparison, TransitStop, TransitStopDetailsResult } from '@/types'

export class ApiError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly status?: number
  readonly retryAfter?: string

  constructor(code: string, message: string, retryable = true, status?: number, retryAfter?: string) {
    super(message)
    this.code = code
    this.retryable = retryable
    this.status = status
    this.retryAfter = retryAfter
  }
}

function normalizePlace<Place extends { photos?: PlacePhoto[] }>(value: Place): Place {
  const legacy = value as Place & { photo?: PlacePhoto }
  if (!legacy.photo && (!value.photos || value.photos.length <= 3)) return value
  const { photo: _photo, ...place } = legacy
  return { ...place, ...(value.photos?.length ? { photos: value.photos.slice(0, 3) } : legacy.photo ? { photos: [legacy.photo] } : {}) } as Place
}

function normalizeTransitStopDetails(result: TransitStopDetailsResult): TransitStopDetailsResult {
  return result.status === 'AVAILABLE' ? { ...result, place: normalizePlace(result.place) } : result
}

function normalizeRouteComparison(result: RouteComparison): RouteComparison {
  if (result.restStopCandidates.status !== 'AVAILABLE') return result
  const candidates = result.restStopCandidates.candidates.map(normalizePlace)
  return candidates.some((candidate, index) => candidate !== result.restStopCandidates.candidates[index]) ? { ...result, restStopCandidates: { ...result.restStopCandidates, candidates } } : result
}

export async function getTransitStopDetails(stop: TransitStop, routeResultId?: string, signal?: AbortSignal): Promise<TransitStopDetailsResult> {
  const response = await apiClient.post<ApiResponse<TransitStopDetailsResult>>(API_ENDPOINTS.transitStopDetails, { name: stop.name, latitude: stop.location.latitude, longitude: stop.location.longitude, ...(routeResultId ? { routeResultId, ordinal: stop.ordinal, role: stop.role } : {}) }, { signal })
  return normalizeTransitStopDetails(response.data.data)
}

export async function compareRoutes(request: PlannerRequest, signal?: AbortSignal): Promise<RouteComparison> {
  try {
    const response = await apiClient.post<ApiResponse<RouteComparison>>(API_ENDPOINTS.routeComparisons, {
      origin: { latitude: request.origin.latitude, longitude: request.origin.longitude },
      destination: { latitude: request.destination.latitude, longitude: request.destination.longitude },
      mode: request.mode,
      preference: request.preference,
      sensitiveUser: request.sensitiveUser,
      ...(request.mode === 'TRANSIT' ? { transitModes: request.transitModes, transitPreference: request.transitPreference, ...(request.accessPlan ? { accessPlan: request.accessPlan } : {}) } : {}),
      accessibilityMode: request.accessibilityMode,
      departureOffsetsMinutes: request.departureOffsetsMinutes,
      hazardPolicy: request.hazardPolicy,
      includeRestStops: request.includeRestStops,
    }, { signal, timeout: 90_000 })
    return normalizeRouteComparison(response.data.data)
  } catch (error) {
    if (axios.isCancel(error)) throw error
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      const status = error.response?.status
      const retryAfter = error.response?.headers?.['retry-after']
      if (error.code === 'ECONNABORTED') throw new ApiError('route_comparison_timeout', 'Route comparison took too long. Try fewer modes or try again.', true, status, retryAfter)
      if (error.code === 'ERR_NETWORK' && !error.response) throw new ApiError('request_failed', 'Could not reach the route service. Check your connection and allowed site origin.', true)
      const data = error.response?.data
      throw new ApiError(data?.error?.code ?? 'request_failed', data?.error?.message ?? 'Route comparison failed.', data?.error?.retryable ?? true, status, retryAfter)
    }
    throw error
  }
}
