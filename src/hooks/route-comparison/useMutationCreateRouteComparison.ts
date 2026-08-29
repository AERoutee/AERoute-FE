import { useMutation } from '@tanstack/react-query'
import { compareRoutes } from '@/api'
import type { PlannerRequest } from '@/types'

export function useMutationCreateRouteComparison() {
  return useMutation({
    mutationFn: (request: PlannerRequest) => compareRoutes(request),
    retry: false,
  })
}
