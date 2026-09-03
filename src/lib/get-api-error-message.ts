import axios from 'axios'
import type { ApiErrorResponse } from '@/types'

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) return error.response?.data?.error?.message ?? fallback
  return error instanceof Error && error.message ? error.message : fallback
}
