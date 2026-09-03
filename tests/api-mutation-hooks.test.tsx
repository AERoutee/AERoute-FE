import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { compareRoutes } from '@/api'
import { removeProfileAvatar, uploadProfileAvatar } from '@/api/profile'
import { useMutationCreateRouteComparison } from '@/hooks/route-comparison'
import { useMutationRemoveProfileAvatar, useMutationUploadProfileAvatar } from '@/hooks/profile'
import type { PlannerRequest } from '@/types'

jest.mock('@/api', () => ({ compareRoutes: jest.fn() }))
jest.mock('@/api/profile', () => ({ removeProfileAvatar: jest.fn(), uploadProfileAvatar: jest.fn() }))

const compareRoutesMock = compareRoutes as jest.Mock
const removeProfileAvatarMock = removeProfileAvatar as jest.Mock
const uploadProfileAvatarMock = uploadProfileAvatar as jest.Mock

const request: PlannerRequest = {
  origin: { latitude: 1, longitude: 2, label: 'A' },
  destination: { latitude: 3, longitude: 4, label: 'B' },
  mode: 'WALK',
  preference: 'balanced',
  sensitiveUser: false,
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

beforeEach(() => jest.clearAllMocks())

describe('API mutation hooks', () => {
  it('starts ordered tasks concurrently with one signal and returns ordered outcomes', async () => {
    const starts: string[] = []
    const releases: Array<() => void> = []
    compareRoutesMock.mockImplementation((nextRequest, signal) => new Promise((resolve) => { starts.push(nextRequest.mode); releases.push(() => resolve({ comparisonId: nextRequest.mode, signal })) }))
    const { result } = renderHook(() => useMutationCreateRouteComparison(), { wrapper: createWrapper() })
    const tasks = [
      { id: 'WALK', label: 'Walk', selectedModes: ['WALK'] as const, request },
      { id: 'BICYCLE', label: 'Cycle', selectedModes: ['BICYCLE'] as const, request: { ...request, mode: 'BICYCLE' as const } },
    ]
    const pending = result.current.mutateAsync(tasks)
    await waitFor(() => expect(starts).toEqual(['WALK', 'BICYCLE']))
    expect(compareRoutesMock.mock.calls[0][1]).toBe(compareRoutesMock.mock.calls[1][1])
    releases.reverse().forEach((release) => release())
    await expect(pending).resolves.toEqual([
      expect.objectContaining({ task: tasks[0], status: 'success', comparison: expect.objectContaining({ comparisonId: 'WALK' }) }),
      expect.objectContaining({ task: tasks[1], status: 'success', comparison: expect.objectContaining({ comparisonId: 'BICYCLE' }) }),
    ])
  })

  it('returns per-task errors without rejecting the batch', async () => {
    const error = new Error('request failed')
    compareRoutesMock.mockResolvedValueOnce({ comparisonId: 'walk' }).mockRejectedValueOnce(error)
    const { result } = renderHook(() => useMutationCreateRouteComparison(), { wrapper: createWrapper() })
    await expect(result.current.mutateAsync([
      { id: 'WALK', label: 'Walk', selectedModes: ['WALK'], request },
      { id: 'BICYCLE', label: 'Cycle', selectedModes: ['BICYCLE'], request: { ...request, mode: 'BICYCLE' } },
    ])).resolves.toEqual([
      expect.objectContaining({ status: 'success', comparison: { comparisonId: 'walk' } }),
      expect.objectContaining({ status: 'error', error }),
    ])
    expect(compareRoutesMock).toHaveBeenCalledTimes(2)
  })

  it('aborts the whole batch and suppresses cancellation outcomes', async () => {
    compareRoutesMock.mockImplementation((_request, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))))
    const { result } = renderHook(() => useMutationCreateRouteComparison(), { wrapper: createWrapper() })
    const pending = result.current.mutateAsync([{ id: 'WALK', label: 'Walk', selectedModes: ['WALK'], request }])
    await waitFor(() => expect(compareRoutesMock).toHaveBeenCalledTimes(1))
    result.current.abort()
    await expect(pending).resolves.toEqual([])
  })

  it('runs avatar upload through the mutation function without retrying', async () => {
    const data = { image: '/avatar.webp' }
    const file = new Blob(['avatar'])
    uploadProfileAvatarMock.mockResolvedValue(data)
    const { result } = renderHook(() => useMutationUploadProfileAvatar(), { wrapper: createWrapper() })
    await expect(result.current.mutateAsync(file)).resolves.toBe(data)
    expect(uploadProfileAvatarMock.mock.calls[0][0]).toBe(file)
  })

  it('runs avatar removal through the mutation function without retrying', async () => {
    const data = { image: null }
    removeProfileAvatarMock.mockResolvedValue(data)
    const { result } = renderHook(() => useMutationRemoveProfileAvatar(), { wrapper: createWrapper() })
    await expect(result.current.mutateAsync()).resolves.toBe(data)
    expect(removeProfileAvatarMock).toHaveBeenCalledTimes(1)
  })
})
