import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let configured = false

function configure() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY
  if (!key) return false
  if (!configured) {
    setOptions({ key, v: 'weekly', language: 'en', region: 'ID' })
    configured = true
  }
  return true
}

export async function loadGooglePlaces() {
  if (!configure()) return null
  return importLibrary('places')
}

export async function loadGoogleMaps() {
  if (!configure()) return null
  return importLibrary('maps')
}

export function hasGoogleMapsKey() {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY)
}
