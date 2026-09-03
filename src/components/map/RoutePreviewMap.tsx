import { LoaderCircle, MapPinned, TriangleAlert } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getTransitStopDetails } from '@/api/route-comparison'
import { colorChairIcon, colorDoorIcon, colorParkingIcon, colorToiletIcon } from '@/assets'
import { apiBaseURL, hasGoogleMapsKey, loadGoogleMaps } from '@/config'
import { coloredRouteSegments, googleMapsUrl, googleProfilePhotoUrl, placePhotoUrl, restoreInfoWindowFocus, roadReportIcons } from '@/lib'
import type { LiveLocation, ParkingOptions, Place, PlacePhoto, RestStopCandidate, RoadReport, RoadReportBounds, RouteOption, TransitStop, TransitStopDetailsResult, WeatherConditions } from '@/types'
const emptyRoutes: RouteOption[] = []
const emptyReports: RoadReport[] = []
const emptyRestStops: RestStopCandidate[] = []
const emptyTransitStops: TransitStop[] = []
const emptyWeatherPoints: Array<{ latitude: number; longitude: number; conditions: WeatherConditions }> = []
let closeActiveLightbox: (() => void) | null = null

type ReportPopupPortalProps = {
  host: HTMLElement
  report: RoadReport
  render: (report: RoadReport, onClose: () => void) => ReactNode
  onClose: () => void
}

function ReportPopupPortal({ host, report, render, onClose }: ReportPopupPortalProps) {
  return createPortal(render(report, onClose), host)
}

