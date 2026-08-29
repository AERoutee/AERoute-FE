import { motion } from 'motion/react'
import { colorEmailIcon, colorOfficeIcon } from '@/assets'

type WalkerProps = {
  skin: string
  shirt: string
  pants: string
  hair: string
  flip?: boolean
  pace?: number
}

function StreetLamp({ className, flip = false }: { className: string; flip?: boolean }) {
  return (
    <svg className={`${className} ${flip ? '-scale-x-100' : ''}`} viewBox="0 0 120 220" fill="none" aria-hidden="true">
      <defs><radialGradient id="lamp-glow"><stop stopColor="#FFF8C8" stopOpacity=".88" /><stop offset="1" stopColor="#FFE071" stopOpacity="0" /></radialGradient><linearGradient id="lamp-metal" x1="42" y1="40" x2="73" y2="210" gradientUnits="userSpaceOnUse"><stop stopColor="#40534B" /><stop offset="1" stopColor="#182620" /></linearGradient></defs>
      <circle cx="89" cy="45" r="36" fill="url(#lamp-glow)" />
      <path d="M45 190V64C45 36 65 24 90 24" stroke="url(#lamp-metal)" strokeWidth="9" strokeLinecap="round" />
      <path d="M78 22H106L100 34H84Z" fill="#182620" />
      <path d="M83 34H101L97 49H87Z" fill="#FFF2B8" stroke="#26352F" strokeWidth="3" />
      <path d="M90 49H95" stroke="#26352F" strokeWidth="4" strokeLinecap="round" />
      <rect x="38" y="73" width="14" height="10" rx="4" fill="#52675E" />
      <rect x="38" y="128" width="14" height="10" rx="4" fill="#52675E" />
      <path d="M34 190H57L63 207H28Z" fill="#26352F" />
      <rect x="21" y="205" width="49" height="8" rx="4" fill="#182620" />
    </svg>
  )
}

