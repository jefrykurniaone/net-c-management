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
- **Sessions** — View and RSVP to sessions per activity, with capacity limits
- **Payments** — Two payment modes per activity: monthly dues or pay-per-session, with proof upload and admin confirmation
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
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/netc?schema=public"

    # NextAuth
    AUTH_SECRET="generate with: openssl rand -base64 32"
    NEXTAUTH_URL="http://localhost:3000"

    # Google OAuth (from Google Cloud Console)
    AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
    AUTH_GOOGLE_SECRET="GOCSPX-xxx"

    # Supabase (storage stays on Supabase cloud even with a local DB)
    NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
    SUPABASE_SERVICE_ROLE_KEY="eyJ..."

    # Seed owner (optional, dev) — your Google email so you can log straight in as OWNER
    SEED_OWNER_EMAIL="your-email@gmail.com"
    ```

    > **Production:** also create `.env.prod` (gitignored) holding the production
    > Supabase `DATABASE_URL` — use the **Session pooler, port 5432** (not 6543).
    > This file is only used by the `*:prod` commands (e.g. `npm run db:deploy:prod`);
    > it does not affect `npm run dev`.

4. **Set up the database (local)**

    Install PostgreSQL locally (one time), then create the `netc` database:

    ```powershell
    # Install Postgres 17 (prompts for UAC). Sets the superuser password to "postgres".
    winget install -e --id PostgreSQL.PostgreSQL.17 --custom "--superpassword postgres"

    # Create the netc database (adjust the version path if different)
    & "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres netc
    ```

    > If a corporate proxy blocks the EnterpriseDB download (HTTP 403), download the
    > official PostgreSQL installer on another network and run it instead — the rest
    > of the steps are identical. Make sure the superuser password matches your
    > `DATABASE_URL`.

    Confirm `DATABASE_URL` in `.env.local` points at this local DB:
    `postgresql://postgres:postgres@localhost:5432/netc?schema=public`

    Then apply the schema, the raw-SQL extras, and seed initial data:

    ```bash
    npx prisma db push     # apply prisma/schema.prisma to the local DB
    npx prisma db execute --file prisma/payment-monthly-unique.sql
    npx prisma db execute --file prisma/rls-policies.sql
    npm run db:seed        # activities + settings + sample members/payments (+ owner if SEED_OWNER_EMAIL set)
    ```

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

---

## Changing the Schema & Promoting to Production

Both environments are managed with **`prisma db push`** (the `prisma/migrations/`
folder only holds the original `init` and is not the source of truth). Safe flow:
**local first, production is an explicit step.**

1. **Local:** edit `prisma/schema.prisma`, then:

    ```bash
    npx prisma generate   # regenerate the client
    npx prisma db push    # apply to the local DB
    ```

    Test locally.

2. **Promote to production** (opt-in via `DATABASE_TARGET=prod` → `.env.prod`):

    ```bash
    cross-env DATABASE_TARGET=prod prisma db push
    ```

    Review the command's data-loss warnings before accepting them — `db push`
    can drop columns, unlike `migrate deploy`.

3. **Re-apply the raw-SQL extras** if the affected tables changed (both are
   idempotent, so re-running is always safe — and **mandatory after any reset**,
   which recreates tables without them):

    ```bash
    # Partial unique index on MONTHLY payments (db push cannot express it)
    cross-env DATABASE_TARGET=prod prisma db execute --file prisma/payment-monthly-unique.sql

    # Enable RLS + deny direct API access on every table (Supabase hardening)
    cross-env DATABASE_TARGET=prod prisma db execute --file prisma/rls-policies.sql
    ```

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
│   ├── prisma.ts       # Prisma client singleton
│   ├── supabase.ts     # Supabase admin client
│   └── validations/    # Zod schemas
└── types/              # TypeScript type augmentation
prisma/
├── schema.prisma               # Database schema
├── seed.ts                     # Local/testing seed (sample members, payments, quotas)
├── seed-prod.ts                # Production seed (settings, real Activities, owner promotion)
├── promote-owner.ts            # Promote a signed-in user to OWNER (local or prod)
├── payment-monthly-unique.sql  # Partial unique index (applied via prisma db execute)
├── rls-policies.sql            # Supabase RLS hardening (applied via prisma db execute)
└── migrations/                 # Historical init migration (db push is the source of truth)
prisma.config.ts        # Prisma 7 config (selects local/prod via DATABASE_TARGET)
```
