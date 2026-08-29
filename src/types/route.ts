import type { Place } from './place'

export type TravelMode = 'WALK' | 'BICYCLE'
export type RoutePreference = 'balanced' | 'lower-exposure'

export type PlannerRequest = {
  origin: Place
  destination: Place
  mode: TravelMode
  preference: RoutePreference
  sensitiveUser: boolean
}

export type RouteOption = {
  id: string
  labels: Array<'FASTEST' | 'RECOMMENDED' | 'LOWEST_EXPOSURE'>
  durationSeconds: number
  distanceMeters: number
  estimatedExposureIndex: number
  exposureUnit: 'ug_m3_minutes'
  reductionFromFastestPercent: number
  encodedPolyline: string
  dataQuality: 'modeled_estimate' | 'partial_estimate'
  airQualityTimestamp: string
  averagePm25: number
  airQualitySamples: Array<{ latitude: number; longitude: number; pm25: number }>
}

export type WeatherConditions = {
  status: 'available'
  observedAt: string
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
  ruleVersion: 'weather-advisory-v1'
}

export type RouteComparison = {
  comparisonId: string
  routes: RouteOption[]
  weather: WeatherConditions
  weatherPoints: Array<{ latitude: number; longitude: number; conditions: WeatherConditions }>
  weatherPointsByRoute: Record<string, Array<{ latitude: number; longitude: number; conditions: WeatherConditions }>>
  weatherAdvisory: WeatherAdvisory
  sourceDisclosure: {
    route: string
    airQuality: string
    weather: string
    customScore: true
  }
  warnings: string[]
}
