# Which documents are amended, and how

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocked by: 02, 03, 06, 07, 12, 13 — all closed

## Question

This map changes what `/` is for. That is a product fact, not only a visual one,
and it currently lives in no document — `PRODUCT.md` and `CONTEXT.md` never
mention the landing page, and the previous rationale survives only in the
`dd95ac5` commit body.

What gets written down, where, and in what words?

Candidate amendments, each to be ruled in or out with a reason:

- **PRODUCT.md — the public route exists and who it is for.** Previously ruled
  out of scope as a doc gap; this map's destination makes it a decision, so it
  is back in.
- **PRODUCT.md — the joining policy** authored by 05. Whether joining is
  self-serve, gated, or off-app is a durable constraint, not a page detail.
  *Resolved by 05 as **approval-gated**.* What 05 hands over is five amendments,
  two of which are corrections of text that is wrong today:
  - **CONTEXT.md — two new terms.** **Applicant**: a User who has signed in and
    completed their profile but has not been let into the community. **Admit** /
    **Decline**: the Admin's act on an Applicant. Both need _Avoid_ lists, and
    Admit/Decline must record why they are *not* Confirm/Reject — `CONTEXT.md:83`
    owns those for Payments and bans "approve".
  - **CONTEXT.md:10 — now enforceable rather than decorative.** "Whether they may
    sign in at all is a property of the User" describes a mechanism that ships
    half-built today (`isActive` has an admin control and no reader). Once 05's
    gate lands the sentence becomes true, and the two states behind it —
    never-admitted (`admittedAt IS NULL`) and revoked (`isActive = false`) — are
    distinct and both belong in the language.
  - **PRODUCT.md:46 — "Google is the only way in" is now half the sentence.**
    Google OAuth remains the only authentication, but authentication no longer
    equals admission. Needs the Admin's act stated alongside it.
  - **PRODUCT.md:53 / Capabilities — the gate is a capability**, and self-serve
    joining stops being one. Today the list implies signing in is joining.
  - **PRODUCT.md:71 — factually wrong and must be corrected regardless.** It
    states no email, SMS, or push channel exists; `src/lib/email/` ships Gmail
    SMTP, bilingual templates, and five live triggers. 05's admission email
    depends on that channel, so the correction cannot wait for a tidier moment.
- **PRODUCT.md — what the public route may publish**, from 04. A no-list that
  lives only in a component will be broken by the next component.
- **Copy authority**, per 08. *Resolved by 08 as **dictionary-only**, needing no
  amendment of its own* — `PRODUCT.md:69` already says it. What 08 hands over is
  three amendments, one of them a correction of text that is wrong today:
  - **PRODUCT.md Brand Commitments / Voice — a marketing clause.** Plain, second
    person, no superlatives, no claims about size, popularity, or history. Voice
    is product truth, so it lands here and not in `DESIGN.md`; the last clause is
    `PRODUCT.md:94` restated where a marketing writer would reach past it.
  - **PRODUCT.md:69 — factually wrong, like `:71` beside it.** "Every user-facing
    string goes through `src/lib/i18n/dictionaries.ts`" is false: no template in
    `src/lib/email/` touches the dictionary — all seven inline
    `isId ? '<id>' : '<en>'` for subject, heading, body, row labels and CTA. The
    rule means **every string rendered in the app UI**, and `src/lib/email/` is
    the second copy home. Note the pairing: 05 already found `:71` wrong in the
    other direction (it denies the email channel exists), so one adjacent pair of
    sentences has drifted from the code twice.
  - **DESIGN.md — a character budget on `type-hero`**, placed with the type role
    where an author looks. **The figure is 48 characters on `id`, not 02's ≈54**
    — [13](13-type-hero-fails-on-indonesian-and-on-phones.md) measured ≈54 as
    the first *failing* value, and hands over a second rule (no word longer than
    12 characters) plus a corrected clamp floor. Take all three numbers from 13,
    none from 02 or 08. `DESIGN.md:309`'s metaphor ban needs **no** amendment —
    08 confirmed it already binds `/`.
