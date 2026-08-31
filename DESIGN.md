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

<!-- Finalised by #152 against the code that shipped in #148, #149, #150, #151,
     #157 and #169. Every ratio below is computed from the committed tokens by
     `src/lib/theme-contrast.ts`; every class name and component fact was read
     out of the file it names. A rule here that the product breaks is a defect
     in one of the two, and the one to change is whichever is wrong. -->

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
| **Green ink** | `#136B3F` / `#3ED27E` | Settled and confirmed. The green that is read rather than filled: chip ink, the settled state, and the first chart series on a light card. Ink step per theme, and on the dark ground it *is* PBP Green |
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
has to clear. All **62** live in `AA_PAIRS` in `src/lib/theme-contrast.ts` and
are asserted twice each — once per theme — against the hex values parsed out of
`src/app/styles/board-materials.css`. The worst case in each family is below.

Of those 62, the last two are the admin shell's own: the active navigation
item's label and its boundary, both measured against `--sidebar-accent`. They
are separate rows because the admin shell is forced dark whatever the page
theme, so its active item stays a Lime tile carrying Black Green in both
themes rather than inverting the way the page's own `--accent` does.

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
| the secondary action's label | 14.75 | 14.75 | 4.5 |
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

### Two actions that do not move with the theme

`--primary-solid` / `--primary-solid-foreground` is PBP Green carrying Black
Green, identical in both themes, at **8.74:1**. `--secondary-solid` /
`--secondary-solid-foreground` is Black Green carrying off-white, also identical
in both themes, at **14.75:1**. A button that changes colour when the light
changes is not *the action* any more, and the second action is the same promise
as the first.

`--secondary-solid` is a separate token from `--secondary` on purpose, and the
two must not be merged. `--secondary` stays a light neutral because
`--secondary-foreground` runs body text at 54 sites; turning it into an inverted
fill would take every one of them with it.

### Chart series

Series colours are **not** free. Each of the five clears **3:1** against
`--card`, and all ten pairs are asserted:

| Series | Light | Dark | Value (light / dark) |
|---|---|---|---|
| `--chart-1` | 6.56 | 7.54 | `#136B3F` / `#3ED27E` |
| `--chart-2` | 5.34 | 6.80 | `#6C4CF0` / `#B7A4F7` |
| `--chart-3` | 3.10 | 7.06 | `#E8701A` / `#F2A24A` |
| `--chart-4` | 7.43 | 5.67 | `#9E2B25` / `#F08078` |
| `--chart-5` | 17.11 | 11.80 | `#0E1F17` / `#D8F25E` |

The floor is 3:1 rather than 4.5:1 because a plotted mark is a non-text
graphical object under WCAG 1.4.11, and the surface is `--card` because
`ChartFigure` composes every Rally chart onto a Card. **A series is never drawn
straight onto the page ground**, where `--chart-3` would measure 2.57:1 and
`--chart-2` 4.42:1 — a figure that escapes its card breaks this table.
`--chart-3` at 3.10 light is the tightest pair in the system; it clears, and it
has no room to be nudged.

This replaces an earlier decision that colour was free for charts because the
figure carries its numbers as text as well. That was load-bearing on a real
problem: `--chart-1` was PBP Green in both themes, which measures **1.96:1** on
a white card, and #169's first render showed a green line that was barely there.
Two things were wrong with it and one fix answers both — *The One Action Rule*
already forbids the action green from becoming a chart series, so the light
theme now takes the settled green **ink** instead. On the dark ground the ink
step and the bright value are the same colour, so the dark theme is unchanged.
The text list stays; it is what makes a chart readable to someone who cannot see
it at all, and it was never an argument for an illegible mark.

### Named rules

**The Label Rule.** No state is ever communicated by colour alone. Every chip
carries a written label, in both locales, and the test suite asserts it rather
than trusting convention. This is what makes it legitimate to have dropped the
six mark forms.

**The Two-Value Rule.** A colour that is both a fill and running text carries
two values — the reference value and a measured ink step — and the token layer
names both. `--primary` is the ink, `--primary-solid` is the fill; the same
split runs through secondary, warning and destructive. A call site never picks
between them: the token it reaches for already is the right one. The rule
reaches the chart ramp too — `--chart-1` is the green *ink*, because a series is
a mark to be seen rather than an action to be pressed.

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
carries over unchanged.

