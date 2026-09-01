import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteResultsPanel } from '@/pages/dashboard/components/RouteResultsPanel'
import type { RouteOption } from '@/types'

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

function renderError(error: Error & { retryable?: boolean }) {
  return render(<RouteResultsPanel routes={[]} isPending={false} error={error} canStartNavigation={false} {...handlers} />)
}

function route(id: string, durationSeconds: number, averagePm25: number, labels: RouteOption['labels']): RouteOption {
  return { id, durationSeconds, averagePm25, labels, distanceMeters: 1000, estimatedExposureIndex: averagePm25 * durationSeconds / 60, exposureUnit: 'ug_m3_minutes', reductionFromFastestPercent: 0, encodedPolyline: 'encoded', dataQuality: 'modeled_estimate', airQualityTimestamp: new Date(0).toISOString(), airQualitySamples: [] }
}

describe('RouteResultsPanel labels', () => {
  it('does not label an unlabeled slower route as fastest', () => {
    render(<RouteResultsPanel routes={[route('short-clean', 11100, 13.3, ['FASTEST', 'RECOMMENDED', 'LOWEST_EXPOSURE']), route('long-dirty', 13620, 50.1, [])]} selected={undefined} isPending={false} canStartNavigation={false} {...handlers} />)
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText('Alternative route')).toBeInTheDocument()
    expect(screen.queryByText('Fastest')).not.toBeInTheDocument()
    expect(screen.getByText('Best overall')).toBeInTheDocument()
  })

  it('labels a route as fastest only when the backend says so', () => {
    render(<RouteResultsPanel routes={[route('fast', 600, 20, ['FASTEST'])]} selected={undefined} isPending={false} canStartNavigation={false} {...handlers} />)
    expect(screen.getByText('Fastest')).toBeInTheDocument()
  })
})

describe('RouteResultsPanel errors', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows unavailable cycling coverage instead of the empty state', () => {
    renderError(Object.assign(new Error('Google Maps does not provide a cycling route for this trip. Try walking mode.'), { retryable: false }))
    expect(screen.getByRole('alert')).toHaveTextContent('Try walking mode.')
    expect(screen.queryByText('No routes yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers retry for transient provider failures', async () => {
    renderError(Object.assign(new Error('Routes are temporarily unavailable.'), { retryable: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(handlers.onRetry).toHaveBeenCalledTimes(1)
  })
})
