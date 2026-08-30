import { API_ENDPOINTS } from '@/constants'

describe('API endpoint constants', () => {
  it('defines the backend paths used by first-party wrappers', () => {
    expect(API_ENDPOINTS).toEqual({
      routeComparisons: '/api/v1/route-comparisons',
      profileAvatar: '/api/v1/profile/avatar',
      recoveryChallenges: '/api/v1/recovery-challenges',
      roadReports: '/api/v1/road-reports',
    })
  })
})
