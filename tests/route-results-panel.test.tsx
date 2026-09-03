import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routeViews } from '@/lib/route-mode'
import { RouteResultsPanel } from '@/pages/dashboard/components/RouteResultsPanel'
import type { RouteOption } from '@/types'
import { plannerRequest, routeComparison, routeOption } from './route-fixtures'

const handlers = {
  onSelect: jest.fn(),
  onRetry: jest.fn(),
  onStartNavigation: jest.fn(),
  onClose: jest.fn(),
  onDesktopDragStart: jest.fn(),
  onDesktopDragMove: jest.fn(),
  onDesktopDragEnd: jest.fn(),
  onDesktopDragKeyDown: jest.fn(),
}
const { onStartNavigation: _onStartNavigation, ...handlersWithoutNavigation } = handlers

beforeEach(() => jest.clearAllMocks())

describe('RouteResultsPanel single itinerary', () => {
  it('renders one labeled set of route cards with compact insights', () => {
    const comparison = routeComparison('trip', [routeOption('recommended'), routeOption('alternative', [])])
    const request = { ...plannerRequest('BUS'), transitModes: ['BUS' as const] }
    const routes = routeViews('TRANSIT', ['WALK', 'BUS'], request, comparison)
    const groups = [{ task: { id: 'TRANSIT', label: 'Walk + Bus', selectedModes: ['WALK', 'BUS'] as const, request }, status: 'success' as const, comparison }]
    render(<RouteResultsPanel groups={groups} selected={routes[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.queryByRole('heading', { name: 'Walk + Bus' })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Walk + Bus route options' })).toBeInTheDocument()
    expect(screen.getAllByText('Recommended')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Trip insights' })).toBeInTheDocument()
    for (const label of ['Best departure', 'Break', 'Evidence', 'Reports']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText('Consider a break · 36.0°C / UV 9')).toBeInTheDocument()
    expect(screen.getByText('1 report signal nearby')).toBeInTheDocument()
    expect(screen.queryByText('Sources and timestamps')).not.toBeInTheDocument()
    expect(screen.queryByText('Rest-stop candidates')).not.toBeInTheDocument()
    expect(screen.queryByText('Cleanest departure')).not.toBeInTheDocument()
  })

  it('collapses rationale and warnings and omits standard accessibility', () => {
    const comparison = { ...routeComparison('trip'), warnings: ['Forecast coverage is partial.'] }
    const request = plannerRequest('WALK')
    const routes = routeViews('WALK', ['WALK'], request, comparison)
    const groups = [{ task: { id: 'WALK', label: 'Walk', selectedModes: ['WALK'] as const, request }, status: 'success' as const, comparison }]
    render(<RouteResultsPanel groups={groups} selected={routes[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.getByText('Why this route').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Warnings').closest('details')).not.toHaveAttribute('open')
    expect(screen.queryByRole('heading', { name: 'Accessibility approximation' })).not.toBeInTheDocument()
  })

  it('renders Walk and Cycle independently with a group-specific partial error and retry', async () => {
    const request = plannerRequest('WALK')
    const comparison = routeComparison('walk', [routeOption('duplicate')])
    const error = Object.assign(new Error('Cycling provider unavailable.'), { retryable: true })
    const groups = [
      { task: { id: 'WALK', label: 'Walk', selectedModes: ['WALK'] as const, request }, status: 'success' as const, comparison },
      { task: { id: 'BICYCLE', label: 'Cycle', selectedModes: ['BICYCLE'] as const, request: { ...request, mode: 'BICYCLE' as const } }, status: 'error' as const, error },
    ]
    render(<RouteResultsPanel groups={groups} selected={routeViews('WALK', ['WALK'], request, comparison)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.getByRole('heading', { name: 'Walk' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Cycle route failed')
    await userEvent.click(screen.getByRole('button', { name: 'Retry Cycle route' }))
    expect(handlers.onRetry).toHaveBeenCalledWith('BICYCLE')
  })

  it('renders duplicate raw route ids in separate mode groups', () => {
    const walkRequest = plannerRequest('WALK')
    const cycleRequest = plannerRequest('BICYCLE')
    const groups = [
      { task: { id: 'WALK', label: 'Walk', selectedModes: ['WALK'] as const, request: walkRequest }, status: 'success' as const, comparison: routeComparison('same', [routeOption('duplicate')]) },
      { task: { id: 'BICYCLE', label: 'Cycle', selectedModes: ['BICYCLE'] as const, request: cycleRequest }, status: 'success' as const, comparison: routeComparison('same', [routeOption('duplicate')]) },
    ]
    render(<RouteResultsPanel groups={groups} selected={routeViews('WALK', ['WALK'], walkRequest, groups[0].comparison)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.getByRole('heading', { name: 'Walk' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cycle' })).toBeInTheDocument()
    expect(screen.getAllByText('Recommended')).toHaveLength(2)
  })

  it('silently shows native transit when a composite connection is unavailable', () => {
    const request = plannerRequest('TRAIN')
    const fallback = routeComparison('fallback')
    const groups = [
      { task: { id: 'BIKE_TRANSIT' as const, label: 'Cycle + Train', selectedModes: ['BICYCLE', 'TRAIN'] as const, request: { ...request, accessPlan: { firstMileMode: 'BICYCLE' as const, lastMileMode: 'WALK' as const, bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' as const } } }, status: 'error' as const, error: Object.assign(new Error('No connection.'), { code: 'bike_transit_unavailable', retryable: false }) },
      { task: { id: 'TRANSIT_FALLBACK' as const, label: 'Train', selectedModes: ['TRAIN'] as const, request }, status: 'success' as const, comparison: fallback },
    ]
    render(<RouteResultsPanel groups={groups} selected={routeViews('TRANSIT_FALLBACK', ['TRAIN'], request, fallback)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.queryByText('Bike connection unavailable; showing transit option.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Train' })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Train route options' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hides the fallback group entirely when the composite succeeds', () => {
    const request = plannerRequest('TRAIN')
    const composite = { ...routeComparison('composite'), persisted: false }
    const fallback = routeComparison('fallback')
    const groups = [
      { task: { id: 'BIKE_TRANSIT' as const, label: 'Cycle + Train', selectedModes: ['BICYCLE', 'TRAIN'] as const, request: { ...request, accessPlan: { firstMileMode: 'BICYCLE' as const, lastMileMode: 'WALK' as const, bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' as const } } }, status: 'success' as const, comparison: composite },
      { task: { id: 'TRANSIT_FALLBACK' as const, label: 'Train fallback', selectedModes: ['TRAIN'] as const, request }, status: 'success' as const, comparison: fallback },
    ]
    render(<RouteResultsPanel groups={groups} selected={routeViews('BIKE_TRANSIT', ['BICYCLE', 'TRAIN'], groups[0].task.request, composite)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.queryByRole('heading', { name: 'Cycle + Train' })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Cycle + Train route options' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Train fallback' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Recommended')).toHaveLength(1)
  })

  it('hides a fallback error when the composite succeeds', () => {
    const request = plannerRequest('TRAIN')
    const composite = { ...routeComparison('composite'), persisted: false }
    const groups = [
      { task: { id: 'BIKE_TRANSIT' as const, label: 'Cycle + Train', selectedModes: ['BICYCLE', 'TRAIN'] as const, request: { ...request, accessPlan: { firstMileMode: 'BICYCLE' as const, lastMileMode: 'WALK' as const, bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' as const } } }, status: 'success' as const, comparison: composite },
      { task: { id: 'TRANSIT_FALLBACK' as const, label: 'Train', selectedModes: ['TRAIN'] as const, request }, status: 'error' as const, error: new Error('Transit unavailable.') },
    ]
    render(<RouteResultsPanel groups={groups} selected={routeViews('BIKE_TRANSIT', ['BICYCLE', 'TRAIN'], groups[0].task.request, composite)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps a retryable composite outage visible beside a successful fallback', () => {
    const request = plannerRequest('TRAIN')
    const fallback = routeComparison('fallback')
    const groups = [
      { task: { id: 'BIKE_TRANSIT' as const, label: 'Cycle + Train', selectedModes: ['BICYCLE', 'TRAIN'] as const, request }, status: 'error' as const, error: Object.assign(new Error('Route provider unavailable.'), { code: 'provider_unavailable', retryable: true }) },
      { task: { id: 'TRANSIT_FALLBACK' as const, label: 'Train', selectedModes: ['TRAIN'] as const, request }, status: 'success' as const, comparison: fallback },
    ]
    render(<RouteResultsPanel groups={groups} selected={routeViews('TRANSIT_FALLBACK', ['TRAIN'], request, fallback)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Route provider unavailable.')
    expect(screen.getByRole('button', { name: 'Retry Cycle + Train route' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Train' })).toBeInTheDocument()
    expect(screen.queryByText('Bike connection unavailable; showing transit option.')).not.toBeInTheDocument()
  })

  it('renders a realistic composite response only in the ordered role-aware compact itinerary', () => {
    const route = { ...routeOption(), composition: 'PROVIDER_SEGMENTS' as const, transitSummary: { walkingDurationSeconds: 240, walkingDistanceMeters: 300, transfers: 1, stations: [], segments: [
      { role: 'FIRST_MILE', source: 'GOOGLE_ROUTES', mode: 'BICYCLE', durationSeconds: 600, distanceMeters: 2100 },
      { role: 'WAIT', source: 'DERIVED_FROM_TRANSIT_SCHEDULE', mode: 'WAIT', durationSeconds: 300, distanceMeters: 0, location: { latitude: -6.2, longitude: 106.8 } },
      { role: 'TRANSIT_RIDE', source: 'GOOGLE_ROUTES', mode: 'TRANSIT', vehicleType: 'BUS', lineShortName: 'B07', headsign: 'Central', departureStop: { name: 'Park', location: { latitude: 1, longitude: 2 } }, arrivalStop: { name: 'Central', location: { latitude: 3, longitude: 4 } }, stopCount: 5, durationSeconds: 900, distanceMeters: 5000 },
      { role: 'TRANSFER_WALK', source: 'GOOGLE_ROUTES', mode: 'WALK', durationSeconds: 120, distanceMeters: 150 },
      { role: 'TRANSIT_RIDE', source: 'GOOGLE_ROUTES', mode: 'TRANSIT', vehicleType: 'TRAIN', lineShortName: 'R03A', durationSeconds: 1200, distanceMeters: 8000 },
      { role: 'LAST_MILE', source: 'GOOGLE_ROUTES', mode: 'WALK', durationSeconds: 240, distanceMeters: 300 },
    ] } } as RouteOption
    const comparison = { ...routeComparison('composite', [route]), persisted: false }
    const request = { ...plannerRequest('TRAIN'), accessPlan: { firstMileMode: 'BICYCLE' as const, lastMileMode: 'WALK' as const, bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' as const } }
    const groups = [{ task: { id: 'BIKE_TRANSIT' as const, label: 'Cycle + Train', selectedModes: ['BICYCLE', 'TRAIN'] as const, request }, status: 'success' as const, comparison }]
    expect(() => render(<RouteResultsPanel groups={groups} selected={routeViews('BIKE_TRANSIT', ['BICYCLE', 'TRAIN'], request, comparison)[0]} canStartNavigation={false} {...handlers} />)).not.toThrow()
    const strip = screen.getByLabelText('Cycle 10 minutes, Wait 5 minutes, Bus B07, Walk 2 minutes, Train R03A, Walk 4 minutes')
    expect(Array.from(strip.querySelectorAll('[data-itinerary-token]')).map((token) => token.textContent)).toEqual(['Cycle 10m', 'Wait 5m', 'Bus B07', 'Walk 2m', 'Train R03A', 'Walk 4m'])
    expect(screen.queryByRole('heading', { name: 'Transit itinerary' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Transit itinerary' })).not.toBeInTheDocument()
    expect(screen.queryByText(/walking access and transfers included/i)).not.toBeInTheDocument()
    expect(strip).toHaveClass('flex-wrap')
    expect(strip).not.toHaveClass('overflow-x-auto')
    expect(screen.queryByRole('button', { name: 'Save commute' })).not.toBeInTheDocument()
  })

  it('never renders a save commute action', () => {
    const request = plannerRequest('TRAIN')
    const comparison = routeComparison('fallback')
    const groups = [{ task: { id: 'TRANSIT_FALLBACK' as const, label: 'Train', selectedModes: ['TRAIN'] as const, request }, status: 'success' as const, comparison }]
    render(<RouteResultsPanel groups={groups} selected={routeViews('TRANSIT_FALLBACK', ['TRAIN'], request, comparison)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.queryByRole('button', { name: 'Save commute' })).not.toBeInTheDocument()
  })

  it.each([
    ['NONE', 'No break threshold · 36.0°C / UV 9'],
    ['CONSIDER', 'Consider a break · 36.0°C / UV 9'],
    ['RECOMMENDED', 'Break recommended · 36.0°C / UV 9'],
  ] as const)('renders %s break guidance for every selected route', (breakRecommendation, text) => {
    const route = { ...routeOption(), heatUv: { ...routeOption().heatUv, breakRecommendation, reasons: ['Shade is limited.', 'UV is elevated.'] } }
    const comparison = routeComparison('break', [route])
    const request = plannerRequest('WALK')
    const groups = [{ task: { id: 'WALK' as const, label: 'Walk', selectedModes: ['WALK'] as const, request }, status: 'success' as const, comparison }]
    render(<RouteResultsPanel groups={groups} selected={routeViews('WALK', ['WALK'], request, comparison)[0]} canStartNavigation={false} guidanceMessage="Live location is unavailable." {...handlers} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    if (breakRecommendation === 'NONE') expect(screen.queryByText('Shade is limited.')).not.toBeInTheDocument()
    else expect(screen.getByText('Shade is limited.')).toBeInTheDocument()
    expect(screen.queryByText('UV is elevated.')).not.toBeInTheDocument()
  })

  it('shows weather unavailable and no candidate action when break evidence is unavailable', () => {
    const route = { ...routeOption(), heatUv: { status: 'UNAVAILABLE' as const, maxFeelsLikeC: null, maxHeatIndexC: null, maxUvIndex: null, breakRecommendation: 'NONE' as const, reasons: [] } }
    const comparison = routeComparison('unavailable', [route])
    const request = plannerRequest('WALK')
    const groups = [{ task: { id: 'WALK' as const, label: 'Walk', selectedModes: ['WALK'] as const, request }, status: 'success' as const, comparison }]
    render(<RouteResultsPanel groups={groups} selected={routeViews('WALK', ['WALK'], request, comparison)[0]} canStartNavigation={false} guidanceMessage="Live location is unavailable." {...handlers} />)
    expect(screen.getByText('Weather unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show rest stops on map' })).not.toBeInTheDocument()
  })

  it('omits redundant rest-stop actions when candidates are already visible', () => {
    const comparison = { ...routeComparison('rest'), restStopCandidates: { status: 'AVAILABLE' as const, candidates: [{ id: 'park', name: 'Park', location: { latitude: 1, longitude: 2 }, types: ['park'], safetyVerified: false as const }] } }
    const request = plannerRequest('WALK')
    const groups = [{ task: { id: 'WALK' as const, label: 'Walk', selectedModes: ['WALK'] as const, request }, status: 'success' as const, comparison }]
    render(<RouteResultsPanel groups={groups} selected={routeViews('WALK', ['WALK'], request, comparison)[0]} canStartNavigation={false} {...handlers} />)
    expect(screen.queryByRole('button', { name: 'Show rest stops on map' })).not.toBeInTheDocument()
  })

  it('renders guidance CTA and status only when navigation is supplied', () => {
    const comparison = routeComparison('transit')
    const request = plannerRequest('TRAIN')
    const groups = [{ task: { id: 'TRANSIT' as const, label: 'Train', selectedModes: ['TRAIN'] as const, request }, status: 'success' as const, comparison }]
    const view = routeViews('TRANSIT', ['TRAIN'], request, comparison)[0]
    const rendered = render(<RouteResultsPanel groups={groups} selected={view} canStartNavigation={false} guidanceMessage="Move within 150 m of the route start." {...handlersWithoutNavigation} />)
    expect(screen.queryByRole('button', { name: 'Start route guidance' })).not.toBeInTheDocument()
    expect(screen.queryByText('Move within 150 m of the route start.')).not.toBeInTheDocument()

    rendered.rerender(<RouteResultsPanel groups={groups} selected={view} canStartNavigation guidanceMessage="Live location is ready at the route start." {...handlers} />)
    expect(screen.getByRole('button', { name: 'Start route guidance' })).toBeEnabled()
    expect(screen.getByText('Live location is ready at the route start.')).toBeInTheDocument()
  })

  it('keeps the empty panel useful and the desktop drag target wide', () => {
    render(<RouteResultsPanel groups={[]} canStartNavigation={false} {...handlers} />)
    expect(screen.getByText('No routes yet')).toBeInTheDocument()
    const drag = screen.getByRole('button', { name: 'Drag route options panel' })
    expect(drag).toHaveClass('flex-1')
    expect(drag).toHaveTextContent('Route options')
  })
})
