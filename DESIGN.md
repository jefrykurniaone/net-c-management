---
name: Rally
description: A sports-community app in the register of a contemporary club platform — deep green and lime, bright green actions, warm off-white grounds, rounded cards on soft shadows, condensed heavy uppercase headlines.
colors:
  black-green: "#0E1F17"
  lime: "#D8F25E"
  pbp-green: "#3ED27E"
  white: "#FFFFFF"
  shell-cream: "#FBF8F1"
  shell-beige: "#F0E9DB"
  shell-taupe: "#8B7E68"
  purple: "#6C4CF0"
  purple-ink: "#4B31B8"
  purple-lit: "#B7A4F7"
  orange: "#E8701A"
  orange-ink: "#8A4708"
  orange-lit: "#F2A24A"
  dark-red: "#9E2B25"
  dark-red-lit: "#F08078"
  green-ink: "#136B3F"
  off-white: "#F1EEE5"
  ground-lift: "#182C22"
  olive-deep: "#27381C"
  ink-supporting: "#3F5147"
  ink-muted: "#4A5C52"
  ink-quiet: "#55675D"
  ink-supporting-lit: "#B3C1B6"
  ink-quiet-lit: "#9EAEA2"
  rule-lit: "#7B8C80"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.6vw, 3.5rem)"
    fontStretch: "66%"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.01em"
    textTransform: "uppercase"
    textWrap: "balance"
  statement:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.6vw, 1.875rem)"
    fontStretch: "normal"
    fontWeight: 600
    lineHeight: 1.28
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  caption:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.1em"
    textTransform: "uppercase"
  figure:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: "tnum"
  figure-lead:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  control: "8px"
  surface: "12px"
  pill: "9999px"
shadow:
  lift: "0 1px 2px -1px {tint-weak}, 0 6px 16px -6px {tint}"
  lift-hover: "0 2px 4px -1px {tint-weak}, 0 12px 26px -8px {tint-strong}"
  pressed: "none"
spacing:
  hair: "2px"
  cell: "10px"
  block: "16px"
  bay: "28px"
  band: "56px"
  band-lead: "112px"
components:
  action-primary:
    backgroundColor: "{colors.pbp-green}"
    textColor: "{colors.black-green}"
    rounded: "{rounded.control}"
    shadow: "{shadow.lift}"
    typography: "{typography.label}"
  action-secondary:
    backgroundColor: "{colors.black-green}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.black-green}"
    rounded: "{rounded.surface}"
    shadow: "{shadow.lift}"
    padding: "{spacing.block}"
---