type RoutePreviewMapProps = {
  origin: Place | null
  destination: Place | null
  routes?: RouteOption[]
  selectedId?: string
  selectedRouteResultId?: string
  liveLocation?: LiveLocation | null
  followLiveLocation?: boolean
  reports?: RoadReport[]
  restStopCandidates?: RestStopCandidate[]
  transitStops?: TransitStop[]
  weatherPoints?: Array<{ latitude: number; longitude: number; conditions: WeatherConditions }>
  navigationRoute?: RouteOption | null
  onNavigationProgress?: (progress: { remainingMeters: number; heading: number; isOffRoute: boolean }) => void
  onOriginChange?: (place: Place) => void
  onDestinationChange?: (place: Place) => void
  onBoundsChange?: (bounds: RoadReportBounds) => void
  selectedReport?: RoadReport | null
  onReportSelect?: (report: RoadReport) => void
  onReportClose?: () => void
  reportPopup?: (report: RoadReport, onClose: () => void) => ReactNode
  onRouteSelect?: (routeId: string) => void
  onMapReady?: (ready: boolean) => void
  showWeather?: boolean
  showReports?: boolean
  showRestStops?: boolean
  showAccessiblePlaces?: boolean
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

function reportIcon(category: RoadReport['category']) {
  return { url: roadReportIcons[category], size: new google.maps.Size(56, 56), scaledSize: new google.maps.Size(56, 56), anchor: new google.maps.Point(28, 48) }
}

const transitIconUrls = {
  bus: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#1769e0"/><path d="M14 12h18c2 0 3 2 3 4v15h-3v4h-4v-4H18v4h-4v-4h-3V16c0-2 1-4 3-4zm1 5v7h16v-7H15zm2 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="white"/></svg>')}`,
  subway: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#7c3aed"/><path d="M15 10h16c3 0 5 3 5 6v12c0 3-2 5-5 5l3 4h-5l-3-4h-6l-3 4h-5l3-4c-3 0-5-2-5-5V16c0-3 2-6 5-6zm0 7v8h16v-8H15zm3 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="white"/></svg>')}`,
  train: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#087f5b"/><path d="M15 9h16c3 0 5 3 5 6v14c0 3-2 5-5 5l4 4h-5l-3-4h-8l-3 4h-5l4-4c-3 0-5-2-5-5V15c0-3 2-6 5-6zm0 7v9h16v-9H15zm3 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="white"/></svg>')}`,
  bicycle: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#d97706"/><path d="M13 24a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm20 0a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM13 27a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm20 0a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-9-13a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-3 7-5 10h4l3-6 4 4v5h4v-7l-5-5 2-3h5v-3h-7l-5 5z" fill="white"/></svg>')}`,
  walk: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#0f766e"/><path d="M17 9c3 0 5 3 5 6s-2 6-5 6-5-3-5-6 2-6 5-6zm12 14c3 0 5 3 5 6s-2 6-5 6-5-3-5-6 2-6 5-6zm-12 0c4 0 7 3 7 7 0 3-3 7-7 7s-7-4-7-7c0-4 3-7 7-7zm12-14c4 0 7 4 7 7 0 4-3 7-7 7s-7-3-7-7c0-3 3-7 7-7z" fill="white"/></svg>')}`,
  transit: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#51645b"/><path d="M11 21h16l-4-4 3-3 9 9-9 9-3-3 4-4H11v-4z" fill="white"/></svg>')}`,
}

function transitIcon(vehicleType: string) {
  const type = vehicleType.trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_')
  const key = type === 'BUS' ? 'bus' : type === 'SUBWAY' || type === 'METRO' ? 'subway' : type === 'TRAIN' || type === 'RAIL' || type === 'LIGHT_RAIL' ? 'train' : type === 'BICYCLE' || type === 'BIKE' ? 'bicycle' : type === 'WALK' || type === 'WALKING' ? 'walk' : 'transit'
  return { url: transitIconUrls[key], size: new google.maps.Size(46, 46), scaledSize: new google.maps.Size(46, 46), anchor: new google.maps.Point(23, 42), labelOrigin: new google.maps.Point(23, 17) }
}

function popupShell(eyebrowText: string, titleText: string, close: () => void) {
  const root = document.createElement('article')
  root.style.cssText = 'position:relative;width:100%;max-width:min(34rem,calc(100vw - 2rem));max-height:min(75dvh,36rem);overflow:auto;padding:14px;font-family:Nunito,Segoe UI,sans-serif;color:#142922;box-sizing:border-box;'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', 'Close place details')
  closeButton.textContent = '×'
  closeButton.style.cssText = 'position:absolute;top:0;right:0;z-index:2;width:44px;height:44px;border:0;background:rgba(255,255,255,.94);font-size:26px;line-height:1;cursor:pointer;'
  closeButton.addEventListener('click', close)
  const eyebrow = document.createElement('span')
  eyebrow.textContent = eyebrowText
  eyebrow.style.cssText = 'display:block;padding-right:44px;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#087f5b;'
  const title = document.createElement('strong')
  title.textContent = titleText
  title.style.cssText = 'display:block;margin-top:3px;padding-right:44px;font-size:16px;font-weight:900;'
  root.append(closeButton, eyebrow, title)
  queueMicrotask(() => closeButton.focus())
  return root
}

function safeLink(label: string, value?: string) {
  const url = googleMapsUrl(value)
  if (!url) return null
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = label
  link.style.cssText = 'color:#087f5b;font-weight:900;'
  return link
}

function appendPhotoAttribution(root: HTMLElement, photo: PlacePhoto) {
  const authors = document.createElement('div')
  authors.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;font-size:12px;'
  photo.authorAttributions?.forEach((author) => {
    const avatarUrl = googleProfilePhotoUrl(author.photoUri)
    if (avatarUrl) { const avatar = document.createElement('img'); avatar.src = avatarUrl; avatar.alt = ''; avatar.style.cssText = 'width:28px;height:28px;border-radius:50%;object-fit:cover;'; avatar.addEventListener('error', () => avatar.remove()); authors.append(avatar) }
    authors.append(safeLink(author.displayName, author.uri) ?? document.createTextNode(author.displayName))
  })
  if (authors.childNodes.length) root.append(authors)
}

function carouselButton(label: string, text: string, onClick: () => void) {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', label)
  button.textContent = text
  button.style.cssText = 'width:44px;height:44px;border:0;border-radius:999px;background:rgba(20,41,34,.82);color:white;font-size:24px;line-height:1;cursor:pointer;'
  button.addEventListener('click', onClick)
  return button
}

function restoreRerenderedFocus(root: HTMLElement) {
  const focused = document.activeElement
  if (!(focused instanceof HTMLElement) || !root.contains(focused)) return () => undefined
  const label = focused.getAttribute('aria-label')
  return () => queueMicrotask(() => {
    const controls = Array.from(root.querySelectorAll<HTMLElement>('button,[tabindex]'))
    const target = label?.startsWith('Open photo ') ? controls.find((control) => control.getAttribute('aria-label')?.startsWith('Open photo ')) : controls.find((control) => control.getAttribute('aria-label') === label)
    ;(target ?? root).focus()
  })
}

function openPhotoLightbox(place: RestStopCandidate, sourcePhotos: PlacePhoto[], initialIndex: number, trigger: HTMLElement) {
  closeActiveLightbox?.()
  const photos = sourcePhotos.slice()
  let index = initialIndex
  const overlay = document.createElement('div')
  overlay.setAttribute('data-place-lightbox', '')
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', `${place.name} photo`)
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(10,24,19,.82);padding:24px;'
  const panel = document.createElement('div')
  panel.style.cssText = 'position:relative;width:min(48rem,100%);max-height:calc(100vh - 48px);overflow:auto;border-radius:16px;background:white;padding:16px;color:#142922;'
  const close = document.createElement('button')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close photo')
  close.textContent = '×'
  close.style.cssText = 'position:absolute;top:0;right:0;z-index:2;width:44px;height:44px;border:0;background:white;font-size:28px;cursor:pointer;'
  const dismiss = () => { overlay.remove(); document.removeEventListener('keydown', onKeyDown); closeActiveLightbox = null; if (trigger.isConnected) trigger.focus() }
  const show = (next: number) => { index = (next + photos.length) % photos.length; renderPhoto() }
  const renderPhoto = () => {
    const restoreFocus = restoreRerenderedFocus(panel)
    panel.replaceChildren()
    const photo = photos[index]
    const source = placePhotoUrl(photo.name, apiBaseURL)
    if (!source) { photos.splice(index, 1); if (!photos.length) { dismiss(); return }; index = Math.min(index, photos.length - 1); renderPhoto(); return }
    const image = document.createElement('img')
    image.src = source
    image.alt = `${place.name} photo ${index + 1}`
    image.style.cssText = 'display:block;width:100%;max-height:70vh;object-fit:contain;border-radius:10px;background:#e5f4ed;'
    image.addEventListener('error', () => { photos.splice(index, 1); if (!photos.length) { dismiss(); return }; index = Math.min(index, photos.length - 1); renderPhoto() })
    panel.append(image)
    if (photos.length > 1) {
      const previous = carouselButton('Previous photo', '‹', () => show(index - 1))
      const next = carouselButton('Next photo', '›', () => show(index + 1))
      previous.style.cssText += 'position:absolute;left:24px;top:50%;transform:translateY(-50%);'
      next.style.cssText += 'position:absolute;right:24px;top:50%;transform:translateY(-50%);'
      panel.append(previous, next)
    }
    const indicator = document.createElement('span')
    indicator.textContent = `${index + 1} of ${photos.length}`
    indicator.setAttribute('aria-live', 'polite')
    indicator.style.cssText = 'display:block;margin-top:10px;text-align:center;font-size:12px;font-weight:900;'
    appendPhotoAttribution(panel, photo)
    panel.append(indicator, close)
    restoreFocus()
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { dismiss(); return }
    if (event.key === 'ArrowLeft' && photos.length > 1) { event.preventDefault(); show(index - 1); return }
    if (event.key === 'ArrowRight' && photos.length > 1) { event.preventDefault(); show(index + 1); return }
    if (event.key !== 'Tab') return
    const controls = Array.from(panel.querySelectorAll<HTMLElement>('button,a[href]'))
    if (!controls.length) return
    const first = controls[0], last = controls.at(-1)!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  close.addEventListener('click', dismiss)
  overlay.addEventListener('click', (event) => { if (event.target === overlay) dismiss() })
  document.addEventListener('keydown', onKeyDown)
  closeActiveLightbox = dismiss
  renderPhoto()
  overlay.append(panel)
  document.body.append(overlay)
  close.focus()
}

function placePhotos(place: RestStopCandidate) {
  return (place.photos ?? []).slice(0, 3).filter((photo) => placePhotoUrl(photo.name, apiBaseURL))
}

function appendGallery(root: HTMLElement, place: RestStopCandidate) {
  const photos = placePhotos(place)
  if (!photos.length) return
  let index = 0
  const gallery = document.createElement('div')
  gallery.setAttribute('data-place-gallery', '')
  gallery.tabIndex = 0
  gallery.style.cssText = 'margin-top:12px;outline-offset:2px;'
  const show = (next: number) => { index = (next + photos.length) % photos.length; renderPhoto() }
  const renderPhoto = () => {
    const restoreFocus = restoreRerenderedFocus(gallery)
    gallery.replaceChildren()
    const photo = photos[index]
    const source = placePhotoUrl(photo.name, apiBaseURL)
    if (!source) { photos.splice(index, 1); if (!photos.length) { gallery.remove(); return }; index = Math.min(index, photos.length - 1); renderPhoto(); return }
    const frame = document.createElement('div')
    frame.style.cssText = 'position:relative;overflow:hidden;border-radius:10px;background:#e5f4ed;'
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-label', `Open photo ${index + 1}`)
    button.style.cssText = 'display:block;width:100%;border:0;background:transparent;padding:0;cursor:pointer;'
    const image = document.createElement('img')
    image.src = source
    image.alt = `${place.name} photo ${index + 1}`
    image.width = 16
    image.height = 9
    image.style.cssText = 'display:block;width:100%;height:auto;aspect-ratio:16 / 9;object-fit:cover;'
    image.addEventListener('error', () => { photos.splice(index, 1); if (!photos.length) { gallery.remove(); return }; index = Math.min(index, photos.length - 1); renderPhoto() })
    button.addEventListener('click', () => openPhotoLightbox(place, photos, index, button))
    button.append(image)
    frame.append(button)
    if (photos.length > 1) {
      const previous = carouselButton('Previous photo', '‹', () => show(index - 1))
      const next = carouselButton('Next photo', '›', () => show(index + 1))
      previous.style.cssText += 'position:absolute;left:8px;top:50%;transform:translateY(-50%);'
      next.style.cssText += 'position:absolute;right:8px;top:50%;transform:translateY(-50%);'
      frame.append(previous, next)
    }
    gallery.append(frame)
    const indicator = document.createElement('span')
    indicator.textContent = `${index + 1} of ${photos.length}`
    indicator.setAttribute('aria-live', 'polite')
    indicator.style.cssText = 'display:block;margin-top:6px;text-align:center;font-size:11px;font-weight:900;'
    appendPhotoAttribution(gallery, photo)
    gallery.append(indicator)
    if (photos.length > 1) {
      const dots = document.createElement('div')
      dots.style.cssText = 'display:flex;justify-content:center;gap:6px;margin-top:6px;'
      photos.forEach((_item, dotIndex) => {
        const dot = document.createElement('button')
        dot.type = 'button'
        dot.setAttribute('aria-label', `Show photo ${dotIndex + 1}`)
        dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false')
        dot.style.cssText = `width:12px;height:12px;border:0;border-radius:999px;background:${dotIndex === index ? '#087f5b' : '#b8c5bf'};padding:0;cursor:pointer;`
        dot.addEventListener('click', () => show(dotIndex))
        dots.append(dot)
      })
      gallery.append(dots)
    }
    restoreFocus()
  }
  gallery.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' && photos.length > 1) { event.preventDefault(); show(index - 1) }
    if (event.key === 'ArrowRight' && photos.length > 1) { event.preventDefault(); show(index + 1) }
  })
  renderPhoto()
  if (gallery.childNodes.length) root.append(gallery)
}

