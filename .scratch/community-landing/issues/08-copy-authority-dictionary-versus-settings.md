# Who authors the pitch — the dictionary or the admin?

Type: grilling
Status: resolved
Parent: ../map.md
Blocked by: 04
Blocks: 07

## Question

Every user-facing string today lives in `src/lib/i18n/dictionaries.ts` in both
`en` and `id` (`PRODUCT.md:69`). That works because every existing string is
*product* copy — generic, community-agnostic. A page that sells **this specific
community** wants copy that isn't: what we play, when, who we are, why join.

Where does that copy live?

Sub-questions:

- Dictionary (generic, ships in code) or `Settings` rows (per-community,
  admin-editable)? Generic copy on a page whose job is persuasion risks a hero
  that says nothing. Admin-editable copy means an untranslated free-text field
  on a bilingual page — who writes the `id` version?
- If Settings: what is the fallback when the admin has written nothing? It must
  hold under `PRODUCT.md:88` — every surface survives an unknown name and blank
  config — which means the generic version has to be good enough to ship alone.
- `PRODUCT.md:90` forbids anything sport-specific in code or copy. Generic copy
  therefore cannot name a sport, which is most of what a stranger wants to know.
  Does 04's real Activity data carry that job instead of the copy?
- Voice: `PRODUCT.md:89` — English authored first, Indonesian kept complete.
  Does a marketing voice differ from the app's voice, and is that a DESIGN.md or
  PRODUCT.md matter?
- The superseded map's ticket 02 banned the internal metaphor (board, tile, rail,
  lattice) from user copy, and 05 wrote that Don't into DESIGN.md. Confirm it
  still binds marketing copy.

## New strings handed down by 05

The approval gate adds a body of copy this ticket's authority question now has to
cover. All of it is *product* copy, not per-community pitch — worth noting,
because it may split cleanly from the persuasion copy and settle the question
differently for each half:

- The CTA and its **gate disclosure** (the page must say joining is reviewed by
  an organizer before the click).
- `/pending` — the Applicant's waiting room, and its separate **declined** state.
- The **admission email**, bilingual, in the shape `src/lib/email/` already uses.
- The Admin's queue: labels for **Admit** and **Decline**.

Vocabulary is fixed by 05 and `CONTEXT.md`: *Applicant*, *Admit*, *Decline*.
Not *approve* — `CONTEXT.md:83` reserves Confirm/Reject for Payments and bans
"approve" outright.

## Answer

**The dictionary authors everything. No admin writes marketing copy, and the
page's per-community substance comes from data, not prose.**

### 1. Authority: dictionary-only, for both halves of the copy

All landing copy — the persuasion half and the product half 05 handed down —
ships in `src/lib/i18n/dictionaries.ts`, in `en` and `id`. No `Settings` key is
added, and none should be proposed later without reopening this decision.

`Settings` was the tempting answer because the table is schemaless: `PATCH
/api/settings` (`src/app/api/settings/route.ts:42-50`) upserts *any* key with no
migration, so a `landingPitch` row costs nothing to store. It was rejected on
three grounds, each independently sufficient:

- **The fallback has to be good anyway.** `PRODUCT.md:88` requires every surface
  to survive blank config, so the generic version must be written well and must
  ship alone. Once it is good, the admin slot is decoration on the one surface
  where a half-written sentence does the most damage.
- **The field has no bounds and the type role has no mercy.** 02 budgeted the
  pitch at **≈54 characters on `id`, 3 lines at the cap**, rendered at
  `clamp(2.5rem, 8vw, 5rem)` / 900. The settings route validates exactly one
  thing today — that `communityName` is non-blank — so an unbounded textarea
  against `type-hero` breaks the hero the first time an organizer is
  enthusiastic.
