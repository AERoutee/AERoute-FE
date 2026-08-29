import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastTone } from './toast'

let nextToastId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), [])
  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextToastId++
    setToasts((items) => [...items.slice(-2), { id, message, tone }])
    window.setTimeout(() => dismiss(id), 4500)
  }, [dismiss])
  const value = useMemo(() => ({ showToast }), [showToast])

  return <ToastContext.Provider value={value}>{children}<div className="fixed top-5 right-5 z-[120] grid w-[min(24rem,calc(100vw-2.5rem))] gap-3" aria-live="polite" aria-atomic="false">{toasts.map((toast) => { const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? CircleAlert : Info; return <div className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_18px_45px_rgba(20,41,34,.16)] ${toast.tone === 'error' ? 'border-[#e3a08f]' : toast.tone === 'success' ? 'border-[#9bcdb6]' : 'border-ae-line'}`} key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'}><Icon className={`mt-0.5 size-5 shrink-0 ${toast.tone === 'error' ? 'text-ae-fastest' : 'text-ae-brand'}`} aria-hidden="true" /><p className="m-0 flex-1 text-sm leading-6 font-bold text-ae-ink">{toast.message}</p><button className="grid size-8 shrink-0 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X className="size-4" aria-hidden="true" /></button></div> })}</div></ToastContext.Provider>
}
