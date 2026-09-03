import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import { MAP_LAYERS_KEY } from '@/lib/map-layers'
import type { RouteComparisonOutcome, RouteComparisonTask } from '@/types'
import { routeComparison, routeOption } from './route-fixtures'

const abort = jest.fn()
const reset = jest.fn()
const mutate = jest.fn()
const watchPosition = jest.fn()
const getCurrentPosition = jest.fn()
const clearWatch = jest.fn()
const mockCompareRoutes = jest.fn()
const mockGetNearbyRoadReports = jest.fn()
const mapTransitStops: unknown[][] = []
let watchSuccess: PositionCallback
let watchError: PositionErrorCallback

jest.mock('react-router', () => ({ useLocation: () => ({ state: null }) }))
jest.mock('@/api', () => ({ compareRoutes: (...args: unknown[]) => mockCompareRoutes(...args), getNearbyRoadReports: (...args: unknown[]) => mockGetNearbyRoadReports(...args) }))
jest.mock('@/components', () => ({ RoutePreviewMap: ({ routes = [], transitStops = [], liveLocation, onMapReady, onOriginChange, onBoundsChange }: { routes?: Array<{ id: string }>; transitStops?: unknown[]; liveLocation?: { timestamp?: number } | null; onMapReady?: (ready: boolean) => void; onOriginChange?: (place: object) => void; onBoundsChange?: (bounds: object) => void }) => { mapTransitStops.push(transitStops); return <><button type="button" onClick={() => onMapReady?.(true)}>Enable map</button><button type="button" onClick={() => onOriginChange?.({ id: 'dragged', label: 'Adjusted origin', detail: '', latitude: 1, longitude: 2 })}>Drag origin</button><button type="button" onClick={() => onBoundsChange?.({ north: 39, east: -119, south: 38, west: -121 })}>Load hazards</button><button type="button" onClick={() => onBoundsChange?.({ north: 39.1, east: -119, south: 38, west: -121 })}>Clear hazards</button><output aria-label="map route ids">{routes.map((route) => route.id).join('|')}</output><output aria-label="live fix">{liveLocation ? JSON.stringify(liveLocation) : 'none'}</output></> } }))
jest.mock('@/components/common', () => ({ ConfirmationDialog: () => null }))
jest.mock('@/context', () => ({ useToast: () => ({ showToast: jest.fn() }) }))
jest.mock('@/hooks', () => ({
  useCreateSavedCommute: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDraggablePanel: ({ x, y }: { x: number; y: number }) => ({ initialPosition: { x, y }, handlePointerDown: jest.fn(), handlePointerMove: jest.fn(), handlePointerUp: jest.fn(), handleKeyDown: jest.fn() }),
  useMobileSheet: () => ({ height: 55, setHeight: jest.fn(), handleClick: jest.fn(), handlePointerDown: jest.fn(), handlePointerMove: jest.fn(), handlePointerUp: jest.fn(), handleKeyDown: jest.fn() }),
  useMutationCreateRouteComparison: () => ({ reset, abort, mutate, data: undefined, error: null, isPending: false }),
  useRecordTripImpact: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
jest.mock('@/pages/dashboard/components', () => ({
  MapLayerControl: ({ layers, onChange }: { layers: { weather: boolean; reports: boolean; accessiblePlaces: boolean; restStops: boolean }; onChange: (layers: { weather: boolean; reports: boolean; accessiblePlaces: boolean; restStops: boolean }) => void }) => <><output aria-label="layer settings">{JSON.stringify(layers)}</output><button type="button" onClick={() => onChange({ ...layers, weather: !layers.weather })}>Toggle weather</button></>,
  PlannerPanel: ({ errors, isLocating, onOriginChange, onDestinationChange, onSelectedModesChange, onCurrentLocation, onSubmit }: { errors: { origin?: string }; isLocating: boolean; onOriginChange: (place: object) => void; onDestinationChange: (place: object) => void; onSelectedModesChange: (modes: string[]) => void; onCurrentLocation: () => void; onSubmit: (event: { preventDefault: () => void }) => void }) => <><output aria-label="origin error">{errors.origin ?? ''}</output><output aria-label="location pending">{String(isLocating)}</output><button type="button" onClick={() => { onOriginChange({ id: 'a', label: 'A', detail: '', latitude: 1, longitude: 2 }); onDestinationChange({ id: 'b', label: 'B', detail: '', latitude: 3, longitude: 4 }); onSelectedModesChange(['WALK', 'BICYCLE']) }}>Set hybrid</button><button type="button" onClick={() => { onOriginChange({ id: 'a', label: 'A', detail: '', latitude: 1, longitude: 2 }); onDestinationChange({ id: 'b', label: 'B', detail: '', latitude: 3, longitude: 4 }); onSelectedModesChange(['BICYCLE', 'TRAIN']) }}>Set composite</button><button type="button" onClick={onCurrentLocation}>Use test current location</button><button type="button" onClick={() => onDestinationChange({ id: 'b', label: 'B', detail: '', latitude: 3, longitude: 4 })}>Set destination</button><button type="button" onClick={() => onSubmit({ preventDefault: jest.fn() })}>Submit hybrid</button></>,
  RoadReportDetailPanel: () => null,
  RoadReportSheet: () => null,
  RouteResultsPanel: ({ groups, onRetry, canStartNavigation, guidanceMessage, onStartNavigation }: { groups: RouteComparisonOutcome[]; onRetry: (id: 'WALK' | 'BICYCLE' | 'TRANSIT') => void; canStartNavigation: boolean; guidanceMessage: string; onStartNavigation?: () => void }) => <section><output aria-label="comparison groups">{groups.map((group) => `${group.task.label}:${group.status}`).join('|')}</output><output aria-label="guidance eligible">{String(canStartNavigation)}</output><output aria-label="guidance message">{guidanceMessage}</output><output aria-label="guidance action">{String(Boolean(onStartNavigation))}</output>{onStartNavigation && <button type="button" onClick={onStartNavigation}>Start test guidance</button>}{groups.filter((group) => group.status === 'error').map((group) => <button type="button" key={group.task.id} onClick={() => onRetry(group.task.id)}>Retry {group.task.label}</button>)}</section>,
}))

function taskOutcome(task: RouteComparisonTask, id: string): RouteComparisonOutcome {
  return { task, status: 'success', comparison: routeComparison(id, [routeOption('duplicate')]) }
}

beforeEach(() => {
  jest.clearAllMocks()
  getCurrentPosition.mockReset()
  mapTransitStops.length = 0
  localStorage.clear()
  watchPosition.mockImplementation((success, error) => { watchSuccess = success; watchError = error; return 7 })
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition, getCurrentPosition, clearWatch } })
})

