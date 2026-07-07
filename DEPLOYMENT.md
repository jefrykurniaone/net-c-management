# Deployment Guide — feat: Remind Members + Share Session

## Ringkasan Perubahan
- Email reminder otomatis ke member via Gmail SMTP (Nodemailer)
- Halaman publik `/s/[id]` untuk share sesi ke sosmed
- Schema DB: kolom baru `lastReminderAt` di tabel `ActivitySession`

---

## 1. Set Environment Variables di Vercel

Buka **Vercel Dashboard → Project → Settings → Environment Variables**, lalu tambahkan:

| Key | Value | Keterangan |
|-----|-------|------------|
| `GMAIL_USER` | `you@gmail.com` | Alamat Gmail pengirim |
| `GMAIL_APP_PASSWORD` | `abcd efgh ijkl mnop` (tanpa spasi) | App Password dari myaccount.google.com/apppasswords |
| `NEXT_PUBLIC_APP_URL` | `https://xclub-community.vercel.app` | URL produksi kamu |

> **Catatan:** `NEXT_PUBLIC_APP_URL` dipakai untuk CTA link di email reminder.
> Ganti dengan URL production yang sebenarnya.
>
> **Gmail SMTP:** butuh 2-Step Verification aktif, lalu buat App Password
> (16 karakter). Jangan pakai password login biasa. Gratis, tanpa domain,
> bisa kirim ke email siapa saja. Limit ~500 email/hari.

---

## 2. Deploy ke Vercel

Setelah env vars di-set, trigger deployment:

```bash
# Jika pakai Vercel CLI
vercel --prod

# Atau: push ke main sudah otomatis trigger deploy di Vercel
```

Karena PR sudah di-merge ke `main`, Vercel seharusnya sudah auto-deploy.

---

## 3. Jalankan DB Migration di Production

Setelah deployment selesai, jalankan migration untuk menambah kolom `lastReminderAt`:

```bash
npm run db:deploy:prod
```

Perintah ini akan mengeksekusi `prisma migrate deploy` menggunakan `.env.prod`.

**Pastikan `.env.prod` sudah berisi `DATABASE_URL` yang benar** (Supabase Transaction pooler, port 6543):

```env
# .env.prod
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Verifikasi migration berhasil

Setelah `db:deploy:prod` selesai, cek di **Supabase Dashboard → Table Editor → ActivitySession**:
- Pastikan kolom `lastReminderAt` sudah ada (nullable, tipe `timestamp`)

---

## 4. Verifikasi Fitur di Production

### ✅ Remind Members
1. Login sebagai admin → buka halaman Needs Attention
2. Jika ada sesi under-booked (< 60% peserta), klik "Remind members"
3. Akan navigate ke halaman edit sesi
4. Di bagian bawah ada card "Remind members" → klik tombolnya
5. Konfirmasi → email terkirim ke semua member aktif yang belum RSVP
6. Toast success muncul: "Reminder sent to X member(s)"
7. Tombol menjadi disabled selama 24 jam

**Jika email tidak terkirim**, cek:
- `GMAIL_USER` & `GMAIL_APP_PASSWORD` sudah di-set di Vercel
- App Password benar (16 karakter, bukan password login), 2-Step Verification aktif
- Lihat Vercel Logs → Function logs untuk error `[remind] failed to send to ...`

### ✅ Share Session
1. Login sebagai admin → buka edit sesi mana saja
2. Scroll ke bawah → ada card "Share session"
3. Copy link `/s/[id]` → buka di incognito (tanpa login) → halaman harus tampil
4. Sebagai member → buka detail sesi → scroll bawah → ada card share

### ✅ Halaman Publik `/s/[id]`
- Buka `https://xclub-community.vercel.app/s/[id]` tanpa login
- Harus tampil: nama sesi, tanggal, lokasi, spots bar, tombol "Sign in to RSVP"
- OG preview bisa di-test di: https://opengraph.xyz (paste URL-nya)

---

## 5. Rollback (jika diperlukan)

Jika ada masalah, rollback migration:

```bash
# Revert migration terakhir di production
# (hati-hati: ini akan DROP kolom lastReminderAt)
npx prisma migrate resolve --rolled-back 20260707100802_add_last_reminder_at
```

Lalu deploy commit sebelum feat ini dari Vercel dashboard (Deployments → Redeploy previous).

---

## Checklist Deployment

- [ ] `GMAIL_USER` di-set di Vercel
- [ ] `GMAIL_APP_PASSWORD` di-set di Vercel
- [ ] `NEXT_PUBLIC_APP_URL` di-set di Vercel (URL production)
- [ ] Vercel deployment berhasil (no build errors)
- [ ] `npm run db:deploy:prod` dijalankan
- [ ] Kolom `lastReminderAt` ada di Supabase
- [ ] Test remind email terkirim
- [ ] Test halaman `/s/[id]` bisa diakses tanpa login
