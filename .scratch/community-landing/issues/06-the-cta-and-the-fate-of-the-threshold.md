# The action, and what becomes of the sign-in threshold

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocked by: 01, 05
Blocks: 07, 09

## Question

The reference has one loud action repeated twice — a saturated pill reading
"Get a demo", plus a quiet "Login" in the rail. The two are different jobs:
convert the stranger, admit the returning user. Today `/` has one button doing
both, because everyone who saw it was already a member.

What are this page's actions, and where does the existing threshold tile go?

Sub-questions:

- Primary CTA wording and destination, resolved against 05's joining policy:
  "Continue with Google" is a *sign-in* label offered to someone who has never
  heard of the community. Does it become "Join", "See what's on", or a WhatsApp
  contact — and does it still fire `continueWithGoogle()`?
- Is there a **secondary quiet action** for returning members, as the reference
  separates Login from Get-a-demo? If yes, that is the rail's job and it points
  at `/auth/signin` — the route the superseded map ruled out of scope precisely
  because `/` no longer linked to it. It would come back in scope.
- Does the threshold tile survive on `/` at all, or does the sign-in form move
  entirely to `/auth/signin` — which is still the middleware redirect target
  (`TESTING.md:88`)? If it moves, `/` becomes a marketing page with no form,
  which changes 07's whole composition.
- The CTA is where the accent from 01 lands hardest. Confirm the colour and its
  contrast against both themes here, not at implementation time.
- `continueWithGoogle()` was deliberately extracted so "both doors in are the
  same code" (`44523b9`). Whatever is decided must not fork it again.

## Constraints handed down by 05 (resolved — not reopenable here)

- **Joining is approval-gated.** Signing in makes the stranger an *Applicant*;
  an Admin admits them. The CTA cannot promise access.
- **The gate is disclosed before the click, not after.** The primary action and
  its surrounding copy must make clear that joining is a request an organizer
  reviews. This was decided as a matter of honesty, not conversion, and is
  binding.
- **"Continue with Google" is dead as the primary label** — it is a sign-in
  label promising something this page cannot grant. Whether the button still
  *fires* `continueWithGoogle()` is open and yours to decide; what it *says* is
  constrained.
- A newly-admitted Applicant is emailed and lands at `/pending`, not
  `/dashboard`. If a secondary quiet action for returning members exists, note
  that a returning **Applicant** is neither a member nor a stranger.

## Answer

**The threshold tile dies. The hero's loud pill *is* the form.** `/` carries no
card and no second page between wanting in and asking: one `<form
action={continueWithGoogle}>` whose submit button reads **"Join this
community"**, a disclosure sentence directly beneath it carrying the gate, and a
quiet **"Already a member? Sign in"** that fires the *same* action inline rather
than navigating anywhere.

### Premise corrections

Two of the ticket's premises were wrong, and one of them reversed a scope call.

- **`continueWithGoogle()` does not need to fork, and does not need an
  argument.** The ticket framed the risk as "don't fork it again" (`44523b9`).
  The sharper problem is that it hardcodes `redirectTo: '/dashboard'`
  (`auth-actions.ts:11`), which under 05 is the wrong destination for a
  first-time Applicant *and* for a returning un-admitted one. The fix is not at
  the call site: `/dashboard` stays literal and becomes a **"route me home"
  sentinel** that 05's middleware layer resolves — `/onboarding` if the profile
  is incomplete, `/pending` if `admittedAt IS NULL`, `/dashboard` otherwise.
  The action stays zero-argument and both hero call sites invoke it identically,
  so the "both doors in are the same code" promise is kept *more* strictly than
  before, not less.
- **The colour question was already answered in the token layer.** The ticket
  asked to confirm the accent "against both themes". There is no both: 01 fixed
  the hero band to painted board **regardless of theme**, and the painted board
  *is* the `.dark` palette — `--background: #1B2621`, `--primary: #4FBF8E`,
  `--primary-foreground: #1B2621` (`board-materials.css:108,115,116`). The CTA
  is `bg-primary text-primary-foreground` read from the board scope. There is
  exactly one pairing to verify, not two.

### Decisions

1. **`ThresholdTile` is deleted; the CTA is the form.** Rejected linking the
   pill to `/auth/signin`: it inserts a navigation between intent and action on
   the one surface whose entire job is converting a stranger, and lands them on
   a page holding the identical button. Rejected keeping the tile below the
   seam: it spends a band of 03's fold budget on furniture, and a bordered card
   on enamel below a full-bleed painted band is the composition the reference
   does not have. `/` becomes bands and nothing else.

2. **The primary label is "Join this community"; the gate lives in the sentence
   beneath it.** 05 decision 8 binds "the CTA **and its surrounding copy**" —
   surrounding copy is named in the decision, so deferring the gate to the
   sentence satisfies it as written. Rejected "Ask to join" / "Request to join":
   both are more honest per-word but read as bureaucracy on a surface selling an
   amateur community run over WhatsApp, and 05's own reasoning was that "an
   organizer will let you in" is the *friendly* truth, not a warning label.
   Rejected "See what's on": 03 gave the hero one loud action, and a scroll is
   not one. The **Google mark stays on the primary** — the mechanism is not the
   promise, and hiding which account it takes would be its own dishonesty.

