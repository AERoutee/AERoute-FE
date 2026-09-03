import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoadReportDetailPanel } from '@/pages/dashboard/components/RoadReportDetailPanel'
import type { RoadReport } from '@/types'

const showToast = jest.fn()
const verify = jest.fn()
const retract = jest.fn()
const resolve = jest.fn()
let isPending = false

jest.mock('@/config', () => ({ apiBaseURL: 'https://api.example.test', apiClient: {} }))
jest.mock('@/context', () => ({ useToast: () => ({ showToast }) }))
jest.mock('@/hooks', () => ({
  useVerifyRoadReport: () => ({ mutateAsync: verify, isPending }),
  useRetractRoadReportVerification: () => ({ mutateAsync: retract, isPending }),
  useResolveRoadReport: () => ({ mutateAsync: resolve, isPending }),
}))

const report: RoadReport = {
  id: 'report-1',
  category: 'CRASH',
  description: 'Crash blocks the cycle lane',
  latitude: 1,
  longitude: 2,
  createdAt: '2026-08-29T10:30:00.000Z',
  expiresAt: '2026-09-05T10:30:00.000Z',
  resolvedAt: null,
  status: 'ACTIVE',
  images: ['/api/v1/road-report-images/11111111-1111-4111-8111-111111111111'],
  reporter: 'Rider',
  isOwner: false,
  verification: { confirmations: 2, disputes: 1, viewerVerdict: null },
  trust: { level: 'HIGH', score: 82, kind: 'EVIDENCE_SCORE', factors: { recency: 35, photos: 20, voteBalance: 27 } },
}

const handler = jest.fn()
const panelProps = {
  onClose: handler,
  onUpdate: handler,
  onDesktopDragStart: handler,
  onDesktopDragMove: handler,
  onDesktopDragEnd: handler,
  onDesktopDragKeyDown: handler,
  mobileHandle: { height: 60, onClick: handler, onPointerDown: handler, onPointerMove: handler, onPointerUp: handler, onKeyDown: handler },
}

beforeEach(() => {
  jest.clearAllMocks()
  isPending = false
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-02T10:30:00.000Z').getTime())
})

afterEach(() => jest.restoreAllMocks())

