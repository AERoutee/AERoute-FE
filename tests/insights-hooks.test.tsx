import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createSavedCommute, deleteSavedCommute, getSavedCommutes, getTripImpactSummary, recordTripImpact, updateSavedCommute } from '@/api'
import { insightsKeys, useCreateSavedCommute, useDeleteSavedCommute, useRecordTripImpact, useSavedCommutes, useTripImpactSummary, useUpdateSavedCommute } from '@/hooks/insights'

jest.mock('@/api', () => ({ createSavedCommute: jest.fn(), deleteSavedCommute: jest.fn(), getSavedCommutes: jest.fn(), getTripImpactSummary: jest.fn(), recordTripImpact: jest.fn(), updateSavedCommute: jest.fn() }))

const create = createSavedCommute as jest.Mock
const update = updateSavedCommute as jest.Mock
const remove = deleteSavedCommute as jest.Mock
const list = getSavedCommutes as jest.Mock
const summary = getTripImpactSummary as jest.Mock
const record = recordTripImpact as jest.Mock

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(hook, { wrapper }), invalidate }
}

beforeEach(() => jest.clearAllMocks())

describe('insights hooks', () => {
  it('loads commute and impact summary queries', async () => {
    list.mockResolvedValue([{ id: 'one' }])
    summary.mockResolvedValue({ completedTrips: 1 })
    const commutes = setup(() => useSavedCommutes())
    const impacts = setup(() => useTripImpactSummary())
    await waitFor(() => expect(commutes.result.current.data).toEqual([{ id: 'one' }]))
    await waitFor(() => expect(impacts.result.current.data).toEqual({ completedTrips: 1 }))
  })

  it('invalidates saved commutes after create', async () => {
    create.mockResolvedValue({ id: 'one' })
    const { result, invalidate } = setup(() => useCreateSavedCommute())
    await result.current.mutateAsync({} as never)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: insightsKeys.commutes })
  })

  it('passes update ID/input and invalidates saved commutes', async () => {
    update.mockResolvedValue({ id: 'one' })
    const { result, invalidate } = setup(() => useUpdateSavedCommute())
    await result.current.mutateAsync({ id: 'one', input: { watchEnabled: false } })
    expect(update).toHaveBeenCalledWith('one', { watchEnabled: false })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: insightsKeys.commutes })
  })

  it('deletes commutes and records impact with matching invalidations', async () => {
    remove.mockResolvedValue({ deleted: true })
    record.mockResolvedValue({ id: 'impact' })
    const deletion = setup(() => useDeleteSavedCommute())
    const impact = setup(() => useRecordTripImpact())
    await deletion.result.current.mutateAsync('one')
    await impact.result.current.mutateAsync({ routeResultId: 'route' })
    expect(record.mock.calls[0][0]).toEqual({ routeResultId: 'route' })
    expect(deletion.invalidate).toHaveBeenCalledWith({ queryKey: insightsKeys.commutes })
    expect(impact.invalidate).toHaveBeenCalledWith({ queryKey: insightsKeys.summary })
  })
})
