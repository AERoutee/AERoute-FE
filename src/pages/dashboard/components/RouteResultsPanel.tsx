import { GripHorizontal, ListTree, RefreshCw, Sparkles, Wind, X } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RouteOption } from '@/types'

function routeTitle(route: RouteOption) {
  if (route.labels.includes('RECOMMENDED')) return 'Recommended'
  if (route.labels.includes('LOWEST_EXPOSURE')) return 'Lowest exposure'
  return 'Fastest'
}

function routeColor(route: RouteOption) {
  if (route.labels.includes('RECOMMENDED')) return '#087f5b'
  if (route.labels.includes('LOWEST_EXPOSURE')) return '#2457a7'
  return '#a83b24'
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.round(minutes % 1440 / 60)}h`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes} min`
}



type RouteResultsPanelProps = {
  routes: RouteOption[]
  selected?: RouteOption
  isPending: boolean
  error?: (Error & { retryable?: boolean }) | null
  onSelect: (id: string) => void
  onRetry: () => void
  canStartNavigation: boolean
  onStartNavigation: () => void
  onClose: () => void
  onDesktopDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}

export function RouteResultsPanel({ routes, selected, isPending, error, onSelect, onRetry, canStartNavigation, onStartNavigation, onClose, onDesktopDragStart, onDesktopDragMove, onDesktopDragEnd, onDesktopDragKeyDown }: RouteResultsPanelProps) {
  return <div className="flex h-full min-h-0 flex-col"><div className="flex h-14 shrink-0 items-center justify-between border-b border-ae-line px-5"><div className="flex flex-1 items-center gap-3 lg:hidden"><strong className="text-base font-black">Route options</strong></div><button className="hidden min-h-11 flex-1 touch-none cursor-move items-center gap-3 text-left lg:flex" type="button" aria-label="Drag route options panel" onPointerDown={onDesktopDragStart} onPointerMove={onDesktopDragMove} onPointerUp={onDesktopDragEnd} onPointerCancel={onDesktopDragEnd} onKeyDown={onDesktopDragKeyDown}><GripHorizontal className="size-5 text-ae-muted" aria-hidden="true" /><strong className="text-base font-black">Route options</strong></button><button className="grid size-10 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close route options" onClick={onClose}><X className="size-5" aria-hidden="true" /></button></div><div className="h-0 flex-1 touch-pan-y overflow-y-scroll overscroll-y-contain p-5 [scrollbar-width:thin] [scrollbar-color:#b7c8c0_transparent] [-webkit-overflow-scrolling:touch] lg:h-auto">
    {routes.length === 0 && !isPending && !error && <div className="grid place-items-center px-4 py-12 text-center text-ae-muted"><ListTree className="size-9 opacity-70" aria-hidden="true" /><strong className="mt-4 text-base font-black">No routes yet</strong><p className="mt-2 mb-0 max-w-56 text-sm leading-6 font-semibold">Compare two locations to see route options here.</p></div>}
    {isPending && <div className="grid gap-3" role="status"><span className="sr-only">Comparing routes.</span>{[1, 2, 3].map((item) => <div className="h-24 animate-pulse rounded-2xl bg-ae-canvas" key={item} />)}</div>}
    {error && <div className="rounded-2xl border border-[#d99a8b] bg-[#fff1ed] p-5" role="alert"><strong className="block text-sm font-black text-ae-fastest">Comparison failed</strong><p className="mt-2 mb-4 text-sm font-semibold text-ae-muted">{error.message}</p>{error.retryable !== false && <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ae-ink px-4 text-sm font-black text-white hover:bg-ae-brand" type="button" onClick={onRetry}><RefreshCw className="size-4" aria-hidden="true" />Try again</button>}</div>}
    {routes.length > 0 && <div className="grid gap-3" role="list" aria-label="Route options">{routes.map((route) => <button className={`flex w-full gap-3 rounded-2xl border bg-white p-4 text-left ${selected?.id === route.id ? 'border-ae-brand ring-2 ring-ae-brand/15' : 'border-ae-line hover:border-ae-brand'}`} type="button" role="listitem" aria-pressed={selected?.id === route.id} onClick={() => onSelect(route.id)} key={route.id}><span className="mt-1 h-14 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: routeColor(route) }} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><strong className="font-black">{routeTitle(route)}</strong>{route.labels.includes('RECOMMENDED') && <span className="inline-flex items-center gap-1 rounded-full bg-ae-brand px-2 py-1 text-[10px] font-black text-white"><Sparkles className="size-3" aria-hidden="true" />PM2.5/time trade-off</span>}</span><span className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="text-xl font-black">{formatDuration(route.durationSeconds)}</strong><span className="text-xs font-bold text-ae-muted">{(route.distanceMeters / 1000).toFixed(1)} km</span><span className="text-xs font-bold text-ae-muted">PM2.5 {route.averagePm25.toFixed(1)} µg/m³</span></span>{route.reductionFromFastestPercent > 0 && <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-ae-brand"><Wind className="size-4" aria-hidden="true" />{route.reductionFromFastestPercent}% lower</span>}</span></button>)}</div>}
    {selected && canStartNavigation && <button className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-ae-ink px-5 font-black text-white hover:bg-ae-brand" type="button" onClick={onStartNavigation}>Start navigation</button>}
  </div></div>
}
