import type { DirectTravelMode, Place, PlannerRequest, RouteComparison, RouteComparisonTask, RouteOption, RouteTaskId, RouteView, SavedCommute, SavedCommuteInput, TransitMode, TransitSegment, TransitStop, TravelMode } from '@/types'

const modeNames: Record<DirectTravelMode, string> = { WALK: 'Walk', BICYCLE: 'Cycle', BUS: 'Bus', TRAIN: 'Train', SUBWAY: 'Subway' }
const modeOrder: DirectTravelMode[] = ['WALK', 'BICYCLE', 'BUS', 'TRAIN', 'SUBWAY']
const transitModes = new Set<DirectTravelMode>(['BUS', 'TRAIN', 'SUBWAY'])

function orderedModes(modes: readonly DirectTravelMode[]) {
  return modeOrder.filter((mode) => modes.includes(mode))
}

export function selectedModeLabel(modes: readonly DirectTravelMode[]) {
  return orderedModes(modes).map((mode) => modeNames[mode]).join(' + ')
}

export function directModeRequest(modes: readonly DirectTravelMode[]): { mode: TravelMode; transitModes?: TransitMode[]; label: string } {
  const transit = modes.filter((mode): mode is Extract<DirectTravelMode, TransitMode> => transitModes.has(mode))
  if (transit.length) return { mode: 'TRANSIT', transitModes: transit, label: selectedModeLabel(modes) }
  const mode = modes[0] === 'BICYCLE' ? 'BICYCLE' : 'WALK'
  return { mode, label: modeNames[mode] }
}

export const itineraryModeRequest = directModeRequest

export function itineraryModeRequests(modes: readonly DirectTravelMode[], common: Omit<PlannerRequest, 'mode' | 'transitModes'>): RouteComparisonTask[] {
  const ordered = orderedModes(modes)
  const transit = ordered.filter((mode): mode is Extract<DirectTravelMode, TransitMode> => transitModes.has(mode))
  const { transitPreference, ...active } = common
  if (ordered.includes('BICYCLE') && transit.length) {
    const transitLabel = selectedModeLabel(transit)
    const compositeLabel = `Cycle + ${transitLabel}${ordered.includes('WALK') ? ' + Walk' : ''}`
    const transitRequest = { ...common, mode: 'TRANSIT' as const, transitModes: transit, transitPreference }
    return [
      { id: 'BIKE_TRANSIT', label: compositeLabel, selectedModes: ordered, request: { ...transitRequest, accessPlan: { firstMileMode: 'BICYCLE', lastMileMode: 'WALK', bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' }, departureOffsetsMinutes: [0], includeRestStops: false } },
      { id: 'TRANSIT_FALLBACK', label: transitLabel, selectedModes: transit, request: transitRequest },
    ]
  }
  if (ordered.includes('WALK') && ordered.includes('BICYCLE')) return [
    { id: 'WALK', label: 'Walk', selectedModes: ['WALK'], request: { ...active, mode: 'WALK' } },
    { id: 'BICYCLE', label: 'Cycle', selectedModes: ['BICYCLE'], request: { ...active, mode: 'BICYCLE' } },
  ]
  const config = directModeRequest(ordered)
  return [{ id: config.mode, label: config.label, selectedModes: ordered, request: { ...active, mode: config.mode, ...(config.mode === 'TRANSIT' ? { transitModes: config.transitModes, transitPreference } : {}) } }]
}

export function savedCommuteSelectedModes(commute?: SavedCommute): DirectTravelMode[] {
  if (!commute) return ['WALK']
  if (commute.mode !== 'TRANSIT') return [commute.mode]
  const modes = [...new Set(commute.transitModes?.flatMap((mode): DirectTravelMode[] => mode === 'BUS' || mode === 'SUBWAY' ? [mode] : mode === 'TRAIN' || mode === 'LIGHT_RAIL' ? ['TRAIN'] : []) ?? [])].slice(0, 2)
  return modes.length ? modes : ['BUS']
}

export function savedCommuteRequest(commute: SavedCommute, origin: Place, destination: Place, defaults: Pick<PlannerRequest, 'departureOffsetsMinutes' | 'hazardPolicy' | 'includeRestStops'>): PlannerRequest {
  return { origin, destination, mode: commute.mode, preference: commute.preference, sensitiveUser: commute.sensitiveUser, ...(commute.mode === 'TRANSIT' ? { ...(commute.transitModes?.length ? { transitModes: commute.transitModes } : {}), ...(commute.transitPreference ? { transitPreference: commute.transitPreference } : {}) } : {}), accessibilityMode: commute.accessibilityMode, ...defaults }
}

export function nextModeSelection(current: readonly DirectTravelMode[], mode: DirectTravelMode): DirectTravelMode[] {
  if (current.includes(mode)) return current.length === 1 ? [...current] : orderedModes(current.filter((item) => item !== mode))
  if (current.length === 3) return [...current]
  return orderedModes([...current, mode])
}

export function routeViews(taskId: RouteTaskId, selectedModes: readonly DirectTravelMode[], request: PlannerRequest, comparison: RouteComparison): RouteView[] {
  const modes = [...selectedModes]
  const modeLabel = selectedModeLabel(modes)
  return comparison.routes.map((route) => ({ key: `${taskId}:${comparison.comparisonId}:${route.id}`, taskId, selectedModes: modes, modeLabel, request, comparison, route }))
}

export function initialRouteView(views: RouteView[]) {
  return views.find((view) => view.route.labels.includes('RECOMMENDED')) ?? views[0]
}

export function savedCommuteInput(view: RouteView): SavedCommuteInput {
  const { request } = view
  return { name: `${request.origin.label} to ${request.destination.label}`.slice(0, 80), origin: { label: request.origin.label, latitude: request.origin.latitude, longitude: request.origin.longitude }, destination: { label: request.destination.label, latitude: request.destination.latitude, longitude: request.destination.longitude }, mode: request.mode, preference: request.preference, sensitiveUser: request.sensitiveUser, ...(request.mode === 'TRANSIT' ? { transitModes: request.transitModes, transitPreference: request.transitPreference } : {}), accessibilityMode: request.accessibilityMode, watchEnabled: false, watchHour: null }
}

export function transitSegmentMode(segment: TransitSegment) {
  return segment.mode ?? segment.travelMode
}

export function transitStops(route?: RouteOption): TransitStop[] {
  let sequence = 0
  return route?.transitSummary?.segments.flatMap((segment) => {
    const mode = transitSegmentMode(segment)
    if (mode !== 'TRANSIT' && !segment.vehicleType) return []
    const vehicleType = segment.vehicleType ?? mode
    const marker = vehicleType === 'BUS' ? 'B' : vehicleType === 'SUBWAY' ? 'M' : 'T'
    const line = segment.lineShortName ?? segment.lineName
    return ([['departure', segment.departureStop], ['arrival', segment.arrivalStop]] as const).flatMap(([role, stop]) => {
      if (!stop?.location) return []
      sequence += 1
      return [{ name: stop.name, location: stop.location, ordinal: sequence, role, vehicleType, ...(line ? { line } : {}), ...(segment.headsign ? { headsign: segment.headsign } : {}), label: `${marker}${sequence}` }]
    })
  }) ?? []
}