- **DESIGN.md:197 / 308 — the display cap**, per 02: amended, scoped, or joined
  by a separate marketing role.
- **DESIGN.md:215 — the layout law**, per 03. Note that `215` was *already*
  amended by the superseded map to top-anchor `/`. Superseding text must be
  replaced, not layered on top of, or the doc contradicts itself.
- **DESIGN.md — the accent**, per 01. *Resolved by 01 as needing no amendment:*
  the accent stays Court Green, fixed in code, and no exemption from `180`/`307`
  was granted. What 01 *does* hand over is three other amendments:
  - **DESIGN.md — material is not mode.** The landing hero renders painted board
    regardless of the visitor's theme. Today board material and the dark theme
    are the same thing; this is the first surface where they part.
  - **DESIGN.md:196 — the Mark role gains a second home.** "The only place 900
    appears" (the rail mark) no longer holds: the hero wordmark is the second.
  - **DESIGN.md — `.dark` names a material, not a mode.** `board-materials.css`
    already describes painted board; the theme toggle is one caller of that class,
    not its definition. Wording only — no rename, ruled past the destination.
- Whether the superseded map's own decisions get a marker so a future reader
  doesn't apply a threshold-era rule to a marketing page.

A spec is not a changelog: record rules, not history. Anything that is merely
what-happened stays on this map.

## Answer

**Written, not specified.** The human ruled that this session authors the exact
wording *and* applies it, so the three documents are amended in place:
**`CONTEXT.md` 4 edits, `PRODUCT.md` 12, `DESIGN.md` 12** — the last covering all
19 handed-over amendments. Every code comment stays uncorrected and is recorded
below instead, because the files holding them belong to the build.

Three structural questions were put to the human and settled before a word was
written: **author and apply**; **DESIGN.md hybrid** (in place where a rule is
modified, one new subsection for what has no home); **no superseded marker.**

### Decision 1 — no new `PRODUCT.md` section; every fact threads into an existing heading

`PRODUCT.md:3` carries `<!-- impeccable:product-schema 1 -->`, a **versioned
stamp that tooling reads** (`impeccable/scripts/doctor.mjs:206-209`), and the
schema's own instruction is *preserve useful legacy headings* — not *add new
ones*. The ten headings in the file match the schema exactly. A new `## Public
Surface` heading would put the file off-schema to buy nothing: every landing fact
has a natural existing home, and the ones that read like exceptions
(who `/` is for, what it may publish, whether it is indexed) are Users and
Operating Context questions that happen to be about a route.

### Decision 2 — but `PRODUCT.md` gains a fourth sub-block: **Decided, not yet built**

This is the one structural addition, and it is inside an existing heading rather
than beside it. The map produced a body of binding decisions whose **mechanism
does not exist in the code**: the public page, the admission gate, the metadata.
Neither existing sub-block can hold them honestly.

- **Confirmed capabilities** would claim behaviour that is not there — the
  fabrication `PRODUCT.md:94` exists to prevent, one layer out. A future reader
  scanning capabilities would conclude the gate ships.
- **Explicitly undecided** is false in the other direction. They are decided;
  what is missing is the diff.

So a third state gets a name. It also gives 05's defect an honest place to sit:
*until it lands, signing in still joins, and the deactivation control on the
member roster still writes a flag nothing reads.* That sentence is true today and
becomes false when the gate ships, which is exactly what the block is for.

The **Confirmed capabilities** list is therefore left factually intact — today
onboarding *is* self-serve — with one clause added to the onboarding line marking
it a defect and pointing at the new block. That discharges 05's "the list implies
signing in is joining" without writing a claim that is currently untrue.

### Decision 3 — `DESIGN.md` is hybrid, on 08's own principle

