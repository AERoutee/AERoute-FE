import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { loadGooglePlaces } from '@/config'
import { LocationInput } from '@/components/planner'

jest.mock('@/config', () => ({ loadGooglePlaces: jest.fn() }))

const fetchSuggestions = jest.fn()
const loadPlaces = loadGooglePlaces as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  loadPlaces.mockResolvedValue({})
  Object.defineProperty(globalThis, 'google', {
    configurable: true,
    value: { maps: { places: {
      AutocompleteSessionToken: class {},
      AutocompleteSuggestion: { fetchAutocompleteSuggestions: fetchSuggestions },
    } } },
  })
})

describe('LocationInput global autocomplete', () => {
  it('searches worldwide without restricting results to Indonesia', async () => {
    fetchSuggestions.mockResolvedValue({ suggestions: [] })
    render(<LocationInput id="destination" label="To" value={null} onChange={jest.fn()} />)
    await waitFor(() => expect(loadPlaces).toHaveBeenCalled())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'New York' } })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)) })

    expect(fetchSuggestions).toHaveBeenCalledWith(expect.not.objectContaining({ includedRegionCodes: expect.anything() }))
    expect(fetchSuggestions).toHaveBeenCalledWith(expect.objectContaining({ input: 'New York', language: 'en' }))
  })
})
