# AERoute Frontend

React/Vite SPA untuk pengalaman publik, autentikasi, route planner, live map, weather context, dan community road reports AERoute.

## Stack

- React 19
- Vite 8
- TypeScript
- React Router
- TanStack Query
- Axios
- Better Auth client
- Google Maps JavaScript API
- Tailwind CSS 4
- Motion
- Lucide React dan selected Icons8 Color assets

## Prerequisites

- Node.js 24 atau versi LTS modern yang didukung Vite 8.
- npm.
- AERoute backend yang berjalan dan dapat diakses browser.
- Google Maps browser key yang dibatasi dengan HTTP referrer.

## Environment

Salin kontrak environment:

```powershell
Copy-Item .env.example .env
```

| Variable | Fungsi |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL backend, contoh `http://localhost:3000` |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Browser-restricted key untuk Maps JavaScript dan Places |

Semua variable dengan prefix `VITE_` dikirim ke browser. Jangan memasukkan database URL, server API key, SMTP credential, OAuth secret, Better Auth secret, atau object-storage secret.

## Install dan Run

```powershell
npm ci
npm run dev
```

Development server berjalan pada `http://localhost:5173` secara default.

## Scripts

| Command | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan Vite development server |
| `npm run lint` | Menjalankan Oxlint |
| `npm run typecheck` | Menjalankan TypeScript project checks |
| `npm run build` | Typecheck dan production bundle |
| `npm run preview` | Menjalankan hasil build secara lokal |

## Halaman dan Access

| Route | Access | Tujuan |
| --- | --- | --- |
| `/` | Public | Landing dan product story |
| `/about` | Public | Product background dan principles |
| `/vision-mission` | Public | Vision, mission, dan product promise |
| `/faq` | Public | FAQ route, exposure, account, dan trust |
| `/contact` | Public | Contact information |
| `/dashboard` | Authenticated | Map-first route planner dan reports |
| `/profile` | Authenticated | Profile, avatar, password, OAuth credential setup |
| `/login` | Guest | Email/password dan Google sign-in |
| `/register` | Guest | Account registration |
| `/forgot-password` | Guest | Membuat recovery challenge |
| `/verify-otp?id=...` | Recovery flow | Verifikasi OTP enam digit |
| `/new-password?id=...` | Verified recovery flow | Menetapkan password baru |

Route registry berada di `src/config/routes.ts`. Setiap route memiliki title browser sendiri serta layout/access metadata.

## Struktur Source

```text
src/
├── api/                 # Raw Axios request modules
├── assets/              # Logo, photos, dan licensed local icons
├── components/
│   ├── auth/            # Guards dan security illustrations
│   ├── common/          # Reusable app components
│   ├── layout/          # Public/dashboard shells dan account menu
│   ├── map/             # Google Map, route, weather, report markers
│   └── planner/         # Location inputs dan autocomplete
├── config/              # API client, auth client, Maps loader, routes
├── constants/           # Endpoint paths
├── context/             # Toast provider
├── hooks/               # Mutations, mobile sheet, draggable panels
├── lib/                 # Stateless helpers dan report icon registry
├── pages/               # Route-level feature screens
└── types/               # API and domain contracts
```

## Dashboard Flow

1. Browser meminta permission lokasi dan memulai `watchPosition`.
2. Live marker diperbarui in-place; map tidak dibuat ulang setiap GPS update.
3. Pengguna memilih origin/destination, mode, dan priority.
4. Frontend POST ke `/api/v1/route-comparisons`.
5. Rute digambar sebagai clickable PM2.5-colored segments.
6. Klik garis memilih route option dan memperbarui summary.
7. Weather layer menampilkan condition cards pada 25%, 50%, dan 75% selected route.
8. Planner, Routes, Report, dan Layers tersedia sebagai mobile bottom navbar atau desktop control stack.

### Route colors

- Hijau: PM2.5 sample ≤15 µg/m³.
- Kuning: PM2.5 sample 16–35 µg/m³.
- Merah: PM2.5 sample >35 µg/m³.

Warna segmen adalah context visual. Route selection tidak bergantung pada warna saja; line weight, opacity, cards, dan labels tetap tersedia.

## Route Preferences

- `Balanced`: memilih exposure terendah dalam batas 20% dari waktu rute tercepat.
- `Sensitive-user mode` + Balanced: memperluas batas menjadi 35%.
- `Lower exposure`: memilih route dengan estimated exposure terendah tanpa menggunakan time-window Balanced.

## Community Reports

- Kategori: hazard, blocked path, crash, construction, dan map issue.
- Lokasi report ditangkap ketika report flow dimulai.
- Deskripsi: 10–500 karakter.
- Maksimal tiga gambar.
- Maksimal 3 MB per gambar.
- Format input: JPG, PNG, WebP.
- Mobile mendukung rear-camera capture dan gallery.
- Thumbnail dapat diklik untuk full-screen local preview sebelum submit.
- Report markers dibaca berdasarkan viewport dan berlaku 24 jam.
- Klik marker membuka Google Maps InfoWindow dengan detail dan gallery.

## Authentication dan Recovery

- Better Auth menggunakan cookie session dari backend.
- Guest guard mencegah user authenticated membuka login/register.
- Auth guard melindungi dashboard/profile.
- Recovery URL hanya memuat opaque `id`.
- Email dan OTP tidak disimpan pada URL atau persistent browser storage.
- New-password route membutuhkan OTP yang baru diverifikasi dalam navigation state; refresh memulai ulang flow.

## Responsive Behavior

- Public pages memakai layout full viewport dan mobile navigation menu.
- Dashboard mobile memakai bottom sheets yang dapat di-snap dan di-dismiss dengan drag ke bawah.
- Primary planner action tetap terlihat pada safe area bawah sheet.
- Mobile map controls menjadi empat-item bottom navigation saat panel tertutup.
- Desktop panels dapat dipindahkan dengan pointer dan keyboard.

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
```

Tidak ada test runner frontend pada repository ini. Validasi interaksi Google Maps, geolocation, camera capture, OAuth popup/redirect, dan responsive sheets tetap memerlukan QA browser manual.

