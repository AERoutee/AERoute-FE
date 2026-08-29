import { Pencil, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type EditNameDialogProps = {
  isOpen: boolean
  value: string
  error?: string
  isPending: boolean
  onChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}

export function EditNameDialog({ isOpen, value, error, isPending, onChange, onSave, onClose }: EditNameDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!isOpen) return
    inputRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isPending) onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isPending, onClose])
  if (!isOpen) return null
  return createPortal(<div className="fixed inset-0 z-[80] grid place-items-center bg-ae-ink/45 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose() }}><form className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_28px_80px_rgba(20,41,34,.24)]" onSubmit={(event) => { event.preventDefault(); onSave() }} noValidate role="dialog" aria-modal="true" aria-labelledby="edit-name-title"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-full bg-ae-soft text-ae-brand"><Pencil className="size-5" aria-hidden="true" /></span><button className="grid size-10 place-items-center rounded-xl text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close name editor" disabled={isPending} onClick={onClose}><X className="size-5" aria-hidden="true" /></button></div><h2 className="mt-5 mb-0 text-2xl font-black tracking-[-.04em]" id="edit-name-title">Edit name</h2><label className="mt-6 mb-2 block text-sm font-extrabold" htmlFor="profile-name">Name</label><input className={`min-h-12 w-full rounded-xl border bg-white px-4 text-sm font-bold text-ae-ink outline-none focus:border-ae-brand focus:ring-4 focus:ring-ae-brand/10 ${error ? 'border-ae-fastest' : 'border-ae-border'}`} ref={inputRef} id="profile-name" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="name" aria-invalid={Boolean(error)} aria-describedby={error ? 'profile-name-error' : undefined} />{error && <p className="mt-2 text-sm font-bold text-ae-fastest" id="profile-name-error" role="alert">{error}</p>}<div className="mt-7 grid grid-cols-2 gap-3"><button className="min-h-12 rounded-xl border border-ae-border font-black text-ae-ink hover:border-ae-brand" type="button" disabled={isPending} onClick={onClose}>Cancel</button><button className="min-h-12 rounded-xl bg-ae-ink font-black text-white hover:bg-ae-brand disabled:opacity-60" disabled={isPending}>{isPending ? 'Saving...' : 'Save name'}</button></div></form></div>, document.body)
}
