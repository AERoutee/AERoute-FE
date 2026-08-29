import { ArrowRight } from 'lucide-react'
import { motion, useMotionValue } from 'motion/react'
import { useEffect, useRef, type RefObject } from 'react'
import { Link } from 'react-router'
import { colorChartIcon, colorCompareIcon, colorVisibleIcon } from '@/assets'
import { ConceptBadge, DetailedCyclist } from '@/components/common'

const principles = [
  { icon: colorVisibleIcon, title: 'Clarity before complexity', description: 'Route information should help people decide quickly without hiding uncertainty behind technical language.' },
  { icon: colorCompareIcon, title: 'Trade-offs, not absolutes', description: 'The fastest route is not always the best fit. AERoute shows options without pretending there is one answer for everyone.' },
  { icon: colorChartIcon, title: 'Honest about estimates', description: 'Exposure values are informational estimates. Their sources, freshness, and limits should remain visible and understandable.' },
]

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

export function AboutPage() {
  return (
    <main id="main-content" className="overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
      <section className="relative min-h-[40rem] px-5 py-16 sm:px-8 sm:py-24 lg:min-h-[46rem] lg:px-12 lg:py-28" aria-labelledby="about-title">
        <AboutRoad />
        <AboutRoad mobile />
        <div className="relative z-10 mx-auto max-w-[90rem]"><div className="max-w-[46rem]"><h1 className="m-0 text-[clamp(3.2rem,7vw,6.8rem)] leading-[.88] font-black tracking-[-.07em]" id="about-title">Built for the choices <span className="text-ae-brand">between here and there.</span></h1><p className="mt-7 mb-0 max-w-[42rem] text-lg leading-8 font-semibold text-ae-muted sm:text-xl">AERoute began with a simple question: what if route planning considered the air around a journey, not only the minutes it takes?</p></div></div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28" aria-labelledby="story-title"><div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><div><p className="mb-3 text-xs font-black tracking-[.16em] text-ae-brand uppercase">Why AERoute exists</p><h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="story-title">A route is more than a line on a map.</h2></div><div className="grid gap-5 text-lg leading-8 font-semibold text-ae-muted"><p className="m-0">Most route planners optimize for speed and distance. Those measures matter, but they do not describe the complete experience of moving through a city.</p><p className="m-0">Air quality can vary across nearby streets and across time. A slightly longer route may offer a meaningfully different estimated exposure. AERoute exists to make that hidden trade-off visible.</p><p className="m-0">The product is not designed to make medical claims or replace official guidance. It is designed to support clearer, more informed everyday decisions.</p></div></div></section>

      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28" aria-labelledby="principles-title"><div className="mx-auto max-w-[90rem]"><div className="max-w-[42rem]"><p className="mb-3 text-xs font-black tracking-[.16em] text-ae-brand uppercase">How we build</p><h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="principles-title">Three principles guide the journey.</h2></div><div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-3">{principles.map(({ icon, title, description }, index) => <motion.article className="rounded-xl bg-white p-7 shadow-[0_18px_50px_rgba(20,41,34,.11)] sm:p-8" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .52, delay: index * .12 }} key={title}><ConceptBadge src={icon} /><h3 className="mt-7 mb-0 text-2xl font-black tracking-[-.035em]">{title}</h3><p className="mt-3 mb-0 text-base leading-7 font-semibold text-ae-muted">{description}</p></motion.article>)}</div></div></section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28"><div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-8 rounded-xl bg-ae-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center"><h2 className="m-0 max-w-3xl text-4xl leading-[.98] font-black tracking-[-.05em] sm:text-5xl">Help shape what comes next.</h2><Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-black text-ae-ink no-underline hover:bg-ae-soft" to="/contact">Contact us <ArrowRight className="size-5" aria-hidden="true" /></Link></div></section>
    </main>
  )
}