3. **Because the label defers, the disclosure is not fine print.** This is the
   price of decision 2 and it is binding on 08. The sentence renders at
   **`type-body`**, in `--secondary-foreground` (`#9AA6A0`, **6.33:1** on board)
   — **never `type-caption`, never `--subtle-foreground`**. The current
   `landing.accountNote` pattern (caption, `muted-foreground`) is exactly the
   treatment this bans. A gate disclosed in the fine print is not disclosed, and
   05 chose honesty over conversion explicitly.

4. **The button is tied to the sentence for assistive tech.** `aria-describedby`
   on the submit pointing at the disclosure paragraph. Same reasoning as
   decision 3: a screen-reader user who hears only "Join this community" has
   been told the thing 05 forbade telling them.

5. **The secondary action fires `continueWithGoogle()` inline — no navigation.**
   A second `<form>` under the disclosure, styled as a quiet text button reading
   "Already a member? Sign in", **without** the Google mark. One page, one
   action, two labels for two audiences. Rejected linking to `/auth/signin`:
   that page *is* one `continueWithGoogle` button, so the hop buys a returning
   member nothing and drags a second surface into this map. Rejected dropping
   the secondary entirely: a returning member's only visible option would read
   "Join this community", which is false for them — and a returning **Applicant**
   would be invited to re-apply. Both labels reaching one action is what makes
   the returning Applicant's click harmless: middleware routes them to
   `/pending` regardless of which label they pressed.

6. **The rail gains no sign-in affordance.** 03 decision 3 handed this here.
   The answer is no — decision 5 puts the second door where someone looking for
   it actually looks, and the rail keeps `ThemeToggle` + `LanguageSwitcher`
   only, so 03's "no nav" rail survives intact and mobile isn't asked to carry
   three controls.

7. **Colour and contrast, confirmed with numbers, not deferred.** Pill fill
   `#4FBF8E` on board `#1B2621` = **6.82:1** (non-text needs 3:1). Pill label
   `#1B2621` on `#4FBF8E` = **6.82:1** (AA normal text needs 4.5). **Chalk Ink
   `#E7ECE9` on that green measures 2.29:1 and is banned** — the pill is
   ink-on-green, never chalk-on-green, which is the one way this CTA can be got
   wrong. Wordmark Chalk Ink on board = 13.05:1; disclosure at
   `--secondary-foreground` = 6.33:1; the quiet link takes the same value, since
   at `--subtle-foreground` (5.35:1) it would pass contrast but read as
   disabled next to a saturated pill.

8. **The hero's content is now fixed at six elements**, in order: wordmark,
   pitch (`type-hero`), body sentence, pill, disclosure, quiet sign-in link.
   Handed to 07 as a closed inventory, not a suggestion.

### Facts established (no decision needed)

- **The shared-copy coupling breaks, deliberately.** `page.tsx:77` reads
  `t.auth.signInSubtitle` specifically so both doors could not drift. The hero
  now needs pitch-and-gate copy that `/auth/signin` has no use for, so `/` gets
  its own keys. The promise the coupling protected is instead kept by decision 5
  — the doors share the *action*, which is the part that mattered.
- **Both existing notes are now false.** `landing.accountNote` ("signs you in,
  and creates your account") and `auth.signInNote` ("creates your account… you
  agree to the club rules") both promise access the app no longer grants. 08
  owns the rewrite; `/auth/signin` needs it too even though its design stays out
  of scope, because it is directly reachable as the middleware target
  (`proxy.ts:28`).
- **The doc comment on `continueWithGoogle()` is false.** `auth-actions.ts:5-9`
  states "there is no separate registration step and no invite gate in front of
  it." 05 installed exactly that gate. Correction goes to 09.
- **03's fold estimate grows.** 03 put the hero at 560–600px assuming wordmark +
  pitch + body + CTA. Decisions 3 and 5 add a `type-body` disclosure and a quiet
  link — roughly **+50–60px**. Still inside the 900px budget; the margin is now
  genuinely thin, which sharpens 03's advice that 07 treat the hero as spending
  two thirds of the fold.

### Handed to other tickets

- **07** — hero inventory is closed (decision 8); the fold budget tightened by
  ~60px. The hero contains a live form, so 07 composes around an action, not a
  link.
- **08** — new bilingual keys: pitch, hero body sentence, primary CTA label,
  the **disclosure sentence** (bound by decision 3 to body weight), the quiet
  sign-in label. Plus rewrites of `landing.accountNote` and `auth.signInNote`,
  both of which currently lie. Indonesian runs 15–30% longer and the disclosure
  sits at body weight under a fixed-width measure — 08 should budget it as
  two lines on `id`.
- **09** — `DESIGN.md` records the ink-on-green law for the accent pill
  (decision 7) and the not-fine-print rule for a disclosure that carries a
  promise (decision 3). `auth-actions.ts`'s doc comment is corrected. No
  `PRODUCT.md` change originates here; 05 already owns the joining policy.
