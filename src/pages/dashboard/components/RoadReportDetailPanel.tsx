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
  return { CRASH: 'Kecelakaan', HAZARD: 'Bahaya', BLOCKED_PATH: 'Jalur terhalang', CONSTRUCTION: 'Konstruksi', MAP_ISSUE: 'Masalah peta', ACTIVE: 'Aktif', RESOLVED: 'Selesai', EXPIRED: 'Kedaluwarsa', HIGH: 'Tinggi', MEDIUM: 'Sedang', LOW: 'Rendah' }[category] ?? category
}

function relativeAge(createdAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
  if (seconds < 60) return 'baru saja'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

function exactTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
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
      showToast(getApiErrorMessage(error, 'Verifikasi laporan tidak dapat diperbarui.'), 'error')
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
      showToast('Laporan diselesaikan.', 'success')
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Laporan tidak dapat diselesaikan.'), 'error')
    }
  }

  return <div className={anchored ? 'flex max-h-[min(75dvh,36rem)] w-[min(22rem,calc(100vw-3rem))] max-w-[22rem] min-h-0 flex-col overflow-auto bg-white' : 'flex h-full min-h-0 flex-col'} role={anchored ? 'region' : undefined} aria-label={anchored ? `Detail laporan ${heading}` : undefined}>
    {!anchored && mobileHandle && <button className="flex min-h-11 w-full shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing lg:hidden" type="button" aria-label="Ubah ukuran panel detail laporan" aria-valuetext={`${Math.round(mobileHandle.height)} persen tinggi`} onClick={mobileHandle.onClick} onPointerDown={mobileHandle.onPointerDown} onPointerMove={mobileHandle.onPointerMove} onPointerUp={(event) => mobileHandle.onPointerUp(event, onClose)} onPointerCancel={(event) => mobileHandle.onPointerUp(event, onClose)} onKeyDown={mobileHandle.onKeyDown}><span className="h-1.5 w-12 rounded-full bg-ae-line" aria-hidden="true" /></button>}
    <header className={`flex shrink-0 items-center gap-3 border-b border-ae-line px-4 ${anchored ? 'min-h-16' : 'min-h-[4.5rem]'}`}>
      <img className="size-10 shrink-0 object-contain" src={roadReportIcons[report.category]} alt="" />
      {anchored ? <span className="min-w-0 flex-1"><span className="block text-[10px] font-black tracking-[.12em] text-ae-muted uppercase">Laporan jalan</span><span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2"><span className="truncate text-base font-black" id="road-report-detail-title" role="heading" aria-level={2}>{heading}</span><span className="shrink-0 rounded-full bg-ae-soft px-2 py-0.5 text-[11px] font-black text-ae-brand">{status}</span>{report.isOwner && <span className="shrink-0 rounded-full border border-ae-line px-2 py-0.5 text-[11px] font-black">Laporan Anda</span>}</span></span> : <button className="flex min-w-0 flex-1 touch-none cursor-move items-center text-left" type="button" aria-label="Geser panel detail laporan" onPointerDown={onDesktopDragStart} onPointerMove={onDesktopDragMove} onPointerUp={onDesktopDragEnd} onPointerCancel={onDesktopDragEnd} onKeyDown={onDesktopDragKeyDown}><span className="min-w-0"><span className="block text-[10px] font-black tracking-[.12em] text-ae-muted uppercase">Laporan jalan</span><span className="mt-0.5 flex min-w-0 items-center gap-2"><span className="truncate text-base font-black" id="road-report-detail-title" role="heading" aria-level={2}>{heading}</span><span className="shrink-0 rounded-full bg-ae-soft px-2 py-0.5 text-[11px] font-black text-ae-brand">{status}</span>{report.isOwner && <span className="shrink-0 rounded-full border border-ae-line px-2 py-0.5 text-[11px] font-black">Laporan Anda</span>}</span></span></button>}
      <button className="grid size-11 shrink-0 place-items-center rounded-lg text-ae-muted hover:bg-ae-soft" type="button" aria-label="Tutup detail laporan" onClick={onClose}><X className="size-5" aria-hidden="true" /></button>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <p className="m-0 text-[15px] leading-6 font-bold">{report.description}</p>
      <div className="mt-3 border-t border-ae-line pt-3 text-xs font-semibold text-ae-muted"><span className="block">Dilaporkan oleh {report.reporter}</span><span className="mt-1 block">{relativeAge(report.createdAt)} · <time dateTime={report.createdAt}>{exactTime(report.createdAt)}</time></span>{lifecycleTime && <span className="mt-1 block">{status} <time dateTime={lifecycleTime}>{exactTime(lifecycleTime)}</time></span>}</div>

      {images.length > 0 && <section className="mt-4" aria-label="Foto laporan"><a className="block overflow-hidden rounded-xl" href={images[0]} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Buka foto laporan ${heading} 1 di tab baru`}><img className="aspect-video w-full object-cover" src={images[0]} alt={`${heading} foto laporan 1`} loading="lazy" referrerPolicy="no-referrer" /></a>{images.length > 1 && <ul className="mt-2 grid list-none grid-cols-2 gap-2 p-0">{images.slice(1).map((image, index) => <li key={image}><a className="block overflow-hidden rounded-lg" href={image} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Buka foto laporan ${heading} ${index + 2} di tab baru`}><img className="aspect-video w-full object-cover" src={image} alt={`${heading} foto laporan ${index + 2}`} loading="lazy" referrerPolicy="no-referrer" /></a></li>)}</ul>}</section>}

      {(trust || hasCommunityResponses) && <section className="mt-4" aria-labelledby="evidence-strength-title"><h3 className="m-0 text-sm font-black" id="evidence-strength-title">{trust ? 'Kekuatan bukti' : 'Respons komunitas'}</h3>{trust && <strong className="mt-1 block text-base">{categoryName(trust.level)} · {trust.score}/100</strong>}<p className="mt-1 mb-0 text-xs font-semibold text-ae-muted">{countLabel(verification.confirmations, 'konfirmasi', 'konfirmasi')} · {countLabel(verification.disputes, 'sanggahan', 'sanggahan')}</p>{trust && <p className="mt-2 mb-0 text-xs leading-5 font-semibold text-ae-muted">Skor bukti ini bukan penilaian keselamatan.</p>}{trust?.factors && <details className="mt-3 border-t border-ae-line pt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-black text-ae-brand">Cara penilaian bukti</summary><dl className="mb-2 grid grid-cols-3 gap-2 text-center"><div><dt className="text-[11px] font-bold text-ae-muted">Kebaruan</dt><dd className="m-0 text-sm font-black">{trust.factors.recency}/40</dd></div><div><dt className="text-[11px] font-bold text-ae-muted">Foto</dt><dd className="m-0 text-sm font-black">{trust.factors.photos}/30</dd></div><div><dt className="text-[11px] font-bold text-ae-muted">Suara</dt><dd className="m-0 text-sm font-black">{trust.factors.voteBalance}/30</dd></div></dl></details>}</section>}
    </div>

    {isActive && !report.isOwner && <footer className="shrink-0 border-t border-ae-line bg-white px-4 pt-3 pb-4"><h3 className="m-0 text-sm font-black">Apakah laporan ini masih berlaku?</h3><p className="mt-1 mb-3 text-xs font-semibold text-ae-muted">Respons Anda membantu pengguna lain memahami kondisi terkini.</p><div className="grid grid-cols-2 gap-2"><button className={`min-h-11 rounded-xl border px-3 text-sm font-black disabled:opacity-50 ${verification.viewerVerdict === 'CONFIRM' ? 'border-ae-brand bg-ae-brand text-white' : 'border-ae-brand text-ae-brand'}`} type="button" aria-pressed={verification.viewerVerdict === 'CONFIRM'} disabled={responsePending} onClick={() => void vote('CONFIRM')}>Masih ada</button><button className={`min-h-11 rounded-xl border px-3 text-sm font-black disabled:opacity-50 ${verification.viewerVerdict === 'DISPUTE' ? 'border-ae-fastest bg-ae-fastest text-white' : 'border-ae-fastest text-ae-fastest'}`} type="button" aria-pressed={verification.viewerVerdict === 'DISPUTE'} disabled={responsePending} onClick={() => void vote('DISPUTE')}>Sudah tidak ada</button></div>{verification.viewerVerdict && <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-xs font-bold"><span>Respons Anda: {verification.viewerVerdict === 'CONFIRM' ? 'Masih ada' : 'Sudah tidak ada'}</span><button className="min-h-11 text-ae-brand underline underline-offset-2 disabled:opacity-50" type="button" disabled={responsePending} onClick={() => void removeResponse()}>Hapus respons saya</button></div>}<div className="text-xs font-bold text-ae-muted" role="status" aria-live="polite">{responsePending ? 'Menyimpan respons...' : ''}</div></footer>}

    {isActive && report.isOwner && <footer className="shrink-0 border-t border-ae-line bg-white px-4 pt-3 pb-4"><h3 className="m-0 text-sm font-black">Kelola laporan</h3><p className="mt-1 mb-3 text-xs leading-5 font-semibold text-ae-muted">Selesaikan laporan saat masalah tidak lagi memengaruhi rute.</p><button className="min-h-11 w-full rounded-xl bg-ae-fastest px-4 text-sm font-black text-white disabled:opacity-50" type="button" disabled={resolveMutation.isPending} onClick={() => setShowResolveConfirmation(true)}>Tandai selesai</button></footer>}

    <ConfirmationDialog isOpen={showResolveConfirmation} title="Tandai laporan sebagai selesai?" description="Laporan akan dihapus dari peta aktif. Tindakan ini tidak dapat dibatalkan." confirmLabel="Tandai selesai" isPending={resolveMutation.isPending} onCancel={() => setShowResolveConfirmation(false)} onConfirm={() => void resolveReport()} />
  </div>
}