function WalkingPerson({ skin, shirt, pants, hair, flip = false, pace = 0.82 }: WalkerProps) {
  const loop = { duration: pace, repeat: Infinity, ease: 'linear' as const, times: [0, 0.25, 0.5, 0.75, 1] }
  const frontLeg = ['M40 72L31 96L18 121', 'M40 72L35 98L29 122', 'M40 72L40 99L40 124', 'M40 72L47 96L58 114', 'M40 72L50 97L64 120', 'M40 72L46 92L55 110', 'M40 72L39 94L33 115', 'M40 72L34 95L23 120', 'M40 72L31 96L18 121']
  const backLeg = ['M52 72L61 97L74 120', 'M52 72L57 93L66 112', 'M52 72L52 99L52 124', 'M52 72L45 96L34 114', 'M52 72L43 96L29 121', 'M52 72L47 98L41 122', 'M52 72L52 99L52 124', 'M52 72L58 96L69 119', 'M52 72L61 97L74 120']
  const frontShoe = ['M14 119L27 119L31 124L15 126Z', 'M25 120L38 120L42 125L26 127Z', 'M35 122L48 122L52 126L36 128Z', 'M53 111L65 111L69 115L54 118Z', 'M60 118L73 118L78 122L61 125Z', 'M51 108L63 108L67 112L52 115Z', 'M29 113L41 113L45 117L30 120Z', 'M19 118L32 118L36 123L20 125Z', 'M14 119L27 119L31 124L15 126Z']
  const backShoe = ['M70 118L82 118L86 122L71 125Z', 'M62 110L74 110L78 114L63 117Z', 'M48 122L61 122L65 126L49 128Z', 'M30 112L42 112L46 116L31 119Z', 'M25 119L38 119L42 124L26 126Z', 'M37 120L50 120L54 125L38 127Z', 'M48 122L61 122L65 126L49 128Z', 'M65 117L78 117L82 121L66 124Z', 'M70 118L82 118L86 122L71 125Z']
  const frontArm = ['M31 45L25 59L13 70', 'M31 45L27 59L18 72', 'M31 45L30 60L25 73', 'M31 45L34 59L41 70', 'M31 45L38 58L48 67', 'M31 45L36 58L44 69', 'M31 45L31 60L28 73', 'M31 45L27 59L17 71', 'M31 45L25 59L13 70']
  const backArm = ['M59 45L63 59L73 69', 'M59 45L61 59L70 71', 'M59 45L60 60L65 73', 'M59 45L56 59L49 70', 'M59 45L52 58L42 67', 'M59 45L54 58L46 69', 'M59 45L59 60L62 73', 'M59 45L63 59L73 70', 'M59 45L63 59L73 69']
  const animation = { dur: `${pace}s`, keyTimes: '0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1' }

  return (
    <div className={`relative h-full w-full ${flip ? '-scale-x-100' : ''}`}>
      <motion.div className="absolute right-[12%] bottom-0 left-[12%] h-2.5 rounded-full bg-ae-ink/30 blur-[2px]" animate={{ scaleX: [1, .8, 1, .8, 1], opacity: [.28, .17, .28, .17, .28] }} transition={loop} />
      <motion.div className="h-full w-full" animate={{ y: [0, -2, 0, -2, 0], rotate: [-0.6, 0, 0.6, 0, -0.6] }} transition={loop}>
      <svg className="h-full w-full overflow-visible" viewBox="0 0 92 136" fill="none" aria-hidden="true">
        <path d={backLeg[0]} stroke={pants} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"><animate attributeName="d" dur={animation.dur} repeatCount="indefinite" values={backLeg.join(';')} keyTimes={animation.keyTimes} calcMode="discrete" /></path>
        <path d={backShoe[0]} fill="#26312D"><animate attributeName="d" dur={animation.dur} repeatCount="indefinite" values={backShoe.join(';')} keyTimes={animation.keyTimes} calcMode="discrete" /></path>
        <path d={backArm[0]} stroke={skin} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"><animate attributeName="d" dur={animation.dur} repeatCount="indefinite" values={backArm.join(';')} keyTimes={animation.keyTimes} calcMode="discrete" /></path>
        <path d="M30 40C39 32 55 34 61 48L56 77L30 73L25 49Z" fill={shirt} stroke="#17221F" strokeWidth="3" />
        <path d={frontLeg[0]} stroke={pants} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"><animate attributeName="d" dur={animation.dur} repeatCount="indefinite" values={frontLeg.join(';')} keyTimes={animation.keyTimes} calcMode="discrete" /></path>
        <path d={frontShoe[0]} fill="#26312D"><animate attributeName="d" dur={animation.dur} repeatCount="indefinite" values={frontShoe.join(';')} keyTimes={animation.keyTimes} calcMode="discrete" /></path>
        <path d={frontArm[0]} stroke={skin} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"><animate attributeName="d" dur={animation.dur} repeatCount="indefinite" values={frontArm.join(';')} keyTimes={animation.keyTimes} calcMode="discrete" /></path>
        <circle cx="45" cy="21" r="14" fill={skin} stroke="#17221F" strokeWidth="3" />
        <path d="M31 19C31 5 51 1 60 18L46 15Z" fill={hair} />
        <path d="M54 41C67 40 69 57 63 68L53 62Z" fill="#087F5B" stroke="#17221F" strokeWidth="3" />
      </svg>
      </motion.div>
    </div>
  )
}

const walkers = [
  { direction: 'right', edge: '-8rem', lane: 'bottom-14 sm:bottom-20', width: 'w-20 sm:w-24', duration: 15, delay: 0, person: { skin: '#C9825D', shirt: '#F7F1E4', pants: '#17382D', hair: '#17382D', pace: 0.82 } },
  { direction: 'right', edge: '-12rem', lane: 'bottom-16 sm:bottom-[5.5rem]', width: 'w-16 sm:w-20', duration: 21, delay: 4.5, person: { skin: '#8B573F', shirt: '#E987A1', pants: '#263B73', hair: '#2B211C', pace: 0.94 } },
  { direction: 'left', edge: '-10rem', lane: 'bottom-14 sm:bottom-20', width: 'w-[4.5rem] sm:w-[5.5rem]', duration: 17, delay: 7.5, person: { skin: '#E0A47D', shirt: '#8C9DE8', pants: '#5B6E5D', hair: '#5B3527', flip: true, pace: 0.76 } },
  { direction: 'left', edge: '-14rem', lane: 'bottom-16 sm:bottom-[5.5rem]', width: 'w-[4.75rem] sm:w-[5.75rem]', duration: 24, delay: 12.2, person: { skin: '#A96F50', shirt: '#F2C45D', pants: '#354B43', hair: '#202C27', flip: true, pace: 0.88 } },
]

