import { ArrowRight, LayoutDashboard, LogIn } from 'lucide-react'
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { colorBalanceIcon, colorBicycleIcon, colorMapMarkerIcon, colorWindIcon } from '@/assets'
import { ConceptBadge, DetailedCyclist, WildflowerCluster } from '@/components/common'
import { authClient } from '@/config'

const steps = [
  { number: '01', icon: colorMapMarkerIcon, title: 'Set your journey', detail: 'Search any address, station, campus, or landmark.' },
  { number: '02', icon: colorBalanceIcon, title: 'See the trade-off', detail: 'Compare time, distance, and estimated exposure side by side.' },
  { number: '03', icon: colorWindIcon, title: 'Find the better fit', detail: 'A route can take three minutes longer and still be the smarter choice.' },
  { number: '04', icon: colorBicycleIcon, title: 'Move with context', detail: 'Choose walking or cycling and start your commute with a clearer picture.' },
]

const stepPlacements = [
  'lg:col-start-1 lg:row-start-1 lg:justify-self-end',
  'lg:col-start-3 lg:row-start-2',
  'lg:col-start-1 lg:row-start-3 lg:justify-self-end',
  'lg:col-start-3 lg:row-start-4',
]

const desktopRoute = 'M835 0C835 170 730 230 760 390S915 575 720 750S535 915 510 1030S455 1210 520 1350S565 1530 485 1680S445 1900 530 2030S575 2220 500 2350S610 2520 720 2620S660 2820 500 3000'
const mobileRoute = 'M58 0C58 260 48 360 56 560S66 770 55 970S47 1180 58 1390S67 1600 55 1810S47 2020 58 2230S66 2440 55 2650S48 2860 62 3000'

const roadsidePlants = [
  { at: .035, side: -1, width: 'w-20', colors: ['#E987A1', '#F2A36F', '#8B9BE5'] as [string, string, string] },
  { at: .09, side: 1, width: 'w-24', colors: ['#F0A070', '#8C9DE8', '#E88BAC'] as [string, string, string] },
  { at: .16, side: -1, width: 'w-20', colors: ['#91A2EA', '#ED8CA5', '#F2A66E'] as [string, string, string] },
  { at: .25, side: 1, width: 'w-16', colors: ['#F2A66E', '#E987A1', '#91A2EA'] as [string, string, string] },
  { at: .34, side: -1, width: 'w-20', colors: ['#8C9DE8', '#F2C45D', '#E88BAC'] as [string, string, string] },
  { at: .44, side: 1, width: 'w-16', colors: ['#ED8CA5', '#91A2EA', '#F0A070'] as [string, string, string] },
  { at: .55, side: -1, width: 'w-20', colors: ['#F2C45D', '#E987A1', '#8C9DE8'] as [string, string, string] },
]

type RoadLayerProps = {
  progress: MotionValue<number>
  d: string
  width: number
  height: number
  className: string
  compact?: boolean
}

