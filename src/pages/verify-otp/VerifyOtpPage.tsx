import { ArrowLeft, KeyRound } from 'lucide-react'
import { SecurityRoadIllustration } from '@/components/auth'
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { getRecoveryChallenge, resendRecoveryChallenge, verifyRecoveryChallenge } from '@/api'

const CODE_LENGTH = 6
const idPattern = /^[A-Za-z0-9_-]{43}$/

export function VerifyOtpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const hasValidRecoveryState = idPattern.test(id)
  const [maskedEmail, setMaskedEmail] = useState('your email')
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(hasValidRecoveryState)
  const [challengeExists, setChallengeExists] = useState(hasValidRecoveryState)
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(60)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (!hasValidRecoveryState) return
    let active = true
    void getRecoveryChallenge(id).then((challenge) => { if (active) setMaskedEmail(challenge.maskedEmail) }).catch(() => { if (active) setChallengeExists(false) }).finally(() => { if (active) setIsLoadingChallenge(false) })
    return () => { active = false }
  }, [hasValidRecoveryState, id])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item))
    setError('')
    if (digit && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    event.preventDefault()
    setDigits(Array.from({ length: CODE_LENGTH }, (_, index) => pasted[index] ?? ''))
    inputs.current[Math.min(pasted.length, CODE_LENGTH) - 1]?.focus()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const otp = digits.join('')
    if (otp.length !== CODE_LENGTH) { setError('Enter the complete 6-digit code.'); return }
    setPending(true)
    setError('')
    try {
      await verifyRecoveryChallenge(id, otp)
      navigate(`/new-password?id=${encodeURIComponent(id)}`, { replace: true, state: { otp } })
    } catch {
      setError('Verification is temporarily unavailable. Try again later.')
    } finally {
      setPending(false)
    }
  }

  async function resend() {
    if (cooldown > 0 || pending) return
    setPending(true)
    setError('')
    try {
      const challenge = await resendRecoveryChallenge(id)
      setDigits(Array(CODE_LENGTH).fill(''))
      setCooldown(60)
      navigate(`/verify-otp?id=${encodeURIComponent(challenge.id)}`, { replace: true })
      inputs.current[0]?.focus()
    } catch {
      setError('A new code could not be sent. Try again later.')
    } finally {
      setPending(false)
    }
  }

  if (!hasValidRecoveryState || (!isLoadingChallenge && !challengeExists)) return <Navigate to="/forgot-password" replace />
  if (isLoadingChallenge) return <main className="grid h-svh place-items-center bg-white text-sm font-black text-ae-muted">Checking recovery request…</main>

  return (
    <main id="main-content" className="relative grid h-svh overflow-hidden bg-white lg:grid-cols-[.9fr_1.1fr]" tabIndex={-1}>
      <section className="flex min-h-0 items-center justify-center overflow-y-auto px-5 py-8 sm:px-10">
        <div className="w-full max-w-md">
          <Link className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-ae-muted no-underline hover:text-ae-brand" to="/forgot-password"><ArrowLeft className="size-4" aria-hidden="true" />Back</Link>
          <span className="grid size-14 place-items-center rounded-full bg-ae-ink text-white"><KeyRound className="size-6" aria-hidden="true" /></span>
          <h1 className="mt-6 mb-0 text-4xl leading-[1.02] font-black tracking-[-.05em]">Check your email</h1>
          <p className="mt-3 mb-0 text-base leading-7 font-semibold text-ae-muted">We sent a 6-digit code to <strong className="text-ae-ink">{maskedEmail}</strong>. It expires in 5 minutes.</p>
          <form className="mt-8 grid gap-5" onSubmit={submit} noValidate>
            <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  ref={(element) => { inputs.current[index] = element }}
                  className="aspect-square min-w-0 rounded-xl border border-ae-border bg-white text-center text-2xl font-black text-ae-ink outline-none focus:border-ae-brand focus:ring-4 focus:ring-ae-brand/10"
                  key={index}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Digit ${index + 1}`}
                  maxLength={1}
                />
              ))}
            </div>
            {error && <p className="text-sm font-bold text-ae-fastest" role="alert">{error}</p>}
            <button className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ae-ink px-5 py-3 text-sm font-black text-white hover:bg-ae-brand disabled:opacity-60" type="submit" disabled={pending}>{pending ? 'Verifying…' : 'Verify code'}</button>
            <button className="min-h-11 text-sm font-extrabold text-ae-brand disabled:text-ae-muted" type="button" disabled={cooldown > 0 || pending} onClick={() => void resend()}>{cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}</button>
          </form>
        </div>
      </section>
      <aside className="hidden overflow-hidden bg-white lg:block"><SecurityRoadIllustration /></aside>
    </main>
  )
}
