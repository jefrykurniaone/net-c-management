# Sports Community Management App

A white-label, full-stack web app for managing a sports (or any hobby) community: activities, recurring sessions, member attendance, dues collection (monthly or per-session), and member profiles.

> The community name, logo, and branding are configured at runtime via the admin **Settings** page — nothing sport-specific is baked into the code. The default brand is **XClub Community**.

---

## 1. Brief Project Description

A full-stack web application that centralizes the management of a sports community — activities (e.g. badminton, futsal, yoga), session scheduling, member attendance, dues, and member profiles — in one platform. It replaces scattered chat messages and manual spreadsheets with a single source of truth: members get self-service RSVP, payment-proof uploads, and a choice of payment mode (monthly dues or pay-per-session), while admins get a dedicated panel to manage activities, schedule sessions, confirm payments, and manage members.

## 2. What business problem are you trying to solve?

Most amateur sports communities are run manually, which creates recurring friction for both members and the organizers:

- **Scattered scheduling.** Session announcements live in chat groups (e.g. WhatsApp), so RSVPs are hard to count, attendance caps are easy to overshoot, and there is no reliable record of who is coming.
- **Manual attendance tracking.** Presence is recorded on paper or ad-hoc spreadsheets, making it tedious to maintain and error-prone to report.
- **Painful dues collection.** Treasurers chase payments one by one and verify transfer proofs by hand, with no clear, shared view of who has paid, who is pending, and who is overdue — made worse when some members pay monthly and others pay per session.
- **No central member record.** Member data, activity memberships, and payment history are fragmented, so admins lack the visibility needed to manage the community and produce reports.

This solution automates and centralizes those workflows — reducing the operational/administrative effort on organizers and treasurers, removing manual bookkeeping errors, and giving members transparent, self-service access to schedules and their own dues status.

---

## Tech Stack

### Frontend

