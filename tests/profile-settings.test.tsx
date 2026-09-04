import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { NAVIGATION_VOICE_KEY } from '@/lib/navigation-voice'

jest.mock('react-router', () => ({ useNavigate: () => jest.fn() }))
jest.mock('@/api/profile', () => ({ resolveProfileAvatarUrl: () => null }))
jest.mock('@/config', () => ({ authClient: { useSession: () => ({ data: { user: { name: 'Ari Rider', email: 'ari@example.test' } }, refetch: jest.fn() }), listAccounts: jest.fn().mockResolvedValue({ data: [] }), updateUser: jest.fn(), changePassword: jest.fn(), emailOtp: { requestPasswordReset: jest.fn() } } }))
jest.mock('@/context', () => ({ useToast: () => ({ showToast: jest.fn() }) }))
jest.mock('@/hooks/profile', () => ({ useMutationUploadProfileAvatar: () => ({ isPending: false }), useMutationRemoveProfileAvatar: () => ({ isPending: false }) }))
jest.mock('@/pages/profile/components', () => ({ AvatarActionDialog: () => null, AvatarCropDialog: () => null, EditNameDialog: () => null, ProfileRoadRibbon: () => null }))

describe('navigation voice setting', () => {
  beforeEach(() => localStorage.clear())

  it('stores the voice guidance preference in the settings page', async () => {
    render(<ProfilePage />)
    const toggle = screen.getByRole('switch', { name: 'Panduan suara navigasi' })
    expect(toggle).toBeChecked()
    expect(toggle.closest('section')).toBe(screen.getAllByRole('region').at(-1))

    await userEvent.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(localStorage.getItem(NAVIGATION_VOICE_KEY)).toBe('false')
  })
})
