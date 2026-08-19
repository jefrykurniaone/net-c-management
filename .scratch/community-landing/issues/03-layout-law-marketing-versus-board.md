# Where a marketing surface centres and a board top-anchors

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocks: 07, 09

## Question

`DESIGN.md:215` reads: board surfaces top-anchor their content below the
identity rail; vertical centring is reserved for interstitials that own the
whole viewport; containers max at `72rem` / `40rem`; that `72rem` is a shared
gutter. The superseded map's ticket 04 top-anchored `/` inside that gutter and
had its rule written into DESIGN.md. The reference is a **centred hero on a
full-bleed page**, and the human wants it.

What is the layout law once `/` is a marketing surface?

Sub-questions:

- Is a public marketing page a third category alongside "board surface" and
  "interstitial", or is it an interstitial that owns the viewport — in which
  case `215` already permits the centring and no amendment is needed?
- Does `72rem` still cap the hero, or does a marketing band go full-bleed with
  only its content constrained? The gutter's whole point was that rail, tile,
  and footer share one left edge — a centred hero abandons that alignment on
  purpose. Confirm that is intended, not the 240px misalignment bug returning.
- What happens to the identity rail? The reference has a full nav
  (Product / Solutions / Pricing / Login). This page has a rail with a theme
  toggle and a language switcher. Does the rail stay as-is, gain nav, or go?
- Density: `DESIGN.md:215` says "density is deliberately high: this is a board,
  and a board is full." A hero is the opposite — mostly air. Which wins where,
  and where is the seam between them on a single page?

## Answer

**`/` becomes a *public band-stack surface* — a third layout category alongside
board surface and interstitial. Its hero centres horizontally and top-anchors
vertically, so `DESIGN.md:215`'s vertical-centring sentence is never violated.**

### Premise correction

The ticket assumed the reference is a centred hero colliding with `215`. It is
not. In `playbypoint-hero.png` the hero is **horizontally** centred and
**top-anchored** with a long lead — the client-logo band is already visible at
~640px. Nothing is vertically centred. `215` reserves *vertical* centring for
interstitials, so the collision is far smaller than the ticket assumed and the
`DESIGN.md` change is an **addition, not a correction**.

### Decisions

1. **A third category, named: the public band-stack surface.** A vertical stack
   of full-bleed bands; each band's content is horizontally centred *or*
   gutter-aligned according to that band's job. Rejected "the hero is an
   interstitial that owns the viewport": an interstitial owns the whole viewport
   with nothing below it, and this map's destination explicitly demands substance
   below the fold — stretching the word would silently license vertical centring
   on any scrolling page in the system. Rejected also "board surface with a hero
   exception": an unnamed exception gets copied by the next surface that wants
   air.

2. **The band is full-bleed; hero content gets a third container width, `48rem`,
   centred.** A painted-board band capped at `72rem` floating in enamel is
   precisely the floating panel `DESIGN.md:213` forbids, so the band itself
   cannot be capped. `72rem` is rejected for the hero *content*: Display at its
   `3rem` cap is authored to break at two lines (`:197`), and prose is capped at
   65–75ch (`:199`) — `72rem` is ~110ch. **The shared left edge is abandoned in
   the hero band only, deliberately**, and the `72rem` gutter resumes for every
   band below the seam. This is not the 240px misalignment bug returning: that
   bug was a `40rem` tile *accidentally* centred in the full viewport while the
   rail stayed gutter-aligned. Here the centring is the band's own composition
   and the rail sits across a material seam from it.

3. **The identity rail stays themed enamel, above the seam. No nav.** Rejected
   putting the rail inside the fixed painted-board band — the reference does
   share ground between rail and hero, but it contradicts ticket 01 decision 3's
   own reasoning, which refused route-wide dark because it "hides a working
   control": a theme toggle sitting on permanently painted board has no visible
   effect on the surface it sits on. No nav because there are no other public
   routes to link to; anchor links to a section one scroll away are furniture
   pretending to be navigation. The rail keeps its `72rem` inner gutter, so the
   wordmark still shares a left edge with every band below the seam.
   **Boundary:** whether a sign-in affordance joins the rail's right cluster is
   **ticket 06's** call, not this ticket's.