export function ContactPage() {
  return (
    <main id="main-content" className="relative h-[calc(100svh-72px)] min-h-[40rem] overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
      <div className="mx-auto h-full max-w-[90rem] px-5 pt-8 pb-60 sm:px-8 sm:pt-12 sm:pb-64 lg:px-12 lg:pt-16">
        <section className="relative z-10 max-w-[48rem]" aria-labelledby="contact-title">
          <h1 className="m-0 text-[clamp(2.7rem,6vw,5.6rem)] leading-[.9] font-black tracking-[-.065em]" id="contact-title">Let’s make city journeys <span className="text-ae-brand">clearer.</span></h1>
          <p className="mt-5 mb-0 max-w-[38rem] text-base leading-7 font-semibold text-ae-muted sm:text-lg sm:leading-8">Feedback, research collaboration, and partnership enquiries are welcome.</p>
          <div className="mt-6 grid max-w-[39rem] gap-3 min-[580px]:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-white p-4 shadow-[0_14px_32px_rgba(20,41,34,.08)]"><img className="size-7 object-contain" src={colorEmailIcon} alt="" aria-hidden="true" /><span className="mt-3 block text-xs font-black uppercase tracking-[.1em] text-ae-muted">Email</span><a className="mt-1 block whitespace-nowrap text-sm font-black text-ae-ink underline decoration-ae-brand underline-offset-4" href="mailto:hello@aeroute.example">hello@aeroute.example</a></div>
            <div className="rounded-lg bg-white p-4 shadow-[0_14px_32px_rgba(20,41,34,.08)]"><img className="size-7 object-contain" src={colorOfficeIcon} alt="" aria-hidden="true" /><span className="mt-3 block text-xs font-black uppercase tracking-[.1em] text-ae-muted">Based in</span><span className="mt-1 block text-sm font-black">Jakarta, Indonesia</span></div>
          </div>
        </section>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-56 sm:h-64" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-36 bg-[#889890] sm:h-44" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[#d8d6ca] sm:h-36" />
        <div className="absolute inset-x-0 bottom-24 h-4 bg-[#f5f1df] shadow-[0_-6px_20px_rgba(20,41,34,.12)] sm:bottom-32" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[repeating-linear-gradient(90deg,#d8d6ca_0,#d8d6ca_78px,#babdb5_79px,#babdb5_81px)] sm:h-32" />
        <StreetLamp className="absolute bottom-12 left-[2%] w-28 sm:bottom-16 sm:left-[7%] sm:w-36" />
        <StreetLamp className="absolute right-[7%] bottom-16 hidden w-36 sm:block" flip />
        <div className="absolute right-[28%] bottom-24 hidden h-12 w-20 rounded-t-full bg-[#76a77f] sm:block sm:bottom-32" />
        {walkers.map(({ direction, edge, lane, width, duration, delay, person }) => <motion.div className={`absolute ${lane} ${width}`} style={direction === 'right' ? { left: edge } : { right: edge }} animate={{ x: direction === 'right' ? 'calc(100vw + 16rem)' : 'calc(-100vw - 16rem)' }} transition={{ duration, delay, repeat: Infinity, repeatDelay: duration % 4 + 1.7, ease: 'linear' }} key={`${duration}-${direction}`}><WalkingPerson {...person} /></motion.div>)}
      </div>
    </main>
  )
}
