import { ArrowRight, ArrowUpDown, GripHorizontal, LocateFixed, X } from 'lucide-react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { colorBalancedPriorityIcon, colorCyclingIcon, colorLowerExposureIcon, colorWalkingIcon } from '@/assets'
import { LocationInput } from '@/components/planner'
import type { Place, RoutePreference, TravelMode } from '@/types'

type PlannerPanelProps = {
  origin: Place | null
  destination: Place | null
  mode: TravelMode
  preference: RoutePreference
  sensitiveUser: boolean
  errors: { origin?: string; destination?: string }
  isLocating: boolean
  isPending: boolean
  onOriginChange: (place: Place | null) => void
  onDestinationChange: (place: Place | null) => void
  onModeChange: (mode: TravelMode) => void
  onPreferenceChange: (preference: RoutePreference) => void
  onSensitiveUserChange: (enabled: boolean) => void
  onCurrentLocation: () => void
  onSwap: () => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
  onDesktopDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  mobileHandle: {
    height: number
    onClick: () => void
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>, onDismiss?: () => void) => void
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  }
}

export function PlannerPanel(props: PlannerPanelProps) {
  return <>
    <div className="shrink-0 lg:hidden"><button className="flex w-full touch-none select-none cursor-grab justify-center pt-3 pb-2 active:cursor-grabbing" type="button" aria-label="Resize planner panel" aria-valuetext={`${Math.round(props.mobileHandle.height)} percent height`} onClick={props.mobileHandle.onClick} onPointerDown={props.mobileHandle.onPointerDown} onPointerMove={props.mobileHandle.onPointerMove} onPointerUp={(event) => props.mobileHandle.onPointerUp(event, props.onClose)} onPointerCancel={(event) => props.mobileHandle.onPointerUp(event, props.onClose)} onKeyDown={props.mobileHandle.onKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" aria-hidden="true" /></button><div className="flex h-14 items-center justify-between gap-4 border-b border-ae-line px-5"><h2 className="m-0 truncate whitespace-nowrap text-base font-black">Where are you going?</h2><button className="grid size-11 shrink-0 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft hover:text-ae-brand" type="button" aria-label="Close planner" onClick={props.onClose}><X className="size-5" aria-hidden="true" /></button></div></div>
    <div className="hidden h-14 shrink-0 items-center justify-between border-b border-ae-line px-5 lg:flex"><button className="flex min-h-11 flex-1 touch-none cursor-move items-center gap-3 text-left" type="button" aria-label="Drag planner panel" onPointerDown={props.onDesktopDragStart} onPointerMove={props.onDesktopDragMove} onPointerUp={props.onDesktopDragEnd} onPointerCancel={props.onDesktopDragEnd} onKeyDown={props.onDesktopDragKeyDown}><GripHorizontal className="size-5 text-ae-muted" aria-hidden="true" /><strong className="truncate whitespace-nowrap text-base font-black">Where are you going?</strong></button><button className="grid size-10 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close planner panel" onClick={props.onClose}><X className="size-5" aria-hidden="true" /></button></div>
    <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:thin] [scrollbar-color:#b7c8c0_transparent] [-webkit-overflow-scrolling:touch] sm:px-6 lg:h-auto lg:px-7 lg:pt-5 lg:pb-6 [@media(min-width:1024px)_and_(max-height:900px)]:px-5 [@media(min-width:1024px)_and_(max-height:900px)]:pt-3 [@media(min-width:1024px)_and_(max-height:900px)]:pb-4">
      <form id="route-planner-form" className="grid gap-4 [@media(min-width:1024px)_and_(max-height:900px)]:gap-3 [@media(min-width:1024px)_and_(max-height:760px)]:gap-2" onSubmit={props.onSubmit} noValidate>
        <LocationInput id="dashboard-origin" label="From" value={props.origin} onChange={props.onOriginChange} error={props.errors.origin} />
        <div className="flex items-center justify-between gap-2"><button className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-sm font-extrabold text-ae-brand hover:bg-ae-soft [@media(min-width:1024px)_and_(max-height:760px)]:text-xs" type="button" disabled={props.isLocating} onClick={props.onCurrentLocation}><LocateFixed className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{props.isLocating ? 'Finding location...' : 'Use current location'}</span></button><button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-extrabold text-ae-muted hover:bg-ae-soft hover:text-ae-brand" type="button" onClick={props.onSwap}><ArrowUpDown className="size-4" aria-hidden="true" />Swap</button></div>
        <LocationInput id="dashboard-destination" label="To" value={props.destination} onChange={props.onDestinationChange} error={props.errors.destination} />
        <fieldset className="border-0 p-0"><legend className="mb-2 text-sm font-extrabold [@media(min-width:1024px)_and_(max-height:900px)]:mb-1 [@media(min-width:1024px)_and_(max-height:760px)]:text-xs">Travel mode</legend><div className="grid grid-cols-2 gap-2">{[{ value: 'WALK' as const, label: 'Walk', icon: colorWalkingIcon }, { value: 'BICYCLE' as const, label: 'Cycle', icon: colorCyclingIcon }].map(({ value, label, icon }) => <button className={`flex min-h-12 [@media(min-width:1024px)_and_(max-height:900px)]:min-h-11 [@media(min-width:1024px)_and_(max-height:760px)]:text-sm items-center justify-center gap-2 rounded-lg border font-black ${props.mode === value ? 'border-ae-brand bg-ae-soft text-ae-brand' : 'border-ae-line bg-white hover:border-ae-brand'}`} type="button" aria-pressed={props.mode === value} onClick={() => props.onModeChange(value)} key={value}><img className="size-7 object-contain" src={icon} alt="" aria-hidden="true" />{label}</button>)}</div></fieldset>
        <fieldset className="border-0 p-0"><legend className="mb-2 text-sm font-extrabold [@media(min-width:1024px)_and_(max-height:900px)]:mb-1 [@media(min-width:1024px)_and_(max-height:760px)]:text-xs">Route priority</legend><div className="grid grid-cols-2 gap-2">{[{ value: 'balanced' as const, label: 'Balanced', icon: colorBalancedPriorityIcon }, { value: 'lower-exposure' as const, label: 'Lower exposure', icon: colorLowerExposureIcon }].map((option) => <label className={`flex min-h-12 [@media(min-width:1024px)_and_(max-height:900px)]:min-h-11 [@media(min-width:1024px)_and_(max-height:760px)]:text-sm cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-black ${props.preference === option.value ? 'border-ae-brand bg-ae-soft text-ae-brand' : 'border-ae-line'}`} key={option.value}><input className="sr-only" type="radio" name="preference" checked={props.preference === option.value} onChange={() => props.onPreferenceChange(option.value)} /><img className="size-7 object-contain" src={option.icon} alt="" aria-hidden="true" />{option.label}</label>)}</div></fieldset>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ae-line p-3 [@media(min-width:1024px)_and_(max-height:900px)]:p-2.5"><input className="mt-1 size-4 accent-ae-brand" type="checkbox" checked={props.sensitiveUser} onChange={(event) => props.onSensitiveUserChange(event.target.checked)} /><span><strong className="block text-sm font-black">Sensitive-user mode</strong><small className="mt-1 block text-xs font-semibold text-ae-muted">With Balanced priority, considers lower-exposure routes up to 35% slower instead of 20%.</small></span></label>
        <button className="hidden min-h-13 items-center lg:inline-flex [@media(min-width:1024px)_and_(max-height:900px)]:min-h-11 [@media(min-width:1024px)_and_(max-height:760px)]:text-sm justify-center gap-2 rounded-lg bg-ae-ink px-5 font-black text-white hover:bg-ae-brand disabled:opacity-60" type="submit" disabled={props.isPending}>{props.isPending ? 'Comparing...' : 'Compare routes'}<ArrowRight className="size-5" aria-hidden="true" /></button>
      </form>
    </div>
    <div className="shrink-0 border-t border-ae-line bg-white px-5 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden"><button className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-ae-ink px-5 text-base font-black text-white hover:bg-ae-brand disabled:opacity-60" type="submit" form="route-planner-form" disabled={props.isPending}>{props.isPending ? 'Comparing...' : 'Compare routes'}<ArrowRight className="size-5" aria-hidden="true" /></button></div>
  </>
}
