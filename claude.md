# Konteks Proyek

Buatkan saya aplikasi web booking badminton komunitas (mirip Raketers.com)
untuk kelompok main badminton rutin. Aplikasi ini dipakai secara internal
oleh komunitas, bukan marketplace publik.

---

## Rekomendasi Tech Stack

Gunakan stack berikut dan jelaskan setup awalnya:

## Frontend

- **Next.js 14** (App Router) — React framework dengan SSR/SSG
- **TypeScript** — type safety
- **Tailwind CSS** — styling utility-first
- **shadcn/ui** — komponen UI siap pakai yang konsisten
- **React Hook Form + Zod** — form handling & validasi

## Backend / API

- **Next.js API Routes** — backend terintegrasi dalam satu project
- **Prisma ORM** — database modeling & query yang mudah dibaca
- **PostgreSQL** — database utama (bisa pakai Supabase gratis)

## Auth

- **NextAuth.js (Auth.js v5)** — autentikasi dengan Google SSO

## Storage & Hosting

- **Vercel** — deploy frontend + API (free tier cukup untuk komunitas)
- **Supabase** — PostgreSQL database + storage gratis
- **Cloudinary** — upload foto profil/bukti bayar (opsional)

## Tambahan

- **date-fns** — manipulasi tanggal
- **Recharts** — grafik statistik (dashboard admin)

---

## Fitur yang Harus Dibuat

## 🔐 Autentikasi (Auth)

- Login/Register HANYA via Google SSO (NextAuth.js)
- Tidak ada login username/password manual
- Setelah login pertama kali, user diminta lengkapi profil:
  - Nama lengkap
  - Nomor WhatsApp
  - Posisi bermain (kiri/kanan/fleksibel)
  - Level (pemula / menengah / mahir)
- Role system: **Member** dan **Admin**
- Admin bisa promote/demote user menjadi admin

---

## 👤 Member Dashboard

Halaman utama setelah login, berisi:

- Jadwal sesi badminton yang akan datang
- Status kehadiran saya (sudah daftar hadir / belum)
- Status iuran bulan ini (sudah bayar / belum / terlambat)
- Riwayat kehadiran saya (per minggu/bulan)
- Statistik pribadi: total hadir, total absen, streak kehadiran

---

## 📅 Fitur Absensi Mingguan (Sesi Main)

### Untuk Member

- Lihat daftar sesi yang akan datang (hari, jam, lokasi, lapangan)
- **Daftar hadir** (RSVP) sebelum sesi — ada batas waktu daftar
  misalnya H-1 sebelum sesi
- Batalkan kehadiran (dengan catatan alasan)
- Lihat siapa saja yang sudah daftar hadir di sesi tersebut

### Untuk Admin

- **Buat sesi baru**: isi hari, jam mulai-selesai, lokasi GOR,
  nomor lapangan, kapasitas maksimal pemain
- Edit / batalkan sesi
- Tandai kehadiran manual (jika ada yang lupa daftar tapi hadir)
- Export daftar hadir per sesi (CSV)
- Lihat rekap absensi semua member per bulan

### Data per Sesi

- Tanggal & hari
- Jam mulai – selesai
- Lokasi (nama GOR + alamat)
- Nomor lapangan
- Kapasitas maksimal pemain
- Status: Upcoming / Berlangsung / Selesai / Dibatalkan
- Daftar hadir: Konfirmasi / Hadir / Absen / Tidak daftar

---

## 💰 Fitur Manajemen Iuran Bulanan

### Untuk Member (Iuran)

- Lihat tagihan iuran bulan ini (nominal, batas bayar)
- Upload bukti pembayaran (foto/screenshot transfer)
- Lihat riwayat pembayaran bulan-bulan sebelumnya
- Status: Belum Bayar / Menunggu Konfirmasi / Lunas / Terlambat

### Untuk Admin (Iuran)

- Set nominal iuran per bulan (bisa berbeda tiap bulan)
- Set deadline pembayaran
- Lihat semua status pembayaran member
- Konfirmasi / tolak bukti bayar yang diupload member
- Tambah catatan/keterangan per transaksi
- Dashboard iuran: total terkumpul, siapa belum bayar, siapa terlambat
- Export laporan iuran per bulan (CSV)
- Kirim reminder otomatis ke member yang belum bayar
  (via notifikasi in-app, opsional WhatsApp link)

### Data Iuran

- Member
- Bulan & tahun
- Nominal
- Tanggal bayar
- Metode bayar (Transfer BCA/BRI/BNI/GoPay/OVO/QRIS)
- Bukti bayar (image URL)
- Status konfirmasi admin
- Catatan

