# Where the tile sits vertically

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Blocked by: — (03 resolved)
Parent: ../map.md

## Question

The page is `flex min-h-dvh flex-col` with
`<main className='flex flex-1 items-center justify-center …'>`, so the tile is
centred both ways in the viewport. On a tall desktop window that leaves a large
empty field of `bg-background` above and below a hairline-bordered tile, which is
a substantial part of why the page reads as unfinished.

Two facts from ticket 01 make this a real decision rather than a preference:
DESIGN.md **does not address vertical placement at all**, and commit `dd95ac5`
lists "The centred hero" among the things it removed — yet `items-center
justify-center` is still on the `main`. Either the commit message overstated what
changed, or the centring survived by oversight. Establish which, then decide:

- **Anchor to the top**, below the identity rail, with a spacing step of clear
  air above it. Treats the tile as a plate pinned to a board — consistent with
  "this is a board, and a board is full" (`DESIGN.md:215`) — and removes the
  floating-in-a-void quality.
- **Keep it centred**, and accept the empty field as intentional calm for a page
  whose only job is one action.
- **Centre within a bounded band** rather than the full viewport height, so it
  stops drifting on very tall windows without pinning to the top.

Blocked by 03 because the tile's finished height determines how much empty field
there actually is — a taller, better-framed tile may make centring read fine.

Settle also: whether the footer should stay pinned to the bottom of the viewport
or follow the content, since it is currently stranded far from the tile by the
same centring.

## Inputs settled by ticket 02

- **The human named this ticket's defect directly**, unprompted: *"the position
  alignment also weird, footer also weird, all about landing page is so
  unbalance."* So this is a confirmed defect, not a preference call — the only
  question left is which of the three options fixes it.
- **Diagnosis carried over from 02:** the footer is not itself defective. A
  one-screen page that centres a small tile in a void is what strands it. Whatever
  this ticket decides about the tile very likely decides the footer too, which is
  why the map now expects 04 to absorb the parked footer question rather than
  leaving it as fog.
- **The tile gets shorter, not taller.** 02 replaced a four-line 48px block with a
  two-line statement plus one body sentence. So the hypothesis in the paragraph
  above — "a taller, better-framed tile may make centring read fine" — is now
  *less* likely to hold, and the empty field above and below grows.
- **Scope fence, confirmed with the human:** the fix is alignment and anchoring
  only. Adding sections to fill the space is ruled out — no pitch, no feature
  grid, no fabricated proof (`PRODUCT.md:94`). Reference material the human
  supplied (`playbypoint.com`) is a marketing site; borrow its left-aligned,
  top-anchored discipline, not its content.

## Inputs settled by ticket 03

- **The tile's finished height is ~320px** at 1440×900 (`p-bay` both halves,
  two-line statement, one body line). Measured off the prototype, not estimated.
- **The blocking hypothesis is disproved.** This ticket was blocked by 03 on the
  chance that "a taller, better-framed tile may make centring read fine". Better
  framing added ~50px of tile and left roughly **250px of empty
  `bg-background` above and below** at that window size. Centring is still the
  defect; the framing decision does not rescue it.
- **The framing is now fixed and off the table** — 28px uniform. Whatever this
  ticket decides about vertical anchoring must work with that tile as-is; do not
  reopen padding to solve a placement problem.

## Answer

**Top-anchor the tile inside the same 72rem board container the rail and footer
already use, keep the footer pinned to the viewport bottom, keep `py-bay` (28px)
as the air above.** Two class changes on one element; the token layer, DESIGN.md
and the tile itself are all untouched.

```
- <main className='flex flex-1 items-center justify-center px-block py-bay'>
+ <main className={`mx-auto flex w-full ${BOARD_WIDTH_CLASS} flex-1 items-start justify-start px-block py-bay`}>
```

### The premise question, settled — and it was a false dichotomy

The ticket asked whether `dd95ac5` overstated its removal of "the centred hero"
or whether the centring survived by oversight. **Neither.**

- `dd95ac5^:src/app/page.tsx` contains **no vertical centring at all**. The hero
  it removed was `<section className='text-center py-20 px-6 max-w-4xl mx-auto'>`
  — horizontal container plus centred *text*, pushed down by padding. That is
  what "the centred hero" named, and it is genuinely gone: no `text-center`
  survives on this page.
