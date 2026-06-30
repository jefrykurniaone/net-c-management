---
review: ARCHITECTURE-SPINE.md
lens: reality / version verification
target: _bmad-output/planning-artifacts/architecture/architecture-net-c-management-2026-06-30/ARCHITECTURE-SPINE.md
reviewer: independent architecture-spine reviewer (version-reality lens only)
date: 2026-06-30
verdict: MINOR
---

# Version-Reality Review — ARCHITECTURE-SPINE.md

**Scope of this review:** factual/version correctness ONLY. I did not evaluate design
quality, divergence, or completeness. Primary source of truth = the project's own
`package.json` + installed `node_modules` (brownfield). Version-sensitive capability
claims were cross-checked against Prisma 7 docs (context7 `/prisma/prisma/7.6.0`) and the
Next.js 16 docs shipped in `node_modules/next/dist/docs`.

**Verdict: MINOR issues.** Every version number the spine explicitly states matches the
installed/pinned reality exactly — there is no MATERIAL version mismatch. The two compressed
"bundle" rows in the Stack table state a single/partial version for several distinct
packages, leaving real versions unstated and one label (`4.7`) attached to the wrong
package set. One terminology item ("driverAdapters preview") is outdated for Prisma 7 but
faithfully mirrors the project's own (vestigial) schema declaration. The two
Prisma/Postgres capability claims singled out for scrutiny (AD-5, AD-12) are **correct and
verified**.

---

## 1. Stack table vs `package.json` + installed versions

Verified against `npm ls --depth=0` (installed) and `package.json` (pinned).

| Spine row | Spine states | Installed / pinned | Verdict |
| --- | --- | --- | --- |
| Next.js (App Router) | 16.2.6 | `next@16.2.6` (pinned `16.2.6`) | ✅ exact |
| React | 19.2.4 | `react@19.2.4` (pinned `19.2.4`) | ✅ exact |
| TypeScript | ^5 (strict) | dev `typescript@^5` | ✅ matches pin (strict = tsconfig claim, not version) |
| Prisma + @prisma/adapter-pg | 7.8.0 | `prisma@7.8.0`, `@prisma/client@7.8.0`, `@prisma/adapter-pg@7.8.0` (pinned `^7.8.0`) | ✅ version exact — see §2 re "driverAdapters preview" wording |
| pg | 8.20.0 | `pg@8.20.0` (pinned `^8.20.0`) | ✅ exact |
| NextAuth | 5.0.0-beta.31 | `next-auth@5.0.0-beta.31` (pinned `^5.0.0-beta.31`) | ✅ exact |
| Supabase JS | 2.105.3 | `@supabase/supabase-js@2.105.3` | ✅ exact |
| Tailwind CSS | ^4 | `tailwindcss@4.2.4` (pinned `^4`) | ✅ matches pin |
| shadcn/ui + radix-ui + lucide-react + sonner + next-themes | **4.7** | `shadcn@4.7.0`, `radix-ui@1.4.3`, `lucide-react@1.14.0`, `sonner@2.0.7`, `next-themes@0.4.6` | ⚠️ **`4.7` is only the `shadcn` CLI version** — see Finding A |
| zod + react-hook-form + @hookform/resolvers | **4.4.3 / 7.75.0** | `zod@4.4.3`, `react-hook-form@7.75.0`, `@hookform/resolvers@5.2.2` | ⚠️ **3 packages, 2 versions — `@hookform/resolvers@5.2.2` unstated** — see Finding B |
| Postgres (Supabase) pooler note | — | n/a | ✅ no version asserted |

**Finding A (MINOR) — the `4.7` row label is mis-scoped.** The row names five distinct
packages but gives a single version `4.7`. That number is the version of the `shadcn` CLI
(`shadcn@4.7.0`) only — and `shadcn` is the component-scaffolding CLI, not a runtime UI
library. The four packages that actually ship UI at runtime carry unrelated, much lower
versions: `radix-ui@1.4.3`, `lucide-react@1.14.0`, `sonner@2.0.7`, `next-themes@0.4.6`.
None of those four versions is stated anywhere in the spine, and `4.7` does not apply to any
of them. Correction: either split the row so each package shows its real version, or label
it explicitly as "shadcn CLI 4.7.0; radix-ui 1.4.3 / lucide-react 1.14.0 / sonner 2.0.7 /
next-themes 0.4.6". (Note: `lucide-react@1.14.0` is unusual — lucide-react historically used
`0.x` versions — but `^1.14.0` is genuinely what this project pins and installs, so it is
not an error in the spine; flagged only so a downstream reader doesn't "correct" it back to
`0.x`.)

