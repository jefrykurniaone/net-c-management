---
name: Papan Jadwal
description: A sports-community app built as the court schedule board its members already read standing up.
colors:
  enamel-ground: "#E8EBEA"
  enamel-tile: "#F7F9F8"
  graphite-ink: "#151E1B"
  ruled-line: "#7F8B87"
  secondary-ink: "#54615B"
  quiet-ink: "#66726D"
  court-green: "#17614A"
  court-green-wash: "#E4F0EA"
  tape-ochre: "#8A5A0B"
  tape-ochre-wash: "#FBF3E2"
  struck-red: "#A62F26"
  struck-red-wash: "#FAECEA"
  board-ground: "#1B2621"
  board-tile: "#243029"
  board-rule: "#6E7D76"
  chalk-ink: "#E7ECE9"
  chalk-secondary: "#9AA6A0"
  chalk-quiet: "#8A968F"
  court-green-lit: "#4FBF8E"
  tape-ochre-lit: "#DFA83E"
  struck-red-lit: "#EE7B72"
  court-green-wash-board: "#1E3A2E"
  tape-ochre-wash-board: "#3A2E14"
  struck-red-wash-board: "#3A211E"
typography:
  mark:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 2.4vw, 1.5rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.14em"
  hero:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 8vw, 5rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.03em"
    textTransform: "uppercase"
    textWrap: "balance"
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.25
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
  tile: "2px"
  rail: "3px"
spacing:
  hair: "2px"
  cell: "10px"
  block: "16px"
  bay: "28px"
  band: "56px"
  band-lead: "112px"
components:
  action-primary:
    backgroundColor: "{colors.court-green}"
    textColor: "{colors.enamel-tile}"
    rounded: "{rounded.tile}"
    padding: "12px 20px"
    typography: "{typography.label}"
  action-primary-hover:
    backgroundColor: "{colors.graphite-ink}"
    textColor: "{colors.enamel-tile}"
  cell:
    backgroundColor: "{colors.enamel-tile}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.tile}"
    padding: "{spacing.cell}"
  mark-ink:
    backgroundColor: "{colors.court-green-wash}"
    textColor: "{colors.court-green}"
    rounded: "{rounded.tile}"
    padding: "3px 8px"
    typography: "{typography.label}"
  mark-tape:
    backgroundColor: "{colors.tape-ochre-wash}"
    textColor: "{colors.tape-ochre}"
    rounded: "{rounded.tile}"
    padding: "3px 8px"
    typography: "{typography.label}"
  mark-strike:
    backgroundColor: "{colors.struck-red-wash}"
    textColor: "{colors.struck-red}"
    rounded: "{rounded.tile}"
    padding: "3px 8px"
    typography: "{typography.label}"
  mark-erased:
    backgroundColor: "{colors.enamel-ground}"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.tile}"
    padding: "3px 8px"
    typography: "{typography.label}"
---

<!-- SEED: established with the user before implementation; re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Papan Jadwal

## Overview

**Creative North Star: "The Court Schedule Board"**

Every member of this community has stood in front of a `papan jadwal` at a GOR — the ruled board by the entrance where courts run across and time slots run down, where names go onto magnetic tiles, and where a mark against your name is what makes your money real. It is read standing up, in bad light, in two seconds, by people who are about to play. This system is that board: not a board-themed dashboard, but the object itself rebuilt as software.

The board decides everything downstream. Structure is a ruled lattice, not a scatter of floating cards — cells share their rules with their neighbours, because that is what a grid physically is. Corners are square (2px, the barely-there round of a stamped tile edge). Depth is a tile resting on a board: a hard bottom edge for thickness plus a tight contact shadow, never an ambient glow. Colour arrives at cell scale, filling whole cells, never as a tint sprinkled over a neutral ground.

