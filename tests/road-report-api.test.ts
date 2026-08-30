import { apiBaseURL, apiClient } from '@/config'
import { createRoadReport, getNearbyRoadReports } from '@/api/road-report'
import type { RoadReport } from '@/types'

jest.mock('@/config', () => ({ apiBaseURL: 'https://api.example.test', apiClient: { get: jest.fn(), post: jest.fn() } }))

const get = apiClient.get as jest.Mock
const post = apiClient.post as jest.Mock
const report = {
  id: 'report-1',
  category: 'HAZARD',
  description: 'Broken glass',
  latitude: 1,
  longitude: 2,
  createdAt: '2030-01-01T00:00:00Z',
  expiresAt: '2030-01-02T00:00:00Z',
  images: ['/images/one.webp', 'http://cdn.example.test/two.webp', 'https://cdn.example.test/three.webp'],
  reporter: 'rider-1',
} satisfies RoadReport

beforeEach(() => {
  jest.clearAllMocks()
})

describe('road report API wrappers', () => {
  it('gets nearby reports with bounds and AbortSignal, normalizing relative image URLs', async () => {
    const signal = new AbortController().signal
    get.mockResolvedValue({ data: { data: [report] } })

    await expect(getNearbyRoadReports({ north: 3, south: 0, east: 4, west: 1 }, signal)).resolves.toEqual([
      { ...report, images: ['https://api.example.test/images/one.webp', ...report.images.slice(1)] },
    ])
    expect(get).toHaveBeenCalledWith('/api/v1/road-reports', {
      params: { north: 3, south: 0, east: 4, west: 1 },
      signal,
    })
  })

  it('creates a multipart report with repeated image fields and normalizes its image URL', async () => {
    const images = [
      new File(['one'], 'one.webp', { type: 'image/webp' }),
      new File(['two'], 'two.webp', { type: 'image/webp' }),
    ]
    post.mockResolvedValue({ data: { data: { ...report, images: ['/images/new.webp'] } } })

    await expect(createRoadReport({
      category: 'CONSTRUCTION',
      description: 'Road works',
      latitude: 1.5,
      longitude: 2.5,
      images,
    })).resolves.toEqual({ ...report, images: ['https://api.example.test/images/new.webp'] })

    expect(post).toHaveBeenCalledWith('/api/v1/road-reports', expect.any(FormData))
    const body = post.mock.calls[0][1] as FormData
    expect(body.get('category')).toBe('CONSTRUCTION')
    expect(body.get('description')).toBe('Road works')
    expect(body.get('latitude')).toBe('1.5')
    expect(body.get('longitude')).toBe('2.5')
    expect(body.getAll('images')).toHaveLength(2)
    expect(body.getAll('images')).toEqual(images)
    expect(Array.from(body.keys())).toEqual(['category', 'description', 'latitude', 'longitude', 'images', 'images'])
    expect(post.mock.calls[0][2]).toBeUndefined()
  })
})

describe('road report URL normalization', () => {
  it('does not prefix absolute HTTP or HTTPS image URLs', async () => {
    const absoluteReport = { ...report, images: ['http://one.test/a', 'https://two.test/b'] }
    get.mockResolvedValue({ data: { data: [absoluteReport] } })

    await expect(getNearbyRoadReports({ north: 1, south: 0, east: 1, west: 0 })).resolves.toEqual([absoluteReport])
  })

  it('preserves the configured base URL without adding a duplicate slash', () => {
    expect(apiBaseURL).toBe('https://api.example.test')
  })
})
