# The render mode and revalidation window for `/`

Type: grilling
Status: resolved
Parent: ../map.md
Blocked by: 04
Blocks: 07

## Question

04 fixed the read shape, which discharges the fog patch this ticket graduated
from. `/` now performs exactly two selects — active Activities, and the next
three `SCHEDULED` sessions — with **no writes, no per-user variance, and no
capacity data** (04's Rule 3). That is a page that does not have to be dynamic.

It also cannot afford to be. Public traffic reaches Prisma on a pool capped at
one connection per serverless function (`PRODUCT.md:72`), and unlike every other
route in this app, `/` is now reachable by anyone with the URL — including
crawlers, link unfurlers, and whatever a WhatsApp share fans out to.

What is `/`'s render mode, and how stale may it be?

Sub-questions:

- Static with `revalidate`, request-time dynamic, or `'use cache'`? Next.js 16 —
  read `node_modules/next/dist/docs/` rather than assuming the Next 14/15 story.
- What is the acceptable staleness window? An Activity added today appearing
  tomorrow is probably fine; a session the page still advertises after it has
  been cancelled is not. Note that 04 already filters `CANCELLED` out — a cached
  page cannot re-filter.
- The session band is the only time-sensitive part: its `date >= today` filter
  silently rots at midnight. Does the whole page share one window, or does the
  session band need its own?
- Does the authenticated path change anything? `src/proxy.ts` redirects signed-in
  users away from `/` — if that happens in middleware, the cached page is only
  ever served to strangers, which simplifies this. Confirm before deciding.
- Is cache invalidation on admin writes (create/edit Activity, cancel a session)
  in scope here, or a separate concern? A `revalidatePath('/')` in the admin
  mutations is cheap; deciding it later is not.

## Answer

**`/` stays a request-time dynamic render. The cache moves off the page and onto
the data.** The page is dynamic and costs zero database connections — those are
not in tension, and treating them as one is what made "make it static" look like
the goal.

### The premise that died

The ticket asserted that `src/proxy.ts` redirects signed-in users away from `/`.
**It does not.** `/` is not in `isProtectedRoute` (`src/proxy.ts:19-24`), is not
an auth page, and falls straight through to `NextResponse.next()`. The redirect
lives in the page body — `src/app/page.tsx:106-111` calls `auth()` and then
`redirect('/dashboard')`.

That matters because it means `/` reads **two** cookies, not one:

| read | where | consequence |
| --- | --- | --- |
| session | `auth()` — `src/app/page.tsx:99` | dynamic |
| `NEXT_LOCALE` | `getLocale()` — `src/lib/i18n/locale.ts:8` | dynamic |

Either alone forecloses a prerender. Moving the session read into middleware
(making the ticket's premise retroactively true) buys nothing while the locale
cookie stays, and the locale cookie only leaves by turning i18n into a route
segment — a rewrite of every route in the app to speed up one. **Ruled out.**

### Rule 1 — the page is dynamic; `src/lib/public-landing.ts` is cached

04 made `src/lib/public-landing.ts` the sole thing `/` may query. That choke
point is now also the sole thing `/` may *cache*. Its two selects are wrapped in
`unstable_cache` with a tag and a revalidate window; the page keeps its present
shape and reads cookies freely.

```ts
// src/lib/public-landing.ts
const readPublicLanding = unstable_cache(
  async (wibDayKey: string) => ({ activities, sessions }),
  ['public-landing'],
  { tags: ['public-landing'], revalidate: 3600 },
);
```

On a hit the request touches Prisma **zero** times, which is the whole of
`PRODUCT.md:72`'s pool concern. A dynamic render that does no I/O is cheap; a
crawler storm costs CPU, not connections. The render mode was never the lever.

This also **decouples the cache from 06.** Whatever 06 decides about the rail's
sign-in affordance, or about whether a signed-in member is still bounced to
`/dashboard`, changes only per-request markup — never the cached payload, which
04 already guaranteed carries no per-user variance.

### Rule 2 — the staleness window is **1 hour**, and it is a backstop

`revalidate: 3600`. One hour is already this app's unit of "soon enough" — it is
the `holdDurationMinutes` default. But the window is the *floor* on freshness,
not the mechanism: Rule 4's invalidation is what actually keeps the page honest,
and the hour only covers writes that escape it.

### Rule 3 — midnight rot is a cache **key**, not a window

The session band's `date >= today` filter silently rots at midnight, and no
revalidate window fixes that (a 1h window still serves a stale day for up to an
hour past midnight, advertising a session that already happened).

Fix: **the WIB calendar day is an argument to the cached function**, so it is
part of the cache key. The band rotates the instant the day does, for free, and
`revalidate` is left governing only within-day freshness. The whole page shares
one window — the session band does not need its own.

"Today" means the **WIB calendar day**, matching the two crons
(`src/app/api/cron/generate-sessions/route.ts:4,23`,
`src/app/api/cron/day-reminders/route.ts:8,25`). A UTC or server-local day would
rotate the band at 07:00 WIB. `WIB_OFFSET_MS = 7 * 60 * 60 * 1000` is now
duplicated in two crons and wanted in a third place — it earns a shared helper.

### Rule 4 — invalidation is in scope, and its set is exactly 04's allow-list

A cached page cannot re-filter, so 04's `CANCELLED` exclusion only holds if
cancelling invalidates. `revalidateTag('public-landing')` goes in the mutations
that write published fields, and **only** those:

| route | why |
| --- | --- |
| `api/activities/route.ts` (POST) | a new active Activity is published |
| `api/activities/[id]/route.ts` | name, icon, colour, weekly slot, fees, `isActive` |
| `api/sessions/route.ts` (POST) | may enter the next-3 window |
| `api/sessions/[id]/route.ts` | **cancel** and reschedule — the correctness case |
| `api/settings/route.ts` | `communityName` |
| `api/settings/logo/route.ts` | `logoUrl` |
| `api/cron/generate-sessions` | writes next month's sessions |

Everything else — payments, attendance, reserve, remind, memberships, users,
profile, avatar, locale — publishes nothing, so it invalidates nothing. **04's
ban on capacity data is what buys this**: reserve and attendance are the
highest-frequency writes in the app, and they never touch this cache.

### Rule 5 — `/` must stop calling `getSettings()`

> **CORRECTED by [12](12-metadata-and-the-og-image.md), recorded here by
> [09](09-which-docs-are-amended.md).** This rule named only the page body. The
> real caller is the **root layout's `generateMetadata`**
> (`src/app/layout.tsx:23-33`), which runs `getSettings()` on every request to
> *every* route — so `/` issues **two** Settings queries per render today and
> Rule 1's zero-connections-on-a-hit was already defeated before this ticket
> closed. Read the rule as: **no caller on `/`, the root layout's metadata
> included.** The name comes from a narrow `getPublicCommunityName()` inside 04's
> choke point, under this ticket's existing `public-landing` tag and window.
> Rule 4's invalidation set is unchanged in membership but gains a second reason
> for the two Settings routes: a rename now moves the `<title>` and the OG image,
> not only the board.

`getSettings()` (`src/lib/settings.ts:32`) is a live `prisma.settings.findMany()`
on every call, so the hero's community name and logo would keep costing a
connection per anonymous hit and defeat Rules 1–4 outright. It also **cannot be
wrapped as it stands** — it calls `getLocale()` internally
(`src/lib/settings.ts:35`), and reading cookies inside a cache scope is
unsupported (`unstable_cache.md:29`). And it returns `adminWhatsapp`, which 04
bars from `/`.

All three point the same way: `/` reads `communityName` and `logoUrl` through
the `public-landing.ts` choke point like everything else, never through
`getSettings()`. The locale-dependent name fallback stays outside the cache
scope, applied per request.

### What was rejected

- **`'use cache'` / `cacheLife` / `cacheTag`** — the supported Next 16 API, and
  the right destination. But it is gated behind `cacheComponents: true`
  (`cacheComponents.md:14-24`), absent from `next.config.ts`, and in 16.0 that
  one flag subsumes `ppr`, `dynamicIO`, and `useCache`
  (`cacheComponents.md:52`). Flipping it forces an audit of every uncached fetch
  across `(main)` and `(admin)` for Suspense boundaries. That is a platform
  migration, not a landing decision, and this map does not get to start one.
- **`export const revalidate` on the segment** — unreachable while either cookie
  is read (see above).

**Accepted debt, stated plainly:** `unstable_cache` is formally superseded —
"replaced by `use cache` in Next.js 16" (`unstable_cache.md:6-8`). It still
ships and still works. When the app flips `cacheComponents` for its own reasons,
this is one file and one function to port, and the tag name survives the move.
