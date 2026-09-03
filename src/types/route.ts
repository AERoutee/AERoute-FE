import type { Place } from './place'

export type TravelMode = 'WALK' | 'BICYCLE' | 'TRANSIT'
export type DirectTravelMode = 'WALK' | 'BICYCLE' | 'BUS' | 'TRAIN' | 'SUBWAY'
export type RoutePreference = 'balanced' | 'lower-exposure'
export type TransitMode = 'BUS' | 'TRAIN' | 'SUBWAY' | 'LIGHT_RAIL' | 'RAIL'
export type TransitPreference = 'LESS_WALKING' | 'FEWER_TRANSFERS'
export type AccessibilityMode = 'STANDARD' | 'REDUCED_EXERTION'
export type HazardPolicy = 'ADVISORY_ONLY' | 'PREFER_FEWER_REPORTS'
export type AccessPlan = { firstMileMode: 'BICYCLE'; lastMileMode: 'WALK'; bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' }
export type LiveLocation = { latitude: number; longitude: number; accuracy: number; heading: number; speed: number | null; timestamp: number }

export type PlannerRequest = {
  origin: Place
  destination: Place
  mode: TravelMode
  preference: RoutePreference
  sensitiveUser: boolean
  transitModes?: TransitMode[]
  transitPreference?: TransitPreference
  accessPlan?: AccessPlan
  accessibilityMode: AccessibilityMode
  departureOffsetsMinutes: Array<0 | 30 | 60>
  hazardPolicy: HazardPolicy
  includeRestStops: boolean
}

export type RouteTaskId = TravelMode | 'BIKE_TRANSIT' | 'TRANSIT_FALLBACK'
export type RouteComparisonTask = { id: RouteTaskId; label: string; selectedModes: DirectTravelMode[]; request: PlannerRequest }
export type RouteComparisonOutcome = { task: RouteComparisonTask; status: 'success'; comparison: RouteComparison } | { task: RouteComparisonTask; status: 'error'; error: Error & { code?: string; retryable?: boolean } }
export type RouteView = { key: string; taskId: RouteTaskId; selectedModes: DirectTravelMode[]; modeLabel: string; request: PlannerRequest; comparison: RouteComparison; route: RouteOption }

export type WeatherConditions = {
  status: 'available'
  observedAt: string
  targetTime?: string
  forecastOffsetMinutes: number
  conditionType: string
  condition: string
  isDaytime: boolean
  temperatureC: number
  feelsLikeC: number
  heatIndexC: number
  humidityPercent: number
  uvIndex: number
  precipitationProbabilityPercent: number
  thunderstormProbabilityPercent: number
  windSpeedKph: number
  windGustKph: number
  visibilityKm: number
} | { status: 'unavailable' }

export type WeatherAdvisory = {
  level: 'NORMAL' | 'CAUTION' | 'DELAY' | 'UNAVAILABLE'
  reasons: Array<{ code: string; message: string }>
  ruleVersion: 'weather-advisory-v2'
}

export type HeatUvSummary = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  maxFeelsLikeC: number | null
  maxHeatIndexC: number | null
  maxUvIndex: number | null
  breakRecommendation: 'NONE' | 'CONSIDER' | 'RECOMMENDED'
  reasons: string[]
}

export type HazardSummary = {
  level: 'NONE_REPORTED' | 'LOW' | 'MEDIUM' | 'HIGH'
  reports: Array<{ id: string; category: string; distanceMeters: number; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; confirmations: number; disputes: number }>
  nearbyCount: number
  confirmedCount: number
  fewerConfirmedReportSignals: number
  confirmedReportSignalScore: number
  limitations: string[]
}

export type TransitStation = { name: string; location?: { latitude: number; longitude: number } }
type TransitSegmentDetails = { lineName?: string; lineShortName?: string; vehicleType?: string; headsign?: string; departureStop?: TransitStation; arrivalStop?: TransitStation; stopCount?: number; durationSeconds?: number; distanceMeters?: number; encodedPolyline?: string; startLocation?: { latitude: number; longitude: number }; endLocation?: { latitude: number; longitude: number }; departureTime?: string; arrivalTime?: string }
export type TransitSegment = TransitSegmentDetails & ({ travelMode: string; mode?: never; role?: never; source?: never; location?: never } | { travelMode?: never; role: 'FIRST_MILE' | 'WAIT' | 'TRANSIT_RIDE' | 'TRANSFER_WALK' | 'LAST_MILE'; source: 'GOOGLE_ROUTES' | 'DERIVED_FROM_TRANSIT_SCHEDULE'; mode: 'BICYCLE' | 'WAIT' | 'TRANSIT' | 'WALK'; durationSeconds: number; distanceMeters: number; location?: { latitude: number; longitude: number } })
export type TransitStop = { name: string; location: { latitude: number; longitude: number }; ordinal: number; role: 'departure' | 'arrival'; vehicleType: string; line?: string; headsign?: string; label: string }
export type TransitSummary = {
  walkingDurationSeconds: number | null
  walkingDistanceMeters: number | null
  transfers: number
  segments: TransitSegment[]
  stations: TransitStation[]
  preferredTransitModes?: string[]
  actualTransitModes?: string[]
}