4. **Density is positional, not per-section.** The seam is *not* "hero is airy,
   sections are dense" — it is "between bands is air, inside cells is board".
   `2 / 10 / 16 / 28` continues to govern the inside of cells everywhere on the
   page, including the bands below the seam. The marketing surface adds one step
   *above* `bay`, for air *between* full-bleed bands, continuing the scale's own
   doubling rather than inventing numbers: `28 → 56 → 112`. Hero band `112px`
   vertical, section bands `56px`. This keeps ticket 01 decision 4's promise —
   the proof bands are genuinely dense ruled cells inside a generously padded
   band, so they look like the real product.

5. **A rule at the band's top edge only.** The rail's bottom rule *is* the
   band's top edge — one rule, not two. The bottom edge, where board returns to
   enamel, carries **no** rule: that is a material change in both themes, which
   is a harder boundary than any hairline, and `DESIGN.md:186` holds that a rule
   which disappears is not a rule. The top edge keeps its rule despite being
   redundant in light mode, because in dark mode rail and band are both painted
   board and the rail would dissolve into the hero without it — a rule that
   appears and vanishes by theme is worse than one that is sometimes redundant.

6. **The band step collapses one step at `768px`:** hero `112 → 56`, section
   bands `56 → 28`. That lands back exactly on `bay`, so mobile inherits board
   density and no new numbers enter the scale. Separately, **the hero band is
   exempt from `DESIGN.md:219`** (collapse by axis, not by flattening): that rule
   governs the board lattice, and the hero is a centred single column with no
   axes to collapse. Stated explicitly because `219` otherwise reads as
   universal and invites someone to give the hero a day rail.

7. **No `min-height` on the hero, and no `100dvh`.** Its height is content plus
   band padding, nothing more. The "substance below the fold" requirement is
   inverted into a law the layout owns instead: **no band may be sized such that
   the next band's top edge falls below the fold at a 900px viewport.** That
   makes the requirement testable rather than aspirational, and hands ticket 07 a
   real budget when it picks the section inventory — the hero already spends
   ~400px of it.

### Amendments handed to ticket 09

1. `DESIGN.md` Layout — add the **public band-stack surface** category:
   full-bleed bands, hero content centred at `48rem` and top-anchored. Note
   explicitly that the vertical-centring sentence is unchanged.
2. `DESIGN.md:215` — the shared-gutter sentence ("every board surface aligns to
   the same one, rail and footer included") gains its one exception: the hero
   band's content is centred, not gutter-aligned.
3. `DESIGN.md:213` — the spacing rhythm extends to
   `2 / 10 / 16 / 28 / 56 / 112`. The two new steps are band air only and never
   appear inside a cell.
4. `DESIGN.md:219` — scope the collapse-by-axis rule to the board lattice; the
   hero band is exempt.
5. `DESIGN.md` — record the fold budget of decision 7.

### Reconciliation with ticket 02 (resolved concurrently)

Ticket 02 fixes the pitch on a **`48rem` text measure** — the same number this
ticket reaches independently, which is a good sign. But 02 words it as "inside
the `72rem` gutter", i.e. gutter-**aligned**. Layout law is this ticket's, and
decision 2 **centres** that measure in a full-bleed band. Same width, different
anchor: **the `48rem` measure is centred, not left-aligned to the gutter.** 02's
substantive call — that the measure and never a `<br>` delivers the break — is
untouched. Ticket 09 must write the centred reading, not 02's phrasing.

Consequence for decision 7's budget: 02's `type-hero` at the `5rem` cap over 3
lines is ~228px of pitch alone. With the wordmark, a body line, the CTA, and
`112px` band air top and bottom, the hero band lands nearer **560–600px** than
the ~400px estimated above. Still inside the 900px fold budget, but the margin
is thin — ticket 07 should treat the hero as spending two thirds of the fold.

### Handed on

- **Ticket 07** inherits the fold budget (decision 7) and the `112 / 56` band
  air as fixed inputs to the section inventory.
- **Ticket 06** owns the rail's sign-in affordance; this ticket fixed only that
  the rail exists, stays enamel, and carries no nav.
