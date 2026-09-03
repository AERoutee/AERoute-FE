import { useMutation } from '@tanstack/react-query'
import { useRef } from 'react'
import { compareRoutes } from '@/api'
import type { RouteComparisonOutcome, RouteComparisonTask } from '@/types'

function cancelled(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError' || error instanceof Error && (error.name === 'CanceledError' || 'code' in error && error.code === 'ERR_CANCELED')
}

export function useMutationCreateRouteComparison() {
  const controllerRef = useRef<AbortController | null>(null)
  const mutation = useMutation({
    mutationFn: async (tasks: RouteComparisonTask[]) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const outcomes = await Promise.all(tasks.map(async (task): Promise<RouteComparisonOutcome | null> => {
        try { return { task, status: 'success', comparison: await compareRoutes(task.request, controller.signal) } }
        catch (error) {
          if (controller.signal.aborted || cancelled(error)) return null
          return { task, status: 'error', error: error instanceof Error ? error : new Error('Route comparison failed.') }
        }
      }))
      if (controllerRef.current === controller) controllerRef.current = null
      return controller.signal.aborted ? [] : outcomes.filter((outcome): outcome is RouteComparisonOutcome => outcome !== null)
    },
    retry: false,
  })
  return { ...mutation, abort: () => controllerRef.current?.abort() }
}
