import axios from 'axios'
import { compareRoutes, ApiError } from '@/api/route-comparison/route-comparison-queries'
import { apiClient } from '@/config'
import type { PlannerRequest, RouteComparison } from '@/types'

jest.mock('@/config', () => ({ apiClient: { post: jest.fn() } }))
jest.mock('axios', () => ({ __esModule: true, default: { isAxiosError: jest.fn() } }))

const post = apiClient.post as jest.Mock
const isAxiosError = axios.isAxiosError as jest.Mock

const request: PlannerRequest = {
  origin: { latitude: 1.25, longitude: 2.5, label: 'Origin' },
  destination: { latitude: 3.75, longitude: 4.5, label: 'Destination' },
  mode: 'BICYCLE',
  preference: 'lower-exposure',
  sensitiveUser: true,
}
const result = { comparisonId: 'comparison-1' } as RouteComparison

beforeEach(() => {
  jest.clearAllMocks()
  isAxiosError.mockReturnValue(false)
})

describe('compareRoutes', () => {
  it('posts the planner payload with an AbortSignal and unwraps data', async () => {
    const signal = new AbortController().signal
    post.mockResolvedValue({ data: { data: result } })

    await expect(compareRoutes(request, signal)).resolves.toBe(result)
    expect(post).toHaveBeenCalledWith(
      '/api/v1/route-comparisons',
      {
        origin: { latitude: 1.25, longitude: 2.5 },
        destination: { latitude: 3.75, longitude: 4.5 },
        mode: 'BICYCLE',
        preference: 'lower-exposure',
        sensitiveUser: true,
      },
      { signal },
    )
  })

  it('maps structured Axios errors to ApiError', async () => {
    const error = { response: { data: { error: { code: 'NO_ROUTE', message: 'No route found', retryable: false } } } }
    isAxiosError.mockReturnValue(true)
    post.mockRejectedValue(error)

    await expect(compareRoutes(request)).rejects.toEqual(new ApiError('NO_ROUTE', 'No route found', false))
  })

  it('uses default Axios error values when the response is incomplete', async () => {
    isAxiosError.mockReturnValue(true)
    post.mockRejectedValue({ response: undefined })

    await expect(compareRoutes(request)).rejects.toEqual(new ApiError('request_failed', 'Route comparison failed.', true))
  })

  it('rethrows non-Axios errors unchanged', async () => {
    const error = new Error('aborted')
    post.mockRejectedValue(error)

    await expect(compareRoutes(request)).rejects.toBe(error)
  })
})
