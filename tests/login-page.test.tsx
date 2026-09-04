import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '@/pages/auth/AuthPages'

const navigate = jest.fn()
const signInEmail = jest.fn()
const signInSocial = jest.fn()
let search = ''

jest.mock('react-router', () => ({
  Link: ({ children, to, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ search }),
  useNavigate: () => navigate,
}))
jest.mock('@/config', () => ({ authClient: { signIn: { email: (...args: unknown[]) => signInEmail(...args), social: (...args: unknown[]) => signInSocial(...args) } } }))

describe('halaman login', () => {
  beforeEach(() => { jest.clearAllMocks(); search = '' })

  it('menampilkan seluruh copy login dalam bahasa Indonesia', async () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: 'Selamat datang kembali' })).toBeInTheDocument()
    expect(screen.getByText('Masuk untuk mengakses rute tersimpan dan preferensi perjalanan Anda.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Masuk dengan Google' })).toBeInTheDocument()
    expect(screen.getByText('atau lanjutkan dengan email')).toBeInTheDocument()
    expect(screen.getByLabelText('Kata sandi')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lupa kata sandi?' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument()
    expect(screen.getByText('Belum punya akun?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Daftar' })).toHaveAttribute('href', '/register')

    await userEvent.click(screen.getByRole('button', { name: 'Tampilkan kata sandi' }))
    expect(screen.getByRole('button', { name: 'Sembunyikan kata sandi' })).toBeInTheDocument()
  })

  it('menampilkan validasi dan kegagalan login dalam bahasa Indonesia', async () => {
    const view = render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(screen.getByText('Masukkan alamat email yang valid.')).toBeInTheDocument()
    expect(screen.getByText('Kata sandi minimal 8 karakter.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.test')
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'password')
    signInEmail.mockResolvedValue({ error: new Error('invalid') })
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(await screen.findByText('Email atau kata sandi salah.')).toBeInTheDocument()

    search = '?oauth=error'
    view.unmount()
    render(<LoginPage />)
    expect(screen.getByText('Proses masuk dengan Google tidak selesai. Coba lagi.')).toBeInTheDocument()
  })
})
