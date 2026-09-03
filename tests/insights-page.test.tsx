import { render, screen } from '@testing-library/react'
import { InsightsPage } from '@/pages/insights/InsightsPage'

jest.mock('react-router', () => ({ useNavigate: () => jest.fn() }))
jest.mock('@/context', () => ({ useToast: () => ({ showToast: jest.fn() }) }))
jest.mock('@/hooks', () => ({
  useTripImpactSummary: () => ({ data: { completedTrips: 3, activeTravelDistanceMeters: 5200, activeTravelDurationSeconds: 3600, modeledExposureIndexReduction: 12.5, fewerConfirmedReportSignals: 2, disclaimer: 'Modeled estimates only.' } }),
}))

describe('InsightsPage', () => {
  it('renders only the truthful modeled impact summary', () => {
    render(<InsightsPage />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Modeled estimates only.')).toBeInTheDocument()
    expect(screen.getByText('Recorded trips')).toBeInTheDocument()
    expect(screen.getByText(/planned route and model estimates, not a gps trace/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Saved commutes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compare again' })).not.toBeInTheDocument()
    expect(screen.queryByText(/saved commute/i)).not.toBeInTheDocument()
  })
})
