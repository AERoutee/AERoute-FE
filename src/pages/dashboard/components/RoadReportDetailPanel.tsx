import { X } from 'lucide-react'
import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { resolveRoadReportImageUrl } from '@/api/road-report'
import { ConfirmationDialog } from '@/components/common'
import { useToast } from '@/context'
import { useResolveRoadReport, useRetractRoadReportVerification, useVerifyRoadReport } from '@/hooks'
import { getApiErrorMessage, roadReportIcons } from '@/lib'
import type { RoadReport, RoadReportEvidence, RoadReportVerdict } from '@/types'

type Props = {
  report: RoadReport
  variant?: 'panel' | 'anchored'
  onClose: () => void
  onUpdate: (report: RoadReport) => void
  onDesktopDragStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragEnd?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDesktopDragKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  mobileHandle?: {
    height: number
    onClick: () => void
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>, onDismiss?: () => void) => void
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  }
}

function categoryName(category: string) {
  return category.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function relativeAge(createdAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

function exactTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function RoadReportDetailPanel({ report, variant = 'panel', onClose, onUpdate, onDesktopDragStart, onDesktopDragMove, onDesktopDragEnd, onDesktopDragKeyDown, mobileHandle }: Props) {
  const { showToast } = useToast()
  const anchored = variant === 'anchored'
  const verify = useVerifyRoadReport()
  const retract = useRetractRoadReportVerification()
  const resolveMutation = useResolveRoadReport()
  const [showResolveConfirmation, setShowResolveConfirmation] = useState(false)
  const responsePending = verify.isPending || retract.isPending
  const heading = categoryName(report.category)
  const images = report.images.flatMap((image) => resolveRoadReportImageUrl(image) ?? [])
  const verification = report.verification ?? { confirmations: 0, disputes: 0, viewerVerdict: null }
  const trust = report.trust
  const hasCommunityResponses = verification.confirmations > 0 || verification.disputes > 0
  const isActive = report.status === 'ACTIVE'
  const status = categoryName(report.status)
  const lifecycleTime = report.status === 'RESOLVED' ? report.resolvedAt : report.status === 'EXPIRED' ? report.expiresAt : null

  async function updateEvidence(action: () => Promise<RoadReportEvidence>) {
    try {
      onUpdate({ ...report, ...await action() })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Could not update report verification.'), 'error')
    }
  }

  async function vote(verdict: RoadReportVerdict) {
    await updateEvidence(() => verify.mutateAsync({ id: report.id, verdict }))
  }

  async function removeResponse() {
    await updateEvidence(() => retract.mutateAsync(report.id))
  }

  async function resolveReport() {
    try {
      onUpdate(await resolveMutation.mutateAsync(report.id))
      setShowResolveConfirmation(false)
      showToast('Report resolved.', 'success')
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Could not resolve report.'), 'error')
    }
  }

  return <div className={anchored ? 'flex max-h-[min(75dvh,36rem)] w-[min(22rem,calc(100vw-3rem))] max-w-[22rem] min-h-0 flex-col overflow-auto bg-white' : 'flex h-full min-h-0 flex-col'} role={anchored ? 'region' : undefined} aria-label={anchored ? `${heading} road report details` : undefined}>
    {!anchored && mobileHandle && <button className="flex min-h-11 w-full shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing lg:hidden" type="button" aria-label="Resize report details panel" aria-valuetext={`${Math.round(mobileHandle.height)} percent height`} onClick={mobileHandle.onClick} onPointerDown={mobileHandle.onPointerDown} onPointerMove={mobileHandle.onPointerMove} onPointerUp={(event) => mobileHandle.onPointerUp(event, onClose)} onPointerCancel={(event) => mobileHandle.onPointerUp(event, onClose)} onKeyDown={mobileHandle.onKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" aria-hidden="true" /></button>}
    <header className={`flex shrink-0 items-center gap-3 border-b border-ae-line px-4 ${anchored ? 'min-h-16' : 'min-h-[4.5rem]'}`}>
      <img className="size-10 shrink-0 object-contain" src={roadReportIcons[report.category]} alt="" />
      {anchored ? <span className="min-w-0 flex-1"><span className="block text-[10px] font-black tracking-[.12em] text-ae-muted uppercase">Road report</span><span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2"><span className="truncate text-base font-black" id="road-report-detail-title" role="heading" aria-level={2}>{heading}</span><span className="shrink-0 rounded-full bg-ae-soft px-2 py-0.5 text-[11px] font-black text-ae-brand">{status}</span>{report.isOwner && <span className="shrink-0 rounded-full border border-ae-line px-2 py-0.5 text-[11px] font-black">Your report</span>}</span></span> : <button className="flex min-w-0 flex-1 touch-none cursor-move items-center text-left" type="button" aria-label="Drag report details panel" onPointerDown={onDesktopDragStart} onPointerMove={onDesktopDragMove} onPointerUp={onDesktopDragEnd} onPointerCancel={onDesktopDragEnd} onKeyDown={onDesktopDragKeyDown}><span className="min-w-0"><span className="block text-[10px] font-black tracking-[.12em] text-ae-muted uppercase">Road report</span><span className="mt-0.5 flex min-w-0 items-center gap-2"><span className="truncate text-base font-black" id="road-report-detail-title" role="heading" aria-level={2}>{heading}</span><span className="shrink-0 rounded-full bg-ae-soft px-2 py-0.5 text-[11px] font-black text-ae-brand">{status}</span>{report.isOwner && <span className="shrink-0 rounded-full border border-ae-line px-2 py-0.5 text-[11px] font-black">Your report</span>}</span></span></button>}
      <button className="grid size-11 shrink-0 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label="Close report details" onClick={onClose}><X className="size-5" aria-hidden="true" /></button>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <p className="m-0 text-[15px] leading-6 font-bold">{report.description}</p>
      <div className="mt-3 border-t border-ae-line pt-3 text-xs font-semibold text-ae-muted"><span className="block">Reported by {report.reporter}</span><span className="mt-1 block">{relativeAge(report.createdAt)} · <time dateTime={report.createdAt}>{exactTime(report.createdAt)}</time></span>{lifecycleTime && <span className="mt-1 block">{status} <time dateTime={lifecycleTime}>{exactTime(lifecycleTime)}</time></span>}</div>

      {images.length > 0 && <section className="mt-4" aria-label="Report photos"><a className="block overflow-hidden rounded-xl" href={images[0]} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Open ${heading} road report photo 1 in a new tab`}><img className="aspect-video w-full object-cover" src={images[0]} alt={`${heading} road report photo 1`} loading="lazy" referrerPolicy="no-referrer" /></a>{images.length > 1 && <ul className="mt-2 grid list-none grid-cols-2 gap-2 p-0">{images.slice(1).map((image, index) => <li key={image}><a className="block overflow-hidden rounded-lg" href={image} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Open ${heading} road report photo ${index + 2} in a new tab`}><img className="aspect-video w-full object-cover" src={image} alt={`${heading} road report photo ${index + 2}`} loading="lazy" referrerPolicy="no-referrer" /></a></li>)}</ul>}</section>}

      {(trust || hasCommunityResponses) && <section className="mt-4" aria-labelledby="evidence-strength-title"><h3 className="m-0 text-sm font-black" id="evidence-strength-title">{trust ? 'Evidence strength' : 'Community responses'}</h3>{trust && <strong className="mt-1 block text-base">{categoryName(trust.level)} · {trust.score}/100</strong>}<p className="mt-1 mb-0 text-xs font-semibold text-ae-muted">{countLabel(verification.confirmations, 'confirmation', 'confirmations')} · {countLabel(verification.disputes, 'dispute', 'disputes')}</p>{trust && <p className="mt-2 mb-0 text-xs leading-5 font-semibold text-ae-muted">This evidence score is not a safety assessment.</p>}{trust?.factors && <details className="mt-3 border-t border-ae-line pt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-black text-ae-brand">How evidence is scored</summary><dl className="mb-2 grid grid-cols-3 gap-2 text-center"><div><dt className="text-[11px] font-bold text-ae-muted">Recency</dt><dd className="m-0 text-sm font-black">{trust.factors.recency}/40</dd></div><div><dt className="text-[11px] font-bold text-ae-muted">Photos</dt><dd className="m-0 text-sm font-black">{trust.factors.photos}/30</dd></div><div><dt className="text-[11px] font-bold text-ae-muted">Votes</dt><dd className="m-0 text-sm font-black">{trust.factors.voteBalance}/30</dd></div></dl></details>}</section>}
    </div>

    {isActive && !report.isOwner && <footer className="shrink-0 border-t border-ae-line bg-white px-4 pt-3 pb-4"><h3 className="m-0 text-sm font-black">Is this report still current?</h3><p className="mt-1 mb-3 text-xs font-semibold text-ae-muted">Your response helps others understand current conditions.</p><div className="grid grid-cols-2 gap-2"><button className={`min-h-11 rounded-xl border px-3 text-sm font-black disabled:opacity-50 ${verification.viewerVerdict === 'CONFIRM' ? 'border-ae-brand bg-ae-brand text-white' : 'border-ae-brand text-ae-brand'}`} type="button" aria-pressed={verification.viewerVerdict === 'CONFIRM'} disabled={responsePending} onClick={() => void vote('CONFIRM')}>Still there</button><button className={`min-h-11 rounded-xl border px-3 text-sm font-black disabled:opacity-50 ${verification.viewerVerdict === 'DISPUTE' ? 'border-ae-fastest bg-ae-fastest text-white' : 'border-ae-fastest text-ae-fastest'}`} type="button" aria-pressed={verification.viewerVerdict === 'DISPUTE'} disabled={responsePending} onClick={() => void vote('DISPUTE')}>No longer there</button></div>{verification.viewerVerdict && <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-xs font-bold"><span>Your response: {verification.viewerVerdict === 'CONFIRM' ? 'Still there' : 'No longer there'}</span><button className="min-h-11 text-ae-brand underline underline-offset-2 disabled:opacity-50" type="button" disabled={responsePending} onClick={() => void removeResponse()}>Remove my response</button></div>}<div className="text-xs font-bold text-ae-muted" role="status" aria-live="polite">{responsePending ? 'Saving response...' : ''}</div></footer>}

    {isActive && report.isOwner && <footer className="shrink-0 border-t border-ae-line bg-white px-4 pt-3 pb-4"><h3 className="m-0 text-sm font-black">Report management</h3><p className="mt-1 mb-3 text-xs leading-5 font-semibold text-ae-muted">Resolve this report when the issue is no longer affecting the route.</p><button className="min-h-11 w-full rounded-xl bg-ae-fastest px-4 text-sm font-black text-white disabled:opacity-50" type="button" disabled={resolveMutation.isPending} onClick={() => setShowResolveConfirmation(true)}>Mark as resolved</button></footer>}

    <ConfirmationDialog isOpen={showResolveConfirmation} title="Mark report as resolved?" description="This removes the report from the active map. This action cannot be undone." confirmLabel="Mark as resolved" isPending={resolveMutation.isPending} onCancel={() => setShowResolveConfirmation(false)} onConfirm={() => void resolveReport()} />
  </div>
}