- `flex min-h-dvh flex-col` on the shell and `items-center justify-center` on a
  new `<main>` were **written by `dd95ac5` itself** (confirmed at
  `dd95ac5:src/app/page.tsx`). Both are new code, neither is mentioned anywhere
  in the commit body.

So the commit removed marketing centring and, silently, introduced viewport
centring. **There is no recorded intent behind `items-center`** — no authority to
defer to, which is why this resolved as a free decision rather than as reverting
someone's choice. Per the map's Notes authority order, a commit body could not
have outranked DESIGN.md here anyway; as it happens it does not even conflict.

### Two facts that decided it

- **The signed-in app never vertically centres.** `(main)/layout.tsx:33-34` is
  `main flex-1 overflow-y-auto p-4 md:p-6` wrapping `mx-auto w-full max-w-2xl` —
  top-anchored, every member page. Vertical centring on this codebase appears
  only on `onboarding`, `auth/signin`, `auth/error` and `auth/dev`. The landing
  page had put itself in the throwaway-interstitial family rather than the board
  family.
- **The horizontal misalignment is measurable, and nobody had named it.** Rail
  and footer are `max-w-[72rem] mx-auto px-block`, so at 1440px the identity
  logo's left edge lands at 160px. `main` centred a `40rem` tile in the **full**
  viewport width, putting its left edge at 400px. Nothing on the page shared a
  left edge with anything else — a 240px offset between the community name and
  the statement that names what the community is for. This is at least half of
  the human's *"the position alignment also weird"* and it is not a vertical
  problem at all.

### Resolved decisions

1. **Anchor: top.** `items-start`, air above from the existing `py-bay`. Option
   (b) keep-centred is the confirmed defect and 03 disproved the one hypothesis
   that could have rescued it. Option (c) bounded band was rejected as a magic
   number — no token and no rule gives a band height, so it would have been a
   number invented to make a defect drift less.
2. **Container: the board's own.** `main` reuses `BOARD_WIDTH_CLASS` (72rem) with
   `mx-auto px-block`, and the tile becomes a `40rem` child at flex-start. The
   shared left edge is then *structural* — one gutter, three things hanging off
   it — rather than two containers coincidentally agreeing. This is
   `DESIGN.md:215` read literally: a single-task column resting on a board
   surface. Accepted knowingly: above a 72rem viewport the tile stops moving and
   the void grows to its right; below 64rem the cap stops binding, the tile fills
   the gutter, and mobile is identical to 03's 390px captures.
3. **Air above: `py-bay` (28px), unchanged.** 03 refused a fifth spacing step to
   fix a proportion problem and the same logic binds here. It also happens to
   equal the tile's own `p-bay`, so rule → air → statement reads as one
   continuous 28px rhythm. **No token added, no exception taken** — the second
   consecutive ticket to land inside the existing scale.
4. **Footer: stays pinned** to the viewport bottom (`min-h-dvh` + `flex-1`
   retained). Letting it follow the content on a `min-h-dvh` page only moves the
   void *below* the footer, which reads as broken rather than calm. Pinned, the
   slack becomes one bounded field between tile and a rule that closes the page —
   a board with room on it, instead of a tile floating in nothing. **02's
   diagnosis is confirmed rather than overturned: the footer was never defective,
   the centring stranded it.** The map's parked footer question is absorbed here
   and needs no ticket of its own.

### Drafted rule, handed to ticket 05

04 does not amend DESIGN.md — 05 owns that document and two tickets must not own
one file. Candidate text, for 05 to accept or reject:

> Board surfaces top-anchor their content below the identity rail and share the
> `72rem` gutter. Vertical centring is reserved for interstitials that own the
> whole viewport.

This closes ticket 01's silence 3 ("vertical placement is unaddressed") if 05
takes it. Note the second sentence is what makes `onboarding`, `auth/error` and
`auth/dev` a **sanctioned exception rather than four new defects** — without it,
the rule indicts them. `auth/signin` is already out of scope on the map.

### Scope held

No section added, no pitch, no fabricated proof. The tile is byte-identical to
03's resolution. The reference material (`playbypoint.com`) contributed its
top-anchored, left-aligned discipline and none of its content, exactly as 02's
scope fence required.
