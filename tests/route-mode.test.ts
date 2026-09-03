import { itineraryModeRequest, itineraryModeRequests, nextModeSelection, routeViews, savedCommuteInput, savedCommuteRequest, savedCommuteSelectedModes, selectedModeLabel, transitStops } from '@/lib/route-mode'
import type { RouteOption, SavedCommute } from '@/types'
import { plannerRequest, routeComparison, routeOption } from './route-fixtures'

describe('single-itinerary mode data', () => {
  it.each([
    [['WALK'], { mode: 'WALK', label: 'Jalan' }],
    [['BICYCLE'], { mode: 'BICYCLE', label: 'Sepeda' }],
    [['BUS'], { mode: 'TRANSIT', transitModes: ['BUS'], label: 'Bus' }],
    [['WALK', 'BUS'], { mode: 'TRANSIT', transitModes: ['BUS'], label: 'Jalan + Bus' }],
    [['BUS', 'TRAIN'], { mode: 'TRANSIT', transitModes: ['BUS', 'TRAIN'], label: 'Bus + Kereta' }],
    [['TRAIN', 'SUBWAY'], { mode: 'TRANSIT', transitModes: ['TRAIN', 'SUBWAY'], label: 'Kereta + MRT' }],
  ] as const)('maps %j to one request', (modes, expected) => {
    expect(itineraryModeRequest(modes)).toEqual(expected)
  })

  it('keeps at least one mode and allows all five in deterministic order', () => {
    expect(nextModeSelection(['WALK'], 'WALK')).toEqual(['WALK'])
    expect(nextModeSelection(['WALK'], 'BICYCLE')).toEqual(['WALK', 'BICYCLE'])
    expect(nextModeSelection(['BICYCLE'], 'WALK')).toEqual(['WALK', 'BICYCLE'])
    expect(nextModeSelection(['WALK', 'BICYCLE'], 'BUS')).toEqual(['WALK', 'BICYCLE', 'BUS'])
    expect(nextModeSelection(['BICYCLE'], 'TRAIN')).toEqual(['BICYCLE', 'TRAIN'])
    expect(nextModeSelection(['TRAIN'], 'BUS')).toEqual(['BUS', 'TRAIN'])
    expect(nextModeSelection(['WALK', 'BICYCLE', 'BUS', 'TRAIN'], 'SUBWAY')).toEqual(['WALK', 'BICYCLE', 'BUS', 'TRAIN', 'SUBWAY'])
  })

  it('builds ordered composite and native fallback transit tasks', () => {
    const common = { origin: plannerRequest('WALK').origin, destination: plannerRequest('WALK').destination, preference: 'lower-exposure' as const, sensitiveUser: true, transitPreference: 'FEWER_TRANSFERS' as const, accessibilityMode: 'REDUCED_EXERTION' as const, departureOffsetsMinutes: [0, 30, 60] as Array<0 | 30 | 60>, hazardPolicy: 'PREFER_FEWER_REPORTS' as const, includeRestStops: true }
    const { transitPreference: _transitPreference, ...activeCommon } = common
    expect(itineraryModeRequests(['BICYCLE', 'WALK'], common)).toEqual([
      { id: 'WALK', label: 'Jalan', selectedModes: ['WALK'], request: { ...activeCommon, mode: 'WALK' } },
      { id: 'BICYCLE', label: 'Sepeda', selectedModes: ['BICYCLE'], request: { ...activeCommon, mode: 'BICYCLE' } },
    ])
    expect(itineraryModeRequests(['WALK', 'BUS'], common)).toEqual([
      { id: 'TRANSIT', label: 'Jalan + Bus', selectedModes: ['WALK', 'BUS'], request: { ...common, mode: 'TRANSIT', transitModes: ['BUS'], transitPreference: 'FEWER_TRANSFERS' } },
    ])
    expect(itineraryModeRequests(['WALK', 'BUS', 'TRAIN'], common)).toEqual([
      { id: 'TRANSIT', label: 'Jalan + Bus + Kereta', selectedModes: ['WALK', 'BUS', 'TRAIN'], request: { ...common, mode: 'TRANSIT', transitModes: ['BUS', 'TRAIN'], transitPreference: 'FEWER_TRANSFERS' } },
    ])
    expect(itineraryModeRequests(['WALK'], common)[0].request.includeRestStops).toBe(true)
    expect(itineraryModeRequests(['WALK', 'BICYCLE', 'TRAIN'], common)).toEqual([
      { id: 'BIKE_TRANSIT', label: 'Sepeda + Kereta + Jalan', selectedModes: ['WALK', 'BICYCLE', 'TRAIN'], request: { ...common, mode: 'TRANSIT', transitModes: ['TRAIN'], accessPlan: { firstMileMode: 'BICYCLE', lastMileMode: 'WALK', bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' }, departureOffsetsMinutes: [0], includeRestStops: false } },
      { id: 'TRANSIT_FALLBACK', label: 'Kereta', selectedModes: ['TRAIN'], request: { ...common, mode: 'TRANSIT', transitModes: ['TRAIN'] } },
    ])
    expect(itineraryModeRequests(['BICYCLE', 'BUS', 'TRAIN'], common).map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'BIKE_TRANSIT', label: 'Sepeda + Bus + Kereta' },
      { id: 'TRANSIT_FALLBACK', label: 'Bus + Kereta' },
    ])
    expect(itineraryModeRequests(['WALK', 'BICYCLE', 'BUS', 'TRAIN', 'SUBWAY'], common)).toEqual([
      { id: 'BIKE_TRANSIT', label: 'Sepeda + Bus + Kereta + MRT + Jalan', selectedModes: ['WALK', 'BICYCLE', 'BUS', 'TRAIN', 'SUBWAY'], request: { ...common, mode: 'TRANSIT', transitModes: ['BUS', 'TRAIN', 'SUBWAY'], accessPlan: { firstMileMode: 'BICYCLE', lastMileMode: 'WALK', bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' }, departureOffsetsMinutes: [0], includeRestStops: false } },
      { id: 'TRANSIT_FALLBACK', label: 'Bus + Kereta + MRT', selectedModes: ['BUS', 'TRAIN', 'SUBWAY'], request: { ...common, mode: 'TRANSIT', transitModes: ['BUS', 'TRAIN', 'SUBWAY'] } },
    ])
  })

  it('creates task-prefixed route keys and saves exact atomic ownership', () => {
    const comparison = routeComparison('same', [routeOption('duplicate')])
    const walk = routeViews('WALK', ['WALK'], plannerRequest('WALK'), comparison)
    const cycle = routeViews('BICYCLE', ['BICYCLE'], plannerRequest('BICYCLE'), comparison)
    const composite = routeViews('BIKE_TRANSIT', ['BICYCLE', 'TRAIN'], { ...plannerRequest('TRAIN'), accessPlan: { firstMileMode: 'BICYCLE', lastMileMode: 'WALK', bicyclePlan: 'PARK_AT_FIRST_TRANSIT_STOP' } }, { ...comparison, persisted: false })
    expect([walk[0].key, cycle[0].key, composite[0].key]).toEqual(['WALK:same:duplicate', 'BICYCLE:same:duplicate', 'BIKE_TRANSIT:same:duplicate'])
    expect(savedCommuteInput(cycle[0])).toMatchObject({ mode: 'BICYCLE', watchEnabled: false, watchHour: null })
  })

  it('creates one route list and saves exact transit preferences', () => {
    const comparison = routeComparison('transit', [routeOption('alt', []), routeOption('recommended')])
    const request = { ...plannerRequest('BUS'), transitModes: ['BUS' as const], transitPreference: 'FEWER_TRANSFERS' as const }
    const views = routeViews('TRANSIT', ['WALK', 'BUS'], request, comparison)
    expect(views.map((view) => view.key)).toEqual(['TRANSIT:transit:alt', 'TRANSIT:transit:recommended'])
    expect(views[0].modeLabel).toBe('Jalan + Bus')
    expect(savedCommuteInput(views[0])).toMatchObject({ mode: 'TRANSIT', transitModes: ['BUS'], transitPreference: 'FEWER_TRANSFERS' })
    expect(savedCommuteInput(views[0])).not.toHaveProperty('selectedModes')
  })

  it.each([
    [['BUS', 'TRAIN'], ['BUS', 'TRAIN']],
    [['TRAIN', 'RAIL', 'LIGHT_RAIL'], ['TRAIN']],
    [['SUBWAY', 'RAIL'], ['SUBWAY']],
    [['RAIL'], ['BUS']],
    [undefined, ['BUS']],
    [[], ['BUS']],
  ] as const)('restores saved transit modes %j as visible modes %j', (transitModes, expected) => {
    const commute = { mode: 'TRANSIT', ...(transitModes ? { transitModes: [...transitModes] } : {}) } as SavedCommute
    expect(savedCommuteSelectedModes(commute)).toEqual(expected)
  })

  it('builds the initial saved commute request from exact persisted backend fields', () => {
    const commute = {
      id: 'commute',
      name: 'Home to work',
      origin: { label: 'Home', latitude: 1, longitude: 2 },
      destination: { label: 'Work', latitude: 3, longitude: 4 },
      mode: 'TRANSIT',
      preference: 'lower-exposure',
      sensitiveUser: true,
      transitModes: ['TRAIN', 'RAIL', 'LIGHT_RAIL'],
      transitPreference: 'FEWER_TRANSFERS',
      accessibilityMode: 'REDUCED_EXERTION',
      watchEnabled: true,
      watchHour: 8,
      createdAt: '',
      updatedAt: '',
    } as SavedCommute
    const origin = { id: 'origin', label: 'Home', detail: '', latitude: 1, longitude: 2 }
    const destination = { id: 'destination', label: 'Work', detail: '', latitude: 3, longitude: 4 }
    expect(savedCommuteRequest(commute, origin, destination, { departureOffsetsMinutes: [0, 30, 60], hazardPolicy: 'PREFER_FEWER_REPORTS', includeRestStops: true })).toEqual({
      origin,
      destination,
      mode: 'TRANSIT',
      preference: 'lower-exposure',
      sensitiveUser: true,
      transitModes: ['TRAIN', 'RAIL', 'LIGHT_RAIL'],
      transitPreference: 'FEWER_TRANSFERS',
      accessibilityMode: 'REDUCED_EXERTION',
      departureOffsetsMinutes: [0, 30, 60],
      hazardPolicy: 'PREFER_FEWER_REPORTS',
      includeRestStops: true,
    })
  })

  it('derives ordered known-coordinate transit stops without route-sensitive data', () => {
    const route = { ...routeOption(), transitSummary: { walkingDurationSeconds: 120, walkingDistanceMeters: 150, transfers: 0, stations: [], segments: [
      { travelMode: 'WALK', durationSeconds: 120, distanceMeters: 150 },
      { travelMode: 'BUS', vehicleType: 'BUS', lineShortName: '7', headsign: 'Park', departureStop: { name: 'Central', location: { latitude: 1, longitude: 2 } }, arrivalStop: { name: 'Park', location: { latitude: 3, longitude: 4 } } },
    ] } }
    expect(transitStops(route)).toEqual([
      { name: 'Central', location: { latitude: 1, longitude: 2 }, ordinal: 1, role: 'departure', vehicleType: 'BUS', line: '7', headsign: 'Park', label: 'B1' },
      { name: 'Park', location: { latitude: 3, longitude: 4 }, ordinal: 2, role: 'arrival', vehicleType: 'BUS', line: '7', headsign: 'Park', label: 'B2' },
    ])
    const composite = { ...routeOption(), transitSummary: { walkingDurationSeconds: 240, walkingDistanceMeters: 300, transfers: 0, stations: [], segments: [
      { role: 'FIRST_MILE', source: 'GOOGLE_ROUTES', mode: 'BICYCLE', durationSeconds: 600, distanceMeters: 2000 },
      { role: 'WAIT', source: 'DERIVED_FROM_TRANSIT_SCHEDULE', mode: 'WAIT', durationSeconds: 300, distanceMeters: 0, location: { latitude: 1, longitude: 2 } },
      { role: 'TRANSIT_RIDE', source: 'GOOGLE_ROUTES', mode: 'TRANSIT', durationSeconds: 900, distanceMeters: 5000, vehicleType: 'TRAIN', lineShortName: 'R03A', departureStop: { name: 'Central', location: { latitude: 1, longitude: 2 } }, arrivalStop: { name: 'Park', location: { latitude: 3, longitude: 4 } } },
      { role: 'LAST_MILE', source: 'GOOGLE_ROUTES', mode: 'WALK', durationSeconds: 240, distanceMeters: 300 },
    ] } } as RouteOption
    expect(transitStops(composite)).toEqual([
      { name: 'Central', location: { latitude: 1, longitude: 2 }, ordinal: 1, role: 'departure', vehicleType: 'TRAIN', line: 'R03A', label: 'T1' },
      { name: 'Park', location: { latitude: 3, longitude: 4 }, ordinal: 2, role: 'arrival', vehicleType: 'TRAIN', line: 'R03A', label: 'T2' },
    ])
    expect(selectedModeLabel(['WALK', 'BUS'])).toBe('Jalan + Bus')
    expect(selectedModeLabel(['BUS', 'WALK'])).toBe('Jalan + Bus')
  })
})
