import { clearRouteSummary, getRouteSummary, ROUTE_SUMMARY_KEY, saveRouteSummary } from '@/lib/route-summary'
import type { RouteOption } from '@/types'

const route: RouteOption = {
  id: 'route-secret-id',
  labels: ['RECOMMENDED'],
  durationSeconds: 900,
  distanceMeters: 4200,
  estimatedExposureIndex: 120,
  exposureUnit: 'ug_m3_minutes',
  reductionFromFastestPercent: 22,
  encodedPolyline: 'secret-polyline',
  dataQuality: 'modeled_estimate',
  airQualityTimestamp: '2026-09-01T00:00:00.000Z',
  averagePm25: 8.5,
  airQualitySamples: [{ latitude: -6.2, longitude: 106.8, pm25: 8.5 }],
}

beforeEach(() => {
  localStorage.clear()
  jest.useFakeTimers().setSystemTime(new Date('2026-09-01T12:00:00.000Z'))
})

afterEach(() => jest.useRealTimers())

describe('saveRouteSummary', () => {
  it('saves a versioned reduced snapshot with a safe itinerary label', () => {
    expect(saveRouteSummary({ selectedModes: ['WALK', 'BUS'], preference: 'lower-exposure', route })).toBe(true)
    expect(JSON.parse(localStorage.getItem(ROUTE_SUMMARY_KEY)!)).toEqual({
      version: 2,
      savedAt: '2026-09-01T12:00:00.000Z',
      expiresAt: '2026-09-02T12:00:00.000Z',
      modeLabel: 'Jalan + Bus',
      preference: 'lower-exposure',
      route: {
        labels: ['RECOMMENDED'],
        durationSeconds: 900,
        distanceMeters: 4200,
        estimatedExposureIndex: 120,
        exposureUnit: 'ug_m3_minutes',
        reductionFromFastestPercent: 22,
        dataQuality: 'modeled_estimate',
        airQualityTimestamp: '2026-09-01T00:00:00.000Z',
        averagePm25: 8.5,
      },
    })
  })

  it.each(['BUS', 'TRAIN', 'SUBWAY'] as const)('stores %s safely and specifically without coordinates', (mode) => {
    saveRouteSummary({ selectedModes: [mode], preference: 'balanced', route })
    const saved = localStorage.getItem(ROUTE_SUMMARY_KEY)!
    expect(JSON.parse(saved).modeLabel).toBe(mode === 'BUS' ? 'Bus' : mode === 'TRAIN' ? 'Kereta' : 'MRT')
    expect(saved).not.toContain('latitude')
    expect(saved).not.toContain('longitude')
  })

  it('replaces the previous snapshot', () => {
    saveRouteSummary({ selectedModes: ['WALK'], preference: 'balanced', route })
    saveRouteSummary({ selectedModes: ['BICYCLE'], preference: 'lower-exposure', route: { ...route, durationSeconds: 600 } })

    const saved = JSON.parse(localStorage.getItem(ROUTE_SUMMARY_KEY)!)
    expect(saved.origin).toBeUndefined()
    expect(saved.destination).toBeUndefined()
    expect(saved.modeLabel).toBe('Sepeda')
    expect(saved.route.durationSeconds).toBe(600)
    expect(localStorage).toHaveLength(1)
  })

  it('omits coordinates, place and route IDs, sensitive flags, polylines, samples, details, and user data', () => {
    saveRouteSummary({ selectedModes: ['BICYCLE'], preference: 'balanced', route })

    const saved = localStorage.getItem(ROUTE_SUMMARY_KEY)!
    for (const omitted of ['place-origin', 'place-destination', 'route-secret-id', 'secret-polyline', 'latitude', 'longitude', 'sensitiveUser', 'airQualitySamples', 'User-selected detail', 'user']) {
      expect(saved).not.toContain(omitted)
    }
  })

  it('expires after 24 hours and can be cleared on logout', () => {
    saveRouteSummary({ selectedModes: ['WALK'], preference: 'balanced', route })
    expect(getRouteSummary()).not.toBeNull()
    jest.setSystemTime(new Date('2026-09-02T12:00:00.001Z'))
    expect(getRouteSummary()).toBeNull()
    saveRouteSummary({ selectedModes: ['WALK'], preference: 'balanced', route })
    clearRouteSummary()
    expect(localStorage.getItem(ROUTE_SUMMARY_KEY)).toBeNull()
  })

  it('rejects and removes legacy v1 summaries', () => {
    localStorage.setItem(ROUTE_SUMMARY_KEY, JSON.stringify({ version: 1, expiresAt: '2026-09-02T13:00:00.000Z', route: {} }))
    expect(getRouteSummary()).toBeNull()
    expect(localStorage.getItem(ROUTE_SUMMARY_KEY)).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    const storage = { setItem: () => { throw new DOMException('Blocked', 'SecurityError') } }
    expect(() => saveRouteSummary({ selectedModes: ['WALK'], preference: 'balanced', route }, storage)).not.toThrow()
    expect(saveRouteSummary({ selectedModes: ['WALK'], preference: 'balanced', route }, storage)).toBe(false)
  })
})