The single most consequential decision here is that **state is carried by a mark, not by a hue.** A settled thing is written in ink; a provisional thing is held with tape; a void thing is struck through; a withdrawn thing is erased; an expected thing that never happened is left hollow. Colour reinforces each mark but never carries it alone. This came out of a real constraint — court green is the identity, so green could not also mean "paid" — and it turned out to be the better system regardless, because this app shows state on nearly every surface and WCAG 1.4.1 does not accept colour as the only channel.

Dark mode is not an inversion. The world ships two real objects: an **enamel board** under hall lighting and a **painted dark-green board** of the kind on every Indonesian school and hall wall. Because both grounds are green-family, identity and ground are separated on **two** axes — the dark ground is desaturated far past the identity green, not merely darkened — and every pair is computed rather than eyeballed.

**Key Characteristics:**

- Ruled lattice as page structure; shared borders, not gaps
- Square tiles (2px); no soft corners anywhere
- One lettering system, signage weights, tabular figures
- Six state marks, distinguished by form before colour
- Two real board materials, not one palette and its inversion
- Rules are ink you can see, at 3:1 minimum against their cell

## Colors

Near-neutral enamel and graphite ink, with a single blue-leaning court green as the identity and three mark colours that never carry state on their own.

### Primary

- **Court Green** (`#17614A`): the blue-leaning green of a badminton mat. The identity, and the colour of every act of commitment — claim a Seat, submit Proof, Confirm a Payment. On the painted board it lifts to **Court Green Lit** (`#4FBF8E`) so it stays the brightest intent against a dark green-family ground (5.9:1 on board tile; white on `#17614A` is 7.4:1).

  *Known risk, accepted deliberately:* this green sits closer to the `#0F766E` teal it replaces than the alternatives did. Checked in the `prototype/board-palette` prototype, which renders the same board under both greens: the swap alone is a **small** perceived change — visible in a filled nav tile and in the Ink wash, not enough to read as a new product on its own. What carries the redesign is the structure (lattice, visible rules, square corners, marks, one lettering system), which reads as a different product under *either* green. The identity colour is therefore not load-bearing, which is a reason to keep it rather than escalate it.

### Secondary

Mark colours. Each is bound to one mark and to nothing else — never navigation, never branding, never emphasis.

- **Tape Ochre** (`#8A5A0B`, lit `#DFA83E`): provisional. A Payment awaiting Confirm; a Seat held on unverified money.
- **Struck Red** (`#A62F26`, lit `#EE7B72`): void or failed. A Rejected Payment, a cancelled Session, a No-Show.

### Neutral

- **Enamel Ground** (`#E8EBEA`) / **Enamel Tile** (`#F7F9F8`): the painted board and the tile face on it. Deliberately near-neutral rather than green-tinted, so Court Green is the only green on the surface. Never cream.
- **Graphite Ink** (`#151E1B`): all primary lettering.
- **Ruled Line** (`#7F8B87`): the lattice, at 3.4:1 on tile — dark enough to read as drawn ink.
- **Secondary Ink** (`#54615B`) / **Quiet Ink** (`#66726D`): supporting and de-emphasised lettering; both clear 4.5:1 on tile. Quiet Ink clears tile but **not** ground — it measures 4.20:1 on Enamel Ground, so anything sitting on the ground (the Erased mark) takes Secondary Ink at 5.41:1 instead. Measured in the board prototype.
- **Mark washes on the painted board** (`#1E3A2E` / `#3A2E14` / `#3A211E`): the three mark fills in board material, each carrying its lit mark colour at 5.4:1, 6.2:1, and 5.4:1. Derived in the prototype, not from the enamel washes — an inverted light wash goes muddy against a green ground.
- **Board Ground** (`#1B2621`) / **Board Tile** (`#243029`) / **Board Rule** (`#6E7D76`) / **Chalk Ink** (`#E7ECE9`): the same four roles in painted board.

### Named Rules

**The Cell-Scale Rule.** Colour fills a whole cell or it does not appear. A coloured accent line on an otherwise neutral cell is forbidden — including the `border-left` and `border-top` device this system explicitly replaces.

