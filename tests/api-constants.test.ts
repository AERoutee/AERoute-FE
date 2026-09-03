import { API_ENDPOINTS } from '@/constants'

describe('API endpoint constants', () => {
  it('defines the backend paths used by first-party wrappers', () => {
    expect(API_ENDPOINTS).toMatchObject({
      routeComparisons: '/api/v1/route-comparisons',
      profileAvatar: '/api/v1/profile/avatar',
      recoveryChallenges: '/api/v1/recovery-challenges',
      roadReports: '/api/v1/road-reports',
      roadReportsMine: '/api/v1/road-reports/mine',
      savedCommutes: '/api/v1/saved-commutes',
      tripImpacts: '/api/v1/trip-impacts',
      tripImpactSummary: '/api/v1/trip-impacts/summary',
    })
    expect(API_ENDPOINTS.roadReportVerification('report')).toBe('/api/v1/road-reports/report/verification')
    expect(API_ENDPOINTS.roadReport('report')).toBe('/api/v1/road-reports/report')
    expect(API_ENDPOINTS.savedCommute('commute')).toBe('/api/v1/saved-commutes/commute')
  })
})
