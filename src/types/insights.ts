import type { AccessibilityMode, RoutePreference, TransitMode, TransitPreference, TravelMode } from './route'

export type CommuteLocation = { label: string; latitude: number; longitude: number }
export type SavedCommuteInput = {
  name: string
  origin: CommuteLocation
  destination: CommuteLocation
  mode: TravelMode
  preference: RoutePreference
  sensitiveUser: boolean
  transitModes?: TransitMode[]
  transitPreference?: TransitPreference | null
  accessibilityMode: AccessibilityMode
  watchEnabled: boolean
  watchHour: number | null
}
export type SavedCommute = SavedCommuteInput & { id: string; createdAt: string; updatedAt: string }
export type TripImpact = { id: string; comparisonId: string; routeResultId: string; mode: TravelMode; distanceMeters: number; durationSeconds: number; activeDistanceMeters: number; activeDurationSeconds: number; baselineExposureIndex: number; selectedExposureIndex: number; fewerConfirmedReportSignals: number; completedAt: string }
export type TripImpactSummary = { completedTrips: number; activeTravelDistanceMeters: number; activeTravelDurationSeconds: number; modeledExposureIndexBaseline: number; modeledExposureIndexSelected: number; modeledExposureIndexReduction: number; fewerConfirmedReportSignals: number; disclaimer: string }
