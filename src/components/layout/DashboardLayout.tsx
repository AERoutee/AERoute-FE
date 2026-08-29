import { Link } from 'react-router'
import { aerouteLogo } from '@/assets'
import { authClient } from '@/config'
import { AccountMenu } from './AccountMenu'
import { SkipLink } from './SkipLink'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession()
  const user = session.data?.user

  return <div className="relative h-dvh overflow-hidden bg-white">
    <SkipLink />
    <header className="pointer-events-none absolute inset-x-3 top-[max(.75rem,env(safe-area-inset-top))] z-40 sm:inset-x-5">
      <div className="pointer-events-auto relative mx-auto flex h-16 max-w-[90rem] items-center justify-between rounded-t-xl rounded-b-none border border-white/80 bg-white/95 lg:rounded-xl px-3 shadow-[0_14px_40px_rgba(20,41,34,.15)] backdrop-blur-xl sm:px-4">
        <Link className="inline-flex items-center gap-2 text-lg font-black tracking-[-.035em] text-ae-ink no-underline" to="/" aria-label="AERoute home"><img className="size-10" src={aerouteLogo} alt="" aria-hidden="true" /><span>AE<span className="text-ae-brand">Route</span></span></Link>
        <div className="flex min-w-0 items-center gap-3"><div className="hidden min-w-0 text-right sm:block"><strong className="block max-w-52 truncate text-sm font-black text-ae-ink">{user?.name}</strong><span className="block max-w-52 truncate text-xs font-semibold text-ae-muted">{user?.email}</span></div><AccountMenu /></div>
      </div>
    </header>
    {children}
  </div>
}
