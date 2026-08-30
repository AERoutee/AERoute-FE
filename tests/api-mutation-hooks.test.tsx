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

beforeEach(() => {
  jest.clearAllMocks()
})

describe('API mutation hooks', () => {
  it('runs route comparison through the mutation function without retrying', async () => {
    const data = { comparisonId: 'comparison-1' }
    compareRoutesMock.mockResolvedValue(data)
    const { result } = renderHook(() => useMutationCreateRouteComparison(), { wrapper: createWrapper() })

    await expect(result.current.mutateAsync(request)).resolves.toBe(data)
    expect(compareRoutesMock).toHaveBeenCalledWith(request)
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

  it('exposes mutation errors and does not retry failed requests', async () => {
    const error = new Error('request failed')
    compareRoutesMock.mockRejectedValue(error)
    const { result } = renderHook(() => useMutationCreateRouteComparison(), { wrapper: createWrapper() })

    await expect(result.current.mutateAsync(request)).rejects.toBe(error)
    await waitFor(() => expect(result.current.failureCount).toBe(1))
    expect(compareRoutesMock).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe(error)
  })
})
