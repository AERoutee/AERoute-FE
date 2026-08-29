import axios from 'axios'

export const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '')
if (!apiBaseURL) throw new Error('VITE_API_BASE_URL must be configured')
if (import.meta.env.PROD && !apiBaseURL.startsWith('https://')) throw new Error('VITE_API_BASE_URL must use HTTPS in production')

export const apiClient = axios.create({ baseURL: apiBaseURL, timeout: 25_000, withCredentials: true })
