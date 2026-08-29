import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { resetRecoveryPassword } from '@/api'
import { SecurityRoadIllustration } from '@/components/auth'

type ResetState = { otp?: string }
const idPattern = /^[A-Za-z0-9_-]{43}$/
const otpPattern = /^\d{6}$/
type PasswordErrors = { password?: string; confirmation?: string; form?: string }

function PasswordInput({ id, label, value, onChange, autoComplete, error }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string; error?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const errorId = `${id}-error`
  return <div><label className="mb-2 block text-sm font-extrabold" htmlFor={id}>{label}</label><div className="relative"><KeyRound className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ae-brand" aria-hidden="true" /><input className={`min-h-12 w-full rounded-xl border px-12 text-sm font-bold outline-none focus:border-ae-brand focus:ring-4 focus:ring-ae-brand/10 ${error ? 'border-ae-fastest' : 'border-ae-border'}`} id={id} type={isVisible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} required /><button className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label={isVisible ? 'Hide password' : 'Show password'} onClick={() => setIsVisible((current) => !current)}>{isVisible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</button></div>{error && <p className="mt-2 text-sm font-bold text-ae-fastest" id={errorId} role="alert">{error}</p>}</div>
}

export function NewPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const { otp = '' } = (location.state ?? {}) as ResetState
  const hasValidRecoveryState = idPattern.test(id) && otpPattern.test(otp)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [isPending, setIsPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!hasValidRecoveryState) { navigate('/forgot-password', { replace: true }); return }
    const nextErrors: PasswordErrors = {}
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.'
    if (password.length > 128) nextErrors.password = 'Use no more than 128 characters.'
    if (password !== confirmation) nextErrors.confirmation = 'Passwords do not match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setIsPending(true)
    try {
      await resetRecoveryPassword(id, otp, password)
      navigate('/login?reset=1', { replace: true })
    } catch {
      setErrors({ form: 'The recovery request is invalid or expired. Start again.' })
    } finally {
      setIsPending(false)
    }
  }

  if (!hasValidRecoveryState) return <Navigate to="/forgot-password" replace />

  return <main id="main-content" className="grid h-svh overflow-hidden bg-white lg:grid-cols-[1fr_.85fr]" tabIndex={-1}>
    <section className="flex min-h-0 items-center justify-center overflow-y-auto bg-white px-5 py-8 sm:px-10"><div className="w-full max-w-md"><Link className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-ae-muted no-underline hover:text-ae-brand" to="/forgot-password"><ArrowLeft className="size-4" aria-hidden="true" />Start again</Link><span className="grid size-14 place-items-center rounded-full bg-ae-ink text-white"><ShieldCheck className="size-6" aria-hidden="true" /></span><h1 className="mt-6 mb-0 text-4xl leading-[1.02] font-black tracking-[-.05em]">Create a new password</h1><p className="mt-3 mb-0 text-base leading-7 font-semibold text-ae-muted">Use a unique password you do not use on another service.</p><form className="mt-8 grid gap-5" onSubmit={submit} noValidate><PasswordInput id="new-password" label="New password" value={password} onChange={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined, form: undefined })) }} autoComplete="new-password" error={errors.password} /><PasswordInput id="confirm-password" label="Confirm password" value={confirmation} onChange={(value) => { setConfirmation(value); setErrors((current) => ({ ...current, confirmation: undefined, form: undefined })) }} autoComplete="new-password" error={errors.confirmation} />{errors.form && <p className="text-sm font-bold text-ae-fastest" role="alert">{errors.form}</p>}<button className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ae-ink px-5 py-3 text-sm font-black text-white hover:bg-ae-brand disabled:opacity-60" type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save password'}</button></form></div></section>
    <aside className="hidden overflow-hidden bg-white lg:block"><SecurityRoadIllustration /></aside>
  </main>
}
