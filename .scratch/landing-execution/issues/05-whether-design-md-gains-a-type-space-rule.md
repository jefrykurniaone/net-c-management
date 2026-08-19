# Whether DESIGN.md gains a type-to-space rule

Type: grilling
Status: closed
Blocked by: — (03, 04 resolved)
Parent: ../map.md

## Question

Tickets 02–04 will settle this page. This ticket decides whether anything learned
gets written back into the system, so the next surface using `type-display` does
not rediscover the same gap.

Ticket 01 established three silences in DESIGN.md:

1. No rule pairs type size with padding, and the spacing scale stops at 28px
   while display type reaches 48px.
2. `type-display` has no documented maximum line or character count.
3. Vertical placement is unaddressed entirely.

For each, decide: **amend DESIGN.md, or leave the silence deliberate?** A design
system that documents eight type roles and a four-step spacing rhythm to this
level of precision is unlikely to have left these out on purpose — but adding
rules has a cost, and an over-specified system is its own failure. It is a
legitimate answer that these stay judgement calls.

If any answer is "amend", this ticket also decides the wording, since DESIGN.md
is written in a distinct voice ("a board is read, not shouted at", "Nothing
floats, nothing glows") that a bolted-on rule would break.

Worth noting while deciding: `src/app/styles/board-materials.css:9-14, 96-102,
147-150` shows the established pattern for a sanctioned deviation — the override
sits in the token layer with the reason in a comment, rather than DESIGN.md being
rewritten. A one-off exception may belong there instead.

Blocked by 03 and 04 because there is nothing to generalise until the concrete
decisions exist.

## Inputs settled by ticket 02

Silence 2 now has a concrete decision behind it, and a fourth candidate rule has
appeared:

- **Display line cap.** 02 capped `type-display` at **two lines**, enforced by
  authoring copy short enough rather than by loosening `line-height` per instance.
  Decide whether that becomes a documented rule ("display copy is written to two
  lines at the cap") or stays this page's judgement call. Note the enforcement
  mechanism is a *copy* constraint, which DESIGN.md does not currently legislate
  at all — it may belong in PRODUCT.md's voice section instead, if one exists.
- **The 17px cliff.** 02 accepted rather than filled the gap between
  `type-display` (28–48px) and `type-title` (17px), explicitly deferring "add a
  type role" as over-specification argued from one surface. If a second surface
  ever needs that middle size, this is the decision to revisit — worth recording
  as a known gap even if no rule is added.
- **New candidate: internal design vocabulary must not appear in user copy.** 02
  found `landing.purpose` had leaked DESIGN.md's "board" metaphor to users. It was
  one string in two locales, so no cleanup effort is needed — but nothing
  currently *stops* the next writer doing it again, and DESIGN.md's whole voice is
  built on that metaphor. Decide whether this earns a line somewhere, and if so
  whether it belongs in DESIGN.md or PRODUCT.md.

## Inputs settled by ticket 03

Silence 1 — "no rule pairs type size with padding" — now has evidence, and it
cuts *against* amending:

- **The scale was sufficient.** 03 framed 48px display type with `bay` (28px),
  the existing top of the scale. **No fifth token was added and no one-off
  exception was taken in the token layer** — so the pattern at
  `board-materials.css:9-14` was not needed either.
- **40px was tried and rejected on density grounds**, not on taste: 12px more
  void has to be argued for against `DESIGN.md:215` "a board is full", and it
  could not be. That is a usable general principle if this ticket wants one.
- **A real second-order effect was found:** container padding decides where large
  type breaks. `p-block` gave the statement one line, `p-bay` cut it to two. Any
  rule written here should reckon with the fact that padding and the display
  line cap are the *same* decision, not two.
- **The one directional rule in DESIGN.md:213 was found ambiguous.** "More space
  above a heading than below it" reads naturally as governing a heading inside
  flowing content; 03 had to decide it is already satisfied by a container's own
  top padding when the heading opens that container. If any amendment is made,
  disambiguating that sentence is the cheapest one available.
- **Mobile needed no rule.** The type clamp did all the collapsing; padding held
  constant from 1440px to 390px.

## Inputs settled by ticket 04

Silence 3 — "vertical placement is unaddressed entirely" — arrives with a
**drafted rule and a deliberate hand-off**: 04 decided the page but refused to
amend DESIGN.md, on the grounds that two tickets must not own one document. So
this is now a straight accept/reject/reword on concrete text:

> Board surfaces top-anchor their content below the identity rail and share the
> `72rem` gutter. Vertical centring is reserved for interstitials that own the
> whole viewport.

Weigh while deciding:

- **The second sentence is load-bearing, not decoration.** `onboarding`,
  `auth/error` and `auth/dev` are all `min-h-screen flex items-center
  justify-center`. Without the reservation clause the rule indicts four existing
  routes; with it they are a sanctioned exception. Dropping the sentence for
  brevity therefore has a cost measured in false defects.
- **This silence bit hardest of the three.** 01 called vertical placement
  unaddressed, and the consequence was a page that had drifted into the
  interstitial family without anyone deciding it — plus a 240px horizontal
  misalignment nobody had named until 04 measured it. Unlike silence 1, the
  evidence here cuts **for** amending.
- **The gutter half may be the more valuable half.** 04's real find was that
  `max-w-[72rem]` was applied to the rail and footer but not to `main`, so
  "containers max at 72rem" (`DESIGN.md:215`) read as a *cap* rather than as a
  *shared gutter things align to*. That is arguably a disambiguation of an
  existing sentence rather than a new rule — the same cheap kind of fix 03
  identified for `DESIGN.md:213`. Two disambiguations of line 213/215 may be a
  better-value amendment than any new rule.
- **Third consecutive ticket to add nothing to the token layer.** 02 added no
  type role, 03 added no spacing token, 04 added no token and took no exception.
  Whatever this ticket writes, the pattern to record is that the existing scale
  held for a 48px display statement on a full-viewport surface — which is
  evidence for documenting *judgement*, not for documenting *numbers*.

Note: 04 also absorbed the map's parked rail/footer fog, so **the map's "Not yet
specified" section is empty** — this is the last open ticket, and the destination
is reached when it resolves.

## Resolution

**DESIGN.md is amended — four edits, all small, none of them a type-to-space
rule.** The through-line: document *judgement and alignment*, not *numbers*. Three
consecutive tickets added nothing to the token layer, so the scale is not what was
missing; the ambiguity in two existing sentences was.

Decided with the human, six questions, all recommendations accepted.

### 1. Silence 1 — no type-to-space rule. Left silent deliberately.

Type size is **not** paired with padding. 03 framed 48px display type with `bay`
(28px), added no fifth token and took no exception in the token layer, so there is
no gap to legislate. The derivation is cheap to redo (try 16/28/40, argue each
against `DESIGN.md:215` "a board is full") and a pairing table would be
over-specification argued from one surface. **This silence is now a decision, not
an oversight.**

### 2. Silence 3 — vertical placement is now ruled. 04's draft accepted.

Both sentences, into the Layout section. The reservation clause was kept because it
is load-bearing: `onboarding`, `auth/error` and `auth/dev` are all `min-h-screen
flex items-center justify-center`, and without it the rule indicts four live routes
instead of sanctioning them.

### 3. Both `213`/`215` disambiguations made — the highest-value half.

- `DESIGN.md:213` now reads "More space above a heading than below it — a heading
  that opens its container already has that space in the container's own top
  padding." Closes the reading 03 had to rule on by hand.
- `DESIGN.md:215` now states the `72rem` is a **shared gutter, not only a cap**,
  aligned to by every board surface, rail and footer included. This is the sentence
  whose misreading left `main` 240px out of line — a real defect traced to
  wording, which is why 04's sentence 1 could shorten to just the top-anchor half.

### 4. The two-line display cap is a documented rule, appended to `197`.

It landed next to the existing 3rem cap rather than being split into PRODUCT.md's
Voice bullet, because the copy half and the layout half are one fact: **container
padding, never a per-instance `line-height`, sets where display type breaks.**
Sending the copy constraint to PRODUCT.md would have severed it from the padding
fact that makes it true.

### 5. The vocabulary leak earns a Don't line, mirroring the existing Do.

> **Don't** put this document's own metaphor — board, tile, rail, lattice — into
> user-facing copy. It names the design, not the product.

`DESIGN.md:297` already said *do* use CONTEXT.md's vocabulary in user copy; only
the negative half was missing, which is how `landing.purpose` shipped the metaphor
to users. The Don't sits next to its positive twin — no new section, no PRODUCT.md
change.

### 6. The 17px cliff is recorded on the map, not in DESIGN.md.

DESIGN.md is a specification, not a changelog; a "considered and declined" note
reads as hedging inside it. The gap between `type-display` (28–48px) and
`type-title` (17px) stays a known fact in ticket 02 and one line on the map. A
second surface needing the middle size is the trigger to revisit — and by then
there are two data points instead of one.

### Not done

- No token added, no token-layer exception taken. The pattern at
  `board-materials.css:9-14` was not needed by any of 02–05.
- PRODUCT.md untouched.
- The page diff itself is not this ticket's, and not this map's — the destination
  is the decisions plus the amendment.
