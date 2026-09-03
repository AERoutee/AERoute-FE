export type AirQualityLevel = 'low' | 'moderate' | 'high'
export type RouteAirQualityLevel = AirQualityLevel | 'unavailable'
export type RoutePoint = { lat: number; lng: number }
export type AirQualitySample = { latitude: number; longitude: number; pm25: number }
export type ColoredRouteSegment = { path: RoutePoint[]; level: RouteAirQualityLevel; color: string }

export const unavailableAirQualityColor = '#7b8983'

export function airQualityLevel(pm25: number): AirQualityLevel {
  if (pm25 <= 15) return 'low'
  if (pm25 <= 35) return 'moderate'
  return 'high'
}

export function airQualityColor(pm25: number) {
  const level = airQualityLevel(pm25)
  if (level === 'low') return '#0a9b68'
  if (level === 'moderate') return '#e6a51c'
  return '#c0442b'
}

function longitudeNear(longitude: number, reference: number) {
  return longitude + 360 * Math.round((reference - longitude) / 360)
}

function routeGeometry(path: RoutePoint[]) {
  const unwrapped = path.map((point, index) => ({ lat: point.lat, lng: index === 0 ? point.lng : longitudeNear(point.lng, 0) }))
  for (let index = 1; index < unwrapped.length; index += 1) unwrapped[index].lng = longitudeNear(path[index].lng, unwrapped[index - 1].lng)
  const latitude = unwrapped.reduce((total, point) => total + point.lat, 0) / unwrapped.length
  const longitudeScale = Math.max(.000001, Math.cos(latitude * Math.PI / 180))
  const lengths = unwrapped.slice(0, -1).map((point, index) => Math.hypot((unwrapped[index + 1].lng - point.lng) * longitudeScale, unwrapped[index + 1].lat - point.lat))
  const cumulative = [0]
  lengths.forEach((length) => cumulative.push(cumulative.at(-1)! + length))
  return { unwrapped, longitudeScale, lengths, cumulative, total: cumulative.at(-1)! }
}

function sampleProgress(sample: AirQualitySample, geometry: ReturnType<typeof routeGeometry>, minimumProgress = 0) {
  let selected = { distance: Number.POSITIVE_INFINITY, progress: minimumProgress }
  const minimumDistance = minimumProgress * geometry.total
  geometry.lengths.forEach((length, index) => {
    if (geometry.cumulative[index + 1] < minimumDistance) return
    const start = geometry.unwrapped[index]
    const end = geometry.unwrapped[index + 1]
    const longitude = longitudeNear(sample.longitude, (start.lng + end.lng) / 2)
    const x = (longitude - start.lng) * geometry.longitudeScale
    const y = sample.latitude - start.lat
    const dx = (end.lng - start.lng) * geometry.longitudeScale
    const dy = end.lat - start.lat
    const minimumOffset = length && minimumDistance > geometry.cumulative[index] ? (minimumDistance - geometry.cumulative[index]) / length : 0
    const offset = length ? Math.max(minimumOffset, Math.min(1, (x * dx + y * dy) / (length * length))) : 0
    const distance = Math.hypot(x - offset * dx, y - offset * dy)
    if (distance < selected.distance) selected = { distance, progress: geometry.total ? (geometry.cumulative[index] + offset * length) / geometry.total : minimumProgress }
  })
  return selected.progress
}

function pointAt(geometry: ReturnType<typeof routeGeometry>, progress: number) {
  const distance = progress * geometry.total
  let index = geometry.lengths.findIndex((_length, item) => geometry.cumulative[item + 1] >= distance)
  if (index < 0) index = geometry.lengths.length - 1
  const length = geometry.lengths[index]
  const offset = length ? (distance - geometry.cumulative[index]) / length : 0
  const start = geometry.unwrapped[index]
  const end = geometry.unwrapped[index + 1]
  let lng = start.lng + (end.lng - start.lng) * offset
  while (lng > 180) lng -= 360
  while (lng < -180) lng += 360
  return { lat: start.lat + (end.lat - start.lat) * offset, lng }
}

function pathBetween(path: RoutePoint[], geometry: ReturnType<typeof routeGeometry>, start: number, end: number) {
  const points = [pointAt(geometry, start)]
  geometry.cumulative.slice(1, -1).forEach((distance, index) => {
    const progress = distance / geometry.total
    if (progress > start && progress < end) points.push(path[index + 1])
  })
  points.push(pointAt(geometry, end))
  return points
}

export function coloredRouteSegments(path: RoutePoint[], samples: AirQualitySample[], expectedSampleCount = samples.length): ColoredRouteSegment[] {
  if (path.length < 2) return [{ path, level: 'unavailable', color: unavailableAirQualityColor }]
  if (samples.length < 2) return [{ path, level: 'unavailable', color: unavailableAirQualityColor }]
  const geometry = routeGeometry(path)
  if (!geometry.total) return [{ path, level: 'unavailable', color: unavailableAirQualityColor }]
  const projected = samples.reduce<Array<AirQualitySample & { progress: number }>>((result, sample) => {
    const progress = sampleProgress(sample, geometry, result.at(-1)?.progress ?? 0)
    result.push({ ...sample, progress })
    return result
  }, [])
  const partial = projected.length < expectedSampleCount
  const intervals: Array<{ start: number; end: number; level: RouteAirQualityLevel; color: string }> = []
  const add = (start: number, end: number, sample?: typeof projected[number]) => {
    if (end - start <= Number.EPSILON) return
    const level = sample ? airQualityLevel(sample.pm25) : 'unavailable'
    const color = sample ? airQualityColor(sample.pm25) : unavailableAirQualityColor
    const previous = intervals.at(-1)
    if (previous?.level === level && previous.color === color && Math.abs(previous.end - start) < .000001) previous.end = end
    else intervals.push({ start, end, level, color })
  }
  if (partial) add(0, projected[0].progress)
  projected.forEach((sample, index) => {
    const previous = projected[index - 1]
    const next = projected[index + 1]
    const start = index === 0 ? partial ? sample.progress : 0 : partial && sample.progress - previous.progress > .4 ? sample.progress - .2 : (previous.progress + sample.progress) / 2
    const end = index === projected.length - 1 ? partial ? sample.progress : 1 : partial && next.progress - sample.progress > .4 ? sample.progress + .2 : (sample.progress + next.progress) / 2
    if (partial && previous && sample.progress - previous.progress > .4) add(previous.progress + .2, sample.progress - .2)
    add(start, end, sample)
  })
  if (partial) add(projected.at(-1)!.progress, 1)
  return intervals.map((interval) => ({ path: pathBetween(path, geometry, interval.start, interval.end), level: interval.level, color: interval.color }))
}
