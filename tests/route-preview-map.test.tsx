import { act, render, waitFor } from '@testing-library/react'
import { hasGoogleMapsKey, loadGoogleMaps } from '@/config'
import { RoutePreviewMap } from '@/components/map/RoutePreviewMap'

jest.mock('@/config', () => ({ hasGoogleMapsKey: jest.fn(), loadGoogleMaps: jest.fn() }))

const hasKey = hasGoogleMapsKey as jest.Mock
const loadMaps = loadGoogleMaps as jest.Mock
const setCenter = jest.fn()
const panTo = jest.fn()
const fitBounds = jest.fn()
const markerSetPosition = jest.fn()
let resolveMaps: ((library: { Map: jest.Mock }) => void) | undefined

const map = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  getBounds: jest.fn(() => null),
  getCenter: jest.fn(() => ({ lat: () => -6.2, lng: () => 106.8 })),
  getZoom: jest.fn(() => 12),
  setZoom: jest.fn(),
  setCenter,
  panTo,
  fitBounds,
}
const MapMock = jest.fn(() => map)

function constructor(value: object) {
  return jest.fn(() => value)
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class { observe() {} disconnect() {} } })
})

beforeEach(() => {
  jest.clearAllMocks()
  hasKey.mockReturnValue(true)
  loadMaps.mockImplementation(() => new Promise((resolve) => { resolveMaps = resolve }))
  Object.defineProperty(globalThis, 'google', {
    configurable: true,
    value: { maps: {
      Marker: constructor({ addListener: jest.fn(), getPosition: jest.fn(() => ({ lat: () => -6.2, lng: () => 106.8 })), setMap: jest.fn(), setPosition: markerSetPosition, setIcon: jest.fn(), setTitle: jest.fn() }),
      Circle: constructor({ setMap: jest.fn(), setCenter: jest.fn(), setRadius: jest.fn() }),
      Polyline: constructor({ addListener: jest.fn(), setMap: jest.fn(), setOptions: jest.fn() }),
      InfoWindow: constructor({ close: jest.fn(), setContent: jest.fn(), open: jest.fn() }),
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

describe('RoutePreviewMap initial camera', () => {
  it('centers once when location arrives before the map', async () => {
    const view = render(<RoutePreviewMap origin={null} destination={null} liveLocation={firstLocation} />)
    await finishMapLoad()
    await waitFor(() => expect(setCenter).toHaveBeenCalledWith({ lat: -6.4, lng: 106.9 }))

    view.rerender(<RoutePreviewMap origin={null} destination={null} liveLocation={secondLocation} />)
    await waitFor(() => expect(markerSetPosition).toHaveBeenCalledWith({ lat: -6.41, lng: 106.9 }))
    expect(setCenter).toHaveBeenCalledTimes(1)
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
})
