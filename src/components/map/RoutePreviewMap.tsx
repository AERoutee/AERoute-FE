import { LoaderCircle, MapPinned, TriangleAlert } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { hasGoogleMapsKey, loadGoogleMaps } from '@/config'
import { roadReportIcons } from '@/lib'
import type { Place, RoadReport, RoadReportBounds, RouteOption, WeatherConditions } from '@/types'

type LiveLocation = { latitude: number; longitude: number; accuracy: number; heading: number; speed: number | null }
const emptyWeatherPoints: Array<{ latitude: number; longitude: number; conditions: WeatherConditions }> = []

type RoutePreviewMapProps = {
  origin: Place | null
  destination: Place | null
  routes?: RouteOption[]
  selectedId?: string
  liveLocation?: LiveLocation | null
  followLiveLocation?: boolean
  reports?: RoadReport[]
  weatherPoints?: Array<{ latitude: number; longitude: number; conditions: WeatherConditions }>
  navigationRoute?: RouteOption | null
  onNavigationProgress?: (progress: { remainingMeters: number; heading: number; isOffRoute: boolean }) => void
  onOriginChange?: (place: Place) => void
  onDestinationChange?: (place: Place) => void
  onBoundsChange?: (bounds: RoadReportBounds) => void
  onReportSelect?: (report: RoadReport) => void
  onRouteSelect?: (routeId: string) => void
  onMapReady?: (ready: boolean) => void
  showWeather?: boolean
  showReports?: boolean
  onWeatherAvailabilityChange?: (available: boolean) => void
}

function decodePolyline(encoded: string) {
  const path: google.maps.LatLngLiteral[] = []
  let index = 0, latitude = 0, longitude = 0
  while (index < encoded.length) {
    let result = 0, shift = 0, byte: number
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    latitude += result & 1 ? ~(result >> 1) : result >> 1
    result = 0; shift = 0
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    longitude += result & 1 ? ~(result >> 1) : result >> 1
    path.push({ lat: latitude / 1e5, lng: longitude / 1e5 })
  }
  return path
}

function routeColor(route: RouteOption) {
  if (route.labels.includes('RECOMMENDED')) return '#087f5b'
  if (route.labels.includes('LOWEST_EXPOSURE')) return '#2457a7'
  return '#a83b24'
}

function pm25Color(value: number) {
  if (value <= 15) return '#0a9b68'
  if (value <= 35) return '#e6a51c'
  return '#c0442b'
}

function coloredRouteSegments(path: google.maps.LatLngLiteral[], route: RouteOption) {
  if (path.length < 2 || !route.airQualitySamples?.length) return [{ path, color: routeColor(route) }]
  const colorAt = (point: google.maps.LatLngLiteral) => {
    const nearest = route.airQualitySamples.reduce((selected, sample) => distanceMeters(point, { lat: sample.latitude, lng: sample.longitude }) < distanceMeters(point, { lat: selected.latitude, lng: selected.longitude }) ? sample : selected)
    return pm25Color(nearest.pm25)
  }
  const segments: Array<{ path: google.maps.LatLngLiteral[]; color: string }> = []
  let color = colorAt(path[0])
  let current = [path[0]]
  for (let index = 1; index < path.length; index += 1) {
    const nextColor = colorAt(path[index])
    current.push(path[index])
    if (nextColor !== color && index < path.length - 1) { segments.push({ path: current, color }); current = [path[index]]; color = nextColor }
  }
  segments.push({ path: current, color })
  return segments
}

