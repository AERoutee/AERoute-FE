import { ArrowRight } from 'lucide-react'
import { colorSearchIcon, colorSignpostIcon, colorSproutIcon } from '@/assets'
import { ConceptBadge } from '@/components/common'
import { motion } from 'motion/react'
import { Link } from 'react-router'

const missions = [
  { number: '01', icon: colorSearchIcon, title: 'Make the invisible visible', description: 'Turn estimated air-quality exposure into route context that people can understand before they leave.' },
  { number: '02', icon: colorSignpostIcon, title: 'Show honest trade-offs', description: 'Place time, distance, and estimated exposure side by side without pretending one route is right for everyone.' },
  { number: '03', icon: colorSproutIcon, title: 'Support better city movement', description: 'Help walking and cycling decisions feel informed, practical, and connected to more sustainable cities.' },
]

export function VisionMissionPage() {
  return (
    <main id="main-content" className="overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
      <section className="relative min-h-[30rem] px-5 py-16 sm:min-h-[34rem] sm:px-8 sm:py-24 lg:px-12 lg:py-28" aria-labelledby="vision-title">
        <div className="pointer-events-none absolute top-0 right-[-8rem] z-0 hidden h-[58rem] w-[42rem] lg:block" aria-hidden="true">
          <svg className="h-full w-full" viewBox="0 0 520 920" fill="none" preserveAspectRatio="none"><path d="M430 -40C430 130 235 170 275 335S500 500 350 640C285 700 300 760 245 790C215 806 170 812 125 820" stroke="#dce7e1" strokeWidth="92" strokeLinecap="round" /><path d="M430 -40C430 130 235 170 275 335S500 500 350 640C285 700 300 760 245 790C215 806 170 812 125 820" stroke="#23312c" strokeWidth="72" strokeLinecap="round" /><path d="M430 -40C430 130 235 170 275 335S500 500 350 640C285 700 300 760 245 790C215 806 170 812 125 820" stroke="#fffdf4" strokeWidth="2" strokeDasharray="11 15" strokeLinecap="round" /></svg>
        </div>
        <div className="pointer-events-none absolute top-0 right-[-3rem] bottom-0 w-36 lg:hidden" aria-hidden="true"><svg className="h-full w-full" viewBox="0 0 140 560" fill="none" preserveAspectRatio="none"><path d="M110 -40C110 110 30 165 74 285S125 400 168 445" stroke="#dce7e1" strokeWidth="58" strokeLinecap="round" /><path d="M110 -40C110 110 30 165 74 285S125 400 168 445" stroke="#23312c" strokeWidth="44" strokeLinecap="round" /><path d="M110 -40C110 110 30 165 74 285S125 400 168 445" stroke="#fffdf4" strokeWidth="2" strokeDasharray="10 14" strokeLinecap="round" /></svg></div>
        <div className="relative z-10 mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[minmax(0,45rem)_1fr] lg:items-center">
          <div className="max-w-[72%] sm:max-w-[40rem] lg:max-w-none">
            <h1 className="m-0 text-[clamp(2.9rem,13vw,7rem)] leading-[.88] font-black tracking-[-.07em]" id="vision-title">A clearer route for <span className="text-ae-brand">every breath.</span></h1>
            <p className="mt-7 mb-0 max-w-[42rem] text-lg leading-8 font-semibold text-ae-muted sm:text-xl">Our vision is a city where choosing how to move includes the air around us not only the minutes ahead.</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 py-20 sm:px-8 lg:px-12 lg:py-28" aria-labelledby="mission-title">
        <div className="mx-auto max-w-[90rem]">
          <div className="max-w-[42rem]"><p className="mb-3 text-xs font-black tracking-[.16em] text-ae-brand uppercase">The mission route</p><h2 className="m-0 text-4xl leading-[.98] font-black tracking-[-.055em] sm:text-6xl" id="mission-title">Three milestones.<br /><span className="text-ae-brand">One shared direction.</span></h2></div>
          <div className="relative mt-16 grid gap-8 lg:mt-24 lg:grid-cols-3 lg:gap-10">
            <div className="absolute top-12 right-[15%] left-[15%] hidden h-1 bg-ae-soft lg:block" aria-hidden="true" />
            {missions.map(({ number, icon, title, description }, index) => <motion.article className="relative z-10 rounded-xl bg-white p-6 shadow-[0_20px_55px_rgba(20,41,34,.11)] sm:p-8" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .55, delay: index * .12 }} key={number}><div className="flex items-center justify-between"><ConceptBadge src={icon} size="lg" /><span className="text-sm font-black tracking-[.16em] text-ae-brand">{number}</span></div><h3 className="mt-9 mb-0 text-2xl font-black tracking-[-.035em]">{title}</h3><p className="mt-3 mb-0 text-base leading-7 font-semibold text-ae-muted">{description}</p></motion.article>)}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mx-auto grid max-w-[90rem] gap-8 rounded-xl bg-ae-ink p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <h2 className="m-0 max-w-3xl text-4xl leading-[.98] font-black tracking-[-.05em] sm:text-5xl">Inform decisions. Never overstate certainty.</h2>
          <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-black text-ae-ink no-underline hover:bg-ae-soft" to="/contact">Talk with us <ArrowRight className="size-5" aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  )
}
