# PB Net-C — Aplikasi Manajemen Komunitas Badminton

Aplikasi web full-stack untuk mengelola komunitas badminton: sesi latihan, kehadiran anggota, pembayaran iuran, dan profil member.

---

## Tech Stack

### Frontend
| Teknologi | Versi | Keterangan |
|-----------|-------|-----------|
| [Next.js](https://nextjs.org) | 16.2.6 | App Router, SSR, Turbopack |
| [React](https://react.dev) | 19 | UI library |
| [TypeScript](https://www.typescriptlang.org) | 5.x | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | v4 | Styling |
| [shadcn/ui](https://ui.shadcn.com) | latest | Komponen UI (Radix + Tailwind) |
| [Lucide React](https://lucide.dev) | latest | Icon library |
| [Sonner](https://sonner.emilkowal.ski) | latest | Toast notifications |
| [React Hook Form](https://react-hook-form.com) | latest | Form management |
| [Zod](https://zod.dev) | latest | Schema validation |

### Backend
| Teknologi | Versi | Keterangan |
|-----------|-------|-----------|
| Next.js API Routes | 16.2.6 | REST API (App Router) |
| [NextAuth.js](https://authjs.dev) | v5 beta | Autentikasi Google OAuth |
| [Prisma ORM](https://prisma.io) | 7.x | Database ORM |
| [@prisma/adapter-pg](https://www.prisma.io/docs/orm/overview/databases/postgresql) | latest | Driver adapter PostgreSQL |

### Database & Storage
| Teknologi | Keterangan |
|-----------|-----------|
| [Supabase](https://supabase.com) | PostgreSQL database + Storage bucket |
| [Supabase Storage](https://supabase.com/storage) | Upload bukti pembayaran |

---

## Fitur

- **Autentikasi** — Login via Google OAuth
- **Onboarding** — Pengisian profil saat pertama kali login
- **Dashboard Member** — Ringkasan sesi mendatang, kehadiran, dan status iuran
- **Sesi Latihan** — Lihat dan daftar sesi, RSVP
- **Pembayaran** — Upload bukti bayar iuran bulanan
- **Admin Panel** — Kelola sesi, kehadiran, pembayaran, anggota, dan pengaturan komunitas

---

## Prasyarat

- [Node.js](https://nodejs.org) v20+
- Akun [Supabase](https://supabase.com) (database + storage bucket)
- Akun Google Cloud (untuk OAuth credentials)

---

## Instalasi

1. **Clone repository**
   ```bash
   git clone https://github.com/jefrykurniaone/net-c-management.git
   cd net-c-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Buat file environment**

   Salin dari contoh:
   ```bash
   cp .env.example .env.local
   ```

   Isi semua variabel di `.env.local`:
   ```env
   # Database (Supabase — gunakan Session mode pooler, port 5432)
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-x-[region].pooler.supabase.com:5432/postgres"

   # NextAuth
   AUTH_SECRET="generate dengan: openssl rand -base64 32"
   NEXTAUTH_URL="http://localhost:3000"

   # Google OAuth (dari Google Cloud Console)
   AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="GOCSPX-xxx"

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
   SUPABASE_SERVICE_ROLE_KEY="eyJ..."
   ```

4. **Setup database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Setup Supabase Storage**

   Buat bucket bernama `payment-proofs` di Supabase Dashboard → Storage.

6. **Set role Admin** (pertama kali)

   Login ke aplikasi terlebih dahulu via Google, lalu jalankan di SQL Editor Supabase:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'email-kamu@gmail.com';
   ```

---

## Menjalankan Aplikasi

### Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000)

### Build Production
```bash
npm run build
npm start
```

### Lainnya
```bash
npx prisma studio   # GUI database
npm run lint        # ESLint
```

---

## Struktur Project

```
src/
├── app/
│   ├── (admin)/        # Halaman admin (dilindungi role ADMIN)
│   ├── (main)/         # Halaman member (dashboard, sesi, pembayaran, profil)
│   ├── api/            # API routes
│   ├── auth/           # Halaman sign in & error
│   └── onboarding/     # Halaman onboarding member baru
├── components/
│   ├── layout/         # Sidebar & mobile nav
│   ├── sessions/       # Komponen RSVP
│   └── ui/             # shadcn/ui components
├── lib/
│   ├── auth.ts         # Konfigurasi NextAuth
│   ├── prisma.ts       # Prisma client singleton
│   ├── supabase.ts     # Supabase admin client
│   └── validations/    # Zod schemas
└── types/              # TypeScript type augmentation
prisma/
└── schema.prisma       # Database schema
prisma.config.ts        # Konfigurasi Prisma 7
```

