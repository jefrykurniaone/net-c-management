# Map: The public page sells this community

Label: `wayfinder:map`
Effort: `community-landing`

## Destination

`/` stops being a sign-in threshold and becomes a **public page that sells this
community to a stranger** — with visual force comparable to
`playbypoint-hero.png`: a dominating statement, a loud single action, and real
substance below the fold. Reaching the end of this map means every decision
below is settled and written down — brand layer, type scale, layout law, what
public data may be shown, who may join, what the CTA does, section inventory,
copy authority — plus the DESIGN.md / PRODUCT.md amendments they imply. The
deliverable is decisions, not the diff.

Reference is a *visual* target, not a content target: playbypoint sells software
to many clubs; this page sells **one club to people who might join it**
(`PRODUCT.md:68` — single community per deployment).

## Notes

- **This map supersedes the closed map `landing-execution`**
  (`.scratch/landing-execution/map.md`). That map's destination was "keep the
  threshold, fix the execution — no pitch, no sections, no marketing hero." The
  human has redrawn the scope: prospects are now in, so the threshold premise is
  gone. Its five closed decisions are still *evidence* (especially 01's rule
  survey), but its conclusions on placement (04) and DESIGN.md wording (05) are
  now open again for a marketing surface. Do not treat them as binding.
- Domain: frontend visual execution + a product-scope change on the public route.
- Hard product facts, not negotiable without a PRODUCT.md amendment:
  - `PRODUCT.md:68` — one community per deployment. No SaaS pitch, no tenant talk.
  - `PRODUCT.md:86,88` — no brand exists; community name and logo are **runtime
    config**, and every surface must survive an unknown name and an absent logo.
  - `PRODUCT.md:90` — nothing sport-specific in code, copy, or imagery.
  - `PRODUCT.md:94` — **no real-world evidence.** No invented counts,
    testimonials, logos, or screenshots. Ever.
  - `PRODUCT.md:69` — every string through `src/lib/i18n/dictionaries.ts`, both
    `en` and `id`; Indonesian runs 15–30% longer.
  - `PRODUCT.md:42` — bank account details exist per Activity. They must never
    reach an unauthenticated page.
- Human's settled answers that fixed this destination:
  - Audience: **public prospects who might join this community** (not software buyers).
  - Proof band: **real data read from the database**, never placeholder proof.
  - Brand: **define a brand layer first** — it blocks the visual tickets.
  - All four reference qualities wanted: type weight, centred hero, loud accent
    CTA, sections below the fold.
- Authority order: `PRODUCT.md` / `CONTEXT.md` for product truth > `DESIGN.md`
  for visual law > token layer (`globals.css`, `src/app/styles/*`) > commit bodies.
  Where DESIGN.md is silent, that silence is a decision to make, not licence to invent.
- Every session: `/impeccable` for visual judgement, `/grilling` +
  `/domain-modeling` for the decisions. Prototype tickets use `/prototype`.
- Two deliberate token deviations exist for contrast reasons, documented in
  `src/app/styles/board-materials.css:9-14, 96-102, 147-150`. Do not "correct" them.

## Decisions so far

<!-- one line per closed ticket; detail lives in the ticket -->

- [The brand layer under a runtime white label](issues/01-brand-layer-under-runtime-white-label.md)
  — Brand is the design system on a second material, not new brand. Accent stays
  **fixed in code** (Court Green; no `Settings` key — WCAG can't be enforced on an
  admin hex). The **hero band only** is painted board `#1B2621`, **fixed regardless
  of theme**, so Court Green Lit `#4FBF8E` carries one loud CTA; enamel below the
  seam. Identity in the hero is the **community name as wordmark in Chalk Ink** —
  `CommunityIdentityMark` is never scaled up and a configured logo lives in the rail
  only, so there is exactly one hero composition. Hero carries **two type roles**
  (Mark 900 + Display); sizes are 02's. No colour-rule exemptions. Typeface and
  `Activity.color` were already closed by `DESIGN.md:207` and `:284`.

