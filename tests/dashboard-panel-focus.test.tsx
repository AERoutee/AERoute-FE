import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '@/pages/dashboard/DashboardPage'

jest.mock('react-router', () => ({ useLocation: () => ({ state: null }) }))
jest.mock('@/api', () => ({ compareRoutes: jest.fn(), getNearbyRoadReports: jest.fn() }))
jest.mock('@/components', () => ({ RoutePreviewMap: ({ onMapReady, selectedReport, onReportSelect, onReportClose, reportPopup }: { onMapReady: (ready: boolean) => void; selectedReport?: object | null; onReportSelect: (report: object) => void; onReportClose: () => void; reportPopup: (report: object, onClose: () => void) => ReactNode }) => <><button type="button" onClick={() => onMapReady(true)}>Enable map</button><button type="button" onClick={() => onReportSelect({ id: 'report-1', category: 'BLOCKED_PATH', description: 'Blocked path', latitude: 1, longitude: 2, createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(), resolvedAt: null, status: 'ACTIVE', images: [], reporter: 'Rider', isOwner: false, verification: { confirmations: 0, disputes: 0, viewerVerdict: null }, trust: { level: 'LOW', score: 1, kind: 'EVIDENCE_SCORE', factors: { recency: 1, photos: 0, voteBalance: 0 } } })}>Select report marker</button>{selectedReport && reportPopup(selectedReport, onReportClose)}</> }))
jest.mock('@/components/common', () => ({ ConfirmationDialog: () => null }))
jest.mock('@/context', () => ({ useToast: () => ({ showToast: jest.fn() }) }))
jest.mock('@/hooks', () => ({
  useCreateSavedCommute: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDraggablePanel: ({ x, y }: { x: number; y: number }) => ({ initialPosition: { x, y }, handlePointerDown: jest.fn(), handlePointerMove: jest.fn(), handlePointerUp: jest.fn(), handleKeyDown: jest.fn() }),
  useMobileSheet: () => ({ height: 55, setHeight: jest.fn(), handleClick: jest.fn(), handlePointerDown: jest.fn(), handlePointerMove: jest.fn(), handlePointerUp: jest.fn(), handleKeyDown: jest.fn() }),
  useMutationCreateRouteComparison: () => ({ reset: jest.fn(), abort: jest.fn(), mutate: jest.fn(), data: undefined, error: null, isPending: false }),
  useRecordTripImpact: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
jest.mock('@/pages/dashboard/components', () => ({
  MapLayerControl: () => <span>Layers</span>,
  PlannerPanel: ({ onClose }: { onClose: () => void }) => <><h2>Where are you going?</h2><button type="button" onClick={onClose}>Close planner</button></>,
  RoadReportDetailPanel: ({ onClose }: { onClose: () => void }) => <><h2>Blocked path</h2><button type="button" onClick={onClose}>Close report details</button></>,
  RoadReportSheet: () => <h2>What is happening?</h2>,
  RouteResultsPanel: ({ onClose }: { onClose: () => void }) => <><h2>Route options</h2><button type="button" onClick={onClose}>Close route options</button></>,
}))

beforeEach(() => jest.clearAllMocks())

describe('dashboard panel focus management', () => {
  it.each([
    ['Rencana', 'planner-panel', 'Close planner', 'Where are you going?'],
    ['Rute', 'routes-panel', 'Close route options', 'Route options'],
  ])('opens and closes the %s panel with ARIA state and focus restoration', async (triggerName, panelId, closeName, headingName) => {
    render(<DashboardPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))
    const trigger = screen.getByRole('button', { name: triggerName })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', panelId)

    trigger.focus()
    await userEvent.click(trigger)
    const panel = document.getElementById(panelId)
    await waitFor(() => expect(panel).toHaveFocus())
    expect(panel).toHaveAttribute('tabindex', '-1')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: headingName })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: closeName }))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens report details through the map popup renderer without a draggable aside and clears on close', async () => {
    render(<DashboardPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enable map' }))

    await userEvent.click(screen.getByRole('button', { name: 'Select report marker' }))
    expect(screen.getByRole('heading', { name: 'Blocked path' })).toBeInTheDocument()
    expect(document.getElementById('report-detail-panel')).not.toBeInTheDocument()
    expect(document.querySelector('[data-draggable-panel] #road-report-detail-title')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close report details' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Blocked path' })).not.toBeInTheDocument())
  })
})
