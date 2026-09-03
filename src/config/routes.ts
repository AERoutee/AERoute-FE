import type { ComponentType, LazyExoticComponent } from 'react'
import { lazy } from 'react'

export type AppRoute = {
  path: string
  component: LazyExoticComponent<ComponentType>
  layout: 'public' | 'dashboard' | 'standalone'
  access?: 'guest' | 'authenticated'
  title: string
}

export const notFoundRoute: AppRoute = { path: '*', component: lazy(() => import('@/pages/not-found')), layout: 'standalone', title: 'Page Not Found | AERoute' }

export const appRoutes: AppRoute[] = [
  { path: '/', component: lazy(() => import('@/pages/landing')), layout: 'public', title: 'AERoute | Smarter Routes with Air Quality Context' },
  { path: '/about', component: lazy(() => import('@/pages/about').then((module) => ({ default: module.AboutPage }))), layout: 'public', title: 'About | AERoute' },
  { path: '/contact', component: lazy(() => import('@/pages/contact').then((module) => ({ default: module.ContactPage }))), layout: 'public', title: 'Contact | AERoute' },
  { path: '/vision-mission', component: lazy(() => import('@/pages/vision-mission').then((module) => ({ default: module.VisionMissionPage }))), layout: 'public', title: 'Vision & Mission | AERoute' },
  { path: '/faq', component: lazy(() => import('@/pages/faq').then((module) => ({ default: module.FaqPage }))), layout: 'public', title: 'FAQ | AERoute' },
  { path: '/dashboard', component: lazy(() => import('@/pages/dashboard')), layout: 'dashboard', access: 'authenticated', title: 'Route Planner | AERoute' },
  { path: '/profile', component: lazy(() => import('@/pages/profile').then((module) => ({ default: module.ProfilePage }))), layout: 'public', access: 'authenticated', title: 'Profile & Security | AERoute' },
  { path: '/login', component: lazy(() => import('@/pages/login')), layout: 'standalone', access: 'guest', title: 'Sign In | AERoute' },
  { path: '/register', component: lazy(() => import('@/pages/register')), layout: 'standalone', access: 'guest', title: 'Create Account | AERoute' },
  { path: '/forgot-password', component: lazy(() => import('@/pages/forgot-password')), layout: 'standalone', access: 'guest', title: 'Forgot Password | AERoute' },
  { path: '/verify-otp', component: lazy(() => import('@/pages/verify-otp').then((module) => ({ default: module.VerifyOtpPage }))), layout: 'standalone', title: 'Verify Security Code | AERoute' },
  { path: '/new-password', component: lazy(() => import('@/pages/new-password').then((module) => ({ default: module.NewPasswordPage }))), layout: 'standalone', title: 'Create New Password | AERoute' },
  { path: '/reset-password', component: lazy(() => import('@/pages/reset-password')), layout: 'standalone', access: 'guest', title: 'Reset Password | AERoute' },
]
