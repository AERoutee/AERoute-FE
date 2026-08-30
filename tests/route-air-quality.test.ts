import { airQualityColor, airQualityLevel } from '@/lib/route-air-quality'

describe('route air-quality classification', () => {
  it.each([
    [0, 'low', '#0a9b68'],
    [15, 'low', '#0a9b68'],
    [15.1, 'moderate', '#e6a51c'],
    [35, 'moderate', '#e6a51c'],
    [35.1, 'high', '#c0442b'],
  ] as const)('classifies %s PM2.5 as %s', (pm25, level, color) => {
    expect(airQualityLevel(pm25)).toBe(level)
    expect(airQualityColor(pm25)).toBe(color)
  })
})
