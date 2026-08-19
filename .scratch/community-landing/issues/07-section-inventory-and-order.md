# What bands the page is made of, and in what order

Type: prototype
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocked by: 01, 02, 03, 04, 06, 08, 10
Blocks: 09, 12

## Question

With brand, type, layout, publishable data, actions, and copy authority all
settled, what is the page's actual composition — the ordered list of bands from
rail to footer, each with its job, its data source, and its behaviour when that
data is empty?

The reference's order is: rail → hero statement → subtitle → CTA → logo strip.
Its fourth band is social proof this product cannot have (`PRODUCT.md:94`), so
the substitute is 04's real data. That is not a swap of equal weight and the
composition has to earn the fold some other way.

Resolve by building a rough prototype — cheap and throwaway — so the human
reacts to something concrete rather than to a list. Link the artefact from this
ticket; do not paste it in.

**Binding from 08 (resolved — not reopenable here):**

- **The Activity band is not optional.** 08 ruled that copy is generic and
  identity comes from data, so the Activity band is the page's *only*
  per-community substance. Cutting or deferring it leaves a generic poster.
- **The band inventory is also the dictionary's shape.** `landing` restructures
  into one sub-block per band (`landing.hero.*`, `landing.activities.*`, …), each
  holding that band's heading, body, and **empty string**. A band whose empty
  behaviour is unspecified therefore has no dictionary block either.
- **Nothing on `/` may contain "XClub"**, and `brand.tagline` is banned from the
  route. The replacement `<title>` / description graduates out of the map's fog
  once this ticket lands.

Sub-questions:

- The band list and order, each with: job, data source, empty behaviour.
- **Every band must state its empty behaviour — this is a required field, not an
  afterthought.** The map's "empty community" fog was folded into this ticket:
  a fresh deployment has no Activities and no Sessions, so 04's real-data bands
  all render empty on a page whose entire job is to convince. `PRODUCT.md:103`
  makes empty the default state. A band with no answer here is not specified.
- 04 narrowed what the data bands can carry: no counts of people, no capacity,
  no admin free text, no per-session location. The proof band is activities
  (name, icon, colour, weekly slot, standing venue, fee) and the next three
  scheduled sessions — nothing else. Compose within that, or rule it out of scope.
- Where the second CTA sits, if 06 said there is one.
- Mobile: `PRODUCT.md:13` says members are mobile-first, one-handed. A stranger
  arriving from a WhatsApp link is on a phone. Does the prototype start at
  mobile width rather than desktop?
- How the marketing bands hand off to the board's own density
  (`DESIGN.md:215`) without the page reading as two websites stapled together.
- Page length: is one screen enough, or does the page scroll? The reference
  scrolls. A page that scrolls with nothing to say is worse than a short one.

## Prototype (asset — **B won**)

Built per `/prototype`, UI branch: **one throwaway route, three structurally
different band inventories**, switchable from the same floating bar ticket 11
used (dev-gated, hidden in production). `←` / `→` cycle variants.

`npm run dev` → `http://localhost:3000/prototype/landing?variant=A`

Toggles, all on the bar:

- `?variant=A|B|C` — the three inventories
- `?data=demo|real|sparse|empty` — `demo` is synthesised so composition can be
  judged against a dev DB that has nothing in it; `real` reads ticket 04's
  allow-list from Postgres; `sparse` is one Activity and no Sessions; **`empty`
  is a fresh deployment**, which `PRODUCT.md:103` makes the default state
- `?lang=en|id` — the longer Indonesian
- `?w=phone` — a 390px frame that *also* swaps the hero and wordmark type's `vw`
  for `cqw`, so the type really shrinks instead of sitting at desktop size in a
  narrow box
- `?name=<text>` — override the community name. `PRODUCT.md:86,88` makes the name
  runtime config that every surface must survive, and the rail's and hero's worst
  failures are only reproducible with a name nobody has in a dev database