**The Mark-Not-Hue Rule.** No state is ever communicated by colour alone. Every state has a distinct mark form; its colour is reinforcement. Remove all colour and every state must still be readable.

**The One Green Rule.** Court Green is the only green in the system. Nothing else — no success state, no activity livery, no chart series — may be green, or the identity stops meaning anything.

**The Visible Rule Rule.** Lattice rules hold ≥3:1 against the cell they border, in both board materials. A hairline that disappears is not a rule, and a board without rules is a pile of cards.

**The Material-Is-Not-Mode Rule.** The two board materials are objects, not themes. `.dark` in this codebase names the **painted-board material**; the theme toggle is one caller of that class, not its definition — which is already how `board-materials.css` reads, describing materials rather than modes. The public route's hero band is the first surface where the two part: it renders painted board **regardless of the visitor's theme**, because a logged-out stranger has never set a preference and a page whose force depends on a coin flip has no force. Forcing the whole route dark was refused for the opposite reason — it hides a working control and overrides a preference the visitor *did* set. Renaming the class to name the material is correct in principle, touches every surface in the app, and has not been done; until it is, this rule is what makes the overload honest.

## Typography

**Display / Body / Label Font:** Archivo (fallback `system-ui, sans-serif`) — *provisional; no build has confirmed it.*

**Character:** One lettering system, as a real board has. A grotesque with signage bones: it holds at 900 for a stencilled community mark and stays quiet at 400 in a dense admin table, and its tabular figures carry the times, counts, capacities, and Rupiah amounts this product is mostly made of.

### Hierarchy

- **Mark** (900, `clamp(1.125rem, 2.4vw, 1.5rem)`, 0.14em tracked caps): the community name — in the board's header rail, and again as the wordmark on the public route. The same size in both; there is no second Mark size, because the name is runtime configuration with no length cap and every step up in size is a step further from surviving one. Weight 900 is shared with **Hero** and with nothing else.
- **Hero** (900, `clamp(2.25rem, 8vw, 5rem)`, 0.95, `-0.03em`, uppercase, `text-wrap: balance`): the pitch on the public route, and nothing else. The one role scoped to a single route, kept off `(main)` and `(admin)` by an ESLint restriction rather than by convention — utilities are global, so file placement guarantees nothing. It renders larger than Display at every viewport, minimum **1.29×**, at widths ≤450px where both roles sit on their floors; that separation is a **property, not the guard**, and the lint is the guard. `0.95` is legal to crowd only because the role is caps: no descenders, so lines that would collide in sentence case sit clean — this is not licence to tighten sentence-case display type. `text-wrap: balance` belongs to the role, not to the instance: it sets the slabs as a tapering silhouette that funnels into the action beneath, and the budget below was measured with it on.
- **Display** (800, `clamp(1.75rem, 5vw, 3rem)`, 1.02): page-owning statements on board surfaces. Capped at 3rem — a board is read, not shouted at — and that cap is scoped to boards rather than to the whole system; the public route's shout is **Hero**. Display copy is authored short enough to hold at two lines at the cap. Two lines is Display's budget alone, not a shared law: Hero's is four, because the sizes and the measures differ. What sets the break is the container the type sits in — never a per-instance `line-height`, and never a hardcoded `<br>`, since the two locales break at different words and any manual break is right in one language and wrong in the other.
- **Title** (700, `1.0625rem`): cell and section headings.
- **Body** (400, `0.9375rem`, 1.55): prose, at 65–75ch measure.
- **Caption** (400, `0.8125rem`, 1.45): the dense supporting line inside a cell — time and venue, a note under an action. A board runs tight; this step is structural, not an afterthought.
- **Label** (700, `0.6875rem`, 0.1em, uppercase): rail labels, column heads, marks.
- **Figure** (600, `1.0625rem`, `tabular-nums`): every time, count, capacity, and amount.
- **Figure Lead** (800, `1.375rem`, `tabular-nums`): the day-of-month numeral anchoring a Slot Cell. The one figure that outranks its own cell heading, because on a board you find the date first.

