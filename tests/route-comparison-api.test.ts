import axios from 'axios'
import { compareRoutes, getTransitStopDetails, ApiError } from '@/api/route-comparison/route-comparison-queries'
import { apiClient } from '@/config'
import { directModeRequest, itineraryModeRequests } from '@/lib'
import type { PlannerRequest } from '@/types'
import { routeComparison } from './route-fixtures'

jest.mock('@/config', () => ({ apiClient: { post: jest.fn() } }))
jest.mock('axios', () => ({ __esModule: true, default: { isAxiosError: jest.fn(), isCancel: jest.fn(() => false) } }))

const post = apiClient.post as jest.Mock
const isAxiosError = axios.isAxiosError as jest.Mock
const isCancel = axios.isCancel as jest.Mock

const request: PlannerRequest = {
  origin: { latitude: 1.25, longitude: 2.5, label: 'Origin' },
  destination: { latitude: 3.75, longitude: 4.5, label: 'Destination' },
  mode: 'BICYCLE',
  preference: 'lower-exposure',
  sensitiveUser: true,
}
const result = routeComparison('comparison-1')

beforeEach(() => {
  jest.clearAllMocks()
  isAxiosError.mockReturnValue(false)
  isCancel.mockReturnValue(false)
})

describe('compareRoutes', () => {
  it('maps compatible selections to one exact backend request', () => {
    expect(directModeRequest(['BUS'])).toEqual({ mode: 'TRANSIT', transitModes: ['BUS'], label: 'Bus' })
    expect(directModeRequest(['WALK', 'TRAIN'])).toEqual({ mode: 'TRANSIT', transitModes: ['TRAIN'], label: 'Jalan + Kereta' })
    expect(directModeRequest(['BUS', 'SUBWAY'])).toEqual({ mode: 'TRANSIT', transitModes: ['BUS', 'SUBWAY'], label: 'Bus + MRT' })
    expect(directModeRequest(['WALK'])).toEqual({ mode: 'WALK', label: 'Jalan' })
  })

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
      { signal, timeout: 90_000 },
    )
  })

  it('normalizes a legacy singular transit photo at the API boundary', async () => {
    const stop = { name: 'Central', location: { latitude: -6.2, longitude: 106.8 }, ordinal: 2, role: 'departure' as const, vehicleType: 'BUS', label: 'B1' }
    const photo = { name: 'places/ChIJ123/photos/AUac1' }
    post.mockResolvedValue({ data: { data: { status: 'AVAILABLE', place: { id: 'central', name: 'Central', location: stop.location, types: ['bus_station'], photo, safetyVerified: false } } } })
    await expect(getTransitStopDetails(stop)).resolves.toEqual({ status: 'AVAILABLE', place: { id: 'central', name: 'Central', location: stop.location, types: ['bus_station'], photos: [photo], safetyVerified: false } })
  })

  it('normalizes legacy and surplus rest-stop photos at the route API boundary', async () => {
    const comparison = routeComparison('photos')
    const photos = [1, 2, 3, 4].map((index) => ({ name: `places/ChIJ123/photos/AUac${index}` }))
    comparison.restStopCandidates = { status: 'AVAILABLE', candidates: [
      { id: 'legacy', name: 'Legacy', location: { latitude: 1, longitude: 2 }, types: ['park'], photo: photos[0], safetyVerified: false },
      { id: 'many', name: 'Many', location: { latitude: 3, longitude: 4 }, types: ['park'], photos, safetyVerified: false },
    ] } as typeof comparison.restStopCandidates
    post.mockResolvedValue({ data: { data: comparison } })
    const normalized = await compareRoutes(request)
    expect(normalized.restStopCandidates.status === 'AVAILABLE' && normalized.restStopCandidates.candidates.map((place) => place.photos)).toEqual([[photos[0]], photos.slice(0, 3)])
  })

  it('posts transit association context only when a route result is available', async () => {
    const signal = new AbortController().signal
    const details = { status: 'NOT_FOUND' as const }
    const stop = { name: 'Central', location: { latitude: -6.2, longitude: 106.8 }, ordinal: 2, role: 'departure' as const, vehicleType: 'BUS', line: '7', headsign: 'Park', label: 'B1' }
    post.mockResolvedValue({ data: { data: details } })

    await expect(getTransitStopDetails(stop, undefined, signal)).resolves.toBe(details)
    expect(post).toHaveBeenLastCalledWith('/api/v1/transit-stop-details', { name: 'Central', latitude: -6.2, longitude: 106.8 }, { signal })

    await expect(getTransitStopDetails(stop, 'route-result-1', signal)).resolves.toBe(details)
    expect(post).toHaveBeenLastCalledWith('/api/v1/transit-stop-details', { name: 'Central', latitude: -6.2, longitude: 106.8, routeResultId: 'route-result-1', ordinal: 2, role: 'departure' }, { signal })
  })

  it('posts one exact WALK + BUS + TRAIN task payload', async () => {
    post.mockResolvedValue({ data: { data: result } })
    const tasks = itineraryModeRequests(['WALK', 'BUS', 'TRAIN'], { origin: request.origin, destination: request.destination, preference: request.preference, sensitiveUser: request.sensitiveUser, transitPreference: 'FEWER_TRANSFERS', accessibilityMode: 'REDUCED_EXERTION', departureOffsetsMinutes: [0, 30, 60], hazardPolicy: 'PREFER_FEWER_REPORTS', includeRestStops: true })
    expect(tasks).toHaveLength(1)
    await compareRoutes(tasks[0].request)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/api/v1/route-comparisons', {
      origin: { latitude: 1.25, longitude: 2.5 },
      destination: { latitude: 3.75, longitude: 4.5 },
      mode: 'TRANSIT',
      preference: 'lower-exposure',
      sensitiveUser: true,
      transitModes: ['BUS', 'TRAIN'],
      transitPreference: 'FEWER_TRANSFERS',
      accessibilityMode: 'REDUCED_EXERTION',
      departureOffsetsMinutes: [0, 30, 60],
      hazardPolicy: 'PREFER_FEWER_REPORTS',
      includeRestStops: true,
    }, { signal: undefined, timeout: 90_000 })
  })

  it('posts the composite access plan without changing native transit fields', async () => {
    post.mockResolvedValue({ data: { data: result } })
    const accessPlan = { firstMileMode: 'BICYCLE' as const, lastMileMode: 'WALK' as const, bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' as const }
    await compareRoutes({ ...request, mode: 'TRANSIT', transitModes: ['TRAIN'], transitPreference: 'LESS_WALKING', accessPlan, accessibilityMode: 'STANDARD', departureOffsetsMinutes: [0], hazardPolicy: 'PREFER_FEWER_REPORTS', includeRestStops: false })
    expect(post).toHaveBeenCalledWith('/api/v1/route-comparisons', expect.objectContaining({ mode: 'TRANSIT', transitModes: ['TRAIN'], accessPlan, departureOffsetsMinutes: [0], includeRestStops: false }), { signal: undefined, timeout: 90_000 })
  })

  it('maps structured Axios errors with status and Retry-After to ApiError', async () => {
    const error = { response: { status: 429, headers: { 'retry-after': '30' }, data: { error: { code: 'RATE_LIMITED', message: 'Try later', retryable: true } } } }
    isAxiosError.mockReturnValue(true)
    post.mockRejectedValue(error)

    await expect(compareRoutes(request)).rejects.toEqual(new ApiError('RATE_LIMITED', 'Try later', true, 429, '30'))
  })

  it('distinguishes timeout, response-less network, and malformed Axios failures', async () => {
    isAxiosError.mockReturnValue(true)

    post.mockRejectedValueOnce({ code: 'ECONNABORTED', response: { status: 504, headers: { 'retry-after': '12' } } })
    await expect(compareRoutes(request)).rejects.toEqual(new ApiError('route_comparison_timeout', 'Route comparison took too long. Try fewer modes or try again.', true, 504, '12'))

    post.mockRejectedValueOnce({ code: 'ERR_NETWORK' })
    await expect(compareRoutes(request)).rejects.toEqual(new ApiError('request_failed', 'Could not reach the route service. Check your connection and allowed site origin.', true))

    post.mockRejectedValueOnce({ response: { status: 502, headers: {}, data: null } })
    await expect(compareRoutes(request)).rejects.toEqual(new ApiError('request_failed', 'Route comparison failed.', true, 502))
  })

  it('rethrows canceled requests unchanged', async () => {
    const error = new Error('canceled')
    isCancel.mockReturnValue(true)
    post.mockRejectedValue(error)
    await expect(compareRoutes(request)).rejects.toBe(error)
  })

  it('rethrows non-Axios errors unchanged', async () => {
    const error = new Error('aborted')
    post.mockRejectedValue(error)

    await expect(compareRoutes(request)).rejects.toBe(error)
  })
})