Every amendment that **modifies an existing role, token, or law is edited at its
own line**; the `/`-specific composition, which has no existing home, gets one
named subsection under Layout, **The public band-stack surface**.

The principle is 08's, generalised: it placed the character budget "with the type
role, where a future author looks." An author reaching for the Mark role must
find the Never-Bleed Rule there, not in a landing section they have no reason to
open. And the one-new-section alternative fails hard on its own terms — it leaves
`:196`'s "the only place 900 appears" and `:308`'s bare `3rem` Don't **standing
and wrong**, contradicted from elsewhere in the same document. A spec that
argues with itself is worse than one that is merely incomplete.

Three Named Rules are new. They earn names because each is a rule with more than
one caller: **The Pitch Budget Rule**, **The Never-Bleed Rule** (Typography),
**The Material-Is-Not-Mode Rule** (Colors). Unnamed, each would have been a
parenthesis inside a role bullet, invisible to the next surface that needs it.

**Hero is placed between Mark and Display**, which is the only position with both
neighbours it needs: adjacent to Mark for the tracked-versus-tight distinction
(the other 900 role), adjacent to Display for the size ratio and the lint that
keeps them apart.

### Decision 4 — no superseded marker, anywhere

The ticket's own closing rule — *a spec is not a changelog* — applies to itself.
Superseded text is **replaced, not layered on**: `:197` is rewritten so it no
longer describes the threshold tile it was authored for, `:215` gains the
band-stack exception, and neither carries a note about what it used to say. The
superseded map already carries its own banner
(`.scratch/landing-execution/map.md:5`), which is where provenance belongs. A
marker in `DESIGN.md` would start the document carrying history, and a pointer
from a shipped spec into `.scratch/` is worse — the spec must stand alone.

### Decision 5 — `CONTEXT.md` gains two entries, one correction, and one reciprocal ban

- **Applicant** sits immediately after **User** and before **Member**, because
  that is the order of the states. Its entry carries the trap 05 accepted: *an
  Applicant already holds Memberships, and a count of Memberships is not a count
  of Members.* That is the map's own remaining fog stated in language, where the
  survey that clears it will start.
- **Admit / Decline** sits at the end of the People section, mirroring
  **Confirm / Reject**'s shape at the end of Money, and records why it is not
  that pair.
- **Reciprocal ban added, unasked.** `Confirm / Reject` gains `admit, decline` to
  its *Avoid* list and the clause "never the act on a person". The ticket asked
  for the ban in one direction; the drift runs both ways and costs one word to
  close.

### Finding 1 — a third stale sentence in the same block, and it silently shaped a decision

`PRODUCT.md:73` — *"No automated test suite. `docs/test-cases/` holds manual
end-to-end cases and is the only regression net"* — **is false.** `package.json`
ships `"test": "vitest run"` and three suites live in `src/lib/__tests__/`
(`recurring-sessions`, `activity-initial`, `status-mark`).

This matters beyond tidiness, in two directions:

- **13 depends on it.** Decision 7 prescribes a Vitest case for the pitch budget
  and argues it is "exactly what that directory already holds" — an amendment
  resting on a sentence that denies the directory exists.
- **02 reasoned *from* the stale line.** Decision 5: *"This repo has no test
  suite, so lint is the only enforcement surface that exists."* It reached the
  right instrument for the right rule — a syntax pattern is ESLint's job — but
  via a false premise, and 13 later had to pick the other instrument for a rule
  ESLint cannot check. So the amended sentence carries the general form:
  **choose the instrument by what is being checked** — a data property of a value
  in Vitest, a syntax pattern in ESLint, and a rule with neither leaks.

Counting `:69` (08) and `:71` (05), **three of the six Durable-constraints
bullets had drifted from the code, in three different directions**, and two of
them sit adjacent. The drift itself stays here; the spec gets the corrected facts
only.

### Finding 2 — `CONTEXT.md:10` does not become true under 05; it becomes wrongly framed

