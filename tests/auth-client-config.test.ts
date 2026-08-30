type AuthClientModule = typeof import('@/config/auth-client')

type AuthEnvironment = { baseURL?: string; dev?: boolean; prod?: boolean }

const originalEnv = { ...process.env }

function loadAuthClient(env: AuthEnvironment) {
  jest.resetModules()
  if (env.baseURL === undefined) delete process.env.VITE_API_BASE_URL
  else process.env.VITE_API_BASE_URL = env.baseURL
  process.env.VITE_DEV = String(env.dev ?? false)
  process.env.VITE_PROD = String(env.prod ?? false)

  const plugin = { id: 'email-otp' }
  const createAuthClient = jest.fn(() => ({ client: true }))
  const emailOTPClient = jest.fn(() => plugin)
  jest.doMock('better-auth/react', () => ({ createAuthClient }))
  jest.doMock('better-auth/client/plugins', () => ({ emailOTPClient }))

  const authModule = require('@/config/auth-client') as AuthClientModule
  return { authModule, createAuthClient, emailOTPClient, plugin }
}

afterAll(() => {
  process.env = originalEnv
  jest.dontMock('better-auth/react')
  jest.dontMock('better-auth/client/plugins')
})

describe('auth client config', () => {
  it('normalizes the base URL and wires credentialed email OTP auth', () => {
    const { authModule, createAuthClient, emailOTPClient, plugin } = loadAuthClient({
      baseURL: 'https://api.example.test/',
      prod: true,
    })

    expect(emailOTPClient).toHaveBeenCalledTimes(1)
    expect(createAuthClient).toHaveBeenCalledWith({
      baseURL: 'https://api.example.test',
      fetchOptions: { credentials: 'include' },
      plugins: [plugin],
    })
    expect(authModule.authClient).toEqual({ client: true })
  })

  it('uses the local backend in development when no base URL is configured', () => {
    const { createAuthClient } = loadAuthClient({ dev: true })

    expect(createAuthClient).toHaveBeenCalledWith(expect.objectContaining({ baseURL: 'http://localhost:3000' }))
  })

  it('rejects a missing base URL outside development', () => {
    expect(() => loadAuthClient({})).toThrow('VITE_API_BASE_URL must be configured')
  })

  it('rejects a non-HTTPS production base URL', () => {
    expect(() => loadAuthClient({ baseURL: 'http://api.example.test', prod: true })).toThrow(
      'VITE_API_BASE_URL must use HTTPS in production',
    )
  })
})
