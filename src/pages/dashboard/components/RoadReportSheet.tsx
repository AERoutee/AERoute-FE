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
  { value: 'HAZARD' as const, label: 'Bahaya', detail: 'Puing atau permukaan tidak aman' },
  { value: 'BLOCKED_PATH' as const, label: 'Jalur terhalang', detail: 'Jalur pejalan kaki atau sepeda terhalang' },
  { value: 'CRASH' as const, label: 'Kecelakaan', detail: 'Tabrakan yang mengganggu perjalanan' },
  { value: 'CONSTRUCTION' as const, label: 'Konstruksi', detail: 'Pekerjaan jalan atau pengalihan' },
  { value: 'MAP_ISSUE' as const, label: 'Masalah peta', detail: 'Jalur hilang atau tidak tepat' },
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
    if (images.length + next.length > 3) { setError('Lampirkan maksimal 3 gambar.'); return }
    const invalid = next.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024)
    if (invalid) { setError('Gunakan gambar JPG, PNG, atau WebP maksimal 3 MB per file.'); return }
    setSelectedPreview(images.length)
    setImages((current) => [...current, ...next])
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!category) { setStep(1); return }
    const text = description.trim()
    if (text.length < 10 || text.length > 500) { setError('Jelaskan masalah dalam 10 hingga 500 karakter.'); return }
    setPending(true)
    setError('')
    try {
      const report = await createRoadReport({ category, description: text, latitude: location.latitude, longitude: location.longitude, images })
      onCreated(report)
    } catch {
      setError('Laporan tidak dapat dikirim. Periksa gambar lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  return <div className="relative flex h-full min-h-0 flex-col">
    <button className="flex min-h-11 w-full shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing lg:hidden" type="button" aria-label="Ubah ukuran panel laporan" aria-valuetext={`${Math.round(mobileHandle.height)} persen tinggi`} onClick={mobileHandle.onClick} onPointerDown={mobileHandle.onPointerDown} onPointerMove={mobileHandle.onPointerMove} onPointerUp={(event) => mobileHandle.onPointerUp(event, onClose)} onPointerCancel={(event) => mobileHandle.onPointerUp(event, onClose)} onKeyDown={mobileHandle.onKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" /></button>
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ae-line px-5">
      {step === 2 && <button className="grid size-10 shrink-0 place-items-center rounded-sm text-ae-muted hover:bg-ae-soft" type="button" aria-label="Kembali ke kategori" onClick={() => setStep(1)}><ArrowLeft className="size-5" /></button>}<button className="hidden min-w-0 flex-1 touch-none cursor-move items-center gap-3 text-left text-ae-muted lg:flex" type="button" aria-label="Geser panel laporan" onPointerDown={onDesktopDragStart} onPointerMove={onDesktopDragMove} onPointerUp={onDesktopDragEnd} onPointerCancel={onDesktopDragEnd} onKeyDown={onDesktopDragKeyDown}><GripHorizontal className="size-5 shrink-0" aria-hidden="true" /><span className="truncate text-base font-black text-ae-ink">{step === 1 ? 'Apa yang terjadi?' : 'Tambahkan detail'}</span></button><h2 className="m-0 min-w-0 flex-1 truncate text-[15px] font-black lg:hidden" id="report-title">{step === 1 ? 'Apa yang terjadi?' : 'Tambahkan detail'}</h2>
      <button className="grid size-10 shrink-0 place-items-center rounded-sm text-ae-muted hover:bg-ae-soft" type="button" aria-label="Tutup laporan" onClick={onClose}><X className="size-5" /></button>
    </header>
    {step === 1 ? <div className="grid h-0 flex-1 auto-rows-max grid-cols-3 content-start gap-3 overflow-y-auto p-5 sm:gap-4 sm:p-6">{categories.map(({ value, label, detail }) => <button className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-sm border border-ae-line bg-white p-3 text-center transition hover:border-ae-brand hover:shadow-md" type="button" key={value} onClick={() => { setCategory(value); setStep(2) }}><img className="size-14 object-contain" src={roadReportIcons[value]} alt="" /><span><strong className="block text-sm font-black sm:text-base">{label}</strong><small className="mt-1 hidden text-xs font-semibold text-ae-muted sm:block">{detail}</small></span></button>)}</div> : <form className="h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#b7c8c0_transparent] sm:p-5 lg:overflow-hidden lg:overscroll-none" onSubmit={submit}><div className="rounded-sm bg-ae-soft p-3 text-sm font-bold text-ae-brand"><MapPinned className="mr-2 inline size-4" />Lokasi saat ini · akurasi ±{Math.round(location.accuracy)} m</div><label className="mt-5 mb-2 block text-sm font-extrabold" htmlFor="report-description">Apa yang perlu diketahui pengguna lain?</label><textarea className="min-h-20 w-full resize-none rounded-sm border border-ae-border p-4 text-base lg:text-sm font-semibold outline-none focus:border-ae-brand focus:ring-4 focus:ring-ae-brand/10" id="report-description" value={description} onChange={(event) => { setDescription(event.target.value.slice(0, 500)); setError('') }} placeholder="Jelaskan kejadian, lokasi, dan arah yang terdampak." required /><div className="mt-2 text-right text-xs font-bold text-ae-muted">{description.length}/500</div><div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div><strong className="block text-sm font-extrabold">Foto</strong><span className="text-xs font-semibold text-ae-muted">Opsional · maksimal 3 · 3 MB per file</span></div><div className="flex gap-2"><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-ae-ink px-3 text-sm font-black text-white"><Camera className="size-4" />Kamera<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectImages(event.target.files)} /></label><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-ae-border px-3 text-sm font-black"><Images className="size-4" />Galeri<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectImages(event.target.files)} /></label></div></div>{previews.length > 0 && <div className="mt-2 flex flex-wrap gap-2 bg-ae-soft/70 p-2">{previews.map((preview, index) => <figure className="relative m-0 size-16 overflow-hidden rounded-sm bg-white" key={preview}><button className="h-full w-full" type="button" aria-label={`Preview image ${index + 1}`} onClick={() => { setSelectedPreview(index); setIsPreviewOpen(true) }}><img className="h-full w-full object-cover" src={preview} alt={`Report attachment ${index + 1}`} /></button><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ae-ink/80 to-transparent px-2 pt-5 pb-1.5 text-[10px] font-black text-white">Photo {index + 1} · {(images[index].size / 1024 / 1024).toFixed(1)} MB</figcaption><button className="absolute top-1 right-1 grid size-8 place-items-center rounded-sm bg-white/95 text-ae-ink" type="button" aria-label={`Remove image ${index + 1}`} onClick={() => { setSelectedPreview(0); setImages((current) => current.filter((_, itemIndex) => itemIndex !== index)) }}><X className="size-4" /></button></figure>)}</div>}{error && <p className="mt-4 rounded-sm bg-[#fff1ed] p-3 text-sm font-bold text-ae-fastest" role="alert">{error}</p>}<button className="sticky bottom-0 mt-3 inline-flex min-h-13 w-full items-center justify-center rounded-sm bg-ae-ink px-5 font-black text-white hover:bg-ae-brand disabled:opacity-60" type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Kirim laporan'}</button></form>}
    {isPreviewOpen && previews[selectedPreview] && createPortal(<div className="fixed inset-0 z-[200] grid place-items-center bg-black/92 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Pratinjau gambar"><button className="absolute inset-0 cursor-default" type="button" aria-label="Tutup pratinjau gambar" onClick={() => setIsPreviewOpen(false)} /><div className="relative z-10 flex h-full w-full items-center justify-center"><button className="absolute top-0 right-0 z-20 grid size-12 place-items-center text-white hover:text-white/70" type="button" aria-label="Tutup pratinjau gambar" onClick={() => setIsPreviewOpen(false)}><X className="size-8" /></button><img className="max-h-full max-w-full object-contain" src={previews[selectedPreview]} alt={`Pratinjau besar ${selectedPreview + 1}`} /></div></div>, document.body)}
  </div>
}
