# What a stranger sees before they arrive — title, description, OG image

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocked by: 07
Blocks: 09

## Question

`/` is now a public page a stranger reaches from search or from a WhatsApp link,
so its metadata is part of the surface this map is designing — and today it is
actively wrong.

`src/app/layout.tsx:30-31` builds `<title>` and `<meta description>` from
`brand.tagline`, hardcoded `'XClub Community Management'` /
`'Manajemen XClub Community'`. That is a placeholder brand in **software
marketing voice**, on the one route strangers reach first.

[08](08-copy-authority-dictionary-versus-settings.md) banned that string from `/`
and fixed the constraints. [07](07-section-inventory-and-order.md) has now
settled what the page actually contains — a pitch and one board of real
Activities — so what replaces the tagline, and what the shared image is, can
finally be decided.

## What is already fixed elsewhere (not reopenable here)

- **No "XClub" anywhere on `/`**, and `brand.tagline` is banned from the route
  (08). The community name is **runtime config** and may be anything, or absent
  (`PRODUCT.md:86,88`).
- **No real-world evidence, ever** — no counts, no testimonials, no logos, no
  screenshots (`PRODUCT.md:94`). This binds the OG image hardest.
- **Nothing sport-specific** in code, copy, or imagery (`PRODUCT.md:90`) — which
  rules out the obvious shuttlecock.
- **No SaaS pitch, no tenant talk** (`PRODUCT.md:68`).
- **Both locales, through the dictionary** (`PRODUCT.md:69`), and 08 gave `/`
  its own per-band sub-blocks. Indonesian runs 15–30% longer, and a `<title>`
  has a hard truncation budget in a search result.
- **The metaphor ban extends to `/`** (`DESIGN.md:309`) — no board, tile, rail,
  or lattice in user-facing copy.

## Sub-questions

- **What is the `<title>`?** It is per-community and the community name is
  unknown at build time, so it is a template. `"<name>"` alone, `"<name> — <what
  this is>"`, or something else? Whatever follows the name must survive a name
  that is already long, and must not become a software tagline by the back door.
- **What is the description?** One sentence, and the hero's lead sentence is
  sitting right there — reuse it, or author a second string that reads as a
  search snippet rather than as page copy? Note 06 broke the shared-copy
  coupling between `/` and `/auth/signin` deliberately, so shared strings are
  not automatically the safe choice any more.
- **Where does it live?** Today it is in the **root** `layout.tsx`, which means
  `(main)` and `(admin)` inherit whatever `/` gets. `/` needs its own
  `generateMetadata`, and the question is what the *other* route groups should
  say once the tagline is deleted — they are behind auth, so their titles are a
  different problem with a different reader.
- **Metadata is a third copy home.** 08 found `PRODUCT.md:69` is already false
  because all seven `src/lib/email/` templates inline `isId ? …`. Metadata is
  resolved server-side per request and can read the dictionary — confirm it does
  rather than becoming a fourth place strings live.
- **Is there an OG image at all?** The honest options are: no image (link
  previews fall back to a bare card); a **generated** image carrying the
  community name as the hero wordmark on painted board, which is the one asset
  that is true for every deployment; or a static neutral image. A generated
  image needs a route and a runtime decision, and Next 16's `ImageResponse` is
  the obvious tool — but check it against the `cacheComponents` constraint
  [10](10-render-mode-for-the-public-read.md) recorded before assuming it is
  free.
- **Does the title read correctly when the community has no Activities?** The
  page survives empty by 07 decision 2, and the snippet must too — a description
  promising sessions to a deployment that has none is the same evidence problem
  `PRODUCT.md:94` bans, one layer out.
- **`robots` and indexability.** Nothing in this map has said whether `/` should
  be indexed. A single-community deployment probably wants to be findable by its
  own members; whether it wants to be findable by everyone is a product call,
  and the authenticated routes must stay out of the index either way.

## Answer