**The hero is identical in all three.** Ticket 06 decision 8 closed its
inventory at six elements, so every visible difference is this ticket's to
decide.

### The three inventories

- **A — Ledger.** Hero → Activities → Schedule → closing CTA → footer. Four
  bands, the longest page, and the only one that keeps a *marketing register*
  below the seam (`type-display` band heads). Argues "what you can play" and
  "when it next happens" are two questions asked in that order, so they get two
  bands and two empty states. Both bands always render.
- **B — One board.** Hero → one fused band → footer. Each Activity carries its
  own next date on its own row; there is no separate schedule list. Title-weight
  head, board density, no marketing register — the strongest available answer to
  "how does this not read as two websites stapled together". Second CTA is a
  quiet text line at the band's foot.
- **C — Schedule-led.** Hero → Schedule → Activities → footer, and **no second
  CTA anywhere**. Argues dates answer "is anything actually happening" harder
  than standing arrangements do, and that repeating the pill dilutes 06's one
  loud action.

### How each answers the required field, empty behaviour

- **A renders the empty shape.** Both bands stay, each with a **Blank** mark and
  one line — `DESIGN.md:217`'s "every day in a displayed range gets a cell"
  logic applied to bands.
- **B shrinks but survives.** The single band collapses to one Blank-marked
  strip, so an empty community still gets a page with a shape.
- **C drops empty bands entirely**, so a fresh deployment falls all the way back
  to **hero + footer**. That is precisely the "generic poster" 08 warned about,
  and `07-C-empty.png` is what it looks like. Putting it on screen was cheaper
  than arguing about it.

### Measured, not estimated — and one law is breached

Rendered at 1440×900 and measured in the DOM. Rail is 57px; hero band height is
driven entirely by how many lines the pitch takes:

| pitch lines | hero band | next band's top edge | 03's 900px law |
|---|---|---|---|
| 2 | 628px | 685px | ✅ |
| 3 | 704px | 761px | ✅ |
| 4 | 780px | 837px | ✅ |
| 5 | 856px | **913px** | ❌ **breached** |

Two consequences, both facts rather than opinions:

1. **03's hero estimate was low.** It put the hero at 560–600px and 06 added
   ~60px, landing at ~660. The real number on `en` is **704px**. The law still
   passes with 139px to spare, so decision 7 holds — but the margin is what 03
   and 06 both suspected, and it is now measured.
2. **02's character budget and 03's fold law are in conflict on `id`.** 02
   budgeted "3 lines max at the cap, ≈54 characters on `id`". The prototype's
   59-character Indonesian pitch renders **5 lines** and pushes the next band's
   top edge to **913px — past the fold**. It is not marginal: **45 characters
   already produces 4 lines** on `id`, and only ~28–30 characters holds 3. The
   real ceiling is **4 lines / 837px**, and ≈54 characters does not stay under
   it. Either the `id` budget drops to roughly **45 characters**, or the fold
   law accepts 4 lines explicitly, or `type-hero`'s `5rem` cap comes down on
   `id`. **This is a decision, and it is not 07's** — it belongs back with 02
   and 03, and 09 must not write the ≈54 figure into `DESIGN.md` until it is
   settled.

### What building it also surfaced

- **The Slot Cell runs with a hole in it.** `DESIGN.md:282` puts free Seats as
  `n/max` at the Slot Cell's top-right; 04 rule 3 bans every capacity figure
  from an unauthenticated page. On `/` the signature component therefore renders
  with its top-right empty. Nobody has ruled on whether that is acceptable or
  whether `/` should use a different row shape.
- **A painted-board bookend is illegal.** The obvious closing composition —
  repeat the hero's board at the page foot — is barred by 01 decision 4, which
  confines painted board to the hero. A's closing band takes the *enamel* accent
  instead, and at full width it is a large slab of the identity green
  (`07-A-full.png`). Whether that reads as a second CTA or as a stray coloured
  field is a look-at-it question.
