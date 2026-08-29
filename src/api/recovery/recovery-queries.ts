import { apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiResponse } from '@/types'

export type RecoveryChallenge = { id: string; expiresInSeconds: number }
export type RecoveryChallengeInfo = { maskedEmail: string; expiresAt: string }

function challengeUrl(id: string, action?: string) {
  const base = `${API_ENDPOINTS.recoveryChallenges}/${encodeURIComponent(id)}`
  return action ? `${base}/${action}` : base
}

export async function requestRecoveryChallenge(email: string) {
  const response = await apiClient.post<ApiResponse<RecoveryChallenge>>(API_ENDPOINTS.recoveryChallenges, { email })
  return response.data.data
}

export async function getRecoveryChallenge(id: string) {
  const response = await apiClient.get<ApiResponse<RecoveryChallengeInfo>>(challengeUrl(id))
  return response.data.data
}

export async function resendRecoveryChallenge(id: string) {
  const response = await apiClient.post<ApiResponse<RecoveryChallenge>>(challengeUrl(id, 'resend'))
  return response.data.data
}

export async function verifyRecoveryChallenge(id: string, otp: string) {
  const response = await apiClient.post<ApiResponse<{ verified: true }>>(challengeUrl(id, 'verify'), { otp })
  return response.data.data
}

export async function resetRecoveryPassword(id: string, otp: string, password: string) {
  const response = await apiClient.post<ApiResponse<{ success: true }>>(challengeUrl(id, 'reset'), { otp, password })
  return response.data.data
}
