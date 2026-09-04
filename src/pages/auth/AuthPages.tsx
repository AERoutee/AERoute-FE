import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, UserRound, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { requestRecoveryChallenge } from '@/api'
import { authLoginPhoto as loginPhoto, authRegisterPhoto as registerPhoto } from '@/assets'
import { authClient } from '@/config'

const inputClass = 'min-h-11 w-full rounded-xl border border-ae-border/70 bg-white px-4 text-sm font-bold text-ae-ink outline-none placeholder:font-semibold placeholder:text-ae-muted/70 focus:border-ae-brand focus:ring-4 focus:ring-ae-brand/10'
const buttonClass = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ae-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-ae-brand disabled:opacity-60'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = Record<string, string | undefined>

function Skateboarder({ color, flip = false, pace = 5.2 }: { color: string; flip?: boolean; pace?: number }) {
  const times = [0, .08, .16, .24, .32, .42, .64, .72, .8, .9, 1]
  const cycle = { duration: pace, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' as const, times }
  const stanceLeg = ['M47 38L58 48L66 52','M47 38L58 48L66 52','M47 38L58 48L66 52','M47 38L58 48L66 52','M47 38L58 48L66 52','M47 38L58 48L66 52','M47 28L54 35L60 39','M47 26L54 32L60 36','M47 30L55 38L62 42','M47 39L56 48L64 52','M47 38L58 48L66 52']
  const pushLeg = ['M43 38L35 48L27 53','M43 38L34 50L25 58','M43 38L25 46L11 57','M43 38L33 45L24 49','M43 38L34 50L25 58','M43 38L35 48L27 53','M43 28L37 34L31 38','M43 26L37 32L31 36','M43 30L36 38L29 42','M43 39L34 48L27 53','M43 38L35 48L27 53']
  const arms = ['M43 24L30 34M48 24L62 34','M43 24L30 35M48 24L62 33','M43 24L28 34M48 24L64 32','M43 24L30 34M48 24L62 34','M43 24L29 35M48 24L63 33','M43 24L30 34M48 24L62 34','M43 15L21 18M48 15L70 17','M43 13L20 11M48 13L71 10','M43 17L24 21M48 17L68 20','M43 26L29 37M48 26L64 36','M43 24L30 34M48 24L62 34']
  const torso = ['M35 18C42 12 52 16 55 25L48 36L36 31Z','M35 19C42 13 52 17 55 26L48 37L36 32Z','M35 18C42 12 52 16 55 25L48 36L36 31Z','M35 18C42 12 52 16 55 25L48 36L36 31Z','M35 19C42 13 52 17 55 26L48 37L36 32Z','M35 18C42 12 52 16 55 25L48 36L36 31Z','M35 9C42 3 52 7 55 16L48 27L36 22Z','M35 7C42 1 52 5 55 14L48 25L36 20Z','M35 11C42 5 52 9 55 18L48 29L36 24Z','M35 21C42 15 52 19 55 28L48 39L36 34Z','M35 18C42 12 52 16 55 25L48 36L36 31Z']
  return (
    <svg className={`overflow-visible ${flip ? '-scale-x-100' : ''}`} viewBox="0 0 90 66" fill="none">
      <motion.ellipse cx="45" cy="61" rx="31" ry="3" fill="#142922" fillOpacity=".13" animate={{ rx: [31,28,31,28,31,25,20,17,21,29,31], opacity: [.13,.1,.13,.1,.13,.08,.04,.02,.05,.11,.13] }} transition={cycle} />
      <g strokeLinecap="round" strokeLinejoin="round">
        <motion.g style={{ transformOrigin: '47px 55px' }} animate={{ y: [0,0,0,0,0,-5,-13,-16,-11,-2,0], rotate: [0,0,0,0,-5,-10,-4,4,1,-3,0], scaleY: [1,1,1,1,1,1,.32,-.18,.38,.82,1] }} transition={cycle}>
          <path d="M23 55C38 59 55 58 71 53" stroke="#263B73" strokeWidth="4" />
          <circle cx="31" cy="59" r="3" fill="#26312D" /><circle cx="64" cy="57" r="3" fill="#26312D" />
        </motion.g>
        <motion.path d={stanceLeg[0]} animate={{ d: stanceLeg }} transition={cycle} stroke="#17382D" strokeWidth="7" />
        <motion.path d={pushLeg[0]} animate={{ d: pushLeg }} transition={cycle} stroke="#17382D" strokeWidth="7" />
        <motion.path d={arms[0]} animate={{ d: arms }} transition={cycle} stroke="#D59B73" strokeWidth="6" />
        <motion.path d={torso[0]} animate={{ d: torso }} transition={cycle} fill={color} stroke="#17221F" strokeWidth="2.5" />
        <motion.g animate={{ y: [0,1,0,1,4,-2,-9,-11,-7,3,0] }} transition={cycle}><circle cx="39" cy="11" r="7" fill="#D59B73" stroke="#17221F" strokeWidth="2.5" /><path d="M32 10C34 3 45 3 48 10Z" fill="#17382D" /></motion.g>
      </g>
    </svg>
  )
}

function ScooterRider({ color, flip = false, duration, delay, repeatDelay }: { color: string; flip?: boolean; duration: number; delay: number; repeatDelay: number }) {
  const push = { duration, delay, repeat: Infinity, repeatDelay, ease: 'easeInOut' as const, times: [0, .07, .14, .2, .27, .4, .47, .54, .61, .68, 1] }
  return (
    <motion.svg className={flip ? '-scale-x-100' : ''} viewBox="0 0 90 68" fill="none" animate={{ y: [0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0] }} transition={push}>
      <motion.ellipse cx="47" cy="63" rx="30" ry="3" fill="#142922" fillOpacity=".13" animate={{ rx: [30, 30, 27, 30, 30, 30, 30, 27, 30, 30, 30], opacity: [.13, .13, .1, .13, .13, .13, .13, .1, .13, .13, .13] }} transition={push} />
      <g strokeLinecap="round" strokeLinejoin="round">
        <motion.g style={{ transformOrigin: '27px 58px' }} animate={{ rotate: [0, 180, 360] }} transition={{ duration, delay, repeat: Infinity, repeatDelay, ease: 'linear' }}><circle cx="27" cy="58" r="7" fill="white" stroke="#26312D" strokeWidth="3" /><path d="M27 51V65M20 58H34" stroke="#9BA9A3" /></motion.g><motion.g style={{ transformOrigin: '66px 58px' }} animate={{ rotate: [0, 180, 360] }} transition={{ duration, delay, repeat: Infinity, repeatDelay, ease: 'linear' }}><circle cx="66" cy="58" r="7" fill="white" stroke="#26312D" strokeWidth="3" /><path d="M66 51V65M59 58H73" stroke="#9BA9A3" /></motion.g>
        <path d="M27 52H57L65 25M60 27H72" stroke="#087F5B" strokeWidth="4" />
        <motion.path d="M48 39L59 52L65 54" animate={{ d: ['M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50','M48 39L53 47L56 50'] }} transition={push} stroke="#17382D" strokeWidth="7" />
        <motion.path d="M45 39L34 50L25 57" animate={{ d: ['M45 39L48 47L51 50','M45 39L37 49L29 58','M45 39L27 48L14 58','M45 39L35 48L27 53','M45 39L48 47L51 50','M45 39L48 47L51 50','M45 39L37 49L29 58','M45 39L27 48L14 58','M45 39L35 48L27 53','M45 39L48 47L51 50','M45 39L48 47L51 50'] }} transition={push} stroke="#17382D" strokeWidth="7" />
        <path d="M44 23L61 28M49 23L66 28" stroke="#C9825D" strokeWidth="5" />
        <motion.path d="M38 17C45 11 55 15 58 24L52 36L40 31Z" fill={color} stroke="#17221F" strokeWidth="2.5" animate={{ d: ['M38 17C45 11 55 15 58 24L52 36L40 31Z','M38 18C45 12 55 16 58 25L52 37L40 32Z','M38 17C45 11 55 15 58 24L52 36L40 31Z','M38 18C45 12 55 16 58 25L52 37L40 32Z','M38 17C45 11 55 15 58 24L52 36L40 31Z','M38 18C45 12 55 16 58 25L52 37L40 32Z','M38 17C45 11 55 15 58 24L52 36L40 31Z','M38 17C45 11 55 15 58 24L52 36L40 31Z','M38 17C45 11 55 15 58 24L52 36L40 31Z'] }} transition={push} />
        <circle cx="42" cy="11" r="7" fill="#C9825D" stroke="#17221F" strokeWidth="2.5" /><path d="M35 10C37 3 48 3 51 10Z" fill="#2B211C" />
      </g>
    </motion.svg>
  )
}

function AuthStreetAnimation() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 overflow-hidden bg-transparent sm:h-40 lg:h-20 [@media(max-height:680px)]:hidden" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 h-9 bg-[#d8ddd8]" />
      <div className="absolute inset-x-0 bottom-8 h-1 bg-[#fdfcf7]" />
      <div className="absolute bottom-9 left-[8%] h-7 w-14 rounded-t-full bg-[#76a77f]" />
      <div className="absolute right-[10%] bottom-9 h-5 w-20 rounded-t-full bg-[#8bb592]" />
      <div className="absolute bottom-0 left-[24%] h-9 w-px bg-[#bcc7c0]" />
      <div className="absolute right-[30%] bottom-0 h-9 w-px bg-[#bcc7c0]" />
      <motion.div className="absolute bottom-4 left-[-5rem] w-16" animate={{ x: 'calc(100vw + 10rem)' }} transition={{ duration: 12.4, delay: .6, repeat: Infinity, repeatDelay: 1.8, ease: 'linear' }}><Skateboarder color="#E987A1" pace={5.4} /></motion.div>
      <motion.div className="absolute bottom-4 left-[-8rem] w-14" animate={{ x: 'calc(100vw + 13rem)', y: [0, 0, -11, -2, 0], rotate: [0, 0, 10, -5, 0] }} transition={{ duration: 16.7, delay: 4.1, times: [0, .52, .57, .63, 1], repeat: Infinity, repeatDelay: 3.3, ease: 'linear' }}><ScooterRider color="#8C9DE8" duration={16.7} delay={4.1} repeatDelay={3.3} /></motion.div>
      <motion.div className="absolute right-[-6rem] bottom-4 w-14" animate={{ x: 'calc(-100vw - 12rem)', y: [0, 0, -15, -4, 0], rotate: [0, 0, -8, 6, 0] }} transition={{ duration: 14.3, delay: 7.8, times: [0, .44, .5, .57, 1], repeat: Infinity, repeatDelay: 2.2, ease: 'linear' }}><ScooterRider color="#F2C45D" flip duration={14.3} delay={7.8} repeatDelay={2.2} /></motion.div>
      <motion.div className="absolute right-[-7rem] bottom-4 w-16" animate={{ x: 'calc(-100vw - 13rem)' }} transition={{ duration: 18.8, delay: 10.6, repeat: Infinity, repeatDelay: 4.4, ease: 'linear' }}><Skateboarder color="#63B98B" flip pace={6.1} /></motion.div>
    </div>
  )
}

