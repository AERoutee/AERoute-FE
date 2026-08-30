import { apiClient } from '@/config'
import {
  getRecoveryChallenge,
  requestRecoveryChallenge,
  resendRecoveryChallenge,
  resetRecoveryPassword,
  verifyRecoveryChallenge,
} from '@/api/recovery'

jest.mock('@/config', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }))

const get = apiClient.get as jest.Mock
const post = apiClient.post as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('recovery API wrappers', () => {
  it('requests a recovery challenge and unwraps data', async () => {
    const data = { id: 'challenge-1', expiresInSeconds: 300 }
    post.mockResolvedValue({ data: { data } })

    await expect(requestRecoveryChallenge('person@example.com')).resolves.toBe(data)
    expect(post).toHaveBeenCalledWith('/api/v1/recovery-challenges', { email: 'person@example.com' })
  })

  it('gets a challenge using an encoded id', async () => {
    const data = { maskedEmail: 'p***@example.com', expiresAt: '2030-01-01T00:00:00Z' }
    get.mockResolvedValue({ data: { data } })

    await expect(getRecoveryChallenge('id/with spaces?')).resolves.toBe(data)
    expect(get).toHaveBeenCalledWith('/api/v1/recovery-challenges/id%2Fwith%20spaces%3F')
  })

  it('resends a challenge using an encoded id', async () => {
    const data = { id: 'challenge-2', expiresInSeconds: 300 }
    post.mockResolvedValue({ data: { data } })

    await expect(resendRecoveryChallenge('id/2')).resolves.toBe(data)
    expect(post).toHaveBeenCalledWith('/api/v1/recovery-challenges/id%2F2/resend')
  })

  it('verifies a challenge with the OTP body', async () => {
    const data = { verified: true as const }
    post.mockResolvedValue({ data: { data } })

    await expect(verifyRecoveryChallenge('id/3', '012345')).resolves.toBe(data)
    expect(post).toHaveBeenCalledWith('/api/v1/recovery-challenges/id%2F3/verify', { otp: '012345' })
  })

  it('resets a challenge password with OTP and password', async () => {
    const data = { success: true as const }
    post.mockResolvedValue({ data: { data } })

    await expect(resetRecoveryPassword('id/4', '654321', 'new-password')).resolves.toBe(data)
    expect(post).toHaveBeenCalledWith('/api/v1/recovery-challenges/id%2F4/reset', {
      otp: '654321',
      password: 'new-password',
    })
  })
})
