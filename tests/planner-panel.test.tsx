import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerPanel } from '@/pages/dashboard/components/PlannerPanel'

jest.mock('@/components/planner', () => ({ LocationInput: ({ id, label }: { id: string; label: string }) => <label htmlFor={id}>{label}<input id={id} /></label> }))
jest.mock('@/assets', () => ({ colorBalancedPriorityIcon: 'balanced.png', colorLowerExposureIcon: 'exposure.png', colorWalkingIcon: 'walking.png', colorCompareIcon: 'compare.png' }))

const props = {
  origin: null,
  destination: null,
  selectedModes: ['WALK'] as const,
  preference: 'balanced' as const,
  sensitiveUser: false,
  transitPreference: 'LESS_WALKING' as const,
  accessibilityMode: 'STANDARD' as const,
  errors: {},
  isLocating: false,
  isPending: false,
  onOriginChange: jest.fn(),
  onDestinationChange: jest.fn(),
  onSelectedModesChange: jest.fn(),
  onPreferenceChange: jest.fn(),
  onSensitiveUserChange: jest.fn(),
  onTransitPreferenceChange: jest.fn(),
  onAccessibilityModeChange: jest.fn(),
  onCurrentLocation: jest.fn(),
  onSwap: jest.fn(),
  onSubmit: jest.fn(),
  onClose: jest.fn(),
  onDesktopDragStart: jest.fn(),
  onDesktopDragMove: jest.fn(),
  onDesktopDragEnd: jest.fn(),
  onDesktopDragKeyDown: jest.fn(),
  mobileHandle: { height: 55, onClick: jest.fn(), onPointerDown: jest.fn(), onPointerMove: jest.fn(), onPointerUp: jest.fn(), onKeyDown: jest.fn() },
}

describe('PlannerPanel direct mode controls', () => {
  beforeEach(() => jest.clearAllMocks())

  it('offers five checkbox choices in one equal compact row with preference guidance', () => {
    const { container } = render(<PlannerPanel {...props} />)
    for (const name of ['Walk', 'Cycle', 'Bus', 'Train', 'Subway']) expect(screen.getByRole('checkbox', { name })).toBeInTheDocument()
    expect(screen.getByText('Choose up to 3 modes. Available combinations will be shown.')).toBeInTheDocument()
    const grid = screen.getByRole('checkbox', { name: 'Walk' }).closest('div')
    expect(grid).toHaveClass('grid-cols-5', 'gap-1.5')
    for (const checkbox of screen.getAllByRole('checkbox').slice(0, 5)) {
      expect(checkbox.closest('label')).toHaveClass('min-w-0', 'min-h-13', 'flex-col', 'text-[11px]')
    }
    expect(container.querySelector('.sm\\:grid-cols-5')).not.toBeInTheDocument()
  })

  it('keeps one mode, allows bicycle with transit, and disables unchecked modes at three', async () => {
    const view = render(<PlannerPanel {...props} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Walk' }))
    expect(props.onSelectedModesChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cycle' }))
    expect(props.onSelectedModesChange).toHaveBeenLastCalledWith(['WALK', 'BICYCLE'])

    view.rerender(<PlannerPanel {...props} selectedModes={['WALK', 'BICYCLE']} />)
    for (const transit of ['Bus', 'Train', 'Subway']) expect(screen.getByRole('checkbox', { name: transit })).toBeEnabled()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Train' }))
    expect(props.onSelectedModesChange).toHaveBeenLastCalledWith(['WALK', 'BICYCLE', 'TRAIN'])

    view.rerender(<PlannerPanel {...props} selectedModes={['WALK', 'BICYCLE', 'TRAIN']} />)
    expect(screen.getByRole('checkbox', { name: 'Bus' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Subway' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Walk' })).toBeEnabled()
  })

  it('shows only transit priority when an itinerary includes transit', () => {
    render(<PlannerPanel {...props} selectedModes={['WALK', 'BUS']} />)
    expect(screen.queryByText('Active route priority')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Balanced' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Lower exposure' })).not.toBeInTheDocument()
    expect(screen.getByText('Transit priority')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Less walking' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Fewer transfers' })).toBeInTheDocument()
    expect(screen.getByText('Less walking').closest('label')?.querySelector('img')).toHaveAttribute('src', 'walking.png')
    expect(screen.getByText('Fewer transfers').closest('label')?.querySelector('img')).toHaveAttribute('src', 'compare.png')
  })

  it.each([[['WALK']], [['BICYCLE']]] as const)('shows active priority for %s alone', (selectedModes) => {
    render(<PlannerPanel {...props} selectedModes={selectedModes} />)
    expect(screen.getByText('Active route priority')).toBeInTheDocument()
    expect(screen.queryByText('Transit priority')).not.toBeInTheDocument()
  })

  it('uses one-comparison submit copy and keeps the desktop drag target wide', () => {
    const view = render(<PlannerPanel {...props} />)
    expect(screen.getAllByRole('button', { name: 'Compare routes' })).toHaveLength(2)
    const drag = screen.getByRole('button', { name: 'Drag planner panel' })
    expect(drag).toHaveClass('flex-1')
    expect(drag).toHaveTextContent('Where are you going?')
    view.rerender(<PlannerPanel {...props} selectedModes={['WALK', 'BUS']} />)
    expect(screen.getAllByRole('button', { name: 'Compare routes' })).toHaveLength(2)
    expect(screen.queryByText('Walking access and transfers are included.')).not.toBeInTheDocument()
  })

  it('labels reduced exertion as an approximation', () => {
    render(<PlannerPanel {...props} />)
    expect(screen.getByRole('checkbox', { name: 'Reduced exertion' })).toBeInTheDocument()
    expect(screen.getByText(/does not verify wheelchair or step-free access/i)).toBeInTheDocument()
  })
})