### Named Rules

**The One Hand Rule.** One family across the whole system. No serif, no second sans, and no monospace — figures take `tabular-nums` from the one family instead, because a real board is lettered by one hand.

**The Tracked-Caps-Are-Structural Rule.** Tracked caps mark the board's own furniture: rail labels, column heads, marks. Never an eyebrow above a section. **Tight caps are a different device and this rule does not reach them:** Mark is `0.14em` tracked *out* and reads as stencilled furniture, Hero is `-0.03em` drawn *in* and reads as a shouted slab. Two settings that happen to share capitals. Do not merge them into one rule, and do not read either as licence for the other.

**The Pitch Budget Rule.** The Hero pitch is authored to two independent limits, because two different things break and neither predicts the other: **≤ 48 characters, measured on the Indonesian string**, and **no word longer than 12 characters, in either locale**. Total length drives line count and therefore the fold — 54 characters is the first value that runs to five lines, whatever its longest word. Longest word drives horizontal overflow at *both* ends of the clamp, independent of total length — a sixteen-letter Indonesian compound overruns the desktop measure by a fifth of its width at the cap. Both limits are checked by Vitest against both locales: length needs no judgement, which is why it escapes the false-positive problem that rules out testing whether a string has actually been translated. English is authored second and lands shorter; that is slack, not a target. The budget belongs to this role and **does not extend to page metadata** — a crawler sends no locale cookie, so a title is always read in English and is sized against a search result, not against a hero.

**The Never-Bleed Rule.** The community name is runtime configuration of unknown length, and tracked caps at `0.14em` make it the widest element per character in the system — so it is the **first** thing to fail an unfamiliar name, not the last. Any surface rendering it at Mark carries a shrinkable box and word-breaking, in the header rail and in the hero alike; the Hero pitch carries the same guarantee under the Pitch Budget Rule. The order of preference is fixed: **hold the budget → wrap at spaces → break mid-word → never bleed, and never paint over a control.** A mid-word break in a 900-weight slab is a visible defect, which is the point — the guarantee exists to make a violation degrade instead of breaking the page. An unreachable control is a functional failure where a broken word is a cosmetic one, and a glyph is not clipped by the box that owns it, so measuring element boxes will report no collision while one is on screen.

## Layout

The page is a ruled lattice. Cells sit adjacent and share a single rule between them; structure comes from a 1px `Ruled Line` grid, never from gaps between floating panels. Spacing rhythm is `2 / 10 / 16 / 28 / 56 / 112` — hairline separation inside a tile, `10px` inside a cell, `16px` between cell groups, `28px` between bays, then two steps that exist only for air *between* full-bleed bands and **never appear inside a cell**: `56` and `112`, continuing the scale's own doubling rather than inventing numbers. Below `768px` the two band steps collapse one place — `112 → 56`, `56 → 28` — landing back exactly on `bay`, so mobile inherits board density and no new number enters the scale. More space above a heading than below it — a heading that opens its container already has that space in the container's own top padding.