This ticket predicted that once the gate lands, *"Whether they may sign in at all
is a property of the User"* becomes true. **It does not.** 05 decision 1 is
explicit that **sign-in is open to anyone** and only being *in* is gated — and
11 decision 5 makes that load-bearing rather than incidental: a declined
Applicant has to be **signed in** in order to see the declined interstitial at
all. A gate on sign-in would make that surface unreachable, which is the same
failure 05 rejected when it refused to enforce in the NextAuth `session`
callback.

So the sentence was rewritten rather than activated. What is a property of the
User is **whether they are in the community**, with the two states named and
explicitly not collapsed, plus the consequence that makes the difference visible:
*a User in either state still signs in — they reach the waiting room, not the
community.*

### Finding 3 — "pill" is not a shape this system has

06 and 07 both call the hero's action a **pill**. `DESIGN.md` Shapes says *"No
pills except a mark, which is a `2px` hard rectangle"*, and Actions specifies a
square tile. Nobody decided to round the CTA; "pill" is loose language for *large
loud action*, carried across four tickets without anyone noticing it names a
banned form. Left unwritten, the build ships a rounded button on the one surface
this whole map exists to get right. The Actions entry now states it: **a loud
action is a large tile, never a rounded pill, whatever it gets called in
conversation.**

### Finding 4 — the two new spacing steps arrived unnamed

03 extended the rhythm to `2 / 10 / 16 / 28 / 56 / 112` as **bare numbers**. The
existing four are named in the frontmatter manifest (`hair / cell / block / bay`)
and consumed as tokens; two unnamed steps means the next author writes
`py-[112px]`, a magic number against the coding standards the same document
enforces. Named **`band` (56)** and **`band-lead` (112)**, following the
**Figure / Figure Lead** precedent already in the file for a larger sibling of an
existing role. This is 09's addition, not 03's, and it is flagged as such.

### Finding 5 — two handoffs disagreed, and neither was taken verbatim

02 handoff 6 records the hero pitch measure as `48rem` **"inside the `72rem`
gutter"** — gutter-aligned. 03 decision 2 **centres** it in a full-bleed band.
Same number, opposite anchor. 03's own reconciliation section caught this and
instructed 09 to write the centred reading, which is what happened; the written
rule also states explicitly that **the content is top-anchored, so the
vertical-centring reservation stands untouched**, because the sentence
immediately above it in the same paragraph is the one a reader will assume was
weakened.

### What was refused

A spec is not a changelog, and this is the list of things that were candidates
and are staying on the map:

- **The archaeology.** Which sentence drifted when, that `:69`/`:71`/`:73` are
  adjacent, that 02 reasoned from a false premise. Corrected facts go in the
  spec; how they got wrong stays in Finding 1.
- **Every measurement table.** Character counts to line counts to pixels, the
  contrast arithmetic, the 390px sweep. `DESIGN.md` gets the rule and the
  threshold; 13, 07 and 06 keep the evidence that produced them.
- **Prototype history.** Three inventories, three waiting rooms, which won and
  why. 07 and 11 own it. A spec records the shape that survived, not the ones
  that did not.
- **A sixth Product Principle.** Genuinely considered: the map's two biggest
  product shifts are a public face and a door with a keeper. Refused — both are
  already recorded as Operating Context and as a durable constraint, and a
  principle would be the third copy of the same fact. Recorded here so a later
  reader does not helpfully add one.
- **Build configuration masquerading as law.** The ESLint `no-restricted-syntax`
  entry's literal config, the Vitest case itself, and the activity row's `14rem`
  text-column floor. `DESIGN.md` names the rule and the enforcement mechanism;
  the config is the diff. **The rail's no-wrap constraint went in anyway**, and
  the line between them is worth stating: the row floor governs one row on one
  band, the rail is on *every* surface in the app and its failure costs 48px of
  vertical budget everywhere.
