# The action, and what becomes of the sign-in threshold

Type: grilling
Status: open
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

<!-- resolved by the session that takes this ticket -->