Containers max at `72rem` for board surfaces and `40rem` for single-task columns (Proof upload, sign-in, an Applicant's waiting page). That `72rem` is a shared gutter, not only a cap: every board surface aligns to the same one, rail and footer included — with exactly one exception, the public route's hero band, whose content is centred rather than gutter-aligned (see *The public band-stack surface*). Board surfaces top-anchor their content below the identity rail. Vertical centring is reserved for interstitials that own the whole viewport. Density is deliberately high: this is a board, and a board is full.

Every day in a displayed range gets a cell, whether or not anything is on it. Skipping empty days turns the board into a short list of cards, which is the arrangement this world exists to refuse.

Responsive: **the board lattice** collapses **by axis, not by flattening**. Wide screens carry the full grid. Below `768px` the board becomes a single-column day rail — each day keeps its rule-bounded row, cells stack inside it, and column heads become the row's tracked-caps label. It must never degrade into an unruled list; losing the rules loses the world. This governs the lattice: a centred single-column band has no axes to collapse and is exempt. Said out loud because the rule otherwise reads as universal and invites someone to give a hero a day rail.

### The public band-stack surface

A third layout category, alongside the board surface and the interstitial. It exists on the public route and nowhere else — not as an unnamed exception to the board surface, because an unnamed exception is copied by the next surface that wants air, and not as an interstitial, because an interstitial owns the viewport with nothing below it while this surface exists to put substance below the fold.

- **A vertical stack of full-bleed bands.** Each band's content is horizontally centred *or* gutter-aligned according to that band's job.
- **The hero band is full-bleed; its content is centred at `48rem` and top-anchored.** The band itself cannot be capped — a painted-board band floating at `72rem` inside enamel is exactly the floating panel this system refuses. `72rem` is wrong for the *content* too, at roughly 110 characters where prose caps at 65–75, and big type only stacks as slabs against a narrow measure. `48rem` is a **text measure**, the same kind of thing Body's 65–75ch already is, and the measure is what decides where the pitch breaks. The shared left edge is abandoned in this band deliberately and resumes for every band below the seam; this is not the misalignment it resembles, where a narrow column was *accidentally* centred while the rail stayed gutter-aligned — here the centring is the band's own composition and the rail sits across a material seam from it. Note what is *not* changed: the content is top-anchored, so the vertical-centring reservation above stands untouched.
- **One rule, at the band's top edge only.** The identity rail's bottom rule *is* the hero band's top edge — one rule, not two. The bottom edge, where painted board returns to enamel, carries **no** rule: a material change is a harder boundary than any hairline, and a rule that disappears is not a rule. The top edge keeps its rule even though it is redundant in light mode, because in dark mode rail and band are both painted board and the rail would dissolve into the hero without it. A rule that appears and vanishes by theme is worse than one that is sometimes redundant.
- **Density is positional, not per-section.** The seam is not "hero airy, bands dense". It is *between bands is air, inside cells is board*: `2 / 10 / 16 / 28` governs the inside of cells everywhere on the page, below the seam included, and `56 / 112` govern only the air between bands — `112` on the hero, `56` on every band below it. The bands below the seam are genuinely dense ruled cells inside generous band padding, which is what makes them look like the product rather than like marketing.
- **The fold law, which replaces any `min-height`.** No `min-height` and no `100dvh` on a band; its height is content plus band padding, nothing more. Instead: **no band may be sized such that the next band's top edge falls below the fold at a 900px viewport.** That turns "substance below the fold" from an aspiration into a measurement, and hands whoever composes the bands a real budget — the hero spends about two thirds of it. The law is stated in **pixels and stays that way.** It is deliberately *not* restated as a line count: the lines a pitch may run are a consequence of every other element in the hero, so a line number written here would freeze something this rule does not control. Pixels are the law, characters are what an author controls, lines are only the bridge between them.
- **The route is two bands and a footer.** The painted hero, then one enamel band of the community's real Activities, then the footer. There is no separate schedule band — each Activity is one row carrying both its standing weekly slot and its own next scheduled date, which is also why the Slot Cell does not appear on this surface at all. The page is short on purpose: a page that scrolls with nothing to say is worse than one that stops.
- **Board register below the seam, not marketing register.** The band head is **Title**, not Display. The seam is the material change and nothing else — painted board and Hero above it, the product at its own density below — and that is the whole answer to a page reading as two websites stapled together. Display heads are an asset when the band has data and a liability when it does not, since they announce a section that then says nothing is posted yet.
- **The substance band never disappears.** A community with nothing configured renders it as a single **Blank**-marked strip with one line, never as a dropped band: dropping it leaves a generic poster, and Blank means *expected but not yet placed*, which is the honest state of a community that has just been set up. Per row, the same — an Activity with no scheduled session keeps its row and shows Blank where the date goes.

## Elevation & Depth

Tonal, plus one physical device: a **tile on a board**. Cells are flat at rest against the ground's tonal step. Anything that is genuinely a movable tile — an action, a claimed Seat — carries a hard bottom edge for material thickness plus a tight contact shadow. Nothing floats, nothing glows.

### Shadow Vocabulary

- **Tile rest** (`0 1px 0 <rule>, 0 2px 3px -1px rgb(21 30 27 / 0.14)`): a tile lying on the board. The `0 1px 0` is the tile's own edge; the offset blur is its contact shadow.
- **Tile pressed** (`inset 0 1px 2px rgb(21 30 27 / 0.18)`): a tile pushed into the board on `:active`.

### Named Rules

**The No-Halo Rule.** No zero-offset shadows, no coloured glows, no backdrop blur. Depth is a tile's thickness and the shadow it casts.

## Shapes

Square. `2px` on tiles and cells, `3px` on the header rail — enough to read as a stamped edge, never as a rounded card. Borders are the primary form device: 1px `Ruled Line` around and between cells. No pills except a mark, which is a `2px` hard rectangle. No circles except member avatars — the one genuinely round object on a board, a photo pinned to it.

## Components

*Specified with the user; not yet built. Values here are provisional until a first implementation settles them.*

### The Six Marks

The system's most important component family. Each mark is distinguished by **form first**, colour second, so state survives with colour removed.

| Mark | Form | Colour | Means |
|---|---|---|---|
| **Ink** | Filled rectangle, full-weight label | Court Green wash + ink | Settled and true — a Confirmed Payment, a Present Participant |
| **Tape** | Filled rectangle with a visible torn edge | Tape Ochre wash + ink | Provisional and held — a Pending Payment, a Seat on unverified money |
| **Strike** | Rectangle **plus a real line-through** on the value it marks | Struck Red wash + ink | Void — a Rejected Payment, a cancelled Session |
| **Erased** | Flat, no wash, ground-coloured, label in Secondary Ink | Neutral only | Withdrawn by the member — **Opted Out**. Deliberately colourless: it is a choice, not a failure |
| **Blank** | Dashed outline, no fill | Rule colour only | Expected but not yet placed — an unposted Session, an empty day |
| **Hollow** | Dashed outline in Struck Red, no fill | Struck Red edge only | Expected and failed to happen — a **No-Show**. The shape of a tile that should have been filled |

**Blank and Hollow are never interchangeable.** One means nobody has acted yet; the other means someone should have and didn't.

### Actions

- **Shape:** square tile (`2px`), `12px 20px`, Label typography — tracked caps
- **Primary:** Court Green ground, Enamel Tile text, tile-rest shadow
- **Primary on painted board:** the polarity inverts — Court Green Lit ground carrying **Board Ground ink, never Chalk Ink.** Ground-on-green and its ink both measure 6.82:1; chalk on lit green measures **2.29:1 and is banned.** This is the one way the public route's action can be got wrong, and the token layer already encodes the correct pairing, so it needs no new token — only not being overridden. The action keeps the square tile at every size: a loud action is a **large** tile, never a rounded pill, whatever it gets called in conversation.
- **Hover / Focus:** ground darkens to Graphite Ink; `:focus-visible` draws a 2px Court Green ring offset 2px from the tile edge
- **Active:** tile-pressed inset shadow, no transform
- **Blank action:** Enamel Tile ground, 1px Ruled Line border, Quiet Ink text — an empty slot waiting to be filled
- **A disclosure the label defers to is not fine print.** Where an action's label does not state a condition and a sentence beneath it does, that sentence renders at **Body** in Chalk Secondary or Secondary Ink — **never Caption, never the subtle or muted step** — and is tied to the control with `aria-describedby`. A condition disclosed in the fine print is not disclosed, and a screen-reader user who hears only the label has been told exactly the thing the disclosure exists to prevent.

### Cells / Containers

- **Corner:** `2px` · **Background:** Enamel Tile on Enamel Ground · **Border:** 1px Ruled Line, shared with adjacent cells · **Shadow:** none at rest · **Padding:** `10px`, rising to `16px` for a bay

### Inputs / Fields

- **Style:** Enamel Tile ground, 1px Ruled Line, `2px` corner, `10px` padding — a cell you write in
- **Focus:** border goes Court Green, plus a 2px offset ring
- **Error:** border and helper text Struck Red; the message names the problem *and* the fix
- **Read-only:** Enamel Ground fill, so a server-set amount visibly is not yours to edit

### Navigation

Header rail: full-bleed, 1px bottom rule, stencilled community Mark at left, controls at right in tracked caps. **The rail does not wrap.** The mark group shrinks and the controls stay pinned right on one row, at every width — letting it wrap costs 48px of vertical budget on a phone and leaves a ragged gap under the wordmark, and the shrinking mark is why the Never-Bleed Rule exists. The active item is a filled Court Green tile, not an underline. Mobile navigation is a bottom rail of equal cells divided by rules.

### Signature Component: the Slot Cell

The recurring unit of the whole system — one Session on the board. A rule-bounded cell carrying, in fixed positions: the day as Label and date as Figure Lead at top-left; free Seats as `n/max` in Figure, or a mark, at top-right; the Session title as Title; time and venue as Caption; the Activity's livery at the bottom.

**Livery is a magnet tile bearing the Activity's initial, with no colour.** Not a coloured square, and never an edge stripe. Two reasons, both decided: Court Green is the only green permitted, so a member-configured Activity colour would compete with or dissolve into the identity; and an arbitrary hex can never be trusted to carry legible lettering or to clear contrast on both board materials. An initial in ink solves both.

## Do's and Don'ts

### Do:

- **Do** build structure from shared 1px `Ruled Line` borders forming a lattice.
- **Do** keep every corner at `2px` (`3px` on the header rail).
- **Do** give every time, count, capacity, and Rupiah amount `tabular-nums`.
- **Do** give every state a mark whose **form** identifies it, with colour as reinforcement only.
- **Do** render every day in a displayed range, including empty ones.
- **Do** treat the painted board as a second real material, with rules still ≥3:1 and identity separated from ground on both lightness and chroma.
- **Do** collapse the board by axis on mobile, keeping day rows ruled.
- **Do** use the vocabulary in `CONTEXT.md` in component names and user-facing copy — Session, Seat, Dues, Fee, Payment, Proof, Participant, Opted Out, No-Show.

### Don't:

- **Don't** ship same-size icon-plus-heading-plus-text cards as page structure. That is the arrangement this world exists to refuse.
- **Don't** use gaps between floating panels where a shared rule belongs.
- **Don't** introduce a second type family, a serif, or a monospace.
- **Don't** use gradients, gradient text, glass, backdrop blur, or any zero-offset glow.
- **Don't** use green for anything but the identity — no green success state, no green livery, no green chart series.
- **Don't** communicate any state by colour alone, and don't let a mark colour carry navigation or branding.
- **Don't** put a coloured accent line on a neutral cell, in any direction, at any width.
- **Don't** exceed `3rem` display type **on a board surface**, or track tighter than `-0.04em` anywhere. The public route's Hero role runs to `5rem`; nothing else does, and lint is what keeps it there.
- **Don't** repeat the painted board anywhere but the public route's hero band. One material change is a statement, two is a pattern, and a pattern stops reading as emphasis — which bars the obvious closing bookend at the page foot.
- **Don't** put this document's own metaphor — board, tile, rail, lattice — into user-facing copy. It names the design, not the product.
- **Don't** let the mobile board become an unruled card list.
