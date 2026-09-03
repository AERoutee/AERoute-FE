import { apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiResponse, SavedCommute, SavedCommuteInput, TripImpact, TripImpactSummary } from '@/types'

export async function getSavedCommutes(signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<SavedCommute[]>>(API_ENDPOINTS.savedCommutes, { signal })
  return response.data.data
}

export async function createSavedCommute(input: SavedCommuteInput) {
  const response = await apiClient.post<ApiResponse<SavedCommute>>(API_ENDPOINTS.savedCommutes, input)
  return response.data.data
}

export async function updateSavedCommute(id: string, input: Partial<SavedCommuteInput>) {
  const response = await apiClient.patch<ApiResponse<SavedCommute>>(API_ENDPOINTS.savedCommute(id), input)
  return response.data.data
}

export async function deleteSavedCommute(id: string) {
  const response = await apiClient.delete<ApiResponse<{ deleted: true }>>(API_ENDPOINTS.savedCommute(id))
  return response.data.data
}

export async function recordTripImpact(input: { routeResultId: string }) {
  const response = await apiClient.post<ApiResponse<TripImpact>>(API_ENDPOINTS.tripImpacts, input)
  return response.data.data
}

export async function getTripImpactSummary(signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<TripImpactSummary>>(API_ENDPOINTS.tripImpactSummary, { signal })
  return response.data.data
}
