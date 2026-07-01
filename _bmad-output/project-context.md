---
project_name: 'net-c-management'
user_name: 'Jefry.k'
date: '2026-06-30'
sections_completed: ['technology_stack', 'framework', 'auth', 'data_layer', 'i18n', 'language', 'code_quality', 'workflow', 'dont_miss']
existing_patterns_found: 12
status: 'complete'
rule_count: 27
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Framework:** Next.js `16.2.6` (App Router) + React `19.2.4` + TypeScript `^5` (strict)
- **ORM:** Prisma `^7.8.0` with `@prisma/adapter-pg` driver adapter (`driverAdapters` preview, direct `pg` pool — not Prisma's built-in connector)
- **Database:** Supabase PostgreSQL (`pg ^8.20.0`)
- **Auth:** NextAuth `^5.0.0-beta.31` (Google OAuth, `@auth/prisma-adapter`, **database** sessions)
- **Storage:** `@supabase/supabase-js ^2.105.3` (service-role client, server-only)
- **UI:** Tailwind CSS `^4` + shadcn `^4.7.0` / `radix-ui` + `lucide-react` + `sonner` (toasts) + `next-themes`
- **Forms/Validation:** `react-hook-form ^7.75.0` + `zod ^4.4.3` + `@hookform/resolvers`
- **Lint:** ESLint `^9` (`eslint-config-next` core-web-vitals + typescript). Enforced via pre-commit hook.
- **Path alias:** `@/*` → `./src/*`

## Critical Implementation Rules

### Framework-Specific Rules (Next.js 16 / React 19)

- **Middleware = `src/proxy.ts`** (Next 16 renamed middleware→proxy). Default-export wraps `auth((req) => ...)` + `export const config.matcher`. NEVER create `middleware.ts`.
- Read `node_modules/next/dist/docs/` before routing/middleware/data-fetching code — Next 16 diverges from training data.
- Route groups: `(main)` = member pages, `(admin)/admin/*` = admin, `api/` = REST. Page access enforced **twice**: `proxy.ts` AND route-group `layout.tsx` `auth()` guard. New protected route → update proxy matcher logic + layout guard.
- Server Components by default. Interactive split into `*-actions.tsx` / client components. Per-route `loading.tsx` for skeletons.
- API handler contract: `await auth()` → 401 if no `session.user.id` → `isAdminRole(role)` 403 for mutations → zod `safeParse(body)` → 400 `{ error, details }`. Respond via `NextResponse.json`.

### Auth / Authz Rules

- `Role` = MEMBER | ADMIN | **OWNER**. NEVER `role === 'ADMIN'` — use `isAdminRole()` from `@/lib/utils` (OWNER must also pass admin gates).
- **Database** sessions (not JWT). Session enriched in `auth.ts` `session` callback (role, isProfileComplete, phone, isActive) via extra DB read.
- `allowDangerousEmailAccountLinking` + `/auth/dev` login are dev-only (`NODE_ENV !== 'production'`). NEVER reach prod.
- `isProfileComplete=false` → every protected route redirects `/onboarding`.

### Data Layer (Prisma + Supabase)

- Single client: import `{ prisma }` from `@/lib/prisma`. NEVER `new PrismaClient()`. Pool `max`: 1 prod / 10 dev.
- Driver-adapter preview (`PrismaPg`, raw `pg`). Connection: **Transaction pooler 6543** prod / **Session pooler 5432** dev.
- Schema change → `npx prisma generate` then `npx prisma db push` (or `db:migrate`). Import enums/types from `@prisma/client`, not string literals.
- Code accessor is `prisma.activitySession` (model `ActivitySession`). Models beyond CLAUDE.md list: `Ekskul`, `Membership`. **Members see only sessions of their ekskul** (`getUserEkskulIds`); admins see all — keep any new member list query ekskul-scoped (cross-ekskul data leak = security bug).
- Storage only via `@/lib/supabase` helpers (service-role, bypasses RLS, **server-only**). Buckets: `payment-proofs`/`avatars`/`logos`. NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to browser.

### i18n Rules

- NEVER hardcode user-facing strings → route through `@/lib/i18n/dictionaries.ts` (`en`/`id` pair). Locale from `NEXT_LOCALE` cookie via `@/lib/i18n/locale.ts` (server-side).
- zod schemas are dict-aware: build via `buildCreateSessionSchema(t)` etc. — pass the dictionary, don't inline error strings.
- `getDictionary(locale)`, `getSettings()` are server-only — call from Server Components / Route Handlers.

### Language / TypeScript Rules

- `strict` on. Import via alias `@/*` → `src/*` — NEVER deep relative `../../`.
- Env vars asserted non-null at module load (`process.env.X!`); `supabase.ts` throws at import if missing — keep fail-fast.
- `import 'server-only'` guards server modules — keep service-role/settings/dictionary server-only.

### Code Quality & Style

- Max func 40 lines · max file 300 lines · max nesting 3 (early return).
- No magic numbers → named consts (e.g. `MAX_SESSION_LIMIT = 50`).
- Naming: `camelCase` vars/fns, `PascalCase` components/classes, `SCREAMING_SNAKE_CASE` consts, `PascalCase.tsx` components, `kebab-case.ts` utils/hooks. Booleans prefixed `is`/`has`/`should`.
- ESLint (next core-web-vitals + ts) enforced via pre-commit hook. Run `npm run lint`. No automated tests exist.

### Development Workflow

- Branches: `feat/` `fix/` `chore/` `hotfix/`. Conventional Commits. NEVER push directly to `main` — PR only.
- Deploy: Vercel serverless (drives pool=1 + transaction pooler).
- `CLAUDE.md` references `AGENTS.md` but that file is absent — standards consolidated in `CLAUDE.md`.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented. When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when the technology stack or patterns change.
- Review quarterly; remove rules that become obvious over time.

Last Updated: 2026-06-30