- **The frontmatter's pre-existing lossiness.** `mark` and `label` both set
  `text-transform: uppercase` in CSS and neither declares it in the manifest.
  `hero` declares its full contract because it is being added now and a role
  whose `text-wrap` is optional is a different role. Retro-fitting the other two
  is a doc tidy, past this map's destination.

### The amendments, as applied

**`CONTEXT.md` — 4 edits**

| # | Where | What | Source |
|---|---|---|---|
| 1 | **User** | Reframed: sign-in is open, being *in* is the property; **never admitted** and **revoked** named and never collapsed; either state still signs in | 05, Finding 2 |
| 2 | new, after User | **Applicant**, with the Memberships-are-not-Members trap | 05 dec 4 |
| 3 | new, end of People | **Admit / Decline**, recording why it is not Confirm / Reject | 05 dec 4 |
| 4 | **Confirm / Reject** | Reciprocal ban: *never the act on a person*; `admit, decline` added to *Avoid* | 09 |

**`PRODUCT.md` — 12 edits**

| # | Where | What | Source |
|---|---|---|---|
| 1 | Users | **Prospect** — a reader, not a third co-equal audience; one route, no account, one job | 09 |
| 2 | Operating Context `:46` | Google is the only *authentication*; authentication is not admission | 05 |
| 3 | Operating Context, new | **Joining is approval-gated** — the whole policy: Applicant, profile-then-admission, two states, decline-not-delete, disclosed before the click, the waiting page shows **no community data**, admission emailed, Admin gets a badge not mail | 05, 11 |
| 4 | Operating Context, new | **The unauthenticated allow-list binds every unauthenticated route**, with the three standing rules, the published set, the withheld set, and `Activity.color` published-then-never-rendered | 04, 07 dec 7, 12 dec 1 |
| 5 | Operating Context, new | **`/` indexable, everything else not**, enforced twice, and why the auth pages are the real exposure | 12 dec 7 |
| 6 | Capabilities | Onboarding line: today self-serve, and that is a **defect, not the policy** | 05 |
| 7 | Capabilities, new sub-block | **Decided, not yet built** — the public page, the gate, the metadata | 09 (Decision 2) |
| 8 | Durable `:69` | Every string **rendered in the app UI**, metadata included; `src/lib/email/` is the second copy home and not a violation | 08 |
| 9 | Durable `:71` | **Email exists**; SMS and push do not; sends are best-effort so no flow may depend on delivery | 05 |
| 10 | Durable `:73` | **The automated net is narrow and deliberate** — Vitest on pure logic, manual cases for the rest, and choose the instrument by what is checked | 09 (Finding 1) |
| 11 | Brand Commitments, Voice | The marketing clause: plain, second person, no superlatives, no size/popularity/history — plus *no admin writes marketing copy; data carries identity* | 08 |
| 12 | Evidence on Hand | The share card is **generated lettering on a colour field**, never a screenshot; the substance band renders its empty shape | 12 dec 5, 07 dec 2 |

**`DESIGN.md` — 12 edits, 19 amendments**

