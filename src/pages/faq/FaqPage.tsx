import { ArrowRight, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { colorCompassIcon, colorHelpIcon, colorShieldIcon } from '@/assets'
import { ConceptBadge } from '@/components/common'

const groups = [
  {
    label: 'Sebelum berangkat', icon: colorCompassIcon, questions: [
      { question: 'Apa yang dibandingkan AERoute?', answer: 'AERoute membandingkan pilihan rute berjalan kaki dan bersepeda berdasarkan waktu tempuh, jarak, dan perkiraan paparan PM2.5. Tujuannya adalah agar pertimbangan rute lebih mudah dipahami sebelum bepergian.' },
      { question: 'Apakah rute dengan paparan terendah selalu direkomendasikan?', answer: 'Tidak selalu. Rute rekomendasi menyeimbangkan waktu dan perkiraan paparan. Anda tetap dapat memilih opsi tercepat atau opsi dengan perkiraan paparan terendah sesuai prioritas.' },
      { question: 'Dapatkah saya menggunakan AERoute untuk berkendara atau transportasi umum?', answer: 'Konsep produk saat ini berfokus pada berjalan kaki dan bersepeda. Moda perjalanan lain dapat dipertimbangkan nanti jika dapat didukung secara jelas dan bertanggung jawab.' },
      { question: 'Dapatkah saya membandingkan berjalan kaki dan bersepeda untuk perjalanan yang sama?', answer: 'Ya. AERoute dirancang untuk menampilkan setiap moda yang didukung dalam konteksnya sendiri karena waktu tempuh, bentuk rute, dan perkiraan paparan dapat berbeda.' },
      { question: 'Apa yang perlu saya periksa sebelum memilih rute?', answer: 'Tinjau waktu tempuh, jarak, perkiraan paparan, kondisi saat ini, serta kebutuhan kenyamanan atau mobilitas Anda sebelum memutuskan.' },
    ],
  },
  {
    label: 'Perkiraan rute', icon: colorHelpIcon, questions: [
      { question: 'Bagaimana paparan PM2.5 diperkirakan?', answer: 'AERoute menggabungkan bentuk rute, durasi perjalanan, dan data kualitas udara yang tersedia untuk memperkirakan paparan relatif di setiap pilihan. Ini adalah informasi, bukan pengukuran langsung atas paparan yang dihirup seseorang.' },
      { question: 'Mengapa rute yang lebih panjang dapat memiliki perkiraan paparan lebih rendah?', answer: 'Rute yang sedikit lebih panjang dapat melewati wilayah dengan perkiraan konsentrasi polutan lebih rendah. AERoute menampilkan pertimbangan tersebut agar Anda dapat menentukan apakah waktu tambahan itu sepadan.' },
      { question: 'Apakah perkiraan kualitas udara tersedia di semua tempat?', answer: 'Cakupan bergantung pada ketersediaan dan kualitas data sumber. Ketika informasi terbatas, AERoute perlu menyampaikan ketidakpastian tersebut, bukan memberikan kesan presisi yang keliru.' },
      { question: 'Seberapa mutakhir data kualitas udaranya?', answer: 'Kemutakhiran bergantung pada sumber data dan lokasi yang terhubung. Produk perlu menampilkan stempel waktu atau indikator kemutakhiran setiap kali data tersedia.' },
      { question: 'Mengapa rute yang sama dapat menunjukkan perkiraan berbeda di lain waktu?', answer: 'Kualitas udara, cuaca, pola lalu lintas, pembaruan sumber data, dan durasi rute dapat berubah. Karena itu, perkiraan dapat berbeda di setiap pencarian.' },
      { question: 'Apakah perkiraan yang lebih rendah berarti rutenya aman?', answer: 'Tidak ada perkiraan yang menjamin keamanan. Perkiraan hanya mendukung perbandingan antaropsi yang tersedia dan perlu dipertimbangkan bersama panduan resmi serta kebutuhan kesehatan pribadi.' },
    ],
  },
  {
    label: 'Akun dan kepercayaan', icon: colorShieldIcon, questions: [
      { question: 'Apakah saya memerlukan akun?', answer: 'Anda dapat menjelajahi informasi produk publik tanpa akun. Akun digunakan untuk fitur terautentikasi seperti mengakses dasbor dan preferensi tersimpan di masa mendatang.' },
      { question: 'Apakah AERoute merupakan perangkat medis?', answer: 'Bukan. AERoute menyediakan konteks rute sebagai informasi dan bukan nasihat medis, alat diagnosis, atau pengganti panduan dari tenaga kesehatan yang berkualifikasi.' },
      { question: 'Informasi apa yang disimpan dalam akun saya?', answer: 'Penerapan saat ini menggunakan informasi akun yang diperlukan untuk autentikasi. Rute atau preferensi yang disimpan di masa mendatang akan dijelaskan secara jelas sebelum disimpan.' },
      { question: 'Dapatkah saya masuk dengan Google?', answer: 'Ya, ketika autentikasi Google telah dikonfigurasi dan tersedia. Antarmuka saat ini juga mendukung autentikasi dengan email dan kata sandi.' },
      { question: 'Bagaimana cara melaporkan rute atau perkiraan yang tidak tepat?', answer: 'Gunakan halaman Kontak dan sertakan titik asal, tujuan, moda perjalanan, perkiraan waktu, serta bagian yang tampak tidak tepat.' },
      { question: 'Bagaimana cara menanyakan kemitraan?', answer: 'Kunjungi halaman Kontak untuk detail kontak terbaru. Kami menyambut kolaborasi dalam riset, data, aksesibilitas, dan mobilitas kota.' },
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
        <div className="relative z-10 mx-auto max-w-[90rem]"><div className="max-w-[72%] sm:max-w-[48rem] lg:max-w-[42rem]"><h1 className="m-0 text-[clamp(3.2rem,7vw,6.5rem)] leading-[.88] font-black tracking-[-.07em]" id="faq-title">Pertanyaan untuk <span className="text-ae-brand">perjalanan Anda.</span></h1><p className="mt-7 mb-0 max-w-[40rem] text-lg leading-8 font-semibold text-ae-muted sm:text-xl">Jawaban jelas tentang perbandingan rute, perkiraan paparan, serta hal yang dapat dan tidak dapat disampaikan AERoute.</p></div></div>
      </section>

      <section className="relative z-10 px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28" aria-label="Pertanyaan yang sering diajukan"><div className="mx-auto grid max-w-[90rem] gap-14">{groups.map(({ label, icon, questions }) => <section className="grid gap-6 lg:grid-cols-[17rem_1fr] lg:gap-12" aria-labelledby={`faq-${label.toLowerCase().replaceAll(' ', '-')}`} key={label}><div><ConceptBadge src={icon} /><h2 className="mt-5 mb-0 text-2xl font-black tracking-[-.035em]" id={`faq-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</h2></div><div className="grid gap-3">{questions.map(({ question, answer }) => <FaqItem question={question} answer={answer} key={question} />)}</div></section>)}</div></section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28"><div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-8 rounded-xl bg-ae-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center"><h2 className="m-0 max-w-2xl text-4xl leading-[.98] font-black tracking-[-.05em] sm:text-5xl">Masih punya pertanyaan?</h2><Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-black text-ae-ink no-underline hover:bg-ae-soft" to="/contact">Hubungi kami <ArrowRight className="size-5" aria-hidden="true" /></Link></div></section>
    </main>
  )
}