**The metadata surface is bigger than `/`.** The ticket assumed one route. There
are two, and the second one — `/s/[id]` — already ships an OG card that breaks
three of 04's rules and publishes a number that is arithmetically wrong. The
human ruled it into this ticket rather than into a new one, so the headline
decision is a **promotion**: 04's standing rules stop being rules for `/` and
become rules for **every unauthenticated route**.

Seven findings landed before any decision; four of them killed or reshaped a
sub-question the ticket had written.

### Findings

**F1 — a second public route exists and was never charted.**
`src/app/s/[id]/page.tsx` is unauthenticated: `src/proxy.ts:19-24` builds
`isProtectedRoute` from `/dashboard`, `/sessions`, `/payments`, `/profile`,
`/admin`, and `/s` is in none of them. Its `generateMetadata` (`:45-58`)
publishes `session.title` (admin free text), per-session `location`, and
`${spotsLeft} spots left` — the exact three things
[04](04-what-public-data-the-page-may-show.md) withheld from `/`. This is the
link that actually gets pasted into WhatsApp today, so the ticket's own framing
("a stranger reaches from a WhatsApp link") was already describing a route the
map had not looked at.

**F2 — the locale sub-question is nearly moot for a stranger.**
`src/lib/i18n/locale.ts:7-14` resolves locale from the `NEXT_LOCALE` cookie. A
WhatsApp, Google, or X scraper sends no cookies, so metadata rendered for a
crawler is **always `DEFAULT_LOCALE = 'en'`** (`dictionaries.ts:6`). The `id`
strings reach only a returning human who already holds the cookie — i.e. the
browser tab, never the search snippet. Consequence: **13's 48-character `id`
budget does not transfer to metadata.** Metadata is still authored in both
locales (`PRODUCT.md:69`), but the `id` title is a tab label, not a SERP
constraint, so it is not sized against `type-hero`'s budget.

**F3 — 10's "zero DB connections on a cache hit" was already defeated, by the
root layout.** `src/app/layout.tsx:23-33` `generateMetadata` calls
`getSettings()`, which is `prisma.settings.findMany()` (`src/lib/settings.ts:33`),
uncached, on **every request to every route**. `getSettings` is not
`React.cache`-wrapped and `src/app/page.tsx:100` calls it again, so `/` issues
**two** Settings queries per request today.
[10](10-render-mode-for-the-public-read.md) ruled `getSettings()` off `/` but
named only the page body; the root layout's metadata is the real caller. 10's
decision is incomplete without this ticket.

**F4 — metadata is not a fourth copy home.** `layout.tsx:28` already calls
`getDictionary(locale)`. The sub-question answers itself: metadata resolves
server-side per request and reads the dictionary today. Nothing to decide.

**F5 — `/s/[id]`'s capacity number is not merely barred, it is wrong.** The page
counts `status: { in: ['REGISTERED', 'PRESENT'] }` (`s/[id]/page.tsx:86-88`) and
never calls `releaseExpiredHolds`. Per `src/lib/holds.ts:70-88` an unfunded hold
stays a `REGISTERED` row until swept, so lapsed holds inflate `registered` and
understate `spotsLeft` — and that stale figure goes straight into
`og:description`. It **cannot be fixed in place**: the sweep deletes rows
(`holds.ts:83`) and queues mail (`:86`), which is precisely what 04 Rule 3 bars
an unauthenticated GET from doing. So the number is unfixable on a public route,
which converts 04 Rule 3 from a policy preference into the only correct answer.

