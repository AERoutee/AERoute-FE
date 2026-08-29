import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { queryClient } from '@/config'
import { RouteMiddleware } from '@/components/auth'
import { ToastProvider } from '@/context'

function RouteEffects() {
  const location = useLocation()
  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
  }, [location.pathname])
  return null
}

export default function App() {
  return <QueryClientProvider client={queryClient}><MotionConfig reducedMotion="user"><ToastProvider><RouteEffects /><div className="min-h-dvh bg-ae-canvas font-sans text-ae-ink"><RouteMiddleware /></div></ToastProvider></MotionConfig></QueryClientProvider>
}
