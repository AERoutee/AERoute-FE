import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { getNearbyRoadReports } from '@/api'
import { colorDistanceIcon, colorExposureIcon, colorReportIcon, colorSearchIcon, colorSignpostIcon, colorTimeIcon } from '@/assets'
import { RoutePreviewMap } from '@/components'
import { useDraggablePanel, useMobileSheet, useMutationCreateRouteComparison } from '@/hooks'
import type { Place, PlannerRequest, RoadReport, RoadReportBounds, RouteOption, RoutePreference, TravelMode } from '@/types'
import { MapLayerControl, PlannerPanel, RoadReportSheet, RouteResultsPanel } from './components'

type FormErrors = { origin?: string; destination?: string }
type MobilePanel = 'map' | 'planner' | 'routes' | 'report'
type LiveLocation = { latitude: number; longitude: number; accuracy: number; heading: number; speed: number | null }

const EMPTY_ROUTES: RouteOption[] = []

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

export default function DashboardPage() {
  const comparison = useMutationCreateRouteComparison()
  const resetMutationRef = useRef(comparison.reset)
  const mobileSheet = useMobileSheet()
  const plannerDrag = useDraggablePanel({ x: 20, y: 96 }, 480)
  const routesDrag = useDraggablePanel({ x: typeof window === 'undefined' ? 20 : Math.max(20, window.innerWidth - 420), y: 96 }, 400)
  const reportDrag = useDraggablePanel({ x: typeof window === 'undefined' ? 40 : Math.max(40, window.innerWidth / 2 - 280), y: 112 }, 560)
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [mode, setMode] = useState<TravelMode>('WALK')
  const [preference, setPreference] = useState<RoutePreference>('balanced')
  const [sensitiveUser, setSensitiveUser] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLocating, setIsLocating] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [isPlannerOpen, setIsPlannerOpen] = useState(true)
  const [isRoutesOpen, setIsRoutesOpen] = useState(false)
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>('planner')
  const supportsGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
  const [isLocationPending, setIsLocationPending] = useState(supportsGeolocation)
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null)
  const [locationError, setLocationError] = useState(supportsGeolocation ? '' : 'Live location is not supported on this device.')
  const [reportLocation, setReportLocation] = useState<LiveLocation | null>(null)
  const [reportLayout, setReportLayout] = useState({ step: 1 as 1 | 2, hasImages: false })
  const [reports, setReports] = useState<RoadReport[]>([])
  const [mapBounds, setMapBounds] = useState<RoadReportBounds | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [mapLayers, setMapLayers] = useState({ weather: false, reports: true })
  const [navigationProgress, setNavigationProgress] = useState<{ remainingMeters: number; isOffRoute: boolean } | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const reportRequestRef = useRef(0)
  const routes = comparison.data?.routes ?? EMPTY_ROUTES
  const recommended = routes.find((route) => route.labels.includes('RECOMMENDED')) ?? routes[0]
  const selected = routes.find((route) => route.id === selectedId) ?? recommended
  const selectedWeatherPoints = selected ? comparison.data?.weatherPointsByRoute[selected.id] ?? comparison.data?.weatherPoints : comparison.data?.weatherPoints

  useEffect(() => { resetMutationRef.current = comparison.reset }, [comparison.reset])
  useEffect(() => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(updateLiveLocation, () => { setIsLocationPending(false); setLocationError('Live location is unavailable. Allow precise location to enable navigation and reports.'); watchIdRef.current = null }, { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 })
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const requestId = reportRequestRef.current + 1
    reportRequestRef.current = requestId
    const bounds = mapBounds ? normalizeReportBounds(mapBounds) : null
    if (!bounds || !mapLayers.reports) return () => controller.abort()
    const timer = window.setTimeout(() => {
      void getNearbyRoadReports(bounds, controller.signal).then((nextReports) => { if (reportRequestRef.current === requestId) setReports(nextReports) }).catch((error: unknown) => { if (error instanceof DOMException && error.name === 'AbortError') return })
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [mapBounds, mapLayers.reports])

  function runComparison(request: PlannerRequest) {
    setIsNavigating(false)
    setNavigationProgress(null)
    setSelectedId('')
    comparison.mutate(request, { onSuccess: (result) => {
      const nextSelected = result.routes.find((route) => route.labels.includes('RECOMMENDED')) ?? result.routes[0]
       setSelectedId(nextSelected?.id ?? '')
       setMapLayers((current) => ({ ...current, weather: result.weatherPoints.some((point) => point.conditions.status === 'available') }))
       setIsRoutesOpen(true)
      setActiveMobilePanel('routes')
      mobileSheet.setHeight(55)
    } })
  }

  function startNavigation() {
    if (!selected || !destination) return
    setIsNavigating(true)
    setIsPlannerOpen(false)
    setIsRoutesOpen(false)
    setActiveMobilePanel('map')
  }

  function stopNavigation() {
    setIsNavigating(false)
    setNavigationProgress(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!origin) nextErrors.origin = 'Select an origin from the search results.'
    if (!destination) nextErrors.destination = 'Select a destination from the search results.'
    if (origin && destination && sameLocation(origin, destination)) nextErrors.destination = 'Origin and destination must be different.'
    setErrors(nextErrors)
    if (nextErrors.origin) { document.getElementById('dashboard-origin')?.focus(); return }
    if (nextErrors.destination) { document.getElementById('dashboard-destination')?.focus(); return }
    runComparison({ origin: origin!, destination: destination!, mode, preference, sensitiveUser })
  }

  const handleMapBoundsChange = useCallback((bounds: RoadReportBounds) => {
    const normalized = normalizeReportBounds(bounds)
    setMapBounds((current) => normalized && current && normalized.north === current.north && normalized.south === current.south && normalized.east === current.east && normalized.west === current.west ? current : normalized)
  }, [])

  function updateLiveLocation(position: GeolocationPosition) {
    setLiveLocation((current) => ({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, heading: Number.isFinite(position.coords.heading) ? position.coords.heading! : calculateHeading(current, position.coords.latitude, position.coords.longitude), speed: position.coords.speed }))
    setIsLocationPending(false)
    setLocationError('')
  }

  function showReportPanel(location: LiveLocation) {
    setReportLayout({ step: 1, hasImages: false })
    setReportLocation(location)
    setActiveMobilePanel('report')
    mobileSheet.setHeight(62)
  }

  function openRoadReport() {
    if (liveLocation) { showReportPanel({ ...liveLocation }); return }
    if (!navigator.geolocation) { setLocationError('Location is required to submit a report.'); return }
    navigator.geolocation.getCurrentPosition((position) => showReportPanel({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, heading: Number.isFinite(position.coords.heading) ? position.coords.heading! : 0, speed: position.coords.speed }), () => setLocationError('Location is required to submit a report.'), { enableHighAccuracy: true, maximumAge: 5_000, timeout: 12_000 })
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) { setErrors((current) => ({ ...current, origin: 'Location is not supported on this device.' })); return }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition((position) => {
      setOrigin({ id: `current-${position.coords.latitude}-${position.coords.longitude}`, label: 'Current location', detail: 'Your device location', latitude: position.coords.latitude, longitude: position.coords.longitude })
      setErrors((current) => ({ ...current, origin: undefined }))
      setIsLocating(false)
      resetComparison()
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED ? 'Location permission was denied.' : error.code === error.TIMEOUT ? 'Location request timed out.' : 'Current location is unavailable.'
      setErrors((current) => ({ ...current, origin: message }))
      setIsLocating(false)
    }, { enableHighAccuracy: true, timeout: 10_000 })
  }

  function resetComparison() {
    setIsNavigating(false)
    setNavigationProgress(null)
    resetMutationRef.current()
    setSelectedId('')
    setIsRoutesOpen(false)
    setActiveMobilePanel((panel) => panel === 'routes' ? 'planner' : panel)
  }

  function handleOriginCheckpointChange(place: Place) {
    setOrigin(place)
    setErrors((current) => ({ ...current, origin: undefined }))
    resetComparison()
  }

  function handleDestinationCheckpointChange(place: Place) {
    setDestination(place)
    setErrors((current) => ({ ...current, destination: undefined }))
    resetComparison()
  }

  function handleSwap() {
    setOrigin(destination)
    setDestination(origin)
    setErrors({})
    resetComparison()
  }

  function closePlanner() {
    setIsPlannerOpen(false)
    if (activeMobilePanel === 'planner') setActiveMobilePanel(isRoutesOpen ? 'routes' : 'map')
  }

  function closeRoutes() {
    setIsRoutesOpen(false)
    if (activeMobilePanel === 'routes') setActiveMobilePanel(isPlannerOpen ? 'planner' : 'map')
  }

  function closeReport() {
    setReportLocation(null)
    if (activeMobilePanel === 'report') setActiveMobilePanel(isPlannerOpen ? 'planner' : isRoutesOpen ? 'routes' : 'map')
  }

  const plannerVisibleOnMobile = isPlannerOpen && activeMobilePanel === 'planner'
  const routesVisibleOnMobile = isRoutesOpen && activeMobilePanel === 'routes'
  const reportVisibleOnMobile = Boolean(reportLocation) && activeMobilePanel === 'report'
  const panelStyle = { '--sheet-height': `${mobileSheet.height}%`, '--panel-x': `${plannerDrag.initialPosition.x}px`, '--panel-y': `${plannerDrag.initialPosition.y}px` } as CSSProperties
  const routesPanelStyle = { '--sheet-height': `${mobileSheet.height}%`, '--panel-x': `${routesDrag.initialPosition.x}px`, '--panel-y': `${routesDrag.initialPosition.y}px` } as CSSProperties
  const reportPanelStyle = { '--sheet-height': `${mobileSheet.height}%`, '--panel-x': `${reportDrag.initialPosition.x}px`, '--panel-y': `${reportDrag.initialPosition.y}px`, '--report-height': reportLayout.step === 1 ? '34rem' : reportLayout.hasImages ? '31rem' : '29rem' } as CSSProperties

  return <main id="main-content" className="relative h-full overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
    <section className="absolute inset-0" aria-label="Route map"><RoutePreviewMap origin={origin} destination={destination} routes={routes} selectedId={selected?.id} liveLocation={liveLocation} followLiveLocation={isNavigating} reports={reports} navigationRoute={isNavigating ? selected : null} showWeather={mapLayers.weather} weatherPoints={selectedWeatherPoints} showReports={mapLayers.reports} onNavigationProgress={(progress) => setNavigationProgress({ remainingMeters: progress.remainingMeters, isOffRoute: progress.isOffRoute })} onOriginChange={handleOriginCheckpointChange} onDestinationChange={handleDestinationCheckpointChange} onBoundsChange={handleMapBoundsChange} onRouteSelect={setSelectedId} /></section>

    {isPlannerOpen && <aside id="planner-panel" data-draggable-panel className={`absolute inset-x-0 bottom-0 z-30 h-[var(--sheet-height)] flex-col overflow-hidden rounded-t-[1.75rem] border border-ae-line bg-white/97 shadow-[0_24px_70px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-auto lg:rounded-[1.75rem] lg:left-[var(--panel-x)] lg:top-[var(--panel-y)] lg:h-auto lg:max-h-[calc(100dvh-var(--panel-y)-1.25rem)] lg:w-[30rem] ${plannerVisibleOnMobile ? 'flex' : 'hidden lg:flex'}`} style={panelStyle} aria-label="Route planner"><PlannerPanel origin={origin} destination={destination} mode={mode} preference={preference} sensitiveUser={sensitiveUser} errors={errors} isLocating={isLocating} isPending={comparison.isPending} onOriginChange={(place) => { setOrigin(place); setErrors((current) => ({ ...current, origin: undefined })); resetComparison() }} onDestinationChange={(place) => { setDestination(place); setErrors((current) => ({ ...current, destination: undefined })); resetComparison() }} onModeChange={(value) => { setMode(value); resetComparison() }} onPreferenceChange={(value) => { setPreference(value); resetComparison() }} onSensitiveUserChange={(value) => { setSensitiveUser(value); resetComparison() }} onCurrentLocation={handleCurrentLocation} onSwap={handleSwap} onSubmit={handleSubmit} onClose={closePlanner} onDesktopDragStart={plannerDrag.handlePointerDown} onDesktopDragMove={plannerDrag.handlePointerMove} onDesktopDragEnd={plannerDrag.handlePointerUp} onDesktopDragKeyDown={plannerDrag.handleKeyDown} mobileHandle={{ height: mobileSheet.height, onClick: mobileSheet.handleClick, onPointerDown: mobileSheet.handlePointerDown, onPointerMove: mobileSheet.handlePointerMove, onPointerUp: mobileSheet.handlePointerUp, onKeyDown: mobileSheet.handleKeyDown }} /></aside>}

    {isRoutesOpen && <aside id="routes-panel" data-draggable-panel className={`absolute inset-x-0 bottom-0 z-30 h-[var(--sheet-height)] overflow-hidden rounded-t-[1.75rem] border border-ae-line bg-white/97 shadow-[0_24px_70px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-auto lg:rounded-[1.75rem] lg:left-[var(--panel-x)] lg:top-[var(--panel-y)] lg:h-[calc(100dvh-var(--panel-y)-1.25rem)] lg:w-[25rem] ${routesVisibleOnMobile ? 'block' : 'hidden lg:block'}`} style={routesPanelStyle} aria-label="Route results"><button className="flex w-full touch-none cursor-grab justify-center pt-3 pb-2 active:cursor-grabbing lg:hidden" type="button" aria-label="Resize route panel" aria-valuetext={`${Math.round(mobileSheet.height)} percent height`} onClick={mobileSheet.handleClick} onPointerDown={mobileSheet.handlePointerDown} onPointerMove={mobileSheet.handlePointerMove} onPointerUp={(event) => mobileSheet.handlePointerUp(event, closeRoutes)} onPointerCancel={(event) => mobileSheet.handlePointerUp(event, closeRoutes)} onKeyDown={mobileSheet.handleKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" aria-hidden="true" /></button><div className="h-[calc(100%-2rem)] lg:h-full"><RouteResultsPanel routes={routes} selected={selected} isPending={comparison.isPending} error={comparison.error instanceof Error ? comparison.error : null} onSelect={setSelectedId} onRetry={() => { if (origin && destination) runComparison({ origin, destination, mode, preference, sensitiveUser }) }} canStartNavigation={Boolean(origin?.id.startsWith('current-'))} onStartNavigation={startNavigation} onClose={closeRoutes} onDesktopDragStart={routesDrag.handlePointerDown} onDesktopDragMove={routesDrag.handlePointerMove} onDesktopDragEnd={routesDrag.handlePointerUp} onDesktopDragKeyDown={routesDrag.handleKeyDown} /></div></aside>}

    {reportLocation && <aside id="report-panel" data-draggable-panel className={`absolute inset-x-0 bottom-0 z-30 h-[var(--sheet-height)] overflow-hidden rounded-t-[1.75rem] border border-ae-line bg-white/97 shadow-[0_24px_70px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-auto lg:rounded-[1.75rem] lg:left-[var(--panel-x)] lg:top-[var(--panel-y)] lg:h-[var(--report-height)] lg:max-h-[calc(100dvh-var(--panel-y)-1.25rem)] lg:w-[35rem] ${reportVisibleOnMobile ? 'block' : 'hidden lg:block'}`} style={reportPanelStyle} aria-label="Road report"><RoadReportSheet location={reportLocation} onClose={closeReport} onCreated={(report) => { setReports((current) => [report, ...current]); closeReport() }} onLayoutChange={setReportLayout} onDesktopDragStart={reportDrag.handlePointerDown} onDesktopDragMove={reportDrag.handlePointerMove} onDesktopDragEnd={reportDrag.handlePointerUp} onDesktopDragKeyDown={reportDrag.handleKeyDown} mobileHandle={{ height: mobileSheet.height, onClick: mobileSheet.handleClick, onPointerDown: mobileSheet.handlePointerDown, onPointerMove: mobileSheet.handlePointerMove, onPointerUp: mobileSheet.handlePointerUp, onKeyDown: mobileSheet.handleKeyDown }} /></aside>}

    {isNavigating && destination && <div className="absolute top-[9.75rem] right-20 left-3 z-40 mx-auto max-w-lg rounded-2xl bg-ae-ink p-4 text-white shadow-[0_18px_45px_rgba(20,41,34,.28)] lg:top-5 lg:right-auto lg:left-1/2 lg:-translate-x-1/2"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><span className="text-xs font-black tracking-[.12em] text-[#86d6b3] uppercase">{navigationProgress?.isOffRoute ? 'Return to route' : 'Navigating'}</span><strong className="mt-1 block truncate text-lg font-black">{destination.label}</strong>{navigationProgress && <span className="mt-1 block text-sm font-bold text-white/75">{formatDistance(navigationProgress.remainingMeters)} remaining</span>}</div><button className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20" type="button" aria-label="Stop navigation" onClick={stopNavigation}><X className="size-5" /></button></div></div>}
    <div className="absolute inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-10 grid grid-cols-4 gap-1 rounded-xl border border-ae-line bg-white/96 p-1 shadow-[0_12px_30px_rgba(20,41,34,.2)] backdrop-blur-xl lg:inset-x-auto lg:top-24 lg:right-5 lg:bottom-auto lg:w-32 lg:grid-cols-1 lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"><button className="inline-flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent bg-transparent px-2 text-[10px] font-black text-ae-ink lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:border-ae-line lg:bg-white/96 lg:px-3 lg:text-sm lg:shadow-lg lg:backdrop-blur-xl hover:border-ae-brand hover:bg-ae-soft disabled:opacity-50" type="button" onClick={openRoadReport} disabled={isLocationPending}><img className="size-7 object-contain" src={colorReportIcon} alt="" />Report</button><button className={`inline-flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent px-2 text-[10px] font-black lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-sm lg:shadow-lg lg:backdrop-blur-xl ${isPlannerOpen ? 'border-ae-ink bg-ae-ink text-white' : 'bg-transparent text-ae-ink lg:border-ae-line lg:bg-white/96'}`} type="button" onClick={() => { if (plannerVisibleOnMobile) closePlanner(); else { setIsPlannerOpen(true); setActiveMobilePanel('planner'); mobileSheet.setHeight(55) } }}><img className="size-7 object-contain" src={colorSearchIcon} alt="" />Planner</button><button className={`inline-flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent px-2 text-[10px] font-black lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-sm lg:shadow-lg lg:backdrop-blur-xl ${isRoutesOpen ? 'border-ae-ink bg-ae-ink text-white' : 'bg-transparent text-ae-ink lg:border-ae-line lg:bg-white/96'}`} type="button" onClick={() => { if (routesVisibleOnMobile) closeRoutes(); else { setIsRoutesOpen(true); setActiveMobilePanel('routes'); mobileSheet.setHeight(55) } }}><img className="size-7 object-contain" src={colorSignpostIcon} alt="" />Routes</button><MapLayerControl layers={mapLayers} weatherUnavailable={false} onChange={(layers) => { setMapLayers(layers); if (!layers.reports) setReports([]); }} /></div>
    {locationError && <div className="absolute top-[10rem] right-20 z-40 max-w-64 rounded-xl bg-white p-3 text-xs font-bold text-ae-fastest shadow-lg lg:top-24 lg:right-36">{locationError}</div>}

    {selected && !isRoutesOpen && <div className="pointer-events-none absolute right-4 bottom-4 left-4 z-10 lg:bottom-20 mx-auto hidden max-w-xl grid-cols-3 divide-x divide-ae-line rounded-2xl border border-ae-line bg-white/95 p-3 text-center shadow-[0_14px_40px_rgba(20,41,34,.16)] backdrop-blur-xl lg:grid"><span><img className="mx-auto size-6 object-contain" src={colorTimeIcon} alt="" /><small className="mt-1 block text-[10px] font-black tracking-[.08em] text-ae-muted uppercase">Time</small><strong className="mt-1 block text-sm">{formatDuration(selected.durationSeconds)}</strong></span><span><img className="mx-auto size-6 object-contain" src={colorExposureIcon} alt="" /><small className="mt-1 block text-[10px] font-black tracking-[.08em] text-ae-muted uppercase">Exposure index</small><strong className="mt-1 block text-sm">{formatCompactNumber(selected.estimatedExposureIndex)}</strong></span><span><img className="mx-auto size-6 object-contain" src={colorDistanceIcon} alt="" /><small className="mt-1 block text-[10px] font-black tracking-[.08em] text-ae-muted uppercase">Distance</small><strong className="mt-1 block text-sm">{(selected.distanceMeters / 1000).toFixed(1)} km</strong></span></div>}

  </main>
}
