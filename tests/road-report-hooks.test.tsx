import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { getMyRoadReports, resolveRoadReport, retractRoadReportVerification, verifyRoadReport } from '@/api'
import { roadReportKeys, useMyRoadReports, useResolveRoadReport, useRetractRoadReportVerification, useVerifyRoadReport } from '@/hooks/road-report'

jest.mock('@/api', () => ({ getMyRoadReports: jest.fn(), resolveRoadReport: jest.fn(), retractRoadReportVerification: jest.fn(), verifyRoadReport: jest.fn() }))

const mine = getMyRoadReports as jest.Mock
const resolve = resolveRoadReport as jest.Mock
const retract = retractRoadReportVerification as jest.Mock
const verify = verifyRoadReport as jest.Mock

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(hook, { wrapper }), invalidate }
}

beforeEach(() => jest.clearAllMocks())

describe('road report hooks', () => {
  it('loads owned reports', async () => {
    mine.mockResolvedValue([{ id: 'report' }])
    const { result } = setup(() => useMyRoadReports())
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'report' }]))
  })

  it('runs verify, retract, and resolve mutations with list invalidation', async () => {
    verify.mockResolvedValue({})
    retract.mockResolvedValue({})
    resolve.mockResolvedValue({})
    const verification = setup(() => useVerifyRoadReport())
    const retraction = setup(() => useRetractRoadReportVerification())
    const resolution = setup(() => useResolveRoadReport())
    await verification.result.current.mutateAsync({ id: 'report', verdict: 'DISPUTE' })
    await retraction.result.current.mutateAsync('report')
    await resolution.result.current.mutateAsync('report')
    expect(verify).toHaveBeenCalledWith('report', 'DISPUTE')
    expect(retract.mock.calls[0][0]).toBe('report')
    expect(resolve.mock.calls[0][0]).toBe('report')
    for (const item of [verification, retraction, resolution]) expect(item.invalidate).toHaveBeenCalledWith({ queryKey: roadReportKeys.all })
  })
})
