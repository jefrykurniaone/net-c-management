# Who authors the pitch — the dictionary or the admin?

Type: grilling
Status: open
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

<!-- resolved by the session that takes this ticket -->
