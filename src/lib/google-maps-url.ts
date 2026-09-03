export function googleMapsUrl(value?: string) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl'].includes(url.hostname) ? url.href : null
  } catch {
    return null
  }
}

export function googleProfilePhotoUrl(value?: string) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com')) ? url.href : null
  } catch {
    return null
  }
}

export function placePhotoUrl(name: string | undefined, apiBaseURL: string) {
  if (!name || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) return null
  return `${apiBaseURL.replace(/\/$/, '')}/api/v1/place-photos?name=${encodeURIComponent(name)}`
}