function facilityRows(root: HTMLElement, rows: Array<{ label: string; value: string; icon?: string }>) {
  const list = document.createElement('dl')
  list.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0 0;font-size:11px;'
  rows.forEach(({ label, value, icon }) => {
    const row = document.createElement('div')
    row.style.cssText = 'border-radius:7px;background:#f3f7f5;padding:7px;'
    const term = document.createElement('dt')
    term.style.cssText = 'display:flex;align-items:center;gap:5px;font-weight:800;color:#65766e;'
    if (icon) { const image = document.createElement('img'); image.src = icon; image.alt = ''; image.style.cssText = 'width:20px;height:20px;object-fit:contain;'; term.append(image) }
    term.append(document.createTextNode(`${label} `))
    const detail = document.createElement('dd')
    detail.textContent = value
    detail.style.cssText = 'margin:2px 0 0;font-weight:900;'
    row.append(term, detail)
    list.append(row)
  })
  if (list.childNodes.length) root.append(list)
}

function placeInfoContent(place: RestStopCandidate, accessible: boolean, close: () => void) {
  const root = popupShell('Rest-stop candidate', place.name, close)
  const layout = document.createElement('div')
  layout.className = 'aeroute-place-grid'
  const primary = document.createElement('div')
  primary.className = 'aeroute-place-primary'
  const facilities = document.createElement('div')
  facilities.className = 'aeroute-place-facilities'
  appendGallery(primary, place)
  const address = document.createElement('span')
  address.textContent = place.formattedAddress ?? 'Address unknown'
  address.style.cssText = 'display:block;margin-top:8px;font-size:11px;font-weight:700;color:#65766e;overflow-wrap:anywhere;'
  primary.append(address)
  if (accessible) { const badge = document.createElement('strong'); badge.textContent = 'Accessibility information available'; badge.style.cssText = 'display:inline-flex;margin-top:8px;border-radius:999px;background:#e5f4ed;padding:5px 8px;font-size:10px;font-weight:900;color:#087f5b;'; primary.append(badge) }
  const accessibility = place.accessibility
  const state = (value: boolean | undefined, negative = 'Not available') => value === undefined ? 'Unknown' : value ? 'Available' : negative
  facilityRows(facilities, [
    { label: 'Open status', value: place.openNow === undefined ? 'Unknown' : place.openNow ? 'Open now' : 'Closed' },
    { label: 'Toilet', value: state(place.restroom, 'Not listed'), icon: colorToiletIcon },
    { label: 'Entrance', value: state(accessibility?.wheelchairAccessibleEntrance), icon: colorDoorIcon },
    { label: 'Parking', value: state(accessibility?.wheelchairAccessibleParking), icon: colorParkingIcon },
    { label: 'Restroom', value: state(accessibility?.wheelchairAccessibleRestroom), icon: colorToiletIcon },
    { label: 'Seating', value: state(accessibility?.wheelchairAccessibleSeating), icon: colorChairIcon },
  ])
  const disclosure = document.createElement('small')
  disclosure.textContent = 'Safety not verified'
  disclosure.style.cssText = 'display:block;margin-top:8px;font-size:10px;font-weight:700;color:#65766e;'
  primary.append(disclosure)
  layout.append(primary, facilities)
  root.append(layout)
  return root
}

