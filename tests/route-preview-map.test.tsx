import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { useState } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getTransitStopDetails } from '@/api/route-comparison'
import { hasGoogleMapsKey, loadGoogleMaps } from '@/config'
import { RoutePreviewMap } from '@/components/map/RoutePreviewMap'
import { closeInfoWindowAndRestoreFocus, restoreInfoWindowFocus } from '@/lib/info-window-focus'
import { placePhotoUrl } from '@/lib/google-maps-url'
import { routeOption } from './route-fixtures'

jest.mock('@/api/route-comparison', () => ({ getTransitStopDetails: jest.fn() }))
jest.mock('@/config', () => ({ apiBaseURL: 'https://api.example.test', hasGoogleMapsKey: jest.fn(), loadGoogleMaps: jest.fn() }))
jest.mock('@/assets', () => ({ colorChairIcon: 'chair.png', colorDoorIcon: 'door.png', colorMapMarkerIcon: 'map-marker.png', colorParkingIcon: 'parking.png', colorSignpostIcon: 'signpost.png', colorToiletIcon: 'toilet.png' }))

const hasKey = hasGoogleMapsKey as jest.Mock
const loadMaps = loadGoogleMaps as jest.Mock
const getStopDetails = getTransitStopDetails as jest.Mock
const setCenter = jest.fn()
const panTo = jest.fn()
const fitBounds = jest.fn()
const moveCamera = jest.fn()
const markerSetPosition = jest.fn()
const markerSetIcon = jest.fn()
const infoWindowSetContent = jest.fn()
const infoWindowOpen = jest.fn()
const infoWindowClose = jest.fn()
const panoramaSetPano = jest.fn()
const panoramaSetPosition = jest.fn()
const panoramaSetPov = jest.fn()
const panoramaSetVisible = jest.fn()
const panoramaGetVisible = jest.fn(() => false)
const panoramaGetStatus = jest.fn(() => 'UNKNOWN_ERROR')
const panoramaListenerRemove = jest.fn()
const panoramaListeners: Record<string, () => void> = {}
const streetViewOrder: string[] = []
const streetViewGetPanorama = jest.fn()
const markerListeners: Array<Record<string, () => void>> = []
const infoWindowListeners: Record<string, () => void> = {}
const infoWindows: Array<{ close: jest.Mock; listeners: Record<string, () => void> }> = []
let resizeObserverCallback: ResizeObserverCallback | undefined
let resolveMaps: ((library: { Map: jest.Mock }) => void) | undefined

const panorama = {
  addListener: jest.fn((event: string, callback: () => void) => { streetViewOrder.push(`listen:${event}`); panoramaListeners[event] = callback; return { remove: panoramaListenerRemove } }),
  getStatus: panoramaGetStatus,
  getVisible: panoramaGetVisible,
  setPano: jest.fn((panoId: string) => { streetViewOrder.push('setPano'); panoramaSetPano(panoId) }),
  setPosition: panoramaSetPosition,
  setPov: panoramaSetPov,
  setVisible: panoramaSetVisible,
}
const mapListeners: Record<string, () => void> = {}
const map = {
  addListener: jest.fn((event: string, callback: () => void) => { mapListeners[event] = callback; return { remove: jest.fn() } }),
  getBounds: jest.fn(() => null),
  getCenter: jest.fn(() => ({ lat: () => -6.2, lng: () => 106.8 })),
  getStreetView: jest.fn(() => panorama),
  getZoom: jest.fn(() => 12),
  setZoom: jest.fn(),
  setCenter,
  panTo,
  moveCamera,
  fitBounds,
}
const MapMock = jest.fn(() => map)

function constructor(value: object) {
  return jest.fn(() => value)
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class { constructor(callback: ResizeObserverCallback) { resizeObserverCallback = callback } observe() {} disconnect() {} } })
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (callback: FrameRequestCallback) => { callback(0); return 1 } })
})

beforeEach(() => {
  jest.clearAllMocks()
  markerListeners.length = 0
  for (const event of Object.keys(mapListeners)) delete mapListeners[event]
  infoWindows.length = 0
  streetViewOrder.length = 0
  panoramaGetStatus.mockReturnValue('UNKNOWN_ERROR')
  panoramaGetVisible.mockReturnValue(false)
  for (const event of Object.keys(infoWindowListeners)) delete infoWindowListeners[event]
  for (const event of Object.keys(panoramaListeners)) delete panoramaListeners[event]
  getStopDetails.mockReset()
  streetViewGetPanorama.mockReset()
  streetViewGetPanorama.mockRejectedValue(new Error('No panorama'))
  hasKey.mockReturnValue(true)
  loadMaps.mockImplementation(() => new Promise((resolve) => { resolveMaps = resolve }))
  Object.defineProperty(globalThis, 'google', {
    configurable: true,
    value: { maps: {
      Marker: jest.fn(() => { const listeners: Record<string, () => void> = {}; markerListeners.push(listeners); return { addListener: jest.fn((event: string, callback: () => void) => { listeners[event] = callback }), getPosition: jest.fn(() => ({ lat: () => -6.2, lng: () => 106.8 })), setDraggable: jest.fn(), setMap: jest.fn(), setPosition: markerSetPosition, setIcon: markerSetIcon, setTitle: jest.fn() } }),
      Circle: constructor({ setMap: jest.fn(), setCenter: jest.fn(), setRadius: jest.fn() }),
      Polyline: constructor({ addListener: jest.fn(), setMap: jest.fn(), setOptions: jest.fn() }),
      InfoWindow: jest.fn(() => { const listeners: Record<string, () => void> = {}; const close = jest.fn(() => infoWindowClose()); const instance = { addListener: jest.fn((event: string, callback: () => void) => { listeners[event] = callback; infoWindowListeners[event] = callback }), close, setContent: infoWindowSetContent, open: infoWindowOpen }; infoWindows.push({ close, listeners }); return instance }),
      StreetViewService: constructor({ getPanorama: streetViewGetPanorama }),
      StreetViewStatus: { OK: 'OK' },
      LatLngBounds: constructor({ extend: jest.fn() }),
      Size: constructor({}),
      Point: constructor({}),
      event: { addListenerOnce: jest.fn((_target, _event, callback) => { callback(); return { remove: jest.fn() } }), trigger: jest.fn() },
    } },
  })
})

