import type { DirectTravelMode, PlannerRequest, RouteComparison, RouteOption } from '@/types'

export function routeOption(id = 'route-1', labels: RouteOption['labels'] = ['RECOMMENDED']): RouteOption {
  return {
    id,
    routeResultId: `stored-${id}`,
    labels,
    providerLabels: [],
    durationSeconds: 1200,
    distanceMeters: 4000,
    estimatedExposureIndex: 100,
    exposureUnit: 'ug_m3_minutes',
    reductionFromFastestPercent: 20,
    reductionPercent: 20,
    encodedPolyline: 'encoded',
    dataQuality: 'modeled_estimate',
    airQualityTimestamp: '2026-09-01T00:00:00Z',
    averagePm25: 5,
    airQualitySampleCount: 5,
    airQualityExpectedSampleCount: 5,
    airQualitySamples: [],
    hazardSummary: { level: 'LOW', reports: [], nearbyCount: 1, confirmedCount: 0, fewerConfirmedReportSignals: 2, confirmedReportSignalScore: 0, limitations: [] },
    confidence: { score: 85, level: 'HIGH', kind: 'EVIDENCE_COMPLETENESS', isProbability: false, factors: { airQualityCoverage: 50, weatherCoverage: 20, hazardCoverage: 15, routeProvider: 15 }, limitations: [] },
    explanation: { summary: `Why ${id}`, reasons: [`Reason ${id}`], tradeoffs: [], limitations: [], ruleVersion: 'route-ranking-v2' },
    heatUv: { status: 'AVAILABLE', maxFeelsLikeC: 36, maxHeatIndexC: 37, maxUvIndex: 9, breakRecommendation: 'CONSIDER', reasons: [] },
    weatherConditions: [],
    accessibility: { mode: 'STANDARD', assessment: 'STANDARD', reasons: [], limitations: [] },
  }
}

export function plannerRequest(directMode: DirectTravelMode): PlannerRequest {
  const transit = directMode === 'BUS' || directMode === 'TRAIN' || directMode === 'SUBWAY'
  return {
    origin: { id: 'origin', label: 'Origin', detail: '', latitude: 1, longitude: 2 },
    destination: { id: 'destination', label: 'Destination', detail: '', latitude: 3, longitude: 4 },
    mode: transit ? 'TRANSIT' : directMode,
    preference: 'balanced',
    sensitiveUser: false,
    ...(transit ? { transitModes: [directMode], transitPreference: 'LESS_WALKING' as const } : {}),
    accessibilityMode: 'STANDARD',
    departureOffsetsMinutes: [0, 30, 60],
    hazardPolicy: 'PREFER_FEWER_REPORTS',
    includeRestStops: true,
  }
}

export function routeComparison(comparisonId: string, routes = [routeOption()]): RouteComparison {
  const heatUv = routes[0]?.heatUv ?? { status: 'UNAVAILABLE' as const, maxFeelsLikeC: null, maxHeatIndexC: null, maxUvIndex: null, breakRecommendation: 'NONE' as const, reasons: [] }
  return {
    comparisonId,
    persisted: true,
    calculationVersion: 'route-intelligence-v2',
    routes,
    cleanestDeparture: 0,
    departureComparisons: [
      { offsetMinutes: 0, status: 'AVAILABLE', routes, recommendedRouteId: routes[0]?.id ?? '', temporalResolution: 'CURRENT_CONDITIONS', approximate: false, weatherAdvisory: { level: 'NORMAL', reasons: [], ruleVersion: 'weather-advisory-v2' }, heatUv },
      { offsetMinutes: 30, status: 'UNAVAILABLE', routes: [], recommendedRouteId: null, temporalResolution: 'HOURLY_BUCKET', approximate: true, warning: 'Unavailable.' },
      { offsetMinutes: 60, status: 'UNAVAILABLE', routes: [], recommendedRouteId: null, temporalResolution: 'HOURLY_BUCKET', approximate: true, warning: 'Unavailable.' },
    ],
    weather: { status: 'unavailable' },
    weatherPoints: [],
    weatherPointsByRoute: {},
    weatherAdvisory: { level: 'NORMAL', reasons: [], ruleVersion: 'weather-advisory-v2' },
    heatUv,
    restStopCandidates: { status: 'AVAILABLE', candidates: [] },
    sourceDisclosure: { route: 'Route source', airQuality: 'Air source', weather: 'Weather source', places: 'Places source', communityReports: 'Reports source', temporalResolution: 'Current', customScore: true },
    warnings: [],
  }
}