function transitParking(options?: ParkingOptions) {
  if (!options || !Object.values(options).some((value) => value !== undefined)) return undefined
  return Object.values(options).some(Boolean)
}

function transitStopInfoContent(stop: TransitStop, state: 'loading' | 'error' | TransitStopDetailsResult, close: () => void) {
  const root = popupShell('Transit stop', stop.name, close)
  const baseDetails = document.createElement('p')
  baseDetails.textContent = `${stop.role === 'departure' ? 'Departure' : 'Arrival'} · Stop ${stop.ordinal} · ${stop.vehicleType}${stop.line ? ` · ${stop.line}` : ''}${stop.headsign ? ` · toward ${stop.headsign}` : ''}`
  baseDetails.style.cssText = 'margin:5px 0 0;font-size:12px;line-height:1.5;font-weight:700;color:#51645b;'
  root.append(baseDetails)
  if (state === 'loading' || state === 'error' || state.status === 'NOT_FOUND') {
    const status = document.createElement('p')
    status.textContent = state === 'loading' ? 'Loading Google Places details…' : state === 'error' ? 'Transit stop details are temporarily unavailable.' : 'No Google Places details found.'
    status.style.cssText = 'margin:10px 0 0;font-size:11px;font-weight:700;color:#65766e;'
    status.setAttribute('role', 'status')
    root.append(status)
    return root
  }
  const place = state.place
  appendGallery(root, place)
  if (place.formattedAddress) { const address = document.createElement('span'); address.textContent = place.formattedAddress; address.style.cssText = 'display:block;margin-top:8px;font-size:11px;font-weight:700;color:#65766e;'; root.append(address) }
  const accessibility = place.accessibility
  if (accessibility && Object.values(accessibility).some(Boolean)) { const badge = document.createElement('strong'); badge.textContent = 'Accessibility information available'; badge.style.cssText = 'display:inline-flex;margin-top:8px;border-radius:999px;background:#e5f4ed;padding:5px 8px;font-size:10px;font-weight:900;color:#087f5b;'; root.append(badge) }
  const rows: Array<{ label: string; value: string; icon?: string }> = []
  const add = (label: string, value: boolean | undefined, positive: string, negative: string, icon?: string) => { if (value !== undefined) rows.push({ label, value: value ? positive : negative, icon }) }
  add('Open status', place.openNow, 'Open now', 'Closed')
  add('Toilet', place.restroom, 'Available', 'Not listed', colorToiletIcon)
  add('Parking', transitParking(place.parkingOptions), 'Available', 'Not available', colorParkingIcon)
  add('Entrance', accessibility?.wheelchairAccessibleEntrance, 'Available', 'Not available', colorDoorIcon)
  add('Accessible restroom', accessibility?.wheelchairAccessibleRestroom, 'Available', 'Not available', colorToiletIcon)
  add('Accessible seating', accessibility?.wheelchairAccessibleSeating, 'Available', 'Not available', colorChairIcon)
  facilityRows(root, rows)
  if (accessibility && Object.values(accessibility).some((value) => value !== undefined)) { const disclosure = document.createElement('small'); disclosure.textContent = 'Google Maps accessibility information; not a step-free guarantee.'; disclosure.style.cssText = 'display:block;margin-top:8px;font-size:10px;font-weight:700;color:#65766e;'; root.append(disclosure) }
  return root
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
  const eta = weather.forecastOffsetMinutes < 60 ? `+${weather.forecastOffsetMinutes}m` : `+${Math.round(weather.forecastOffsetMinutes / 60)}h`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="72" viewBox="0 0 168 72"><defs><filter id="s" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#142922" flood-opacity=".22"/></filter></defs><g filter="url(#s)"><rect x="4" y="4" width="160" height="62" rx="10" fill="#1769e0"/><text x="17" y="15" font-family="Arial,sans-serif" font-size="8" font-weight="800" fill="#bcd7ff">FORECAST ${eta}</text><text x="17" y="34" font-family="Arial,sans-serif" font-size="24" font-weight="900" fill="white">${Math.round(weather.temperatureC)}°</text><text x="138" y="34" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif" font-size="22">${symbol}</text><text x="17" y="55" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#dcebff">Rain ${weather.precipitationProbabilityPercent}%</text><line x1="82" y1="45" x2="82" y2="57" stroke="#82b4f6"/><text x="93" y="55" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#dcebff">Wind ${Math.round(weather.windSpeedKph)} km/h</text></g></svg>`
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, size: new google.maps.Size(168, 72), scaledSize: new google.maps.Size(168, 72), anchor: new google.maps.Point(84, 90) }
}