- **`Activity.color` is published and then discarded.** 04 publishes it;
  `DESIGN.md:284` says livery is a magnet tile bearing the initial **with no
  colour**. All three variants render the initial and drop the hex. Worth
  confirming that 04 publishing a field the design law refuses to render is
  intended rather than an oversight.
- **A's marketing register makes emptiness louder.** On `?data=empty`, two
  `type-display` headings announce sections that contain "Nothing has been
  posted here yet" (`07-A-empty.png`). The Display head is an asset when there
  is data and a liability when there is not.
- **B's compactness is desktop-only.** At 390px the fused row stacks into three
  tiers (name/slot, next date, fee), so it converges with A and C — but without
  their section headings telling you which tier is which (`07-B-phone-id.png`).
- **The activity row had a real mobile break**, found by rendering: the fee
  column crushed the weekly-slot caption into a four-line ragged column at
  390px. Fixed in the prototype by giving the text block a `14rem` floor so the
  fee wraps to its own line. Mentioned because it is a constraint on the row,
  not a prototype bug.

### Four defects the human caught at phone width, and what they cost

Reported in two rounds — "the header is overlapping", then "moon icon still
overlap" against a screenshot. Both were right, and chasing them properly turned
up two further failures nobody had asked about. All four are constraints on the
real build, not prototype bugs.

1. **The identity rail wrapped to two rows: 105px.** `flex-wrap` plus `ml-auto`
   pushed the theme and language controls onto a second row, leaving a ragged
   gap under the wordmark. Dropping the wrap and letting the mark group shrink
   (`min-w-0 flex-1`) puts the controls back on one row and the rail at **57px**
   — the same height it has on desktop. **48px of fold budget recovered on a
   phone.**
2. **That fix caused a real overlap: the wordmark painted over the theme
   toggle.** Squeezing the mark group made its column narrower than the longest
   word in the name, and because a `<span>`'s glyphs are not clipped by its box,
   `COMMUNITY` printed straight across the moon icon — the second report.
   Measuring *element* boxes said there was no collision (`markGroup.right` 236
   vs `controls.left` 252); only measuring **painted glyph rects** via
   `Range.getClientRects()` showed it. Worth remembering: for an overflow bug,
   the element box is the wrong instrument.

   Fixed with `min-w-0` + `break-words` on the wordmark, which is a
   **guarantee, not a preference**. `page.tsx` says the name must never
   truncate; that rule was written when the alternative was truncation, and it
   never considered a control being buried. An unreachable theme toggle is a
   functional failure where a mid-word break is cosmetic, so the order is: wrap
   at spaces first, break mid-word only as a last resort, never overlap.
   Verified with a 43-character single-word name — 5 lines, rail grows to 111px,
   **16px of clearance, no collision, no horizontal page overflow**.
3. **The same bug, worse, in the hero — and nobody had looked.** With that long
   name the hero's wordmark bled off **both** edges of the screen
   (`assets/07-B-rail-longname.png`). Tracked caps at `0.14em` make the wordmark
   the widest element per character on the page, so it is the **first** thing to
   fail an unknown community name, not the last — and `PRODUCT.md:86,88` says
   every surface must survive one. Same fix, same reasoning
   (`assets/07-B-longname-fixed.png`).

   This one is 01's business as much as 07's: 01 decided identity in the hero is
   the community name as a wordmark in Chalk Ink, and that decision needs the
   overflow guarantee attached to it or the next person re-implements the bug.
4. **`type-hero`'s floor overflows the band on a phone — a second breach of 02.**
   At 390px the band offers **354px** of measure. The Indonesian pitch's longest
   word, `MEMAINKANNYA.`, renders **371px** at 02's `2.5rem` floor, so the
   statement bled past the band's padding to within **2px of the screen edge**.
   Measured across sizes: 40px → 371px (overflows), 38px → 353px (1px of
   margin), **36px → 334px (fits)**. The prototype now runs a `2.25rem` floor
   and the bleed is **0px on both sides**.

   Note what this is: 02's role definition fails on the **floor**, not the cap,
   and it fails specifically on Indonesian, on the form factor `PRODUCT.md:13`
   says the audience uses. That is a different failure from the fold-budget
   breach above, and the two together are why the `type-hero` question goes back
   to 02 as its own ticket rather than being patched here.

