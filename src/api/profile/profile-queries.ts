import { apiBaseURL, apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiResponse } from '@/types'

const profileAvatarPath = '/api/v1/profile/avatar/'

export function resolveProfileAvatarUrl(value?: string | null): string | null | undefined {
  if (!value) return value
  if (value.startsWith(profileAvatarPath)) return `${apiBaseURL}${value}`
  try {
    const url = new URL(value)
    return url.pathname.startsWith(profileAvatarPath) ? `${apiBaseURL}${url.pathname}${url.search}${url.hash}` : value
  } catch {
    return value
  }
}

export async function uploadProfileAvatar(file: Blob) {
  const body = new FormData()
  body.append('avatar', file, 'avatar.webp')
  const response = await apiClient.put<ApiResponse<{ image: string }>>(API_ENDPOINTS.profileAvatar, body)
  return response.data.data
}

export async function removeProfileAvatar() {
  const response = await apiClient.delete<ApiResponse<{ image: null }>>(API_ENDPOINTS.profileAvatar)
  return response.data.data
}