**The budget now has a second author, and that is why it is a rule rather than
an editorial habit.** #153 reopened the 2026-08-19 decision that no `Settings`
key writes public copy, for the public route only: the landing headline and
subline are Admin-authored through `publicHeroHeadline` and `publicHeroSubline`,
with the dictionary's `landing.hero.pitch` and `landing.hero.lead` as the
fallback when a key is blank. The caps are enforced on the way in, in
`src/lib/public-copy.ts` — `heroHeadline: 48`, `heroHeadlineWord: 12`,
`heroSubline: 120` — and the word rule applies to the **headline only**, because
the subline is Body and does not run at the display clamp. An Admin's copy is
refused with the reason they will see first, rather than accepted and allowed to
overflow. A design rule that only the dictionary obeyed would have been a
comment; one the write path enforces survives a stranger typing into a form.

It does **not** extend to page metadata: a crawler
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

**Borders are for controls, dividers and overlays, not for cards.** A card is
bounded by its shadow and its own face. Where a border is drawn — an input, a
divider inside a card, a selected option — it is `--border`, and it clears 3:1
against every surface it can land on, including Lime. One value serves all of
them deliberately: a hairline that disappears against one of the washes is not a
boundary, and a control without a boundary fails 1.4.11.

An **overlay** surface — a dialog, a sheet, a popover, a menu — carries
`--border` as well as `shadow-lift`, and that is not an exception being smuggled
in. A card sits on a ground this system chose; an overlay floats over whatever
happened to be underneath it, so its own face cannot be relied on to separate it
from that.

### Named rules

**The No-Glow Rule.** No zero-offset shadows, no coloured glows, no backdrop
blur, no gradients and no gradient text. Depth is an offset shadow and nothing
else. A **focus ring** is not depth and is not covered: it is a state indicator
that WCAG 1.4.11 requires, it is drawn at zero offset because that is what a
ring is, and every control has one.

**The Boundary Rule.** Every control and every selected state is identifiable
without relying on its fill. Either the fill clears 3:1 against what is behind
it, or the control carries a `--border`, a `--shadow-lift` or a weight change
that does. Stated because two of Rally's own fills — the Lime highlight and the
PBP Green action — are hue steps rather than lightness steps, and both would
otherwise fail a reader who cannot see the hue.

## Chips

One chip component (`src/components/ui/chip.tsx`) replaces the six marks.
Anatomy: a `rounded-full` pill, a tinted wash, a 1px edge in the chip's own
ink, a `size-1.5` filled dot taking `bg-current`, and the label in Label type
with `tabular-nums`. The dot is `aria-hidden`: it is the label that carries the
state, and the dot cannot drift off a measured pair because it is the label's
own colour.

Five variants by semantic. No call site picks one — `resolveStatusChip` in
`src/lib/status-chip.ts` maps a `DomainState` to a variant and a dictionary key,
and every branch is a `Record` over a closed Prisma enum, so a new state fails
the build until somebody decides what it looks like.

| Variant | Tokens (wash / ink / edge) | Light | Dark | Producers |
|---|---|---|---|---|
| **settled** | `--success-soft` / `--success-soft-foreground` / `--success-soft-border` | 5.59 | 7.06 | Confirmed Payment, Present, Registered, a posted Session |
| **provisional** | `--warning-soft` / `--warning-soft-foreground` / `--warning-soft-border` | 6.00 | 6.73 | Payment in review, a Seat held on money not yet verified, Maybe |
| **void** | `--destructive-soft` / `--destructive` / `--destructive-soft-border` | 6.04 | 5.88 | Rejected Payment, cancelled Session, No-Show |
| **neutral** | `--muted` / `--muted-foreground` / `--border` | 5.90 | 7.03 | Opted Out, nothing placed yet, an empty register or chart |
| **info** | `--primary-soft` / `--primary` / `--primary-soft-border` | 6.93 | 7.14 | Informational |

Each chip's **edge** clears 3:1 against its own wash on the same numbers, except
the neutral chip, whose taupe edge measures **3.29 / 3.70** — still past the
floor, and the reason `--border` is as dark as it is.

**The label is mandatory.** `ChipProps` omits `children` and requires `label`,
so there is no second way to put text in a chip and no way to put none. That is
what makes it legitimate to have dropped the six mark forms — see *The Label
Rule*. `StatusChip` takes its labels as `t.chips`, so a label can only be one
that ships in both English and Indonesian.