function distanceMeters(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) {
  const radius = 6_371_000
  const toRadians = (value: number) => value * Math.PI / 180
  const deltaLatitude = toRadians(b.lat - a.lat)
  const deltaLongitude = toRadians(b.lng - a.lng)
  const latitudeA = toRadians(a.lat)
  const latitudeB = toRadians(b.lat)
  const value = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function headingBetween(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) {
  const toRadians = (value: number) => value * Math.PI / 180
  const deltaLongitude = toRadians(b.lng - a.lng)
  const latitudeA = toRadians(a.lat)
  const latitudeB = toRadians(b.lat)
  const y = Math.sin(deltaLongitude) * Math.cos(latitudeB)
  const x = Math.cos(latitudeA) * Math.sin(latitudeB) - Math.sin(latitudeA) * Math.cos(latitudeB) * Math.cos(deltaLongitude)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function snapToRoute(location: google.maps.LatLngLiteral, route: RouteOption) {
  const path = decodePolyline(route.encodedPolyline)
  if (path.length < 2) return null
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY
  path.forEach((point, index) => { const distance = distanceMeters(location, point); if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index } })
  let remainingMeters = 0
  for (let index = nearestIndex; index < path.length - 1; index += 1) remainingMeters += distanceMeters(path[index], path[index + 1])
  const next = path[Math.min(path.length - 1, nearestIndex + 1)]
  return { position: path[nearestIndex], heading: headingBetween(path[nearestIndex], next), remainingMeters, isOffRoute: nearestDistance > 75 }
}

function checkpointIcon(kind: 'origin' | 'destination') {
  const isOrigin = kind === 'origin'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="210%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#142922" flood-opacity=".28"/></filter></defs><g filter="url(#s)"><circle cx="17" cy="17" r="12" fill="${isOrigin ? '#ffffff' : '#087f5b'}" stroke="${isOrigin ? '#142922' : '#ffffff'}" stroke-width="4"/>${isOrigin ? '<circle cx="17" cy="17" r="4" fill="#142922"/>' : ''}</g></svg>`
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, size: new google.maps.Size(34, 34), scaledSize: new google.maps.Size(34, 34), anchor: new google.maps.Point(17, 17) }
}

function liveLocationIcon(heading: number) {
  const safeHeading = Number.isFinite(heading) ? heading : 0
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#142922" flood-opacity=".28"/></filter></defs><circle cx="36" cy="36" r="25" fill="#087f5b" opacity=".16"/><g filter="url(#s)" transform="rotate(${safeHeading} 36 36)"><path d="M36 8L55 55L36 47L17 55Z" fill="#0aa979" stroke="white" stroke-width="5" stroke-linejoin="round"/><path d="M36 17V43" stroke="#86f0c7" stroke-width="3" stroke-linecap="round"/></g></svg>`
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, size: new google.maps.Size(72, 72), scaledSize: new google.maps.Size(72, 72), anchor: new google.maps.Point(36, 36) }
}

const reportImageCache = new Map<string, string>()

async function loadReportImage(source: string, image: HTMLImageElement, container: HTMLElement) {
  try {
    let objectUrl = reportImageCache.get(source)
    if (!objectUrl) {
      const response = await fetch(source, { credentials: 'include' })
      if (!response.ok) throw new Error('Report image unavailable')
      objectUrl = URL.createObjectURL(await response.blob())
      if (reportImageCache.size >= 50) { const oldest = reportImageCache.keys().next().value; if (oldest) { URL.revokeObjectURL(reportImageCache.get(oldest)!); reportImageCache.delete(oldest) } }
      reportImageCache.set(source, objectUrl)
    }
    image.src = objectUrl
    image.style.opacity = '1'
  } catch {
    container.remove()
  }
}

