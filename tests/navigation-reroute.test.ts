import { canStartNavigationFrom, hazardReportIds, isArrivalFix, routeGuidanceEligibility, shouldTriggerOffRouteReroute, type OriginSource } from '@/lib/navigation-reroute'
import type { RoadReport, RouteOption } from '@/types'

const route = {
  encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  hazardSummary: { reports: [{ id: 'existing', category: 'CRASH' }] },
} as RouteOption

const report = {
  id: 'new',
  category: 'BLOCKED_PATH',
  latitude: 38.5,
  longitude: -120.2,
  verification: { confirmations: 2, disputes: 0, viewerVerdict: null },
  trust: { level: 'HIGH', score: 80, kind: 'EVIDENCE_SCORE', factors: { recency: 30, photos: 20, voteBalance: 30 } },
} as RoadReport

describe('navigation reroute decisions', () => {
  it('requires a fresh nearby accurate raw fix to start and confirm arrival', () => {
    const now = 1_000_000
    const place = { latitude: -6.2, longitude: 106.8 }
    const currentLocation: OriginSource = 'CURRENT_LOCATION'
    expect(routeGuidanceEligibility(place, 'OTHER', { ...place, accuracy: 20, timestamp: now }, now)).toEqual({ eligible: false, code: 'ORIGIN_NOT_CURRENT_LOCATION', message: 'Gunakan lokasi saat ini sebagai titik awal untuk memulai navigasi.' })
    expect(routeGuidanceEligibility(place, currentLocation, null, now)).toEqual({ eligible: false, code: 'NO_FIX', message: 'Lokasi langsung tidak tersedia. Gunakan lokasi saat ini atau izinkan lokasi presisi.' })
    expect(routeGuidanceEligibility(place, currentLocation, { ...place, accuracy: 80, timestamp: now - 15_001 }, now)).toEqual({ eligible: false, code: 'STALE_FIX', message: 'Lokasi sudah kedaluwarsa. Tunggu pembaruan lokasi.' })
    expect(routeGuidanceEligibility(place, currentLocation, { ...place, accuracy: 100.01, timestamp: now }, now)).toEqual({ eligible: false, code: 'INACCURATE_FIX', message: 'Akurasi lokasi harus berada dalam radius 100 m.' })
    expect(routeGuidanceEligibility(place, currentLocation, { latitude: -6.19864, longitude: 106.8, accuracy: 20, timestamp: now }, now)).toEqual({ eligible: false, code: 'TOO_FAR', message: 'Bergeraklah hingga berjarak maksimal 150 m dari titik awal rute.' })
    expect(routeGuidanceEligibility(place, currentLocation, { ...place, accuracy: 100, timestamp: now - 15_000 }, now)).toEqual({ eligible: true, code: 'ELIGIBLE', message: 'Lokasi saat ini siap di titik awal rute.' })
    expect(canStartNavigationFrom(place, currentLocation, { ...place, accuracy: 100, timestamp: now - 15_000 }, now)).toBe(true)
    expect(canStartNavigationFrom(place, 'OTHER', { ...place, accuracy: 20, timestamp: now }, now)).toBe(false)
    expect(isArrivalFix(place, { ...place, accuracy: 25, timestamp: now })).toBe(true)
    expect(isArrivalFix(place, { ...place, accuracy: 101, timestamp: now })).toBe(false)
  })

  it('requires three consecutive accurate off-route fixes and enforces cooldown', () => {
    expect(shouldTriggerOffRouteReroute({ consecutiveFixes: 2, isOffRoute: true, accuracy: 20, now: 200_000, lastRerouteAt: 0 })).toEqual({ consecutiveFixes: 3, trigger: true })
    expect(shouldTriggerOffRouteReroute({ consecutiveFixes: 2, isOffRoute: true, accuracy: 20, now: 100_000, lastRerouteAt: 0 })).toEqual({ consecutiveFixes: 3, trigger: false })
    expect(shouldTriggerOffRouteReroute({ consecutiveFixes: 2, isOffRoute: true, accuracy: 80, now: 200_000, lastRerouteAt: 0 })).toEqual({ consecutiveFixes: 0, trigger: false })
  })

  it('returns only new confirmed blocked or crash reports near the selected route', () => {
    expect(hazardReportIds(route, [report])).toEqual(['new'])
    expect(hazardReportIds(route, [{ ...report, id: 'unconfirmed', verification: { confirmations: 0, disputes: 0, viewerVerdict: null } }])).toEqual([])
  })
})
