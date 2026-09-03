import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyRoadReports, resolveRoadReport, retractRoadReportVerification, verifyRoadReport } from '@/api'
import type { RoadReportVerdict } from '@/types'

export const roadReportKeys = { all: ['road-reports'] as const, mine: ['road-reports', 'mine'] as const }

export function useMyRoadReports() {
  return useQuery({ queryKey: roadReportKeys.mine, queryFn: ({ signal }) => getMyRoadReports(signal) })
}

function useReportMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: roadReportKeys.all }), retry: false })
}

export function useVerifyRoadReport() {
  return useReportMutation(({ id, verdict }: { id: string; verdict: RoadReportVerdict }) => verifyRoadReport(id, verdict))
}

export function useRetractRoadReportVerification() {
  return useReportMutation(retractRoadReportVerification)
}

export function useResolveRoadReport() {
  return useReportMutation(resolveRoadReport)
}