**Finding B (MINOR) — `@hookform/resolvers@5.2.2` version is omitted.** The row lists three
packages (`zod`, `react-hook-form`, `@hookform/resolvers`) but only two versions
(`4.4.3 / 7.75.0`, mapping to zod and react-hook-form). The resolvers package is pinned and
installed at `@hookform/resolvers@5.2.2`; that version is never stated. Correction: state
`@hookform/resolvers 5.2.2` (note it is a major version ahead of react-hook-form, which can
matter for the zod-resolver API).

**Not flagged (informational):** the spine's Stack seed omits several real dependencies
(`@auth/prisma-adapter@2.11.2`, `@vercel/analytics`, `class-variance-authority`, `clsx`,
`date-fns`, `tailwind-merge`, `tw-animate-css`, `server-only`). This is a deliberate "seed"
scope, not a factual error. Worth noting only that `@auth/prisma-adapter@2.11.2` is the
component that actually backs the "NextAuth … DB sessions" claim — its presence corroborates
the spine's "database sessions" assertion (database session strategy requires an adapter).

---

## 2. Named-technology existence / version-fit checks

### 2a. Next.js 16 `proxy.ts` middleware rename — ✅ CONFIRMED
The spine (AD-2, AD-9, Structural Seed: "`proxy.ts` # Next 16 middleware (NOT middleware.ts)")
is factually correct. Verified two ways:
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`:
  *"Starting with Next.js 16, Middleware is now called Proxy to better reflect its purpose.
  The functionality remains the same."* Convention: a single `proxy.ts` (or `.js`) at project
  root or inside `src`.
- The project actually ships `src/proxy.ts` (default-exports `auth((req) => …)`); there is no
  `src/middleware.ts`. The brownfield reality matches the claim.

### 2b. Prisma 7 `driverAdapters` — ⚠️ TERMINOLOGY OUTDATED (MINOR)
The spine repeatedly calls this a "preview" feature: Stack row "Prisma + @prisma/adapter-pg
**(driverAdapters preview)**", and the AD-1 layer table ("`@prisma/adapter-pg`"). Per Prisma
docs (context7 `/prisma/prisma`), the `driverAdapters` preview-feature gate was **removed /
stabilized in Prisma 6.15.0+** — the client generator stopped checking
`previewFeatures.includes('driverAdapters')` and now uses the WASM/driver-adapter runtime
unconditionally. In Prisma 7.8.0 (this project) driver adapters are **GA, not preview**, and
`previewFeatures = ["driverAdapters"]` is **vestigial** (no longer required; Prisma treats it
as a no-op / no-longer-needed flag).

Why this is MINOR, not MATERIAL: the project's own `prisma/schema.prisma` still literally
declares `generator client { previewFeatures = ["driverAdapters"] }` (line 6), so the spine
is faithfully describing the brownfield schema as-written, and the CLAUDE.md repeats the same
"preview feature" phrasing. Nothing breaks. Correction: drop the word "preview" (driver
adapters are GA in Prisma 7); optionally note that the `previewFeatures = ["driverAdapters"]`
line in the schema is now redundant and can be removed. The **version `7.8.0` itself is
correct** — only the "preview" characterization is stale.

### 2c. NextAuth v5 beta, DB sessions — ✅ CONFIRMED
`next-auth@5.0.0-beta.31` is installed and pinned exactly as stated. The "database sessions"
claim is consistent with the presence of `@auth/prisma-adapter@2.11.2` (an adapter is
required for the database session strategy). No factual issue.

### 2d. Tailwind v4 — ✅ CONFIRMED
`tailwindcss@4.2.4` installed (pin `^4`), `@tailwindcss/postcss@^4` present. Matches the
spine's "Tailwind v4" / "^4". AD-11's reuse of "shadcn/ui + Tailwind v4 + next-themes" is
consistent with installed deps.

---

## 3. Prisma / Postgres capability claims (explicitly requested scrutiny)

### 3a. AD-5 — "`@@unique` cannot express a partial/filtered unique index; the partial index is applied via raw SQL" — ✅ CORRECT / VERIFIED
Prisma's schema language has **no** way to declare a partial / filtered unique index (a
`WHERE type = 'MONTHLY'` predicate). Confirmed against Prisma internals (context7): the DMMF
index model supports only `IndexType = 'id' | 'normal' | 'unique' | 'fulltext'` — there is no
partial/conditional/`WHERE` index type, and "CHECK and EXCLUDE constraints are not included,
indicating no native schema-level support." Since `@@unique`/`@@index` can only emit one of
those four shapes, the filtered unique index AD-5 needs cannot be expressed in the schema, and
`prisma db push` (which only materializes what the schema declares) therefore cannot create it.
The spine's reasoning is sound and the design fact is accurate.

Secondary fact in AD-5 also correct: *"null `sessionId` on monthly rows never collides in
Postgres"* — Postgres treats NULLs as distinct in a standard (non-`NULLS NOT DISTINCT`) unique
index, so `@@unique([userId, sessionId])` will not block multiple monthly (`sessionId = NULL`)
rows. Accurate for the default index behavior.

### 3b. AD-12 — "partial index applied out-of-band via raw SQL (`prisma db execute`)" — ✅ CORRECT / VERIFIED
`prisma db execute` is a real, current Prisma 7 CLI command (confirmed via Prisma's own
`DbExecute` test suite in context7, e.g. `DbExecute.new().parse(['--file=./script.sql'], …)`
and `npx prisma db execute --file=…`). It runs arbitrary SQL against the datasource and is the
documented escape hatch for DDL that the schema cannot express — exactly AD-12's use. The
companion claim that this project uses `db push` (not a migration-file workflow) is consistent
with `prisma/schema.prisma` having no `migrations/` history wired for the new work and the
spine's pre-launch framing.

Minor implementation note (not a spine error — spine correctly defers the literal wiring to
the payment epic): `prisma db execute` requires an input source (`--file` or `--stdin`) **and**
a datasource (`--schema` or `--url`); it does not infer SQL inline. The invariant is stated at
the right altitude.

---

## 4. Summary of findings

| # | Severity | Location | Issue | Correction |
| --- | --- | --- | --- | --- |
| A | MINOR | Stack table, shadcn row | `4.7` is the `shadcn` CLI version only; radix-ui (1.4.3), lucide-react (1.14.0), sonner (2.0.7), next-themes (0.4.6) are unversioned and do not share `4.7` | Split the row or label each package's real version; clarify `4.7` = shadcn CLI |
| B | MINOR | Stack table, zod row | 3 packages listed, 2 versions; `@hookform/resolvers@5.2.2` unstated (and a major ahead of RHF) | State `@hookform/resolvers 5.2.2` |
| C | MINOR | Stack row + AD-1 ("driverAdapters preview") | "preview" is outdated for Prisma 7 — driver adapters are GA since 6.15.0; the schema's `previewFeatures=["driverAdapters"]` is vestigial | Drop "preview"; optionally note the schema flag is now redundant. Version 7.8.0 is correct |
| — | PASS | AD-2 / AD-9 / Structural Seed (`proxy.ts`) | Next 16 middleware→proxy rename | Confirmed by Next 16 docs + actual `src/proxy.ts` |
| — | PASS | AD-5 (partial unique index limitation) | Prisma cannot express filtered unique; `db push` can't create it | Confirmed by Prisma DMMF index types |
| — | PASS | AD-12 (`prisma db execute`) | Real Prisma 7 CLI command | Confirmed by Prisma CLI tests |
| — | PASS | NextAuth 5.0.0-beta.31 / Tailwind v4 / pg 8.20.0 / Supabase 2.105.3 / Next 16.2.6 / React 19.2.4 | all stated versions | Exact match to installed |

**Bottom line:** No version the spine asserts is wrong, and both load-bearing
Prisma/Postgres capability claims (AD-5, AD-12) are factually correct and reality-checked.
The only corrections are cosmetic/labeling (Findings A, B) and one stale-but-faithful
terminology item (Finding C, "preview" → GA for Prisma 7). MINOR overall.