| # | Where | What | Source |
|---|---|---|---|
| 1 | frontmatter `typography` | `hero` added at the corrected clamp, with `textTransform` and `textWrap` | 13 a1 |
| 2 | frontmatter `spacing` | `band: 56px`, `band-lead: 112px` | 03 a3, Finding 4 |
| 3 | Hierarchy `:196-197` | **Mark** gains the hero as a second location, "only place 900" replaced; **Hero** added — clamp, scope, the **1.29× property vs the lint as guard**, caps-have-no-descenders, `text-wrap: balance` in the role; **Display** rescoped to boards, two lines is Display's alone, break set by the container never a `<br>` | 01 a2, 02 h1/h4/h5/h7, 13 a1/a4 |
| 4 | Typography Named Rules | **Tracked-Caps** gains the tight-vs-tracked clause; new **Pitch Budget Rule** (48 chars `id`, 12-char word, Vitest, *not* for metadata); new **Never-Bleed Rule** (Mark everywhere + Hero, the four-step preference order, glyphs are not clipped by their box) | 02 h3, 13 a2/a3/a5/a6, 07 dec 8, 12 F2 |
| 5 | Colors Named Rules | New **Material-Is-Not-Mode Rule** — `.dark` names the material, the hero is board regardless of theme, route-wide dark refused, rename not taken | 01 a1, a3 |
| 6 | Layout `:213` | Rhythm extends to `2/10/16/28/56/112`; the two new steps are band air only and collapse one place at `768px` | 03 a3 |
| 7 | Layout `:215` | `40rem` list gains the waiting page; the shared gutter gains **exactly one exception** | 03 a2, 11 dec 9 |
| 8 | Layout `:219` | Collapse-by-axis scoped to **the board lattice**; a centred single-column band is exempt | 03 a4 |
| 9 | Layout, new `###` | **The public band-stack surface** — the third category; full-bleed bands; hero content centred at `48rem` **and top-anchored**; one rule at the top edge only; positional density; the **pixel fold law**, explicitly not restated in lines; two bands and a footer; board register below the seam; the band never disappears | 03 a1/a5, 02 h6, 13 a7, 07 |
| 10 | Components → Actions | **Primary on painted board** (ground-on-green 6.82:1, **chalk-on-green 2.29:1 banned**), the **square-tile-not-pill** clause, and **a disclosure the label defers to is not fine print** | 06 dec 3/7, Finding 3 |
| 11 | Components → Navigation | **The rail does not wrap** — the mark shrinks, controls stay pinned right, 48px of budget | 07 dec 8 |
| 12 | Don'ts `:308` | `3rem` Don't rescoped to board surfaces, tracking floor untouched; **new Don't** — no painted board outside the hero band | 02 h2, 01 dec 4, 07 dec 4 |

### Recorded, not applied — code comments and one config count

These are corrections inside files the build owns. They are listed so the build
session does not have to rediscover them:

1. **`src/lib/auth-actions.ts:5-9`** — *"there is no separate registration step
   and no invite gate in front of it"* is false; 05 installed exactly that gate.
   The same doc comment should record that `redirectTo: '/dashboard'` is now a
   **"route me home" sentinel** that middleware resolves, not a literal
   destination.
2. **`src/app/page.tsx:40-44`** — *"never truncates or breaks mid-word… sends the
   controls to a second line instead"* is **superseded twice over**: the rail no
   longer wraps, and mid-word breaking is now the last resort before bleeding
   rather than something forbidden. Replace with the Never-Bleed order.
3. **`src/app/styles/type-roles.css:2`** — *"The eight typographic roles"* → nine.
4. **`src/lib/public-landing.ts`** — the allow-list comment should note
   `Activity.color` is published and **deliberately never rendered**, so a later
   reader does not "fix" the omission.
5. **`brand.tagline`** — 12 decision 4 deletes its last reader; 08 already ruled
   the key itself is left alone as an app-wide tidy-up. So it survives **unread**,
   which is recorded here rather than in a doc, because a dead dictionary key is a
   code fact and not product truth.

### Honest about

- **The docs are amended; nothing else is.** No migration, no `type-hero`
  utility, no ESLint entry, no Vitest case, no dictionary keys. Those are the
  build, and the map's destination is decisions.
- **The applied text is unrendered prose.** It has been read against the three
  files' own idiom and line references, not viewed in any tool that consumes the
  frontmatter manifest. `impeccable doctor` has not been run against the amended
  `PRODUCT.md`, so the new sub-block's compatibility with `product-schema 1` is
  argued from the schema's own "preserve useful legacy headings" instruction
  rather than verified by the script.
- **Line references shift.** Every `DESIGN.md:NNN` and `PRODUCT.md:NN` citation
  in the twelve closed tickets now points a few lines off, because this ticket
  inserted text above them. The citations were correct when written and the
  quoted sentences are still findable by their words; nothing was renumbered.
