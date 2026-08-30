import { ArrowRight } from 'lucide-react'
import { motion, useInView, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import { DetailedCyclist } from '@/components/common'

const airQualityCategories = [
  { key: 'moderate', label: 'Sedang', count: 259, percentage: '72%', color: 'bg-[#d4a849]' },
  { key: 'unhealthy', label: 'Tidak sehat', count: 93, percentage: '26%', color: 'bg-ae-fastest' },
  { key: 'good', label: 'Baik', count: 6, percentage: '2%', color: 'bg-ae-brand' },
] as const

const airQualityDays = airQualityCategories.flatMap((category) =>
  Array.from({ length: category.count }, (_, index) => ({ ...category, id: `${category.key}-${index}` })),
)

function RoadCyclist({ pathRef, containerRef, duration }: { pathRef: RefObject<SVGPathElement | null>; containerRef: RefObject<HTMLDivElement | null>; duration: number }) {
  const riding = useMotionValue(0)
  const cyclistRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const path = pathRef.current
    const container = containerRef.current
    const cyclist = cyclistRef.current
    if (!path || !container || !cyclist) return
    let frame = 0
    let startedAt = performance.now()
    const pause = duration < 10000 ? 1400 : 2500
    const pathLength = path.getTotalLength()

    const update = (now: number) => {
      const cycle = duration + pause
      const elapsed = (now - startedAt) % cycle
      const progress = Math.min(1, elapsed / duration)
      riding.set(progress * 7200)
      const point = path.getPointAtLength(pathLength * progress)
      const next = path.getPointAtLength(Math.min(pathLength, pathLength * progress + 2))
      const svg = path.ownerSVGElement
      if (svg) {
        const viewBox = svg.viewBox.baseVal
        const bounds = container.getBoundingClientRect()
        const x = (point.x - viewBox.x) / viewBox.width * bounds.width
        const y = (point.y - viewBox.y) / viewBox.height * bounds.height
        const dx = (next.x - point.x) / viewBox.width * bounds.width
        const dy = (next.y - point.y) / viewBox.height * bounds.height
        cyclist.style.left = `${x}px`
        cyclist.style.top = `${y}px`
        cyclist.style.opacity = elapsed <= duration ? '1' : '0'
        cyclist.style.transform = `translate(-50%, -78%) rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}deg)`
      }
      frame = requestAnimationFrame(update)
    }

    frame = requestAnimationFrame(update)
    return () => { cancelAnimationFrame(frame); startedAt = 0 }
  }, [containerRef, duration, pathRef, riding])

  return <div ref={cyclistRef} className="absolute z-10 w-20 will-change-transform sm:w-24"><DetailedCyclist riding={riding} /></div>
}

