import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSavedCommute, deleteSavedCommute, getSavedCommutes, getTripImpactSummary, recordTripImpact, updateSavedCommute } from '@/api'
import type { SavedCommuteInput } from '@/types'

export const insightsKeys = { commutes: ['insights', 'saved-commutes'] as const, summary: ['insights', 'trip-impact-summary'] as const }

export function useSavedCommutes() {
  return useQuery({ queryKey: insightsKeys.commutes, queryFn: ({ signal }) => getSavedCommutes(signal) })
}

export function useTripImpactSummary() {
  return useQuery({ queryKey: insightsKeys.summary, queryFn: ({ signal }) => getTripImpactSummary(signal) })
}

function useCommuteInvalidation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: insightsKeys.commutes }) })
}

export function useCreateSavedCommute() {
  return useCommuteInvalidation(createSavedCommute)
}

export function useUpdateSavedCommute() {
  return useCommuteInvalidation(({ id, input }: { id: string; input: Partial<SavedCommuteInput> }) => updateSavedCommute(id, input))
}

export function useDeleteSavedCommute() {
  return useCommuteInvalidation(deleteSavedCommute)
}

export function useRecordTripImpact() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: recordTripImpact, onSuccess: () => queryClient.invalidateQueries({ queryKey: insightsKeys.summary }), retry: false })
}
