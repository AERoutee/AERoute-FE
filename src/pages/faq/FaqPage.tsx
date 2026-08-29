import { ArrowRight, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { colorCompassIcon, colorHelpIcon, colorShieldIcon } from '@/assets'
import { ConceptBadge } from '@/components/common'

const groups = [
  {
    label: 'Before you go', icon: colorCompassIcon, questions: [
      { question: 'What does AERoute compare?', answer: 'AERoute compares walking and cycling route options using travel time, distance, and estimated PM2.5 exposure. The goal is to make route trade-offs easier to understand before a trip.' },
      { question: 'Is the lowest-exposure route always recommended?', answer: 'Not necessarily. A recommended route balances time and estimated exposure. You can still choose the fastest option or the option with the lowest estimated exposure based on your priorities.' },
      { question: 'Can I use AERoute for driving or public transport?', answer: 'The current product concept focuses on walking and cycling. Other travel modes may be considered later when they can be supported clearly and responsibly.' },
      { question: 'Can I compare walking and cycling for the same journey?', answer: 'Yes. AERoute is designed to show each supported mode in its own context because travel time, route geometry, and estimated exposure can differ.' },
      { question: 'What should I check before choosing a route?', answer: 'Review travel time, distance, estimated exposure, current conditions, and your own comfort or mobility needs before deciding.' },
    ],
  },
  {
    label: 'Route estimates', icon: colorHelpIcon, questions: [
      { question: 'How is PM2.5 exposure estimated?', answer: 'AERoute combines route geometry, travel duration, and available air-quality data to estimate relative exposure along each option. It is informational, not a direct measurement of what an individual inhales.' },
      { question: 'Why can a longer route have lower estimated exposure?', answer: 'A slightly longer route may pass through areas with lower estimated pollutant concentration. AERoute surfaces that trade-off so you can decide whether the extra time is worthwhile.' },
      { question: 'Are air-quality estimates available everywhere?', answer: 'Coverage depends on the availability and quality of source data. When information is limited, AERoute should communicate that uncertainty rather than imply false precision.' },
      { question: 'How current is the air-quality data?', answer: 'Freshness depends on the connected data source and location. The product should display timestamps or freshness indicators whenever data is available.' },
      { question: 'Why might the same route show a different estimate later?', answer: 'Air quality, weather, traffic patterns, source updates, and route duration can change. Estimates may therefore vary between searches.' },
      { question: 'Does a lower estimate mean the route is safe?', answer: 'No estimate guarantees safety. It only supports comparison between available options and should be considered alongside official guidance and personal health needs.' },
    ],
  },
  {
    label: 'Account and trust', icon: colorShieldIcon, questions: [
      { question: 'Do I need an account?', answer: 'You can explore the public product story without an account. An account is used for authenticated features such as accessing the dashboard and future saved preferences.' },
      { question: 'Is AERoute a medical device?', answer: 'No. AERoute provides informational route context and is not medical advice, a diagnostic tool, or a substitute for guidance from a qualified health professional.' },
      { question: 'What information is stored in my account?', answer: 'The current implementation uses account information needed for authentication. Future saved routes or preferences should be explained clearly before they are stored.' },
      { question: 'Can I use Google to sign in?', answer: 'Yes, when Google authentication is configured and available. Email and password authentication is also supported by the current interface.' },
      { question: 'How can I report an incorrect route or estimate?', answer: 'Use the Contact page and include the origin, destination, travel mode, approximate time, and what appeared incorrect.' },
      { question: 'How can I ask about a partnership?', answer: 'Visit the Contact page for current contact details. Research, data, accessibility, and city-mobility collaborations are welcome.' },
    ],
  },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return <div className={`rounded-lg bg-white transition-shadow ${open ? 'shadow-[0_18px_48px_rgba(20,41,34,.13)]' : 'shadow-[0_14px_40px_rgba(20,41,34,.09)]'}`}><button className="flex min-h-16 w-full items-center justify-between gap-5 px-5 py-4 text-left text-base font-black sm:px-6" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>{question}</span><motion.span className="shrink-0 text-ae-brand" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: .28, ease: [.22, 1, .36, 1] }}><ChevronDown className="size-5" aria-hidden="true" /></motion.span></button><AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ height: { duration: .34, ease: [.22, 1, .36, 1] }, opacity: { duration: .22 } }} className="overflow-hidden"><motion.p initial={{ y: -8 }} animate={{ y: 0 }} exit={{ y: -6 }} transition={{ duration: .28, ease: [.22, 1, .36, 1] }} className="mt-0 mb-0 border-t border-ae-line px-5 py-5 text-base leading-7 font-semibold text-ae-muted sm:px-6">{answer}</motion.p></motion.div>}</AnimatePresence></div>
}