function AboutRoad({ mobile = false }: { mobile?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const d = mobile ? 'M-45 175C38 114 92 220 167 154S278 76 435 126' : 'M-100 245C170 130 320 330 565 205S900 85 1120 185S1330 250 1540 125'
  return <div ref={containerRef} className={mobile ? 'pointer-events-none absolute inset-x-0 bottom-0 h-52 sm:hidden' : 'pointer-events-none absolute inset-x-0 bottom-0 hidden h-64 sm:block lg:h-72'} aria-hidden="true"><svg className="h-full w-full overflow-visible" viewBox={mobile ? '0 0 390 208' : '0 0 1440 300'} fill="none" preserveAspectRatio="none"><path d={d} stroke="#dce7e1" strokeWidth={mobile ? 58 : 92} strokeLinecap="round" /><path d={d} stroke="#23312c" strokeWidth={mobile ? 44 : 72} strokeLinecap="round" /><path ref={pathRef} d={d} stroke="#fffdf4" strokeWidth="2" strokeDasharray={mobile ? '9 13' : '11 15'} strokeLinecap="round" /></svg><RoadCyclist pathRef={pathRef} containerRef={containerRef} duration={mobile ? 6500 : 15000} /></div>
}

function CountUp({ value, className }: { value: number; className: string }) {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.7 })
  const shouldReduceMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? value : 0)

  useEffect(() => {
    if (!isInView || shouldReduceMotion) {
      if (shouldReduceMotion) setDisplayValue(value)
      return
    }

    const startedAt = performance.now()
    let frame = 0
    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / 700, 1)
      setDisplayValue(Math.round(value * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [isInView, shouldReduceMotion, value])

  return <strong ref={ref} className={className}>{displayValue}</strong>
}

function AirQualityEvidence() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="bg-white px-5 pt-10 pb-20 sm:px-8 lg:px-12 lg:pt-14 lg:pb-28" aria-labelledby="air-quality-title">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:gap-20">
          <div>
            <h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="air-quality-title">
              93 hari dengan udara tidak sehat. <span className="text-ae-brand">Hanya 6 hari baik.</span>
            </h2>
            <p className="mt-6 mb-0 max-w-[38rem] text-base leading-7 font-semibold text-ae-muted sm:text-lg sm:leading-8">
              Pada 2025, analisis gabungan stasiun rujukan DLH DKI Jakarta mengklasifikasikan 259 hari sebagai sedang, 93 tidak sehat, dan hanya 6 baik.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 border-l-4 border-ae-ink pl-6 sm:pl-9">
            <div>
              <CountUp value={93} className="block text-[clamp(4.5rem,10vw,8.5rem)] leading-[.78] font-black tracking-[-.08em] text-ae-fastest" />
              <span className="mt-4 block max-w-32 text-sm leading-5 font-black text-ae-ink sm:text-base">hari tidak sehat</span>
            </div>
            <div>
              <CountUp value={6} className="block text-[clamp(4.5rem,10vw,8.5rem)] leading-[.78] font-black tracking-[-.08em] text-ae-brand" />
              <span className="mt-4 block max-w-32 text-sm leading-5 font-black text-ae-ink sm:text-base">hari baik</span>
            </div>
          </div>
        </div>

        <figure className="m-0 mt-14 sm:mt-20">
          <div
            className="grid grid-cols-[repeat(52,minmax(0,1fr))] gap-[clamp(2px,.3vw,4px)]"
            role="img"
            aria-label="Dari 358 hari yang diklasifikasikan, 259 hari berkualitas udara sedang, 93 hari tidak sehat, dan 6 hari baik."
          >
            {airQualityDays.map((day, index) => (
              <motion.span
                className={`aspect-square rounded-[2px] ${day.color}`}
                aria-hidden="true"
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18, delay: (Math.floor(index / 52) + (index % 52)) * 0.012, ease: 'easeOut' }}
                key={day.id}
              />
            ))}
          </div>
          <figcaption className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <dl className="m-0 flex flex-wrap gap-x-6 gap-y-3">
              {airQualityCategories.map((category) => (
                <div className="flex items-center gap-2" key={category.key}>
                  <span className={`size-3 rounded-[2px] ${category.color}`} aria-hidden="true" />
                  <dt className="text-sm font-black">{category.label}</dt>
                  <dd className="m-0 text-sm font-bold text-ae-muted">{category.count} hari, {category.percentage}</dd>
                </div>
              ))}
            </dl>
            <p className="m-0 max-w-[34rem] text-xs leading-5 font-semibold text-ae-muted sm:text-right">
              Setiap kotak mewakili satu hari yang diklasifikasikan. Kotak dikelompokkan berdasarkan kategori, bukan urutan kalender. Sumber:{' '}
              <a className="font-black text-ae-ink underline decoration-ae-brand underline-offset-4 hover:text-ae-brand" href="https://lingkunganhidup.jakarta.go.id/publikasi/laporan-kualitas-udara" target="_blank" rel="noreferrer">
                Laporan Pemantauan Kualitas Udara DLH DKI Jakarta 2025
              </a>.
            </p>
          </figcaption>
        </figure>

      </div>
    </section>
  )
}