**Nothing is ever struck through.** The de-emphasis the old system carried
survives as `StatusValue`: the value a void state applies to — a Session's
title, a Payment's amount — recedes to `--muted-foreground`. Measured **7.13 /
7.89** on a card and **5.90 / 9.14** on the page ground, and **5.80 / 8.19**
where it sits inside the void wash itself. A line drawn through a row's own
title reads as damage to the row rather than as a state, and the chip beside it
already says *cancelled* or *rejected* in words.

One widening to know about: the retired `MarkedValue` keyed off the Strike mark
and No-Show was Hollow, so a No-Show value was never dimmed. No-Show is void
now, so a caller passing an `attendanceState` to `StatusValue` **would** dim it.
Nothing does today — every call site passes `paymentState` or `sessionState` —
but a surface that wants a No-Show row at full strength has to say so.

**The email chips are a hand-kept copy, and the tokens are authoritative.** An
email client cannot read a CSS custom property, so `src/lib/email/layout.ts`
inlines its own hexes — `#136B3F` on `#DDF2E4` for settled, `#9E2B25` on
`#F8E3E1` for void. That is the one permitted duplication in this repository.
Today those four values are exactly the light theme's `--success-soft-foreground`,
`--success-soft`, `--destructive` and `--destructive-soft`, and **nothing keeps
them agreeing**: no test reads both. A chip colour that moves in the token layer
has to be carried across to that file by hand, in the same change.

## Patterns

Four decorative backgrounds, one component each under
`src/components/patterns/`: `GridPattern` (thin grid lines), `RingPattern`
(concentric rings), `DashPattern` (diagonal dashed lines) and `ArrowRowPattern`
(a row of thin arrows). They render behind content only, are `aria-hidden`,
take no pointer events, and never carry information. No sport-specific shapes —
the product must not name a sport, so the reference's ball outlines are rings.

Their shared contract is `pattern-tokens.ts`:

- **Colour comes from a closed union**, not a `string`. `PatternColorToken` is
  `border | muted-foreground | accent | primary | success | warning |
  destructive`, resolved to `var(--<token>)`. A call site cannot hand a pattern
  an arbitrary CSS colour, because decoration behind content may only draw from
  values this system has already measured.
- **`PATTERN_OPACITY` is `0.14` and is not a prop.** It was chosen so that even
  where a line sits directly behind a headline glyph the blended ground still
  clears the 4.5:1 text floor by a wide margin — measured about 12.3:1 against a
  14.2:1 baseline for the grid pattern behind the hero headline, in both themes.
  A caller that could raise it could put a pattern in front of the text.
- **`DEFAULT_PATTERN_SIZE_PX` is `240`**, and what the size means is each
  component's own business.

## Motion

**One duration token and one utility.** `--duration-rally: 175ms`, in the middle
of the 150–200ms band, and `.transition-rally`, both in
`src/app/styles/motion.css`. The utility transitions `color`,
`background-color`, `border-color`, `box-shadow` and `transform` on `ease-out`.
It is the token new work reaches for; the primitives restyled by #150 predate it
and carry Tailwind's own `transition-colors duration-150` (the button and the
tab take `transition-all duration-150`, the sheet `transition duration-200`),
which is inside the same band. **No consumer of `.transition-rally` has shipped
yet** — the surface runs are what adopt it.

**Motion is hover, focus and state, never arrival.** There are no entrance
animations on content and no scroll animations anywhere. The one keyframe
animation Rally keeps is the overlay layer: Dialog, Sheet, Select content and
Dropdown-menu content fade, zoom and slide on open and close, at `duration-100`
(`duration-200` on the Sheet). Those stay, deliberately — they answer a tap
rather than entering on load or on scroll, they tell a reader a layer arrived
instead of the page having been replaced, and Radix needs the exit keyframe to
keep the node mounted while it plays. An element that animates because the page
loaded, or because it came into view, is what the rule bans.

**Reduced motion is honoured everywhere motion is decorative.** Every
transition in the primitives carries `motion-reduce:transition-none`; the
skeleton carries `motion-reduce:animate-none`; `motion.css` collapses
`.transition-rally` to `0ms` and the seven overlay slots to a `1ms` animation
under `prefers-reduced-motion: reduce`. That last rule is written against
`[data-slot='…']` rather than as a `motion-reduce:` variant because the enter
utilities are emitted as `[data-state='open']` selectors, which outrank a plain
class; the rules are unlayered, so they win over `@layer utilities` whatever its
specificity.

