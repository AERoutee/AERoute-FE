import { useMutation } from '@tanstack/react-query'
import { removeProfileAvatar } from '@/api/profile'

export function useMutationRemoveProfileAvatar() {
  return useMutation({ mutationFn: removeProfileAvatar, retry: false })
}
