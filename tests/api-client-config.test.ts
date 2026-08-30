jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => ({ client: true })) },
}))

type ApiClientModule = typeof import('@/config/api-client')
type AxiosModule = typeof import('axios')

const originalEnv = { ...process.env }

function loadApiClient(env: { baseURL?: string; dev?: boolean; prod?: boolean }) {
  if (env.baseURL === undefined) delete process.env.VITE_API_BASE_URL
  else process.env.VITE_API_BASE_URL = env.baseURL
  process.env.VITE_DEV = String(env.dev ?? false)
  process.env.VITE_PROD = String(env.prod ?? false)

  let apiModule: ApiClientModule | undefined
  let axiosModule: AxiosModule | undefined
  jest.isolateModules(() => {
    apiModule = require('@/config/api-client') as ApiClientModule
    axiosModule = require('axios') as AxiosModule
  })
  return { apiModule: apiModule!, create: axiosModule!.default.create as jest.Mock }
}

afterAll(() => {
  process.env = originalEnv
})

describe('API client config', () => {
  it('normalizes the base URL and creates a credentialed client with a timeout', () => {
    const { apiModule, create } = loadApiClient({ baseURL: 'https://api.example.test/', prod: true })

    expect(apiModule.apiBaseURL).toBe('https://api.example.test')
    expect(create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.test',
      timeout: 25_000,
      withCredentials: true,
    })
    expect(apiModule.apiClient).toEqual({ client: true })
  })

  it('uses the local backend in development when no base URL is configured', () => {
    const { apiModule } = loadApiClient({ dev: true })
    expect(apiModule.apiBaseURL).toBe('http://localhost:3000')
  })

  it('rejects a missing base URL outside development', () => {
    expect(() => loadApiClient({})).toThrow('VITE_API_BASE_URL must be configured')
  })

  it('rejects a non-HTTPS production base URL', () => {
    expect(() => loadApiClient({ baseURL: 'http://api.example.test', prod: true })).toThrow(
      'VITE_API_BASE_URL must use HTTPS in production',
    )
  })
})