- **04 already ruled this category off the page.** All admin-authored free text
  (`description`, session `title`, `notes`) is barred from `/` because it was
  written under an internal-tool assumption. A pitch key is the same category of
  text. The map's Out-of-scope section already parked "a field admins fill
  *knowing* it is public" as past this destination — a schema-free key does not
  escape that, because the cost was never the migration, it was the new admin
  surface, the validation, and the untranslated `id`.

The decision is taken **once for both halves**. The pitch and the gate copy do
not split. Recorded for a future reader: if this is ever revisited, the **pitch**
is the half that would move first — the gate disclosure, `/pending`, and the
Admit/Decline labels describe a mechanism identical in every deployment and have
no per-community reading at all.

### 2. What makes the page feel like *this* community

Copy carries the invitation; **data carries the identity**. The individuating
surface is exactly three things, none of them prose:

- the **community name** (`Settings`, already exists, rendered as the hero
  wordmark per 01),
- the **logo**, rail only (01),
- 04's **real Activity data** — names, icons, colours, weekly slot, standing
  venue, fees, and the next three scheduled sessions.

`PRODUCT.md:90` forbids the copy naming a sport, so the sport can only ever
arrive through that data. The pitch sentence's job is what a community *is* —
turning up, a standing slot, the same people — not what it plays.

**Binding on 07:** if the Activity band is cut or deferred, the page loses its
only per-community substance and becomes a generic poster. The band is not one
option among several in the inventory.

### 3. Voice

One voice, not two. `PRODUCT.md`'s Brand Commitments already own it ("bilingual,
English authored first, Indonesian kept complete") and voice is product truth,
not visual law, so the amendment goes there — **not** to `DESIGN.md`, which keeps
only the copy rules that are visual (length budgets, the metaphor ban).

The added clause: **plain, second person, no superlatives, no claims about size,
popularity, or history.** The last is `PRODUCT.md:94` restated at the point where
a marketing writer would otherwise reach for it.

### 4. The metaphor ban still binds

`DESIGN.md:309` — board, tile, rail, lattice stay out of user-facing copy —
holds unchanged and is **explicitly extended to `/`**, which is where a writer
is most likely to reach for a vivid house metaphor. "Court Green" is a *token*
name and stays in the token layer; "court" in copy would breach `PRODUCT.md:90`
anyway, being sport-specific.

### 5. Namespace shape

`t.landing` is used in exactly one file (`src/app/page.tsx`, three strings), so
the namespace is owned entirely by the route this map rebuilds and can be
reshaped freely.

- Keep the name **`landing`**, restructured into **sub-blocks per band** —
  `landing.hero.*`, `landing.gate.*`, `landing.activities.*`,
  `landing.sessions.*`, `landing.footer.*`. 07 produces an ordered band
  inventory with a required empty-behaviour field per band; the dictionary
  mirrors that shape, so each band's heading, body and empty string sit in one
  block, and a band added or cut in 07 is one block added or cut here.
- `landing.accountNote` is threshold copy and **06 resolved concurrently with
  this ticket**: the threshold tile dies, and the gate disclosure sentence
  beneath the pill replaces it. So `accountNote` is **deleted, not moved** — its
  successor is `landing.gate.disclosure`, whose wording is 06's and whose home
  is this ticket's. `landing.purpose` likewise gives way to `landing.hero.pitch`;
  the authoring comment it carries is the precedent §7 keeps, so move the comment
  with the role, not the string.
- `/pending` gets a **top-level `pending` namespace**, not a sub-block of
  `landing` — it is app UI, not a marketing surface, and 01 confines painted
  board to the hero.
- Admit / Decline live under `admin`. `CONTEXT.md:83` binds: not "approve".

### 6. Email is the second copy home, and always was

**Finding: `PRODUCT.md:69` is already violated, seven files wide.** No template
in `src/lib/email/` touches the dictionary — every one inlines its copy as
`isId ? '<id>' : '<en>'` ternaries for subject, heading, body HTML, row labels
and CTA label (see `src/lib/email/hold-expired.ts:28-62`).

