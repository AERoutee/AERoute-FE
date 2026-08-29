import { useMutation } from '@tanstack/react-query'
import { uploadProfileAvatar } from '@/api/profile'

export function useMutationUploadProfileAvatar() {
  return useMutation({ mutationFn: uploadProfileAvatar, retry: false })
}
