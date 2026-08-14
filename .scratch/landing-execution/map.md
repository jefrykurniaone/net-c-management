# Map: The landing threshold reads as finished

Label: `wayfinder:map`
Effort: `landing-execution`

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

## Not yet specified

- Whether `landing.purpose` should be re-cut as copy at all, and if so what the
  shorter statement says. Hangs on
  [Which role carries the purpose sentence](issues/02-display-role-vs-the-purpose-sentence.md):
  until the role is chosen, the target length is unknown. Both locales move
  together.
- Whether the `IdentityRail` and `footer` need any adjustment. They looked
  acceptable in review and no defect has been named, so there is nothing sharp
  to ask yet. Revisit only if a decision upstream changes the page's balance.
- Whether anything about the tile needs to differ on mobile. `DESIGN.md:219`
  describes mobile collapse by axis but the threshold has no axis to collapse;
  the `clamp()` on `type-display` may already handle it. Cannot be phrased
  sharply until the type decision lands.

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
