import { apiClient } from '@/config'
import { createSavedCommute, deleteSavedCommute, getSavedCommutes, recordTripImpact, updateSavedCommute } from '@/api/insights'

jest.mock('@/config', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }))

const get = apiClient.get as jest.Mock
const post = apiClient.post as jest.Mock
const patch = apiClient.patch as jest.Mock
const remove = apiClient.delete as jest.Mock
const commute = { name: 'Home to work', origin: { label: 'Home', latitude: 1, longitude: 2 }, destination: { label: 'Work', latitude: 3, longitude: 4 }, mode: 'TRANSIT' as const, preference: 'balanced' as const, sensitiveUser: false, transitModes: ['TRAIN' as const, 'RAIL' as const, 'LIGHT_RAIL' as const], transitPreference: 'FEWER_TRANSFERS' as const, accessibilityMode: 'REDUCED_EXERTION' as const, watchEnabled: true, watchHour: 8 }

beforeEach(() => jest.clearAllMocks())

describe('insights API', () => {
  it('lists and creates saved commute configurations', async () => {
    get.mockResolvedValue({ data: { data: [{ id: 'one' }] } })
    post.mockResolvedValue({ data: { data: { id: 'one', ...commute } } })
    await expect(getSavedCommutes()).resolves.toEqual([{ id: 'one' }])
    await expect(createSavedCommute(commute)).resolves.toEqual({ id: 'one', ...commute })
    expect(get).toHaveBeenCalledWith('/api/v1/saved-commutes', { signal: undefined })
    expect(post).toHaveBeenCalledWith('/api/v1/saved-commutes', commute)
  })

  it('updates and deletes owned commute configurations', async () => {
    patch.mockResolvedValue({ data: { data: { id: 'one', watchEnabled: false } } })
    remove.mockResolvedValue({ data: { data: { deleted: true } } })
    await updateSavedCommute('one', { watchEnabled: false })
    await deleteSavedCommute('one')
    expect(patch).toHaveBeenCalledWith('/api/v1/saved-commutes/one', { watchEnabled: false })
    expect(remove).toHaveBeenCalledWith('/api/v1/saved-commutes/one')
  })

  it('records only secure route IDs', async () => {
    post.mockResolvedValue({ data: { data: { id: 'impact' } } })
    await recordTripImpact({ routeResultId: 'route-result' })
    expect(post).toHaveBeenCalledWith('/api/v1/trip-impacts', { routeResultId: 'route-result' })
    expect(post).not.toHaveBeenCalledWith('/api/v1/trip-impacts', expect.objectContaining({ comparisonId: expect.anything() }))
  })
})
