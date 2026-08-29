export type RoadReportCategory = 'HAZARD' | 'BLOCKED_PATH' | 'CRASH' | 'CONSTRUCTION' | 'MAP_ISSUE'

export type RoadReport = {
  id: string
  category: RoadReportCategory
  description: string
  latitude: number
  longitude: number
  createdAt: string
  expiresAt: string
  images: string[]
  reporter: string
}

export type RoadReportBounds = { north: number; south: number; east: number; west: number }
