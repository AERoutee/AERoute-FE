export type ApiResponse<T> = {
  data: T
  stats?: Record<string, number>
}

export type ApiErrorResponse = {
  error: {
    code: string
    message: string
    retryable: boolean
    fields?: Record<string, string>
  }
}
