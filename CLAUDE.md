# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint (CI runs this and `npx tsc --noEmit` on pull requests)
npx prisma generate                        # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <desc>       # Create + apply a migration after editing schema.prisma
npm run db:deploy:prod                      # Apply pending migrations to production (migrate deploy)
npx prisma studio                          # Open GUI for the database
```

Tests run on Vitest (`npm test`, Node environment, no DOM). Coverage is deliberately narrow: pure logic under `src/lib/__tests__/` — the recurring-session generator, the status-chip resolver, the payment and dues rules, the contrast pairs computed from the committed design tokens, and the rendered text of the email templates. Pages, components and anything touching Prisma or Supabase are not covered.

## Architecture

This is a white-label **sports community management app** — a Next.js 16 (App Router) full-stack app for managing a sports/hobby community (activities, sessions, attendance, dues). Community name/branding is runtime-configured via Settings; the default brand is **XClub Community**. The stack is: Next.js + React 19 + TypeScript, Prisma 7 (with `@prisma/adapter-pg` driver adapter), Supabase (PostgreSQL + Storage), NextAuth v5 (Google OAuth, database sessions), Tailwind CSS v4, and shadcn/ui.

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

Core models: `User`, `Activity`, `Membership`, `ActivitySession`, `Attendance`, `Payment`, `Settings`. Key enums: `Role` (MEMBER/ADMIN/OWNER), `SessionStatus`, `AttendanceStatus`, `PaymentStatus`, `PaymentMode` (MONTHLY/PER_SESSION, owned by `Membership`), `PaymentType` (what a `Payment` row bills for).

Schema changes go through **Prisma Migrate**, never `prisma db push`. `prisma/migrations/` is the source of truth that keeps local and prod in sync: edit `schema.prisma`, run `npx prisma migrate dev --name <desc>`, and commit the generated migration folder with the change. Deploy to prod with `npm run db:deploy:prod` (`migrate deploy`) after the merge lands. Using `db push` mutates a DB without recording a migration — that untracked drift desyncs environments and is what broke prod once already.

### Storage

All file uploads go through `src/lib/supabase.ts` using the service-role Supabase client (bypasses RLS). Three buckets: `payment-proofs`, `avatars`, `logos`. The client is server-side only — never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### i18n

The app supports English (`en`) and Indonesian (`id`). All user-facing strings live in `src/lib/i18n/dictionaries.ts` as a single `en`/`id` object pair. Locale is stored in the `NEXT_LOCALE` cookie and resolved server-side by `src/lib/i18n/locale.ts`. Never hardcode user-facing strings — always go through the dictionary.

### Settings

Community-wide settings (name, logo, default fee, default location, etc.) are stored as key-value rows in the `Settings` table and fetched via `src/lib/settings.ts:getSettings()`. This is a server-only helper — call it from Server Components or Route Handlers.

### Payments and reservation holds

A seat is never held without money behind it: reserving a paid session (POST `/api/sessions/[id]/reserve`) claims the seat with a payment hold (`Attendance.holdExpiresAt`, duration from the `holdDurationMinutes` setting, default 1 hour). Paying clears the hold; unpaid holds are released by a lazy sweep (`src/lib/holds.ts:releaseExpiredHolds`) that runs at the top of capacity-sensitive reads/writes — there is no hold cron. All payment/registration writes live in `src/lib/payments.ts` (server-only) and use row-lock transactions (`SELECT ... FOR UPDATE`) for capacity races.

### Email notifications

All email goes through `src/lib/email/` (Gmail SMTP via nodemailer; `GMAIL_USER` / `GMAIL_APP_PASSWORD`). `transporter.ts` sends, `layout.ts` is the shared bilingual HTML shell, one file per template. Sends are best-effort: guarded by `isEmailConfigured()`, queued post-response with `after()` from `next/server`, failures logged, never thrown. Triggers: reserve hold created (payment deadline), hold expired (re-register), payment reviewed (approved/rejected), day-of attendance reminder (cron), admin under-booked reminder (POST `/api/sessions/[id]/remind`).

### Cron jobs

Declared in `vercel.json`, protected by the `CRON_SECRET` bearer token (auto-injected on Vercel):
- `/api/cron/generate-sessions` — month-end 17:00 UTC (00:00 WIB): next month's recurring sessions
- `/api/cron/day-reminders` — daily 22:00 UTC (05:00 WIB): day-of attendance emails; `ActivitySession.dayReminderSentAt` is the double-send guard

## Coding Standards

These rules were carried by `AGENTS.md` until that file was deleted in `eff4b48` (2026-06-28); it no longer exists and is no longer the source. The canonical version is the vault coding standard, and this section keeps its numbers unchanged — 40 for a function, 300 for a file, 3 for nesting depth. What this section overrides is only what those numbers count, and which shapes are exempt.

- Max function length: 40 lines of code — the function's span minus every `return` that returns JSX. Markup is not logic and does not count toward the limit. Exempt rather than in violation: test callbacks, and functions with no control flow at all, such as a validation schema, a table-column array, or a single `Promise.all` of queries. An API guard cascade whose ordering is carried by co-location is accepted where it stands rather than extracted — reordering it is a behaviour change, so keeping the checks together is worth more than the line count. Nothing checks this rule. It is a review rule, and ESLint carries no length or complexity rule in this repository.
- Max file length: 300 lines of code, excluding comments and blank lines. Nothing checks this rule either, for the same reason: it is a review rule, and ESLint carries no length or complexity rule in this repository.
- Both length rules bind new and modified code. Existing over-length code is grandfathered — it stays as it is until it is touched for another reason, and a measured violation count is not a backlog. Do not split a file or a function your ticket did not name.
- Max nesting depth: 3 levels — prefer early return
- No magic numbers; use named constants
- Naming: `camelCase` for variables/functions, `PascalCase` for components/classes, `SCREAMING_SNAKE_CASE` for constants, `PascalCase.tsx` for component files, `kebab-case.ts` for utilities/hooks
- Boolean names: prefix with `is`, `has`, or `should`
- Branch format: `feat/`, `fix/`, `chore/`, `hotfix/`
- Commit format: Conventional Commits; no direct push to `main`

## Next.js version note

This project uses **Next.js 16**, which may differ from training data. Read `node_modules/next/dist/docs/` for authoritative API references before writing code that touches routing, middleware, or data-fetching patterns.

## Agent skills

### Issue tracker

GitHub Issues in `jefrykurniaone/net-c-management`, driven by the `gh` CLI — this is where `/to-spec`, `/to-tickets`, `/triage` and `/wayfinder` publish. Wayfinder maps are issues labelled `wayfinder:map` with sub-issues as tickets, never markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->