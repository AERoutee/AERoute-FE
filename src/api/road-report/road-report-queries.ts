import { apiBaseURL, apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiResponse, RoadReport, RoadReportBounds, RoadReportCategory, RoadReportEvidence, RoadReportVerdict } from '@/types'

const ROAD_REPORT_IMAGE_PATH = /^\/api\/v1\/road-report-images\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function resolveRoadReportImageUrl(source: string) {
  try {
    const base = new URL(apiBaseURL)
    const url = new URL(source, base)
    const isRelative = source.startsWith('/') && !source.startsWith('//')
    const isAbsoluteHttps = /^https:\/\//i.test(source)
    if (!ROAD_REPORT_IMAGE_PATH.test(url.pathname) || url.search || url.hash || url.username || url.password) return null
    if (isRelative) return url.href
    return isAbsoluteHttps && url.protocol === 'https:' && url.origin === base.origin ? url.href : null
  } catch {
    return null
  }
}

type LegacyRoadReport = Omit<RoadReport, 'trust'> & {
  trust: Omit<RoadReport['trust'], 'factors'> & {
    factors: Omit<RoadReport['trust']['factors'], 'voteBalance'> & { confirmationBalance: number }
  }
}

type RoadReportInput = RoadReport | LegacyRoadReport

export function normalizeRoadReport(report: RoadReportInput): RoadReport {
  const images = report.images.flatMap((image) => resolveRoadReportImageUrl(image) ?? [])
  if (!report.trust?.factors || 'voteBalance' in report.trust.factors) return { ...report, images } as RoadReport
  const { confirmationBalance, ...factors } = report.trust.factors
  return { ...report, images, trust: { ...report.trust, factors: { ...factors, voteBalance: confirmationBalance } } }
}

export async function getNearbyRoadReports(bounds: RoadReportBounds, signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<RoadReportInput[]>>(API_ENDPOINTS.roadReports, { params: bounds, signal })
  return response.data.data.map(normalizeRoadReport)
}

export async function getMyRoadReports(signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<RoadReportInput[]>>(API_ENDPOINTS.roadReportsMine, { signal })
  return response.data.data.map(normalizeRoadReport)
}

export async function createRoadReport(input: { category: RoadReportCategory; description: string; latitude: number; longitude: number; images: File[] }) {
  const body = new FormData()
  body.append('category', input.category)
  body.append('description', input.description)
  body.append('latitude', String(input.latitude))
  body.append('longitude', String(input.longitude))
  input.images.forEach((image) => body.append('images', image))
  const response = await apiClient.post<ApiResponse<RoadReportInput>>(API_ENDPOINTS.roadReports, body)
  return normalizeRoadReport(response.data.data)
}

export async function verifyRoadReport(id: string, verdict: RoadReportVerdict) {
  const response = await apiClient.put<ApiResponse<RoadReportEvidence>>(API_ENDPOINTS.roadReportVerification(id), { verdict })
  return response.data.data
}

export async function retractRoadReportVerification(id: string) {
  const response = await apiClient.delete<ApiResponse<RoadReportEvidence>>(API_ENDPOINTS.roadReportVerification(id))
  return response.data.data
}

export async function resolveRoadReport(id: string) {
  const response = await apiClient.patch<ApiResponse<RoadReportInput>>(API_ENDPOINTS.roadReport(id), { status: 'RESOLVED' })
  return normalizeRoadReport(response.data.data)
}