**A note on the instrument, because it nearly hid two of these.** The phone frame
was built with `container-type: inline-size` and a `cqw` swap for the hero type,
but the *rail's* `type-mark` was left on `2.4vw` — which reads the real viewport,
not the frame. So inside a 390px frame on a 1440px screen the wordmark rendered
at **24px instead of 18px**, and the frame both exaggerated the overlap and
mis-reported the rail's height (117px vs a real phone's 105px). Every
viewport-relative unit in a framed prototype is a lie unless it is swapped;
`?w=phone` now swaps both. **Anything measured in the frame was re-checked at a
real 390×844 viewport before being written down here.**

### Screenshots

`.scratch/community-landing/assets/` — `07-A-fold-900.png` (the fold at 900px),
`07-A-full.png`, `07-B-full.png`, `07-C-full.png`, `07-A-empty.png`,
`07-C-empty.png` (the poster), `07-A-id-fold.png` (the fold breach),
`07-A-phone.png`, `07-B-phone-id.png`, `07-B-real390-header.png` (the rail and
pitch defects at a real 390px viewport), `07-B-rail-longname.png` (a 43-character
single-word name bleeding out of the hero) and `07-B-longname-fixed.png` (the
same name contained), plus the two that show the winner as it stands:
**`07-B-final-desktop.png`** and **`07-B-phone-fixed.png`**.

### Files

- `src/app/prototype/landing/{page.tsx,parts.tsx,variants.tsx,proto-copy.ts,stub-action.ts}`

Honest about: **nothing writes** — the hero's form is a no-op stub, because
wiring the real `continueWithGoogle()` would send anyone poking at variants
through a live Google OAuth round trip. **Copy is local, not dictionary** —
`proto-copy.ts` is already shaped the way 08 asked for (one block per band, each
carrying heading, body and empty string) so the winner transcribes rather than
redesigns. `type-hero` is defined inline rather than added to `type-roles.css`,
since that file is real code and this is throwaway. **Not committed to a
throwaway branch**, same reason ticket 11 gave: the tree carries uncommitted work
from concurrent sessions on this map. `npx tsc --noEmit` and `eslint` are clean;
SonarLint diagnostics were not read (no IDE channel in this session).

### What the human's reaction has to settle

1. **Two bands (A/C) or one fused board (B)?**
2. **If two: which comes first — Activities or Schedule?** A says what-then-when;
   C says dates first because they prove something is alive.
3. **What happens on an empty community?** Render the Blank shape (A), shrink to
   a strip (B), or drop the band and accept the poster (C)? This is the required
   field and `PRODUCT.md:103` makes it the default state, not the edge case.
4. **Is there a second CTA, and what is it?** A slab band (A), a quiet line (B),
   or nothing (C) — noting a painted-board bookend is barred by 01.
5. **Marketing register or board register below the seam?** `type-display` band
   heads (A) or `type-title` (B/C). This is the "two websites stapled together"
   question, and `07-A-empty.png` shows its worst case.
6. **Does the page scroll, and how far?** A is ~1870px, C ~1740px, B ~1250px.
7. **The `id` pitch budget** — see the breach above. Needs 02 and 03, not just
   an opinion here.

## Answer

**B. The page is two bands and a footer: the painted hero, then *one* board
band, then the footer.** There is no separate schedule section — each Activity
carries its own next date on its own row. Chosen by the human from the prototype
above ("overall i like B"), with the phone-width defects they spotted fixed and
measured.

### The inventory, in order

