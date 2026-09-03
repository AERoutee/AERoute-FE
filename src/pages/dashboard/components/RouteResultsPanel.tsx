import { Bike, BusFront, ChevronRight, Clock3, Footprints, GripHorizontal, ListTree, RefreshCw, Sparkles, TrainFront, TrainFrontTunnel, Wind, X } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { routeViews, transitSegmentMode } from '@/lib'
import type { RouteComparisonOutcome, RouteOption, RouteTaskId, RouteView, TransitSegment } from '@/types'

function routeTitle(route: RouteOption) {
  if (route.labels.includes('RECOMMENDED')) return 'Recommended'
  if (route.labels.includes('LOWEST_EXPOSURE')) return 'Lowest exposure'
  if (route.labels.includes('FASTEST')) return 'Fastest'
  return 'Alternative route'
}

function routeColor(route: RouteOption) {
  if (route.labels.includes('RECOMMENDED')) return '#087f5b'
  if (route.labels.includes('LOWEST_EXPOSURE')) return '#2457a7'
  if (route.labels.includes('FASTEST')) return '#a83b24'
  return '#4f6159'
}

function formatDuration(seconds?: number) {
  if (seconds === undefined) return null
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.round(minutes % 1440 / 60)}h`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes} min`
}

function formatDistance(meters?: number) {
  if (meters === undefined) return null
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

function breakValue(route: RouteOption) {
  if (route.heatUv.status === 'UNAVAILABLE') return 'Weather unavailable'
  const label = route.heatUv.breakRecommendation === 'NONE' ? 'No break threshold' : route.heatUv.breakRecommendation === 'CONSIDER' ? 'Consider a break' : 'Break recommended'
  const weather = route.heatUv.maxFeelsLikeC === null || route.heatUv.maxUvIndex === null ? '' : ` · ${route.heatUv.maxFeelsLikeC.toFixed(1)}°C / UV ${route.heatUv.maxUvIndex}`
  return `${label}${weather}`
}

function segmentVehicle(segment: TransitSegment) {
  const mode = transitSegmentMode(segment)
  if (segment.role === 'WAIT' || mode === 'WAIT') return 'WAIT'
  if (segment.role === 'FIRST_MILE') return 'BICYCLE'
  if (segment.role === 'TRANSFER_WALK' || segment.role === 'LAST_MILE') return 'WALK'
  return segment.vehicleType ?? mode ?? 'TRANSIT'
}

function transitVehicle(segment: TransitSegment) {
  const vehicle = segmentVehicle(segment)
  if (vehicle === 'WAIT') return { label: 'Wait', Icon: Clock3 }
  if (vehicle === 'BICYCLE') return { label: 'Cycle', Icon: Bike }
  if (vehicle === 'BUS') return { label: 'Bus', Icon: BusFront }
  if (vehicle === 'SUBWAY') return { label: 'Subway', Icon: TrainFrontTunnel }
  if (vehicle === 'WALK') return { label: 'Walk', Icon: Footprints }
  if (vehicle === 'TRAIN' || vehicle === 'RAIL' || vehicle === 'LIGHT_RAIL') return { label: 'Train', Icon: TrainFront }
  return { label: vehicle === 'TRANSIT' ? 'Transit' : vehicle.toLowerCase().replace(/^./, (value) => value.toUpperCase()), Icon: TrainFront }
}

function compactSegments(segments: readonly TransitSegment[]) {
  return segments.reduce<TransitSegment[]>((result, segment) => {
    const previous = result.at(-1)
    if (segmentVehicle(segment) === 'WALK' && previous && segmentVehicle(previous) === 'WALK') {
      previous.durationSeconds = (previous.durationSeconds ?? 0) + (segment.durationSeconds ?? 0)
      return result
    }
    result.push({ ...segment })
    return result
  }, [])
}

function compactToken(segment: TransitSegment) {
  const vehicle = segmentVehicle(segment)
  const { label, Icon } = transitVehicle(segment)
  const minutes = segment.durationSeconds === undefined ? null : Math.max(1, Math.round(segment.durationSeconds / 60))
  const line = segment.lineShortName ?? segment.lineName
  const timed = vehicle === 'WALK' || vehicle === 'BICYCLE' || vehicle === 'WAIT'
  return { label: `${label}${timed ? minutes === null ? '' : ` ${minutes}m` : line ? ` ${line}` : ''}`, accessibleLabel: `${label}${timed ? minutes === null ? '' : ` ${minutes} minute${minutes === 1 ? '' : 's'}` : line ? ` ${line}` : ''}`, Icon }
}

function ItineraryStrip({ route }: { route: RouteOption }) {
  const tokens = compactSegments(route.transitSummary?.segments ?? []).map(compactToken)
  if (!tokens.length) return null
  return <span className="mt-3 flex max-w-full flex-wrap items-center gap-1 pb-1" aria-label={tokens.map((token) => token.accessibleLabel).join(', ')}>{tokens.map(({ label, Icon }, index) => <span className="contents" key={`${label}-${index}`}>{index > 0 && <ChevronRight className="size-3.5 shrink-0 text-ae-muted" aria-hidden="true" />}<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ae-ink px-2 py-1 text-[11px] font-black text-white" data-itinerary-token><Icon className="size-3.5" aria-hidden="true" />{label}</span></span>)}</span>
}

type RouteResultsPanelProps = {
  groups: RouteComparisonOutcome[]
  selected?: RouteView
  isPending?: boolean
  onSelect: (key: string) => void
  onRetry: (id: RouteTaskId) => void
  canStartNavigation: boolean
  guidanceMessage?: string
  onStartNavigation?: () => void
  onClose: () => void
  onDesktopDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}

export function RouteResultsPanel({ groups, selected, isPending = false, onSelect, onRetry, canStartNavigation, guidanceMessage = canStartNavigation ? 'Live location is ready at the route start.' : 'Live location is unavailable. Use current location or allow precise location.', onStartNavigation, onClose, onDesktopDragStart, onDesktopDragMove, onDesktopDragEnd, onDesktopDragKeyDown }: RouteResultsPanelProps) {
  const comparison = selected?.comparison
  const route = selected?.route
  const futureWindows = comparison?.departureComparisons.some((window) => window.offsetMinutes > 0 && window.status === 'AVAILABLE')
  const hasResults = groups.some((group) => group.status === 'success' && group.comparison.routes.length > 0)
  const fallbackSucceeded = groups.some((group) => group.task.id === 'TRANSIT_FALLBACK' && group.status === 'success')
  const compositeSucceeded = groups.some((group) => group.task.id === 'BIKE_TRANSIT' && group.status === 'success')
  const compositeUnavailable = fallbackSucceeded && groups.some((group) => group.task.id === 'BIKE_TRANSIT' && group.status === 'error' && group.error.code === 'bike_transit_unavailable')
  const visibleGroupCount = groups.filter((group) => !(compositeSucceeded && group.task.id === 'TRANSIT_FALLBACK') && !(compositeUnavailable && group.task.id === 'BIKE_TRANSIT') && (group.status === 'error' || routeViews(group.task.id, group.task.selectedModes, group.task.request, group.comparison).length > 0)).length
  return <div className="flex h-full min-h-0 flex-col"><div className="flex h-14 shrink-0 items-center gap-3 border-b border-ae-line px-5"><button className="hidden min-w-0 flex-1 touch-none cursor-move items-center gap-3 text-left text-ae-muted lg:flex" type="button" aria-label="Drag route options panel" onPointerDown={onDesktopDragStart} onPointerMove={onDesktopDragMove} onPointerUp={onDesktopDragEnd} onPointerCancel={onDesktopDragEnd} onKeyDown={onDesktopDragKeyDown}><GripHorizontal className="size-5 shrink-0" aria-hidden="true" /><span className="truncate text-base font-black text-ae-ink">Route options</span></button><h2 className="m-0 flex-1 text-[15px] font-black lg:hidden">Route options</h2><button className="grid size-10 shrink-0 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close route options" onClick={onClose}><X className="size-5" aria-hidden="true" /></button></div><div className="h-0 flex-1 touch-pan-y overflow-y-scroll overscroll-y-contain p-5 [scrollbar-width:thin] [scrollbar-color:#b7c8c0_transparent] [-webkit-overflow-scrolling:touch] lg:h-auto">
    {groups.length === 0 && !isPending && <div className="grid place-items-center px-4 py-12 text-center text-ae-muted"><ListTree className="size-9 opacity-70" aria-hidden="true" /><strong className="mt-4 text-base font-black">No routes yet</strong><p className="mt-2 mb-0 max-w-56 text-sm leading-6 font-semibold">Compare two locations to see route options here.</p></div>}
    {isPending && !hasResults && <div className="grid gap-3" role="status"><span className="sr-only">Comparing routes.</span>{[1, 2, 3].map((item) => <div className="h-24 animate-pulse rounded-2xl bg-ae-canvas" key={item} />)}</div>}
    {groups.map((group) => {
      if (compositeSucceeded && group.task.id === 'TRANSIT_FALLBACK') return null
      if (group.status === 'error') return compositeUnavailable && group.task.id === 'BIKE_TRANSIT' ? null : <div className="mb-3 rounded-2xl border border-[#d99a8b] bg-[#fff1ed] p-4" role="alert" key={group.task.id}><strong className="block text-sm font-black text-ae-fastest">{group.task.label} route failed</strong><p className="mt-2 mb-3 text-sm font-semibold text-ae-muted">{group.error.message}</p>{group.error.retryable !== false && <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ae-ink px-4 text-sm font-black text-white hover:bg-ae-brand" type="button" aria-label={`Retry ${group.task.label} route`} onClick={() => onRetry(group.task.id)}><RefreshCw className="size-4" aria-hidden="true" />Retry route</button>}</div>
      const views = routeViews(group.task.id, group.task.selectedModes, group.task.request, group.comparison)
      if (!views.length) return null
      const headingId = `itinerary-mode-${group.task.id}`
      return <section className="mb-5" aria-labelledby={visibleGroupCount > 1 ? headingId : undefined} key={group.task.id}>{visibleGroupCount > 1 && <h3 className="mb-2 text-sm font-black" id={headingId}>{group.task.label}</h3>}<ul className="m-0 grid list-none gap-3 p-0" aria-label={`${group.task.label} route options`}>{views.map((view) => <li key={view.key}><button className={`flex w-full gap-3 rounded-2xl border bg-white p-4 text-left ${selected?.key === view.key ? 'border-ae-brand ring-2 ring-ae-brand/15' : 'border-ae-line hover:border-ae-brand'}`} type="button" aria-pressed={selected?.key === view.key} onClick={() => onSelect(view.key)}><span className="mt-1 h-14 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: routeColor(view.route) }} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><strong className="font-black">{routeTitle(view.route)}</strong>{view.route.labels.includes('RECOMMENDED') && <span className="inline-flex items-center gap-1 rounded-full bg-ae-brand px-2 py-1 text-[11px] font-black text-white"><Sparkles className="size-3" aria-hidden="true" />{view.route.labels.includes('FASTEST') && view.route.labels.includes('LOWEST_EXPOSURE') ? 'Best overall' : 'PM2.5/time trade-off'}</span>}</span><span className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="text-lg font-black lg:text-xl">{formatDuration(view.route.durationSeconds)}</strong><span className="text-xs font-bold text-ae-muted">{formatDistance(view.route.distanceMeters)}</span><span className="text-xs font-bold text-ae-muted">PM2.5 {view.route.averagePm25.toFixed(1)} µg/m³</span></span><ItineraryStrip route={view.route} />{view.route.reductionFromFastestPercent > 0 && <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-ae-brand"><Wind className="size-4" aria-hidden="true" />{view.route.reductionFromFastestPercent}% lower</span>}</span></button></li>)}</ul></section>
    })}
    {comparison && route && <div className="mt-5 grid gap-4 text-sm">
      <section className="rounded-xl border border-ae-line p-4" aria-labelledby="insights-title"><h3 className="m-0 text-sm font-black" id="insights-title">Trip insights</h3><dl className="mt-3 mb-0 grid grid-cols-2 gap-3"><div><dt className="text-xs font-black text-ae-muted">Best departure</dt><dd className="m-0 mt-1 font-black">{comparison.cleanestDeparture === 0 ? 'Now' : `+${comparison.cleanestDeparture} min`}</dd></div><div><dt className="text-xs font-black text-ae-muted">Break</dt><dd className="m-0 mt-1 font-black">{breakValue(route)}</dd>{route.heatUv.status === 'AVAILABLE' && route.heatUv.breakRecommendation !== 'NONE' && route.heatUv.reasons[0] && <small className="mt-1 block font-semibold text-ae-muted">{route.heatUv.reasons[0]}</small>}</div><div><dt className="text-xs font-black text-ae-muted">Evidence</dt><dd className="m-0 mt-1 font-black">{route.confidence.score}/100 completeness</dd></div><div><dt className="text-xs font-black text-ae-muted">Reports</dt><dd className="m-0 mt-1 font-black">{route.hazardSummary.nearbyCount === 0 ? 'No active reports nearby' : `${route.hazardSummary.nearbyCount} report signal${route.hazardSummary.nearbyCount === 1 ? '' : 's'} nearby`}</dd></div></dl>{futureWindows && <small className="mt-3 block font-semibold text-ae-muted">+30/+60 use hourly forecast estimates.</small>}</section>
      <details className="rounded-xl border border-ae-line p-4"><summary className="cursor-pointer font-black">Why this route</summary><p className="mt-3 mb-2 font-semibold text-ae-muted">{route.explanation.summary}</p>{route.explanation.reasons.length > 0 && <ul className="m-0 grid gap-1 pl-5">{route.explanation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}{route.explanation.tradeoffs.length > 0 && <><strong className="mt-3 block">Tradeoffs</strong><ul className="m-0 grid gap-1 pl-5">{route.explanation.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul></>}{route.explanation.limitations.length > 0 && <><strong className="mt-3 block">Limitations</strong><ul className="m-0 grid gap-1 pl-5">{route.explanation.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></>}</details>
      {(route.accessibility.mode === 'REDUCED_EXERTION' || route.accessibility.assessment === 'APPROXIMATION') && <section aria-labelledby="access-title"><h3 className="m-0 text-sm font-black" id="access-title">Accessibility approximation</h3>{route.accessibility.reasons.length > 0 && <p className="mt-1 mb-2 font-semibold text-ae-muted">{route.accessibility.reasons.join(' ')}</p>}<ul className="m-0 grid gap-1 pl-5">{route.accessibility.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></section>}
      {comparison.warnings.length > 0 && <details className="rounded-xl border border-[#d99a8b] bg-[#fff1ed] p-4"><summary className="cursor-pointer font-black text-ae-fastest">Warnings</summary><ul className="mt-2 mb-0 grid gap-1 pl-5">{comparison.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
    </div>}
    {route && onStartNavigation && <div className="mt-5 grid gap-2"><button className="min-h-12 rounded-xl bg-ae-ink px-3 text-sm font-black text-white hover:bg-ae-brand disabled:opacity-50" type="button" aria-describedby="route-guidance-status" disabled={!canStartNavigation} onClick={onStartNavigation}>Start route guidance</button><p className="m-0 text-xs font-semibold text-ae-muted" id="route-guidance-status">{guidanceMessage}</p></div>}
  </div></div>
}
