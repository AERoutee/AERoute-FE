import type { DirectTravelMode, RouteOption, RoutePreference } from '@/types'
import { selectedModeLabel } from './route-mode'

export const ROUTE_SUMMARY_KEY = 'aeroute:last-route-summary:v2'
const LEGACY_ROUTE_SUMMARY_KEY = 'aeroute:last-route-summary:v1'
const ROUTE_SUMMARY_TTL_MS = 24 * 60 * 60 * 1000

type RouteSummaryInput = {
  selectedModes: readonly DirectTravelMode[]
  preference: RoutePreference
  route: RouteOption
}

type SummaryStorage = Pick<Storage, 'setItem'>
type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>

export function saveRouteSummary(input: RouteSummaryInput, storage?: SummaryStorage) {
  try {
    const target = storage ?? localStorage
    const savedAt = new Date()
    target.setItem(ROUTE_SUMMARY_KEY, JSON.stringify({
      version: 2,
      savedAt: savedAt.toISOString(),
      expiresAt: new Date(savedAt.getTime() + ROUTE_SUMMARY_TTL_MS).toISOString(),
      modeLabel: selectedModeLabel(input.selectedModes),
      preference: input.preference,
      route: {
        labels: input.route.labels,
        durationSeconds: input.route.durationSeconds,
        distanceMeters: input.route.distanceMeters,
        estimatedExposureIndex: input.route.estimatedExposureIndex,
        exposureUnit: input.route.exposureUnit,
        reductionFromFastestPercent: input.route.reductionFromFastestPercent,
        dataQuality: input.route.dataQuality,
        airQualityTimestamp: input.route.airQualityTimestamp,
        averagePm25: input.route.averagePm25,
      },
    }))
    return true
  } catch {
    return false
  }
}

export function getRouteSummary(storage?: ReadStorage) {
  try {
    const target = storage ?? localStorage
    if (target.getItem(LEGACY_ROUTE_SUMMARY_KEY)) target.removeItem(LEGACY_ROUTE_SUMMARY_KEY)
    const summary = JSON.parse(target.getItem(ROUTE_SUMMARY_KEY) ?? 'null')
    if (!summary || summary.version !== 2 || typeof summary.expiresAt !== 'string' || Date.parse(summary.expiresAt) <= Date.now()) {
      target.removeItem(ROUTE_SUMMARY_KEY)
      return null
    }
    return summary
  } catch {
    return null
  }
}

export function clearRouteSummary(storage?: Pick<Storage, 'removeItem'>) {
  try {
    const target = storage ?? localStorage
    target.removeItem(ROUTE_SUMMARY_KEY)
    target.removeItem(LEGACY_ROUTE_SUMMARY_KEY)
  } catch {}
}
