import { airQualityColor, airQualityLevel, coloredRouteSegments } from '@/lib/route-air-quality'

const colors = { low: '#0a9b68', moderate: '#e6a51c', high: '#c0442b', unavailable: '#7b8983' }

function point(lng: number, lat = 0) {
  return { lat, lng }
}

function sample(longitude: number, pm25: number, latitude = 0) {
  return { latitude, longitude, pm25 }
}

describe('route air-quality classification', () => {
  it.each([
    [0, 'low', colors.low],
    [15, 'low', colors.low],
    [15.1, 'moderate', colors.moderate],
    [35, 'moderate', colors.moderate],
    [35.1, 'high', colors.high],
  ] as const)('classifies %s PM2.5 as %s', (pm25, level, color) => {
    expect(airQualityLevel(pm25)).toBe(level)
    expect(airQualityColor(pm25)).toBe(color)
  })

  it('splits a two-point route at the midpoint between endpoint samples', () => {
    expect(coloredRouteSegments([point(0), point(10)], [sample(0, 10), sample(10, 20)], 2)).toEqual([
      { path: [point(0), point(5)], level: 'low', color: colors.low },
      { path: [point(5), point(10)], level: 'moderate', color: colors.moderate },
    ])
  })

  it('preserves green-yellow-red-green order along route progress', () => {
    const segments = coloredRouteSegments([point(0), point(3), point(6), point(9)], [sample(0, 10), sample(3, 20), sample(6, 40), sample(9, 5)], 4)
    expect(segments.map(({ level }) => level)).toEqual(['low', 'moderate', 'high', 'low'])
  })

  it.each([[[]], [[sample(5, 10)]]])('renders honest unavailable coverage for %j samples', (samples) => {
    expect(coloredRouteSegments([point(0), point(10)], samples, 2)).toEqual([{ path: [point(0), point(10)], level: 'unavailable', color: colors.unavailable }])
  })

  it('keeps partial endpoint coverage and large interior gaps neutral', () => {
    const segments = coloredRouteSegments([point(0), point(2), point(8), point(10)], [sample(2, 10), sample(8, 40)], 4)
    expect(segments.map(({ level }) => level)).toEqual(['unavailable', 'low', 'unavailable', 'high', 'unavailable'])
  })

  it('projects samples to cumulative route order at a self-intersection', () => {
    const path = [point(0, 0), point(4, 4), point(0, 4), point(4, 0), point(8, 4)]
    const segments = coloredRouteSegments(path, [sample(1, 10, 1), sample(3, 40, 1), sample(7, 5, 3)], 3)
    expect(segments.map(({ level }) => level)).toEqual(['low', 'high', 'low'])
  })

  it('keeps response sample order when independent nearest projections reverse on retraced geometry', () => {
    const path = [point(0, 0), point(4, 4), point(0, 4), point(4, 0), point(8, 4)]
    const segments = coloredRouteSegments(path, [sample(3, 10, 1), sample(1, 40, 1)], 2)
    expect(segments.map(({ level }) => level)).toEqual(['low', 'high'])
  })

  it('projects a route crossing the antimeridian without reversing samples', () => {
    const segments = coloredRouteSegments([point(179), point(-179)], [sample(179.2, 10), sample(-179.2, 40)], 2)
    expect(segments.map(({ level }) => level)).toEqual(['low', 'high'])
  })
})