---

## 🛠️ Admin Panel

Halaman khusus admin dengan fitur:

- **Dashboard overview**:
  - Jumlah member aktif
  - Sesi bulan ini
  - Total iuran terkumpul bulan ini
  - Member yang belum bayar iuran
  - Grafik kehadiran (per minggu/bulan)
- **Manajemen Member**:
  - Lihat semua member
  - Aktifkan / nonaktifkan member
  - Set role (member / admin)
  - Lihat detail profil & riwayat tiap member
- **Manajemen Sesi** (dari fitur absensi)
- **Manajemen Iuran** (dari fitur iuran)
- **Pengaturan Komunitas**:
  - Nama komunitas
  - Jadwal rutin default (hari & jam)
  - Lokasi GOR default
  - Nominal iuran default

---

## 🗄️ Database Schema (Prisma)

Buatkan schema lengkap untuk tabel berikut:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  phone         String?
  playPosition  String?   // left, right, flexible
  skillLevel    String?   // beginner, intermediate, advanced
  role          Role      @default(MEMBER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())

  attendances   Attendance[]
  payments      Payment[]
  accounts      Account[]
  sessions      Session[]
}

model Session_Badminton {
  id          String    @id @default(cuid())
  date        DateTime
  startTime   String
  endTime     String
  location    String
  courtNumber String?
  maxPlayers  Int       @default(10)
  status      SessionStatus @default(UPCOMING)
  notes       String?
  createdAt   DateTime  @default(now())

  attendances Attendance[]
}

model Attendance {
  id          String    @id @default(cuid())
  userId      String
  sessionId   String
  status      AttendanceStatus @default(REGISTERED)
  notes       String?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id])
  session     Session_Badminton @relation(fields: [sessionId], references: [id])

  @@unique([userId, sessionId])
}

model Payment {
  id            String    @id @default(cuid())
  userId        String
  month         Int
  year          Int
  amount        Int
  paidAt        DateTime?
  paymentMethod String?
  proofImageUrl String?
  status        PaymentStatus @default(PENDING)
  adminNotes    String?
  confirmedAt   DateTime?
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id])

  @@unique([userId, month, year])
}

enum Role { MEMBER ADMIN }
enum SessionStatus { UPCOMING ONGOING COMPLETED CANCELLED }
enum AttendanceStatus { REGISTERED PRESENT ABSENT }
enum PaymentStatus { PENDING AWAITING_CONFIRMATION CONFIRMED REJECTED LATE }
```

---

## 📱 Halaman yang Perlu Dibuat

/ → Landing page (info komunitas + tombol login)
/auth/signin → Halaman login Google SSO
/onboarding → Lengkapi profil (setelah login pertama)
/dashboard → Member dashboard
/sessions → Daftar semua sesi
/sessions/[id] → Detail sesi + daftar hadir
/payments → Riwayat & status iuran saya
/payments/upload → Upload bukti bayar
/profile → Edit profil saya
/admin → Admin dashboard
/admin/sessions → Kelola sesi
/admin/sessions/new → Buat sesi baru
/admin/members → Kelola member
/admin/payments → Kelola iuran & konfirmasi
/admin/settings → Pengaturan komunitas

---

## Instruksi Pengerjaan

1. **Mulai dari setup project** — inisialisasi Next.js, install semua
   dependency, setup Prisma + Supabase, konfigurasi NextAuth Google SSO

2. **Buat database schema** sesuai Prisma model di atas, jalankan migration

3. **Kerjakan fitur secara berurutan**:
    - Auth (Google SSO + onboarding)
    - Layout & navigasi (sidebar/navbar, role-based)
    - Fitur Absensi (sesi + RSVP)
    - Fitur Iuran (payment + upload bukti)
    - Admin Panel
    - Dashboard & statistik

4. **Untuk setiap file**, berikan kode lengkap — jangan potong dengan
   "// ... rest of code"

5. **Gunakan Bahasa Indonesia** untuk semua label UI, pesan error,
   dan notifikasi dalam aplikasi

6. Setelah selesai satu fitur, **tanyakan apakah ada perubahan**
   sebelum lanjut ke fitur berikutnya

---

## Mulai Dari Sini

Mulailah dengan:

1. Buat struktur folder project Next.js lengkap
2. Daftar semua perintah instalasi dependency
3. File konfigurasi: next.config.js, tailwind.config.js, prisma/schema.prisma
4. Setup NextAuth dengan Google Provider
5. File .env.example berisi semua environment variable yang dibutuhkan
