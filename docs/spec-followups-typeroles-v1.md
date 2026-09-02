# Spec: followups type roles — form primitives, the wordmark role, the rail fit at 390px

| | |
|---|---|
| Spec | [#230](https://github.com/jefrykurniaone/net-c-management/issues/230) — `spec:followups-typeroles` |
| Run | `run:followups` |
| Execution map | [#233](https://github.com/jefrykurniaone/net-c-management/issues/233) |
| Tickets | #193, #223, #209 — sub-issues of #230 |
| Version | v1 (2026-09-02) |
| Grilled from | the triage of the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers` |
| Depends on | nothing in this run. Completes the type layer built by [#142](https://github.com/jefrykurniaone/net-c-management/issues/142) (`docs/spec-rally-foundation-v1.md`) and the rails built by [#143](https://github.com/jefrykurniaone/net-c-management/issues/143) (`docs/spec-rally-public-v1.md`). Binding ADR: [0003](adr/0003-retire-papan-jadwal-for-rally.md) |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-09-02 as part of run `followups`, the run that clears the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers`. This spec owns the three that sit in the **type layer** — the two form primitives that never moved onto the named roles, the one retired role left standing, and the community name that breaks mid-word on a phone.

Repo copy: `docs/spec-followups-typeroles-v1.md`. Execution map: to follow. Tickets: linked below as sub-issues.

## Problem Statement

Run `rally` put the product's typography onto eight named roles, so that a change to a role moves every surface that wears it. Three places did not make the move, and one of them is the first thing a visitor sees.

- **Three form primitives still spell their role out by hand.** The label primitive carries the Label role's size, leading and weight as raw utilities; the field description and the validation message carry the Caption role's size the same way. Nothing reads inconsistently on screen today, because every surface that composes them matches their current classes. The defect is that the type scale has two sources of truth: a later change to the Label or Caption role will move every surface that names the role and silently leave every form label, field description and validation message behind. These are not retired alias names, so the zero-consumer gate added at the end of run `rally` cannot catch them — they are raw utilities that were never migrated in the first place. Three primitives, reaching nearly every form in the product.
- **One retired role is still standing, with no replacement assigned.** The Mark role styles the community name — weight 900, uppercase, wide tracking, 18 to 24 pixels — in the public landing header and in the shared threshold rail that sign-in, onboarding, the waiting room and the shared Session card all use. The alias-strip ticket that closed run `rally` removed every other retired name and could not remove this one: no document assigns the wordmark a role. The public spec does not mention a wordmark. The completion records of the two tickets that built the two rails both punt explicitly. The admin spec gives the admin sidebar a "Display wordmark treatment", but that is a different surface in a different spec, and neither open call site is in it. So the tree ships a utility its own comment calls retired while two live surfaces consume it, the retired-name grep does not come back clean, and a test asserts that the "pending decision" comment stays put.
- **The community name breaks mid-word at 390 pixels.** On a phone, `XCLUB COMMUNITY` renders as three lines — `XCLUB`, `COMMUNIT`, `Y` — with a single orphaned letter on the last. It is the first thing a logged-out visitor sees, and it reads as a broken page rather than a brand. The wrapping rule is behaving correctly: at that width the landing rail's logo and its trailing controls leave the wordmark too little room for a nine-character word at the Mark size, so the last-resort mid-word break fires. The name is Admin-configured with no length cap and no validation beyond "not empty", so a fix that only works for `XClub Community` is not a fix.

## Solution

The wordmark becomes an ordinary member of the type system, and the type system becomes the only place the product's type sizes live.

The three form primitives compose the roles they were always describing. The Mark role is retired for real: the community name takes the **Title** role — 17 pixels, weight 700, sentence case, no tracking — and the `type-mark` utility, its two hand-written call sites and the test marker that tracked the open decision all go. Title is smaller and shorter than the Mark it replaces, which is most of the 390-pixel problem solved by the same change. What remains of the fit is handled by wrapping at spaces and, where that is still not enough, stepping the size down until the name fits — never a mid-word break.

## Goals

- Every type size in the product comes from a named role; no surface spells one out by hand.
- No retired type alias remains in `src/`, and the retired-name grep comes back clean without an exception list.
- The community name never breaks mid-word and never overflows its rail, at any supported viewport, for a name of realistic length.

## Non-goals

- Changing what any of the eight roles is. This spec assigns a role to a surface and moves surfaces onto roles; it does not redefine a role's values.
- Restyling the forms, the landing page or the threshold pages. Only the type roles they compose change.
- A second type family, or any change to how the font is loaded.
- An Admin-configurable brand colour, per-locale copy, or anything else the run `rally` specs put out of scope.

## Constraints and trade-offs, with the reasons

- **The wordmark's new role is Title, and that is a visible change.** The community name stops being uppercase, loses its 0.14em tracking, drops from 18–24 pixels to 17, and drops from weight 900 to 700. It will read `XClub Community` rather than `XCLUB COMMUNITY`. This is the owner's decision, taken with the alternatives on the table: promoting the alias to a documented ninth role would have changed nothing on screen, Display would have made the 390-pixel fit considerably worse, and Label would have shrunk the name to a column head. Title was chosen.
- **No surface may change size, weight or leading as a side effect of the form-primitive migration.** If composing a role moves a call site, the role assignment is wrong and the discrepancy is the finding — it is recorded, not absorbed by adjusting the call site.
- **The name is never truncated and never breaks mid-word.** By the owner's decision the size steps down until the name fits, rather than cutting it with an ellipsis or letting the word break. The floor and the longest name that fits at 390 pixels at that floor are **measured and recorded** by the ticket.
- **Because the name is unbounded, the guarantee needs a bound.** Community name validation today only rejects the empty string. If the measured floor cannot hold a name of realistic length, the ticket adds a maximum length to the community-name rule so the "always fits" promise is true rather than aspirational — and records the number it chose and why. This is the one place this spec touches validation, and it is there to make an acceptance criterion provable.
- **The two rails are not the same shape.** The landing rail carries trailing controls — theme toggle, locale switch, sign-in — and is where the break was observed. The threshold rail carries none, so it has more room and is the easier case. Both wear the same role and both are verified; only the landing rail's control row is a candidate for tightening.
- **The test marker goes with the alias.** The design-token test that asserts the pending-decision comment beside `type-mark` exists only to stop the decision being resolved silently. Resolving it is exactly what this spec does, so the marker is deleted in the same change, not left to rot.

## Success criteria

- `grep` across `src/` for `type-mark` returns nothing, and the retired-name regression test carries no exception for it.
- The label, field-description and validation-message primitives contain no raw font-size, leading or weight utility; each composes a named role.
- Every admin and member form is walked at 390×844 and 1440×900, both themes, both locales, and no field label, description or validation message changes size, weight or leading.
- At 390 pixels the community name never breaks mid-word, on the landing rail and on all four threshold surfaces, with the default name and with a deliberately long name set through Settings.
- The rails are unchanged at 1440 pixels apart from the wordmark's new role.
- The measured floor size, and the longest community name that fits at 390 pixels at that floor, are recorded on the ticket.

## User Stories

1. As a logged-out visitor on a phone, I want the community's name to read as a name, so that the first thing I see does not look like a broken page.
2. As an Admin who has named the community something long, I want the name to fit the header, so that the app does not degrade for my community and not for the default one.
3. As an Admin, I want the whole name shown rather than cut off, so that the header does not decide my community is called something shorter.
4. As a member signing in, onboarding or waiting to be let in, I want the same header treatment as the landing page, so that the four threshold surfaces look like one product.
5. As a designer, I want the community name to wear a named role, so that the wordmark moves when the type system moves.
6. As a developer, I want no retired type alias left in the tree, so that the retired-name gate means what it says without an exception list.
7. As a developer, I want the "pending decision" test marker gone once the decision is made, so that the test suite does not assert a question that has been answered.
8. As a developer, I want form labels, descriptions and validation messages to name their type role, so that changing the Label role changes every form label with it.
9. As a user of any form in the product, I want nothing about the forms to look different after that migration, so that a correctness change is not a redesign.
10. As an Indonesian-language user, I want both rails checked in Indonesian, so that a longer sign-in label does not reintroduce the break.

## Implementation Decisions

- The label primitive composes the Label role; the field description composes the Caption role; the validation message composes the role the design document assigns a validation message. The raw size, leading and weight utilities go. No consuming surface is edited.
- The community wordmark composes the Title role at both call sites. The `type-mark` utility and its long pending-decision comment are deleted from the type-roles stylesheet, the design document's role table is updated to say the wordmark wears Title, and the design-token test's pending-decision marker is removed.
- The wordmark's wrapping rule becomes: wrap at spaces; never break mid-word; step the size down below the narrow breakpoint if the name still does not fit. No ellipsis, no truncation, no overflow.
- If the measured floor cannot hold a realistic name at 390 pixels, a maximum length is added to the community-name validation, with the chosen number and its reasoning recorded on the ticket. Nothing else about Settings changes.
- The landing rail's trailing controls may be tightened at the narrow breakpoint if the measurement shows the wordmark needs the room; the threshold rail has no controls to tighten.
- The wordmark's role change lands before the fit work, because the role determines the size the fit is measured against.

## Testing Decisions

- A good test here asserts a **computed style or a rendered geometry**, not a class string. The design-token tests are the prior art: they read the committed stylesheet and assert relationships, and they already pin the contrast pairs and the retired-name list.
- The retired-name test loses its `type-mark` exception, which is itself the regression guard for the deletion.
- A test asserts that the label, description and message primitives carry no raw type utility, so the migration cannot be undone by a later edit.
- Wrapping, mid-word breaks and rail geometry are runtime checks at two viewports, in both themes and both locales, with a long name and the default name. They belong to the run's single `TESTING.md` ticket, which records them once.
- If a community-name maximum is added, a validation test pins it.

## Out of Scope

- The admin sidebar's wordmark treatment, which its own spec settled and which is not one of these call sites.
- Redefining any of the eight roles, adding a ninth, or changing the font loading.
- Restyling the forms, the landing bands, the threshold pages or the email shell.
- Any change to the logo, the identity mark or the hero image.
- Per-locale community names, rich text in Admin copy, or a brand colour setting.

## Further Notes

The Mark role's own comment records why it survived the alias strip and what it was waiting for: "the community name is runtime configuration with no length cap, and every step up in size is a step further from surviving one." Title is a step down, which is the reason the fit problem and the role decision are one spec and not two.
