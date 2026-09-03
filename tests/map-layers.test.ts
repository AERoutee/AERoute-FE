import { defaultMapLayers, loadMapLayers, MAP_LAYERS_KEY, saveMapLayers } from '@/lib/map-layers'

const defaults = { weather: true, reports: true, accessiblePlaces: true, restStops: true }

function memoryStorage(initial?: string) {
  const values = new Map<string, string>(initial === undefined ? [] : [[MAP_LAYERS_KEY, initial]])
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('persistent map layers', () => {
  it('returns fresh defaults when no settings exist', () => {
    const storage = memoryStorage()
    const first = loadMapLayers(storage)
    const second = loadMapLayers(storage)
    expect(first).toEqual(defaults)
    expect(second).toEqual(defaults)
    expect(first).not.toBe(second)
    expect(defaultMapLayers()).toEqual(defaults)
  })

  it.each([
    '{',
    'null',
    '{}',
    JSON.stringify({ ...defaults, extra: false }),
    JSON.stringify({ ...defaults, weather: 'false' }),
  ])('removes invalid stored settings safely: %s', (value) => {
    const storage = memoryStorage(value)
    expect(loadMapLayers(storage)).toEqual(defaults)
    expect(storage.getItem(MAP_LAYERS_KEY)).toBeNull()
  })

  it('loads and saves exactly four booleans', () => {
    const storage = memoryStorage()
    const layers = { weather: true, reports: false, accessiblePlaces: true, restStops: true }
    expect(saveMapLayers(layers, storage)).toBe(true)
    expect(loadMapLayers(storage)).toEqual(layers)
  })

  it('does not throw when storage access fails', () => {
    const storage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    expect(loadMapLayers(storage)).toEqual(defaults)
    expect(saveMapLayers(defaults, storage)).toBe(false)
  })
})
