import { MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { colorLayersIcon, colorReportIcon, colorWheelchairIcon, colorWindIcon } from '@/assets'

type MapLayers = { weather: boolean; reports: boolean; accessiblePlaces: boolean; restStops: boolean }
type MapLayerControlProps = { layers: MapLayers; weatherUnavailable: boolean; accessiblePlacesUnavailable: boolean; restStopsUnavailable: boolean; disabled?: boolean; onChange: (layers: MapLayers) => void }

export function MapLayerControl({ layers, disabled = false, onChange }: MapLayerControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const controlRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const close = (event: PointerEvent) => { if (!controlRef.current?.contains(event.target as Node)) setIsOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [isOpen])

  function toggle(layer: keyof MapLayers) {
    onChange({ ...layers, [layer]: !layers[layer] })
  }

  const options = [
    { key: 'weather' as const, label: 'Cuaca sepanjang rute', icon: colorWindIcon },
    { key: 'reports' as const, label: 'Laporan komunitas', icon: colorReportIcon },
    { key: 'accessiblePlaces' as const, label: 'Tempat istirahat dengan informasi aksesibilitas', icon: colorWheelchairIcon },
    { key: 'restStops' as const, label: 'Kandidat tempat istirahat dekat rute', icon: null },
  ]

  return <div className="relative" ref={controlRef}><button ref={triggerRef} className={`inline-flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent bg-transparent px-2 text-xs font-black lg:min-h-11 lg:w-32 lg:flex-row lg:justify-start lg:gap-2 lg:border-ae-line lg:bg-white/95 lg:px-3 lg:text-sm lg:shadow-[0_10px_28px_rgba(20,41,34,.18)] backdrop-blur-xl transition hover:border-ae-brand disabled:cursor-not-allowed disabled:opacity-45 hover:text-ae-brand ${isOpen ? 'bg-ae-ink text-white lg:border-ae-brand lg:bg-white/95 lg:text-ae-brand' : 'text-ae-ink lg:border-ae-line'}`} type="button" disabled={disabled} aria-label="Lapisan peta" title="Lapisan peta" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="map-layer-menu" onClick={() => setIsOpen((open) => !open)}><img className="size-7 object-contain" src={colorLayersIcon} alt="" aria-hidden="true" />Lapisan</button>{isOpen && <section className="absolute right-0 bottom-[calc(100%+.6rem)] w-64 rounded-lg border border-ae-line bg-white p-2 shadow-[0_18px_48px_rgba(20,41,34,.2)] lg:top-[calc(100%+.6rem)] lg:bottom-auto" id="map-layer-menu" aria-label="Lapisan peta"><h2 className="px-3 py-2 text-sm font-black">Lapisan peta</h2>{options.map(({ key, label, icon }) => <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-3 hover:bg-ae-soft" key={key}>{icon ? <img className="size-8 object-contain" src={icon} alt="" aria-hidden="true" /> : <MapPin className="size-7 shrink-0 text-ae-brand" aria-hidden="true" />}<span className="min-w-0 flex-1 text-sm font-black">{label}</span><input className="size-5 accent-ae-brand" type="checkbox" aria-label={label} checked={layers[key]} onChange={() => toggle(key)} /></label>)}</section>}</div>
}