describe('Dashboard comparison groups', () => {
  it('submits two tasks, renders partial success, retries only Cycle, and preserves Walk', async () => {
    let firstTasks: RouteComparisonTask[] = []
    mutate.mockImplementationOnce((tasks, options) => { firstTasks = tasks; options.onSuccess([taskOutcome(tasks[0], 'walk'), { task: tasks[1], status: 'error', error: new Error('Cycle failed') }]) })
    mutate.mockImplementationOnce((tasks, options) => options.onSuccess([taskOutcome(tasks[0], 'cycle')]))
    render(<DashboardPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set hybrid' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    expect(firstTasks.map((task) => task.id)).toEqual(['WALK', 'BICYCLE'])
    expect(screen.getByLabelText('comparison groups')).toHaveTextContent('Walk:success|Cycle:error')

    await userEvent.click(screen.getByRole('button', { name: 'Retry Cycle' }))
    expect(mutate.mock.calls[1][0].map((task: RouteComparisonTask) => task.id)).toEqual(['BICYCLE'])
    expect(screen.getByLabelText('comparison groups')).toHaveTextContent('Walk:success|Cycle:success')
    expect(screen.getByLabelText('map route ids')).toHaveTextContent('WALK:walk:duplicate|BICYCLE:cycle:duplicate')
  })

  it('removes a successful transit fallback from the map when the composite succeeds', async () => {
    mutate.mockImplementationOnce((tasks: RouteComparisonTask[], options) => options.onSuccess([taskOutcome(tasks[0], 'composite'), taskOutcome(tasks[1], 'fallback')]))
    render(<DashboardPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set composite' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText('map route ids')).toHaveTextContent('BIKE_TRANSIT:composite:duplicate')
    expect(screen.getByLabelText('map route ids')).not.toHaveTextContent('TRANSIT_FALLBACK')
  })

  it('suppresses stale outcomes after a newer request', async () => {
    const callbacks: Array<(outcomes: RouteComparisonOutcome[]) => void> = []
    mutate.mockImplementation((tasks, options) => callbacks.push(options.onSuccess))
    render(<DashboardPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set hybrid' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    await waitFor(() => expect(callbacks).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: 'Set hybrid' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    await waitFor(() => expect(callbacks).toHaveLength(2))
    const newerTasks = mutate.mock.calls[1][0] as RouteComparisonTask[]
    const olderTasks = mutate.mock.calls[0][0] as RouteComparisonTask[]
    act(() => callbacks[1]([taskOutcome(newerTasks[0], 'new')]))
    act(() => callbacks[0]([taskOutcome(olderTasks[0], 'stale')]))
    expect(screen.getByLabelText('map route ids')).toHaveTextContent('WALK:new:duplicate')
    expect(screen.getByLabelText('map route ids')).not.toHaveTextContent('stale')
    expect(abort).toHaveBeenCalled()
  })

  it('timestamps live fixes, clears the retained watch on error, and marks only successful current-location origin', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => success({ timestamp: Date.now(), coords: { latitude: 1, longitude: 2, accuracy: 12, heading: null, speed: null } } as GeolocationPosition))
    render(<DashboardPage />)
    const timestamp = Date.now()
    act(() => watchSuccess({ timestamp, coords: { latitude: 1, longitude: 2, accuracy: 10, heading: null, speed: null } } as GeolocationPosition))
    expect(screen.getByLabelText('live fix')).toHaveTextContent(`"timestamp":${timestamp}`)
    act(() => watchError({ code: 2 } as GeolocationPositionError))
    expect(clearWatch).toHaveBeenCalledWith(7)
    expect(screen.getByLabelText('live fix')).toHaveTextContent('none')
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use test current location' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set destination' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    const tasks = mutate.mock.calls.at(-1)![0] as RouteComparisonTask[]
    act(() => mutate.mock.calls.at(-1)![1].onSuccess([taskOutcome(tasks[0], 'walk')]))
    expect(screen.getByLabelText('guidance eligible')).toHaveTextContent('true')
    await userEvent.click(screen.getByRole('button', { name: 'Drag origin' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set destination' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    const draggedTasks = mutate.mock.calls.at(-1)![0] as RouteComparisonTask[]
    act(() => mutate.mock.calls.at(-1)![1].onSuccess([taskOutcome(draggedTasks[0], 'dragged')]))
    expect(screen.getByLabelText('guidance message')).toHaveTextContent('Use current location as the route origin to start guidance.')
  })

  it('reuses a fresh accurate live fix for the planner without requesting location again', async () => {
    render(<DashboardPage />)
    const timestamp = Date.now()
    act(() => watchSuccess({ timestamp, coords: { latitude: 1, longitude: 2, accuracy: 20, heading: null, speed: null } } as GeolocationPosition))
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use test current location' }))
    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(screen.getByLabelText('location pending')).toHaveTextContent('false')
  })

  it('retries once with normal accuracy after a high-accuracy timeout', async () => {
    const requests: Array<{ success: PositionCallback; error: PositionErrorCallback; options?: PositionOptions }> = []
    getCurrentPosition.mockImplementation((success, error, options) => requests.push({ success, error, options }))
    render(<DashboardPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use test current location' }))
    expect(requests[0].options).toEqual({ enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 })
    act(() => requests[0].error({ code: 3 } as GeolocationPositionError))
    expect(requests[1].options).toEqual({ enableHighAccuracy: false, maximumAge: 15_000, timeout: 10_000 })
    act(() => requests[1].success({ timestamp: Date.now(), coords: { latitude: 1, longitude: 2, accuracy: 250, heading: null, speed: null } } as GeolocationPosition))
    expect(screen.getByLabelText('live fix')).toHaveTextContent('"accuracy":250')
    expect(screen.getByLabelText('origin error')).toBeEmptyDOMElement()
    expect(screen.getByLabelText('location pending')).toHaveTextContent('false')
  })

  it('expires guidance at 15 seconds with one timeout and rechecks road-report location freshness', () => {
    jest.useFakeTimers()
    const timestamp = Date.now()
    getCurrentPosition.mockImplementation((success: PositionCallback) => success({ timestamp, coords: { latitude: 1, longitude: 2, accuracy: 12, heading: null, speed: null } } as GeolocationPosition))
    render(<DashboardPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Planner' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use test current location' }))
    fireEvent.click(screen.getByRole('button', { name: 'Set destination' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    const tasks = mutate.mock.calls.at(-1)![0] as RouteComparisonTask[]
    act(() => mutate.mock.calls.at(-1)![1].onSuccess([taskOutcome(tasks[0], 'walk')]))
    expect(screen.getByLabelText('guidance eligible')).toHaveTextContent('true')
    act(() => jest.advanceTimersByTime(15_001))
    expect(screen.getByLabelText('guidance message')).toHaveTextContent('Live location is stale.')
    fireEvent.click(screen.getByRole('button', { name: 'Report' }))
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })

  it('does not execute a stale hazard retry after navigation restarts', async () => {
    jest.useFakeTimers()
    const now = Date.now()
    getCurrentPosition.mockImplementation((success: PositionCallback) => success({ timestamp: now, coords: { latitude: 1, longitude: 2, accuracy: 12, heading: null, speed: null } } as GeolocationPosition))
    mockGetNearbyRoadReports.mockResolvedValue([{ id: 'hazard', category: 'CRASH', description: 'Crash', latitude: 38.5, longitude: -120.2, createdAt: '', expiresAt: '', resolvedAt: null, status: 'ACTIVE', images: [], reporter: 'Rider', isOwner: false, verification: { confirmations: 2, disputes: 0, viewerVerdict: null }, trust: { level: 'HIGH', score: 80, kind: 'EVIDENCE_SCORE', factors: { recency: 30, photos: 20, voteBalance: 30 } } }])
    mockCompareRoutes.mockRejectedValue(new Error('Reroute failed'))
    mutate.mockImplementationOnce((tasks, options) => options.onSuccess([{ task: tasks[0], status: 'success', comparison: routeComparison('walk', [{ ...routeOption('walk'), encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }]) }]))
    render(<DashboardPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Planner' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use test current location' }))
    fireEvent.click(screen.getByRole('button', { name: 'Set destination' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start test guidance' }))
    fireEvent.click(screen.getByRole('button', { name: 'Load hazards' }))
    await act(async () => { jest.advanceTimersByTime(350); await Promise.resolve(); await Promise.resolve() })
    await act(async () => { jest.advanceTimersByTime(0); await Promise.resolve(); await Promise.resolve() })
    expect(mockCompareRoutes).toHaveBeenCalledTimes(1)
    mockGetNearbyRoadReports.mockResolvedValue([])
    fireEvent.click(screen.getByRole('button', { name: 'Clear hazards' }))
    await act(async () => { jest.advanceTimersByTime(350); await Promise.resolve(); await Promise.resolve() })
    fireEvent.click(screen.getByRole('button', { name: 'Stop navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Routes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start test guidance' }))
    await act(async () => { jest.advanceTimersByTime(120_000); await Promise.resolve() })
    expect(mockCompareRoutes).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('keeps transit stop references stable across unrelated live-location renders', async () => {
    const transitRoute = { ...routeOption('transit'), transitSummary: { walkingDurationSeconds: 120, walkingDistanceMeters: 150, transfers: 0, stations: [], segments: [{ travelMode: 'BUS', vehicleType: 'BUS', durationSeconds: 600, distanceMeters: 3000, departureStop: { name: 'Central', location: { latitude: 1, longitude: 2 } }, arrivalStop: { name: 'Park', location: { latitude: 3, longitude: 4 } } }] } } as const
    mutate.mockImplementationOnce((tasks, options) => options.onSuccess([{ task: tasks[0], status: 'success', comparison: routeComparison('transit', [transitRoute]) }]))
    render(<DashboardPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    await userEvent.click(screen.getByRole('button', { name: 'Planner' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set composite' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit hybrid' }))
    await waitFor(() => expect(mapTransitStops.at(-1)).toHaveLength(2))
    const firstReference = mapTransitStops.at(-1)

    act(() => watchSuccess({ timestamp: Date.now(), coords: { latitude: 8, longitude: 9, accuracy: 10, heading: null, speed: null } } as GeolocationPosition))

    expect(mapTransitStops.at(-1)).toBe(firstReference)
  })

  it('lazy loads and persists map layers only when changed', async () => {
    localStorage.setItem(MAP_LAYERS_KEY, JSON.stringify({ weather: true, reports: false, accessiblePlaces: true, restStops: true }))
    render(<DashboardPage />)
    expect(screen.getByLabelText('layer settings')).toHaveTextContent('"weather":true')
    await userEvent.click(screen.getByRole('button', { name: 'Toggle weather' }))
    expect(JSON.parse(localStorage.getItem(MAP_LAYERS_KEY)!)).toEqual({ weather: false, reports: false, accessiblePlaces: true, restStops: true })
  })
})