export type RouteOption = {
  id: string
  routeResultId?: string
  labels: Array<'FASTEST' | 'RECOMMENDED' | 'LOWEST_EXPOSURE'>
  providerLabels: string[]
  durationSeconds: number
  distanceMeters: number
  estimatedExposureIndex: number
  exposureUnit: 'ug_m3_minutes'
  reductionFromFastestPercent: number
  reductionPercent: number
  encodedPolyline: string
  dataQuality: 'modeled_estimate' | 'partial_estimate'
  airQualityTimestamp: string
  averagePm25: number
  airQualitySampleCount: number
  airQualityExpectedSampleCount: number
  airQualitySamples: Array<{ latitude: number; longitude: number; pm25: number }>
  hazardSummary: HazardSummary
  confidence: { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; kind: 'EVIDENCE_COMPLETENESS'; isProbability: false; factors: { airQualityCoverage: number; weatherCoverage: number; hazardCoverage: number; routeProvider: number }; limitations: string[] }
  explanation: { summary: string; reasons: string[]; tradeoffs: string[]; limitations: string[]; ruleVersion: 'route-ranking-v2' }
  heatUv: HeatUvSummary
  weatherConditions: WeatherConditions[]
  transitSummary?: TransitSummary
  composition?: 'PROVIDER_SEGMENTS'
  scheduleStatus?: 'SCHEDULE_VALIDATED'
  limitations?: string[]
  accessibility: { mode: AccessibilityMode; assessment: 'STANDARD' | 'APPROXIMATION'; reasons: string[]; limitations: string[] }
}

export type DepartureComparison = {
  offsetMinutes: 0 | 30 | 60
  status: 'AVAILABLE'
  routes: RouteOption[]
  recommendedRouteId: string
  temporalResolution: 'CURRENT_CONDITIONS' | 'HOURLY_BUCKET'
  approximate: boolean
  weatherAdvisory: WeatherAdvisory
  heatUv: HeatUvSummary
} | {
  offsetMinutes: 0 | 30 | 60
  status: 'UNAVAILABLE'
  routes: []
  recommendedRouteId: null
  temporalResolution: 'HOURLY_BUCKET'
  approximate: true
  warning: string
}

export type PlaceAccessibility = {
  wheelchairAccessibleEntrance?: boolean
  wheelchairAccessibleParking?: boolean
  wheelchairAccessibleRestroom?: boolean
  wheelchairAccessibleSeating?: boolean
}

export type PlacePhoto = { name: string; widthPx?: number; heightPx?: number; googleMapsUri?: string; flagContentUri?: string; authorAttributions?: Array<{ displayName: string; uri?: string; photoUri?: string }> }
export type RestStopCandidate = {
  id: string
  associationId?: string
  name: string
  formattedAddress?: string
  location: { latitude: number; longitude: number }
  types: string[]
  openNow?: boolean
  restroom?: boolean
  accessibility?: PlaceAccessibility
  photos?: PlacePhoto[]
  googleMapsUri?: string
  safetyVerified: false
}

export type ParkingOptions = { freeParkingLot?: boolean; paidParkingLot?: boolean; freeStreetParking?: boolean; paidStreetParking?: boolean; valetParking?: boolean; freeGarageParking?: boolean; paidGarageParking?: boolean }
export type TransitStopDetailsResult = { status: 'AVAILABLE'; place: RestStopCandidate & { parkingOptions?: ParkingOptions } } | { status: 'NOT_FOUND' }
export type RestStopResult = { status: 'AVAILABLE' | 'NOT_REQUESTED'; candidates: RestStopCandidate[] } | { status: 'UNAVAILABLE'; candidates: []; warning: string }

export type RouteComparison = {
  comparisonId: string
  persisted: boolean
  calculationVersion: 'route-intelligence-v2'
  routes: RouteOption[]
  departureComparisons: DepartureComparison[]
  cleanestDeparture: 0 | 30 | 60
  weather: WeatherConditions
  weatherPoints: Array<{ latitude: number; longitude: number; conditions: WeatherConditions }>
  weatherPointsByRoute: Record<string, Array<{ latitude: number; longitude: number; conditions: WeatherConditions }>>
  weatherAdvisory: WeatherAdvisory
  heatUv: HeatUvSummary
  restStopCandidates: RestStopResult
  sourceDisclosure: { route: string; airQuality: string; weather: string; places: string; communityReports: string; temporalResolution: string; customScore: true }
  warnings: string[]
}
