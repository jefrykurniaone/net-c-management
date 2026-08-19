# Framing display type when the scale stops at 28px

Type: prototype
Status: resolved
Assignee: jefrykurniaone
Blocked by: 02
Parent: ../map.md

## Question

Ticket 01 established the gap: the spacing scale is `2 / 10 / 16 / 28` with
**`bay` (28px) the largest step and nothing above it**, while `type-display`
reaches **48px**. No documented rule connects type size to padding. The tile
currently frames its statement with `p-block` — **16px** — and the whole tile is
`max-w-[40rem]`.

Once ticket 02 has fixed which role carries the statement, decide how it is
framed. This is a prototype ticket because the answer is a judgement about
proportion that nobody can make reliably from numbers on a page — build it and
look at it.

Prototype the tile across the candidates and react:

- `p-block` (16px) as today, at whatever type size 02 landed on.
- `p-bay` (28px) — the largest existing step, requiring no system change.
- Something above 28px, which means **either a new spacing token or a documented
  one-off exception** — and therefore feeds ticket 05.
- Asymmetric framing, per the one directional rule that does exist:
  `DESIGN.md:213` "More space above a heading than below it."

Constraints to hold while prototyping: the tile stays `40rem`
(`DESIGN.md:215` — sign-in is a sanctioned single-task column); the internal
divider stays a neutral `border-rule` (01, finding 5); the tile takes **no**
shadow at rest and the action keeps its own (01, finding 6); density is
deliberately high — `DESIGN.md:215` "this is a board, and a board is full", so
generous padding must be argued for, not assumed.

Resolve with the chosen padding values and, if the answer exceeds 28px, an
explicit statement of whether that is a new token or an exception.

## Inputs settled by ticket 02

Prototype against **this** tile, not the current one:

- Above the rule, **two** text blocks, not one: `type-display` carrying
  `Sessions, seats and dues.` (`Sesi, kursi, dan iuran.`), then `type-body`
  carrying `auth.signInSubtitle`. The internal spacing *between* those two blocks
  is now part of this ticket's question, alongside the tile's outer padding.
- The statement is **two lines maximum at the 48px cap** and roughly 25
  characters — far shorter than the four-line block that made the page look
  unfinished. The tile is therefore *shorter* than it is today, which sharpens
  ticket 04: less tile in more void.
- `line-height` stays `1.02`. Do not prototype a loosened display line-height —
  02 rejected local role overrides.

Also fold in the mobile question the map had parked (it could not be phrased
until the type size landed, and now it can): **prototype at the 1.75rem lower
clamp bound as well as the 48px cap.** `DESIGN.md:219` describes mobile collapse
by axis and the threshold has no axis to collapse, so the open question is only
whether the chosen padding still reads at narrow widths, or whether the framing
needs to step down with the type.

## Answer

**`p-bay` — 28px, uniform, on both halves of the tile, with `gap-block` (16px)
between the statement and the body sentence.** No new spacing token, no
documented exception, no DESIGN.md amendment required by this ticket.

Chosen by the human from a four-variant prototype (A 16px / B 28px / C 40px /
D asymmetric 28-16), rendered inside the real identity rail and footer at 1440px
and 390px.

### What the prototype showed that numbers did not

- **Padding decides the line break.** At `p-block` (16px) the tile gives the
  statement 608px of content and `Sessions, seats and dues.` sets on **one
  line** at the 48px cap. At `p-bay` it gives 552px and the statement **cuts to
  two lines**. So the padding choice is not only framing — it is what delivers
  02's finding that big type works by being *cut* into lines rather than set as
  a sentence. B produces that break for free.
- **16px is visibly tight against 48px type.** The statement sits a hair off a
  1px rule; the tile reads as a strip rather than a plate. This is the
  proportion defect the ticket suspected, confirmed by eye.
- **40px does not buy enough to pay for a token.** C and B differ by 12px and
  the same two-line break. Against `DESIGN.md:215` "this is a board, and a
  board is full", generous padding has to be argued for; 12px of extra void on
  an already-short tile is not an argument. **No fifth spacing token, and no
  one-off exception in the token layer.**
- **The asymmetric reading of `DESIGN.md:213` misfires here.** "More space
  above a heading than below it" governs a heading *within* flowing content.
  The statement is the first thing in the tile, so its "above" is the tile's
  own top padding — the rule is already satisfied by uniform padding. D's
  10px gap under the statement pulled the body up into the display block, and
  inverting the action half's padding (16 top / 28 bottom) read as an accident
  rather than a rule.

### Resolved values

- Statement half: `p-bay` (28px), `flex flex-col gap-block` (16px) between
  `type-display` and `type-body`.
- Action half: `p-bay` (28px), internal `gap-cell` (10px) unchanged between the
  button and `accountNote`.
- Tile stays `max-w-[40rem]`, `border border-rule`, no shadow at rest, action
  keeps its own — all held as constraints, none disturbed.

### Mobile

**No step-down.** Captured at 390px: `type-display` sits at its `1.75rem` lower
clamp bound, the statement still cuts to two lines, and 28px inside the tile on
top of the page's own 16px gutter reads correctly rather than crowded. The
parked mobile question is therefore answered *no separate framing is needed* —
the clamp on the type does all the collapsing this surface requires, consistent
with `DESIGN.md:219` collapsing by axis where an axis exists.

### Consequence for the map

- **Ticket 05 loses one of its three silences.** Silence 1 ("no rule pairs type
  size with padding") now has a concrete data point rather than an open gap: the
  existing top of the scale was sufficient, and the framing answer was found by
  looking rather than by rule. 05 still decides whether that becomes documented
  guidance — but it decides it knowing **no token was added and no exception was
  taken**.
- **Ticket 04 gets its tile height.** The tile is roughly 320px tall at 1440px
  wide — taller than variant A, still short. In a 900px-tall window centred by
  `items-center`, that leaves ~250px of empty `bg-background` above and below.
  The hypothesis 04 recorded — "a taller, better-framed tile may make centring
  read fine" — is **disproved**: better framing did not close the void.

### Prototype

Captured on branch `prototype/threshold-framing-03` — four variants plus the
switcher under `src/app/prototype/threshold/`, and the 1440px and 390px
screenshots. Not on `main`.
