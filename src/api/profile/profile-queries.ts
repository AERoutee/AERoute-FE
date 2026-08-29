import { apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiResponse } from '@/types'

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
