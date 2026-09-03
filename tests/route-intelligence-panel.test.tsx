import { render, screen } from '@testing-library/react'
import { routeViews } from '@/lib/route-mode'
import { RouteResultsPanel } from '@/pages/dashboard/components/RouteResultsPanel'
import { plannerRequest, routeComparison, routeOption } from './route-fixtures'

const handlers = { onSelect: jest.fn(), onRetry: jest.fn(), onStartNavigation: jest.fn(), onClose: jest.fn(), onDesktopDragStart: jest.fn(), onDesktopDragMove: jest.fn(), onDesktopDragEnd: jest.fn(), onDesktopDragKeyDown: jest.fn() }

function transitRoute() {
  return {
    ...routeOption(),
    transitSummary: {
      walkingDurationSeconds: 420,
      walkingDistanceMeters: 600,
      transfers: 1,
      segments: [
        { travelMode: 'WALK', durationSeconds: 180, distanceMeters: 220 },
        { travelMode: 'BUS', vehicleType: 'BUS', lineShortName: '7', lineName: 'City Loop', headsign: 'Park', departureStop: { name: 'Central' }, arrivalStop: { name: 'Park' }, stopCount: 5, durationSeconds: 600, distanceMeters: 4200 },
        { travelMode: 'WALK', durationSeconds: 240, distanceMeters: 380 },
      ],
      stations: [{ name: 'Central' }, { name: 'Park' }],
    },
    accessibility: { mode: 'REDUCED_EXERTION' as const, assessment: 'APPROXIMATION' as const, reasons: ['Less walking preferred.'], limitations: ['This does not verify wheelchair or step-free access.'] },
  }
}

describe('RouteResultsPanel route intelligence', () => {
  it('renders compact insights, compact itinerary, disclosure, and reduced-exertion limitation', () => {
    const route = transitRoute()
    const comparison = { ...routeComparison('comparison', [route]), cleanestDeparture: 30 as const, departureComparisons: [
      ...routeComparison('comparison', [route]).departureComparisons.slice(0, 1),
      { offsetMinutes: 30 as const, status: 'AVAILABLE' as const, routes: [route], recommendedRouteId: route.id, temporalResolution: 'HOURLY_BUCKET' as const, approximate: true, weatherAdvisory: { level: 'NORMAL' as const, reasons: [], ruleVersion: 'weather-advisory-v2' as const }, heatUv: route.heatUv },
      ...routeComparison('comparison', [route]).departureComparisons.slice(2),
    ] }
    const request = { ...plannerRequest('BUS'), accessibilityMode: 'REDUCED_EXERTION' as const }
    const routes = routeViews('TRANSIT', ['WALK', 'BUS'], request, comparison)
    const groups = [{ task: { id: 'TRANSIT' as const, label: 'Walk + Bus', selectedModes: ['WALK', 'BUS'] as const, request }, status: 'success' as const, comparison }]
    render(<RouteResultsPanel groups={groups} selected={routes[0]} canStartNavigation {...handlers} />)
    expect(screen.getByText('+30 min')).toBeInTheDocument()
    expect(screen.getByText('+30/+60 menggunakan estimasi prakiraan per jam.')).toBeInTheDocument()
    expect(screen.getByLabelText('Jalan 3 menit, Bus 7, Jalan 4 menit')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Transit itinerary' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Perkiraan aksesibilitas' })).toBeInTheDocument()
    expect(screen.getByText('This does not verify wheelchair or step-free access.')).toBeInTheDocument()
    expect(screen.queryByText('Sources and timestamps')).not.toBeInTheDocument()
    expect(screen.queryByText('Rest-stop candidates')).not.toBeInTheDocument()
  })
})