- [The type scale for a public surface](issues/02-type-scale-for-a-public-surface.md)
  — The `3rem` cap was **mis-scoped, not wrong**: it stays and keeps governing
  boards. The public route gets a ninth role, **`type-hero`** —
  `clamp(2.5rem, 8vw, 5rem)` / 900 / lh `0.95` / `-0.03em` / uppercase — whose
  lower bound sits above Display's cap so the roles never overlap, kept off
  `(main)`/`(admin)` by an **ESLint restriction**, not convention. Tight caps are
  a different device from Mark's tracked caps, so `DESIGN.md:209` holds. The
  **pitch** is the giant (not the community name — unbounded length); the hero
  wordmark stays at `type-mark`. Pitch sits on a **`48rem` text measure** inside
  the `72rem` gutter — the measure, never a `<br>`, delivers the break. **3 lines
  max at the cap, ≈54 characters budgeted on `id`**; mobile reflow to 4 lines is
  accepted. Display's two-line rule survives, scoped to Display.

- [Where a marketing surface centres and a board top-anchors](issues/03-layout-law-marketing-versus-board.md)
  — `/` is a **public band-stack surface**: a third layout category of full-bleed
  bands, hero content centred at **`48rem`** and **top-anchored**, so
  `DESIGN.md:215`'s vertical-centring sentence stands untouched — the reference
  hero is horizontally centred, not vertically, so the amendment is an addition
  rather than a correction. The shared `72rem` gutter is abandoned in the **hero
  band only** and resumes below the seam. The **identity rail stays themed enamel
  above the seam, with no nav** (rail-on-board would leave the theme toggle with
  no visible effect where it sits); its bottom rule *is* the band's top edge, and
  the band's bottom edge carries no rule. Density is **positional**: `2/10/16/28`
  inside cells everywhere, plus two new steps (`56 / 112`) for air *between*
  bands, collapsing one step at `768px`; the hero is exempt from
  `DESIGN.md:219`. No `min-height` on the hero — instead **no band may push the
  next band's top edge below the fold at a 900px viewport**, which hands 07 a
  budget. Five `DESIGN.md` amendments to 09; the rail's sign-in affordance is
  06's.

- [What real data an unauthenticated page may show](issues/04-what-public-data-the-page-may-show.md)
  — Allow-list with **one choke point**: `src/lib/public-landing.ts` is the sole
  thing `/` may query, hand-written `select` only, never `include` (bank details
  and `adminWhatsapp` sit on the `Activity` row). Three standing rules: **no
  aggregate people-count on `/`, ever** (a conditional threshold is
  evidence-shaped silence); **an unauthenticated GET never mutates and never
  sends mail**, which bans the holds sweep and therefore bans *all* capacity data
  — no seats-left, no Open/Full; and **no admin-authored free text**
  (`description`, session `title`, `notes`) since it is written under an
  internal-tool assumption. Published: active Activities (name, icon, colour,
  weekly slot, `defaultLocation`, fees) and the next **3** `SCHEDULED` sessions.
  Withheld: per-session `location`, every `User`/`Payment`/`Membership`/
  `Attendance` field, `maxPlayers`. Fees publish **including zero**, rendered as
  "Free"/"Gratis" via the dictionary; both modes show, monthly primary.

- [Does signing in from the public page make you a member?](issues/05-does-signing-in-grant-membership.md)
  — **No: joining becomes approval-gated.** Signing in makes you an
  **Applicant**; an Admin **admits** you. Order is profile-then-admission, so the
  Admin judges a real name and phone. New nullable `User.admittedAt` carries
  "never admitted" (`isActive` keeps meaning *revoked*); declining is
  `isActive = false`, so the queue `admittedAt IS NULL AND isActive` clears.
  Applicants wait at a dedicated `/pending`, are **emailed on admission**, and
  the Admin gets a queue badge rather than mail per signup. The gate is
  **disclosed before the click** — binding on 06, which kills "Continue with
  Google" as the primary label. Enforced in three layers (middleware, layout
  guard, shared `requireAdmitted()` at the API boundary) because middleware
  alone leaves `/api/*` open. Two premises died on the way: `CONTEXT.md:10` is
  **half-built, not aspirational** (`isActive` ships with an admin control and
  nothing reads it), and the money-backed Seat is **not** gate enough — free
  `Membership` already exposes the Activity's bank details.