type AuthLayoutProps = {
  children: ReactNode
  title: string
  description: string
  photo: string
  photoPosition?: string
  fullHeight?: boolean
  backLabel?: string
}

function AuthLayout({ children, title, description, photo, photoPosition = 'center', fullHeight = false, backLabel = 'Back' }: AuthLayoutProps) {
  return (
    <main
      id="main-content"
      className={`grid bg-white lg:grid-cols-[minmax(28rem,0.9fr)_minmax(0,1.1fr)] ${fullHeight ? 'h-svh overflow-hidden' : 'min-h-[calc(100svh-72px)] lg:h-[calc(100dvh-72px)] lg:overflow-hidden'}`}
      tabIndex={-1}
    >
      <section className={`relative flex min-h-0 min-w-0 justify-center overflow-x-hidden bg-white px-5 sm:px-10 lg:px-12 xl:px-16 ${fullHeight ? 'h-full items-start overflow-y-auto py-5 pb-54 sm:items-center sm:py-6 sm:pb-42 lg:overflow-hidden lg:py-4 lg:pb-22 [@media(max-height:680px)]:pb-6' : 'items-center py-8 lg:overflow-y-auto lg:py-10'}`}>
        <div className="w-full max-w-[27rem]">
          <Link className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm font-extrabold text-ae-muted no-underline hover:text-ae-brand sm:mb-4" to="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </Link>
          <h1 className="m-0 text-3xl leading-[1.05] font-black tracking-[-.045em] text-ae-ink sm:text-4xl xl:text-[2.5rem]">{title}</h1>
          <p className="mt-2 mb-4 max-w-md text-sm leading-5 font-semibold text-ae-muted sm:text-base sm:leading-6">{description}</p>
          {children}
        </div>
        <AuthStreetAnimation />
      </section>
      <aside className="relative hidden min-h-full overflow-hidden bg-ae-ink lg:block" aria-hidden="true">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: photoPosition }}
          src={photo}
          alt=""
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,41,34,0.08),rgba(20,41,34,0.28))]" aria-hidden="true" />
      </aside>
    </main>
  )
}

