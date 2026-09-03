export type RoadReportCategory = 'HAZARD' | 'BLOCKED_PATH' | 'CRASH' | 'CONSTRUCTION' | 'MAP_ISSUE'
export type RoadReportVerdict = 'CONFIRM' | 'DISPUTE'
export type RoadReportEvidence = {
  verification: { confirmations: number; disputes: number; viewerVerdict: RoadReportVerdict | null }
  trust: { level: 'LOW' | 'MEDIUM' | 'HIGH'; score: number; kind: 'EVIDENCE_SCORE'; factors: { recency: number; photos: number; voteBalance: number } }
}

export type RoadReport = RoadReportEvidence & {
  id: string
  category: RoadReportCategory
  description: string
  latitude: number
  longitude: number
  createdAt: string
  expiresAt: string
  resolvedAt: string | null
  status: 'ACTIVE' | 'RESOLVED' | 'EXPIRED'
  images: string[]
  reporter: string
  isOwner: boolean
}

export type RoadReportBounds = { north: number; south: number; east: number; west: number }
