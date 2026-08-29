import { ArrowLeft, Camera, GripHorizontal, Images, MapPinned, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { createRoadReport } from '@/api'
import { roadReportIcons } from '@/lib'
import type { RoadReport, RoadReportCategory } from '@/types'

type ReportLocation = { latitude: number; longitude: number; accuracy: number }
type RoadReportSheetProps = {
  location: ReportLocation
  onClose: () => void
  onCreated: (report: RoadReport) => void
  onLayoutChange: (layout: { step: 1 | 2; hasImages: boolean }) => void
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

const categories = [
  { value: 'HAZARD' as const, label: 'Hazard', detail: 'Debris or unsafe surface' },
  { value: 'BLOCKED_PATH' as const, label: 'Blocked path', detail: 'Walk or cycle path blocked' },
  { value: 'CRASH' as const, label: 'Crash', detail: 'Collision affecting travel' },
  { value: 'CONSTRUCTION' as const, label: 'Construction', detail: 'Works or diversion' },
  { value: 'MAP_ISSUE' as const, label: 'Map issue', detail: 'Missing or incorrect path' },
]

export function RoadReportSheet({ location, onClose, onCreated, onLayoutChange, onDesktopDragStart, onDesktopDragMove, onDesktopDragEnd, onDesktopDragKeyDown, mobileHandle }: RoadReportSheetProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [category, setCategory] = useState<RoadReportCategory | null>(null)
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const previews = useMemo(() => images.map((image) => URL.createObjectURL(image)), [images])
  const [selectedPreview, setSelectedPreview] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])
  useEffect(() => onLayoutChange({ step, hasImages: images.length > 0 }), [images.length, onLayoutChange, step])

  function selectImages(files: FileList | null) {
    if (!files) return
    const next = Array.from(files)
    if (images.length + next.length > 3) { setError('Attach no more than 3 images.'); return }
    const invalid = next.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024)
    if (invalid) { setError('Use JPG, PNG, or WebP images up to 3 MB each.'); return }
    setSelectedPreview(images.length)
    setImages((current) => [...current, ...next])
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!category) { setStep(1); return }
    const text = description.trim()
    if (text.length < 10 || text.length > 500) { setError('Describe the issue in 10 to 500 characters.'); return }
    setPending(true)
    setError('')
    try {
      const report = await createRoadReport({ category, description: text, latitude: location.latitude, longitude: location.longitude, images })
      onCreated(report)
    } catch {
      setError('The report could not be submitted. Check the images and try again.')
    } finally {
      setPending(false)
    }
  }

  return <div className="relative flex h-full min-h-0 flex-col">
    <button className="flex w-full shrink-0 touch-none cursor-grab justify-center pt-3 pb-2 active:cursor-grabbing lg:hidden" type="button" aria-label="Resize report panel" aria-valuetext={`${Math.round(mobileHandle.height)} percent height`} onClick={mobileHandle.onClick} onPointerDown={mobileHandle.onPointerDown} onPointerMove={mobileHandle.onPointerMove} onPointerUp={(event) => mobileHandle.onPointerUp(event, onClose)} onPointerCancel={(event) => mobileHandle.onPointerUp(event, onClose)} onKeyDown={mobileHandle.onKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" /></button>
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ae-line px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">{step === 2 && <button className="grid size-10 place-items-center rounded-sm text-ae-muted hover:bg-ae-soft" type="button" aria-label="Back to categories" onClick={() => setStep(1)}><ArrowLeft className="size-5" /></button>}<h2 className="m-0 truncate text-base font-black lg:hidden" id="report-title">{step === 1 ? 'What is happening?' : 'Add useful details'}</h2><button className="hidden min-h-11 flex-1 touch-none cursor-move items-center text-left lg:flex" type="button" aria-label="Drag report panel" onPointerDown={onDesktopDragStart} onPointerMove={onDesktopDragMove} onPointerUp={onDesktopDragEnd} onPointerCancel={onDesktopDragEnd} onKeyDown={onDesktopDragKeyDown}>{step === 1 && <GripHorizontal className="mr-3 size-5 text-ae-muted" aria-hidden="true" />}<strong className="truncate text-base font-black">{step === 1 ? 'What is happening?' : 'Add useful details'}</strong></button></div>
      <button className="grid size-10 shrink-0 place-items-center rounded-sm text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close report" onClick={onClose}><X className="size-5" /></button>
    </header>
    {step === 1 ? <div className="grid h-0 flex-1 auto-rows-max grid-cols-3 content-start gap-3 overflow-y-auto p-5 sm:gap-4 sm:p-6">{categories.map(({ value, label, detail }) => <button className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-sm border border-ae-line bg-white p-3 text-center transition hover:border-ae-brand hover:shadow-md" type="button" key={value} onClick={() => { setCategory(value); setStep(2) }}><img className="size-14 object-contain" src={roadReportIcons[value]} alt="" /><span><strong className="block text-sm font-black sm:text-base">{label}</strong><small className="mt-1 hidden text-xs font-semibold text-ae-muted sm:block">{detail}</small></span></button>)}</div> : <form className="h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#b7c8c0_transparent] sm:p-5 lg:overflow-hidden lg:overscroll-none" onSubmit={submit}><div className="rounded-sm bg-ae-soft p-3 text-sm font-bold text-ae-brand"><MapPinned className="mr-2 inline size-4" />Current location · accuracy ±{Math.round(location.accuracy)} m</div><label className="mt-5 mb-2 block text-sm font-extrabold" htmlFor="report-description">What should others know?</label><textarea className="min-h-20 w-full resize-none rounded-sm border border-ae-border p-4 text-sm font-semibold outline-none focus:border-ae-brand focus:ring-4 focus:ring-ae-brand/10" id="report-description" value={description} onChange={(event) => { setDescription(event.target.value.slice(0, 500)); setError('') }} placeholder="Describe what happened, where it is, and which direction is affected." required /><div className="mt-2 text-right text-xs font-bold text-ae-muted">{description.length}/500</div><div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div><strong className="block text-sm font-extrabold">Photos</strong><span className="text-xs font-semibold text-ae-muted">Optional · up to 3 · 3 MB each</span></div><div className="flex gap-2"><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-ae-ink px-3 text-sm font-black text-white"><Camera className="size-4" />Camera<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectImages(event.target.files)} /></label><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-ae-border px-3 text-sm font-black"><Images className="size-4" />Gallery<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectImages(event.target.files)} /></label></div></div>{previews.length > 0 && <div className="mt-2 flex flex-wrap gap-2 bg-ae-soft/70 p-2">{previews.map((preview, index) => <figure className="relative m-0 size-16 overflow-hidden rounded-sm bg-white" key={preview}><button className="h-full w-full" type="button" aria-label={`Preview image ${index + 1}`} onClick={() => { setSelectedPreview(index); setIsPreviewOpen(true) }}><img className="h-full w-full object-cover" src={preview} alt={`Report attachment ${index + 1}`} /></button><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ae-ink/80 to-transparent px-2 pt-5 pb-1.5 text-[10px] font-black text-white">Photo {index + 1} · {(images[index].size / 1024 / 1024).toFixed(1)} MB</figcaption><button className="absolute top-1 right-1 grid size-8 place-items-center rounded-sm bg-white/95 text-ae-ink" type="button" aria-label={`Remove image ${index + 1}`} onClick={() => { setSelectedPreview(0); setImages((current) => current.filter((_, itemIndex) => itemIndex !== index)) }}><X className="size-4" /></button></figure>)}</div>}{error && <p className="mt-4 rounded-sm bg-[#fff1ed] p-3 text-sm font-bold text-ae-fastest" role="alert">{error}</p>}<button className="sticky bottom-0 mt-3 inline-flex min-h-13 w-full items-center justify-center rounded-sm bg-ae-ink px-5 font-black text-white hover:bg-ae-brand disabled:opacity-60" type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Submit report'}</button></form>}
    {isPreviewOpen && previews[selectedPreview] && createPortal(<div className="fixed inset-0 z-[200] grid place-items-center bg-black/92 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Image preview"><button className="absolute inset-0 cursor-default" type="button" aria-label="Close image preview" onClick={() => setIsPreviewOpen(false)} /><div className="relative z-10 flex h-full w-full items-center justify-center"><button className="absolute top-0 right-0 z-20 grid size-12 place-items-center text-white hover:text-white/70" type="button" aria-label="Close image preview" onClick={() => setIsPreviewOpen(false)}><X className="size-8" /></button><img className="max-h-full max-w-full object-contain" src={previews[selectedPreview]} alt={`Large preview ${selectedPreview + 1}`} /></div></div>, document.body)}
  </div>
}