type FieldProps = {
  label: string
  id: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete?: string
  icon: LucideIcon
  error?: string
}

function Field({ label, id, type = 'text', value, onChange, placeholder, autoComplete, icon: Icon, error }: FieldProps) {
  const errorId = `${id}-error`

  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold text-ae-ink" htmlFor={id}>{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ae-brand" aria-hidden="true" />
        <input
          className={`${inputClass} pl-12 ${error ? 'border-ae-fastest' : ''}`}
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          required
        />
      </div>
      {error && <p className="mt-2 text-sm font-bold text-ae-fastest" id={errorId} role="alert">{error}</p>}
    </div>
  )
}

type PasswordFieldProps = {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  error?: string
  hint?: string
  showLabel?: string
  hideLabel?: string
}

function PasswordField({ label, id, value, onChange, autoComplete, error, hint, showLabel = 'Show password', hideLabel = 'Hide password' }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold text-ae-ink" htmlFor={id}>{label}</label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ae-brand" aria-hidden="true" />
        <input
          className={`${inputClass} pr-12 pl-12 ${error ? 'border-ae-fastest' : ''}`}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required
        />
        <button
          className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft"
          type="button"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {hint && !error && <p className="mt-2 text-xs font-semibold text-ae-muted" id={hintId}>{hint}</p>}
      {error && <p className="mt-2 text-sm font-bold text-ae-fastest" id={errorId} role="alert">{error}</p>}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.01v2.55h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.63A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.31.31-1.92V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.55l3.35-2.63Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.63C7.18 7.71 9.39 5.95 12 5.95Z" />
    </svg>
  )
}

