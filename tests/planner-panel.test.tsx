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
    for (const name of ['Jalan', 'Sepeda', 'Bus', 'Kereta', 'MRT']) expect(screen.getByRole('checkbox', { name })).toBeInTheDocument()
    expect(screen.getByText('Pilih maksimal 3 moda. Kombinasi yang tersedia akan ditampilkan.')).toBeInTheDocument()
    const grid = screen.getByRole('checkbox', { name: 'Jalan' }).closest('div')
    expect(grid).toHaveClass('grid-cols-5', 'gap-1.5')
    for (const checkbox of screen.getAllByRole('checkbox').slice(0, 5)) {
      expect(checkbox.closest('label')).toHaveClass('min-w-0', 'min-h-13', 'flex-col', 'text-[11px]')
    }
    expect(container.querySelector('.sm\\:grid-cols-5')).not.toBeInTheDocument()
  })

  it('keeps one mode, allows bicycle with transit, and disables unchecked modes at three', async () => {
    const view = render(<PlannerPanel {...props} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Jalan' }))
    expect(props.onSelectedModesChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sepeda' }))
    expect(props.onSelectedModesChange).toHaveBeenLastCalledWith(['WALK', 'BICYCLE'])

    view.rerender(<PlannerPanel {...props} selectedModes={['WALK', 'BICYCLE']} />)
    for (const transit of ['Bus', 'Kereta', 'MRT']) expect(screen.getByRole('checkbox', { name: transit })).toBeEnabled()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Kereta' }))
    expect(props.onSelectedModesChange).toHaveBeenLastCalledWith(['WALK', 'BICYCLE', 'TRAIN'])

    view.rerender(<PlannerPanel {...props} selectedModes={['WALK', 'BICYCLE', 'TRAIN']} />)
    expect(screen.getByRole('checkbox', { name: 'Bus' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'MRT' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Jalan' })).toBeEnabled()
  })

  it('shows only transit priority when an itinerary includes transit', () => {
    render(<PlannerPanel {...props} selectedModes={['WALK', 'BUS']} />)
    expect(screen.queryByText('Prioritas rute aktif')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Seimbang' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Paparan lebih rendah' })).not.toBeInTheDocument()
    expect(screen.getByText('Prioritas transit')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lebih sedikit berjalan' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lebih sedikit transit' })).toBeInTheDocument()
    expect(screen.getByText('Lebih sedikit berjalan').closest('label')?.querySelector('img')).toHaveAttribute('src', 'walking.png')
    expect(screen.getByText('Lebih sedikit transit').closest('label')?.querySelector('img')).toHaveAttribute('src', 'compare.png')
  })

  it.each([[['WALK']], [['BICYCLE']]] as const)('shows active priority for %s alone', (selectedModes) => {
    render(<PlannerPanel {...props} selectedModes={selectedModes} />)
    expect(screen.getByText('Prioritas rute aktif')).toBeInTheDocument()
    expect(screen.queryByText('Prioritas transit')).not.toBeInTheDocument()
  })

  it('uses one-comparison submit copy and keeps the desktop drag target wide', () => {
    const view = render(<PlannerPanel {...props} />)
    expect(screen.getAllByRole('button', { name: 'Bandingkan rute' })).toHaveLength(2)
    const drag = screen.getByRole('button', { name: 'Geser panel perencana' })
    expect(drag).toHaveClass('flex-1')
    expect(drag).toHaveTextContent('Mau pergi ke mana?')
    view.rerender(<PlannerPanel {...props} selectedModes={['WALK', 'BUS']} />)
    expect(screen.getAllByRole('button', { name: 'Bandingkan rute' })).toHaveLength(2)
    expect(screen.queryByText('Walking access and transfers are included.')).not.toBeInTheDocument()
  })

  it('labels reduced exertion as an approximation', () => {
    render(<PlannerPanel {...props} />)
    expect(screen.getByRole('checkbox', { name: 'Usaha lebih ringan' })).toBeInTheDocument()
    expect(screen.getByText(/tidak memverifikasi akses kursi roda atau rute bebas tangga/i)).toBeInTheDocument()
  })
})