| # | Band | Job | Data source | Empty behaviour |
|---|---|---|---|---|
| 0 | Identity rail | Say whose board this is; hold the two controls | `Settings.communityName`, `logoUrl` | Never empty — the name always exists |
| 1 | Hero (painted board) | The pitch and the one loud action | `communityName` + dictionary | **Never empty.** Authored copy always renders |
| 2 | The board (enamel) | The only per-community substance | 04's allow-list — active Activities fused with their next `SCHEDULED` session | **Shrinks to a single Blank-marked strip. Never dropped.** |
| 3 | Footer | The quiet second action, and the year | `communityName` + dictionary | Never empty |

### Decisions

1. **Activities and Sessions fuse into one row; there is no schedule band.**
   Each active Activity is one ruled row carrying, in fixed positions: livery
   initial, name, its standing weekly slot and venue, **its own next scheduled
   date**, and its fee. Rejected **A** and **C**, which both split "what you can
   play" from "when it next happens" into two bands — that makes the reader join
   two lists by name, and this product's answer to "when is badminton" has
   always been one row on one board, not two lists.

2. **The board band never disappears.** On a fresh deployment it survives as a
   single **Blank**-marked strip with one line. Rejected **C**'s vanishing
   bands: with no Activities and no Sessions the page falls back to hero +
   footer, which is exactly the generic poster 08 warned about and the map's
   destination explicitly refuses — see `07-C-empty.png`. Rejected also the idea
   that an empty band is embarrassing: `DESIGN.md:217` already holds that
   skipping empty cells turns a board into a short list of cards, and a Blank
   mark is *expected but not yet placed*, which is the honest state of a
   community that has just been set up.

   Per-row, the same rule: an Activity with no scheduled session keeps its row
   and shows the Blank mark where the date goes. The row is never hidden.

3. **Board register below the seam, not marketing register.** The band head is
   **`type-title`**, not `type-display`. This is the ticket's "two websites
   stapled together" question and B answers it structurally: **the seam is the
   material change and nothing else.** Above it, painted board and `type-hero`;
   below it, the product at its own density. Rejected **A**'s `type-display`
   heads on the evidence — they are an asset when there is data and a liability
   when there is not, since on an empty community they become two large
   headings announcing sections that say "nothing has been posted yet"
   (`07-A-empty.png`).

4. **One loud action. The second CTA is a quiet text line at the band's foot.**
   `type-body`, underlined, firing the *same* `continueWithGoogle()` as the
   hero pill — 06 decision 5's inline-form pattern, not a link. Rejected **A**'s
   accent slab: a full-bleed field of the identity green is loud enough to
   compete with the hero's pill, and the composition that would actually work
   there — repeating the painted board as a bookend — is **barred by 01
   decision 4**, which confines painted board to the hero. Rejected **C**'s
   nothing at all: on a phone the page foot is several screens from the pill,
   and a reader who has just been convinced by the board should not have to
   scroll back to act.

5. **The page is short, and that is the point.** ~1250px at 1440×900 — about
   1.4 screens, against A's ~1870px and C's ~1740px. The reference scrolls, but
   this ticket's own criterion was that *a page that scrolls with nothing to say
   is worse than a short one*, and 04's allow-list is deliberately small. B
   spends every pixel below the seam on real data and none on furniture.

6. **B dissolves the Slot Cell problem rather than solving it.** The prototype
   found that `DESIGN.md:282` puts free Seats as `n/max` at a Slot Cell's
   top-right while 04 rule 3 bans every capacity figure from `/`, so under A and
   C the signature component renders with a hole in it. Under B **there is no
   Slot Cell on `/` at all** — session data rides inside an Activity row — so
   the conflict never arises and needs no ruling. (Same shape as 11 decision 3
   making 04's Applicant boundary moot: the cleaner outcome is the one where the
   question stops existing.)

7. **`Activity.color` is published and deliberately never rendered.** Confirmed
   against `DESIGN.md:284`: livery is a magnet tile bearing the initial, with no
   colour, because an admin-chosen hex can neither be trusted to carry legible
   lettering nor to clear contrast on both materials. 04 publishes the field; `/`
   drops it. That is intended, not an oversight — but 04's allow-list should say
   so, which goes to 09 as a one-line correction.