const firstLocation = { latitude: -6.4, longitude: 106.9, accuracy: 10, heading: 0, speed: null }
const secondLocation = { ...firstLocation, latitude: -6.41 }

async function finishMapLoad() {
  await act(async () => resolveMaps?.({ Map: MapMock }))
  await waitFor(() => expect(MapMock).toHaveBeenCalledTimes(1))
}

describe('place photo URLs', () => {
  it('accepts only Google photo resource names', () => {
    expect(placePhotoUrl('places/ChIJ123/photos/AUac123', 'https://api.example.test')).toBe('https://api.example.test/api/v1/place-photos?name=places%2FChIJ123%2Fphotos%2FAUac123')
    for (const value of ['https://evil.example/photo', '../photo', 'places/id', 'places/id/photos/name?x=1']) expect(placePhotoUrl(value, 'https://api.example.test')).toBeNull()
  })
})

describe('InfoWindow focus restoration', () => {
  it('closes the InfoWindow and restores the previously focused element', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const infoWindow = { close: jest.fn() }

    closeInfoWindowAndRestoreFocus(infoWindow, trigger)

    expect(infoWindow.close).toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('does not focus a detached element', () => {
    const trigger = document.createElement('button')
    const focus = jest.spyOn(trigger, 'focus')
    restoreInfoWindowFocus(trigger)
    expect(focus).not.toHaveBeenCalled()
  })
})

describe('RoutePreviewMap initial camera', () => {
  it('centers once when location arrives before the map', async () => {
    const view = render(<RoutePreviewMap origin={null} destination={null} liveLocation={firstLocation} />)
    await finishMapLoad()
    await waitFor(() => expect(setCenter).toHaveBeenCalledWith({ lat: -6.4, lng: 106.9 }))

    view.rerender(<RoutePreviewMap origin={null} destination={null} liveLocation={secondLocation} />)
    await waitFor(() => expect(markerSetPosition).toHaveBeenCalledWith({ lat: -6.41, lng: 106.9 }))
    expect(setCenter).toHaveBeenCalledTimes(1)
    expect(google.maps.Circle).not.toHaveBeenCalled()
    expect(panTo).not.toHaveBeenCalled()
  })

  it('centers when the map is ready before location arrives', async () => {
    const view = render(<RoutePreviewMap origin={null} destination={null} liveLocation={null} />)
    await finishMapLoad()

    view.rerender(<RoutePreviewMap origin={null} destination={null} liveLocation={firstLocation} />)
    await waitFor(() => expect(setCenter).toHaveBeenCalledWith({ lat: -6.4, lng: 106.9 }))
  })

  it('does not override a checkpoint camera', async () => {
    const origin = { id: 'origin', label: 'Origin', detail: '', latitude: -6.3, longitude: 106.8 }
    render(<RoutePreviewMap origin={origin} destination={null} liveLocation={firstLocation} />)
    await finishMapLoad()
    await waitFor(() => expect(fitBounds).toHaveBeenCalledTimes(1))
    expect(setCenter).not.toHaveBeenCalled()
  })

  it('hides the origin marker and keeps small heading changes stable while navigating', async () => {
    const origin = { id: 'origin', label: 'Origin', detail: '', latitude: -6.4, longitude: 106.9 }
    const route = { ...routeOption(), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }
    const view = render(<RoutePreviewMap origin={origin} destination={null} routes={[route]} liveLocation={{ ...firstLocation, heading: 2 }} followLiveLocation navigationRoute={route} />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    await waitFor(() => expect(Marker.mock.calls.some(([options]) => options.title === 'Lokasi Anda saat ini')).toBe(true))
    expect(Marker.mock.calls.some(([options]) => options.title === 'Asal: Origin')).toBe(false)
    const locationIcon = Marker.mock.calls.find(([options]) => options.title === 'Lokasi Anda saat ini')[0].icon
    expect(decodeURIComponent(locationIcon.url)).not.toContain('opacity=".16"')
    view.rerender(<RoutePreviewMap origin={origin} destination={null} routes={[route]} liveLocation={{ ...firstLocation, heading: 7 }} followLiveLocation navigationRoute={route} />)
    await waitFor(() => expect(markerSetPosition).toHaveBeenCalled())
    expect(markerSetIcon).not.toHaveBeenCalled()
  })

  it('keeps the destination marker stable when navigation starts', async () => {
    const destination = { id: 'destination', label: 'Destination', detail: '', latitude: 38.6, longitude: -120.3 }
    const route = { ...routeOption(), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }
    const view = render(<RoutePreviewMap origin={null} destination={destination} routes={[route]} liveLocation={firstLocation} />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    await waitFor(() => expect(Marker.mock.calls.filter(([options]) => options.title === 'Tujuan: Destination')).toHaveLength(1))

    view.rerender(<RoutePreviewMap origin={null} destination={destination} routes={[route]} liveLocation={firstLocation} followLiveLocation navigationRoute={route} />)

    await waitFor(() => expect(moveCamera).toHaveBeenCalled())
    expect(Marker.mock.calls.filter(([options]) => options.title === 'Tujuan: Destination')).toHaveLength(1)
  })

  it('moves the live marker continuously instead of locking it to route vertices', async () => {
    const route = { ...routeOption(), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }
    const first = { ...firstLocation, latitude: 38.5001, longitude: -120.2001 }
    const second = { ...first, latitude: 38.5002, longitude: -120.2002 }
    const view = render(<RoutePreviewMap origin={null} destination={null} routes={[route]} liveLocation={first} followLiveLocation navigationRoute={route} />)
    await finishMapLoad()

    view.rerender(<RoutePreviewMap origin={null} destination={null} routes={[route]} liveLocation={second} followLiveLocation navigationRoute={route} />)

    await waitFor(() => expect(markerSetPosition).toHaveBeenCalledWith({ lat: second.latitude, lng: second.longitude }))
  })

  it('reports the active turn instruction with navigation progress', async () => {
    const onNavigationProgress = jest.fn()
    const route = { ...routeOption(), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', navigationSteps: [{ instruction: 'Belok kiri ke Jalan Utama', maneuver: 'TURN_LEFT', travelMode: 'WALK', distanceMeters: 100, startLocation: { latitude: 38.5, longitude: -120.2 }, endLocation: { latitude: 40.7, longitude: -120.95 }, encodedPolyline: '_p~iF~ps|U_ulLnnqC' }] }
    render(<RoutePreviewMap origin={null} destination={null} routes={[route]} liveLocation={{ ...firstLocation, latitude: 38.5, longitude: -120.2 }} followLiveLocation navigationRoute={route} onNavigationProgress={onNavigationProgress} />)
    await finishMapLoad()

    await waitFor(() => expect(onNavigationProgress).toHaveBeenCalledWith(expect.objectContaining({ instruction: 'Belok kiri ke Jalan Utama', maneuver: 'TURN_LEFT', travelMode: 'WALK', distanceToManeuverMeters: expect.any(Number) })))
  })

  it('starts navigation with one camera move and one consistent route color', async () => {
    const route = { ...routeOption(), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', dataQuality: 'partial_estimate' as const, airQualitySampleCount: 2, airQualityExpectedSampleCount: 3, airQualitySamples: [{ latitude: 38.5, longitude: -120.2, pm25: 10 }, { latitude: 43.252, longitude: -126.453, pm25: 40 }] }
    const routes = [route]
    const view = render(<RoutePreviewMap origin={null} destination={null} routes={routes} liveLocation={firstLocation} />)
    await finishMapLoad()
    const Polyline = google.maps.Polyline as unknown as jest.Mock
    const initialPolylineCount = Polyline.mock.calls.length
    view.rerender(<RoutePreviewMap origin={null} destination={null} routes={routes} liveLocation={firstLocation} followLiveLocation navigationRoute={route} />)
    await waitFor(() => expect(moveCamera).toHaveBeenCalledWith({ center: expect.any(Object), zoom: 17 }))
    const navigationLines = Polyline.mock.calls.slice(initialPolylineCount).map(([options]) => options).filter((options) => options.strokeOpacity !== 0)
    expect(navigationLines).toEqual([expect.objectContaining({ strokeColor: '#087f5b', strokeOpacity: 1, strokeWeight: 8 })])
    expect(panTo).not.toHaveBeenCalled()
    expect(map.setZoom).not.toHaveBeenCalled()
  })

  it('pauses camera follow after dragging and resumes from the location control', async () => {
    const route = { ...routeOption(), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }
    render(<RoutePreviewMap origin={null} destination={null} routes={[route]} liveLocation={firstLocation} followLiveLocation navigationRoute={route} />)
    await finishMapLoad()
    await waitFor(() => expect(moveCamera).toHaveBeenCalled())
    act(() => mapListeners.dragstart?.())
    const focus = screen.getByRole('button', { name: 'Fokus ke lokasi' })
    await userEvent.click(focus)
    expect(panTo).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Fokus ke lokasi' })).not.toBeInTheDocument()
  })

  it('keeps the route identifiable when PM2.5 segment coverage is unavailable', async () => {
    const route = { ...routeOption(), labels: ['LOWEST_EXPOSURE'] as const, encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', dataQuality: 'partial_estimate' as const, airQualitySampleCount: 1, airQualityExpectedSampleCount: 5, airQualitySamples: [{ latitude: 38.5, longitude: -120.2, pm25: 10 }] }
    render(<RoutePreviewMap origin={null} destination={null} routes={[route]} selectedId={route.id} />)
    await finishMapLoad()
    const Polyline = google.maps.Polyline as unknown as jest.Mock
    expect(Polyline.mock.calls.some(([options]) => options.strokeColor === '#2457a7')).toBe(true)
    expect(Polyline.mock.calls.some(([options]) => options.strokeColor === '#7b8983')).toBe(false)
  })

  it('keeps PM2.5 colors on route segments without rendering a floating legend', async () => {
    const route = { ...routeOption(), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', dataQuality: 'partial_estimate' as const, airQualitySampleCount: 2, airQualityExpectedSampleCount: 3, airQualitySamples: [{ latitude: 38.5, longitude: -120.2, pm25: 10 }, { latitude: 43.252, longitude: -126.453, pm25: 40 }] }
    render(<RoutePreviewMap origin={null} destination={null} routes={[route]} selectedId={route.id} />)
    expect(screen.queryByRole('group', { name: 'PM2.5 estimate' })).not.toBeInTheDocument()
    await finishMapLoad()
    const Polyline = google.maps.Polyline as unknown as jest.Mock
    await waitFor(() => expect(Polyline.mock.calls.some(([options]) => options.strokeColor === '#0a9b68')).toBe(true))
    expect(Polyline.mock.calls.some(([options]) => options.strokeColor === '#c0442b')).toBe(true)
  })

  it('opens one controlled React report popup anchored to the marker and closes it', async () => {
    const onReportClose = jest.fn()
    const report = { id: 'report', category: 'CRASH' as const, description: 'Crash blocks the lane', latitude: -6.2, longitude: 106.8, createdAt: '', expiresAt: '', resolvedAt: null, status: 'ACTIVE' as const, images: [], reporter: 'Rider', isOwner: false, verification: { confirmations: 1, disputes: 0, viewerVerdict: null }, trust: { level: 'HIGH' as const, score: 80, kind: 'EVIDENCE_SCORE' as const, factors: { recency: 30, photos: 20, voteBalance: 30 } } }
    function Harness() {
      const [selectedReport, setSelectedReport] = useState<typeof report | null>(null)
      return <RoutePreviewMap origin={null} destination={null} reports={[report]} selectedReport={selectedReport} onReportSelect={setSelectedReport} onReportClose={() => { setSelectedReport(null); onReportClose() }} reportPopup={(selected, onClose) => <article aria-label="Anchored report popup"><span>{selected.description}</span><button type="button" onClick={onClose}>Close report popup</button></article>} />
    }
    render(<Harness />)
    await finishMapLoad()
    await waitFor(() => expect(markerListeners.some((listeners) => listeners.click)).toBe(true))

    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    act(() => markerListeners.find((listeners) => listeners.click)?.click())

    const InfoWindow = google.maps.InfoWindow as unknown as jest.Mock
    expect(InfoWindow).toHaveBeenCalledTimes(1)
    expect(InfoWindow).toHaveBeenCalledWith({ disableAutoPan: false, maxWidth: 380, headerDisabled: true })
    const host = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    document.body.append(host)
    await waitFor(() => expect(within(host).getByLabelText('Anchored report popup')).toHaveTextContent('Crash blocks the lane'))
    expect(infoWindowOpen).toHaveBeenCalledWith({ map, anchor: expect.anything(), shouldFocus: true })

    await userEvent.click(within(host).getByRole('button', { name: 'Close report popup' }))
    expect(infoWindowClose).toHaveBeenCalledTimes(1)
    expect(onReportClose).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
    await waitFor(() => expect(within(host).queryByLabelText('Anchored report popup')).not.toBeInTheDocument())
    host.remove()
    trigger.remove()
  })

  it('dismisses report, transit, and rest popups before opening a peer', async () => {
    const onReportClose = jest.fn()
    const report = { id: 'report', category: 'CRASH' as const, description: 'Crash blocks the lane', latitude: -6.2, longitude: 106.8, createdAt: '', expiresAt: '', resolvedAt: null, status: 'ACTIVE' as const, images: [], reporter: 'Rider', isOwner: false, verification: { confirmations: 1, disputes: 0, viewerVerdict: null }, trust: { level: 'HIGH' as const, score: 80, kind: 'EVIDENCE_SCORE' as const, factors: { recency: 30, photos: 20, voteBalance: 30 } } }
    const stop = { name: 'Central', location: { latitude: -6.21, longitude: 106.81 }, ordinal: 1, role: 'departure' as const, vehicleType: 'BUS', label: 'B1' }
    const rest = { id: 'rest', name: 'Park', location: { latitude: -6.22, longitude: 106.82 }, types: ['park'], safetyVerified: false as const }
    getStopDetails.mockImplementation(() => new Promise(() => undefined))
    function Harness() {
      const [selectedReport, setSelectedReport] = useState<typeof report | null>(null)
      return <RoutePreviewMap origin={null} destination={null} reports={[report]} selectedReport={selectedReport} onReportSelect={setSelectedReport} onReportClose={() => { setSelectedReport(null); onReportClose() }} reportPopup={(selected, onClose) => <article aria-label="Anchored report popup"><span>{selected.description}</span><button type="button" onClick={onClose}>Close report popup</button></article>} transitStops={[stop]} restStopCandidates={[rest]} showRestStops />
    }
    render(<Harness />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    const markerIndex = (title: string) => Marker.mock.calls.findIndex(([options]) => options.title === title)
    const reportMarker = markerIndex(report.description)
    const transitMarker = markerIndex('Perhentian Bus: Central')
    const restMarker = markerIndex('Park: rest-stop candidate')

    act(() => markerListeners[reportMarker].click())
    const reportHost = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    document.body.append(reportHost)
    await waitFor(() => expect(within(reportHost).getByLabelText('Anchored report popup')).toBeInTheDocument())
    act(() => markerListeners[transitMarker].click())
    const transitSignal = getStopDetails.mock.calls[0][2] as AbortSignal
    expect(infoWindows[0].close).toHaveBeenCalled()
    expect(onReportClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(within(reportHost).queryByLabelText('Anchored report popup')).not.toBeInTheDocument())

    act(() => markerListeners[reportMarker].click())
    expect(transitSignal.aborted).toBe(true)
    expect(infoWindows[1].close).toHaveBeenCalled()
    await waitFor(() => expect(within(reportHost).getByLabelText('Anchored report popup')).toBeInTheDocument())
    act(() => markerListeners[restMarker].click())
    expect(onReportClose).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(within(reportHost).queryByLabelText('Anchored report popup')).not.toBeInTheDocument())

    act(() => markerListeners[transitMarker].click())
    expect(infoWindows[2].close).toHaveBeenCalled()
    expect(getStopDetails).toHaveBeenCalledTimes(2)
    reportHost.remove()
  })

  it('uses responsive scrollable InfoWindow and popup shell sizing', async () => {
    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).not.toMatch(/gm-style-iw-[cd][\s\S]{0,160}(?:310px|min-width|overflow:\s*hidden)/)
    expect(css).toContain('max-width: min(34rem, calc(100vw - 2rem)) !important;')
    expect(css).toContain('max-height: min(75dvh, 36rem) !important;')
    expect(css).toContain('overflow: auto !important;')

    const rest = { id: 'responsive', name: 'Responsive Park', location: { latitude: -6.2, longitude: 106.8 }, types: ['park'], safetyVerified: false as const }
    render(<RoutePreviewMap origin={null} destination={null} restStopCandidates={[rest]} showRestStops />)
    await finishMapLoad()
    markerListeners[0].click()
    const popup = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    expect(popup.style.maxWidth).toBe('min(34rem,calc(100vw - 2rem))')
    expect(popup.style.maxHeight).toBe('min(75dvh,36rem)')
    expect(popup.style.overflow).toBe('auto')
    expect(css).toContain('grid-template-columns: minmax(0, 1.15fr) minmax(10rem, .85fr);')
    expect(css).toContain('@media (max-width: 30rem)')
  })

  it('uses unnumbered branded rest-stop markers and structured facility icons', async () => {
    const candidates = [
      { id: 'positive', name: 'Park', formattedAddress: 'Main Street', openNow: true, restroom: false, location: { latitude: -6.2, longitude: 106.8 }, types: ['park'], accessibility: { wheelchairAccessibleEntrance: true, wheelchairAccessibleParking: true, wheelchairAccessibleRestroom: true, wheelchairAccessibleSeating: true }, safetyVerified: false as const },
      { id: 'unknown', name: 'Cafe', location: { latitude: -6.21, longitude: 106.81 }, types: ['cafe'], safetyVerified: false as const },
    ]
    render(<RoutePreviewMap origin={null} destination={null} restStopCandidates={candidates} showRestStops />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    await waitFor(() => expect(Marker.mock.calls).toHaveLength(2))
    expect(Marker.mock.calls.map(([options]) => options.icon.url).every((url) => url.startsWith('data:image/svg+xml'))).toBe(true)
    expect(Marker.mock.calls.map(([options]) => decodeURIComponent(options.icon.url)).every((url) => url.includes('#087f5b'))).toBe(true)
    expect(Marker.mock.calls.map(([options]) => options.label)).toEqual([undefined, undefined])

    markerListeners[0].click()
    const positive = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    expect(positive.querySelector('.aeroute-place-grid')?.children).toHaveLength(2)
    expect(positive.querySelector('.aeroute-place-primary')).toHaveTextContent('Main Street')
    expect(positive.querySelector('.aeroute-place-facilities')).toHaveTextContent('Status buka Buka sekarangToilet Tidak tercantumPintu masuk TersediaParkir TersediaToilet aksesibel TersediaTempat duduk Tersedia')
    for (const field of ['Kandidat tempat istirahat', 'Park', 'Main Street', 'Status buka Buka sekarang', 'Toilet Tidak tercantum', 'Pintu masuk Tersedia', 'Parkir Tersedia', 'Toilet aksesibel Tersedia', 'Tempat duduk Tersedia']) expect(positive).toHaveTextContent(field)
    expect(positive).not.toHaveTextContent('Open in Google Maps')
    expect(Array.from(positive.querySelectorAll('img')).map((image) => image.getAttribute('src'))).toEqual(expect.arrayContaining(['toilet.png', 'door.png', 'parking.png', 'chair.png']))

    markerListeners[1].click()
    const unknown = infoWindowSetContent.mock.calls[1][0] as HTMLElement
    for (const field of ['Cafe', 'Alamat tidak diketahui', 'Status buka Tidak diketahui', 'Toilet Tidak diketahui', 'Pintu masuk Tidak diketahui', 'Parkir Tidak diketahui', 'Toilet aksesibel Tidak diketahui', 'Tempat duduk Tidak diketahui']) expect(unknown).toHaveTextContent(field)
    expect((infoWindowSetContent.mock.calls[1][0] as HTMLElement).textContent).not.toMatch(/safe route|fully accessible/i)
    await userEvent.click(within(unknown).getByRole('button', { name: 'Tutup detail tempat' }))
    expect(infoWindowClose).toHaveBeenCalled()
  })

  it('shows one active carousel photo with controls, dots, attribution, keyboard navigation, and failed-slide removal', async () => {
    const candidate = { id: 'photo', name: 'Station Park', formattedAddress: 'Rail Street', openNow: false, restroom: true, location: { latitude: -6.2, longitude: 106.8 }, types: ['park'], accessibility: { wheelchairAccessibleEntrance: true, wheelchairAccessibleParking: false }, photos: [1, 2, 3, 4].map((index) => ({ name: `places/ChIJ123/photos/AUac${index}`, googleMapsUri: `https://www.google.com/maps/place/photo-${index}`, flagContentUri: `https://www.google.com/maps/report/photo-${index}`, authorAttributions: [{ displayName: `Contributor ${index}`, uri: 'https://www.google.com/maps/contrib/123', photoUri: 'https://www.google.com/maps/contrib/avatar' }, { displayName: 'Unsafe', uri: 'https://evil.example/person' }] })), safetyVerified: false as const }
    render(<RoutePreviewMap origin={null} destination={null} restStopCandidates={[candidate]} showRestStops />)
    await finishMapLoad()
    markerListeners.find((listeners) => listeners.click)?.click()
    const content = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    document.body.append(content)
    expect(content.querySelectorAll('img[alt^="Station Park foto"]')).toHaveLength(1)
    expect(within(content).getByAltText('Station Park foto 1')).toHaveAttribute('width', '16')
    expect(within(content).getByAltText('Station Park foto 1')).toHaveAttribute('height', '9')
    expect(content).not.toHaveTextContent('1 dari 3')
    expect(within(content).getAllByRole('button', { name: /tampilkan foto/i })).toHaveLength(3)
    expect(content).toHaveTextContent('Contributor 1')
    expect(within(content).queryByRole('link', { name: 'View photo on Google Maps' })).not.toBeInTheDocument()
    expect(within(content).queryByRole('link', { name: 'Report photo' })).not.toBeInTheDocument()
    expect(content.querySelector('a[href="https://evil.example/person"]')).not.toBeInTheDocument()

    await userEvent.click(within(content).getByRole('button', { name: 'Foto berikutnya' }))
    await Promise.resolve()
    expect(within(content).getByAltText('Station Park foto 2')).toBeTruthy()
    expect(content).not.toHaveTextContent('2 dari 3')
    expect(document.activeElement).toBe(within(content).getByRole('button', { name: 'Foto berikutnya' }))
    expect(document.activeElement?.isConnected).toBe(true)
    await userEvent.click(within(content).getByRole('button', { name: 'Foto berikutnya' }))
    await Promise.resolve()
    expect(document.activeElement).toBe(within(content).getByRole('button', { name: 'Foto berikutnya' }))
    expect(document.activeElement?.isConnected).toBe(true)
    content.querySelector('[data-place-gallery]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await Promise.resolve()
    expect(within(content).getByAltText('Station Park foto 1')).toBeTruthy()
    expect(content.querySelector('[data-place-gallery]')).toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement?.isConnected).toBe(true)
    await userEvent.click(within(content).getByRole('button', { name: 'Foto sebelumnya' }))
    const failed = within(content).getByAltText('Station Park foto 3')
    failed.dispatchEvent(new Event('error'))
    expect(within(content).getByAltText('Station Park foto 2')).toHaveAttribute('src', expect.stringContaining('AUac2'))
    expect(content).toHaveTextContent('Contributor 2')
    expect(content).not.toHaveTextContent('2 dari 2')
    content.remove()
  })

  it('hides carousel navigation for one photo and removes the gallery when its image fails', async () => {
    const candidate = { id: 'single', name: 'Solo Park', location: { latitude: -6.2, longitude: 106.8 }, types: ['park'], photos: [{ name: 'places/ChIJ123/photos/AUac1' }], safetyVerified: false as const }
    render(<RoutePreviewMap origin={null} destination={null} restStopCandidates={[candidate]} showRestStops />)
    await finishMapLoad()
    markerListeners[0].click()
    const content = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    expect(within(content).getByAltText('Solo Park foto 1')).toBeTruthy()
    expect(within(content).queryByRole('button', { name: 'Foto berikutnya' })).not.toBeInTheDocument()
    expect(within(content).queryByRole('button', { name: /tampilkan foto/i })).not.toBeInTheDocument()
    within(content).getByAltText('Solo Park foto 1').dispatchEvent(new Event('error'))
    expect(content.querySelector('[data-place-gallery]')).not.toBeInTheDocument()
  })

  it('opens the active photo in a navigable accessible lightbox', async () => {
    const candidate = { id: 'lightbox', name: 'Gallery Park', location: { latitude: -6.2, longitude: 106.8 }, types: ['park'], photos: [1, 2, 3].map((index) => ({ name: `places/ChIJ123/photos/AUac${index}`, googleMapsUri: `https://www.google.com/maps/place/photo-${index}`, flagContentUri: `https://www.google.com/maps/report/photo-${index}`, authorAttributions: [{ displayName: `Contributor ${index}`, uri: 'https://www.google.com/maps/contrib/123' }] })), safetyVerified: false as const }
    render(<RoutePreviewMap origin={null} destination={null} restStopCandidates={[candidate]} showRestStops />)
    await finishMapLoad()
    markerListeners[0].click()
    const content = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    await userEvent.click(within(content).getByRole('button', { name: 'Foto berikutnya' }))
    await userEvent.click(within(content).getByRole('button', { name: 'Buka foto 2' }))
    const dialog = screen.getByRole('dialog', { name: 'Gallery Park foto' })
    expect(dialog).not.toHaveTextContent('2 dari 3')
    expect(within(dialog).getByAltText('Gallery Park foto 2')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Foto berikutnya' }))
    await Promise.resolve()
    expect(within(dialog).getByAltText('Gallery Park foto 3')).toBeInTheDocument()
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Foto berikutnya' }))
    expect(document.activeElement?.isConnected).toBe(true)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Foto berikutnya' }))
    await Promise.resolve()
    expect(within(dialog).getByAltText('Gallery Park foto 1')).toBeInTheDocument()
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Foto berikutnya' }))
    await userEvent.keyboard('{ArrowRight}')
    await Promise.resolve()
    expect(within(dialog).getByAltText('Gallery Park foto 2')).toBeInTheDocument()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement?.isConnected).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Gallery Park foto' })).not.toBeInTheDocument()
  })

  it('shows Street View immediately, resizes it, and closes from the map overlay', async () => {
    streetViewGetPanorama.mockResolvedValue({ data: { location: { pano: 'pano-1' } } })
    const candidate = { id: 'street', name: 'Street Park', location: { latitude: -6.2, longitude: 106.8 }, types: ['park'], safetyVerified: false as const }
    render(<RoutePreviewMap origin={null} destination={null} restStopCandidates={[candidate]} showRestStops />)
    await finishMapLoad()
    markerListeners.find((listeners) => listeners.click)?.click()
    const content = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    await userEvent.click(await within(content).findByRole('button', { name: 'Lihat 360°' }))
    expect(streetViewOrder).toEqual(['listen:visible_changed', 'setPano'])
    expect(panoramaSetPano).toHaveBeenCalledWith('pano-1')
    expect(panoramaSetPov).toHaveBeenCalledWith({ heading: 0, pitch: 0 })
    expect(panoramaSetVisible).toHaveBeenCalledWith(true)
    expect(google.maps.event.trigger).toHaveBeenCalledWith(panorama, 'resize')
    const close = await screen.findByRole('button', { name: 'Kembali ke peta' })
    expect(close).toHaveClass('min-h-11', 'z-[90]')
    resizeObserverCallback?.([{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry], {} as ResizeObserver)
    expect(google.maps.event.trigger).toHaveBeenCalledWith(panorama, 'resize')
    await userEvent.keyboard('{Escape}')
    expect(panoramaSetVisible).toHaveBeenCalledWith(false)
    expect(google.maps.event.trigger).toHaveBeenCalledWith(map, 'resize')
  })

  it('does not show the Street View action when no panorama is available', async () => {
    const candidate = { id: 'street', name: 'Street Park', location: { latitude: -6.2, longitude: 106.8 }, types: ['park'], safetyVerified: false as const }
    render(<RoutePreviewMap origin={null} destination={null} restStopCandidates={[candidate]} showRestStops />)
    await finishMapLoad()
    markerListeners[0].click()
    const content = infoWindowSetContent.mock.calls[0][0] as HTMLElement
    await waitFor(() => expect(streetViewGetPanorama).toHaveBeenCalledTimes(1))
    expect(within(content).queryByRole('button', { name: 'Lihat 360°' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kembali ke peta' })).not.toBeInTheDocument()
  })

  it('uses distinct static pictograms and vehicle-specific titles for transit markers', async () => {
    const stops = [
      ['BUS', 'B1'], ['SUBWAY', 'S1'], ['COMMUTER_TRAIN', 'T1'], ['BICYCLE', 'C1'], ['WALK', 'W1'], ['FERRY', 'F1'],
    ].map(([vehicleType, label], index) => ({ name: `${vehicleType} Hub`, location: { latitude: -6.2 - index / 100, longitude: 106.8 }, ordinal: index + 1, role: 'departure' as const, vehicleType, label }))
    render(<RoutePreviewMap origin={null} destination={null} transitStops={stops} />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    const expectedTitles = ['Perhentian Bus: BUS Hub', 'Perhentian MRT: SUBWAY Hub', 'Perhentian Kereta komuter: COMMUTER_TRAIN Hub', 'Perhentian Sepeda: BICYCLE Hub', 'Perhentian Jalan kaki: WALK Hub', 'Perhentian Feri: FERRY Hub']
    const transitOptions = Marker.mock.calls.map(([options]) => options).filter((options) => expectedTitles.includes(options.title))
    expect(new Set(transitOptions.map((options) => options.icon.url)).size).toBe(6)
    const busIcon = transitOptions.find((options) => options.title.startsWith('Perhentian Bus:'))?.icon.url
    const trainIcon = transitOptions.find((options) => options.title.startsWith('Perhentian Kereta komuter:'))?.icon.url
    expect(trainIcon).not.toBe(busIcon)
    expect(decodeURIComponent(trainIcon)).toContain('#087f5b')
    expect(transitOptions.every((options) => options.icon.url.startsWith('data:image/svg+xml'))).toBe(true)
    expect(transitOptions.every((options) => options.icon.url !== 'map-marker.png')).toBe(true)
    expect(transitOptions.every((options) => options.label === undefined)).toBe(true)
    expect(transitOptions.map((options) => options.title)).toEqual(expectedTitles)
  })

  it('loads transit stop details only after click and renders available evidence safely', async () => {
    const stop = { name: 'Central', location: { latitude: -6.2, longitude: 106.8 }, ordinal: 1, role: 'departure' as const, vehicleType: 'BUS', line: '7', headsign: 'Park', label: 'B1' }
    let resolveDetails!: (value: unknown) => void
    getStopDetails.mockImplementation(() => new Promise((resolve) => { resolveDetails = resolve }))
    render(<RoutePreviewMap origin={null} destination={null} transitStops={[stop]} selectedRouteResultId="route-result-1" />)
    await finishMapLoad()
    expect(getStopDetails).not.toHaveBeenCalled()
    const Marker = google.maps.Marker as unknown as jest.Mock
    const markerIndex = Marker.mock.calls.findIndex(([options]) => options.title === 'Perhentian Bus: Central')
    markerListeners[markerIndex].click()
    const loading = infoWindowSetContent.mock.calls.at(-1)![0] as HTMLElement
    expect(loading).toHaveTextContent('Perhentian transitCentralKeberangkatan · Perhentian 1 · Bus · 7 · menuju ParkMemuat detail Google Places…')
    expect(getStopDetails).toHaveBeenCalledWith(stop, 'route-result-1', expect.any(AbortSignal))
    expect(streetViewGetPanorama).not.toHaveBeenCalled()

    await act(async () => resolveDetails({ status: 'AVAILABLE', place: { id: 'central', name: 'Central Station', formattedAddress: 'Rail Street', location: stop.location, types: ['bus_station'], openNow: false, restroom: true, accessibility: { wheelchairAccessibleEntrance: true, wheelchairAccessibleParking: false, wheelchairAccessibleRestroom: false, wheelchairAccessibleSeating: true }, parkingOptions: { paidParkingLot: true }, googleMapsUri: 'https://www.google.com/maps/place/central', photos: [{ name: 'places/ChIJ123/photos/AUac123', authorAttributions: [{ displayName: 'Google Contributor', uri: 'https://www.google.com/maps/contrib/123' }, { displayName: 'External Contributor', uri: 'https://evil.example/person' }] }], safetyVerified: false } }))
    expect(streetViewGetPanorama).toHaveBeenCalledTimes(1)
    const available = infoWindowSetContent.mock.calls.at(-1)![0] as HTMLElement
    for (const text of ['Perhentian transit', 'Central', 'Rail Street', 'Status buka Tutup', 'Toilet Tersedia', 'Parkir Tersedia', 'Pintu masuk Tersedia', 'Toilet aksesibel Tidak tersedia', 'Tempat duduk aksesibel Tersedia', 'Informasi aksesibilitas tersedia', 'Informasi aksesibilitas dari Google Maps; bukan jaminan rute bebas tangga.']) expect(available).toHaveTextContent(text)
    expect(available.querySelector('.aeroute-place-grid')?.children).toHaveLength(2)
    expect(available.querySelector('.aeroute-place-primary')).toContainElement(available.querySelector('[data-place-gallery]'))
    expect(available.querySelector('.aeroute-place-facilities')).toHaveTextContent('Status buka TutupToilet TersediaParkir TersediaPintu masuk TersediaToilet aksesibel Tidak tersediaTempat duduk aksesibel Tersedia')
    expect(available).not.toHaveTextContent('Open in Google Maps')
    expect(available).not.toHaveTextContent(/safety/i)
    expect(available.querySelector('a[href="https://evil.example/person"]')).not.toBeInTheDocument()
    const image = available.querySelector('img[alt="Central Station foto 1"]')
    expect(image).toHaveAttribute('src', expect.stringContaining('/api/v1/place-photos'))
    expect(image).toHaveClass('aeroute-place-photo')
    image?.dispatchEvent(new Event('error'))
    expect(available.querySelector('img[alt="Central Station foto 1"]')).not.toBeInTheDocument()
  })

  it('omits the transit facility column when Google returns no facility data', async () => {
    const stop = { name: 'Palmerah', location: { latitude: -6.2, longitude: 106.8 }, ordinal: 1, role: 'departure' as const, vehicleType: 'COMMUTER_TRAIN', label: 'T1' }
    getStopDetails.mockResolvedValue({ status: 'AVAILABLE', place: { id: 'palmerah', name: 'Stasiun Palmerah', formattedAddress: 'Jakarta', location: stop.location, types: ['train_station'], photos: [{ name: 'places/ChIJ123/photos/AUac123' }], safetyVerified: false } })
    render(<RoutePreviewMap origin={null} destination={null} transitStops={[stop]} />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    markerListeners[Marker.mock.calls.findIndex(([options]) => options.title === 'Perhentian Kereta komuter: Palmerah')].click()
    await waitFor(() => expect((infoWindowSetContent.mock.calls.at(-1)![0] as HTMLElement).querySelector('.aeroute-place-grid')).not.toBeNull())

    const available = infoWindowSetContent.mock.calls.at(-1)![0] as HTMLElement
    expect(available.querySelector('.aeroute-place-grid')?.children).toHaveLength(1)
    expect(available.querySelector('.aeroute-place-grid')).toHaveClass('aeroute-place-grid-single')
    expect(available).toHaveTextContent('Kereta komuter')
    expect(available).not.toHaveTextContent('COMMUTER_TRAIN')
    expect(available.querySelector('.aeroute-place-facilities')).not.toBeInTheDocument()
    expect(available).not.toHaveTextContent(/\d+ dari \d+/)
  })

  it.each([
    [{ status: 'NOT_FOUND' }, 'Detail Google Places tidak ditemukan.'],
    [new Error('Unavailable'), 'Detail perhentian transit sementara tidak tersedia.'],
  ])('retains base transit stop content for unavailable details', async (result, message) => {
    if (result instanceof Error) getStopDetails.mockRejectedValue(result)
    else getStopDetails.mockResolvedValue(result)
    const stop = { name: 'Central', location: { latitude: -6.2, longitude: 106.8 }, ordinal: 1, role: 'departure' as const, vehicleType: 'BUS', line: '7', headsign: 'Park', label: 'B1' }
    render(<RoutePreviewMap origin={null} destination={null} transitStops={[stop]} />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    markerListeners[Marker.mock.calls.findIndex(([options]) => options.title === 'Perhentian Bus: Central')].click()
    await waitFor(() => expect(infoWindowSetContent.mock.calls.at(-1)![0]).toHaveTextContent(message))
    expect(streetViewGetPanorama).toHaveBeenCalledTimes(1)
    expect(infoWindowSetContent.mock.calls.at(-1)![0]).toHaveTextContent('CentralKeberangkatan · Perhentian 1 · Bus · 7 · menuju Park')
  })

  it('aborts transit details on close, another marker, route change, and unmount, then refetches on reopen', async () => {
    const stops = [
      { name: 'Central', location: { latitude: -6.2, longitude: 106.8 }, ordinal: 1, role: 'departure' as const, vehicleType: 'BUS', line: '7', headsign: 'Park', label: 'B1' },
      { name: 'Park', location: { latitude: -6.21, longitude: 106.81 }, ordinal: 2, role: 'arrival' as const, vehicleType: 'BUS', line: '7', headsign: 'Park', label: 'B2' },
    ]
    getStopDetails.mockImplementation(() => new Promise(() => undefined))
    const view = render(<RoutePreviewMap origin={null} destination={null} transitStops={stops} />)
    await finishMapLoad()
    const Marker = google.maps.Marker as unknown as jest.Mock
    const first = Marker.mock.calls.findIndex(([options]) => options.title === 'Perhentian Bus: Central')
    const second = Marker.mock.calls.findIndex(([options]) => options.title === 'Perhentian Bus: Park')
    markerListeners[first].click()
    const firstSignal = getStopDetails.mock.calls[0][2] as AbortSignal
    infoWindowListeners.closeclick()
    expect(firstSignal.aborted).toBe(true)
    markerListeners[first].click()
    expect(getStopDetails).toHaveBeenCalledTimes(2)
    const reopenSignal = getStopDetails.mock.calls[1][2] as AbortSignal
    markerListeners[second].click()
    expect(reopenSignal.aborted).toBe(true)
    const routeSignal = getStopDetails.mock.calls[2][2] as AbortSignal
    const marker = Marker.mock.results[first].value
    view.rerender(<RoutePreviewMap origin={null} destination={null} transitStops={[]} />)
    expect(routeSignal.aborted).toBe(true)
    await waitFor(() => expect(marker.setMap).toHaveBeenCalledWith(null))
    markerListeners[first].click()
    const unmountSignal = getStopDetails.mock.calls.at(-1)![2] as AbortSignal
    view.unmount()
    expect(unmountSignal.aborted).toBe(true)
    expect(infoWindowClose).toHaveBeenCalled()
  })
})
