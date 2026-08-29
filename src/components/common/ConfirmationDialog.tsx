import { TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ConfirmationDialogProps = {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({ isOpen, title, description, confirmLabel, isPending = false, onConfirm, onCancel }: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previousFocus.current = document.activeElement as HTMLElement
    cancelRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) onCancel()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); previousFocus.current?.focus() }
  }, [isOpen, isPending, onCancel])

  if (!isOpen) return null
  return createPortal(<div className="fixed inset-0 z-[70] grid place-items-center bg-ae-ink/45 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onCancel() }}><div className="w-full max-w-md rounded-3xl border border-ae-line bg-white p-6 shadow-[0_28px_80px_rgba(20,41,34,.24)] sm:p-7" ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description"><div className="flex items-start justify-between gap-4"><span className="grid size-12 place-items-center rounded-full bg-[#fff1ed] text-ae-fastest"><TriangleAlert className="size-5" aria-hidden="true" /></span><button className="grid size-10 place-items-center rounded-xl text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close dialog" disabled={isPending} onClick={onCancel}><X className="size-5" aria-hidden="true" /></button></div><h2 className="mt-5 mb-0 text-2xl font-black tracking-[-.035em]" id="confirmation-title">{title}</h2><p className="mt-2 mb-0 text-sm leading-6 font-semibold text-ae-muted" id="confirmation-description">{description}</p><div className="mt-7 grid grid-cols-2 gap-3"><button className="min-h-12 rounded-xl border border-ae-border bg-white font-black text-ae-ink hover:border-ae-brand" type="button" ref={cancelRef} disabled={isPending} onClick={onCancel}>Cancel</button><button className="min-h-12 rounded-xl bg-ae-fastest px-4 font-black text-white hover:bg-[#8f2f1d] disabled:opacity-60" type="button" disabled={isPending} onClick={onConfirm}>{isPending ? 'Please wait...' : confirmLabel}</button></div></div></div>, document.body)
}
