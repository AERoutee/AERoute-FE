export type AirQualityLevel = 'low' | 'moderate' | 'high'

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
