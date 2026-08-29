import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { aerouteLogo } from '@/assets'
import { AccountMenu, MobileAccountActions } from './AccountMenu'

const navLinkClass = ({ isActive }: { isActive: boolean }) => `inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-extrabold no-underline ${isActive ? 'bg-ae-soft text-ae-brand' : 'text-ae-muted hover:bg-ae-soft hover:text-ae-brand'}`

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMenuOpen) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsMenuOpen(false) }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  return <header className="relative z-30 border-b border-ae-line bg-white/95 backdrop-blur-md">
    <div className="mx-auto flex h-[72px] max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
      <Link className="inline-flex min-w-0 items-center gap-2 py-2 text-lg font-black tracking-[-.035em] text-ae-ink no-underline sm:gap-2.5 sm:text-xl" to="/" aria-label="AERoute home"><img className="size-10 shrink-0 sm:size-11" src={aerouteLogo} alt="" aria-hidden="true" /><span>AE<span className="text-ae-brand">Route</span></span></Link>
      <nav className="hidden items-center gap-2 sm:flex" aria-label="Main navigation"><NavLink className={navLinkClass} to="/about">About</NavLink><NavLink className={navLinkClass} to="/vision-mission">Vision & Mission</NavLink><NavLink className={navLinkClass} to="/faq">FAQ</NavLink><NavLink className={navLinkClass} to="/contact">Contact</NavLink><AccountMenu /></nav>
      <div className="sm:hidden"><button className="grid size-11 place-items-center rounded-xl border border-ae-border bg-white text-ae-ink hover:border-ae-brand hover:text-ae-brand" type="button" aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" onClick={() => setIsMenuOpen((open) => !open)}>{isMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}</button></div>
    </div>
    {isMenuOpen && <nav className="absolute inset-x-0 top-full border-b border-ae-line bg-white p-3 shadow-[0_18px_38px_rgba(20,41,34,.12)] sm:hidden" id="mobile-navigation" aria-label="Mobile navigation"><div className="mx-auto grid max-w-[90rem] gap-1"><NavLink onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex min-h-12 items-center rounded-xl px-4 text-sm font-extrabold no-underline ${isActive ? 'bg-ae-soft text-ae-brand' : 'text-ae-ink hover:bg-ae-soft'}`} to="/about">About</NavLink><NavLink onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex min-h-12 items-center rounded-xl px-4 text-sm font-extrabold no-underline ${isActive ? 'bg-ae-soft text-ae-brand' : 'text-ae-ink hover:bg-ae-soft'}`} to="/vision-mission">Vision & Mission</NavLink><NavLink onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex min-h-12 items-center rounded-xl px-4 text-sm font-extrabold no-underline ${isActive ? 'bg-ae-soft text-ae-brand' : 'text-ae-ink hover:bg-ae-soft'}`} to="/faq">FAQ</NavLink><NavLink onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `flex min-h-12 items-center rounded-xl px-4 text-sm font-extrabold no-underline ${isActive ? 'bg-ae-soft text-ae-brand' : 'text-ae-ink hover:bg-ae-soft'}`} to="/contact">Contact</NavLink><MobileAccountActions onNavigate={() => setIsMenuOpen(false)} /></div></nav>}
  </header>
}
