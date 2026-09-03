import { RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import { compareRoutes, getNearbyRoadReports } from '@/api'
import { colorDistanceIcon, colorExposureIcon, colorReportIcon, colorSearchIcon, colorSignpostIcon, colorTimeIcon } from '@/assets'
import { RoutePreviewMap } from '@/components'
import { ConfirmationDialog } from '@/components/common'
import { useToast } from '@/context'
import { useDraggablePanel, useMobileSheet, useMutationCreateRouteComparison, useRecordTripImpact } from '@/hooks'
import { canStartNavigationFrom, getApiErrorMessage, hazardReportIds, initialRouteView, itineraryModeRequests, isArrivalFix, loadMapLayers, routeGuidanceEligibility, routeViews, saveMapLayers, savedCommuteRequest, savedCommuteSelectedModes, selectedModeLabel, shouldTriggerOffRouteReroute, transitStops, type OriginSource } from '@/lib'
import { saveRouteSummary } from '@/lib/route-summary'
import type { AccessibilityMode, DirectTravelMode, LiveLocation, Place, RoadReport, RoadReportBounds, RouteComparisonOutcome, RouteComparisonTask, RouteOption, RoutePreference, RouteTaskId, SavedCommute, TransitPreference } from '@/types'
import { MapLayerControl, PlannerPanel, RoadReportDetailPanel, RoadReportSheet, RouteResultsPanel } from './components'

type FormErrors = { origin?: string; destination?: string }
type MobilePanel = 'map' | 'planner' | 'routes' | 'report'
type RerouteStatus = 'idle' | 'checking' | 'applied' | 'failed'

const requestDefaults = { departureOffsetsMinutes: [0, 30, 60] as Array<0 | 30 | 60>, hazardPolicy: 'PREFER_FEWER_REPORTS' as const, includeRestStops: true }

function currentTime() {
  return new Date().getTime()
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)} m` : `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.round(minutes % 1440 / 60)}h`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes} min`
}

