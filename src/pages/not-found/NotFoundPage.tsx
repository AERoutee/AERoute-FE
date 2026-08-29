import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <main id="main-content" className="relative grid h-svh place-items-center overflow-hidden bg-white px-5 py-16 text-ae-ink" tabIndex={-1}>
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[44%] w-full sm:block" viewBox="0 0 1440 360" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-80 310C190 230 300 390 530 270S810 80 1040 180S1260 310 1520 200" stroke="#dce7e1" strokeWidth="96" strokeLinecap="round" />
        <path d="M-80 310C190 230 300 390 530 270S810 80 1040 180S1260 310 1520 200" stroke="#23312c" strokeWidth="78" strokeLinecap="round" />
        <path d="M-80 310C190 230 300 390 530 270S810 80 1040 180S1260 310 1520 200" stroke="#fffdf4" strokeWidth="2" strokeDasharray="12 16" strokeLinecap="round" />
      </svg>
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] w-full sm:hidden" viewBox="0 0 390 260" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M-40 225C55 165 105 245 177 190S248 94 322 137S382 188 430 142" stroke="#dce7e1" strokeWidth="60" strokeLinecap="round" /><path d="M-40 225C55 165 105 245 177 190S248 94 322 137S382 188 430 142" stroke="#23312c" strokeWidth="46" strokeLinecap="round" /><path d="M-40 225C55 165 105 245 177 190S248 94 322 137S382 188 430 142" stroke="#fffdf4" strokeWidth="2" strokeDasharray="9 12" strokeLinecap="round" /></svg>

      <section className="relative z-10 -translate-y-12 w-full max-w-3xl text-center sm:-translate-y-16">
        <p className="m-0 text-[clamp(6rem,18vw,11rem)] leading-[.76] font-black tracking-[-.09em]">404</p>
        <h1 className="mt-8 mb-0 text-3xl font-black tracking-[-.04em] sm:text-4xl">This route does not exist.</h1>
        <p className="mx-auto mt-3 mb-0 max-w-md text-base leading-7 font-semibold text-ae-muted">The page may have moved, or the address may be incorrect.</p>
        <div className="mt-8 flex justify-center"><Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ae-ink px-5 font-black text-white no-underline hover:bg-ae-brand" to="/"><ArrowLeft className="size-4" aria-hidden="true" />Back home</Link></div>
      </section>
    </main>
  )
}