**F6 — an OG image forces a `metadataBase` decision.**
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:428`
— a relative URL-based metadata field with no `metadataBase` is a **build
error**. Root layout sets none today.

**F7 — the env var already exists.** `.env.example:56-58` ships
`NEXT_PUBLIC_APP_URL` ("Public app URL — used for CTA links inside notification
emails"). No new variable is needed.

Two platform facts, both read from the installed Next 16 docs rather than
assumed:

- `opengraph-image.md:93` — the generated-image file is **a Route Handler cached
  by default unless it uses a request-time API or dynamic config**. A DB read
  alone does not make it dynamic, so an OG image that reads the community name
  and nothing else would be **baked at build and never see a rename**.
- `image-response.md:51,159-193` — `fonts` is optional but a custom face must be
  supplied as bytes via `readFile`; the whole bundle (JSX, CSS, fonts, images)
  caps at **500KB**. `next/font/google` does not hand over the binary.

### Decisions

**1. 04's standing rules bind every unauthenticated route, not just `/`.** This
is the promotion, and it is the ticket's real output. `/s/[id]` is judged by the
same allow-list as `/`, card and body alike — splitting them was rejected because
F5 shows both read the same wrong query, so a card-only fix leaves the defect on
the page. Consequences for the shipped `/s/[id]`:

- **Capacity dies** — no `spotsLeft`, no `registered / max`, no progress bar, in
  neither the card nor the body (04 Rule 3, now load-bearing via F5).
- **`session.title` and `notes` die** — admin free text written under an
  internal-tool assumption (04 Rule 4).
- **Per-session `location` dies**, replaced by the Activity's `defaultLocation`,
  which 04 already ruled public-safe.
- **What survives**: activity name, activity colour, date, start/end time,
  `defaultLocation`, and the CTA.

Stated plainly: this rewrites a page that already ships, which is more diff than
the ticket was scoped for. The human ruled it in with that flagged.

**2. The `<title>` on `/` is the community name alone.** No suffix. The name is
unbounded runtime config (`PRODUCT.md:86,88`), so any suffix is the part that
truncates in a SERP; and the only suffixes still legal after `PRODUCT.md:90`
(nothing sport-specific), `:86` (no brand), and 08 (no tagline) are generic
filler that costs pixels and says nothing. The accepted consequence is that
**the description now carries the whole "what is this" load**, which is what
makes decision 3 load-bearing rather than cosmetic.

**3. The description is its own string, and it may not promise inventory.** A
new `landing.meta.description` in the dictionary — *not* the hero lead reused.
Three reasons: [13](13-type-hero-fails-on-indonesian-and-on-phones.md) capped
the hero pitch at 48 characters on `id` where a snippet wants ~155;
[06](06-the-cta-and-the-fate-of-the-threshold.md) already broke the shared-copy
coupling deliberately; and a snippet is read with no wordmark above it, in a
SERP, by someone who has not seen the page. **Standing constraint: the
description may not name schedule, sessions, or any inventory** — it describes
the community and the act of joining. That keeps it true when
[07](07-section-inventory-and-order.md) decision 2 renders the board band
**Blank**, which is `PRODUCT.md:94`'s evidence ban one layer out.

**4. Root metadata reads the dictionary and the locale, and never the database.**
`layout.tsx`'s `generateMetadata` keeps `getLocale()` + `getDictionary()` and
**drops `getSettings()`**, resolving to a neutral, dictionary-authored default
title. `/` overrides it with its own `generateMetadata` carrying the community
name. This is the only arrangement in which 10's cache can actually reach zero DB
connections on a hit (F3). Two knock-ons: it **deletes the sole reader of
`brand.tagline`**, and per-page titles for `(main)`/`(admin)` are ruled past this
map's destination (see Out of scope below).

**5. The OG image is generated: the community name as wordmark on painted board.**
`PRODUCT.md:94` bars screenshots and photos, `:90` bars sport iconography, `:86`
says no brand exists — so a *static* image is a neutral rectangle that says
nothing, and "no image" leaves the WhatsApp recipient with a bare card as the
only thing they see before deciding to tap, behind which
[07](07-section-inventory-and-order.md) spent ~1250px of substance. The wordmark
on board is the one asset true for every deployment, and
[01](01-brand-layer-under-runtime-white-label.md) already fixed that composition.
Two execution constraints that come with it, both measured not assumed:
**it must be forced dynamic** or the build-time name is frozen forever, and
**Archivo 900 must be committed as a font binary** and read with `readFile`,
inside a 500KB bundle cap.

**6. Placement is the root segment, inherited app-wide.**
`src/app/opengraph-image.tsx` colocates with `/` and becomes the fallback card
for every route without its own — `/auth/*`, `/pending`, `/s/[id]`, and the
authenticated pages. Accepted rather than overridden: one community wordmark is
true on every route of a single-community deployment, and `/s/[id]` keeps its own
*text* metadata while inheriting the image, which beats the bare card it shows
today. **The image's `alt` is user-facing copy and goes through the dictionary**,
not an `opengraph-image.alt.txt` file, since a `.txt` file cannot be bilingual.

**7. `/` is indexable; everything else is `noindex`.** Enforced twice — a
`src/app/robots.ts` disallow list **and** `robots: { index: false }` on the
authenticated layouts — because robots.txt is advisory and the middleware makes
the exposure counter-intuitive: an unauthenticated crawler hitting `/dashboard`
gets a 307 to `/auth/signin` (`proxy.ts:27-29`), which is itself a **200
indexable page**. So the auth pages are what actually risks landing in Google,
not the protected ones. `/s/[id]` is `noindex` regardless of decision 1 —
a session's time and place should not be in a search index even after the
allow-list has trimmed it. **No sitemap**: one indexable page does not need one.

**8. The community name for metadata comes from 04's choke point.** A narrow
`getPublicCommunityName()` inside `src/lib/public-landing.ts`, wrapped in the
**existing** `unstable_cache` tag `public-landing` at the existing
`revalidate: 3600`. Rejected: an app-wide cached `getSettings()` (it answers the
whole-app question the map deliberately parked in Not-yet-specified) and
`React.cache()` alone (dedupes the two per-request queries but caches nothing
across requests). `getSettings()` itself stays unwrappable for 10's reason — it
reads cookies internally via `getLocale()`. **This adds a second reason for the
Settings routes to sit in 10's invalidation set**: a rename now changes the
`<title>` and the OG image, not only the board.

**9. `metadataBase` reuses `NEXT_PUBLIC_APP_URL`** (F7), set once in the root
layout, falling back to `http://localhost:3000` in dev per `.env.example:58`. No
new variable, and the email CTA links and the OG card then agree on what this
deployment's URL is.

**10. `summary_large_image` on both `/` and `/s/[id]`.** `/s/[id]` declares
`card: 'summary'` today (`s/[id]/page.tsx:54`), which was right when there was no
image and wrong the moment decision 6 gives every route a 1200×630 card —
`summary` crops it to a small square.

### Handed to 09

- **`PRODUCT.md` — 04's public-data rules bind every unauthenticated route.**
  04's amendment was going to be scoped to `/`; decision 1 widens it. A no-list
  that names one route will be broken by the next public route, which is exactly
  how `/s/[id]` came to break it.
- **`PRODUCT.md` — the indexability posture.** `/` indexable, every other route
  `noindex`, is a product call (decision 7), not a page detail.
- **A correction to 10's handoff.** "`/` must stop calling `getSettings()`" must
  read *including the root layout's `generateMetadata`* (F3), and 10's
  invalidation set gains the Settings routes for the title and OG image as well
  as the board (decision 8).
- **`brand.tagline` loses its last reader** (decision 4). Whether the dictionary
  key is deleted outright is 08's to rule, since 08 owns copy authority and its
  ban was scoped to `/`. Noted, not decided here.
- **13's 48-character `id` budget does not extend to metadata** (F2). Worth one
  sentence beside the `type-hero` budget so a future author does not size a
  `<title>` against a hero constraint.

### Ruled past the destination

- **Per-page titles for `(main)` and `(admin)`.** Decision 4 gives them a
  neutral dictionary-authored default from the root layout, which answers the
  ticket's "what do the other route groups say". Giving `/dashboard`,
  `/payments`, and each admin surface its own `<title>` is a tab-label pass
  across the authenticated app, past a map whose destination is the public page.
