# Which role carries the purpose sentence

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Blocked by: 01
Parent: ../map.md

## Question

`landing.purpose` is currently a twelve-word sentence with a colon and three
comma clauses — "The board for this community: sessions posted, seats claimed,
dues settled." — set in `type-display`: weight 800, `clamp(1.75rem, 5vw, 3rem)`,
`line-height: 1.02`, `letter-spacing: -0.02em`, inside a `40rem` tile.

At the desktop cap that is 48px type at 1.02 line-height wrapping to four lines,
so consecutive lines very nearly touch. `type-display` is specified for
"page-owning statements" (`DESIGN.md:197`) while prose has its own role at
65–75ch (`DESIGN.md:199`), and ticket 01 established that **no maximum line or
character count for display is documented**.

So: is a twelve-word, three-clause sentence a "page-owning statement", or is it
prose wearing a display role? Decide which of these the page does — and the
answer sets the target length for any copy rewrite, which is why the copy itself
sits in the map's *Not yet specified* rather than here:

- **Split the roles.** Cut a genuinely short statement for `type-display` and
  demote the three-clause enumeration to `type-body`. Keeps a page-owning
  statement at full size and gives the detail a readable measure. Costs a copy
  rewrite in both locales, and adds a second text block inside the tile.
- **Demote wholesale.** Keep the sentence exactly as written and drop it to a
  smaller role (`type-title`, or display's lower clamp bound). No copy change,
  no new block — but the page then has no display-scale statement at all, which
  may be precisely the point given "a board is read, not shouted at".
- **Keep the role, loosen the setting.** Keep sentence and role, but raise
  `line-height` above 1.02 for this instance. Cheapest, and 1.02 at four lines is
  plausibly the whole defect — but it means overriding a type role locally, and
  the roles are meant to be used as defined.

Grill toward one of these. Things to settle while deciding: is four lines
acceptable at any line-height; should the display role gain a documented line
cap (feeds ticket 05); and does the colon survive a rewrite.

## Answer

**Split the roles.** The statement keeps `type-display`; the three-clause
enumeration moves to `type-body`. Resolved by grilling with the human, against
`https://www.playbypoint.com/` as a reference the human supplied.

### The prior question the ticket did not ask

The human rejected the copy outright — *"what is the meaning of the board for
this community, it's so weird to me"* — which exposed a defect upstream of the
type role. **"Board" is the design system's internal metaphor, not a word members
use.** DESIGN.md is built on it ("a board is read, not shouted at",
`DESIGN.md:215` "this is a board, and a board is full"), and the landing copy
leaked that vocabulary out to users who never see DESIGN.md.

The proof it is a leak: **the other door already says it plainly.**
`dictionaries.ts:46` — `auth.signInSubtitle` — reads "Sessions, RSVPs and dues
for your whole community — in one place." Same product, no metaphor. One door
took the metaphor, the other took the plain words.

**Decision: "board" is dropped from all user-facing copy** and stays as internal
design-system vocabulary only. A metaphor that would need teaching on a threshold
page has already failed.

Scope of the leak — grepped `dictionaries.ts` for `board|Board|papan|Papan`: the
only hit outside the word "dashboard" (a real product word, not the metaphor) is
`landing.purpose` itself, at `:39` and `:751`. **The leak is one string in two
locales, not systemic.** No audit ticket needed.

### The reference, read honestly

Two transferable findings, and one thing that cannot be copied:

1. **Structure.** Playbypoint's hero is a category-name heading ("THE ALL-IN-ONE
   CLUB MANAGEMENT PLATFORM") with a *separate, smaller* paragraph doing the
   explaining ("Our software transforms sports clubs into profitable, player
   obsessed businesses"). That is this ticket's split-roles option, validated.
2. **How large type survives.** Their headline is hard-broken into short lines
   (`THE / ALL-IN-ONE / CLUB / MANAGEMENT / PLATFORM`) — it never wraps as prose.
   Big type works by being *cut* into lines, not by being a sentence set large.
3. **What cannot be copied.** It is a marketing site selling software to club
   operators: "1m+ engaged players", "500% Revenue Increase", five named
   testimonials, logo wall, app-store badges, "Get a demo". Reproducing that here
   would require fabricating every number and quote, which `PRODUCT.md:94`
   forbids. Put to the human as an explicit scope fork; they chose to **keep the
   threshold and fix the execution only** (see Destination — unchanged).

### Resolved values

- **`type-display`** carries a new short statement. `landing.purpose` is repointed
  from the metaphor sentence to:
  - `en` — `Sessions, seats and dues.` (25 chars)
  - `id` — `Sesi, kursi, dan iuran.` (23 chars) — "kursi" chosen over "tempat"
    because the existing copy already established it in "kursi diambil".
- **`type-body`** carries the explaining sentence, and **reads
  `auth.signInSubtitle` directly rather than gaining its own key.** Precedent
  exists: `page.tsx:76` already reads `t.auth.signInButton` across the namespace.
  One string, one truth, both doors worded identically — a duplicate key drifts
  the moment someone edits one door.
- **Two lines is the cap for `type-display`,** enforced by authoring the copy
  short enough to guarantee it, *not* by raising `line-height` per instance.
  `1.02` is safe at two lines and ugly at four; a length budget on the string is
  cheaper and more durable than overriding a type role locally. Both strings above
  fit inside 608px of content at the 48px cap.
- **The 17px cliff is accepted, not filled.** Nothing exists between
  `type-display` (28–48px) and `type-title` (17px), and `type-mark` — the
  community name in the rail — is 18–24px. So demoting the statement to
  `type-title` would have set it *smaller than the community name directly above
  it*. Rather than add a type role on the evidence of one surface, the cliff is
  recorded as the fact that rules `type-title` out for a page statement.
- **The body block sits above the shared rule,** joining the statement into one
  "what this is" block. The rule divides what this is from the way in
  (`dd95ac5`: "one tile resting on the ground divided by a shared rule"), and the
  body sentence explains what this is. Below the rule it would sit beside
  `accountNote` and the two differently-sized captions would read as fine print.
- **The colon does not survive.** The new statement has no colon and no clauses.

### Considered and rejected

- **Community name carries display** — move `communityName` into the tile at
  display scale and reduce the rail to logo plus controls. Genuinely attractive:
  it makes the biggest thing on the page the one word the member came for, and it
  fixes a real hierarchy inversion (identity at 24px above purpose at 48px).
  Rejected because `communityName` is runtime-configured with **no documented
  length cap**, and `page.tsx:39-43` states a community failing to read its own
  name is the one thing this page cannot get wrong. It trades a fixable balance
  problem for an unfixable wrap problem.
- **Demote wholesale, no display type at all.** Most literal reading of "a board
  is read, not shouted at", and defensible for a door — but the cliff leaves it
  nowhere sensible to land, and the page then reads as a form under a header rail
  rather than a page.
- **Keep the role, raise `line-height` locally.** Cheapest, and 1.02-at-four-lines
  is plausibly the whole visible defect — but roles are meant to be used as
  defined, and it fixes the symptom while leaving a four-line display statement
  sanctioned for the next surface.

### Consequence for the map

- The copy rewrite is **decided here, not deferred** — it graduates out of *Not
  yet specified*.
- The tile now holds **two** text blocks above the rule, which changes what
  ticket 03 is prototyping.
- The two-line cap and the accept-the-cliff decision are the concrete findings
  ticket 05 weighs for a DESIGN.md amendment.
- Nothing here decides padding, alignment, vertical anchor or the footer. The
  human's remaining complaints — *"position alignment also weird, footer also
  weird, all unbalance"* — land on tickets 03 and 04. Diagnosis recorded there:
  the footer is not itself defective; a one-screen page centring a small tile in
  a void is what strands it.
- **Not implemented.** The map's deliverable is decisions plus any DESIGN.md
  amendment, not the diff. `dictionaries.ts` and `page.tsx` are untouched.
