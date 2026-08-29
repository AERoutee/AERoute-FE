import { Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router'
import { appRoutes, notFoundRoute, type AppRoute } from '@/config'
import { LoadingIndicator } from '@/components/common'
import { DashboardLayout, PublicLayout } from '@/components/layout'
import { AuthGuard } from './AuthGuard'
import { GuestGuard } from './GuestGuard'

function RouteElement({ route }: { route: AppRoute }) {
  useEffect(() => { document.title = route.title }, [route.title])
  const Page = route.component
  const page = <Page />
  const layout = route.layout === 'public' ? <PublicLayout>{page}</PublicLayout> : route.layout === 'dashboard' ? <DashboardLayout>{page}</DashboardLayout> : page
  const content = route.access === 'guest' ? <GuestGuard>{layout}</GuestGuard> : route.access === 'authenticated' ? <AuthGuard>{layout}</AuthGuard> : layout
  return <Suspense fallback={<LoadingIndicator />}>{content}</Suspense>
}

export function RouteMiddleware() {
  return <Routes>{appRoutes.map((route) => <Route key={route.path} path={route.path} element={<RouteElement route={route} />} />)}<Route path="*" element={<RouteElement route={notFoundRoute} />} /></Routes>
}