**The one exemption is the spinner.** `animate-spin` on a loading `Loader2`
keeps turning under reduced motion. A spinner reports that work is in progress,
which WCAG 2.3.3 treats as essential rather than decorative, and stopping it
would remove the only signal that the app is still doing something.

## Components

What the restyled primitives actually resolve. A surface composes these; it does
not restate their treatment.

| Primitive | At rest | Focus / state |
|---|---|---|
| **Button** — `default` | `--primary-solid` fill, `--primary-solid-foreground` ink, `shadow-lift`, `rounded-lg` = 8px | `focus-visible` paints a 1px `--ring` border **and** a 3px `--ring/50` halo; `active` drops to `shadow-none` and nudges `translate-y-px` |
| **Button** — `secondary-solid` | `--secondary-solid` / `--secondary-solid-foreground`, `shadow-lift` | as above. No call site consumes it yet |
| **Button** — `destructive`, `destructive-outline`, `outline`, `ghost`, `secondary`, `link` | fills and edges from the matching token family; `outline` and `ghost` hover to `--muted` | as above, with `--destructive` tinting the ring on the two destructive variants |
| **Card** | `--card` face, `rounded-xl` = 12px, `shadow-lift`, **no border** | the footer takes `border-t` and a `--muted/50` wash |
| **Input**, **Textarea**, **Select** trigger, **native select** | `--card` fill, 1px `--input` edge, `rounded-md` = 8px | `focus-visible` resolves a `--ring` border plus a 2px `--ring` ring offset 2px; `aria-invalid` resolves a `--destructive` border and a `--destructive/20` ring; `read-only` falls back to `--background` |
| **Checkbox** | 1px `--input` edge, `rounded-sm` = 8px | checked fills `--primary` with `--primary-foreground`; focus takes a `--ring/50` 3px ring |
| **Table** | rows ruled with `border-b`, hover `--muted/50` | column heads take the Label role and `--muted-foreground` from the base layer |
| **Tabs** | `rounded-full` triggers, `--foreground/60` ink | active raises the ink and paints a 2px `--foreground` underline |
| **Stat card**, **Empty state** | `--card`, `rounded-xl`, `shadow-lift` | the stat card lifts to `shadow-lift-hover`; the empty state carries a `neutral` chip and one sentence |
| **Chart figure** | a Card carrying a title, the drawn chart, a caption and a `<details>` list of every plotted value | the value list is the accessibility contract: a chart is never the only representation of its numbers |

**A utility passed to a primitive does not always win, and nothing tells you
when it loses.** `cn()` is `tailwind-merge`, which resolves a conflict only
between classes in the **same group**. `display` and `flex-direction` are
different groups, so passing `flex-row` to a primitive whose base class already
says `grid` leaves the `grid` in place and silently drops the intent —
`CardHeader`'s base begins `grid auto-rows-min items-start`, and #162 found a
card header rendering stacked instead of side-by-side for exactly that reason.
Lint, `tsc`, Vitest and `next build` were all green while it was wrong, because
none of them renders anything. Pass the `display` utility as well as the one
that depends on it (`flex flex-row`), or change the primitive.

Two more shapes worth stating on their own. **A card is bounded by its shadow
and its own face, not by a border** — #150 removed the card border, which is why
`card` on `background` is measured and published rather than asserted. And
**every control's focus indicator has a full-opacity part**: the 1px
`border-ring`, at 7.15 / 7.88 against the page ground. The 3px halo is at 50%
alpha and is not what a reader who needs the indicator is relying on.

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
- **Do** let a state reach a chip through `resolveStatusChip`, and take the
  label from `t.chips`.
- **Do** draw every chart inside a `ChartFigure`, so the series sit on a card
  face and the numbers are also present as text.
- **Do** give a new transition `.transition-rally`, or Tailwind's own
  `duration-150` with `motion-reduce:transition-none` beside it.
- **Do** carry a chip colour change across to `src/lib/email/layout.ts` by hand,
  in the same commit.

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
- **Don't** strike a value through to say it was rejected or cancelled. Dim it
  with `StatusValue` and let the chip carry the word.