export function FaqPage() {
  return (
    <main id="main-content" className="relative overflow-hidden bg-white text-ae-ink" tabIndex={-1}>
      <section className="relative min-h-[28rem] px-5 py-16 sm:min-h-0 sm:px-8 sm:py-24 lg:px-12 lg:py-28" aria-labelledby="faq-title">
        <div className="pointer-events-none absolute right-[-3rem] bottom-[-2rem] hidden h-[32rem] w-[34rem] lg:block" aria-hidden="true"><svg className="h-full w-full overflow-visible" viewBox="0 0 540 520" fill="none" preserveAspectRatio="none"><path d="M590 265H390C315 265 265 230 220 165L120 20M390 265C315 265 265 300 220 365L120 510" stroke="#dce7e1" strokeWidth="92" strokeLinecap="round" strokeLinejoin="round" /><path d="M590 265H390C315 265 265 230 220 165L120 20M390 265C315 265 265 300 220 365L120 510" stroke="#23312c" strokeWidth="72" strokeLinecap="round" strokeLinejoin="round" /><path d="M590 265H390C315 265 265 230 220 165L120 20M390 265C315 265 265 300 220 365L120 510" stroke="#fffdf4" strokeWidth="2" strokeDasharray="11 15" strokeLinecap="round" /></svg></div>
        <div className="pointer-events-none absolute right-[-2.5rem] bottom-0 h-64 w-40 lg:hidden" aria-hidden="true"><svg className="h-full w-full overflow-visible" viewBox="0 0 160 260" fill="none" preserveAspectRatio="none"><path d="M195 132H120C92 132 76 113 60 86L22 18M120 132C92 132 76 151 60 178L22 246" stroke="#dce7e1" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" /><path d="M195 132H120C92 132 76 113 60 86L22 18M120 132C92 132 76 151 60 178L22 246" stroke="#23312c" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" /><path d="M195 132H120C92 132 76 113 60 86L22 18M120 132C92 132 76 151 60 178L22 246" stroke="#fffdf4" strokeWidth="2" strokeDasharray="9 13" strokeLinecap="round" /></svg></div>
        <div className="relative z-10 mx-auto max-w-[90rem]"><div className="max-w-[72%] sm:max-w-[48rem] lg:max-w-[42rem]"><h1 className="m-0 text-[clamp(3.2rem,7vw,6.5rem)] leading-[.88] font-black tracking-[-.07em]" id="faq-title">Questions for the <span className="text-ae-brand">road ahead.</span></h1><p className="mt-7 mb-0 max-w-[40rem] text-lg leading-8 font-semibold text-ae-muted sm:text-xl">Clear answers about route comparisons, exposure estimates, and what AERoute can and cannot tell you.</p></div></div>
      </section>

      <section className="relative z-10 px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28" aria-label="Frequently asked questions"><div className="mx-auto grid max-w-[90rem] gap-14">{groups.map(({ label, icon, questions }) => <section className="grid gap-6 lg:grid-cols-[17rem_1fr] lg:gap-12" aria-labelledby={`faq-${label.toLowerCase().replaceAll(' ', '-')}`} key={label}><div><ConceptBadge src={icon} /><h2 className="mt-5 mb-0 text-2xl font-black tracking-[-.035em]" id={`faq-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</h2></div><div className="grid gap-3">{questions.map(({ question, answer }) => <FaqItem question={question} answer={answer} key={question} />)}</div></section>)}</div></section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28"><div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-8 rounded-xl bg-ae-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center"><h2 className="m-0 max-w-2xl text-4xl leading-[.98] font-black tracking-[-.05em] sm:text-5xl">Still have a question?</h2><Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-black text-ae-ink no-underline hover:bg-ae-soft" to="/contact">Contact us <ArrowRight className="size-5" aria-hidden="true" /></Link></div></section>
    </main>
  )
}
