# Where a marketing surface centres and a board top-anchors

Type: grilling
Status: open
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

<!-- resolved by the session that takes this ticket -->
