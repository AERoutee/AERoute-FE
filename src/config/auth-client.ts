import { emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
const baseURL = configuredBaseURL || (import.meta.env.DEV ? 'http://localhost:3000' : '')

if (!baseURL) throw new Error('VITE_API_BASE_URL must be configured')
if (import.meta.env.PROD && !baseURL.startsWith('https://')) throw new Error('VITE_API_BASE_URL must use HTTPS in production')

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: 'include' },
  plugins: [emailOTPClient()],
})
