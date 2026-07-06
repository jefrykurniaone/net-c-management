# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint (enforced via pre-commit hook)
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to the database
npx prisma studio    # Open GUI for the database
```

There are no automated tests in this project. 

## Architecture

This is a white-label **sports community management app** — a Next.js 16 (App Router) full-stack app for managing a sports/hobby community (activities, sessions, attendance, dues). Community name/branding is runtime-configured via Settings; the repo name (`net-c-management`) is historical. The stack is: Next.js + React 19 + TypeScript, Prisma 7 (with `@prisma/adapter-pg` driver adapter), Supabase (PostgreSQL + Storage), NextAuth v5 (Google OAuth, database sessions), Tailwind CSS v4, and shadcn/ui.

### Route groups and auth flow

- `src/app/(main)/` — member pages: dashboard, sessions, payments, profile
- `src/app/(admin)/` — admin-only pages under `/admin/*`
- `src/app/api/` — REST API route handlers
- `src/app/auth/` — sign-in and error pages
- `src/app/onboarding/` — first-login profile completion

Auth is enforced at two levels:
1. **Middleware** (`src/proxy.ts`) — redirects unauthenticated users and routes by `role`/`isProfileComplete` before the request reaches any page
2. **Layout guards** — both `(admin)/layout.tsx` and `(main)/layout.tsx` call `auth()` server-side and redirect if the session/role check fails

New users are created by NextAuth on first login; until `isProfileComplete = true`, every protected route redirects to `/onboarding`.

### Database

Prisma uses the `driverAdapters` preview feature with `PrismaPg` (direct `pg` pool, not Prisma's built-in connector). The singleton is in `src/lib/prisma.ts` — production caps the pool at 1 connection per serverless function, so use Supabase's **Transaction pooler (port 6543)** in production and the **Session pooler (port 5432)** in development.

Core models: `User`, `ActivitySession`, `Attendance`, `Payment`, `Settings`. Key enums: `Role` (MEMBER/ADMIN), `SessionStatus`, `AttendanceStatus`, `PaymentStatus`.

### Storage

All file uploads go through `src/lib/supabase.ts` using the service-role Supabase client (bypasses RLS). Three buckets: `payment-proofs`, `avatars`, `logos`. The client is server-side only — never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### i18n

The app supports English (`en`) and Indonesian (`id`). All user-facing strings live in `src/lib/i18n/dictionaries.ts` as a single `en`/`id` object pair. Locale is stored in the `NEXT_LOCALE` cookie and resolved server-side by `src/lib/i18n/locale.ts`. Never hardcode user-facing strings — always go through the dictionary.

### Settings

Community-wide settings (name, logo, default fee, default location, etc.) are stored as key-value rows in the `Settings` table and fetched via `src/lib/settings.ts:getSettings()`. This is a server-only helper — call it from Server Components or Route Handlers.

## Coding Standards (from AGENTS.md)

- Max function length: 40 lines; max file length: 300 lines
- Max nesting depth: 3 levels — prefer early return
- No magic numbers; use named constants
- Naming: `camelCase` for variables/functions, `PascalCase` for components/classes, `SCREAMING_SNAKE_CASE` for constants, `PascalCase.tsx` for component files, `kebab-case.ts` for utilities/hooks
- Boolean names: prefix with `is`, `has`, or `should`
- Branch format: `feat/`, `fix/`, `chore/`, `hotfix/`
- Commit format: Conventional Commits; no direct push to `main`

## Next.js version note

This project uses **Next.js 16**, which may differ from training data. Read `node_modules/next/dist/docs/` for authoritative API references before writing code that touches routing, middleware, or data-fetching patterns.