05's admission email **follows the siblings**: inline, in a new file under
`src/lib/email/`, using `layout.ts`'s shell. Forcing one template through the
dictionary would make it the odd sibling and split email copy across two homes,
for strings that carry HTML, subject lines and locale-formatted dates the
dictionary has no shape for.

The honest fix is not a special case but an amendment: `PRODUCT.md:69` says
"every user-facing string" when it means **every string rendered in the app UI**;
`src/lib/email/` is the second copy home. Handed to 09.

### 7. Length budget: written twice, tested never

- One `DESIGN.md` sentence tying **`type-hero`** to its `id` length budget —
  placed with the type role, where a future author looks. (Written here as 02's
  ≈54; **now 48, plus a 12-character word rule**, per
  [13](13-type-hero-fails-on-indonesian-and-on-phones.md). 13 also ruled the
  budget *is* enforced by a test — the "tested never" in this heading no longer
  holds, because length needs none of the judgement that killed the `id` parity
  test.)
- An authoring-site comment in the dictionary, matching the precedent already in
  the file: `landing.purpose` carries exactly such a comment today
  ("Kept short on purpose: type-display holds at two lines at its 3rem cap only
  if the copy is authored short").
- **No test.** Key parity is already enforced by the type system; prose length is
  not something a test can judge without becoming a nuisance.

### 8. Translation parity: add nothing

`const id: typeof en` (`dictionaries.ts:722`) makes a **missing** `id` key a
compile error. It does **not** catch an untranslated one — and it must not, since
some strings are legitimately identical across locales (`exportCSV: 'Export CSV'`
in both, correctly). Any automated check is a false-positive generator.
`PRODUCT.md:89` already makes "Indonesian kept complete" an authoring
obligation; restating it here is the whole fix.

### 9. `brand.tagline` is banned from `/`, and the metadata gap is now sharp

`src/app/layout.tsx:30-31` renders the app's `<title>` and `<meta description>`
as `${communityName} - ${t.brand.tagline}`, where the tagline is hardcoded
`'XClub Community Management'` / `'Manajemen XClub Community'`. On the one route
strangers reach from search, that snippet currently reads as *management software
for a placeholder brand* — it names a brand `PRODUCT.md` calls a placeholder, and
it speaks in the SaaS voice this map ruled out of scope.

Rule now: **no string containing "XClub" may reach `/`**, and `brand.tagline` in
particular may not. Elsewhere it is left alone — fixing it app-wide is a separate
tidy-up, not this map's business.

The *replacement* title and description belong with the OG image in the map's
existing **Not yet specified** metadata patch, which is rewritten to name this
defect and its constraints. It graduates once 07 settles what the page contains.

### Handed to 09 (three amendments)

1. **`PRODUCT.md` Brand Commitments — Voice** gains the marketing clause: plain,
   second person, no superlatives, no claims about size, popularity or history.
2. **`PRODUCT.md:69` — correction.** "Every user-facing string goes through
   `dictionaries.ts`" is false today; it means every string rendered in the app
   UI, and `src/lib/email/` is the second copy home. (Pairs with 05's correction
   of `PRODUCT.md:71`, which wrongly claims no email channel exists — the same
   sentence pair has drifted from the code in two directions.)
3. **`DESIGN.md` — `type-hero` character budget**, placed with the type role.
   **SUPERSEDED FIGURE:** this said "per 02's ≈54 characters on `id`".
   [13](13-type-hero-fails-on-indonesian-and-on-phones.md) measured ≈54 as the
   first *failing* value — the budget is **48**, the line cap is **4**, and a
   second rule applies (**no word longer than 12 characters**). Take the numbers
   from 13. `DESIGN.md:309`'s metaphor ban needs no amendment; it already binds
   `/`.

### Nothing here was ruled out of scope

The one candidate — an admin-editable pitch field — was already out of scope via
04 and the map's own Out-of-scope entry. It is not re-listed.