function RoadLayer({ progress, d, width, height, className, compact = false }: RoadLayerProps) {
  const riding = useTransform(progress, (value) => value * 7200)
  const firstPlant = useTransform(progress, [.01, .035], [0, 1])
  const secondPlant = useTransform(progress, [.06, .09], [0, 1])
  const thirdPlant = useTransform(progress, [.12, .16], [0, 1])
  const fourthPlant = useTransform(progress, [.21, .25], [0, 1])
  const fifthPlant = useTransform(progress, [.29, .34], [0, 1])
  const sixthPlant = useTransform(progress, [.39, .44], [0, 1])
  const seventhPlant = useTransform(progress, [.5, .55], [0, 1])
  const plantReveals = [firstPlant, secondPlant, thirdPlant, fourthPlant, fifthPlant, sixthPlant, seventhPlant]
  const wrapperRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const riderRef = useRef<HTMLDivElement>(null)
  const plantRefs = useRef<Array<HTMLDivElement | null>>([])

  const updateRider = useCallback((value: number) => {
    const wrapper = wrapperRef.current
    const path = pathRef.current
    const rider = riderRef.current
    if (!wrapper || !path || !rider) return
    const bounds = wrapper.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const length = path.getTotalLength()
    const distance = Math.max(0, Math.min(1, value)) * length
    const point = path.getPointAtLength(distance)
    const next = path.getPointAtLength(Math.min(length, distance + 2))
    const dx = ((next.x - point.x) / width) * bounds.width
    const dy = ((next.y - point.y) / height) * bounds.height
    rider.style.left = `${(point.x / width) * 100}%`
    rider.style.top = `${(point.y / height) * 100}%`
    rider.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}deg)`

    if (!compact) roadsidePlants.forEach(({ at, side }, index) => {
      const plant = plantRefs.current[index]
      if (!plant) return
      const center = path.getPointAtLength(length * at)
      const before = path.getPointAtLength(Math.max(0, length * at - 2))
      const after = path.getPointAtLength(Math.min(length, length * at + 2))
      const tangentX = ((after.x - before.x) / width) * bounds.width
      const tangentY = ((after.y - before.y) / height) * bounds.height
      const magnitude = Math.hypot(tangentX, tangentY) || 1
      const normalX = -tangentY / magnitude
      const normalY = tangentX / magnitude
      const plantRadius = plant.offsetWidth / 2
      const safeOffset = 48 + plantRadius + 14
      const centerX = (center.x / width) * bounds.width
      const centerY = (center.y / height) * bounds.height
      const candidate = (direction: number) => ({ x: centerX + normalX * safeOffset * direction, y: centerY + normalY * safeOffset * direction })
      const inside = ({ x, y }: { x: number; y: number }) => x >= plantRadius && x <= bounds.width - plantRadius && y >= plantRadius && y <= bounds.height - plantRadius
      const preferred = candidate(side)
      const position = inside(preferred) ? preferred : candidate(-side)
      plant.style.left = `${position.x}px`
      plant.style.top = `${position.y}px`
    })
  }, [compact, height, width])

  useMotionValueEvent(progress, 'change', updateRider)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    updateRider(progress.get())
    const observer = new ResizeObserver(() => updateRider(progress.get()))
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [progress, updateRider])

  return (
    <div ref={wrapperRef} className={className}>
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={d} fill="none" stroke="#dce7e1" strokeWidth={compact ? 58 : 96} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="#23312c" strokeWidth={compact ? 44 : 78} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="#fffdf4" strokeWidth="2" strokeDasharray="12 16" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path ref={pathRef} d={d} fill="none" stroke="transparent" />
      </svg>
      {!compact && roadsidePlants.map(({ width: plantWidth, colors }, index) => <motion.div ref={(element) => { plantRefs.current[index] = element }} className={`absolute z-[1] -translate-x-1/2 -translate-y-1/2 ${plantWidth}`} style={{ opacity: plantReveals[index], scale: plantReveals[index] }} key={colors.join('-')}><WildflowerCluster className="w-full" colors={colors} /></motion.div>)}
      <div ref={riderRef} className={`absolute z-10 will-change-transform drop-shadow-[0_8px_6px_rgba(20,41,34,.28)] ${compact ? 'w-12' : 'w-20'}`}><DetailedCyclist riding={riding} /></div>
    </div>
  )
}

function ScrollRoad({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <RoadLayer progress={progress} d={desktopRoute} width={1000} height={3000} className="absolute inset-0 hidden md:block" />
      <RoadLayer progress={progress} d={mobileRoute} width={100} height={3000} className="absolute inset-y-0 right-[2%] w-[38%] md:hidden" compact />
    </div>
  )
}

export function LandingPage() {
  const session = authClient.useSession()
  const isSignedIn = Boolean(session.data?.user)
  const pageRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ['start start', 'end end'] })
  const routeProgress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 })

  return (
    <main ref={pageRef} id="main-content" className="relative isolate overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
      <ScrollRoad progress={routeProgress} />

      <section className="relative z-10 flex min-h-[calc(100svh-72px)] items-center px-5 py-10 sm:px-8 lg:px-12" aria-labelledby="hero-title">
        <div className="relative z-10 mx-auto grid w-full max-w-[90rem] lg:grid-cols-[minmax(0,41rem)_1fr] lg:gap-20">
          <div className="self-center py-6 pr-[24%] sm:py-8 sm:pr-0">
            <h1 className="m-0 text-[clamp(2.75rem,12vw,6.2rem)] leading-[.88] font-black tracking-[-.07em]" id="hero-title">Not every <span className="text-ae-brand">shortest</span> route is the best one.</h1>
            <p className="mt-7 mb-0 max-w-[35rem] text-lg leading-8 font-semibold text-ae-muted sm:text-xl">AERoute helps you compare time and estimated PM2.5 exposure before you choose how to move.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-ae-ink px-7 py-4 text-base font-black text-white no-underline transition hover:bg-ae-brand" href="#how-it-works">Explore the story <ArrowRight className="size-5" aria-hidden="true" /></a>{session.isPending ? <span className="h-14 w-36 animate-pulse rounded-xl bg-ae-soft" aria-label="Loading account" /> : <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-ae-border bg-white px-7 py-4 text-base font-black text-ae-ink no-underline hover:border-ae-brand hover:text-ae-brand" to={isSignedIn ? '/dashboard' : '/login'}>{isSignedIn ? <LayoutDashboard className="size-5" aria-hidden="true" /> : <LogIn className="size-5" aria-hidden="true" />}{isSignedIn ? 'Open dashboard' : 'Sign in'}</Link>}</div>
          </div>
          <div className="hidden lg:block" aria-hidden="true" />
        </div>
      </section>

      <section className="relative z-10 px-5 py-20 sm:px-8 lg:px-12 lg:py-28" id="how-it-works" aria-labelledby="story-title">
        <div className="mx-auto max-w-[90rem]">
          <div className="max-w-[31rem] py-4 pr-[24%] sm:pr-0"><p className="mb-3 text-xs font-black tracking-[.16em] text-ae-brand uppercase">The route story</p><h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="story-title">One journey.<br /><span className="text-ae-brand">Four better decisions.</span></h2></div>
          <div className="mt-16 grid gap-16 lg:mt-24 lg:grid-cols-[1fr_minmax(12rem,20rem)_1fr] lg:grid-rows-4 lg:gap-y-20">
            {steps.map(({ number, icon, title, detail }, index) => <article className={`relative z-10 mr-[24%] max-w-[23rem] rounded-xl bg-white p-5 shadow-[0_18px_45px_rgba(20,41,34,.12)] sm:mr-20 sm:p-6 lg:mr-0 ${stepPlacements[index]}`} key={number}><span className={`absolute top-1/2 hidden h-px w-20 -translate-y-1/2 bg-ae-brand/40 lg:block ${index % 2 ? '-left-20' : '-right-20'}`} aria-hidden="true"><span className={`absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-ae-brand ring-4 ring-white ${index % 2 ? 'left-0' : 'right-0'}`} /></span><div className="flex items-center justify-between"><ConceptBadge src={icon} /><span className="text-sm font-black tracking-[.14em] text-ae-brand">{number}</span></div><h3 className="mt-7 mb-0 text-2xl font-black tracking-[-.03em]">{title}</h3><p className="mt-2 mb-0 text-base leading-7 font-semibold text-ae-muted">{detail}</p></article>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 py-20 sm:px-8 lg:px-12 lg:py-28" aria-labelledby="proof-title"><div className="mx-auto grid max-w-[90rem] items-center gap-12 lg:grid-cols-[.7fr_1.3fr]"><div className="py-4 pr-[24%] sm:pr-0"><p className="mb-3 text-xs font-black tracking-[.16em] text-ae-brand uppercase">The useful difference</p><h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="proof-title">Fast is only one part of the journey.</h2><p className="mt-5 mb-0 max-w-md text-lg leading-8 font-semibold text-ae-muted">AERoute makes the hidden trade-off visible before you leave.</p></div><div className="mr-[24%] grid gap-4 sm:mr-0 sm:grid-cols-3"><div className="rounded-xl bg-ae-ink p-6 text-white"><strong className="text-5xl font-black">+3</strong><span className="mt-2 block text-sm font-bold text-[#c5e9d8]">minutes on the recommended route</span></div><div className="rounded-xl bg-ae-soft p-6"><strong className="text-5xl font-black text-ae-brand">41%</strong><span className="mt-2 block text-sm font-bold text-ae-muted">lower estimated exposure</span></div><div className="rounded-xl bg-white p-6 shadow-[0_18px_45px_rgba(20,41,34,.1)]"><strong className="text-5xl font-black">2</strong><span className="mt-2 block text-sm font-bold text-ae-muted">ways to move: walk or cycle</span></div></div></div></section>

      <footer className="relative z-10 px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28"><div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-8 rounded-xl bg-ae-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center"><h2 className="m-0 max-w-2xl text-4xl leading-[.98] font-black tracking-[-.05em] sm:text-5xl">Make every route decision clearer.</h2><Link className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-black text-ae-ink no-underline hover:bg-ae-soft" to={isSignedIn ? '/dashboard' : '/register'}>{isSignedIn ? 'Open dashboard' : 'Create an account'} <ArrowRight className="size-5" aria-hidden="true" /></Link></div></footer>
    </main>
  )
}
