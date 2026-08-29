import { Check, Minus, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

const FRAME_SIZE = 256

type AvatarCropDialogProps = {
  source: string
  isPending: boolean
  onCancel: () => void
  onConfirm: (file: Blob) => void
}

export function AvatarCropDialog({ source, isPending, onCancel, onConfirm }: AvatarCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isPending) onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onCancel])

  function scaledSize(nextZoom = zoom) {
    const baseScale = Math.max(FRAME_SIZE / imageSize.width, FRAME_SIZE / imageSize.height)
    return { scale: baseScale * nextZoom, width: imageSize.width * baseScale * nextZoom, height: imageSize.height * baseScale * nextZoom }
  }

  function clampOffset(nextOffset: { x: number; y: number }, nextZoom = zoom) {
    const scaled = scaledSize(nextZoom)
    const maxX = Math.max(0, (scaled.width - FRAME_SIZE) / 2)
    const maxY = Math.max(0, (scaled.height - FRAME_SIZE) / 2)
    return { x: Math.max(-maxX, Math.min(maxX, nextOffset.x)), y: Math.max(-maxY, Math.min(maxY, nextOffset.y)) }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    setOffset(clampOffset({ x: dragRef.current.offsetX + event.clientX - dragRef.current.x, y: dragRef.current.offsetY + event.clientY - dragRef.current.y }))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function updateZoom(nextZoom: number) {
    const normalized = Math.max(1, Math.min(3, nextZoom))
    setZoom(normalized)
    setOffset((current) => clampOffset(current, normalized))
  }

  async function createCroppedImage() {
    const image = imageRef.current
    if (!image) return
    const scaled = scaledSize()
    const displayLeft = (FRAME_SIZE - scaled.width) / 2 + offset.x
    const displayTop = (FRAME_SIZE - scaled.height) / 2 + offset.y
    const sourceX = Math.max(0, -displayLeft / scaled.scale)
    const sourceY = Math.max(0, -displayTop / scaled.scale)
    const sourceSize = FRAME_SIZE / scaled.scale
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', .86))
    if (blob) onConfirm(blob)
  }

  const scaled = scaledSize()
  return createPortal(<div className="fixed inset-0 z-[90] grid place-items-center bg-ae-ink/55 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_28px_80px_rgba(20,41,34,.3)] sm:p-6" role="dialog" aria-modal="true" aria-labelledby="crop-title"><div className="flex items-center justify-between"><div><h2 className="m-0 text-2xl font-black tracking-[-.04em]" id="crop-title">Adjust photo</h2><p className="mt-1 mb-0 text-sm font-semibold text-ae-muted">Drag to position, then zoom to fit.</p></div><button className="grid size-10 place-items-center rounded-xl text-ae-muted hover:bg-ae-soft" type="button" aria-label="Cancel photo adjustment" disabled={isPending} onClick={onCancel}><X className="size-5" aria-hidden="true" /></button></div><div className="mx-auto mt-6 size-64 max-w-full touch-none cursor-grab overflow-hidden rounded-full bg-ae-canvas shadow-[0_0_0_4px_#fff,0_0_0_6px_#087f5b] active:cursor-grabbing" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}><img className="pointer-events-none relative top-1/2 left-1/2 max-w-none select-none" ref={imageRef} src={source} alt="Profile photo crop preview" onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} style={{ width: scaled.width, height: scaled.height, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} /></div><div className="mt-7 flex items-center gap-3"><Minus className="size-4 text-ae-muted" aria-hidden="true" /><input className="h-2 flex-1 cursor-pointer accent-ae-brand" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => updateZoom(Number(event.target.value))} aria-label="Photo zoom" /><Plus className="size-4 text-ae-muted" aria-hidden="true" /></div><div className="mt-7 grid grid-cols-2 gap-3"><button className="min-h-12 rounded-xl border border-ae-border font-black text-ae-ink hover:border-ae-brand" type="button" disabled={isPending} onClick={onCancel}>Cancel</button><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ae-ink font-black text-white hover:bg-ae-brand disabled:opacity-60" type="button" disabled={isPending} onClick={() => void createCroppedImage()}><Check className="size-4" aria-hidden="true" />{isPending ? 'Uploading...' : 'Use photo'}</button></div></section></div>, document.body)
}