<!-- First draft for the Rally system (#148). Chips (#149), primitives (#150)
     and patterns (#151) fill in the sections marked as theirs; #152 finalises
     this document against what actually shipped. -->

# Design System: Rally

## Overview

**Creative North Star: "The club, not the noticeboard"**

This is the software a serious club would put its name on. Not a utility that
happens to track attendance, and not a hall notice board rebuilt in pixels —
a product that looks like it belongs to the sport, and that a member is willing
to hand their money to. The register is a contemporary club platform: a
near-black green and a pale lime as the brand pair, one bright green that means
*act*, warm off-white grounds, cards that lift off those grounds on soft
shadows, and headlines set in condensed heavy uppercase.

The system's own name is **Rally**. It names the design, not the product, and
it never appears in anything a member reads.

Three decisions carry the rest.

**Meaning travels in words; colour reinforces it.** Every state this product
shows — paid, pending, rejected, registered, present, opted out, no-show,
cancelled, full — is a chip with a written label. Colour makes a queue of forty
rows scannable before the labels are read, and it is never the only channel, so
WCAG 1.4.1 is satisfied by the label rather than by a shape a reader has to
learn.

**Two grounds, one action.** The light theme is off-white grounds carrying
Black Green ink; the dark theme is a real Black Green ground carrying off-white
ink, with card faces stepping *up* from it. What does not change between them
is the action: PBP Green with Black Green on it, in both. A member should not
have to re-find the button when the light changes.

**Every pair is computed, not eyeballed.** The palette was sampled for its
register and then adjusted by measurement until every text pair cleared 4.5:1
and every rule, ring and edge cleared 3:1, in both themes. The numbers live in
`src/lib/theme-contrast.ts` as data, and `src/lib/__tests__/design-tokens.test.ts`
reads them back out of the stylesheet, so a nudged token fails on a number.

**Key characteristics:**

- Warm off-white grounds; white cards that lift on a soft offset shadow
- Two radii and a pill: 8px controls, 12px surfaces, `rounded-full` chips and avatars
- One bright green that means *act*, in both themes
- Lime as the highlight surface; purple as the "go somewhere" colour
- One variable family carrying a condensed display face and a neutral text face
- Status is a labelled chip, never a shape and never a hue alone
- Tabular figures on every time, count, capacity and amount

## Colours

### Roles

| Role | Value | What it is for |
|---|---|---|
| **Black Green** | `#0E1F17` | The dark theme's ground; primary ink on light grounds; the ink on Lime and on PBP Green |
| **Lime** | `#D8F25E` | The highlight surface — active navigation, a selected option, a focused menu row. Ink on the dark theme's olive accent |
| **PBP Green** | `#3ED27E` | The primary action's ground, in both themes. Carries Black Green and nothing else |
| **White** | `#FFFFFF` | Card and popover faces in the light theme |
| **Shells — cream** | `#FBF8F1` | The lightest warm neutral; raised surfaces |
| **Shells — beige** | `#F0E9DB` | The light theme's page ground, and its muted and secondary fills |
| **Shells — taupe** | `#8B7E68` | Rules, dividers and input edges in the light theme |
| **Purple** | `#6C4CF0` | The reference value. Charts and decoration; fills that carry white at heading sizes |
| **Purple ink** | `#4B31B8` | Purple darkened for running text: links, focus ring, selected state, on light grounds |
| **Purple lit** | `#B7A4F7` | The same role on the dark ground |
| **Orange** | `#E8701A` | The reference value. Charts and decoration |
| **Orange ink** | `#8A4708` / `#F2A24A` | Provisional — pending payment, a seat held on unverified money. Ink step per theme |
| **Dark Red** | `#9E2B25` / `#F08078` | Void or failed — rejected payment, cancelled session, no-show. Ink step per theme |

Purple and orange each carry two values on purpose. The reference values are
what the brand looks like; the ink values are what survives being read at 15px
on an off-white ground. A role that is both a fill and a piece of running text
needs two numbers, and pretending otherwise is how a palette ships a link
nobody can read.

### The banned pairing

**White or off-white on PBP Green.** It measures 1.96:1 and 1.69:1. The action
carries Black Green at 8.74:1 and the token layer cannot produce the other
direction — `--primary-solid-foreground` is Black Green in both themes, and
`design-tokens.test.ts` asserts that the label is the darker of the two. There
is no size at which a light label on this green becomes acceptable.

### Measured pairs

Every pair the shipped surfaces can produce, both themes, with the ratio it
has to clear. The full table is generated from the committed tokens by
`src/lib/theme-contrast.ts`; the worst case in each family is below.

| Pair | Light | Dark | Floor |
|---|---|---|---|
| body ink on the page ground | 14.17 | 14.75 | 4.5 |
| body ink on a card | 17.11 | 12.73 | 4.5 |
| supporting ink on the ground | 7.01 | 9.14 | 4.5 |
| muted ink on a muted fill | 5.90 | 7.03 | 4.5 |
| quiet ink on the ground | 4.99 | 7.36 | 4.5 |
| link on a card | 8.64 | 6.80 | 4.5 |
| link on an accent hover | 6.90 | 5.79 | 4.5 |
| active navigation label on its fill | 13.68 | 10.06 | 4.5 |
| **the primary action's label** | **8.74** | **8.74** | 4.5 |
| settled ink on the ground | 5.43 | 8.74 | 4.5 |
| provisional chip | 6.00 | 6.73 | 4.5 |
| void chip | 6.04 | 5.88 | 4.5 |
| the value beside a void chip | 5.80 | 8.19 | 4.5 |
| **rule on an accent fill** (worst rule case) | **3.18** | **3.54** | 3 |
| rule and input edge on a card | 3.98 | 4.15 | 3 |
| focus ring on the ground | 7.15 | 7.88 | 3 |

Three pairs are measured and published but deliberately not asserted, because
none of them is a WCAG pairing:

| Pair | Light | Dark | Why it is not a floor |
|---|---|---|---|
| card face on the page ground | 1.21 | 1.16 | A tonal step. The card is identified by `--border` at 3.98:1 and by `--shadow-lift` |
| action fill on a card | 1.96 | 7.54 | The control is identified by its 8.74:1 label and its shadow. Darkening PBP Green until the *fill* cleared 3:1 on white lands back on the court green this system retired |
| accent fill on the ground | 1.04 | 1.36 | A hue step, not a lightness one. A caller that needs the state identifiable without colour draws the 3.18:1 rule on it, or sets the weight — which is what the navigation does |

### Named rules

**The Label Rule.** No state is ever communicated by colour alone. Every chip
carries a written label, in both locales, and the test suite asserts it rather
than trusting convention. This is what makes it legitimate to have dropped the
six mark forms.

**The Two-Value Rule.** A colour that is both a fill and running text carries
two values — the reference value and a measured ink step — and the token layer
names both. `--primary` is the ink, `--primary-solid` is the fill; the same
split runs through warning and destructive. A call site never picks between
them: the token it reaches for already is the right one.

**The Measured-Pair Rule.** A pair enters the palette by measurement, not by
eye, and every pair the product can render is in `AA_PAIRS` with its floor.
Text clears 4.5:1, a rule or a ring or a state edge clears 3:1, in both themes.
A pair that cannot clear its floor is not tuned until it looks fine — it is
either re-coloured or banned, and the ban is written down.

**The One Action Rule.** PBP Green means *do this*, and nothing else is that
green. It does not become a success state, a chart series or a brand surface,
because a member who has learned where the button is should not have to unlearn
it on the next page. Settled-and-confirmed is a green too, but it is the ink
step (`#136B3F` / `#3ED27E`) inside a chip with a label on it, never a bare
green fill competing with an action.

**The Theme-Is-Not-An-Inversion Rule.** The dark theme is a Black Green ground
with card faces one step *lighter*, washes darkened and their inks lifted —
computed as its own set of pairs, not derived by inverting the light theme.
`.dark` is also the class the public hero band forces regardless of the
visitor's theme, so every dark value has to hold inside a light-themed page as
well: a logged-out stranger has never set a preference, and a page whose force
depends on a coin flip has no force.

## Typography

**One family: Archivo** (fallback `system-ui, sans-serif`), loaded as a
variable font on both of its axes — weight 100–900 and **width 62–125**. The
width axis is the whole reason there is no second family: a condensed heavy
display face and a neutral grotesque come out of one download.

Width is set with `font-stretch` *and* `font-variation-settings` on the one
role that condenses, both to the same 66. `font-stretch` is the property that
belongs in a stylesheet; the variation setting is the belt to its braces,
because `font-stretch` only reaches the axis if the `@font-face` Google returns
carries a range descriptor, and nothing in this repository can assert that it
does. Both properties inherit, so every other role resets both.

### Hierarchy

- **Display** (900, condensed to `wdth` 66, `clamp(2rem, 4.6vw, 3.5rem)`, 0.94,
  `-0.01em`, uppercase, `text-wrap: balance`): the hero pitch, page titles
  inside the app, section heads on the public page. **One role, system-wide.**
  Condensed uppercase is what carries a headline here, which is why the role
  does not need the 5rem the retired Hero role took to land with the same
  weight, and why there is no longer a lint rule keeping it off the app.
  `0.94` is legal to crowd only because the role is caps — no descenders, so
  lines that would collide in sentence case sit clean. That is not licence to
  tighten sentence-case display type.
- **Statement** (600, regular width, `clamp(1.25rem, 2.6vw, 1.875rem)`, 1.28):
  the large line that is not a headline. Display shouts a name; Statement says
  a sentence, so it keeps its lower case, its descenders and room to breathe.
- **Title** (700, `1.0625rem`, 1.3): card and section headings.
- **Body** (400, `0.9375rem`, 1.55): prose, at a 65–75ch measure.
- **Caption** (400, `0.8125rem`, 1.45): the dense supporting line inside a card
  — time and venue, a note under an action.
- **Label** (700, `0.6875rem`, `0.1em`, uppercase): column heads and chip text.
- **Figure** (600, `1.0625rem`, `tabular-nums`): every time, count, capacity
  and amount.
- **Figure Lead** (800, `1.375rem`, `tabular-nums`): the one figure that
  outranks its own heading.

### Named rules

**The One Family Rule.** One family across the whole system. No serif, no
second sans and no monospace — figures take `tabular-nums` from the one family,
and the display face is the same family at a narrower width. A second download
is a second voice, and this product does not have two things to say.

**The Figures-Never-Condense Rule.** Figure and Figure Lead reset the width
axis explicitly, because condensed numerals break tabular alignment and the
tables are most of this product. Half an amount read as a different number is
the failure this rule exists to prevent.

**The Pitch Budget Rule.** The public pitch is authored to two independent
limits, because two different things break and neither predicts the other:
**≤ 48 characters, measured on the Indonesian string**, and **no word longer
than 12 characters, in either locale**. Total length drives line count and
therefore the fold; longest word drives horizontal overflow at both ends of the
clamp. Both are asserted in `src/lib/__tests__/pitch-budget.test.ts` against
both locales. Condensing the role only made the budget more conservative, so it
carries over unchanged. It does **not** extend to page metadata: a crawler
sends no locale cookie, so a title is always read in English and is sized
against a search result.

**The Never-Bleed Rule.** The community name is runtime configuration of
unknown length, so any surface rendering it carries a shrinkable box and
word-breaking. The order of preference is fixed: **hold the budget → wrap at
spaces → break mid-word → never bleed, and never paint over a control.** A
mid-word break in a heavy slab is a visible defect, which is the point — the
guarantee exists to make a violation degrade instead of breaking the page. An
unreachable control is a functional failure where a broken word is a cosmetic
one, and a glyph is not clipped by the box that owns it, so measuring element
boxes will report no collision while one is on screen.

## Shape and depth

**Two radii and a pill.** `8px` on controls — buttons, inputs, selects,
checkboxes. `12px` on surfaces — cards, dialogs, sheets. `rounded-full` on
chips and avatars. Every Tailwind radius alias resolves to one of the two, so a
call site cannot invent a third: a third step is a change to the ladder in
`src/app/globals.css`, not a class name somebody picks.

**Depth is a card lifted off the ground**, on a soft, low, offset shadow in two
layers — a tight contact and a wide diffusion. There are two shadow tokens and
a `none`:

- **`shadow-lift`** — a card at rest.
- **`shadow-lift-hover`** — the same card under a pointer, lifted slightly.
- **pressed** takes `shadow-none`. There is no third token, because a control
  that is being pressed is not lifted.

The tints are per-theme. In the light theme the shadow is the ink colour at low
alpha, so it warms rather than greys; on Black Green it is neutral and deeper,
because a tinted shadow disappears on a dark ground.

**Borders are for controls and dividers, not for cards.** A card is bounded by
its shadow and its own face. Where a border is drawn — an input, a divider
inside a card, a selected option — it is `--border`, and it clears 3:1 against
every surface it can land on, including Lime. One value serves all of them
deliberately: a hairline that disappears against one of the washes is not a
boundary, and a control without a boundary fails 1.4.11.

### Named rules

**The No-Glow Rule.** No zero-offset shadows, no coloured glows, no backdrop
blur, no gradients and no gradient text. Depth is an offset shadow and nothing
else.

**The Boundary Rule.** Every control and every selected state is identifiable
without relying on its fill. Either the fill clears 3:1 against what is behind
it, or the control carries a `--border`, a `--shadow-lift` or a weight change
that does. Stated because two of Rally's own fills — the Lime highlight and the
PBP Green action — are hue steps rather than lightness steps, and both would
otherwise fail a reader who cannot see the hue.

## Chips

*Owned by #149; this section is a placeholder for what that ticket settles.*

One chip component replaces the six marks. Anatomy: a pill, a tinted wash, a
small filled dot in the chip's colour, and the label in Label type. Five
variants by semantic, each resolved from a domain state by the existing shared
resolver so that no call site picks a colour:

| Variant | Colour | Means |
|---|---|---|
| **settled** | PBP Green family | Confirmed payment, present participant |
| **provisional** | Orange | Pending payment, a seat held on unverified money |
| **void** | Dark Red | Rejected payment, cancelled session, no-show |
| **neutral** | Shells | Withdrawn, opted out, nothing placed yet |
| **info** | Purple | Informational |

**The label is mandatory** — see The Label Rule. The de-emphasis behaviour the
old system carried survives: the value beside a void chip recedes to the muted
ink rather than being struck through.

## Patterns

*Owned by #151; this section is a placeholder for what that ticket settles.*

Four decorative backgrounds as CSS or inline SVG, each a component with a size
and a colour resolved from tokens: thin grid lines, concentric rings, diagonal
dashed lines, a row of thin arrows. They render behind content only, are
`aria-hidden`, and never carry information. No sport-specific shapes — the
product must not name a sport, so the reference's ball outlines are rings.

**Motion**, when it arrives: hover and focus transitions on interactive
elements at 150–200ms, honouring `prefers-reduced-motion`. No entrance or
scroll animations.

## Do's and Don'ts

### Do

- **Do** give every state a chip with a written label, in both locales.
- **Do** take radius, shadow, colour and type from tokens and shared
  primitives, so a later surface cannot invent its own card.
- **Do** keep the action PBP Green with Black Green on it, in both themes.
- **Do** give every time, count, capacity and Rupiah amount `tabular-nums` at
  regular width.
- **Do** compute both themes as their own sets of pairs, and add the pair to
  `AA_PAIRS` when a surface creates a new one.
- **Do** give a control or a selected state a boundary that does not depend on
  seeing its hue.
- **Do** use the vocabulary in `CONTEXT.md` in component names and user-facing
  copy — Session, Seat, Dues, Fee, Payment, Proof, Participant, Opted Out,
  No-Show.

### Don't

- **Don't** put a light label on PBP Green, at any size.
- **Don't** communicate a state by colour alone, and don't let a call site pick
  a chip's colour.
- **Don't** use the action green for anything that is not an action.
- **Don't** introduce a second type family, a serif or a monospace.
- **Don't** use gradients, gradient text, glass, backdrop blur or any
  zero-offset glow.
- **Don't** set figures, labels or body text at a condensed width.
- **Don't** invent a third radius or a third shadow at a call site.
- **Don't** add a consumer of a retired token name — see *Retired rules*.
- **Don't** put this document's vocabulary — Rally, Display, Shells — into
  user-facing copy. It names the design, not the product.

## Retired rules

Papan Jadwal was a deliberate system, shipped across two delivery runs and
internally consistent. It is retired in full, for the reasons in
[ADR 0003](docs/adr/0003-retire-papan-jadwal-for-rally.md). Its rules are kept
here with one reason each so that the reasoning survives and nobody re-opens
the argument in six months. **None of these is in force.**

### Colour

| Retired rule | Why it no longer applies |
|---|---|
| **The Cell-Scale Rule** — colour fills a whole cell or it does not appear | Rally's colour arrives as a chip wash, a highlight surface and one action fill on a neutral card. A rule written to ban accent lines on a lattice has no lattice to govern |
| **The Mark-Not-Hue Rule** — state survives colour removal, carried by form | Replaced by *The Label Rule*. The obligation (WCAG 1.4.1) is unchanged; the channel is a word rather than a shape, which is legible to a reader who has learned nothing |
| **The One Green Rule** — Court Green is the only green in the system | Rally has two greens on purpose: the action and the settled-state ink. Replaced by *The One Action Rule*, which protects what the old rule actually cared about — that the action means one thing |
| **The Visible Rule Rule** — lattice rules hold ≥3:1 against the cell they border | The lattice is gone; the 3:1 obligation is not. Restated as *The Boundary Rule*, which covers input edges, dividers and selected states rather than a grid |
| **The Material-Is-Not-Mode Rule** — `.dark` names a painted-board material, not a mode | Kept in substance, retired in vocabulary: `.dark` still names a ground the public hero forces regardless of preference, but the ground is Black Green rather than a painted object. Restated in *The Theme-Is-Not-An-Inversion Rule* |

### Typography

| Retired rule | Why it no longer applies |
|---|---|
| **The One Hand Rule** — one family, because a real board is lettered by one hand | Kept in substance as *The One Family Rule*. The reason changed: Rally has one family because its width axis makes a second unnecessary, not because a board has one hand |
| **The Tracked-Caps-Are-Structural Rule** — tracked caps mark the board's own furniture | The furniture is gone. Tracked caps are now simply the Label role, used for column heads and chip text; there is no rule left to state |
| **The Pitch Budget Rule** | **Still in force**, restated above unchanged. Condensing Display only widened the margin, and the Vitest assertions were never about the board |
| **The Never-Bleed Rule** | **Still in force**, restated above unchanged. It is about a runtime-configured name of unknown length, which no change of design system affects |

### Elevation, shape and layout

| Retired rule | Why it no longer applies |
|---|---|
| **The No-Halo Rule** — no zero-offset shadows, no glows, no backdrop blur | Kept as *The No-Glow Rule*. Rally adds offset shadows, which the old rule permitted; what it banned is still banned |
| **Square corners** — `2px` on tiles and cells, `3px` on the header rail | Directly contradicted by the reference. Replaced by two radii and a pill |
| **Tile rest / tile pressed shadows** — a hard bottom edge plus a contact shadow | The tile is not the object any more. Replaced by `shadow-lift`, `shadow-lift-hover` and `shadow-none` |
| **The ruled lattice** — shared 1px borders, never gaps between floating panels | Replaced by card grids on member surfaces and tables inside cards on admin surfaces, per ADR 0003. Cards on soft shadows are exactly what the lattice existed to refuse, and that refusal is what the owner overruled |
| **Every day in a displayed range gets a cell** | A property of the board, which is gone. What survives is that an empty state is still a state and still says what is missing — restated by the chips' `neutral` variant |
| **The board reads down the page, not across it** — one column of ruled day rows at every width | Retired with the board. The measurement behind it is worth keeping: the widest label this product sets is the Indonesian *BELUM DIPASANG* at 133.8px, and any future fixed-width cell that puts a label beside a figure has to budget for that, not for the ~105px a session status suggests |
| **The public band-stack surface** — the fold law, positional density, one rule at the band's top edge, board register below the seam, the substance band never disappears | Retired here and re-decided by the public spec (#143), which owns that route's composition under Rally |
| **Containers max at `72rem` / `40rem`** | Retired as a document-level cap. Surfaces already name their own measure through `src/components/layout/measure.ts`, and the four surface specs settle the rest |

### Components

| Retired rule | Why it no longer applies |
|---|---|
| **The Six Marks** — Ink, Tape, Strike, Erased, Blank, Hollow, distinguished by form first | Replaced by five labelled chip variants (#149). The owner chose colour-plus-label over form; the accessibility obligation moves to the mandatory label, and the test asserts it |
| **Blank and Hollow are never interchangeable** | The distinction survives in the domain — nobody has acted yet is not the same as somebody should have — but it is now carried by two labels rather than two outlines |
| **The Slot Cell is a seam, not a pattern** — one component draws every Session, taking data and never nodes | Retired per ADR 0003: each surface composes its own card. The *resolvers* that decide state and available action stay shared, so behaviour still has one source even though drawing does not |
| **The top-right slot holds exactly one thing** — free Seats or a mark, in a fixed precedence | Retired with the cell. The precedence itself is server-side logic and is unaffected |
| **Free Seats means free, not taken** — the figure is `free/max` | **Still in force** as a product rule, and it belongs in `CONTEXT.md` rather than here: it is about what a number means, not about how it is drawn |
| **The action is a sibling of the link, never a child of it** | **Still in force** as an accessibility rule, and it outlives the cell: a control inside a link is invalid markup on any card, in any design system |
| **Livery is a magnet tile bearing the Activity's initial, with no colour** | Retired. `Activity.icon` returns with a renderer under the admin spec (#145) as a new decision, not a revert |
| **Opted Out is said on the Session's own line, not in the standing column** | Retired with the cell's fixed columns. That a member's own choice is not drawn as a failure survives as the chips' `neutral` variant |
| **The offer is not the permission** | **Still in force**, and it is a server rule: the board deciding what to offer can cost a refused tap, never a wrong write, because the routes re-check under a row lock |
| **The Register takes data, never nodes** — one component draws every admin table, five column kinds decide the treatment | Retired per ADR 0003: admin surfaces compose tables inside cards. The kind-decides-alignment discipline is worth carrying forward and is the admin spec's (#145) to place |
| **The Register's empty state is a ruled row, not a blank panel** | Restated in Rally's terms: an empty table still renders a row carrying a `neutral` chip and one sentence saying what is missing. A blank area says nothing at all |
| **One DOM, two label sources, exactly one live at a time** | **Still in force** as an accessibility rule for any responsive table: below `md` the table role is dropped and `scope` goes with it, so each cell carries its column's label as real text. A second DOM tree is still refused |

### Retired token names

These resolve to their nearest Rally value in `src/app/globals.css` so that the
roughly sixty files still naming them keep rendering. **#174 removes the
aliases and the last call sites with them. Nothing new may consume one.**

| Retired name | Resolves to |
|---|---|
| `bg-board`, `ring-offset-board` | `--background` |
| `bg-tile` | `--card` |
| `border-rule`, `divide-rule`, `bg-rule` | `--border` |
| `bg-wash-ink` | `--success-soft` |
| `bg-wash-tape` | `--warning-soft` |
| `bg-wash-strike` | `--destructive-soft` |
| `shadow-tile` | `--shadow-lift` |
| `shadow-tile-pressed` | a no-op shadow, i.e. `shadow-none` |
| `type-hero` | Display |
| `type-mark` | its own former letterforms, until the public spec gives the wordmark a Rally role |

`--radius-rail` is gone rather than aliased: it had no consumer.