- [The render mode and revalidation window for `/`](issues/10-render-mode-for-the-public-read.md)
  — **`/` stays request-time dynamic; the cache moves off the page onto the
  data.** The ticket's premise died: `src/proxy.ts` never touches `/` — the
  signed-in redirect is in the page body, so `/` reads **two** cookies (session
  *and* `NEXT_LOCALE`) and no prerender is reachable without rewriting i18n into
  a route segment. Instead 04's choke point `src/lib/public-landing.ts` wraps its
  selects in `unstable_cache`, tag `public-landing`, **`revalidate: 3600`** —
  zero DB connections on a hit, which was the whole of `PRODUCT.md:72`. Midnight
  rot is fixed by **keying on the WIB calendar day** (an argument, so it rotates
  for free), not by the window; one window for the whole page. Invalidation is
  **in scope** and its set is exactly 04's allow-list — Activity writes, session
  writes (**cancel** is the correctness case), the two Settings routes, and the
  generate-sessions cron; reserve/attendance/payments publish nothing and
  invalidate nothing. **`/` must stop calling `getSettings()`** — it is an
  uncached query, reads cookies internally so it cannot be wrapped, and returns
  the barred `adminWhatsapp`. The cache is **independent of 06**. `'use cache'`
  rejected: gated behind app-wide `cacheComponents`.

- [The action, and what becomes of the sign-in threshold](issues/06-the-cta-and-the-fate-of-the-threshold.md)
  — **The threshold tile dies; the hero's loud pill *is* the form.** Primary reads
  **"Join this community"** with the Google mark, and the gate lives in a
  disclosure sentence beneath — which, because the label defers to it, is bound to
  **`type-body` / `--secondary-foreground`, never caption or fine print**, and is
  wired to the button with `aria-describedby`. A quiet **"Already a member? Sign
  in"** fires the *same* `continueWithGoogle()` inline, no navigation, no Google
  mark — so the **rail gains no sign-in affordance** (03's open boundary, closed).
  `continueWithGoogle()` is neither forked nor parameterized: `redirectTo:
  '/dashboard'` becomes a **"route me home" sentinel** that 05's middleware
  resolves to `/onboarding` / `/pending` / `/dashboard`. Contrast confirmed, not
  deferred: pill `#4FBF8E` on board `#1B2621` and its `#1B2621` label both
  **6.82:1**, and **chalk-on-green (2.29:1) is banned**. Hero inventory closed at
  six elements; fold budget tightened ~60px.

- [Who authors the pitch — the dictionary or the admin?](issues/08-copy-authority-dictionary-versus-settings.md)
  — **The dictionary authors everything; no admin writes marketing copy.** No
  `Settings` key, for both halves of the copy at once — the blank-config version
  must be good enough to ship alone (`PRODUCT.md:88`), an unbounded textarea
  against `type-hero` breaks the hero, and 04 already barred admin free text from
  `/`. Identity comes from **data, not prose**: community name, logo, and 04's
  Activity band — which is therefore **binding on 07**, since cutting it leaves a
  generic poster. One voice, with a marketing clause (plain, second person, no
  superlatives, no size/popularity/history claims) added to `PRODUCT.md`, not
  `DESIGN.md`. `DESIGN.md:309`'s metaphor ban extends to `/` unamended.
  `landing` restructures into **sub-blocks per band** mirroring 07's inventory
  (`accountNote` is deleted, not moved — 06 killed the tile); `/pending` gets a
  top-level `pending` namespace. **Finding: `PRODUCT.md:69` is already false** —
  all seven `src/lib/email/` templates inline `isId ? …` copy, so email is the
  second copy home and 05's admission email follows the siblings. The ≈54-char
  `id` budget is written into `DESIGN.md` beside `type-hero` plus an authoring
  comment; **no test** — `id: typeof en` already types key parity, and untranslated
  strings can't be checked without false positives. **`brand.tagline` is banned
  from `/`** (it puts a placeholder brand in SaaS voice into the public `<title>`),
  which sharpens the metadata fog. Three amendments to 09.

- [What bands the page is made of, and in what order](issues/07-section-inventory-and-order.md)
  — Prototyped three inventories; **B won**. `/` is **two bands and a footer**:
  the painted hero, then **one** enamel board band, then the footer. **No
  separate schedule band** — each Activity is one row carrying its standing
  weekly slot *and* its own next `SCHEDULED` date, which also means **there is
  no Slot Cell on `/`**, dissolving the `DESIGN.md:282` / 04-rule-3 capacity
  conflict rather than ruling on it. The band head is **`type-title`, not
  `type-display`**: the seam is the material change and nothing else, which is
  the answer to "two websites stapled together". **The board band never
  disappears** — an empty community renders a **Blank** strip, never a dropped
  band, because dropping it leaves the generic poster (`assets/07-C-empty.png`).
  Second CTA is a **quiet text line** firing the same action; a painted-board
  bookend is barred by 01 and an accent slab competes with the pill. Page is
  **~1250px**, deliberately the shortest of the three. `landing` becomes exactly
  **three dictionary sub-blocks** (`hero`, `board`, `footer`), and only `board`
  carries an empty string. Four mobile constraints bind the build: the rail
  **must not `flex-wrap`** (105px → 57px), the activity text column needs a
  **`14rem` floor**, and the wordmark needs an **overflow guarantee in both the
  rail and the hero** — without it a one-long-word community name buries the
  theme toggle and walks the hero wordmark off screen, so
  `page.tsx`'s "never breaks mid-word" rule is **superseded** (overlap is the
  worse failure) and the guarantee goes to 09 as a `DESIGN.md` Mark-role rule,
  since every surface rendering the name at `type-mark` inherits it.
  **Found by measuring, handed on: `type-hero` fails twice**
  — the ≈54-char `id` budget runs 5 lines and pushes the next band to 913px,
  past 03's 900px fold; and its `2.5rem` **floor** overflows a 390px band by
  17px. Both went to a new ticket, which now blocks 09.

