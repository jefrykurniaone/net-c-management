# Map: The landing threshold reads as finished

Label: `wayfinder:map`
Effort: `landing-execution`
Status: **superseded** by [The public page sells this community](../community-landing/map.md)

> This map's destination was *keep the threshold, fix the execution* — explicitly
> no pitch, no sections, no marketing hero. The human has since redrawn the
> scope: `/` now sells the community to public prospects. The five decisions
> below remain valid **evidence** (01's rule survey especially), but 04's
> top-anchoring and 05's DESIGN.md wording are reopened for a marketing surface.
> Do not treat this map's conclusions as binding.

## Destination

The landing page at `src/app/page.tsx` keeps its current structure — one tile
holding a page-owning statement above a single action — and stops reading as
unfinished. Reaching the end of this map means every execution decision below is
settled and written down: which type role carries `landing.purpose`, how that
type is framed given the spacing scale, and where the tile sits vertically. The
deliverable is a set of decisions plus whatever DESIGN.md amendment they imply —
not the diff. The structure itself is **not** in question.

## Notes

- Domain: frontend visual execution against a documented design system.
- Standing steer from the human: *keep the hero, fix the execution.* The page is
  a threshold, not marketing — do not reintroduce a pitch, feature grid, or
  centred marketing hero. Commit `dd95ac5` removed those deliberately, and
  `PRODUCT.md:94` forbids invented social proof outright.
- Authority order: `DESIGN.md` > the token layer (`globals.css`,
  `src/app/styles/*`) > commit bodies. Where DESIGN.md is silent, that silence is
  a decision to be made, not a licence to invent.
- Every session should consult `/impeccable` for visual judgement, and
  `/grilling` + `/domain-modeling` for the decisions themselves. Prototype
  tickets use `/prototype`.
- Strings live in `src/lib/i18n/dictionaries.ts` and must change in **both**
  `en` and `id`. Never hardcode user-facing copy.
- Two deliberate token deviations already exist for contrast reasons, documented
  in `src/app/styles/board-materials.css:9-14, 96-102, 147-150`. Do not
  "correct" them back to the DESIGN.md values.

## Decisions so far

- [Design rules governing the threshold](issues/01-design-rules-for-the-threshold.md) —
  `bay` (28px) is the largest spacing token and nothing above it exists;
  DESIGN.md states **no** type-size-to-padding rule; `type-display` is for
  "page-owning statements" capped at 3rem with no stated line limit; vertical
  placement is entirely unaddressed; an internal **neutral** shared rule
  dividing one tile is sanctioned, a coloured one is forbidden.
- [Which role carries the purpose sentence](issues/02-display-role-vs-the-purpose-sentence.md) —
  **split the roles.** "Board" was the design system's *internal* metaphor leaking
  into user copy, so it is dropped from all user-facing strings (one string, two
  locales — not systemic). `type-display` takes a new short statement
  (`Sessions, seats and dues.` / `Sesi, kursi, dan iuran.`) capped at **two
  lines by copy length, not by overriding `line-height`**; `type-body` takes the
  explaining sentence by reading `auth.signInSubtitle` directly rather than
  duplicating it. Body sits **above** the shared rule. The 17px gap between
  `type-display` and `type-title` is accepted as a fact, not filled with a new
  role. Scope fork put to the human and settled: **keep the threshold, fix the
  execution** — no pitch, no sections, no fabricated proof.

- [Framing display type when the scale stops at 28px](issues/03-framing-display-type-within-the-spacing-scale.md) —
  **`p-bay` (28px), uniform, both halves, `gap-block` (16px) between statement
  and body.** No new token, no exception, no DESIGN.md amendment forced. Chosen
  by the human from a four-variant prototype: 16px is visibly tight against 48px
  type, 40px does not buy enough to pay for a fifth token, and the asymmetric
  reading of `DESIGN.md:213` misfires on a heading that opens its container.
  Padding turned out to *cause* the two-line cut 02 wanted. **Mobile needs no
  step-down** — the type clamp does the collapsing. Tile lands ~320px tall,
  which disproves 04's "a taller tile may make centring read fine".

- [Where the tile sits vertically](issues/04-vertical-placement-of-the-threshold-tile.md) —
  **top-anchor inside the board's own 72rem gutter; footer stays pinned.**
  `main` becomes `mx-auto w-full max-w-[72rem] flex-1 items-start justify-start
  px-block py-bay` — two class changes, no token, no DESIGN.md amendment forced.
  The premise question was a false dichotomy: `dd95ac5` neither overstated nor
  overlooked — the hero it killed was `text-center py-20`, and it *wrote* the
  viewport centring itself, unmentioned. So there was no intent to defer to.
  Decided by two facts: the signed-in app top-anchors everywhere
  (`(main)/layout.tsx:33-34`), and the tile's left edge sat **240px** right of
  the identity logo at 1440px because `main` centred 40rem in the full width
  while rail and footer used a 72rem gutter — half the human's "alignment weird"
  was horizontal, not vertical. Air above stays `py-bay` (28px), matching the
  tile's own padding. Footer confirmed not defective, only stranded; **the map's
  parked rail/footer fog is absorbed**. 04 hands 05 a drafted vertical-placement
  rule rather than amending DESIGN.md itself.

- [Whether DESIGN.md gains a type-to-space rule](issues/05-whether-design-md-gains-a-type-space-rule.md) —
  **amend, four small edits, none of them a type-to-space rule.** Silence 1 stays
  silent on purpose: type size is not paired with padding, because 02–05 added no
  token and took no exception, so there is no gap to legislate. Silence 3 is ruled
  — 04's draft accepted verbatim, reservation clause kept because it sanctions
  `onboarding`/`auth/error`/`auth/dev` instead of indicting them. Both cheap
  disambiguations made: `213` says a heading opening its container already has its
  space from the container's padding; `215` says `72rem` is a **shared gutter, not
  only a cap** — the wording whose misreading caused the 240px misalignment. The
  two-line display cap is appended to `197` because copy length and container
  padding are one fact, not two. A **Don't** line now forbids the internal metaphor
  (board, tile, rail, lattice) in user copy, mirroring the Do at `297`. The 17px
  cliff is recorded here, not in DESIGN.md — a spec is not a changelog; a second
  surface needing that size is the trigger to revisit.

## Not yet specified

<!-- empty: the last fog patch (the rail/footer question) was absorbed by 04 -->

- *(nothing — destination reached; all five tickets closed)*

## Out of scope

- **The second door at `src/app/auth/signin/page.tsx`.** It carries the older
  ad-hoc teal styling rather than the board system, so the two entrances look
  unrelated — and unlike this page it is still the middleware redirect target
  (`TESTING.md:88`) even though the landing no longer links to it. It is
  explicitly *not* deprecated: `44523b9` kept it and extracted
  `continueWithGoogle()` so "both doors in are the same code". Restyling a
  different route is past this map's destination and needs its own effort.
- **Documenting the landing page's purpose in PRODUCT.md.** Neither PRODUCT.md
  nor CONTEXT.md mentions the landing page; the rationale survives only in the
  `dd95ac5` commit body. Worth fixing, but it is a product-doc gap, not an
  execution decision about how the page looks.
