export type MapLayers = { weather: boolean; reports: boolean; accessiblePlaces: boolean; restStops: boolean }

type MapLayerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const MAP_LAYERS_KEY = 'aeroute:map-layers:v1'

export function defaultMapLayers(): MapLayers {
  return { weather: true, reports: true, accessiblePlaces: true, restStops: true }
}

function valid(value: unknown): value is MapLayers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Object.keys(record).length === 4 && typeof record.weather === 'boolean' && typeof record.reports === 'boolean' && typeof record.accessiblePlaces === 'boolean' && typeof record.restStops === 'boolean'
}

export function loadMapLayers(storage: MapLayerStorage = localStorage): MapLayers {
  try {
    const raw = storage.getItem(MAP_LAYERS_KEY)
    if (!raw) return defaultMapLayers()
    const parsed: unknown = JSON.parse(raw)
    if (valid(parsed)) return { ...parsed }
    storage.removeItem(MAP_LAYERS_KEY)
  } catch {
    try { storage.removeItem(MAP_LAYERS_KEY) } catch {}
  }
  return defaultMapLayers()
}

export function saveMapLayers(layers: MapLayers, storage: MapLayerStorage = localStorage) {
  try { storage.setItem(MAP_LAYERS_KEY, JSON.stringify(layers)); return true } catch { return false }
}
