import type { RoadReport, RouteOption } from '@/types'

const ACCURATE_FIX_METERS = 50
const REROUTE_COOLDOWN_MS = 120_000
const REPORT_ROUTE_DISTANCE_METERS = 100

export type OriginSource = 'CURRENT_LOCATION' | 'OTHER'
export type RouteGuidanceEligibility =
  | { eligible: true; code: 'ELIGIBLE'; message: 'Live location is ready at the route start.' }
  | { eligible: false; code: 'ORIGIN_NOT_CURRENT_LOCATION' | 'NO_FIX' | 'STALE_FIX' | 'INACCURATE_FIX' | 'TOO_FAR'; message: string }

type GuidanceFix = { latitude: number; longitude: number; accuracy: number; timestamp: number }

export function routeGuidanceEligibility(origin: { latitude: number; longitude: number }, source: OriginSource, fix: GuidanceFix | null, now = Date.now()): RouteGuidanceEligibility {
  if (source === 'OTHER') return { eligible: false, code: 'ORIGIN_NOT_CURRENT_LOCATION', message: 'Use current location as the route origin to start guidance.' }
  if (!fix) return { eligible: false, code: 'NO_FIX', message: 'Live location is unavailable. Use current location or allow precise location.' }
  if (!Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 100) return { eligible: false, code: 'INACCURATE_FIX', message: 'Live location accuracy must be within 100 m.' }
  if (!Number.isFinite(fix.timestamp) || now - fix.timestamp > 15_000) return { eligible: false, code: 'STALE_FIX', message: 'Live location is stale. Wait for a fresh location fix.' }
  if (distanceMeters(origin, fix) > 150) return { eligible: false, code: 'TOO_FAR', message: 'Move within 150 m of the route start.' }
  return { eligible: true, code: 'ELIGIBLE', message: 'Live location is ready at the route start.' }
}

export function canStartNavigationFrom(origin: { latitude: number; longitude: number }, source: OriginSource, fix: GuidanceFix | null, now = Date.now()) {
  return routeGuidanceEligibility(origin, source, fix, now).eligible
}

export function isArrivalFix(destination: { latitude: number; longitude: number }, fix: { latitude: number; longitude: number; accuracy: number } | null) {
  return Boolean(fix && fix.accuracy <= 100 && distanceMeters(destination, fix) <= 50)
}

export function shouldTriggerOffRouteReroute(input: { consecutiveFixes: number; isOffRoute: boolean; accuracy: number; now: number; lastRerouteAt: number }) {
  const consecutiveFixes = input.isOffRoute && input.accuracy <= ACCURATE_FIX_METERS ? input.consecutiveFixes + 1 : 0
  return { consecutiveFixes, trigger: consecutiveFixes >= 3 && input.now - input.lastRerouteAt >= REROUTE_COOLDOWN_MS }
}

function decodePolyline(encoded: string) {
  const path: Array<{ latitude: number; longitude: number }> = []
  let index = 0, latitude = 0, longitude = 0
  while (index < encoded.length) {
    let result = 0, shift = 0, byte: number
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    latitude += result & 1 ? ~(result >> 1) : result >> 1
    result = 0; shift = 0
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    longitude += result & 1 ? ~(result >> 1) : result >> 1
    path.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 })
  }
  return path
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRadians = (value: number) => value * Math.PI / 180
  const latitudeA = toRadians(a.latitude)
  const latitudeB = toRadians(b.latitude)
  const deltaLatitude = latitudeB - latitudeA
  const deltaLongitude = toRadians(b.longitude - a.longitude)
  const value = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function pointToSegmentDistanceMeters(point: { latitude: number; longitude: number }, start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }) {
  const latitudeScale = 111_320
  const longitudeScale = Math.max(1, latitudeScale * Math.cos(point.latitude * Math.PI / 180))
  const ax = (start.longitude - point.longitude) * longitudeScale
  const ay = (start.latitude - point.latitude) * latitudeScale
  const bx = (end.longitude - point.longitude) * longitudeScale
  const by = (end.latitude - point.latitude) * latitudeScale
  const dx = bx - ax, dy = by - ay
  const progress = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(ax + progress * dx, ay + progress * dy)
}

export function hazardReportIds(route: RouteOption, reports: RoadReport[]) {
  const existing = new Set(route.hazardSummary.reports.map((report) => report.id))
  const path = decodePolyline(route.encodedPolyline)
  return reports.filter((report) =>
    !existing.has(report.id) &&
    (report.category === 'BLOCKED_PATH' || report.category === 'CRASH') &&
    report.status !== 'RESOLVED' &&
    report.verification.confirmations > report.verification.disputes &&
    report.verification.confirmations > 0 &&
    (path.length === 1 ? distanceMeters(report, path[0]) : path.slice(0, -1).some((point, index) => pointToSegmentDistanceMeters(report, point, path[index + 1]) <= REPORT_ROUTE_DISTANCE_METERS)),
  ).map((report) => report.id).sort()
}
