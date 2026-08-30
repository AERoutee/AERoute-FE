import { apiClient } from '@/config'
import { removeProfileAvatar, resolveProfileAvatarUrl, uploadProfileAvatar } from '@/api/profile'

jest.mock('@/config', () => ({ apiBaseURL: 'https://api.example.test', apiClient: { put: jest.fn(), delete: jest.fn() } }))

const put = apiClient.put as jest.Mock
const deleteRequest = apiClient.delete as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('profile API wrappers', () => {
  it('uploads an avatar as multipart FormData with the expected filename', async () => {
    const file = new Blob(['avatar-data'], { type: 'image/webp' })
    const data = { image: '/uploads/avatar.webp' }
    put.mockResolvedValue({ data: { data } })

    await expect(uploadProfileAvatar(file)).resolves.toBe(data)
    expect(put).toHaveBeenCalledWith('/api/v1/profile/avatar', expect.any(FormData))

    const body = put.mock.calls[0][1] as FormData
    expect(body.get('avatar')).toBeInstanceOf(File)
    expect(body.get('avatar')).toMatchObject({ name: 'avatar.webp', type: 'image/webp' })
  })

  it('removes the avatar with DELETE and unwraps the response', async () => {
    const data = { image: null }
    deleteRequest.mockResolvedValue({ data: { data } })

    await expect(removeProfileAvatar()).resolves.toBe(data)
    expect(deleteRequest).toHaveBeenCalledWith('/api/v1/profile/avatar')
  })
})

describe('profile avatar URL resolution', () => {
  it.each([
    ['/api/v1/profile/avatar/user-1?v=1', 'https://api.example.test/api/v1/profile/avatar/user-1?v=1'],
    ['http://localhost:3000/api/v1/profile/avatar/user-1?v=2', 'https://api.example.test/api/v1/profile/avatar/user-1?v=2'],
    ['https://accounts.google.com/avatar.png', 'https://accounts.google.com/avatar.png'],
    ['https://cdn.example.test/avatar.webp', 'https://cdn.example.test/avatar.webp'],
    ['not a URL', 'not a URL'],
  ])('resolves %s', (value, expected) => expect(resolveProfileAvatarUrl(value)).toBe(expected))

  it('preserves empty values', () => {
    expect(resolveProfileAvatarUrl(null)).toBeNull()
    expect(resolveProfileAvatarUrl(undefined)).toBeUndefined()
  })
})
