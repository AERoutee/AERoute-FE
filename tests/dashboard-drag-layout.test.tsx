import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { RoadReportDetailPanel } from '@/pages/dashboard/components/RoadReportDetailPanel'
import { RoadReportSheet } from '@/pages/dashboard/components/RoadReportSheet'
import type { RoadReport } from '@/types'

jest.mock('@/api', () => ({ createRoadReport: jest.fn() }))
jest.mock('@/config', () => ({ apiBaseURL: 'https://api.example.test', apiClient: {} }))
jest.mock('@/context', () => ({ useToast: () => ({ showToast: jest.fn() }) }))
jest.mock('@/hooks', () => ({
  useVerifyRoadReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRetractRoadReportVerification: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useResolveRoadReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

const handler = jest.fn()
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() })
const report: RoadReport = {
  id: 'report-1', category: 'BLOCKED_PATH', description: 'Path blocked by fallen branches', latitude: 1, longitude: 2,
  createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1000).toISOString(), resolvedAt: null, status: 'ACTIVE', images: [], reporter: 'Rider', isOwner: false,
  verification: { confirmations: 1, disputes: 0, viewerVerdict: null },
  trust: { level: 'HIGH', score: 82, kind: 'EVIDENCE_SCORE', factors: { recency: 35, photos: 20, voteBalance: 27 } },
}

const props = {
  location: { latitude: 1, longitude: 2, accuracy: 10 },
  onClose: handler,
  onCreated: handler,
  onLayoutChange: handler,
  onDesktopDragStart: handler,
  onDesktopDragMove: handler,
  onDesktopDragEnd: handler,
  onDesktopDragKeyDown: handler,
  mobileHandle: { height: 55, onClick: handler, onPointerDown: handler, onPointerMove: handler, onPointerUp: handler, onKeyDown: handler },
}

describe('dashboard drag layout', () => {
  it('keeps the report mobile handle tall and desktop title drag target wide', () => {
    render(<RoadReportSheet {...props} />)
    expect(screen.getByRole('button', { name: 'Ubah ukuran panel laporan' })).toHaveClass('min-h-11')
    const drag = screen.getByRole('button', { name: 'Geser panel laporan' })
    expect(drag).toHaveClass('flex-1')
    expect(drag).not.toHaveClass('hover:bg-ae-soft', 'rounded-sm', 'rounded-lg')
    expect(drag).toHaveTextContent('Apa yang terjadi?')
  })

  it('keeps anchored report details free of drag and resize controls', () => {
    render(<RoadReportDetailPanel variant="anchored" report={report} onClose={handler} onUpdate={handler} />)
    expect(screen.queryByRole('button', { name: 'Ubah ukuran panel detail laporan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Geser panel detail laporan' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Detail laporan Jalur terhalang' })).toHaveClass('overflow-auto')
  })

  it('keeps only report creation draggable and renders details through the map popup', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/DashboardPage.tsx'), 'utf8')
    expect(source).toMatch(/id="report-panel"[^>]+data-draggable-panel/)
    expect(source).not.toContain('id="report-detail-panel"')
    expect(source).not.toContain('const reportDetailDrag = useDraggablePanel')
    expect(source).toContain('reportPopup={(report, onClose) => <RoadReportDetailPanel variant="anchored"')
    expect(source).toContain('mobileHandle={{ height: mobileSheet.height')
    expect(source).toMatch(/aria-label="Ubah ukuran panel rute"/)
    expect(source).toContain('min-h-11 w-full shrink-0 touch-none')
  })
})