describe('RoadReportDetailPanel', () => {
  it('renders an anchored compact variant without sheet or drag controls', () => {
    render(<RoadReportDetailPanel variant="anchored" report={report} onClose={handler} onUpdate={handler} />)

    const panel = screen.getByRole('region', { name: 'Crash road report details' })
    expect(panel).toHaveClass('max-h-[min(75dvh,36rem)]', 'w-[min(22rem,calc(100vw-3rem))]', 'max-w-[22rem]', 'overflow-auto')
    expect(panel).not.toHaveClass('overflow-hidden')
    expect(screen.queryByRole('button', { name: 'Resize report details panel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Drag report details panel' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close report details' })).toHaveClass('size-11')
    expect(screen.getByRole('heading', { name: 'Crash' })).toBeInTheDocument()
  })

  it('renders a dynamically labelled hierarchy, metadata, lifecycle, and drag handles', () => {
    render(<RoadReportDetailPanel report={report} {...panelProps} />)

    expect(screen.getByText('Road report')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Crash' })).toHaveAttribute('id', 'road-report-detail-title')
    expect(document.querySelector('header img')).toHaveAttribute('src', expect.stringContaining('test-file-stub'))
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Your report')).not.toBeInTheDocument()
    expect(screen.getByText('Reported by Rider')).toBeInTheDocument()
    const reportedTime = screen.getByText(new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.createdAt)))
    expect(reportedTime).toHaveAttribute('datetime', report.createdAt)
    expect(reportedTime.parentElement).toHaveTextContent('4 days ago')
    const drag = screen.getByRole('button', { name: 'Drag report details panel' })
    expect(drag).toHaveClass('flex-1')
    expect(drag).not.toHaveClass('bg-ae-soft', 'rounded-sm', 'rounded-lg')
    expect(drag.querySelector('svg')).not.toBeInTheDocument()
    fireEvent.pointerDown(drag)
    expect(handler).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Resize report details panel' })).toHaveClass('min-h-11')
  })

  it('shows valid images as a lead image and grid with accessible links', () => {
    const images = [
      '/api/v1/road-report-images/11111111-1111-4111-8111-111111111111',
      '/api/v1/road-report-images/22222222-2222-4222-8222-222222222222',
      'http://unsafe.example/image.jpg',
    ]
    render(<RoadReportDetailPanel report={{ ...report, images }} {...panelProps} />)

    const first = screen.getByRole('img', { name: 'Crash road report photo 1' })
    expect(first).toHaveClass('aspect-video')
    expect(first).toHaveAttribute('loading', 'lazy')
    expect(first.closest('a')).toHaveAccessibleName('Open Crash road report photo 1 in a new tab')
    expect(first.closest('a')).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    expect(screen.getByRole('img', { name: 'Crash road report photo 2' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Crash road report photo 3' })).not.toBeInTheDocument()
  })

  it('renders no photo UI when no valid image exists', () => {
    render(<RoadReportDetailPanel report={{ ...report, images: ['javascript:alert(1)'] }} {...panelProps} />)

    expect(screen.queryByText('No photo attached')).not.toBeInTheDocument()
    expect(screen.queryByText('Check the report time and community responses for context.')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Report photos' })).not.toBeInTheDocument()
  })

  it('shows evidence strength, real zero scores, factors on demand, and correct vote plurals', async () => {
    render(<RoadReportDetailPanel report={{ ...report, trust: { ...report.trust, score: 0 }, verification: { confirmations: 1, disputes: 2, viewerVerdict: null } }} {...panelProps} />)

    expect(screen.getByText('Evidence strength')).toBeInTheDocument()
    expect(screen.getByText('High · 0/100')).toBeInTheDocument()
    expect(screen.getByText('1 confirmation · 2 disputes')).toBeInTheDocument()
    expect(screen.getByText('This evidence score is not a safety assessment.')).toBeInTheDocument()
    const details = screen.getByText('How evidence is scored').closest('details')!
    expect(details).not.toHaveAttribute('open')
    await userEvent.click(within(details).getByText('How evidence is scored'))
    expect(within(details).getByText('Recency')).toBeInTheDocument()
    expect(within(details).getByText('35/40')).toBeInTheDocument()
    expect(within(details).getByText('20/30')).toBeInTheDocument()
    expect(within(details).getByText('27/30')).toBeInTheDocument()
  })

  it('omits evidence entirely when trust and community responses are absent', () => {
    const legacy = { ...report, trust: undefined, verification: undefined } as unknown as RoadReport
    render(<RoadReportDetailPanel report={legacy} {...panelProps} />)

    expect(screen.queryByText('Evidence strength')).not.toBeInTheDocument()
    expect(screen.queryByText('Evidence score unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText('0 confirmations · 0 disputes')).not.toBeInTheDocument()
  })

  it('shows community response counts without a synthetic score when votes exist', () => {
    render(<RoadReportDetailPanel report={{ ...report, trust: undefined, verification: { confirmations: 0, disputes: 2, viewerVerdict: null } } as RoadReport} {...panelProps} />)

    expect(screen.getByText('Community responses')).toBeInTheDocument()
    expect(screen.getByText('0 confirmations · 2 disputes')).toBeInTheDocument()
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument()
    expect(screen.queryByText('This evidence score is not a safety assessment.')).not.toBeInTheDocument()
  })

  it('lets an active viewer add, inspect, and remove a response', async () => {
    const onUpdate = jest.fn()
    const evidence = { verification: { confirmations: 3, disputes: 1, viewerVerdict: 'CONFIRM' as const }, trust: { ...report.trust, score: 90 } }
    verify.mockResolvedValue(evidence)
    retract.mockResolvedValue({ verification: { confirmations: 2, disputes: 1, viewerVerdict: null }, trust: report.trust })
    const view = render(<RoadReportDetailPanel report={report} {...panelProps} onUpdate={onUpdate} />)

    expect(screen.getByText('Is this report still current?')).toBeInTheDocument()
    const stillThere = screen.getByRole('button', { name: 'Still there' })
    const noLongerThere = screen.getByRole('button', { name: 'No longer there' })
    expect(stillThere).toHaveAttribute('aria-pressed', 'false')
    expect(noLongerThere).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(stillThere)
    expect(verify).toHaveBeenCalledWith({ id: 'report-1', verdict: 'CONFIRM' })
    expect(onUpdate).toHaveBeenCalledWith({ ...report, ...evidence })

    view.rerender(<RoadReportDetailPanel report={{ ...report, verification: { ...report.verification, viewerVerdict: 'DISPUTE' } }} {...panelProps} onUpdate={onUpdate} />)
    expect(screen.getByRole('button', { name: 'No longer there' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Your response: No longer there')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove my response' }))
    expect(retract).toHaveBeenCalledWith('report-1')
  })

  it('disables viewer controls and announces pending responses', () => {
    isPending = true
    render(<RoadReportDetailPanel report={report} {...panelProps} />)

    expect(screen.getByRole('button', { name: 'Still there' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'No longer there' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Saving response...')
  })

  it('gives active owners confirmation-based management without voting', async () => {
    resolve.mockResolvedValue({ ...report, isOwner: true, status: 'RESOLVED', resolvedAt: '2026-09-02T11:00:00.000Z' })
    render(<RoadReportDetailPanel report={{ ...report, isOwner: true }} {...panelProps} />)

    expect(screen.getByText('Your report')).toBeInTheDocument()
    expect(screen.getByText('Report management')).toBeInTheDocument()
    expect(screen.queryByText('Is this report still current?')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mark as resolved' }))
    expect(resolve).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog', { name: 'Mark report as resolved?' })
    expect(within(dialog).getByText('This removes the report from the active map. This action cannot be undone.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as resolved' }))
    expect(resolve).toHaveBeenCalledWith('report-1')
  })

  it.each([
    ['RESOLVED', '2026-09-01T09:00:00.000Z', 'Resolved'],
    ['EXPIRED', null, 'Expired'],
  ] as const)('keeps %s reports read-only with lifecycle metadata', (status, resolvedAt, lifecycleLabel) => {
    render(<RoadReportDetailPanel report={{ ...report, status, resolvedAt }} {...panelProps} />)

    expect(screen.getAllByText(status === 'RESOLVED' ? 'Resolved' : 'Expired')).toHaveLength(2)
    const lifecycleValue = status === 'RESOLVED' ? resolvedAt! : report.expiresAt
    const lifecycleTime = screen.getByText(new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lifecycleValue)))
    expect(lifecycleTime).toHaveAttribute('datetime', lifecycleValue)
    expect(lifecycleTime.parentElement).toHaveTextContent(lifecycleLabel)
    expect(screen.queryByText('Is this report still current?')).not.toBeInTheDocument()
    expect(screen.queryByText('Report management')).not.toBeInTheDocument()
  })
})