export function AboutPage() {
  return (
    <main id="main-content" className="overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
      <section className="relative min-h-[40rem] px-5 py-16 sm:px-8 sm:py-24 lg:min-h-[46rem] lg:px-12 lg:py-28" aria-labelledby="about-title">
        <AboutRoad />
        <AboutRoad mobile />
        <div className="relative z-10 mx-auto max-w-[90rem]"><div className="max-w-[78rem]"><h1 className="m-0 text-[clamp(3.2rem,7vw,6.8rem)] leading-[.88] font-black tracking-[-.07em]" id="about-title">AERoute dibuat karena <span className="text-ae-brand">perjalanan bukan hanya soal sampai lebih cepat.</span></h1><p className="mt-7 mb-0 max-w-[64rem] text-lg leading-8 font-semibold text-ae-muted sm:text-xl">AERoute membantu memilih rute dengan mempertimbangkan waktu tempuh dan kondisi udara dan mengutamakan pejalan kaki dan pengendara sepeda di sepanjang perjalanan.</p></div></div>
      </section>

      <section className="px-5 pt-20 pb-8 sm:px-8 lg:px-12 lg:pt-28 lg:pb-20" aria-labelledby="story-title"><div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><div><h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="story-title">AERoute mulai dengan melihat udara Jakarta.</h2></div><div className="grid gap-5 text-lg leading-8 font-semibold text-ae-muted"><p className="m-0">Saat berjalan kaki atau bersepeda, perjalanan bukan hanya tentang seberapa jauh tujuan kita atau berapa menit yang dibutuhkan untuk sampai. Sepanjang perjalanan, kita juga bergerak melewati kondisi udara yang dapat berbeda dari satu lokasi ke lokasi lain dan berubah seiring waktu.</p><p className="m-0">Namun ketika memilih rute, informasi tersebut jarang menjadi bagian dari pertimbangan utama. Perencana rute umumnya membantu kita membandingkan waktu dan jarak, dua hal yang memang penting, tetapi belum menggambarkan seluruh kondisi yang kita lalui selama perjalanan.</p><p className="m-0">Dari situlah ide AERoute dimulai. Kami ingin melihat apakah kondisi udara dapat dibuat lebih mudah dipahami sebagai bagian dari pilihan rute, khususnya bagi orang yang berjalan kaki dan bersepeda di lingkungan perkotaan.</p></div></div></section>

      <AirQualityEvidence />

      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28" aria-labelledby="next-question-title">
        <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div>
            <h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="next-question-title">
              Jika kondisi udara tidak selalu sama, <span className="text-ae-brand">apakah rute tercepat selalu menjadi pilihan yang paling sesuai?</span>
            </h2>
          </div>
          <div className="border-l-4 border-ae-ink pl-6 sm:pl-9 lg:pt-2">
            <p className="m-0 text-xl leading-8 font-black tracking-[-.025em] sm:text-2xl sm:leading-9">AERoute dibuat untuk membantu menjawab pertanyaan itu.</p>
            <p className="mt-7 mb-0 text-base leading-7 font-semibold text-ae-muted sm:text-lg sm:leading-8">Untuk setiap perjalanan, AERoute membandingkan alternatif rute berdasarkan <strong className="font-black text-ae-ink">waktu tempuh dan estimasi paparan PM2.5 di sepanjang perjalanan</strong>, lalu menyesuaikan rekomendasi dengan prioritas yang dipilih pengguna.</p>
            <p className="mt-5 mb-0 text-base leading-7 font-semibold text-ae-muted sm:text-lg sm:leading-8">Bukan untuk menentukan satu rute yang selalu benar, tetapi untuk membuat trade-off yang sebelumnya tidak terlihat menjadi lebih mudah dipahami.</p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28"><div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-8 rounded-xl bg-ae-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center"><h2 className="m-0 max-w-3xl text-4xl leading-[.98] font-black tracking-[-.05em] sm:text-5xl">Bantu membentuk langkah selanjutnya.</h2><Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-black text-ae-ink no-underline hover:bg-ae-soft" to="/contact">Hubungi kami <ArrowRight className="size-5" aria-hidden="true" /></Link></div></section>
    </main>
  )
}
