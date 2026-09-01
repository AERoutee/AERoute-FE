import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteResultsPanel } from '@/pages/dashboard/components/RouteResultsPanel'

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

describe('RouteResultsPanel errors', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not offer retry for unavailable cycling coverage', () => {
    renderError(Object.assign(new Error('Google Maps does not provide a cycling route for this trip. Try walking mode.'), { retryable: false }))
    expect(screen.getByRole('alert')).toHaveTextContent('Try walking mode.')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers retry for transient provider failures', async () => {
    renderError(Object.assign(new Error('Routes are temporarily unavailable.'), { retryable: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(handlers.onRetry).toHaveBeenCalledTimes(1)
  })
})
