<div align="center">
  <img src="src/assets/aeroute-logo.png" alt="AERoute" width="180" />

  # AERoute Frontend
  ### A clearer route for every breath.

  [![GitHub](https://img.shields.io/badge/GitHub-AERoute--FE-181717?style=for-the-badge&logo=github)](https://github.com/AERoutee/AERoute-FE)

  **Submission for ITECHNO CUP 2026 - Web Development**

  **By AERoute Team**
</div>

---

## 📋 Daftar Isi

- [Tim Developer](#-tim-developer)
- [Tentang Proyek](#-tentang-proyek)
- [Fitur Unggulan](#-fitur-unggulan)
- [Demo & Screenshot](#-demo--screenshot)
- [Teknologi](#-teknologi)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Instalasi & Setup](#-instalasi--setup)
- [Penggunaan](#-penggunaan)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Lisensi](#-lisensi)

---

## 👥 Tim Developer

| Nama | Peran | GitHub |
| --- | --- | --- |
| **Andrian Pratama** | Project Lead & Lead Full-Stack Developer | [@Yanzz231](https://github.com/Yanzz231) |
| **Jeremy Auriel Zhang** | Full-Stack Developer | [@jeremzhg](https://github.com/jeremzhg) |
| **Calvin Wu** | Product Manager | [@5calvinw](https://github.com/5calvinw) |

---

## 🎯 Tentang Proyek

### Latar Belakang

Pengguna walking dan cycling memerlukan lebih dari waktu serta jarak. Kondisi PM2.5, cuaca, hambatan jalur, dan perubahan lapangan perlu terlihat pada satu peta yang mudah digunakan di desktop maupun mobile.

### Solusi yang Ditawarkan

AERoute Frontend menyediakan pengalaman map-first untuk mencari lokasi, membandingkan route alternatives, memilih garis route, melihat PM2.5 per segmen, membaca weather checkpoints, mengikuti live location, dan mengirim community road report dengan foto.

### Tujuan Proyek

- 🎯 **Tujuan Utama**: menyajikan route trade-off secara visual dan dapat dipahami.
- 📊 **Target Pengguna**: pejalan kaki, pesepeda, dan komuter perkotaan.
- 💡 **Value Proposition**: satu interface responsif untuk route, PM2.5, weather, live location, dan laporan komunitas.

---

## ✨ Fitur Unggulan

| Fitur | Deskripsi | Keunggulan |
| --- | --- | --- |
| **Map-first Planner** | Planner, route options, weather, dan reports tampil di atas Google Map | Pengguna tetap mempertahankan konteks geografis |
| **Clickable Alternatives** | Garis route memiliki hit area besar dan dapat dipilih langsung | Route card dan map selalu sinkron |
| **Segment PM2.5 Colors** | Garis berubah hijau, kuning, atau merah berdasarkan sample | Kondisi lokal sepanjang route lebih mudah dipahami |
| **Weather Checkpoints** | Weather cards tampil pada selected route | Tidak memenuhi Routes panel dengan informasi non-route |
| **Road Reports** | Bottom sheet/panel report dengan camera, gallery, dan preview | Mobile-friendly dan mendukung informasi lapangan |

Fitur tambahan:

- Live geolocation marker dan heading rotation.
- Profile image crop serta upload.
- Email/password dan Google OAuth.
- OTP recovery dengan opaque challenge ID.
- Mobile bottom navigation dan draggable sheets.
- Public product pages serta responsive 404.

---

## 📸 Demo & Screenshot

### Live Demo

Live demo belum dipublikasikan.

Target deployment: `https://aeroute.my.id`.

### Screenshot Aplikasi

Screenshot kompetisi belum ditambahkan. Tambahkan capture landing, desktop dashboard, mobile dashboard, profile, dan report flow setelah deployment final.

### Video Demo

Video demo belum tersedia.

---

## 🛠️ Teknologi

### Tech Stack

```text
Framework    : React 19 + Vite 8 + TypeScript
Styling      : Tailwind CSS 4
Routing      : React Router
Server State : TanStack Query + Axios
Auth Client  : Better Auth React
Maps         : Google Maps JavaScript API + Places
Animation    : Motion
Icons        : Lucide React + selected Icons8 Color assets
```

### Alasan Pemilihan Teknologi

| Teknologi | Alasan Pemilihan |
| --- | --- |
| **React** | Cocok untuk map overlays, sheets, account flows, dan state interaktif |
| **Vite** | Development cepat dan production code splitting |
| **TanStack Query** | Memisahkan server state dari state interface |
| **Google Maps JS** | Map, Places autocomplete, markers, polylines, dan InfoWindow |
| **Motion** | Animasi deterministic untuk public pages dan panels |

### Dependencies Utama

```json
{
  "react": "^19.2.4",
  "react-router": "^7.13.2",
  "@tanstack/react-query": "^5.95.2",
  "axios": "^1.13.6",
  "better-auth": "^1.7.1",
  "motion": "^12.38.0"
}
```

---

## 🏗️ Arsitektur Sistem

```text
React Pages
  -> feature hooks
  -> API modules
  -> Axios client
  -> AERoute Backend

Dashboard
  -> Google Maps JS API
  -> live geolocation
  -> route polylines
  -> weather/report markers
```

### Folder Structure

```text
src/
├── api/          # Axios request modules
├── assets/       # Logo, photos, local icons
├── components/   # Auth, common, layout, map, planner
├── config/       # API/auth/maps clients and route registry
├── constants/    # Endpoint constants
├── context/      # Toast context
├── hooks/        # Query mutations and panel behavior
├── lib/          # Stateless helpers
├── pages/        # Route-level screens
└── types/        # Shared API/domain contracts
```

### Access Model

| Route | Access |
| --- | --- |
| `/`, `/about`, `/vision-mission`, `/faq`, `/contact` | Public |
| `/login`, `/register`, `/forgot-password` | Guest |
| `/verify-otp`, `/new-password` | Recovery flow |
| `/dashboard`, `/profile` | Authenticated |

---

## ⚙️ Instalasi & Setup

### Prerequisites

- Node.js 24 atau versi LTS modern yang didukung Vite 8.
- npm.
- Backend AERoute yang dapat diakses browser.
- Google Maps browser key dengan HTTP-referrer restriction.

### Instalasi

```bash
git clone https://github.com/AERoutee/AERoute-FE.git
cd AERoute-FE
npm ci
copy .env.example .env
npm run dev
```

### Environment

```env
VITE_API_BASE_URL="http://localhost:3000"
VITE_GOOGLE_MAPS_BROWSER_KEY="replace-with-browser-restricted-key"
```

Semua variable `VITE_*` dikirim ke browser. Jangan menaruh database, SMTP, Better Auth secret, OAuth secret, atau server API key.

---

## 🚀 Penggunaan

1. Jalankan frontend dan backend.
2. Buka `http://localhost:5173`.
3. Masuk atau buat akun.
4. Izinkan browser location jika ingin live marker/report.
5. Pilih origin, destination, mode, dan priority.
6. Bandingkan dan klik route card atau garis pada map.
7. Aktifkan Weather/Community Reports melalui Layers.
8. Buat report menggunakan current location dan maksimal tiga foto.

### Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run preview
```

---

## 📚 API Documentation

```text
Development : http://localhost:3000
Production  : https://api.aeroute.my.id
Swagger UI : https://api.aeroute.my.id/api/docs
OpenAPI JSON: https://api.aeroute.my.id/api/openapi.json
```

Frontend menggunakan cookie session dan `withCredentials`. API module berada di `src/api`; endpoint path berada di `src/constants/api.ts`.

---

## 🧪 Testing

Automated frontend test suite belum tersedia.

```bash
npm run lint
npm run typecheck
npm run build
```

QA manual diperlukan untuk Google Maps rendering, geolocation permission, camera capture, OAuth callback, OTP email, mobile sheets, dan responsive layout.

---

## 📄 Lisensi

Lisensi proyek belum ditetapkan. Tidak ada klaim lisensi MIT sampai file `LICENSE` resmi ditambahkan.

---

<div align="center">

  **Made by AERoute Team for ITECHNO CUP 2026**

</div>
