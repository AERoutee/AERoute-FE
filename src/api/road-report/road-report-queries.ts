import { apiBaseURL, apiClient } from '@/config'
import { API_ENDPOINTS } from '@/constants'
import type { ApiResponse, RoadReport, RoadReportBounds, RoadReportCategory } from '@/types'

function withImageUrls(report: RoadReport): RoadReport {
  return { ...report, images: report.images.map((image) => image.startsWith('http') ? image : `${apiBaseURL}${image}`) }
}

export async function getNearbyRoadReports(bounds: RoadReportBounds, signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<RoadReport[]>>(API_ENDPOINTS.roadReports, { params: bounds, signal })
  return response.data.data.map(withImageUrls)
}

export async function createRoadReport(input: { category: RoadReportCategory; description: string; latitude: number; longitude: number; images: File[] }) {
  const body = new FormData()
  body.append('category', input.category)
  body.append('description', input.description)
  body.append('latitude', String(input.latitude))
  body.append('longitude', String(input.longitude))
  input.images.forEach((image) => body.append('images', image))
  const response = await apiClient.post<ApiResponse<RoadReport>>(API_ENDPOINTS.roadReports, body)
  return withImageUrls(response.data.data)
}
