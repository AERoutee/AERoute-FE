import { BarChart3, LayoutDashboard, LogIn, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { resolveProfileAvatarUrl } from '@/api/profile'
import { ConfirmationDialog } from '@/components/common'
import { authClient } from '@/config'
import { useToast } from '@/context'
import { clearRouteSummary } from '@/lib/route-summary'

function UserAvatar({ image, initials }: { image?: string | null; initials: string }) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const source = resolveProfileAvatarUrl(image)
  if (source && failedImage !== source) return <img className="size-9 rounded-full object-cover" src={source} alt="" referrerPolicy="no-referrer" onError={() => setFailedImage(source)} />
  return <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,#087f5b,#12a66f)] text-xs font-black text-white" aria-hidden="true">{initials}</span>
}

export function MobileAccountActions({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate()
  const session = authClient.useSession()
  const { showToast } = useToast()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const user = session.data?.user
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      const result = await authClient.signOut()
      if (result.error) { showToast('Gagal keluar. Silakan coba lagi.', 'error'); return }
      clearRouteSummary()
      setIsLogoutDialogOpen(false)
      onNavigate()
      showToast('Anda telah keluar.', 'success')
      navigate('/')
    } catch {
      showToast('Gagal keluar. Silakan coba lagi.', 'error')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (session.isPending) return <div className="h-20 animate-pulse rounded-xl bg-ae-soft" aria-label="Memuat akun" />
  if (!user) return <Link className="flex min-h-12 items-center gap-3 rounded-xl bg-ae-ink px-4 text-sm font-extrabold text-white no-underline" to="/login" onClick={onNavigate}><LogIn className="size-4" aria-hidden="true" />Masuk</Link>

  return <div className="border-t border-ae-line pt-3"><div className="flex items-center gap-3 px-4 pb-3"><UserAvatar image={user.image} initials={initials} /><div className="min-w-0"><strong className="block truncate text-sm font-black">{user.name}</strong><span className="mt-1 block truncate text-xs font-semibold text-ae-muted">{user.email}</span></div></div><Link className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-extrabold text-ae-ink no-underline hover:bg-ae-soft hover:text-ae-brand" to="/profile" onClick={onNavigate}><UserRound className="size-4" aria-hidden="true" />Profil</Link><Link className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-extrabold text-ae-ink no-underline hover:bg-ae-soft hover:text-ae-brand" to="/dashboard" onClick={onNavigate}><LayoutDashboard className="size-4" aria-hidden="true" />Dasbor</Link><Link className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-extrabold text-ae-ink no-underline hover:bg-ae-soft hover:text-ae-brand" to="/insights" onClick={onNavigate}><BarChart3 className="size-4" aria-hidden="true" />Insights</Link><button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-extrabold text-ae-fastest hover:bg-[#fff1ed]" type="button" onClick={() => setIsLogoutDialogOpen(true)}><LogOut className="size-4" aria-hidden="true" />Keluar</button><ConfirmationDialog isOpen={isLogoutDialogOpen} title="Keluar?" description="Anda perlu masuk kembali untuk mengakses dasbor." confirmLabel="Keluar" isPending={isSigningOut} onCancel={() => setIsLogoutDialogOpen(false)} onConfirm={() => void handleSignOut()} /></div>
}

export function AccountMenu() {
  const navigate = useNavigate()
  const session = authClient.useSession()
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const user = session.data?.user
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false) }
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('pointerdown', handlePointerDown); document.removeEventListener('keydown', handleKeyDown) }
  }, [isOpen])

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      const result = await authClient.signOut()
      if (result.error) { showToast('Gagal keluar. Silakan coba lagi.', 'error'); return }
      clearRouteSummary()
      setIsOpen(false)
      setIsLogoutDialogOpen(false)
      showToast('Anda telah keluar.', 'success')
      navigate('/')
    } catch {
      showToast('Gagal keluar. Silakan coba lagi.', 'error')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (session.isPending) return <span className="size-11 animate-pulse rounded-full bg-ae-soft" aria-label="Memuat..." />
  if (!user) return <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ae-border px-4 text-sm font-extrabold text-ae-ink no-underline hover:border-ae-brand hover:text-ae-brand" to="/login"><LogIn className="size-4" aria-hidden="true" />Masuk</Link>

  return <div className="relative" ref={menuRef}>
    <button className="grid size-11 place-items-center rounded-full border-2 border-white bg-ae-soft shadow-[0_0_0_1px_#d5e0da,0_4px_12px_rgba(20,41,34,.12)] transition hover:scale-[1.03] hover:shadow-[0_0_0_2px_#087f5b,0_5px_14px_rgba(20,41,34,.14)]" type="button" aria-label="Buka menu akun" aria-expanded={isOpen} aria-haspopup="menu" onClick={() => setIsOpen((open) => !open)}><UserAvatar image={user.image} initials={initials} /></button>
    {isOpen && <div className="absolute top-[calc(100%+.7rem)] right-0 z-50 w-64 rounded-2xl border border-ae-line bg-white p-2 shadow-[0_18px_45px_rgba(20,41,34,.14)]" role="menu"><div className="border-b border-ae-line px-3 py-3"><strong className="block truncate text-sm font-black">{user.name}</strong><span className="mt-1 block truncate text-xs font-semibold text-ae-muted">{user.email}</span></div><Link className="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-extrabold text-ae-ink no-underline hover:bg-ae-soft hover:text-ae-brand" to="/profile" role="menuitem" onClick={() => setIsOpen(false)}><UserRound className="size-4" aria-hidden="true" />Profil</Link><Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-extrabold text-ae-ink no-underline hover:bg-ae-soft hover:text-ae-brand" to="/dashboard" role="menuitem" onClick={() => setIsOpen(false)}><LayoutDashboard className="size-4" aria-hidden="true" />Dasbor</Link><Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-extrabold text-ae-ink no-underline hover:bg-ae-soft hover:text-ae-brand" to="/insights" role="menuitem" onClick={() => setIsOpen(false)}><BarChart3 className="size-4" aria-hidden="true" />Insights</Link><button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-extrabold text-ae-fastest hover:bg-[#fff1ed]" type="button" role="menuitem" onClick={() => { setIsOpen(false); setIsLogoutDialogOpen(true) }}><LogOut className="size-4" aria-hidden="true" />Keluar</button></div>}
    <ConfirmationDialog isOpen={isLogoutDialogOpen} title="Keluar?" description="Anda perlu masuk kembali untuk mengakses dasbor." confirmLabel="Keluar" isPending={isSigningOut} onCancel={() => setIsLogoutDialogOpen(false)} onConfirm={() => void handleSignOut()} />
  </div>
}