function reportInfoContent(report: RoadReport, onClose: () => void) {
  const root = document.createElement('article')
  root.className = 'aeroute-report-info'
  root.style.cssText = 'width:270px;max-width:270px;overflow:hidden;padding:8px 6px;font-family:Nunito,Segoe UI,sans-serif;color:#142922;'
  const header = document.createElement('div')
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;'
  const icon = document.createElement('img')
  icon.src = roadReportIcons[report.category]
  icon.alt = ''
  icon.style.cssText = 'width:42px;height:42px;object-fit:contain;'
  const heading = document.createElement('div')
  heading.style.cssText = 'min-width:0;flex:1;'
  const title = document.createElement('strong')
  title.textContent = 'Road report'
  title.style.cssText = 'display:block;font-size:16px;font-weight:900;'
  const category = document.createElement('span')
  category.textContent = report.category.replaceAll('_', ' ')
  category.style.cssText = 'display:block;margin-top:2px;font-size:10px;font-weight:900;letter-spacing:.12em;color:#087f5b;'
  heading.append(title, category)
  const close = document.createElement('button')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close road report')
  close.textContent = '×'
  close.style.cssText = 'width:34px;height:34px;flex:none;border:0;background:transparent;color:#51645b;font-size:28px;line-height:1;cursor:pointer;padding:0;'
  close.addEventListener('click', onClose)
  const headerContent = document.createElement('div')
  headerContent.style.cssText = 'display:flex;min-width:0;align-items:center;gap:10px;'
  headerContent.append(icon, heading)
  header.append(headerContent, close)
  const description = document.createElement('p')
  description.textContent = report.description
  description.style.cssText = 'margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#e5f4ed;font-size:14px;line-height:1.5;font-weight:700;'
  const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(report.createdAt).getTime()) / 60000))
  const reporter = document.createElement('small')
  reporter.textContent = `Reported by ${report.reporter} · ${ageMinutes < 1 ? 'just now' : `${ageMinutes} min ago`}`
  reporter.style.cssText = 'display:block;margin-top:9px;font-size:11px;font-weight:700;color:#65766e;'
  root.append(header, description, reporter)
  if (report.images.length > 0) {
    const gallery = document.createElement('div')
    gallery.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:11px;'
    report.images.forEach((source, index) => {
      const link = document.createElement('a')
      link.href = source
      link.target = '_blank'
      link.rel = 'noreferrer'
      link.setAttribute('aria-label', `Open road report photo ${index + 1}`)
      const image = document.createElement('img')
      image.alt = `Road report photo ${index + 1}`
      image.loading = 'lazy'
      image.referrerPolicy = 'no-referrer'
      image.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#e5f4ed;display:block;opacity:0;transition:opacity .2s ease;'
      link.append(image)
      gallery.append(link)
      void loadReportImage(source, image, link)
    })
    root.append(gallery)
  }
  return root
}

function reportIcon(category: RoadReport['category']) {
  return { url: roadReportIcons[category], size: new google.maps.Size(56, 56), scaledSize: new google.maps.Size(56, 56), anchor: new google.maps.Point(28, 48) }
}

function weatherSymbol(conditionType: string) {
  const type = conditionType.toLowerCase()
  if (type.includes('thunder')) return '⛈️'
  if (type.includes('rain') || type.includes('drizzle')) return '🌧️'
  if (type.includes('cloud')) return '☁️'
  if (type.includes('clear')) return '☀️'
  return '🌤️'
}

function weatherCardIcon(weather: Extract<WeatherConditions, { status: 'available' }>) {
  const symbol = weatherSymbol(weather.conditionType)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="72" viewBox="0 0 168 72"><defs><filter id="s" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#142922" flood-opacity=".22"/></filter></defs><g filter="url(#s)"><rect x="4" y="4" width="160" height="62" rx="10" fill="#1769e0"/><text x="17" y="34" font-family="Arial,sans-serif" font-size="24" font-weight="900" fill="white">${Math.round(weather.temperatureC)}°</text><text x="138" y="34" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif" font-size="22">${symbol}</text><text x="17" y="55" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#dcebff">Rain ${weather.precipitationProbabilityPercent}%</text><line x1="82" y1="45" x2="82" y2="57" stroke="#82b4f6"/><text x="93" y="55" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#dcebff">Wind ${Math.round(weather.windSpeedKph)} km/h</text></g></svg>`
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, size: new google.maps.Size(168, 72), scaledSize: new google.maps.Size(168, 72), anchor: new google.maps.Point(84, 90) }
}

