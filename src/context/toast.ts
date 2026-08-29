import { createContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'
export type Toast = { id: number; message: string; tone: ToastTone }
export type ToastContextValue = { showToast: (message: string, tone?: ToastTone) => void }

export const ToastContext = createContext<ToastContextValue | null>(null)