- [The Applicant's waiting room and the Admin's queue](issues/11-the-applicant-waiting-room-and-the-admin-queue.md)
  — Prototyped three ways each; **B won both**. `/pending` is an **interstitial
  that says one thing and stops** — vertical-centred under the clause
  `DESIGN.md:215` already reserves for interstitials, no data echo, **no
  community data at all** (standing rule: it may query `Settings` and the
  session's own identity, nothing else), so 04's authenticated-but-not-admitted
  boundary question is moot rather than answered. Two affordances only —
  **WhatsApp the organizer** and **sign out** — so an Applicant cannot revise
  their request while waiting; revision is a conversation. Declined is the same
  shape with **Tape → Strike** and no in-app recourse. The queue is **its own
  admin nav item above Members**, accepting an empty surface most days (**Blank**
  mark), with `AdminNavBadges.waitingApplicants` reusing the `pendingPayments`
  badge path; its row is **its own** (name, email, phone as `wa.me`, Activities,
  waited-for, Admit/Decline) because the roster row leads with counts that are
  always `0` and omits `phone`. Both enamel, no exemption. Prototype lives at
  `/prototype/pending` and `/admin/prototype-queue` — **never rendered in a
  browser**, so the `id` pass is still owed.

- [`type-hero` fails twice, and both failures are measured](issues/13-type-hero-fails-on-indonesian-and-on-phones.md)
  — Re-measured in a real browser; 07's numbers reproduce exactly. **All three
  levers give.** The floor drops to **`2.25rem`** — the unique value where the
  phone stops being *stricter* than the desktop (both then allow 12-character
  words; at `2.5rem` the phone allowed only 11, so a word legal at the cap bled
  off a phone, which is the defect 07 hit). The `id` budget becomes **48
  characters**, and **02's ≈54 is exactly the first failing value** (54 → 5 lines
  → 913px). The line cap becomes **4**, forced by 02's own criterion: 3 lines on
  `id` is 36–38 characters, which is what 02 believed *two* lines was and
  rejected as too tight. 02's "wall of type" objection to 4 lines **does not
  survive being rendered** — `text-balance` tapers the slabs into the pill
  (`assets/13-id-4lines-fold.png`), so `text-wrap: balance` joins the role's
  contract. A **second rule** is new: **no word longer than 12 characters**,
  because length drives line count while longest word independently drives
  overflow — `MENYELENGGARAKAN` bleeds **973px through the 768px desktop
  measure**, a failure at the *cap* that 07 never looked for. Both rules get a
  **Vitest** check (08's false-positive argument does not transfer: length needs
  no judgement). **03's fold law is not amended and not restated in lines** —
  pixels are the law, characters are what an author controls, lines are only the
  bridge. **02 decision 4's stated reason is false**: `2.5rem` never sat above
  Display's `3rem` cap; the property that does hold is Hero ≥**1.29×** Display at
  every viewport, and the **ESLint restriction is the only actual enforcement**.
  Seven amendments to 09, three of which **overwrite** 02's and 08's handoffs.