| Technology                                     | Version | Notes                          |
| ---------------------------------------------- | ------- | ------------------------------ |
| [Next.js](https://nextjs.org)                  | 16.2.6  | App Router, SSR, Turbopack     |
| [React](https://react.dev)                     | 19      | UI library                     |
| [TypeScript](https://www.typescriptlang.org)   | 5.x     | Type safety                    |
| [Tailwind CSS](https://tailwindcss.com)        | v4      | Styling                        |
| [shadcn/ui](https://ui.shadcn.com)             | latest  | UI components (Radix+Tailwind) |
| [Lucide React](https://lucide.dev)             | latest  | Icon library                   |
| [Sonner](https://sonner.emilkowal.ski)         | latest  | Toast notifications            |
| [React Hook Form](https://react-hook-form.com) | latest  | Form management                |
| [Zod](https://zod.dev)                         | latest  | Schema validation              |

### Backend

| Technology                                                                         | Version | Notes                     |
| ---------------------------------------------------------------------------------- | ------- | ------------------------- |
| Next.js API Routes                                                                 | 16.2.6  | REST API (App Router)     |
| [NextAuth.js](https://authjs.dev)                                                  | v5 beta | Google OAuth authentication |
| [Prisma ORM](https://prisma.io)                                                    | 7.x     | Database ORM              |
| [@prisma/adapter-pg](https://www.prisma.io/docs/orm/overview/databases/postgresql) | latest  | PostgreSQL driver adapter |

### Database & Storage

| Technology                                       | Notes                                                  |
| ------------------------------------------------ | ------------------------------------------------------ |
| PostgreSQL                                        | **Local** Postgres in development; Supabase in production |
| [Supabase](https://supabase.com)                 | Production PostgreSQL database + Storage buckets        |
| [Supabase Storage](https://supabase.com/storage) | Payment-proof / avatar / logo uploads (cloud, all envs) |

> **Local vs. production split:** in development only the **database** is local
> (Postgres on `localhost`). **File uploads still go to Supabase Storage** in
> every environment via `src/lib/supabase.ts` — there is no local storage layer.

---

## Features

- **Authentication** — Login via Google OAuth (roles: OWNER / ADMIN / MEMBER)
- **Onboarding** — Complete your profile and pick your activities on first login
- **Activities** — Multiple activities per community (e.g. badminton, futsal, yoga), each with its own fees, schedule, capacity, and bank account
- **Member Dashboard** — Overview of upcoming sessions, attendance, and dues status
- **Sessions** — View and RSVP to sessions per activity, with capacity limits, public share pages (`/s/[id]`), and weekly auto-generated recurring sessions
- **Reserve-then-pay** — Reserving a paid session holds the seat for a configurable window (default 1 hour); unpaid holds expire automatically and the seat is released
- **Payments** — Two payment modes per activity: monthly dues or pay-per-session, with proof upload and admin confirmation
- **Email notifications** (Gmail SMTP) —
    - payment-confirmation deadline after reserving a seat (pay before the hold expires)
    - registration-expired notice when an unpaid hold lapses (please re-register)
    - day-of attendance reminder to all registered members (daily cron)
    - payment approved/rejected notice after admin review
    - admin-triggered "session needs players" reminder for under-booked sessions
- **Admin Panel** — Manage activities, sessions, attendance, payments, members, and community settings
- **i18n** — English and Indonesian, switchable at runtime
- **White-label branding** — Community name and logo configured from the Settings page

---

## Prerequisites

- [Node.js](https://nodejs.org) v20+
- [PostgreSQL](https://www.postgresql.org/download/windows/) 17 (local database)
- A [Supabase](https://supabase.com) account (storage buckets — and the production database)
- A Google Cloud account (for OAuth credentials)

---

## Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/jefrykurniaone/net-c-management.git
    cd net-c-management
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Create the environment file**

    Copy from the example:

    ```bash
    cp .env.example .env.local
    ```

    Fill in every variable in `.env.local`:

    ```env
    # Database — local Postgres. This is the safe default for dev.
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xclub?schema=public"

    # NextAuth (Auth.js v5). AUTH_URL is only needed for local dev —
    # on Vercel the host is auto-detected, so leave it unset in production.
    AUTH_SECRET="generate with: openssl rand -base64 32"
    AUTH_URL="http://localhost:3000"

    # Google OAuth (from Google Cloud Console)
    AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
    AUTH_GOOGLE_SECRET="GOCSPX-xxx"

    # Supabase (storage stays on Supabase cloud even with a local DB)
    NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
    SUPABASE_SERVICE_ROLE_KEY="eyJ..."

    # Seed owner (optional, dev) — your Google email so you can log straight in as OWNER
    SEED_OWNER_EMAIL="your-email@gmail.com"

    # Cron secret — protects /api/cron/* endpoints. Any value locally;
    # on Vercel it is injected automatically.
    CRON_SECRET="dev-cron-secret-local"

    # Email notifications (Gmail SMTP — free, ~500 emails/day).
    # Create an App Password at https://myaccount.google.com/apppasswords
    GMAIL_USER="you@gmail.com"
    GMAIL_APP_PASSWORD="your-16-char-app-password"
    # Public app URL used for CTA links inside emails
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

    > **Production:** also create `.env.prod` (gitignored) holding the production
    > Supabase `DATABASE_URL` — use the **Session pooler, port 5432** (not 6543).
    > This file is only used by the `*:prod` commands (e.g. `npm run db:deploy:prod`);
    > it does not affect `npm run dev`.

4. **Set up the database (local)**

    Install PostgreSQL locally (one time), then create the `xclub` database:

    ```powershell
    # Install Postgres 17 (prompts for UAC). Sets the superuser password to "postgres".
    winget install -e --id PostgreSQL.PostgreSQL.17 --custom "--superpassword postgres"

    # Create the xclub database (adjust the version path if different)
    & "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres xclub
    ```

    > If a corporate proxy blocks the EnterpriseDB download (HTTP 403), download the
    > official PostgreSQL installer on another network and run it instead — the rest
    > of the steps are identical. Make sure the superuser password matches your
    > `DATABASE_URL`.

    Confirm `DATABASE_URL` in `.env.local` points at this local DB:
    `postgresql://postgres:postgres@localhost:5432/xclub?schema=public`

    Then apply the migrations and seed initial data:

    ```bash
    npx prisma migrate deploy   # apply prisma/migrations/ to the local DB
    npm run db:seed        # full scenario seed (see "Reseeding" below); creates the owner if SEED_OWNER_EMAIL is set
    ```

    The migrations carry everything, including the partial unique index on
    MONTHLY payments and the row-level security policies. There are no raw-SQL
    extras to apply by hand.

5. **Set up Supabase Storage**

    Create a bucket named `payment-proofs` in Supabase Dashboard → Storage.
    File uploads keep using Supabase cloud even though the database is local.

6. **Become OWNER** (first time)

    Set `SEED_OWNER_EMAIL` (step 3) to your Google email, then `npm run db:seed`
    creates that OWNER user. When you log in via Google, the account auto-links to
    that user because `allowDangerousEmailAccountLinking` is enabled **in dev only**
    (see `src/lib/auth.ts`) — in production this linking is off for security.

    Alternative (no seeded owner): log in via Google first, then promote manually:

    ```bash
    npm run db:promote -- your-email@gmail.com
    ```

    Reload — you are now OWNER and can access `/admin`.

7. **Reseeding** (repeat anytime)

    `npm run db:seed` is safe to re-run: it first wipes all transactional rows
    (attendances, payments, sessions) and then reseeds them, while users,
    activities, memberships and settings are upserted in place. No
    `db:reset` needed between runs.

    ```bash
    # Reseed anchored to the real today
    npm run db:seed

    # Pretend "today" is another date — every relative date (upcoming sessions,
    # payment holds, today's ONGOING/reminder sessions) shifts with it
    npm run db:seed -- --date=2026-08-15

    # Also control the range the 13 past COMPLETED sessions are spread over
    # (defaults: 1st of the anchor month → anchor; must satisfy from ≤ to ≤ date)
    npm run db:seed -- --date=2026-08-15 --from=2026-07-01 --to=2026-08-14
    ```

    Env fallbacks for the flags: `SEED_DATE`, `SEED_FROM`, `SEED_TO`.

    The seed covers every feature scenario — log in as `member@xclub.local`
    ("Adi Pratama") to see them: unpaid dues banner, per-session payment mode
    (confirmed + pending session payments), live and expired reservation holds,
    a free session with Maybe RSVPs, a full session, an under-booked session
    (admin remind), a cancelled session, an ongoing session, and a same-day
    session targeted by the day-reminder cron. The full list lives in the
    header of `prisma/seed.ts`.

    > If you only need a fresh schema first: `npm run db:reset`, re-apply the
    > two raw-SQL files from step 4, then `npm run db:seed`.

---

## Running the App

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

### Other

```bash
npm run db:studio    # local database GUI
npm run db:reset     # reset the local DB (re-apply all migrations + seed)
npm run lint         # ESLint
```

### Cron jobs (Vercel)

Two scheduled jobs are declared in `vercel.json` and run automatically in
production (both endpoints require the `CRON_SECRET` bearer token):

| Endpoint | Schedule | Purpose |
| -------- | -------- | ------- |
| `/api/cron/generate-sessions` | month-end, 00:00 WIB | Generate next month's weekly recurring sessions |
| `/api/cron/day-reminders` | daily, 05:00 WIB | Email registered members a day-of attendance reminder |

Test locally with:

```bash
curl -H "Authorization: Bearer dev-cron-secret-local" http://localhost:3000/api/cron/day-reminders
```

---

## Changing the Schema & Promoting to Production

Both environments are managed with **Prisma Migrate**. Every schema change is a
committed migration under `prisma/migrations/`, which is the **single source of
truth** — the same files you test locally are the ones that run in production, so
the two environments stay in lockstep. **Do not use `prisma db push`**: it mutates
a database without recording a migration, and that untracked drift is exactly what
desyncs local from prod. Safe flow: **local first, production is an explicit step.**

1. **Local:** edit `prisma/schema.prisma`, then create and apply a migration:

    ```bash
    npx prisma migrate dev --name describe_your_change
    ```

    This writes a new `prisma/migrations/<timestamp>_describe_your_change/` folder,
    applies it to the local DB, and regenerates the Prisma client. Test locally,
    then **commit the migration folder together with the schema change**.

    > After pulling teammate changes that include new migrations, catch your local
    > DB up with `npx prisma migrate dev` (applies anything pending, no reset).

2. **Promote to production** (opt-in via `DATABASE_TARGET=prod` → `.env.prod`):

    ```bash
    npm run db:deploy:prod   # = prisma migrate deploy against prod
    ```

    `migrate deploy` applies only migrations not yet recorded in the production
    `_prisma_migrations` table — it never drops columns and never resets data. Run
    it after every merge that adds a migration.

    There are no raw-SQL extras to apply afterwards. The partial unique index on
    MONTHLY payments and the row-level security policies are created by migration
    `20260902180043_add_monthly_payment_unique_index_and_rls`, and every statement
    in it is idempotent, so it is a no-op on a database that already has them.

### Production seed & owner

`prisma/seed.ts` is **local/testing only** (sample members, confirmed payments).
Production uses its own seeder, which only writes settings and the real
Activities — no sample data:

```bash
npm run db:seed:prod
```

Becoming OWNER in production is a two-step flow: production keeps
`allowDangerousEmailAccountLinking` **off** (see `src/lib/auth.ts`), so a
pre-seeded User row for a Google email that never signed in would break that
login (`OAuthAccountNotLinked`). Therefore:

1. Sign in once via Google on the production app (creates your User row).
2. Re-run `npm run db:seed:prod` — it promotes the owner email — or run
   `npm run db:promote:prod -- your-email@gmail.com`.

### Resetting & reseeding production

`npm run db:seed:prod` is idempotent — for a plain reseed (refresh settings,
activities, or the owner promotion) just re-run it, no reset needed.

A full reset is only for starting production over from an empty database.

> **Warning:** `migrate reset` permanently drops **all data in the production
> database** — users, payments, sessions, attendance. There is no undo. Take a
> backup first (Supabase Dashboard → Database → Backups) if anything might
> still be needed.

```bash
# 1. DESTRUCTIVE — drops every table, then replays all migrations from scratch.
#    Prisma asks for confirmation before proceeding. (Prisma 7 no longer runs
#    any seed automatically here.)
npx cross-env DATABASE_TARGET=prod prisma migrate reset

#    The replay includes the partial unique index and the RLS policies, so a
#    reset needs no follow-up SQL.

# 2. Reseed the production catalog (settings + real Activities — no sample data)
npm run db:seed:prod
```

Then redo the owner flow above: sign in once via Google (your User row was
dropped by the reset), and re-run `npm run db:seed:prod` or
`npm run db:promote:prod -- your-email@gmail.com`.

Note: the reset touches only the database. Files already uploaded to the
Supabase Storage buckets (`payment-proofs`, `avatars`, `logos`) are left as
orphans — clean them up in Supabase Dashboard → Storage if needed.

---

## Project Structure

```text
src/
├── app/
│   ├── (admin)/        # Admin pages (protected by ADMIN role)
│   ├── (main)/         # Member pages (dashboard, sessions, payments, profile)
│   ├── api/            # API routes
│   ├── auth/           # Sign in & error pages
│   └── onboarding/     # New-member onboarding page
├── components/
│   ├── layout/         # Sidebar & mobile nav
│   ├── sessions/       # RSVP components
│   └── ui/             # shadcn/ui components
├── lib/
│   ├── auth.ts         # NextAuth configuration
│   ├── email/          # Gmail SMTP transporter + notification templates
│   ├── holds.ts        # Reservation-hold timing + expiry sweep
│   ├── payments.ts     # Server-only payment/registration writes
│   ├── prisma.ts       # Prisma client singleton
│   ├── recurring-sessions.ts  # Weekly session auto-generation
│   ├── supabase.ts     # Supabase admin client
│   └── validations/    # Zod schemas
└── types/              # TypeScript type augmentation
prisma/
├── schema.prisma               # Database schema
├── seed.ts                     # Local/testing seed (sample members, payments, quotas)
├── seed-prod.ts                # Production seed (settings, real Activities, owner promotion)
├── promote-owner.ts            # Promote a signed-in user to OWNER (local or prod)
└── migrations/                 # Prisma Migrate history — source of truth for the schema
                                # (includes the MONTHLY partial unique index and the RLS policies)
prisma.config.ts        # Prisma 7 config (selects local/prod via DATABASE_TARGET)
```
