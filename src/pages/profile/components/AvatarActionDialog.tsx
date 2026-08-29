import { Camera, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type AvatarActionDialogProps = {
  isOpen: boolean
  hasImage: boolean
  isPending: boolean
  onUpload: () => void
  onRemove: () => void
  onClose: () => void
}

export function AvatarActionDialog({ isOpen, hasImage, isPending, onUpload, onRemove, onClose }: AvatarActionDialogProps) {
  const uploadRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!isOpen) return
    uploadRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isPending) onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isPending, onClose])
  if (!isOpen) return null
  return createPortal(<div className="fixed inset-0 z-[80] grid place-items-center bg-ae-ink/45 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose() }}><section className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_28px_80px_rgba(20,41,34,.24)]" role="dialog" aria-modal="true" aria-labelledby="avatar-actions-title"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-full bg-ae-soft text-ae-brand"><Camera className="size-5" aria-hidden="true" /></span><button className="grid size-10 place-items-center rounded-xl text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close photo menu" disabled={isPending} onClick={onClose}><X className="size-5" aria-hidden="true" /></button></div><h2 className="mt-5 mb-0 text-2xl font-black tracking-[-.04em]" id="avatar-actions-title">Profile photo</h2><p className="mt-2 mb-0 text-sm font-semibold text-ae-muted">Choose a square JPG, PNG, or WebP image.</p><div className="mt-6 grid gap-3"><button className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-ae-ink px-4 text-left text-sm font-black text-white hover:bg-ae-brand" type="button" ref={uploadRef} disabled={isPending} onClick={onUpload}><Upload className="size-5" aria-hidden="true" />Choose from device</button>{hasImage && <button className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-[#e3a08f] px-4 text-left text-sm font-black text-ae-fastest hover:bg-[#fff1ed]" type="button" disabled={isPending} onClick={onRemove}><Trash2 className="size-5" aria-hidden="true" />Remove current photo</button>}</div></section></div>, document.body)
}