- [What a stranger sees before they arrive — title, description, OG image](issues/12-metadata-and-the-og-image.md)
  — The surface was bigger than `/`. **`src/app/s/[id]` is a second, uncharted
  public route** whose OG card already publishes admin free text, per-session
  `location`, and a `spotsLeft` figure that is **arithmetically wrong** (it counts
  `REGISTERED` rows without the holds sweep, which 04 Rule 3 forbids an
  unauthenticated GET from running) — so 04's standing rules are **promoted to bind
  every unauthenticated route**, card and body alike, and capacity, `title`,
  `notes` and per-session `location` all die there. `<title>` on `/` is the
  **community name alone** (any legal suffix is generic filler that truncates
  first), so the description carries the whole "what is this" load: **its own
  dictionary string**, barred from naming schedule or inventory so it stays true
  when 07's board renders Blank. Root `generateMetadata` **drops `getSettings()`**
  — it was an uncached `findMany` on every request to every route, and with
  `page.tsx:100` made **two** Settings queries per render of `/`, quietly defeating
  10's zero-DB-on-a-hit; the name now comes from a narrow `getPublicCommunityName()`
  inside 04's choke point under the existing `public-landing` tag. OG image is
  **generated**: the wordmark on painted board (01's composition), **forced
  dynamic** or Next bakes the build-time name forever, Archivo 900 committed as
  bytes under a 500KB cap, at the root segment so every route inherits it, `alt`
  through the dictionary because a `.txt` file cannot be bilingual.
  `metadataBase` reuses the existing `NEXT_PUBLIC_APP_URL`. **`/` indexable,
  everything else `noindex`**, enforced twice — the crawler's real exposure is
  `/auth/signin`, a 200 page that `/dashboard` redirects it to. **Found: a crawler
  never sends `NEXT_LOCALE`, so metadata is always `en` for a stranger** and 13's
  48-char `id` budget does not transfer. Five amendments to 09, one of them a
  correction to 10's own handoff.

- [Which documents are amended, and how](issues/09-which-docs-are-amended.md)
  — **Written, not specified: the three docs are amended in place** (`CONTEXT.md`
  4 edits, `PRODUCT.md` 12, `DESIGN.md` 12 covering all 19 handed amendments).
  **No new `PRODUCT.md` section** — the file carries a tooling-read
  `product-schema 1` stamp whose own instruction is *preserve* headings — but it
  gains a fourth sub-block, **Decided, not yet built**, because filing an unbuilt
  gate under Confirmed capabilities is `:94`'s fabrication one layer out while
  Explicitly-undecided is false the other way. `DESIGN.md` is **hybrid** on 08's
  own principle (a rule lives where the author of the governed thing looks): edits
  in place, plus one new **The public band-stack surface** subsection; the
  one-section alternative fails because it leaves `:196` and `:308` standing and
  wrong. Three new Named Rules earn names for having more than one caller — **Pitch
  Budget**, **Never-Bleed**, **Material-Is-Not-Mode**. **No superseded marker**:
  the ticket's own *a spec is not a changelog* applied to itself. Five findings,
  three of them defects nobody had looked for: **`PRODUCT.md:73` is a third stale
  sentence in the same block** — Vitest ships, so 13's test amendment rested on a
  line denying it and **02 decision 5 reasoned *from* the falsehood**;
  **`CONTEXT.md:10` does not become true under 05, it becomes wrongly framed** —
  sign-in is open, and 11's declined interstitial *requires* a declined Applicant
  to be signed in; and **"pill" is not a shape this system has** (`:236` bans it),
  a word carried across four tickets that would have shipped a rounded button.
  Refused into the record: the archaeology, every measurement table, prototype
  history, a sixth Product Principle, and build config posing as law — with the
  rail's no-wrap admitted anyway because it binds every surface, not one band.

## Not yet specified

<!-- empty: every ticket is closed and the two remaining patches were both, in
     their own words, unticketable without redrawing the destination — so they
     moved to Out of scope, where work past the destination belongs. -->

- *(nothing — **destination reached**; all thirteen tickets closed, and the
  `DESIGN.md` / `PRODUCT.md` / `CONTEXT.md` amendments are written)*

## Out of scope

Two entries below were **fog until 09 closed the map** — kept verbatim, refiled
because the frontier stops at the destination and both said in their own text
that they need it redrawn. Each returns as a fresh effort, not a resumption.

- **Applicants inflate every count that reads `Membership`.** 05 put profile and
  Activity-picking *before* admission, so un-admitted Applicants hold live
  `Membership` rows. Which admin surfaces count memberships — activity cards,
  roster totals, and possibly the `minMembers` viability quota — and which of
  them must now exclude `admittedAt IS NULL` is a survey nobody has run. The trap
  is now stated in the language ([09](issues/09-which-docs-are-amended.md) put
  *a count of Memberships is not a count of Members* into `CONTEXT.md`'s
  **Applicant** entry), so the next effort starts from a named fact rather than
  from scratch. Its surface is the authenticated admin app, not the public page.
- **Whether the rest of the app gets a cached `getSettings()`.**
  [10](issues/10-render-mode-for-the-public-read.md) ruled `getSettings()` off
  `/` and split its DB read from its locale-dependent defaulting;
  [12](issues/12-metadata-and-the-og-image.md) then found the root layout's
  `generateMetadata` was the real caller, on every request to every route. Every
  layout in `(main)` and `(admin)` still calls the uncached version once per
  render. Whether they should share the cached read — and under which tag — is a
  whole-app caching question this map only exposed.

- **Selling the software to other communities.** The playbypoint parallel —
  a product marketing site for organizers evaluating the app. Ruled out by the
  human when naming the destination, and by `PRODUCT.md:68`. Would need its own
  brand, its own route, and a PRODUCT.md amendment. A separate effort.
- **A public-facing `Activity` description field.**
  [04](issues/04-what-public-data-the-page-may-show.md) barred all admin-authored
  free text from `/`, since `description` / `notes` are written under an
  internal-tool assumption. The honest fix is a field admins fill *knowing* it is
  public — but that is a schema change plus a new admin surface, past this map's
  destination of settled landing decisions. Noted so it is not re-argued.
- **A capacity or booking surface on `/`.** 04's Rule 3 (an unauthenticated GET
  never mutates and never sends mail) rules out seats-left, Open/Full, and any
  reserve-from-the-landing-page flow, since all of them need the holds sweep.
  Reserving stays behind auth.
