import { Navigate } from 'react-router'
import { LoadingIndicator } from '@/components/common'
import { authClient } from '@/config'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession()
  if (session.isPending) return <LoadingIndicator />
  return session.data?.user ? children : <Navigate to="/login" replace />
}
