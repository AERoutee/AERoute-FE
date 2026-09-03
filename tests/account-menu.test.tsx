import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountMenu, MobileAccountActions } from '@/components/layout/AccountMenu'
import { ROUTE_SUMMARY_KEY } from '@/lib/route-summary'

const navigate = jest.fn()
const mockSignOut = jest.fn()
const showToast = jest.fn()

jest.mock('react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  useNavigate: () => navigate,
}))
jest.mock('@/api/profile', () => ({ resolveProfileAvatarUrl: () => null }))
jest.mock('@/config', () => ({ authClient: { useSession: () => ({ data: { user: { name: 'Ari Rider', email: 'ari@example.test' } }, isPending: false }), signOut: (...args: unknown[]) => mockSignOut(...args) } }))
jest.mock('@/context', () => ({ useToast: () => ({ showToast }) }))
jest.mock('@/components/common', () => ({ ConfirmationDialog: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) => isOpen ? <button type="button" onClick={onConfirm}>Confirm logout</button> : null }))

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.setItem(ROUTE_SUMMARY_KEY, '{"route":"saved"}')
  mockSignOut.mockResolvedValue({ error: null })
})

describe('account logout route cleanup', () => {
  it('clears the saved route summary from the desktop account menu', async () => {
    render(<AccountMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Buka menu akun' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Keluar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm logout' }))
    await waitFor(() => expect(localStorage.getItem(ROUTE_SUMMARY_KEY)).toBeNull())
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('clears the saved route summary from mobile account actions', async () => {
    const onNavigate = jest.fn()
    render(<MobileAccountActions onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Keluar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm logout' }))
    await waitFor(() => expect(localStorage.getItem(ROUTE_SUMMARY_KEY)).toBeNull())
    expect(onNavigate).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