- **Enabling `cacheComponents` app-wide.** The supported Next 16 caching API
  (`'use cache'`, `cacheLife`, `cacheTag`) is gated behind a single flag that in
  16.0 also subsumes `ppr` and `dynamicIO`, forcing a Suspense audit of every
  uncached fetch in `(main)` and `(admin)`. That is a platform migration.
  [10](issues/10-render-mode-for-the-public-read.md) took `unstable_cache` and
  the stated one-file migration debt instead.
- **Redesigning the second door, `src/app/auth/signin/page.tsx`.** This was fog
  pending 06, on the theory that moving sign-in off `/` would make it this map's
  problem. [06](issues/06-the-cta-and-the-fate-of-the-threshold.md) did the
  opposite: the join action stays on `/`, and the quiet returning-member link
  fires the shared server action inline rather than navigating. So `/auth/signin`
  survives only as the middleware redirect target (`proxy.ts:28`) and its dated
  teal styling stays a styling matter, past this map's destination. **One thread
  does stay in scope:** its `auth.signInNote` promises access 05 no longer grants,
  and that copy fix belongs to
  [08](issues/08-copy-authority-dictionary-versus-settings.md).

- **Per-page `<title>`s for `(main)` and `(admin)`.**
  [12](issues/12-metadata-and-the-og-image.md) gave the authenticated route groups
  a neutral dictionary-authored default from the root layout, which answers what
  they say once `brand.tagline` loses its reader. Giving `/dashboard`, `/payments`
  and each admin surface its own tab label is a pass across the authenticated app,
  past a destination that is the public page.

- **Any non-Google join path.** `PRODUCT.md:46` — Google OAuth is the only way
  in. Adding email signup or a request-to-join form is a product change, not a
  landing decision.

- **Renaming `.dark` to name the painted-board material.**
  [01](issues/01-brand-layer-under-runtime-white-label.md) called it correct in
  principle and refused it for touching every surface in the app;
  [09](issues/09-which-docs-are-amended.md) wrote the wording instead, so
  `DESIGN.md`'s Material-Is-Not-Mode Rule now makes the overload honest. The
  rename is a whole-app refactor behind a class name, past a destination that is
  the public page.

- **Two tidy-ups this map exposed and deliberately left.** `DESIGN.md`'s
  frontmatter manifest does not declare `text-transform` for **Mark** or
  **Label** although both set it in CSS — `hero` declares its full contract
  because it was added now, and retro-fitting the other two is a doc tidy.
  And `brand.tagline` survives as a **dictionary key with no reader** once
  [12](issues/12-metadata-and-the-og-image.md) drops it from the root layout;
  [08](issues/08-copy-authority-dictionary-versus-settings.md) already ruled
  deleting it an app-wide tidy-up rather than this map's business. Both noted so
  neither is re-argued as a defect.
