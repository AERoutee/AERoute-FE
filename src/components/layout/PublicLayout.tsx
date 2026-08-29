import { Header } from './Header'
import { SkipLink } from './SkipLink'

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return <><SkipLink /><Header />{children}</>
}
