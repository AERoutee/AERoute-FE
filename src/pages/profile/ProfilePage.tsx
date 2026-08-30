import { Camera, KeyRound, Pencil } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { resolveProfileAvatarUrl } from '@/api/profile'
import { authClient } from '@/config'
import { useToast } from '@/context'
import { useMutationRemoveProfileAvatar, useMutationUploadProfileAvatar } from '@/hooks/profile'
import { getApiErrorMessage } from '@/lib'
import { AvatarActionDialog, AvatarCropDialog, EditNameDialog, ProfileRoadRibbon } from './components'

type Account = { providerId?: string }
type PasswordErrors = { current?: string; next?: string; confirmation?: string }
const inputClass = 'min-h-12 w-full rounded-xl border border-ae-border bg-white px-4 text-sm font-bold text-ae-ink outline-none focus:border-ae-brand focus:ring-4 focus:ring-ae-brand/10'

export function ProfilePage() {
  const navigate = useNavigate()
  const session = authClient.useSession()
  const { showToast } = useToast()
  const uploadAvatar = useMutationUploadProfileAvatar()
  const removeAvatar = useMutationRemoveProfileAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = session.data?.user
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false)
  const [cropSource, setCropSource] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [profileError, setProfileError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [isPending, setIsPending] = useState(false)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const hasCredential = accounts.some((account) => account.providerId === 'credential')
  const isAvatarPending = uploadAvatar.isPending || removeAvatar.isPending
  const avatarUrl = resolveProfileAvatarUrl(user?.image)
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'

  useEffect(() => {
    let active = true
    void authClient.listAccounts().then((result) => { if (active && result.data) setAccounts(result.data as Account[]) })
    return () => { active = false }
  }, [])
  useEffect(() => () => { if (cropSource) URL.revokeObjectURL(cropSource) }, [cropSource])

  function beginEditingName() {
    setDraftName(user?.name ?? '')
    setProfileError('')
    setIsEditingName(true)
  }

  function chooseAvatar() {
    setIsAvatarMenuOpen(false)
    fileInputRef.current?.click()
  }

  function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Choose a JPG, PNG, or WebP image.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Profile photo must be 5 MB or smaller.', 'error'); return }
    setCropSource(URL.createObjectURL(file))
  }

  async function saveAvatar(file: Blob) {
    try {
      await uploadAvatar.mutateAsync(file)
      await session.refetch()
      setFailedImage(null)
      setCropSource('')
      showToast('Profile photo updated.', 'success')
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Profile photo could not be updated.'), 'error')
    }
  }

  async function deleteCurrentAvatar() {
    setIsAvatarMenuOpen(false)
    try {
      await removeAvatar.mutateAsync()
      await session.refetch()
      setFailedImage(null)
      showToast('Profile photo removed.', 'success')
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Profile photo could not be removed.'), 'error')
    }
  }

  async function updateProfile() {
    const normalizedName = draftName.trim()
    if (normalizedName.length < 2 || normalizedName.length > 100) { setProfileError('Name must be between 2 and 100 characters.'); return }
    setIsPending(true)
    setProfileError('')
    try {
      const result = await authClient.updateUser({ name: normalizedName })
      if (result.error) { setProfileError('Name could not be updated.'); return }
      await session.refetch()
      setIsEditingName(false)
      showToast('Name updated.', 'success')
    } catch {
      setProfileError('Name could not be updated.')
    } finally {
      setIsPending(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    const errors: PasswordErrors = {}
    if (!currentPassword) errors.current = 'Enter your current password.'
    if (newPassword.length < 8 || newPassword.length > 128) errors.next = 'Use between 8 and 128 characters.'
    if (newPassword !== confirmation) errors.confirmation = 'Passwords do not match.'
    setPasswordErrors(errors)
    if (Object.keys(errors).length) return
    setIsPending(true)
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
      if (result.error) { setPasswordErrors({ current: 'Current password is incorrect.' }); return }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      showToast('Password changed. Other sessions were signed out.', 'success')
    } catch {
      showToast('Password could not be changed.', 'error')
    } finally {
      setIsPending(false)
    }
  }

  async function startOtpReset() {
    if (!user?.email || isPending) return
    setIsPending(true)
    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email: user.email })
      if (result.error) { showToast('A security code could not be sent.', 'error'); return }
      navigate('/verify-otp', { state: { email: user.email, returnTo: '/new-password' } })
    } catch {
      showToast('A security code could not be sent.', 'error')
    } finally {
      setIsPending(false)
    }
  }

  return <main id="main-content" className="relative min-h-[calc(100svh-72px)] overflow-hidden bg-white px-5 py-10 text-ae-ink sm:px-8 lg:px-12 lg:py-16" tabIndex={-1}>
    <div className="pointer-events-none absolute top-0 right-[-6rem] hidden h-full w-[32rem] lg:block"><ProfileRoadRibbon /></div>
    <div className="relative z-10 mx-auto max-w-3xl">
      <section className="rounded-[2rem] border border-ae-line bg-white p-6 shadow-[0_18px_50px_rgba(20,41,34,.09)] sm:p-8" aria-label="Profile settings">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <input className="sr-only" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarFile} />
            <button className="group relative block size-20 overflow-hidden rounded-full focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ae-brand" type="button" aria-label="Edit profile photo" onClick={() => setIsAvatarMenuOpen(true)}>
              {avatarUrl && failedImage !== avatarUrl ? <img className="size-20 rounded-full border-4 border-white object-cover shadow-[0_0_0_1px_#d5e0da,0_8px_20px_rgba(20,41,34,.14)]" src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedImage(avatarUrl)} /> : <span className="grid size-20 place-items-center rounded-full bg-[linear-gradient(135deg,#087f5b,#12a66f)] text-xl font-black text-white shadow-lg" aria-hidden="true">{initials}</span>}
              <span className="absolute inset-0 grid place-items-center bg-ae-ink/65 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><span className="inline-flex flex-col items-center gap-1 text-[10px] font-black"><Camera className="size-5" aria-hidden="true" />Edit</span></span>
            </button>
          </div>
          <div className="min-w-0 flex-1"><p className="mb-2 text-xs font-black tracking-[.14em] text-ae-brand uppercase">Account settings</p><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h1 className="m-0 truncate text-3xl font-black tracking-[-.045em] sm:text-4xl">{user?.name}</h1><p className="mt-2 mb-0 truncate text-sm font-semibold text-ae-muted">{user?.email}</p></div><button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-ae-border bg-white px-4 text-sm font-black text-ae-ink hover:border-ae-brand hover:text-ae-brand" type="button" onClick={beginEditingName}><Pencil className="size-4" aria-hidden="true" />Edit name</button></div></div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-ae-line bg-white p-6 shadow-[0_18px_50px_rgba(20,41,34,.07)] sm:p-8" aria-labelledby="password-title">
        <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-full bg-ae-soft text-ae-brand"><KeyRound className="size-5" aria-hidden="true" /></span><div><h2 className="m-0 text-2xl font-black" id="password-title">Password</h2><p className="mt-1 mb-0 text-sm font-semibold text-ae-muted">{hasCredential ? 'Change your password.' : 'Add password sign-in to this account.'}</p></div></div>
        {hasCredential ? <form className="mt-7 grid gap-5" onSubmit={changePassword} noValidate>
          <div><label className="mb-2 block text-sm font-extrabold" htmlFor="current-password">Current password</label><input className={inputClass} id="current-password" type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordErrors((errors) => ({ ...errors, current: undefined })) }} autoComplete="current-password" aria-invalid={Boolean(passwordErrors.current)} aria-describedby={passwordErrors.current ? 'current-password-error' : undefined} />{passwordErrors.current && <p className="mt-2 text-sm font-bold text-ae-fastest" id="current-password-error" role="alert">{passwordErrors.current}</p>}</div>
          <div><label className="mb-2 block text-sm font-extrabold" htmlFor="new-password">New password</label><input className={inputClass} id="new-password" type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordErrors((errors) => ({ ...errors, next: undefined })) }} autoComplete="new-password" aria-invalid={Boolean(passwordErrors.next)} aria-describedby={passwordErrors.next ? 'new-password-error' : undefined} />{passwordErrors.next && <p className="mt-2 text-sm font-bold text-ae-fastest" id="new-password-error" role="alert">{passwordErrors.next}</p>}</div>
          <div><label className="mb-2 block text-sm font-extrabold" htmlFor="confirm-password">Confirm new password</label><input className={inputClass} id="confirm-password" type="password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setPasswordErrors((errors) => ({ ...errors, confirmation: undefined })) }} autoComplete="new-password" aria-invalid={Boolean(passwordErrors.confirmation)} aria-describedby={passwordErrors.confirmation ? 'confirm-password-error' : undefined} />{passwordErrors.confirmation && <p className="mt-2 text-sm font-bold text-ae-fastest" id="confirm-password-error" role="alert">{passwordErrors.confirmation}</p>}</div>
          <button className="min-h-12 rounded-xl bg-ae-ink px-5 text-sm font-black text-white hover:bg-ae-brand" disabled={isPending}>Change password</button><button className="min-h-11 text-sm font-extrabold text-ae-brand" type="button" onClick={() => void startOtpReset()} disabled={isPending}>Forgot current password?</button>
        </form> : <div className="mt-7"><p className="m-0 text-sm leading-6 font-semibold text-ae-muted">Verify your email with a security code before creating a password.</p><button className="mt-5 min-h-12 rounded-xl bg-ae-ink px-5 text-sm font-black text-white hover:bg-ae-brand" type="button" onClick={() => void startOtpReset()} disabled={isPending}>{isPending ? 'Sending code...' : 'Set a password'}</button></div>}
      </section>
    </div>
    <AvatarActionDialog isOpen={isAvatarMenuOpen} hasImage={Boolean(user?.image)} isPending={isAvatarPending} onUpload={chooseAvatar} onRemove={() => void deleteCurrentAvatar()} onClose={() => setIsAvatarMenuOpen(false)} />
    {cropSource && <AvatarCropDialog source={cropSource} isPending={uploadAvatar.isPending} onCancel={() => setCropSource('')} onConfirm={(file) => void saveAvatar(file)} />}
    <EditNameDialog isOpen={isEditingName} value={draftName} error={profileError} isPending={isPending} onChange={(value) => { setDraftName(value); setProfileError('') }} onSave={() => void updateProfile()} onClose={() => setIsEditingName(false)} />
  </main>
}