function calculateHeading(from: LiveLocation | null, latitude: number, longitude: number) {
  if (!from) return 0
  const toRadians = (value: number) => value * Math.PI / 180
  const deltaLongitude = toRadians(longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(latitude)
  const y = Math.sin(deltaLongitude) * Math.cos(toLatitude)
  const x = Math.cos(fromLatitude) * Math.sin(toLatitude) - Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(deltaLongitude)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function sameLocation(origin: Place, destination: Place) {
  return Math.abs(origin.latitude - destination.latitude) < .00001 && Math.abs(origin.longitude - destination.longitude) < .00001
}

function normalizeReportBounds(bounds: RoadReportBounds) {
  if (bounds.north <= bounds.south || bounds.east <= bounds.west || bounds.north - bounds.south > 2 || bounds.east - bounds.west > 2) return null
  return { north: Number(bounds.north.toFixed(3)), south: Number(bounds.south.toFixed(3)), east: Number(bounds.east.toFixed(3)), west: Number(bounds.west.toFixed(3)) }
}

function commutePlace(location: SavedCommute['origin'], id: string): Place {
  return { id, label: location.label, detail: 'Saved commute location', latitude: location.latitude, longitude: location.longitude }
}

function useTransitStops(selectedRoute?: RouteOption) {
  return useMemo(() => transitStops(selectedRoute), [selectedRoute])
}

export default function DashboardPage() {
  const location = useLocation()
  const initialCommute = (location.state as { commute?: SavedCommute } | null)?.commute
  const comparison = useMutationCreateRouteComparison()
  const tripImpact = useRecordTripImpact()
  const { showToast } = useToast()
  const resetMutationRef = useRef(comparison.reset)
  const abortComparisonRef = useRef(comparison.abort)
  const mobileSheet = useMobileSheet()
  const plannerDrag = useDraggablePanel({ x: 20, y: 96 })
  const routesDrag = useDraggablePanel({ x: typeof window === 'undefined' ? 20 : Math.max(20, window.innerWidth - 420), y: 96 })
  const reportDrag = useDraggablePanel({ x: typeof window === 'undefined' ? 40 : Math.max(40, window.innerWidth / 2 - 280), y: 112 })
  const [origin, setOrigin] = useState<Place | null>(initialCommute ? commutePlace(initialCommute.origin, `saved-origin-${initialCommute.id}`) : null)
  const [originSource, setOriginSource] = useState<OriginSource>('OTHER')
  const [destination, setDestination] = useState<Place | null>(initialCommute ? commutePlace(initialCommute.destination, `saved-destination-${initialCommute.id}`) : null)
  const [selectedModes, setSelectedModes] = useState<DirectTravelMode[]>(savedCommuteSelectedModes(initialCommute))
  const [preference, setPreference] = useState<RoutePreference>(initialCommute?.preference ?? 'balanced')
  const [sensitiveUser, setSensitiveUser] = useState(initialCommute?.sensitiveUser ?? false)
  const [transitPreference, setTransitPreference] = useState<TransitPreference>(initialCommute?.transitPreference ?? 'LESS_WALKING')
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>(initialCommute?.accessibilityMode ?? 'STANDARD')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLocating, setIsLocating] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [comparisonGroups, setComparisonGroups] = useState<RouteComparisonOutcome[]>([])
  const [isPlannerOpen, setIsPlannerOpen] = useState(Boolean(initialCommute))
  const [isRoutesOpen, setIsRoutesOpen] = useState(false)
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(initialCommute ? 'planner' : 'map')
  const [isMapReady, setIsMapReady] = useState(false)
  const supportsGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
  const [isLocationPending, setIsLocationPending] = useState(supportsGeolocation)
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null)
  const [guidanceNow, setGuidanceNow] = useState(currentTime)
  const [locationError, setLocationError] = useState(supportsGeolocation ? '' : 'Lokasi langsung tidak didukung pada perangkat ini.')
  const [reportLocation, setReportLocation] = useState<LiveLocation | null>(null)
  const [selectedReport, setSelectedReport] = useState<RoadReport | null>(null)
  const [reportLayout, setReportLayout] = useState({ step: 1 as 1 | 2, hasImages: false })
  const [reports, setReports] = useState<RoadReport[]>([])
  const [mapBounds, setMapBounds] = useState<RoadReportBounds | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationSession, setNavigationSession] = useState(0)
  const [mapLayers, setMapLayers] = useState(loadMapLayers)
  const [navigationProgress, setNavigationProgress] = useState<{ remainingMeters: number; isOffRoute: boolean } | null>(null)
  const [rerouteStatus, setRerouteStatus] = useState<RerouteStatus>('idle')
  const [showImpactConfirmation, setShowImpactConfirmation] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const reportRequestRef = useRef(0)
  const rerouteControllerRef = useRef<AbortController | null>(null)
  const rerouteRequestRef = useRef(0)
  const lastRerouteAtRef = useRef(0)
  const consecutiveOffRouteRef = useRef(0)
  const recordedImpactRef = useRef(false)
  const promptedImpactRef = useRef(false)
  const initialCommuteRunRef = useRef(false)
  const plannerTasksRef = useRef<(modes?: DirectTravelMode[], nextOrigin?: Place | null, nextDestination?: Place | null) => RouteComparisonTask[]>(() => [])
  const runComparisonRef = useRef<(tasks: RouteComparisonTask[], replace?: boolean) => void>(() => undefined)
  const dynamicRerouteRef = useRef<() => Promise<void>>(async () => undefined)
  const seenHazardIdsRef = useRef('')
  const pendingHazardIdsRef = useRef('')
  const hazardRetryTimerRef = useRef(0)
  const comparisonRequestRef = useRef(0)
  const navigationSessionRef = useRef<{ routeResultId: string; destination: Place } | null>(null)
  const plannerTriggerRef = useRef<HTMLButtonElement>(null)
  const routesTriggerRef = useRef<HTMLButtonElement>(null)
  const reportTriggerRef = useRef<HTMLButtonElement>(null)
  const plannerPanelRef = useRef<HTMLElement>(null)
  const routesPanelRef = useRef<HTMLElement>(null)
  const reportPanelRef = useRef<HTMLElement>(null)
  const compositeSucceeded = comparisonGroups.some((group) => group.task.id === 'BIKE_TRANSIT' && group.status === 'success')
  const visibleComparisonGroups = compositeSucceeded ? comparisonGroups.filter((group) => group.task.id !== 'TRANSIT_FALLBACK') : comparisonGroups
  const routes = visibleComparisonGroups.flatMap((group) => group.status === 'success' ? routeViews(group.task.id, group.task.selectedModes, group.task.request, group.comparison) : [])
  const selected = routes.find((route) => route.key === selectedId) ?? routes[0]
  const selectedRoute = selected?.route
  const displayedComparison = selected?.comparison
  const selectedWeatherPoints = selectedRoute ? displayedComparison?.weatherPointsByRoute[selectedRoute.id] ?? displayedComparison?.weatherPoints : displayedComparison?.weatherPoints
  const restStopCandidates = displayedComparison?.restStopCandidates.status === 'AVAILABLE' ? displayedComparison.restStopCandidates.candidates : []
  const accessiblePlaceCandidates = restStopCandidates.filter((candidate) => candidate.accessibility && Object.values(candidate.accessibility).some((value) => value === true))
  const selectedTransitStops = useTransitStops(selectedRoute)
  const guidance = origin ? routeGuidanceEligibility(origin, originSource, liveLocation, guidanceNow) : { eligible: false as const, code: 'NO_FIX' as const, message: 'Pilih titik awal rute untuk mengaktifkan navigasi.' }

  function plannerTasks(modes = selectedModes, nextOrigin = origin, nextDestination = destination): RouteComparisonTask[] {
    if (!nextOrigin || !nextDestination) return []
    return itineraryModeRequests(modes, { origin: nextOrigin, destination: nextDestination, preference, sensitiveUser, transitPreference, accessibilityMode, ...requestDefaults })
  }

  function selectInitial(nextRoutes: typeof routes) {
    const next = initialRouteView(nextRoutes)
    setSelectedId(next?.key ?? '')
    if (next) saveRouteSummary({ selectedModes: next.selectedModes, preference: next.request.preference, route: next.route })
  }

  const updateLiveLocation = useCallback((position: GeolocationPosition) => {
    setLiveLocation((current) => ({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, heading: Number.isFinite(position.coords.heading) ? position.coords.heading! : calculateHeading(current, position.coords.latitude, position.coords.longitude), speed: position.coords.speed, timestamp: Number.isFinite(position.timestamp) ? position.timestamp : Date.now() }))
    setGuidanceNow(currentTime())
    setIsLocationPending(false)
    setLocationError('')
  }, [])

  function runComparison(tasks: RouteComparisonTask[], replace = true) {
    if (!tasks.length) return
    rerouteControllerRef.current?.abort()
    comparison.abort()
    const requestId = ++comparisonRequestRef.current
    setIsNavigating(false)
    navigationSessionRef.current = null
    setNavigationProgress(null)
    if (replace) { setSelectedId(''); setComparisonGroups([]) }
    setIsRoutesOpen(true)
    setActiveMobilePanel('routes')
    mobileSheet.setHeight(55)
    comparison.mutate(tasks, { onSuccess: (outcomes) => {
      if (requestId !== comparisonRequestRef.current || !outcomes.length) return
      const merged = replace ? outcomes : comparisonGroups.map((group) => outcomes.find((outcome) => outcome.task.id === group.task.id) ?? group)
      const next = replace ? merged : [...merged, ...outcomes.filter((outcome) => !merged.some((group) => group.task.id === outcome.task.id))]
      setComparisonGroups(next)
      if (replace || !selectedId) selectInitial(next.flatMap((group) => group.status === 'success' ? routeViews(group.task.id, group.task.selectedModes, group.task.request, group.comparison) : []))
    } })
  }

  function retryComparison(id: RouteTaskId) {
    const task = comparisonGroups.find((group) => group.task.id === id)?.task
    if (task) runComparison([task], false)
  }

  async function runDynamicReroute() {
    if (!isNavigating || !selected || selected.request.mode === 'TRANSIT' || !liveLocation || !destination) return
    rerouteControllerRef.current?.abort()
    const controller = new AbortController()
    rerouteControllerRef.current = controller
    const requestId = ++rerouteRequestRef.current
    const nextOrigin: Place = { id: `reroute-${liveLocation.latitude}-${liveLocation.longitude}`, label: 'Lokasi saat ini', detail: 'Lokasi navigasi langsung', latitude: liveLocation.latitude, longitude: liveLocation.longitude }
    const task = plannerTasks(selected.selectedModes, nextOrigin, destination)[0]
    const request = task?.request
    if (!task || !request) return
    lastRerouteAtRef.current = currentTime()
    setRerouteStatus('checking')
    try {
      const result = await compareRoutes(request, controller.signal)
      if (controller.signal.aborted || requestId !== rerouteRequestRef.current || !isNavigating) return
      setOrigin(nextOrigin)
      const nextRoutes = routeViews(task.id, selected.selectedModes, request, result)
      const nextView = initialRouteView(nextRoutes)
      setComparisonGroups([{ task, status: 'success', comparison: result }])
      setSelectedId(nextView?.key ?? '')
      if (nextView) {
        saveRouteSummary({ selectedModes: nextView.selectedModes, preference: request.preference, route: nextView.route })
        if (result.persisted && nextView.route.routeResultId) navigationSessionRef.current = { routeResultId: nextView.route.routeResultId, destination: { ...destination } }
      }
      if (pendingHazardIdsRef.current) seenHazardIdsRef.current = pendingHazardIdsRef.current
      pendingHazardIdsRef.current = ''
      setRerouteStatus('applied')
    } catch (error) {
      if (controller.signal.aborted || requestId !== rerouteRequestRef.current) return
      setRerouteStatus('failed')
      if (pendingHazardIdsRef.current) { const retryRequestId = rerouteRequestRef.current; hazardRetryTimerRef.current = window.setTimeout(() => { if (retryRequestId === rerouteRequestRef.current) void dynamicRerouteRef.current() }, 120_000) }
      showToast(getApiErrorMessage(error, 'Pemeriksaan rute gagal.'), 'error')
    }
  }

  useEffect(() => {
    plannerTasksRef.current = plannerTasks
    runComparisonRef.current = runComparison
    dynamicRerouteRef.current = runDynamicReroute
    resetMutationRef.current = comparison.reset
    abortComparisonRef.current = comparison.abort
  })
  useEffect(() => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(updateLiveLocation, () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; setLiveLocation(null); setIsLocationPending(false); setLocationError('Lokasi langsung tidak tersedia. Izinkan lokasi presisi untuk navigasi dan laporan.') }, { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 })
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); window.clearTimeout(hazardRetryTimerRef.current); abortComparisonRef.current(); rerouteControllerRef.current?.abort() }
  }, [updateLiveLocation])
  useEffect(() => {
    if (!liveLocation || guidanceNow - liveLocation.timestamp > 15_000) return
    const timer = window.setTimeout(() => setGuidanceNow(currentTime()), Math.max(0, liveLocation.timestamp + 15_001 - guidanceNow))
    return () => window.clearTimeout(timer)
  }, [guidanceNow, liveLocation])
  useEffect(() => {
    const controller = new AbortController()
    const bounds = mapBounds ? normalizeReportBounds(mapBounds) : null
    if (!bounds || !mapLayers.reports && !isNavigating) return () => controller.abort()
    const load = () => {
      const requestId = ++reportRequestRef.current
      void getNearbyRoadReports(bounds, controller.signal).then((nextReports) => { if (reportRequestRef.current === requestId) setReports(nextReports) }).catch((error: unknown) => { if (error instanceof DOMException && error.name === 'AbortError') return })
    }
    const timer = window.setTimeout(load, 350)
    const interval = isNavigating ? window.setInterval(load, 30_000) : 0
    return () => { window.clearTimeout(timer); if (interval) window.clearInterval(interval); controller.abort() }
  }, [isNavigating, mapBounds, mapLayers.reports])
  useEffect(() => {
    if (!initialCommute || initialCommuteRunRef.current) return
    initialCommuteRunRef.current = true
    const modes = savedCommuteSelectedModes(initialCommute)
    const request = savedCommuteRequest(initialCommute, commutePlace(initialCommute.origin, `saved-origin-${initialCommute.id}`), commutePlace(initialCommute.destination, `saved-destination-${initialCommute.id}`), requestDefaults)
    runComparisonRef.current([{ id: request.mode, label: selectedModeLabel(modes), selectedModes: modes, request }])
  }, [initialCommute])
  useEffect(() => {
    if (!isNavigating || selected?.request.mode === 'TRANSIT' || !selectedRoute) return
    const ids = hazardReportIds(selectedRoute, reports).join('|')
    if (!ids) { window.clearTimeout(hazardRetryTimerRef.current); hazardRetryTimerRef.current = 0; pendingHazardIdsRef.current = ''; return }
    if (ids === seenHazardIdsRef.current || ids === pendingHazardIdsRef.current) return
    pendingHazardIdsRef.current = ids
    const delay = Math.max(0, 120_000 - (currentTime() - lastRerouteAtRef.current))
    window.clearTimeout(hazardRetryTimerRef.current)
    const retryRequestId = rerouteRequestRef.current
    hazardRetryTimerRef.current = window.setTimeout(() => { if (retryRequestId === rerouteRequestRef.current) void dynamicRerouteRef.current() }, delay)
  }, [reports, selected, selectedRoute, isNavigating])
  useEffect(() => {
    if (!isNavigating || promptedImpactRef.current || recordedImpactRef.current || !navigationSessionRef.current || !isArrivalFix(navigationSessionRef.current.destination, liveLocation)) return
    promptedImpactRef.current = true
    setShowImpactConfirmation(true)
  }, [isNavigating, liveLocation])
  const plannerWasOpenRef = useRef(false)
  const routesWereOpenRef = useRef(false)
  const reportWasOpenRef = useRef(false)
  useEffect(() => { if (isPlannerOpen) plannerPanelRef.current?.focus(); else if (plannerWasOpenRef.current) plannerTriggerRef.current?.focus(); plannerWasOpenRef.current = isPlannerOpen }, [isPlannerOpen])
  useEffect(() => { if (isRoutesOpen) routesPanelRef.current?.focus(); else if (routesWereOpenRef.current) routesTriggerRef.current?.focus(); routesWereOpenRef.current = isRoutesOpen }, [isRoutesOpen])
  useEffect(() => {
    const panel = reportLocation ? reportPanelRef.current : null
    if (panel) panel.focus()
    else if (reportWasOpenRef.current) reportTriggerRef.current?.focus()
    reportWasOpenRef.current = Boolean(panel)
  }, [reportLocation])

  function handleRouteSelect(routeId: string) {
    if (isNavigating) return
    setSelectedId(routeId)
    const view = routes.find((option) => option.key === routeId)
    if (view) saveRouteSummary({ selectedModes: view.selectedModes, preference: view.request.preference, route: view.route })
  }

  function clearPendingReroute() {
    window.clearTimeout(hazardRetryTimerRef.current)
    hazardRetryTimerRef.current = 0
    pendingHazardIdsRef.current = ''
    rerouteRequestRef.current += 1
  }

  function startNavigation() {
    if (!selected || !destination || !origin || !canStartNavigationFrom(origin, originSource, liveLocation, guidanceNow)) return
    clearPendingReroute()
    navigationSessionRef.current = selected.comparison.persisted && selected.route.routeResultId ? { routeResultId: selected.route.routeResultId, destination: { ...destination } } : null
    recordedImpactRef.current = false
    promptedImpactRef.current = false
    consecutiveOffRouteRef.current = 0
    seenHazardIdsRef.current = ''
    setRerouteStatus('idle')
    setNavigationSession((session) => session + 1)
    setIsNavigating(true)
    setIsPlannerOpen(false)
    setIsRoutesOpen(false)
    setActiveMobilePanel('map')
  }

  function stopNavigation() {
    clearPendingReroute()
    rerouteControllerRef.current?.abort()
    if (navigationSessionRef.current && isArrivalFix(navigationSessionRef.current.destination, liveLocation) && !recordedImpactRef.current) setShowImpactConfirmation(true)
    setIsNavigating(false)
    setNavigationProgress(null)
  }

  async function recordImpact() {
    const session = navigationSessionRef.current
    if (recordedImpactRef.current || !session) return
    recordedImpactRef.current = true
    try {
      await tripImpact.mutateAsync({ routeResultId: session.routeResultId })
      recordedImpactRef.current = true
      setShowImpactConfirmation(false)
      setIsNavigating(false)
      showToast('Dampak perjalanan berhasil dicatat dari metrik rute server.', 'success')
    } catch (error) { recordedImpactRef.current = false; showToast(getApiErrorMessage(error, 'Dampak perjalanan tidak dapat dicatat.'), 'error') }
  }

  function handleNavigationProgress(progress: { remainingMeters: number; isOffRoute: boolean }) {
    setNavigationProgress({ remainingMeters: progress.remainingMeters, isOffRoute: progress.isOffRoute })
    if (!liveLocation || selected?.request.mode === 'TRANSIT') return
    const decision = shouldTriggerOffRouteReroute({ consecutiveFixes: consecutiveOffRouteRef.current, isOffRoute: progress.isOffRoute, accuracy: liveLocation.accuracy, now: currentTime(), lastRerouteAt: lastRerouteAtRef.current })
    consecutiveOffRouteRef.current = decision.consecutiveFixes
    if (decision.trigger) { consecutiveOffRouteRef.current = 0; void runDynamicReroute() }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!origin) nextErrors.origin = 'Pilih titik awal dari hasil pencarian.'
    if (!destination) nextErrors.destination = 'Pilih tujuan dari hasil pencarian.'
    if (origin && destination && sameLocation(origin, destination)) nextErrors.destination = 'Titik awal dan tujuan harus berbeda.'
    setErrors(nextErrors)
    if (nextErrors.origin) { document.getElementById('dashboard-origin')?.focus(); return }
    if (nextErrors.destination) { document.getElementById('dashboard-destination')?.focus(); return }
    const tasks = plannerTasks()
    if (tasks.length) runComparison(tasks)
  }

  const handleMapBoundsChange = useCallback((bounds: RoadReportBounds) => {
    const normalized = normalizeReportBounds(bounds)
    setMapBounds((current) => normalized && current && normalized.north === current.north && normalized.south === current.south && normalized.east === current.east && normalized.west === current.west ? current : normalized)
  }, [])

  function showReportPanel(nextLocation: LiveLocation) {
    setReportLayout({ step: 1, hasImages: false })
    setSelectedReport(null)
    setReportLocation(nextLocation)
    setActiveMobilePanel('report')
    mobileSheet.setHeight(62)
  }

  function openRoadReport() {
    if (liveLocation && currentTime() - liveLocation.timestamp <= 15_000 && liveLocation.accuracy <= 100) { showReportPanel({ ...liveLocation }); return }
    if (!navigator.geolocation) { setLocationError('Lokasi diperlukan untuk mengirim laporan.'); return }
    navigator.geolocation.getCurrentPosition((position) => showReportPanel({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, heading: Number.isFinite(position.coords.heading) ? position.coords.heading! : 0, speed: position.coords.speed, timestamp: Number.isFinite(position.timestamp) ? position.timestamp : Date.now() }), () => setLocationError('Lokasi diperlukan untuk mengirim laporan.'), { enableHighAccuracy: true, maximumAge: 5_000, timeout: 12_000 })
  }

  function handleCurrentLocation() {
    const applyLocation = (latitude: number, longitude: number) => {
      setOrigin({ id: `current-${latitude}-${longitude}`, label: 'Lokasi saat ini', detail: 'Lokasi perangkat Anda', latitude, longitude })
      setOriginSource('CURRENT_LOCATION')
      setErrors((current) => ({ ...current, origin: undefined }))
      setIsLocating(false)
      resetComparison()
    }
    if (liveLocation && currentTime() - liveLocation.timestamp <= 15_000 && liveLocation.accuracy <= 100) { applyLocation(liveLocation.latitude, liveLocation.longitude); return }
    if (!navigator.geolocation) { setErrors((current) => ({ ...current, origin: 'Lokasi tidak didukung pada perangkat ini.' })); return }
    const request = (highAccuracy: boolean) => navigator.geolocation.getCurrentPosition((position) => { updateLiveLocation(position); applyLocation(position.coords.latitude, position.coords.longitude) }, (error) => {
      if (highAccuracy && (error.code === 2 || error.code === 3)) { request(false); return }
      setErrors((current) => ({ ...current, origin: error.code === 1 ? 'Izin lokasi ditolak.' : error.code === 3 ? 'Permintaan lokasi habis waktu. Coba mendekati jendela atau aktifkan lokasi perangkat.' : 'Lokasi saat ini tidak tersedia.' }))
      setIsLocating(false)
    }, { enableHighAccuracy: highAccuracy, maximumAge: 15_000, timeout: highAccuracy ? 20_000 : 10_000 })
    setIsLocating(true)
    request(true)
  }

  function resetComparison() {
    clearPendingReroute()
    comparisonRequestRef.current += 1
    comparison.abort()
    rerouteControllerRef.current?.abort()
    setIsNavigating(false)
    setNavigationProgress(null)
    setComparisonGroups([])
    resetMutationRef.current()
    setSelectedId('')
    setIsRoutesOpen(false)
    setActiveMobilePanel((panel) => panel === 'routes' ? 'planner' : panel)
  }

  function closeReport() {
    setReportLocation(null)
    setSelectedReport(null)
    if (activeMobilePanel === 'report') setActiveMobilePanel(isPlannerOpen ? 'planner' : isRoutesOpen ? 'routes' : 'map')
  }

  function updateSelectedReport(report: RoadReport) {
    setReports((current) => current.map((item) => item.id === report.id ? report : item).filter((item) => item.status === 'ACTIVE'))
    setSelectedReport(report.status === 'ACTIVE' ? report : null)
  }

  const plannerVisibleOnMobile = isPlannerOpen && activeMobilePanel === 'planner'
  const routesVisibleOnMobile = isRoutesOpen && activeMobilePanel === 'routes'
  const reportVisibleOnMobile = Boolean(reportLocation) && activeMobilePanel === 'report'
  const panelStyle = { '--sheet-height': `${mobileSheet.height}%`, '--panel-x': `${plannerDrag.initialPosition.x}px`, '--panel-y': `${plannerDrag.initialPosition.y}px` } as CSSProperties
  const routesPanelStyle = { '--sheet-height': `${mobileSheet.height}%`, '--panel-x': `${routesDrag.initialPosition.x}px`, '--panel-y': `${routesDrag.initialPosition.y}px` } as CSSProperties
  const reportPanelStyle = { '--sheet-height': `${mobileSheet.height}%`, '--panel-x': `${reportDrag.initialPosition.x}px`, '--panel-y': `${reportDrag.initialPosition.y}px`, '--report-height': reportLayout.step === 1 ? '34rem' : reportLayout.hasImages ? '31rem' : '29rem' } as CSSProperties
  const mapRoutes = routes.map((view) => ({ ...view.route, id: view.key }))

  return <main id="main-content" className="relative h-full overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
    <section className="absolute inset-0" aria-label="Route map"><RoutePreviewMap origin={origin} destination={destination} routes={mapRoutes} selectedId={selected?.key} selectedRouteResultId={selectedRoute?.routeResultId} transitStops={selectedTransitStops} liveLocation={liveLocation} followLiveLocation={isNavigating} navigationSession={navigationSession} reports={reports} restStopCandidates={restStopCandidates} navigationRoute={isNavigating ? selectedRoute : null} showWeather={mapLayers.weather} weatherPoints={selectedWeatherPoints} showReports={mapLayers.reports} showRestStops={mapLayers.restStops} showAccessiblePlaces={mapLayers.accessiblePlaces} onNavigationProgress={handleNavigationProgress} onOriginChange={(place) => { setOrigin(place); setOriginSource('OTHER'); resetComparison() }} onDestinationChange={(place) => { setDestination(place); resetComparison() }} onBoundsChange={handleMapBoundsChange} selectedReport={selectedReport} onReportSelect={(report) => { setSelectedReport(report); setReportLocation(null) }} onReportClose={() => setSelectedReport(null)} reportPopup={(report, onClose) => <RoadReportDetailPanel variant="anchored" report={report} onClose={onClose} onUpdate={updateSelectedReport} />} onRouteSelect={handleRouteSelect} onMapReady={setIsMapReady} /></section>
    {isPlannerOpen && <aside id="planner-panel" ref={plannerPanelRef} tabIndex={-1} data-draggable-panel className={`absolute inset-x-0 bottom-0 z-30 h-[var(--sheet-height)] flex-col overflow-hidden rounded-t-[1.75rem] border border-ae-line bg-white/97 shadow-[0_24px_70px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-auto lg:left-[var(--panel-x)] lg:top-[var(--panel-y)] lg:h-auto lg:max-h-[calc(100dvh-var(--panel-y)-1.25rem)] lg:w-[30rem] lg:rounded-[1.75rem] ${plannerVisibleOnMobile ? 'flex' : 'hidden lg:flex'}`} style={panelStyle} aria-label="Route planner"><PlannerPanel origin={origin} destination={destination} selectedModes={selectedModes} preference={preference} sensitiveUser={sensitiveUser} transitPreference={transitPreference} accessibilityMode={accessibilityMode} errors={errors} isLocating={isLocating} isPending={comparison.isPending} onOriginChange={(place) => { setOrigin(place); setOriginSource('OTHER'); setErrors((current) => ({ ...current, origin: undefined })); resetComparison() }} onDestinationChange={(place) => { setDestination(place); setErrors((current) => ({ ...current, destination: undefined })); resetComparison() }} onSelectedModesChange={(value) => { setSelectedModes(value); resetComparison() }} onPreferenceChange={(value) => { setPreference(value); resetComparison() }} onSensitiveUserChange={(value) => { setSensitiveUser(value); resetComparison() }} onTransitPreferenceChange={(value) => { setTransitPreference(value); resetComparison() }} onAccessibilityModeChange={(value) => { setAccessibilityMode(value); resetComparison() }} onCurrentLocation={handleCurrentLocation} onSwap={() => { setOrigin(destination); setOriginSource('OTHER'); setDestination(origin); setErrors({}); resetComparison() }} onSubmit={handleSubmit} onClose={() => { setIsPlannerOpen(false); if (activeMobilePanel === 'planner') setActiveMobilePanel(isRoutesOpen ? 'routes' : 'map') }} onDesktopDragStart={plannerDrag.handlePointerDown} onDesktopDragMove={plannerDrag.handlePointerMove} onDesktopDragEnd={plannerDrag.handlePointerUp} onDesktopDragKeyDown={plannerDrag.handleKeyDown} mobileHandle={{ height: mobileSheet.height, onClick: mobileSheet.handleClick, onPointerDown: mobileSheet.handlePointerDown, onPointerMove: mobileSheet.handlePointerMove, onPointerUp: mobileSheet.handlePointerUp, onKeyDown: mobileSheet.handleKeyDown }} /></aside>}
    {isRoutesOpen && <aside id="routes-panel" ref={routesPanelRef} tabIndex={-1} data-draggable-panel className={`absolute inset-x-0 bottom-0 z-30 h-[var(--sheet-height)] flex-col overflow-hidden rounded-t-[1.75rem] border border-ae-line bg-white/97 shadow-[0_24px_70px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-auto lg:left-[var(--panel-x)] lg:top-[var(--panel-y)] lg:h-[calc(100dvh-var(--panel-y)-1.25rem)] lg:w-[27rem] lg:rounded-[1.75rem] ${routesVisibleOnMobile ? 'flex' : 'hidden lg:flex'}`} style={routesPanelStyle} aria-label="Hasil rute"><button className="flex min-h-11 w-full shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing lg:hidden" type="button" aria-label="Ubah ukuran panel rute" aria-valuetext={`${Math.round(mobileSheet.height)} persen tinggi`} onClick={mobileSheet.handleClick} onPointerDown={mobileSheet.handlePointerDown} onPointerMove={mobileSheet.handlePointerMove} onPointerUp={(event) => mobileSheet.handlePointerUp(event, () => setIsRoutesOpen(false))} onPointerCancel={(event) => mobileSheet.handlePointerUp(event, () => setIsRoutesOpen(false))} onKeyDown={mobileSheet.handleKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" aria-hidden="true" /></button><div className="min-h-0 flex-1 lg:h-full"><RouteResultsPanel groups={visibleComparisonGroups} selected={selected} isPending={comparison.isPending} onSelect={handleRouteSelect} onRetry={retryComparison} canStartNavigation={guidance.eligible} guidanceMessage={guidance.message} onStartNavigation={startNavigation} onClose={() => { setIsRoutesOpen(false); if (activeMobilePanel === 'routes') setActiveMobilePanel(isPlannerOpen ? 'planner' : 'map') }} onDesktopDragStart={routesDrag.handlePointerDown} onDesktopDragMove={routesDrag.handlePointerMove} onDesktopDragEnd={routesDrag.handlePointerUp} onDesktopDragKeyDown={routesDrag.handleKeyDown} /></div></aside>}
    {reportLocation && <aside id="report-panel" ref={reportPanelRef} tabIndex={-1} data-draggable-panel className={`absolute inset-x-0 bottom-0 z-30 h-[var(--sheet-height)] overflow-hidden rounded-t-[1.75rem] border border-ae-line bg-white/97 shadow-[0_24px_70px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-auto lg:left-[var(--panel-x)] lg:top-[var(--panel-y)] lg:h-[var(--report-height)] lg:w-[35rem] lg:rounded-[1.75rem] ${reportVisibleOnMobile ? 'block' : 'hidden lg:block'}`} style={reportPanelStyle} aria-label="Road report"><RoadReportSheet location={reportLocation} onClose={closeReport} onCreated={(report) => { setReports((current) => [report, ...current]); closeReport() }} onLayoutChange={setReportLayout} onDesktopDragStart={reportDrag.handlePointerDown} onDesktopDragMove={reportDrag.handlePointerMove} onDesktopDragEnd={reportDrag.handlePointerUp} onDesktopDragKeyDown={reportDrag.handleKeyDown} mobileHandle={{ height: mobileSheet.height, onClick: mobileSheet.handleClick, onPointerDown: mobileSheet.handlePointerDown, onPointerMove: mobileSheet.handlePointerMove, onPointerUp: mobileSheet.handlePointerUp, onKeyDown: mobileSheet.handleKeyDown }} /></aside>}
    {isNavigating && destination && <div className="absolute right-3 left-3 z-50 mx-auto max-w-md rounded-2xl border border-ae-brand/20 bg-white/97 p-3 text-ae-ink shadow-[0_18px_45px_rgba(20,41,34,.18)] backdrop-blur-xl sm:p-4" style={{ top: '9rem' }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-[11px] font-black tracking-[.12em] text-ae-brand uppercase sm:text-xs">{rerouteStatus === 'checking' ? 'Memeriksa rute' : rerouteStatus === 'applied' ? 'Rute baru diterapkan' : rerouteStatus === 'failed' ? 'Pemeriksaan rute gagal' : navigationProgress?.isOffRoute ? 'Keluar dari rute' : 'Navigasi rute'}</span><strong className="mt-1 block truncate text-base font-black sm:text-lg">{destination.label}</strong>{navigationProgress && <span className="mt-1 block text-sm font-bold text-ae-muted">Sisa {formatDistance(navigationProgress.remainingMeters)}</span>}<span className="mt-1 block text-[11px] font-bold text-ae-muted">Rute diperbarui otomatis saat diperlukan, bukan panduan belokan demi belokan.</span></div>{rerouteStatus === 'failed' && <button className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-ae-soft px-3 text-xs font-black text-ae-brand hover:bg-ae-line" type="button" onClick={() => void runDynamicReroute()}><RefreshCw className="size-4" aria-hidden="true" />Coba lagi</button>}<button className="grid size-11 shrink-0 place-items-center rounded-xl bg-ae-soft text-ae-ink hover:bg-ae-line" type="button" aria-label="Hentikan navigasi" onClick={stopNavigation}><X className="size-5" aria-hidden="true" /></button></div></div>}
    <div className="absolute inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-10 grid grid-cols-4 gap-1 rounded-xl border border-ae-line bg-white/96 p-1 shadow-[0_12px_30px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-x-auto lg:top-24 lg:right-5 lg:bottom-auto lg:w-32 lg:grid-cols-1 lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"><button className="inline-flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-black lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:border lg:border-ae-line lg:bg-white/96 lg:px-3 lg:text-sm lg:shadow-lg disabled:opacity-50" type="button" ref={reportTriggerRef} aria-expanded={Boolean(reportLocation)} aria-controls="report-panel" onClick={openRoadReport} disabled={!isMapReady || isLocationPending}><img className="size-7" src={colorReportIcon} alt="" />Lapor</button><button className="inline-flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-black lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:border lg:border-ae-line lg:bg-white/96 lg:px-3 lg:text-sm lg:shadow-lg" type="button" ref={plannerTriggerRef} aria-expanded={isPlannerOpen} aria-controls="planner-panel" disabled={!isMapReady} onClick={() => { setIsPlannerOpen(true); setActiveMobilePanel('planner'); mobileSheet.setHeight(55) }}><img className="size-7" src={colorSearchIcon} alt="" />Rencana</button><button className="inline-flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-black lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:border lg:border-ae-line lg:bg-white/96 lg:px-3 lg:text-sm lg:shadow-lg disabled:opacity-50" type="button" ref={routesTriggerRef} aria-expanded={isRoutesOpen} aria-controls="routes-panel" onClick={() => { setIsRoutesOpen(true); setActiveMobilePanel('routes'); mobileSheet.setHeight(55) }}><img className="size-7" src={colorSignpostIcon} alt="" />Rute</button><MapLayerControl layers={mapLayers} weatherUnavailable={!displayedComparison?.weatherPoints.some((point) => point.conditions.status === 'available')} accessiblePlacesUnavailable={!displayedComparison || accessiblePlaceCandidates.length === 0} restStopsUnavailable={!displayedComparison || displayedComparison.restStopCandidates.status === 'UNAVAILABLE' || restStopCandidates.length === 0} disabled={!isMapReady} onChange={(layers) => { setMapLayers(layers); saveMapLayers(layers) }} /></div>
    {locationError && <div className="absolute top-[10rem] right-20 z-40 max-w-64 rounded-xl bg-white p-3 text-xs font-bold text-ae-fastest shadow-lg lg:top-24 lg:right-36">{locationError}</div>}
    {selectedRoute && !isRoutesOpen && <div className="pointer-events-none absolute right-4 bottom-20 left-4 z-10 mx-auto hidden max-w-xl grid-cols-3 divide-x divide-ae-line rounded-2xl border border-ae-line bg-white/95 p-3 text-center shadow-[0_14px_40px_rgba(20,41,34,.16)] backdrop-blur-xl lg:grid"><span><img className="mx-auto size-6" src={colorTimeIcon} alt="" /><small className="mt-1 block text-[10px] font-black uppercase">Waktu</small><strong>{formatDuration(selectedRoute.durationSeconds)}</strong></span><span><img className="mx-auto size-6" src={colorExposureIcon} alt="" /><small className="mt-1 block text-[10px] font-black uppercase">Indeks paparan</small><strong>{formatCompactNumber(selectedRoute.estimatedExposureIndex)}</strong></span><span><img className="mx-auto size-6" src={colorDistanceIcon} alt="" /><small className="mt-1 block text-[10px] font-black uppercase">Jarak</small><strong>{(selectedRoute.distanceMeters / 1000).toFixed(1)} km</strong></span></div>}
    <div className="sr-only" role="status" aria-live="polite">{rerouteStatus === 'checking' ? 'Memeriksa rute.' : rerouteStatus === 'applied' ? 'Rute baru diterapkan.' : rerouteStatus === 'failed' ? 'Pemeriksaan rute gagal.' : navigationProgress?.isOffRoute ? 'Anda keluar dari rute.' : ''}</div>
    <ConfirmationDialog isOpen={showImpactConfirmation} title="Selesaikan perjalanan ini?" description="Catat estimasi dampak menggunakan hasil rute tersimpan dan metrik dari server. Satu catatan diizinkan untuk sesi navigasi ini." confirmLabel="Catat perjalanan" isPending={tripImpact.isPending} onCancel={() => setShowImpactConfirmation(false)} onConfirm={() => void recordImpact()} />
  </main>
}
