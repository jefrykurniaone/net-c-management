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

## Not yet specified

- **SEO, metadata, and OG image.** A public page is now indexable; today the
  route has no metadata story and no OG asset. Can't be ticketed until the
  brand layer (01) and section inventory (07) settle what there is to describe.
- **The second door, `src/app/auth/signin/page.tsx`.** Previously ruled out of
  scope as a styling matter. If 06 moves sign-in off `/`, it stops being a
  styling question and becomes this map's problem. Revisit after 06.

## Out of scope

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
- **Any non-Google join path.** `PRODUCT.md:46` — Google OAuth is the only way
  in. Adding email signup or a request-to-join form is a product change, not a
  landing decision.
