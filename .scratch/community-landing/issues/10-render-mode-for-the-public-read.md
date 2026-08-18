# The render mode and revalidation window for `/`

Type: grilling
Status: open
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

<!-- resolved by the session that takes this ticket -->
