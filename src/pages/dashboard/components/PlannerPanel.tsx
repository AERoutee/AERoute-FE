import { ArrowRight, ArrowUpDown, Bike, BusFront, Footprints, GripHorizontal, LocateFixed, TrainFront, TrainFrontTunnel, X } from 'lucide-react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { colorBalancedPriorityIcon, colorCompareIcon, colorLowerExposureIcon, colorWalkingIcon } from '@/assets'
import { LocationInput } from '@/components/planner'
import { nextModeSelection } from '@/lib'
import type { AccessibilityMode, DirectTravelMode, Place, RoutePreference, TransitPreference } from '@/types'

type PlannerPanelProps = {
  origin: Place | null
  destination: Place | null
  selectedModes: readonly DirectTravelMode[]
  preference: RoutePreference
  sensitiveUser: boolean
  transitPreference: TransitPreference
  accessibilityMode: AccessibilityMode
  errors: { origin?: string; destination?: string }
  isLocating: boolean
  isPending: boolean
  onOriginChange: (place: Place | null) => void
  onDestinationChange: (place: Place | null) => void
  onSelectedModesChange: (modes: DirectTravelMode[]) => void
  onPreferenceChange: (preference: RoutePreference) => void
  onSensitiveUserChange: (enabled: boolean) => void
  onTransitPreferenceChange: (preference: TransitPreference) => void
  onAccessibilityModeChange: (mode: AccessibilityMode) => void
  onCurrentLocation: () => void
  onSwap: () => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
  onDesktopDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  mobileHandle: { height: number; onClick: () => void; onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>, onDismiss?: () => void) => void; onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void }
}

const modes = [
  { value: 'WALK' as const, label: 'Jalan', Icon: Footprints },
  { value: 'BICYCLE' as const, label: 'Sepeda', Icon: Bike },
  { value: 'BUS' as const, label: 'Bus', Icon: BusFront },
  { value: 'TRAIN' as const, label: 'Kereta', Icon: TrainFront },
  { value: 'SUBWAY' as const, label: 'MRT', Icon: TrainFrontTunnel },
]