function RoutePreviewMapComponent({ origin, destination, routes = [], selectedId, liveLocation, followLiveLocation, reports = [], weatherPoints = emptyWeatherPoints, navigationRoute, onNavigationProgress, onOriginChange, onDestinationChange, onBoundsChange, onReportSelect, onRouteSelect, onMapReady, showWeather = false, showReports = true, onWeatherAvailabilityChange }: RoutePreviewMapProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const locationMarkerRef = useRef<google.maps.Marker | null>(null)
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null)
  const checkpointOverlays = useRef<Array<google.maps.Marker | google.maps.Polyline>>([])
  const reportMarkers = useRef<google.maps.Marker[]>([])
  const reportInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const weatherMarkersRef = useRef<google.maps.Marker[]>([])
  const callbacks = useRef({ onOriginChange, onDestinationChange, onBoundsChange, onReportSelect, onRouteSelect, onMapReady, onNavigationProgress, onWeatherAvailabilityChange })
  const lastFitSignatureRef = useRef('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>(hasGoogleMapsKey() ? 'loading' : 'unavailable')
  const [mapVersion, setMapVersion] = useState(0)

  useEffect(() => { callbacks.current = { onOriginChange, onDestinationChange, onBoundsChange, onReportSelect, onRouteSelect, onMapReady, onNavigationProgress, onWeatherAvailabilityChange } }, [onBoundsChange, onDestinationChange, onMapReady, onNavigationProgress, onOriginChange, onReportSelect, onRouteSelect, onWeatherAvailabilityChange])

  useEffect(() => {
    callbacks.current.onMapReady?.(false)
    if (!hasGoogleMapsKey() || !nodeRef.current) return
    let active = true
    let idleListener: google.maps.MapsEventListener | undefined
    let tilesLoadedListener: google.maps.MapsEventListener | undefined
    let resizeObserver: ResizeObserver | undefined
    let loadingTimeout = 0
    void loadGoogleMaps().then((library) => {
      if (!active || !library || !nodeRef.current) return
      const map = new library.Map(nodeRef.current, { center: { lat: -6.2088, lng: 106.8456 }, zoom: 12, minZoom: 3, maxZoom: 20, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false, gestureHandling: 'greedy', scrollwheel: true })
      mapRef.current = map
      idleListener = map.addListener('idle', () => {
        const bounds = map.getBounds()
        if (!bounds) return
        const northEast = bounds.getNorthEast(), southWest = bounds.getSouthWest()
        callbacks.current.onBoundsChange?.({ north: northEast.lat(), east: northEast.lng(), south: southWest.lat(), west: southWest.lng() })
      })
      tilesLoadedListener = google.maps.event.addListenerOnce(map, 'tilesloaded', () => { window.clearTimeout(loadingTimeout); if (active) { setStatus('ready'); callbacks.current.onMapReady?.(true) } })
      loadingTimeout = window.setTimeout(() => { if (active) { setStatus('error'); callbacks.current.onMapReady?.(false) } }, 12_000)
      let previousWidth = nodeRef.current.clientWidth
      let previousHeight = nodeRef.current.clientHeight
      resizeObserver = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width)
        const height = Math.round(entry.contentRect.height)
        if (Math.abs(width - previousWidth) < 2 && Math.abs(height - previousHeight) < 2) return
        previousWidth = width
        previousHeight = height
        const center = map.getCenter()
        google.maps.event.trigger(map, 'resize')
        if (center) map.setCenter(center)
      })
      resizeObserver.observe(nodeRef.current)
      setMapVersion((value) => value + 1)
    }).catch(() => { if (active) { setStatus('error'); callbacks.current.onMapReady?.(false) } })
    return () => { active = false; window.clearTimeout(loadingTimeout); idleListener?.remove(); tilesLoadedListener?.remove(); resizeObserver?.disconnect(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    checkpointOverlays.current.forEach((overlay) => overlay.setMap(null))
    checkpointOverlays.current = []
    const bounds = new google.maps.LatLngBounds()
    if (origin) {
      const marker = new google.maps.Marker({ map, position: { lat: origin.latitude, lng: origin.longitude }, title: `Origin: ${origin.label}`, icon: checkpointIcon('origin'), draggable: Boolean(callbacks.current.onOriginChange), optimized: false })
      marker.addListener('dragend', () => { const position = marker.getPosition(); if (position && callbacks.current.onOriginChange) { callbacks.current.onOriginChange({ ...origin, id: `map-origin-${position.lat()}-${position.lng()}`, label: 'Adjusted origin', detail: 'Checkpoint moved on map', latitude: position.lat(), longitude: position.lng() }) } })
      checkpointOverlays.current.push(marker); bounds.extend(marker.getPosition()!)
    }
    if (destination) {
      const marker = new google.maps.Marker({ map, position: { lat: destination.latitude, lng: destination.longitude }, title: `Destination: ${destination.label}`, icon: checkpointIcon('destination'), draggable: Boolean(callbacks.current.onDestinationChange), optimized: false })
      marker.addListener('dragend', () => { const position = marker.getPosition(); if (position && callbacks.current.onDestinationChange) { callbacks.current.onDestinationChange({ ...destination, id: `map-destination-${position.lat()}-${position.lng()}`, label: 'Adjusted destination', detail: 'Checkpoint moved on map', latitude: position.lat(), longitude: position.lng() }) } })
      checkpointOverlays.current.push(marker); bounds.extend(marker.getPosition()!)
    }
    routes.forEach((route) => {
      const path = decodePolyline(route.encodedPolyline)
      path.forEach((point) => bounds.extend(point))
      const selected = !selectedId || route.id === selectedId
      const hitLine = new google.maps.Polyline({ map, path, strokeOpacity: 0, strokeWeight: 24, clickable: true, zIndex: selected ? 5 : 2 })
      const visualLines = coloredRouteSegments(path, route).map((segment) => new google.maps.Polyline({ map, path: segment.path, strokeColor: segment.color, strokeOpacity: selected ? 1 : .25, strokeWeight: selected ? 8 : 5, clickable: false, zIndex: selected ? 3 : 1 }))
      hitLine.addListener('click', () => callbacks.current.onRouteSelect?.(route.id))
      hitLine.addListener('mouseover', () => visualLines.forEach((line) => line.setOptions({ strokeOpacity: 1, strokeWeight: selected ? 10 : 8 })))
      hitLine.addListener('mouseout', () => visualLines.forEach((line) => line.setOptions({ strokeOpacity: selected ? 1 : .25, strokeWeight: selected ? 8 : 5 })))
      checkpointOverlays.current.push(hitLine, ...visualLines)
    })
    const fitSignature = `${origin?.latitude},${origin?.longitude}|${destination?.latitude},${destination?.longitude}|${routes.map((route) => route.encodedPolyline).join('|')}`
    if ((origin || destination || routes.length) && fitSignature !== lastFitSignatureRef.current) { lastFitSignatureRef.current = fitSignature; map.fitBounds(bounds, { top: 150, right: 96, bottom: 96, left: 96 }) }
  }, [destination, mapVersion, origin, routes, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !liveLocation) return
    const rawPosition = { lat: liveLocation.latitude, lng: liveLocation.longitude }
    const snapped = navigationRoute ? snapToRoute(rawPosition, navigationRoute) : null
    const position = snapped && !snapped.isOffRoute ? snapped.position : rawPosition
    const heading = snapped && !snapped.isOffRoute ? snapped.heading : liveLocation.heading
    if (snapped) callbacks.current.onNavigationProgress?.({ remainingMeters: snapped.remainingMeters, heading, isOffRoute: snapped.isOffRoute })
    if (!locationMarkerRef.current) locationMarkerRef.current = new google.maps.Marker({ map, position, icon: liveLocationIcon(heading), title: 'Your live location', zIndex: 10, optimized: false })
    else { locationMarkerRef.current.setPosition(position); locationMarkerRef.current.setIcon(liveLocationIcon(heading)) }
    if (!accuracyCircleRef.current) accuracyCircleRef.current = new google.maps.Circle({ map, center: rawPosition, radius: liveLocation.accuracy, strokeColor: '#087f5b', strokeOpacity: .35, strokeWeight: 1, fillColor: '#087f5b', fillOpacity: .08, clickable: false })
    else { accuracyCircleRef.current.setCenter(rawPosition); accuracyCircleRef.current.setRadius(liveLocation.accuracy) }
    if (followLiveLocation) { map.panTo(position); if (navigationRoute && (map.getZoom() ?? 0) < 17) map.setZoom(17) }
  }, [followLiveLocation, liveLocation, mapVersion, navigationRoute])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!showWeather) { weatherMarkersRef.current.forEach((marker) => marker.setMap(null)); weatherMarkersRef.current = []; return }
    const available = weatherPoints.filter((point): point is typeof point & { conditions: Extract<WeatherConditions, { status: 'available' }> } => point.conditions.status === 'available')
    callbacks.current.onWeatherAvailabilityChange?.(available.length > 0)
    const current = weatherMarkersRef.current
    const next = available.map((point, index) => {
      const position = { lat: point.latitude, lng: point.longitude }
      const marker = current[index] ?? new google.maps.Marker({ map, zIndex: 7, optimized: false })
      marker.setMap(map)
      marker.setPosition(position)
      marker.setIcon(weatherCardIcon(point.conditions))
      marker.setTitle(`${point.conditions.condition}, ${Math.round(point.conditions.temperatureC)} degrees Celsius`)
      return marker
    })
    current.slice(next.length).forEach((marker) => marker.setMap(null))
    weatherMarkersRef.current = next
  }, [mapVersion, showWeather, weatherPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    reportMarkers.current.forEach((marker) => marker.setMap(null))
    if (!showReports) { reportMarkers.current = []; reportInfoWindowRef.current?.close(); return }
    reportMarkers.current = reports.map((report) => {
      const marker = new google.maps.Marker({ map, position: { lat: report.latitude, lng: report.longitude }, icon: reportIcon(report.category), title: report.description, zIndex: 6, optimized: false })
      marker.addListener('click', () => {
        const infoWindow = reportInfoWindowRef.current ?? new google.maps.InfoWindow({ disableAutoPan: false, maxWidth: 300, headerDisabled: true })
        reportInfoWindowRef.current = infoWindow
        infoWindow.setContent(reportInfoContent(report, () => infoWindow.close()))
        infoWindow.open({ map, anchor: marker, shouldFocus: false })
      })
      return marker
    })
  }, [mapVersion, reports, showReports])

  useEffect(() => () => { weatherMarkersRef.current.forEach((marker) => marker.setMap(null)); reportInfoWindowRef.current?.close(); checkpointOverlays.current.forEach((overlay) => overlay.setMap(null)); reportMarkers.current.forEach((marker) => marker.setMap(null)); locationMarkerRef.current?.setMap(null); accuracyCircleRef.current?.setMap(null) }, [])

  return <div className="relative h-full min-h-[28rem] overflow-hidden bg-white"><div className="absolute inset-0" ref={nodeRef} aria-label={origin && destination ? `Map from ${origin.label} to ${destination.label}` : 'Jakarta route map'} />{status === 'loading' && <div className="absolute inset-0 grid place-items-center bg-white"><span className="inline-flex items-center gap-2 text-sm font-extrabold text-ae-brand"><LoaderCircle className="size-5 animate-spin" />Loading...</span></div>}{(status === 'unavailable' || status === 'error') && <div className="absolute inset-0 grid place-items-center bg-white p-6"><div className="text-center">{status === 'error' ? <TriangleAlert className="mx-auto size-8 text-ae-fastest" /> : <MapPinned className="mx-auto size-8 text-ae-brand" />}<strong className="mt-3 block text-base font-black">Map unavailable</strong></div></div>}</div>
}

export const RoutePreviewMap = memo(RoutePreviewMapComponent)
