import axios from 'axios'
import { getApiErrorMessage } from '@/lib/get-api-error-message'

jest.mock('axios', () => ({ isAxiosError: jest.fn() }))

const isAxiosError = axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>

describe('getApiErrorMessage', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns an API error message', () => {
    isAxiosError.mockReturnValue(true)
    const error = { response: { data: { error: { message: 'Invalid route' } } } }
    expect(getApiErrorMessage(error, 'Fallback')).toBe('Invalid route')
  })

  it('returns a regular Error message', () => {
    isAxiosError.mockReturnValue(false)
    expect(getApiErrorMessage(new Error('Network down'), 'Fallback')).toBe('Network down')
  })

  it('uses fallback for unknown errors', () => {
    isAxiosError.mockReturnValue(false)
    expect(getApiErrorMessage(null, 'Fallback')).toBe('Fallback')
  })
})