export function PlannerPanel(props: PlannerPanelProps) {
  const hasTransit = props.selectedModes.some((mode) => mode === 'BUS' || mode === 'TRAIN' || mode === 'SUBWAY')
  const hasActive = !hasTransit && props.selectedModes.some((mode) => mode === 'WALK' || mode === 'BICYCLE')

  function toggleMode(mode: DirectTravelMode) {
    const next = nextModeSelection(props.selectedModes, mode)
    if (next.length !== props.selectedModes.length || next.some((item, index) => item !== props.selectedModes[index])) props.onSelectedModesChange(next)
  }

  return <>
    <div className="shrink-0 lg:hidden"><button className="flex min-h-11 w-full touch-none select-none cursor-grab items-center justify-center active:cursor-grabbing" type="button" aria-label="Ubah ukuran panel perencana" aria-valuetext={`${Math.round(props.mobileHandle.height)} percent height`} onClick={props.mobileHandle.onClick} onPointerDown={props.mobileHandle.onPointerDown} onPointerMove={props.mobileHandle.onPointerMove} onPointerUp={(event) => props.mobileHandle.onPointerUp(event, props.onClose)} onPointerCancel={(event) => props.mobileHandle.onPointerUp(event, props.onClose)} onKeyDown={props.mobileHandle.onKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" aria-hidden="true" /></button></div>
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-ae-line px-5 lg:h-14"><button className="hidden min-w-0 flex-1 touch-none cursor-move items-center gap-3 text-left text-ae-muted lg:flex" type="button" aria-label="Geser panel perencana" onPointerDown={props.onDesktopDragStart} onPointerMove={props.onDesktopDragMove} onPointerUp={props.onDesktopDragEnd} onPointerCancel={props.onDesktopDragEnd} onKeyDown={props.onDesktopDragKeyDown}><GripHorizontal className="size-5 shrink-0" aria-hidden="true" /><span className="truncate whitespace-nowrap text-base font-black text-ae-ink">Mau pergi ke mana?</span></button><h2 className="m-0 flex-1 truncate whitespace-nowrap text-[15px] font-black lg:hidden">Mau pergi ke mana?</h2><button className="grid size-11 shrink-0 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft hover:text-ae-brand" type="button" aria-label="Tutup panel perencana" onClick={props.onClose}><X className="size-5" aria-hidden="true" /></button></div>
    <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-5 py-3 [scrollbar-width:thin] [scrollbar-color:#b7c8c0_transparent] [-webkit-overflow-scrolling:touch] sm:px-6 lg:h-auto lg:px-7 lg:pt-5 lg:pb-6">
      <form id="route-planner-form" className="grid gap-3 lg:gap-4" onSubmit={props.onSubmit} noValidate>
        <LocationInput id="dashboard-origin" label="Dari" value={props.origin} onChange={props.onOriginChange} error={props.errors.origin} />
        <div className="flex items-center justify-between gap-2"><button className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-[13px] font-extrabold text-ae-brand hover:bg-ae-soft lg:text-sm" type="button" disabled={props.isLocating} onClick={props.onCurrentLocation}><LocateFixed className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{props.isLocating ? 'Mencari lokasi...' : 'Gunakan lokasi saat ini'}</span></button><button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-extrabold text-ae-muted hover:bg-ae-soft hover:text-ae-brand lg:text-sm" type="button" onClick={props.onSwap}><ArrowUpDown className="size-4" aria-hidden="true" />Tukar</button></div>
        <LocationInput id="dashboard-destination" label="Tujuan" value={props.destination} onChange={props.onDestinationChange} error={props.errors.destination} />
        <fieldset className="min-w-0 border-0 p-0"><legend className="mb-1 text-[13px] font-extrabold lg:text-sm">Moda perjalanan</legend><p className="mt-0 mb-2 text-[11px] font-semibold text-ae-muted lg:text-xs">Pilih moda yang boleh digunakan. Kombinasi yang tersedia akan ditampilkan.</p><div className="grid min-w-0 grid-cols-5 gap-1.5">{modes.map(({ value, label, Icon }) => { const checked = props.selectedModes.includes(value); return <label className={`flex min-h-13 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border px-1 text-[11px] font-black lg:text-xs ${checked ? 'border-ae-brand bg-ae-soft text-ae-brand' : 'border-ae-line bg-white hover:border-ae-brand'}`} key={value}><input className="sr-only" type="checkbox" name="direct-mode" checked={checked} onChange={() => toggleMode(value)} /><Icon className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{label}</span></label> })}</div></fieldset>
        {hasActive && <fieldset className="border-0 p-0"><legend className="mb-2 text-[13px] font-extrabold lg:text-sm">Prioritas rute aktif</legend><div className="grid grid-cols-2 gap-2">{[{ value: 'balanced' as const, label: 'Seimbang', icon: colorBalancedPriorityIcon }, { value: 'lower-exposure' as const, label: 'Paparan lebih rendah', icon: colorLowerExposureIcon }].map((option) => <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-black lg:text-sm ${props.preference === option.value ? 'border-ae-brand bg-ae-soft text-ae-brand' : 'border-ae-line'}`} key={option.value}><input className="sr-only" type="radio" name="active-route-priority" checked={props.preference === option.value} onChange={() => props.onPreferenceChange(option.value)} /><img className="size-6 object-contain lg:size-7" src={option.icon} alt="" aria-hidden="true" />{option.label}</label>)}</div></fieldset>}
        {hasTransit && <fieldset className="border-0 p-0"><legend className="mb-2 text-[13px] font-extrabold lg:text-sm">Prioritas transit</legend><div className="grid grid-cols-2 gap-2">{[{ value: 'LESS_WALKING' as const, label: 'Lebih sedikit berjalan', icon: colorWalkingIcon }, { value: 'FEWER_TRANSFERS' as const, label: 'Lebih sedikit transit', icon: colorCompareIcon }].map((option) => <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black lg:text-sm ${props.transitPreference === option.value ? 'border-ae-brand bg-ae-soft text-ae-brand' : 'border-ae-line'}`} key={option.value}><input className="sr-only" type="radio" name="transit-priority" checked={props.transitPreference === option.value} onChange={() => props.onTransitPreferenceChange(option.value)} /><img className="size-6 object-contain lg:size-7" src={option.icon} alt="" aria-hidden="true" />{option.label}</label>)}</div></fieldset>}
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-ae-line p-3"><input className="mt-1 size-4 accent-ae-brand" type="checkbox" checked={props.sensitiveUser} onChange={(event) => props.onSensitiveUserChange(event.target.checked)} /><span><strong className="block text-[13px] font-black lg:text-sm">Mode pengguna sensitif</strong><small className="mt-1 block text-[11px] font-semibold text-ae-muted lg:text-xs">Mode seimbang mempertimbangkan rute berpaparan lebih rendah hingga 35% lebih lambat, bukan 20%.</small></span></label>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-ae-line p-3"><input className="mt-1 size-4 accent-ae-brand" type="checkbox" aria-label="Usaha lebih ringan" checked={props.accessibilityMode === 'REDUCED_EXERTION'} onChange={(event) => props.onAccessibilityModeChange(event.target.checked ? 'REDUCED_EXERTION' : 'STANDARD')} /><span><strong className="block text-[13px] font-black lg:text-sm">Usaha lebih ringan</strong><small className="mt-1 block text-[11px] font-semibold text-ae-muted lg:text-xs">Hanya perkiraan; tidak memverifikasi akses kursi roda atau rute bebas tangga.</small></span></label>
        <button className="hidden min-h-13 items-center justify-center gap-2 rounded-lg bg-ae-ink px-5 text-sm font-black text-white hover:bg-ae-brand disabled:opacity-60 lg:inline-flex" type="submit" disabled={props.isPending}>{props.isPending ? 'Membandingkan...' : 'Bandingkan rute'}<ArrowRight className="size-5" aria-hidden="true" /></button>
      </form>
    </div>
    <div className="shrink-0 border-t border-ae-line bg-white px-5 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden"><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-ae-ink px-5 text-sm font-black text-white hover:bg-ae-brand disabled:opacity-60" type="submit" form="route-planner-form" disabled={props.isPending}>{props.isPending ? 'Membandingkan...' : 'Bandingkan rute'}<ArrowRight className="size-5" aria-hidden="true" /></button></div>
  </>
}