- **Don't** animate anything on load or on scroll, and don't add a keyframe
  animation without a reduced-motion rule beside it. A loading spinner is the
  one exemption.
- **Don't** hand a pattern a colour that is not in `PatternColorToken`, and
  don't raise `PATTERN_OPACITY` at a call site — it is not a prop.
- **Don't** put a chart on the page ground, and don't let a series be the only
  way to read a number.
- **Don't** assume a utility handed to a shared primitive beats the primitive's
  own base class. `tailwind-merge` only resolves classes in the same group, so a
  `flex-row` on a `grid` base is a silent no-op that every gate passes. Look at
  the primitive's base string, and pass the `display` utility too.
- **Don't** put this document's vocabulary — Rally, Display, Shells — into
  user-facing copy. It names the design, not the product.

## Retired rules

Papan Jadwal was a deliberate system, shipped across two delivery runs and
internally consistent. It is retired in full, for the reasons in
[ADR 0003](docs/adr/0003-retire-papan-jadwal-for-rally.md). Its rules are kept
here with one reason each so that the reasoning survives and nobody re-opens
the argument in six months. **None of these is in force.**

Reviewed against the shipped code on 2026-08-31 (#152). Two entries needed
correcting rather than restating, and both are marked below: the six marks and
the strike went further than "replaced" — no element in `src/` carries a
strike-through utility any more — and the wash aliases have already lost every
call site. Everything else retired as written.

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
| **The Pitch Budget Rule** | **Still in force**, restated above with one addition. Condensing Display only widened the margin, and the Vitest assertions were never about the board. The addition is not Rally's: #153 gave the headline and subline a second author, so the same numbers are now enforced on an Admin's input as well as on the dictionary |
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
| **The Six Marks** — Ink, Tape, Strike, Erased, Blank, Hollow, distinguished by form first | Replaced by five labelled chip variants (#149). The owner chose colour-plus-label over form; the accessibility obligation moves to the mandatory label, and the test asserts it. **Reviewed 2026-08-31:** the forms are gone outright — no strike-through utility, no decoration-thickness override, no `data-mark` attribute and no torn-edge class anywhere in `src/`, and `mark-forms.css` is deleted |
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

These resolve to their nearest Rally value in `src/app/globals.css` and
`src/app/styles/type-roles.css` so that the files still naming them keep
rendering. **#174 removes the aliases and the last call sites with them.
Nothing new may consume one.** Counted in `src/` on 2026-08-31:

| Retired name | Resolves to | Call sites left |
|---|---|---|
| `bg-board` | `--background` | 20 in 15 files |
| `ring-offset-board` | `--background` | 1, in `landing/hero-band.tsx` |
| `bg-tile` | `--card` | 31 in 25 files |
| `border-rule` | `--border` | 56 in 39 files |
| `divide-rule` | `--border` | 5 in 5 files |
| `bg-rule` | `--border` | 4 in 3 files |
| `bg-wash-ink` | `--success-soft` | **0** |
| `bg-wash-tape` | `--warning-soft` | **0** |
| `bg-wash-strike` | `--destructive-soft` | **0** |
| `shadow-tile` | `--shadow-lift` | 2 |
| `shadow-tile-pressed` | a no-op shadow, i.e. `shadow-none` | 2 |
| `type-hero` | Display | 1 outside tests and comments |
| `type-mark` | its own former letterforms, until the public spec gives the wordmark a Rally role | 4 |

The three wash aliases already have **no consumer at all**: the chips took their
call sites with them in #149, and only the alias itself is left to delete.

`--radius-rail` is gone rather than aliased: it had no consumer.

Three retired *class* names have no consumer either and are not aliases: the
strike-through utility, the 1.5px decoration-thickness override beside it, and
the torn-edge class the Tape mark drew. The torn edge cannot render at all —
`src/app/styles/mark-forms.css`, which defined it, is deleted. The other two are
Tailwind utilities, and until #152 rewrote `TESTING.md` they were still being
emitted into the built stylesheet: Tailwind v4's automatic source detection
scans markdown, and the old TC-DS-006 quoted the class strings verbatim, so a
test document was keeping dead CSS alive on its own. **This is why neither
document spells those two class names any more.** Worth remembering the next
time one of these tables says a name has no consumer.
