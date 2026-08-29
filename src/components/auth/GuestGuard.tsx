import { Navigate } from 'react-router'
import { authClient } from '@/config/auth-client'
import { LoadingIndicator } from '@/components/common'

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession()
  if (session.isPending) return <LoadingIndicator />
  return session.data?.user ? <Navigate to="/dashboard" replace /> : children
}