function RoutePreviewMapComponent({ origin, destination, routes = emptyRoutes, selectedId, selectedRouteResultId, liveLocation, followLiveLocation, reports = emptyReports, selectedReport, restStopCandidates = emptyRestStops, transitStops = emptyTransitStops, weatherPoints = emptyWeatherPoints, navigationRoute, onNavigationProgress, onOriginChange, onDestinationChange, onBoundsChange, onReportSelect, onReportClose, reportPopup, onRouteSelect, onMapReady, showWeather = false, showReports = true, showRestStops = false, showAccessiblePlaces = false, onWeatherAvailabilityChange }: RoutePreviewMapProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const locationMarkerRef = useRef<google.maps.Marker | null>(null)
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null)
  const checkpointOverlays = useRef<Array<google.maps.Marker | google.maps.Polyline>>([])
  const reportMarkers = useRef<google.maps.Marker[]>([])
  const reportInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const reportPopupHostRef = useRef<HTMLElement | null>(null)
  const reportPopupIdRef = useRef<string | null>(null)
  const reportPreviousFocusRef = useRef<HTMLElement | null>(null)
  const weatherMarkersRef = useRef<google.maps.Marker[]>([])
  const placeMarkersRef = useRef<google.maps.Marker[]>([])
  const placeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const placeInfoWindowOpenRef = useRef(false)
  const placePreviousFocusRef = useRef<HTMLElement | null>(null)
  const transitStopMarkersRef = useRef<google.maps.Marker[]>([])
  const transitStopInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const transitStopInfoWindowOpenRef = useRef(false)
  const transitStopPreviousFocusRef = useRef<HTMLElement | null>(null)
  const transitStopControllerRef = useRef<AbortController | null>(null)
  const transitStopRequestRef = useRef(0)
  const streetViewRequestRef = useRef(0)
  const streetViewListenersRef = useRef<google.maps.MapsEventListener[]>([])
  const streetViewVisibleRef = useRef(false)
  const streetViewTriggerRef = useRef<HTMLElement | null>(null)
  const streetViewCloseRef = useRef<HTMLButtonElement>(null)
  const callbacks = useRef({ onOriginChange, onDestinationChange, onBoundsChange, onReportSelect, onReportClose, onRouteSelect, onMapReady, onNavigationProgress, onWeatherAvailabilityChange })
  const reportPopupRef = useRef(reportPopup)
  const initialLocationCameraMapRef = useRef<google.maps.Map | null>(null)
  const lastFitSignatureRef = useRef('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>(hasGoogleMapsKey() ? 'loading' : 'unavailable')
  const [mapVersion, setMapVersion] = useState(0)
  const [reportPopupHost, setReportPopupHost] = useState<HTMLElement | null>(null)
  const [streetViewVisible, setStreetViewVisible] = useState(false)

  const clearStreetViewPending = useCallback(() => {
    streetViewListenersRef.current.forEach((listener) => listener.remove())
    streetViewListenersRef.current = []
  }, [])

  const closeStreetView = useCallback(() => {
    closeActiveLightbox?.()
    streetViewRequestRef.current += 1
    clearStreetViewPending()
    const map = mapRef.current
    const panorama = map?.getStreetView()
    streetViewVisibleRef.current = false
    panorama?.setVisible(false)
    setStreetViewVisible(false)
    if (map) requestAnimationFrame(() => google.maps.event.trigger(map, 'resize'))
    const trigger = streetViewTriggerRef.current
    streetViewTriggerRef.current = null
    if (trigger?.isConnected) trigger.focus()
  }, [clearStreetViewPending])

  const clearReportPopup = useCallback(() => {
    if (!reportPopupIdRef.current) return
    reportPopupIdRef.current = null
    setReportPopupHost(null)
    callbacks.current.onReportClose?.()
    restoreInfoWindowFocus(reportPreviousFocusRef.current)
    reportPreviousFocusRef.current = null
  }, [])

  const closeReportPopup = useCallback(() => {
    if (!reportPopupIdRef.current) return
    reportInfoWindowRef.current?.close()
    clearReportPopup()
  }, [clearReportPopup])

  const closeTransitPopup = useCallback((closeWindow = true) => {
    transitStopRequestRef.current += 1
    transitStopControllerRef.current?.abort()
    transitStopControllerRef.current = null
    closeStreetView()
    if (!transitStopInfoWindowOpenRef.current) return
    transitStopInfoWindowOpenRef.current = false
    if (closeWindow) transitStopInfoWindowRef.current?.close()
    restoreInfoWindowFocus(transitStopPreviousFocusRef.current)
    transitStopPreviousFocusRef.current = null
  }, [closeStreetView])

  const closePlacePopup = useCallback((closeWindow = true) => {
    closeStreetView()
    if (!placeInfoWindowOpenRef.current) return
    placeInfoWindowOpenRef.current = false
    if (closeWindow) placeInfoWindowRef.current?.close()
    restoreInfoWindowFocus(placePreviousFocusRef.current)
    placePreviousFocusRef.current = null
  }, [closeStreetView])

  const dismissPopupPeers = useCallback((opening: 'report' | 'transit' | 'place') => {
    closeStreetView()
    if (opening !== 'report') closeReportPopup()
    if (opening !== 'transit') closeTransitPopup()
    if (opening !== 'place') closePlacePopup()
  }, [closePlacePopup, closeReportPopup, closeStreetView, closeTransitPopup])

  const showStreetViewUnavailable = useCallback((root: HTMLElement) => {
    let message = root.querySelector<HTMLElement>('[data-street-view-status]')
    if (!message) { message = document.createElement('p'); message.setAttribute('data-street-view-status', ''); message.setAttribute('role', 'status'); message.style.cssText = 'margin:8px 0 0;font-size:11px;font-weight:700;color:#65766e;'; root.append(message) }
    message.textContent = 'Street View is unavailable.'
  }, [])

  const checkStreetView = useCallback(async (root: HTMLElement, location: { latitude: number; longitude: number }) => {
    const requestId = ++streetViewRequestRef.current
    const position = { lat: location.latitude, lng: location.longitude }
    try {
      const { data } = await new google.maps.StreetViewService().getPanorama({ location: position, radius: 50 })
      if (requestId !== streetViewRequestRef.current) return null
      const panoId = data.location?.pano
      if (!panoId) return null
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'View 360°'
      button.style.cssText = 'display:inline-flex;min-height:44px;align-items:center;border:0;background:transparent;padding:0;color:#087f5b;font-size:12px;font-weight:900;cursor:pointer;'
      button.addEventListener('click', () => {
        const panorama = mapRef.current?.getStreetView()
        if (!panorama) { showStreetViewUnavailable(root); return }
        clearStreetViewPending()
        streetViewTriggerRef.current = button
        const visibleListener = panorama.addListener('visible_changed', () => {
          if (!panorama.getVisible() && streetViewVisibleRef.current) closeStreetView()
        })
        streetViewListenersRef.current = [visibleListener]
        panorama.setPano(panoId)
        panorama.setPov({ heading: 0, pitch: 0 })
        panorama.setVisible(true)
        streetViewVisibleRef.current = true
        setStreetViewVisible(true)
        requestAnimationFrame(() => { google.maps.event.trigger(panorama, 'resize'); streetViewCloseRef.current?.focus() })
      })
      root.append(button)
      return panoId
    } catch {
      return null
    }
  }, [clearStreetViewPending, closeStreetView, showStreetViewUnavailable])

  useEffect(() => { callbacks.current = { onOriginChange, onDestinationChange, onBoundsChange, onReportSelect, onReportClose, onRouteSelect, onMapReady, onNavigationProgress, onWeatherAvailabilityChange }; reportPopupRef.current = reportPopup }, [onBoundsChange, onDestinationChange, onMapReady, onNavigationProgress, onOriginChange, onReportClose, onReportSelect, onRouteSelect, onWeatherAvailabilityChange, reportPopup])
  useEffect(() => { if (streetViewVisible) streetViewCloseRef.current?.focus() }, [streetViewVisible])

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
        if (streetViewVisibleRef.current) google.maps.event.trigger(map.getStreetView(), 'resize')
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
      const visualLines = coloredRouteSegments(path, route.airQualitySamples ?? [], route.airQualityExpectedSampleCount).map((segment) => new google.maps.Polyline({ map, path: segment.path, strokeColor: segment.color, strokeOpacity: selected ? 1 : .25, strokeWeight: selected ? 8 : 5, clickable: false, zIndex: selected ? 3 : 1 }))
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
    if (initialLocationCameraMapRef.current !== map) {
      initialLocationCameraMapRef.current = map
      if (!origin && !destination && routes.length === 0 && !followLiveLocation) map.setCenter(rawPosition)
    }
    if (followLiveLocation) { map.panTo(position); if (navigationRoute && (map.getZoom() ?? 0) < 17) map.setZoom(17) }
  }, [destination, followLiveLocation, liveLocation, mapVersion, navigationRoute, origin, routes])

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
    const openPopup = (report: RoadReport, marker: google.maps.Marker) => {
      let infoWindow = reportInfoWindowRef.current
      if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({ disableAutoPan: false, maxWidth: 380, headerDisabled: true })
        infoWindow.addListener('closeclick', clearReportPopup)
        reportInfoWindowRef.current = infoWindow
      }
      const host = reportPopupHostRef.current ?? document.createElement('div')
      reportPopupHostRef.current = host
      reportPopupIdRef.current = report.id
      setReportPopupHost(host)
      infoWindow.setContent(host)
      infoWindow.open({ map, anchor: marker, shouldFocus: true })
    }
    reportMarkers.current.forEach((marker) => marker.setMap(null))
    if (!showReports) {
      reportMarkers.current = []
      closeReportPopup()
      return
    }
    reportMarkers.current = reports.map((report) => {
      const marker = new google.maps.Marker({ map, position: { lat: report.latitude, lng: report.longitude }, icon: reportIcon(report.category), title: report.description, zIndex: 6, optimized: false })
      marker.addListener('click', () => {
        dismissPopupPeers('report')
        if (!reportPopupIdRef.current) reportPreviousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        callbacks.current.onReportSelect?.(report)
        if (reportPopupRef.current) openPopup(report, marker)
      })
      if (reportPopupRef.current && reportPopupIdRef.current === report.id) openPopup(report, marker)
      return marker
    })
  }, [clearReportPopup, closeReportPopup, dismissPopupPeers, mapVersion, reports, showReports])

  useEffect(() => {
    if (selectedReport || !reportPopupIdRef.current) return
    reportInfoWindowRef.current?.close()
    reportPopupIdRef.current = null
    setReportPopupHost(null)
    restoreInfoWindowFocus(reportPreviousFocusRef.current)
    reportPreviousFocusRef.current = null
  }, [selectedReport])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    closeTransitPopup()
    transitStopMarkersRef.current.forEach((marker) => marker.setMap(null))
    transitStopMarkersRef.current = []
    transitStopMarkersRef.current = transitStops.map((stop) => {
      const marker = new google.maps.Marker({ map, position: { lat: stop.location.latitude, lng: stop.location.longitude }, icon: transitIcon(stop.vehicleType), title: `${stop.vehicleType} stop: ${stop.name}`, zIndex: 6, optimized: false })
      marker.addListener('click', () => {
        dismissPopupPeers('transit')
        closeTransitPopup()
        transitStopPreviousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const controller = new AbortController()
        transitStopControllerRef.current = controller
        const requestId = ++transitStopRequestRef.current
        let infoWindow = transitStopInfoWindowRef.current
        if (!infoWindow) {
          infoWindow = new google.maps.InfoWindow({ disableAutoPan: false, maxWidth: 380, headerDisabled: true })
          infoWindow.addListener('closeclick', () => closeTransitPopup(false))
          transitStopInfoWindowRef.current = infoWindow
        }
        const close = () => closeTransitPopup()
        const loading = transitStopInfoContent(stop, 'loading', close)
        infoWindow.setContent(loading)
        transitStopInfoWindowOpenRef.current = true
        infoWindow.open({ map, anchor: marker, shouldFocus: true })
        void getTransitStopDetails(stop, selectedRouteResultId, controller.signal).then((details) => {
          if (!controller.signal.aborted && requestId === transitStopRequestRef.current) { const content = transitStopInfoContent(stop, details, close); infoWindow.setContent(content); checkStreetView(content, stop.location) }
        }).catch(() => {
          if (!controller.signal.aborted && requestId === transitStopRequestRef.current) { const content = transitStopInfoContent(stop, 'error', close); infoWindow.setContent(content); checkStreetView(content, stop.location) }
        })
      })
      return marker
    })
    return () => closeTransitPopup()
  }, [checkStreetView, closeTransitPopup, dismissPopupPeers, mapVersion, selectedRouteResultId, transitStops])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    closePlacePopup()
    placeMarkersRef.current.forEach((marker) => marker.setMap(null))
    placeMarkersRef.current = []
    if (!showRestStops && !showAccessiblePlaces) return
    placeMarkersRef.current = restStopCandidates.flatMap((place) => {
      const accessible = Boolean(place.accessibility && Object.values(place.accessibility).some((value) => value === true))
      if (!(showRestStops || showAccessiblePlaces && accessible)) return []
      const marker = new google.maps.Marker({ map, position: { lat: place.location.latitude, lng: place.location.longitude }, title: accessible ? `${place.name}: rest-stop candidate with accessibility information` : `${place.name}: rest-stop candidate`, zIndex: 5, optimized: false })
      marker.addListener('click', () => {
        dismissPopupPeers('place')
        closePlacePopup()
        placePreviousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        let infoWindow = placeInfoWindowRef.current
        if (!infoWindow) {
          infoWindow = new google.maps.InfoWindow({ disableAutoPan: false, maxWidth: 560, headerDisabled: true })
          infoWindow.addListener('closeclick', () => closePlacePopup(false))
          placeInfoWindowRef.current = infoWindow
        }
        const content = placeInfoContent(place, accessible, () => closePlacePopup())
        infoWindow.setContent(content)
        placeInfoWindowOpenRef.current = true
        infoWindow.open({ map, anchor: marker, shouldFocus: true })
        checkStreetView(content, place.location)
      })
      return [marker]
    })
  }, [checkStreetView, closePlacePopup, dismissPopupPeers, mapVersion, restStopCandidates, showAccessiblePlaces, showRestStops])

  useEffect(() => () => { closeStreetView(); transitStopRequestRef.current += 1; transitStopControllerRef.current?.abort(); weatherMarkersRef.current.forEach((marker) => marker.setMap(null)); placeMarkersRef.current.forEach((marker) => marker.setMap(null)); transitStopMarkersRef.current.forEach((marker) => marker.setMap(null)); transitStopInfoWindowRef.current?.close(); placeInfoWindowRef.current?.close(); reportInfoWindowRef.current?.close(); checkpointOverlays.current.forEach((overlay) => overlay.setMap(null)); reportMarkers.current.forEach((marker) => marker.setMap(null)); locationMarkerRef.current?.setMap(null); accuracyCircleRef.current?.setMap(null) }, [closeStreetView])

  const selectedRoute = routes.find((route) => route.id === selectedId) ?? routes[0]
  return <div className="relative h-full min-h-[28rem] overflow-hidden bg-white"><div className="absolute inset-0" ref={nodeRef} aria-label={origin && destination ? `Map from ${origin.label} to ${destination.label}` : 'Jakarta route map'} />{reportPopupHost && selectedReport && reportPopup && <ReportPopupPortal host={reportPopupHost} report={selectedReport} render={reportPopup} onClose={closeReportPopup} />}{streetViewVisible && <button ref={streetViewCloseRef} type="button" onClick={closeStreetView} className="absolute top-3 right-3 z-30 min-h-11 rounded-lg bg-white px-4 text-sm font-black text-ae-ink shadow-lg">Close Street View</button>}{routes.length > 0 && <div className="absolute right-3 bottom-20 z-10 max-w-[calc(100%-1.5rem)] rounded-lg border border-ae-line bg-white/95 px-3 py-2 text-[10px] font-bold text-ae-muted shadow-lg backdrop-blur lg:right-auto lg:bottom-5 lg:left-5" role="group" aria-label="PM2.5 estimate"><strong className="mr-2 text-ae-ink">PM2.5 estimate</strong><span className="whitespace-nowrap"><i className="mr-1 inline-block size-2 rounded-full bg-[#0a9b68]" />≤15</span><span className="ml-2 whitespace-nowrap"><i className="mr-1 inline-block size-2 rounded-full bg-[#e6a51c]" />15–35</span><span className="ml-2 whitespace-nowrap"><i className="mr-1 inline-block size-2 rounded-full bg-[#c0442b]" />&gt;35</span><span className="ml-2 whitespace-nowrap"><i className="mr-1 inline-block size-2 rounded-full bg-[#7b8983]" />Unavailable</span>{selectedRoute?.dataQuality === 'partial_estimate' && <span className="ml-2 whitespace-nowrap">Partial coverage</span>}</div>}{status === 'loading' && <div className="absolute inset-0 grid place-items-center bg-white"><span className="inline-flex items-center gap-2 text-sm font-extrabold text-ae-brand"><LoaderCircle className="size-5 animate-spin" />Loading...</span></div>}{(status === 'unavailable' || status === 'error') && <div className="absolute inset-0 grid place-items-center bg-white p-6"><div className="text-center">{status === 'error' ? <TriangleAlert className="mx-auto size-8 text-ae-fastest" /> : <MapPinned className="mx-auto size-8 text-ae-brand" />}<strong className="mt-3 block text-base font-black">Map unavailable</strong></div></div>}</div>
}

export const RoutePreviewMap = memo(RoutePreviewMapComponent)
