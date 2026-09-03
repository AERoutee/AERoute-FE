import { useTripImpactSummary } from '@/hooks'

function distance(value: number) {
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`
}

function duration(value: number) {
  const minutes = Math.round(value / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function InsightsPage() {
  const summary = useTripImpactSummary()
  return <main id="main-content" className="min-h-[calc(100dvh-5rem)] bg-ae-canvas px-5 py-12 text-ae-ink sm:px-8 lg:px-12" tabIndex={-1}>
    <div className="mx-auto max-w-6xl">
      <header><h1 className="m-0 text-4xl font-black tracking-[-.05em] sm:text-5xl">Insights</h1><p className="mt-3 mb-0 max-w-2xl text-base font-semibold text-ae-muted">Planned route and model estimates, not a GPS trace.</p></header>
      <section className="mt-9" aria-labelledby="impact-title">
        <h2 className="text-xl font-black" id="impact-title">Impact summary</h2>
        {summary.isPending ? <p role="status">Loading impact summary...</p> : summary.isError ? <p className="text-ae-fastest" role="alert">Impact summary is unavailable.</p> : summary.data && <><dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-ae-line bg-white p-5"><dt className="text-xs font-black text-ae-muted">Recorded trips</dt><dd className="mt-2 mb-0 text-3xl font-black">{summary.data.completedTrips}</dd></div><div className="rounded-2xl border border-ae-line bg-white p-5"><dt className="text-xs font-black text-ae-muted">Active travel</dt><dd className="mt-2 mb-0 text-2xl font-black">{distance(summary.data.activeTravelDistanceMeters)}</dd><span className="text-xs font-bold text-ae-muted">{duration(summary.data.activeTravelDurationSeconds)}</span></div><div className="rounded-2xl border border-ae-line bg-white p-5"><dt className="text-xs font-black text-ae-muted">Modeled index reduction</dt><dd className="mt-2 mb-0 text-3xl font-black">{summary.data.modeledExposureIndexReduction.toFixed(1)}</dd></div><div className="rounded-2xl border border-ae-line bg-white p-5"><dt className="text-xs font-black text-ae-muted">Fewer confirmed report signals</dt><dd className="mt-2 mb-0 text-3xl font-black">{summary.data.fewerConfirmedReportSignals}</dd></div></dl><p className="mt-3 mb-0 text-xs font-semibold text-ae-muted">{summary.data.disclaimer}</p></>}
      </section>
    </div>
  </main>
}
