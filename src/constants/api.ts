export const API_ENDPOINTS = {
  routeComparisons: '/api/v1/route-comparisons',
  transitStopDetails: '/api/v1/transit-stop-details',
  profileAvatar: '/api/v1/profile/avatar',
  recoveryChallenges: '/api/v1/recovery-challenges',
  roadReports: '/api/v1/road-reports',
  roadReportsMine: '/api/v1/road-reports/mine',
  roadReportVerification: (id: string) => `/api/v1/road-reports/${id}/verification`,
  roadReport: (id: string) => `/api/v1/road-reports/${id}`,
  savedCommutes: '/api/v1/saved-commutes',
  savedCommute: (id: string) => `/api/v1/saved-commutes/${id}`,
  tripImpacts: '/api/v1/trip-impacts',
  tripImpactSummary: '/api/v1/trip-impacts/summary',
} as const