8. **Mobile is the judging width, not an afterthought.** `PRODUCT.md:13` and a
   stranger arriving from a WhatsApp link both put this page on a phone first.
   Four constraints fall out of it, all measured, all binding on the build:

   - The activity text column needs a **`14rem` floor** so the fee wraps to its
     own line instead of crushing the weekly slot into a ragged four-line column.
   - The identity rail **must not `flex-wrap`** — the mark group shrinks and the
     controls stay pinned right on one row. Worth 48px of fold budget (105 → 57).
   - **The wordmark must carry an overflow guarantee, in the rail *and* in the
     hero**: `min-w-0` plus `break-words`, so it wraps at spaces, breaks mid-word
     only as a last resort, and **never paints over a control or out of the
     band**. This is not a nicety — without it the theme toggle sits under a
     glyph and the hero wordmark leaves the screen, on any community whose name
     has one long word. The old "never breaks mid-word" rule in `page.tsx` is
     **superseded**: it was written against truncation, not against burying a
     control, and overlap is the worse failure.
   - **Ordering rule that falls out of the above:** the wordmark is the widest
     element per character on the page (tracked caps at `0.14em`), so it is the
     first thing to fail an unknown name. Any surface rendering the community
     name at `type-mark` needs the same guarantee.

   Accepted cost of B on a phone: the fused row stacks into three tiers and
   loses the section headings that A and C use to say which tier is which.

### The dictionary shape 08 asked for

08 ruled that `landing` restructures into one sub-block per band, each holding
that band's heading, body and empty string. B's inventory makes that **three
blocks**, which is the whole of the answer 08 was waiting on:

- `landing.hero` — pitch, lead, cta, disclosure, alreadyMember. **No empty
  string**: this band is never empty, and that is what lets an unconfigured
  community still have a page.
- `landing.board` — head, body, **empty**, emptyMark, plus the row's own labels
  (fee suffixes, `free`, the weekday names) and the quiet CTA label.
- `landing.footer` — the one line.

`accountNote` is deleted rather than moved, per 08. The prototype's
`proto-copy.ts` is already in this shape, so the winner transcribes rather than
redesigns — and its `id` strings stand as the length budget to hold to.

### Handed to other tickets

- **09 (unblocked by this ticket)** — record the composition: `/` is a public
  band-stack surface of **exactly two bands plus a footer**; the board band
  carries board register (`type-title`), not marketing register; and the
  standing law that **the board band never disappears — an empty community
  renders a Blank strip, never a dropped band**. Plus the one-line correction to
  04's allow-list noting `Activity.color` is published but intentionally never
  rendered on `/`. **09 must not write 02's ≈54-character figure into
  `DESIGN.md`** until the new `type-hero` ticket lands — which is why it now
  blocks 09.

  Also for 09, and wider than this map: **the wordmark overflow guarantee**
  (decision 8). It belongs beside `DESIGN.md`'s Mark role, not buried in a
  landing decision, because *any* surface rendering the community name at
  `type-mark` inherits the failure — and `PRODUCT.md:86,88` already promises
  every surface survives an unknown name without saying how. The `page.tsx`
  comment forbidding a mid-word break needs correcting at the same time.
- **New ticket — `type-hero` fails twice, measured.** Not 07's to decide, and
  bigger than a footnote: 02's role definition breaks 03's fold law on `id`
  (5 lines → next band's top edge at 913px, past 900) *and* overflows the band
  on a 390px phone (`MEMAINKANNYA.` at 371px against 354px available). Both
  numbers are in this ticket. See
  [13](13-type-hero-fails-on-indonesian-and-on-phones.md).
- **Graduated fog — SEO, metadata and OG image.** The map held this pending 07
  settling what the page contains. It does now: a hero pitch and one board of
  real Activities. See
  [12](12-metadata-and-the-og-image.md).
