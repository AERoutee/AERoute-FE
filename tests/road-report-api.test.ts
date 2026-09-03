import { apiBaseURL, apiClient } from '@/config'
import { createRoadReport, getMyRoadReports, getNearbyRoadReports, normalizeRoadReport, resolveRoadReport, resolveRoadReportImageUrl, retractRoadReportVerification, verifyRoadReport } from '@/api/road-report'
import type { RoadReport } from '@/types'

jest.mock('@/config', () => ({ apiBaseURL: 'https://api.example.test', apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() } }))

const get = apiClient.get as jest.Mock
const post = apiClient.post as jest.Mock
const put = apiClient.put as jest.Mock
const patch = apiClient.patch as jest.Mock
const remove = apiClient.delete as jest.Mock
const report = {
  id: 'report-1',
  category: 'HAZARD',
  description: 'Broken glass',
  latitude: 1,
  longitude: 2,
  createdAt: '2030-01-01T00:00:00Z',
  expiresAt: '2030-01-02T00:00:00Z',
  images: ['/api/v1/road-report-images/11111111-1111-4111-8111-111111111111', 'http://api.example.test/api/v1/road-report-images/22222222-2222-4222-8222-222222222222', 'https://cdn.example.test/api/v1/road-report-images/33333333-3333-4333-8333-333333333333'],
  reporter: 'rider-1',
} satisfies RoadReport

beforeEach(() => {
  jest.clearAllMocks()
})

describe('road report evidence normalization', () => {
  const verification = { confirmations: 2, disputes: 1, viewerVerdict: null }
  const trust = { level: 'HIGH', score: 82, kind: 'EVIDENCE_SCORE', factors: { recency: 35, photos: 20, voteBalance: 27 } }

  it('preserves canonical vote balance evidence', () => {
    const normalized = normalizeRoadReport({ ...report, verification, trust })

    expect(normalized.verification).toEqual(verification)
    expect(normalized.trust).toEqual(trust)
  })

  it('normalizes legacy confirmation balance evidence to vote balance', () => {
    const normalized = normalizeRoadReport({
      ...report,
      verification,
      trust: { ...trust, factors: { recency: 35, photos: 20, confirmationBalance: 27 } },
    })

    expect(normalized.verification).toEqual(verification)
    expect(normalized.trust).toEqual(trust)
  })
})

describe('road report API wrappers', () => {
  it('gets nearby reports with bounds and AbortSignal, normalizing relative image URLs', async () => {
    const signal = new AbortController().signal
    get.mockResolvedValue({ data: { data: [report] } })

    await expect(getNearbyRoadReports({ north: 3, south: 0, east: 4, west: 1 }, signal)).resolves.toEqual([
      { ...report, images: ['https://api.example.test/api/v1/road-report-images/11111111-1111-4111-8111-111111111111'] },
    ])
    expect(get).toHaveBeenCalledWith('/api/v1/road-reports', {
      params: { north: 3, south: 0, east: 4, west: 1 },
      signal,
    })
  })

  it('lists owned reports and performs verification, retraction, and resolution contracts', async () => {
    const evidence = { verification: { confirmations: 1, disputes: 0, viewerVerdict: 'CONFIRM' }, trust: { level: 'HIGH', score: 80, kind: 'EVIDENCE_SCORE', factors: { recency: 30, photos: 20, voteBalance: 30 } } }
    get.mockResolvedValue({ data: { data: [{ ...report, images: ['/api/v1/road-report-images/44444444-4444-4444-8444-444444444444'] }] } })
    put.mockResolvedValue({ data: { data: evidence } })
    remove.mockResolvedValue({ data: { data: evidence } })
    patch.mockResolvedValue({ data: { data: { ...report, status: 'RESOLVED', images: [] } } })

    await expect(getMyRoadReports()).resolves.toEqual([{ ...report, images: ['https://api.example.test/api/v1/road-report-images/44444444-4444-4444-8444-444444444444'] }])
    await expect(verifyRoadReport('report-1', 'CONFIRM')).resolves.toBe(evidence)
    await expect(retractRoadReportVerification('report-1')).resolves.toBe(evidence)
    await expect(resolveRoadReport('report-1')).resolves.toEqual({ ...report, status: 'RESOLVED', images: [] })
    expect(get).toHaveBeenCalledWith('/api/v1/road-reports/mine', { signal: undefined })
    expect(put).toHaveBeenCalledWith('/api/v1/road-reports/report-1/verification', { verdict: 'CONFIRM' })
    expect(remove).toHaveBeenCalledWith('/api/v1/road-reports/report-1/verification')
    expect(patch).toHaveBeenCalledWith('/api/v1/road-reports/report-1', { status: 'RESOLVED' })
  })

  it('creates a multipart report with repeated image fields and normalizes its image URL', async () => {
    const images = [
      new File(['one'], 'one.webp', { type: 'image/webp' }),
      new File(['two'], 'two.webp', { type: 'image/webp' }),
    ]
    post.mockResolvedValue({ data: { data: { ...report, images: ['/api/v1/road-report-images/55555555-5555-4555-8555-555555555555'] } } })

    await expect(createRoadReport({
      category: 'CONSTRUCTION',
      description: 'Road works',
      latitude: 1.5,
      longitude: 2.5,
      images,
    })).resolves.toEqual({ ...report, images: ['https://api.example.test/api/v1/road-report-images/55555555-5555-4555-8555-555555555555'] })

    expect(post).toHaveBeenCalledWith('/api/v1/road-reports', expect.any(FormData))
    const body = post.mock.calls[0][1] as FormData
    expect(body.get('category')).toBe('CONSTRUCTION')
    expect(body.get('description')).toBe('Road works')
    expect(body.get('latitude')).toBe('1.5')
    expect(body.get('longitude')).toBe('2.5')
    expect(body.getAll('images')).toHaveLength(2)
    expect(body.getAll('images')).toEqual(images)
  })
})

describe('road report image URL validation', () => {
  const path = '/api/v1/road-report-images/11111111-1111-4111-8111-111111111111'

  it('accepts only the image endpoint as a relative URL or same-origin HTTPS URL', () => {
    expect(resolveRoadReportImageUrl(path)).toBe(`https://api.example.test${path}`)
    expect(resolveRoadReportImageUrl(`https://api.example.test${path}`)).toBe(`https://api.example.test${path}`)
  })

  it.each([
    `http://api.example.test${path}`,
    `https://cdn.example.test${path}`,
    '/api/v1/road-report-images/not-a-uuid',
    `${path}?download=1`,
    '//api.example.test/api/v1/road-report-images/11111111-1111-4111-8111-111111111111',
    '/images/one.webp',
  ])('rejects %s', (source) => {
    expect(resolveRoadReportImageUrl(source)).toBeNull()
  })

  it('preserves the configured base URL without adding a duplicate slash', () => {
    expect(apiBaseURL).toBe('https://api.example.test')
  })
})