function OAuthSection({ mode }: { mode: 'login' | 'register' }) {
  const errorPath = mode === 'login' ? '/login' : '/register'
  const actionLabel = mode === 'login' ? 'Masuk dengan Google' : 'Sign up with Google'
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function continueWithGoogle() {
    setPending(true)
    setError('')
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/dashboard`,
        newUserCallbackURL: `${window.location.origin}/dashboard`,
        errorCallbackURL: `${window.location.origin}${errorPath}?oauth=error`,
        requestSignUp: mode === 'register',
      })
      if (result.error) setError(mode === 'login' ? 'Proses masuk dengan Google tidak dapat diselesaikan.' : 'Google sign-up could not be completed.')
    } catch {
      setError(mode === 'login' ? 'Proses masuk dengan Google sementara tidak tersedia.' : 'Google sign-up is temporarily unavailable.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-ae-border bg-white px-5 py-2.5 text-sm font-extrabold text-ae-ink transition hover:border-ae-brand hover:bg-ae-soft disabled:opacity-60"
        type="button"
        onClick={continueWithGoogle}
        disabled={pending}
      >
        <GoogleIcon />
        {pending ? mode === 'login' ? 'Menghubungkan…' : 'Connecting…' : actionLabel}
      </button>
      {error && <p className="-mt-1 text-sm font-bold text-ae-fastest" role="alert">{error}</p>}
      <div className="flex items-center gap-3 text-xs font-extrabold text-ae-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-ae-line" />
        {mode === 'login' ? 'atau lanjutkan dengan email' : 'or continue with email'}
        <span className="h-px flex-1 bg-ae-line" />
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState(
    new URLSearchParams(location.search).get('oauth') === 'error' ? 'Proses masuk dengan Google tidak selesai. Coba lagi.' : '',
  )
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    if (!emailPattern.test(email.trim())) nextErrors.email = 'Masukkan alamat email yang valid.'
    if (password.length < 8) nextErrors.password = 'Kata sandi minimal 8 karakter.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.values(nextErrors).some(Boolean)) return
    setPending(true)
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) {
        setFormError('Email atau kata sandi salah.')
        return
      }
      navigate('/dashboard')
    } catch {
      setFormError('Layanan masuk sementara tidak tersedia. Coba lagi nanti.')
    } finally {
      setPending(false)
    }
  }

  const resetCompleted = new URLSearchParams(location.search).get('reset') === '1'

  return (
    <AuthLayout
      title="Selamat datang kembali"
      description={resetCompleted ? 'Kata sandi Anda sudah diperbarui. Masuk untuk melanjutkan.' : 'Masuk untuk mengakses rute tersimpan dan preferensi perjalanan Anda.'}
      photo={loginPhoto}
      photoPosition="62% center"
      fullHeight
      backLabel="Kembali"
    >
      <div className="grid gap-3 sm:gap-4">
        <OAuthSection mode="login" />
        <form className="grid gap-3 sm:gap-4" onSubmit={submit} noValidate>
          <Field label="Email" id="login-email" type="email" value={email} onChange={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: undefined })) }} placeholder="name@email.com" autoComplete="email" icon={Mail} error={errors.email} />
          <PasswordField label="Kata sandi" id="login-password" value={password} onChange={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })) }} autoComplete="current-password" error={errors.password} showLabel="Tampilkan kata sandi" hideLabel="Sembunyikan kata sandi" />
          <div className="flex justify-end"><Link className="text-sm font-extrabold text-ae-brand underline underline-offset-4" to="/forgot-password">Lupa kata sandi?</Link></div>
          {formError && <p className="-mt-1 text-sm font-bold text-ae-fastest" role="alert">{formError}</p>}
          <button className={buttonClass} type="submit" disabled={pending}>{pending ? 'Sedang masuk…' : 'Masuk'}</button>
          <p className="text-center text-sm font-bold text-ae-muted">Belum punya akun? <Link className="font-black text-ae-brand underline underline-offset-4" to="/register">Daftar</Link></p>
        </form>
      </div>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    if (name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters.'
    if (!emailPattern.test(email.trim())) nextErrors.email = 'Enter a valid email address.'
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
    if (password !== confirmation) nextErrors.confirmation = 'Passwords do not match.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.values(nextErrors).some(Boolean)) return
    setPending(true)
    try {
      const result = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      if (result.error) {
        setFormError('Registration could not be completed. Check your details and try again.')
        return
      }
      navigate('/dashboard')
    } catch {
      setFormError('Registration is temporarily unavailable. Try again later.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Create an account" description="Save routes and reuse your travel preferences." photo={registerPhoto} photoPosition="58% center" fullHeight>
      <div className="grid gap-3 sm:gap-4 lg:gap-3">
        <OAuthSection mode="register" />
        <form className="grid gap-3 sm:gap-4 lg:gap-3" onSubmit={submit} noValidate>
          <Field label="Name" id="register-name" value={name} onChange={(value) => { setName(value); setErrors((current) => ({ ...current, name: undefined })) }} placeholder="Full name" autoComplete="name" icon={UserRound} error={errors.name} />
          <Field label="Email" id="register-email" type="email" value={email} onChange={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: undefined })) }} placeholder="name@email.com" autoComplete="email" icon={Mail} error={errors.email} />
          <PasswordField label="Password" id="register-password" value={password} onChange={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })) }} autoComplete="new-password" error={errors.password} hint="Use at least 8 characters." />
          <PasswordField label="Confirm password" id="register-confirmation" value={confirmation} onChange={(value) => { setConfirmation(value); setErrors((current) => ({ ...current, confirmation: undefined })) }} autoComplete="new-password" error={errors.confirmation} />
          {formError && <p className="-mt-1 text-sm font-bold text-ae-fastest" role="alert">{formError}</p>}
          <button className={buttonClass} type="submit" disabled={pending}>{pending ? 'Creating account…' : 'Create account'}</button>
          <p className="text-center text-sm font-bold text-ae-muted">Already have an account? <Link className="font-black text-ae-brand underline underline-offset-4" to="/login">Sign in</Link></p>
        </form>
      </div>
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!emailPattern.test(normalizedEmail)) { setError('Enter a valid email address.'); return }
    setPending(true)
    try {
      const challenge = await requestRecoveryChallenge(normalizedEmail)
      navigate(`/verify-otp?id=${encodeURIComponent(challenge.id)}`)
    } catch {
      setError('The service is temporarily unavailable. Try again later.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Forgot your password?" description="Enter your email and we will send a 6-digit security code." photo={loginPhoto} photoPosition="62% center" fullHeight>
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <Field label="Email" id="forgot-email" type="email" value={email} onChange={(value) => { setEmail(value); setError('') }} placeholder="name@email.com" autoComplete="email" icon={Mail} error={error || undefined} />
        <p className="text-sm leading-6 font-semibold text-ae-muted">For security, we show the same response whether or not an account exists.</p>
        <button className={buttonClass} type="submit" disabled={pending}>{pending ? 'Sending code…' : 'Send security code'}</button>
        <p className="text-center text-sm font-bold text-ae-muted"><Link className="font-black text-ae-brand underline underline-offset-4" to="/login">Back to sign in</Link></p>
      </form>
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const token = new URLSearchParams(window.location.search).get('token') ?? ''
    if (!token || password.length < 8 || password !== confirmation) {
      setError('The link is invalid or the passwords do not match.')
      return
    }
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        setError('The reset link is expired or invalid.')
        return
      }
      navigate('/login?reset=1')
    } catch {
      setError('The service is temporarily unavailable. Try again later.')
    }
  }

  return (
    <AuthLayout title="Create a new password" description="Use at least 8 characters." photo={loginPhoto} photoPosition="62% center">
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <PasswordField label="New password" id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" hint="Use at least 8 characters." />
        <PasswordField label="Confirm new password" id="reset-confirmation" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        {error && <p className="rounded-xl border border-[#e3a08f] bg-[#fff1ed] p-3 text-sm font-bold text-ae-fastest" role="alert">{error}</p>}
        <button className={buttonClass} type="submit">Save password</button>
      </form>
    </AuthLayout>
  )
}
