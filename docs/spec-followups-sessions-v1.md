# Spec: followups sessions — Session API narrowing, register icon, create-form fee note

| | |
|---|---|
| Spec | [#229](https://github.com/jefrykurniaone/net-c-management/issues/229) — `spec:followups-sessions` |
| Run | `run:followups` |
| Execution map | [#233](https://github.com/jefrykurniaone/net-c-management/issues/233) |
| Tickets | #208, #198, #196 — sub-issues of #229 |
| Version | v1 (2026-09-02) |
| Grilled from | the triage of the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers` |
| Depends on | nothing in this run. The Activity tile rule comes from [#145](https://github.com/jefrykurniaone/net-c-management/issues/145) (`docs/spec-rally-admin-v1.md`); vocabulary from `CONTEXT.md` |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-09-02 as part of run `followups`, the run that clears the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers`. This spec owns the three that sit on **Session surfaces** — one response that shares more than any surface renders, one register cell that never shows what it was given, and one disclosure that contradicts the field it describes.

Repo copy: `docs/spec-followups-sessions-v1.md`. Execution map: to follow. Tickets: linked below as sub-issues.

## Problem Statement

Three defects on the Session surfaces, all of them pre-existing, none of them introduced by the run that found them.

- **`GET /api/sessions/[id]` hands the whole Attendance row to any admitted caller.** The `user` relation inside it is properly narrowed to name and image; the Attendance row around it is not narrowed at all, so every column ships for every attendee — `userId`, `holdExpiresAt`, `note`, `createdAt`, `updatedAt`. `holdExpiresAt` is another member's payment state: it says who has claimed a Seat and not yet paid for it, and exactly when their hold lapses. Nothing in the product shows that about anyone but the viewer. The route is gated on admission, not on the Admin role, so this is one member reading another member's payment standing sideways. The one client that calls it narrows the response in TypeScript only — a type assertion, not a runtime filter, so the fields still cross the wire.
- **The admin Sessions register never renders an Activity's icon.** Its Activity cell always draws the initial-letter tile, even for the Activities that have a real icon set. The Activity relation is selected without `icon`, so the row type never carries one and the shared badge falls back to the initial — exactly the "caller has not been given the icon yet" case the component's own documentation describes. Spec #145 names Session rows explicitly among the surfaces that show the tile; the Activities register, the public Activity cards and the member Session cards all do it correctly.
- **The Create Session form always claims the fee is locked.** It renders "This fee cannot be changed: this session already has a payment or a held seat." unconditionally, on a form whose purpose is to create a Session that does not exist. There is no Session, so there is no Payment and no held Seat, and the field is fully editable. The sentence is wired to the field with `aria-describedby`, so a screen reader reads the false statement out as the field's description. An Admin who believes it will not set the fee — the one field that decides whether a Seat needs money behind it. The sibling note two fields up ("Activity cannot be changed after the session is created") is forward-looking and correct, and the contrast is what makes the fee note read as a copy-paste rather than a decision.

## Solution

Each surface says and sends exactly what it means.

The Session detail response is narrowed to the fields its surfaces render, and a member's payment-hold state reaches only that member. The Sessions register is given the icon it was always meant to draw. And the create form's fee note either goes away or becomes the forward-looking sentence its sibling already is, on its own dictionary key, leaving the edit form's real lock note untouched.

## Goals

- No member can read another member's payment-hold state from any API response.
- The Activity tile means the same thing on every surface that draws it, the admin Sessions register included.
- No form disclosure states something false about the control it describes, in either locale, to a screen reader or to the eye.

## Non-goals

- Any change to reservation, hold, payment, capacity or attendance rules. This spec changes what is sent and what is said, never what is charged or held.
- Adding an Admin-role gate to the Session detail route. The route is meant to be readable by an admitted member; the fix is narrowing, not gating.
- Restyling any of these surfaces. Run `rally` restyled them and they are settled.

## Constraints and trade-offs, with the reasons

- **The viewer's own hold must survive the narrowing.** The pay page reads the viewer's `holdExpiresAt` to run the countdown. Narrowing that returns nothing breaks the countdown; narrowing that returns everyone's is the defect. So the field is returned for the requesting user's own Attendance row and for no other.
- **Attendee names and images stay.** They are deliberate — the players card shows them by design, and they are already narrowed by an explicit `select`. The over-share is the unnarrowed row around them, not the relation inside it.
- **A test asserts the response shape, not just the fix.** A later `include` can silently widen a response again, and this class of finding is not detectable by the static analysis in use here, which runs with no taint engine. A shape assertion is the only thing that holds.
- **`t.admin.feeLocked` is not reused for the create form.** The edit form needs that sentence verbatim for the case where the lock is real. The forward-looking wording gets its own key in both locales.
- **`aria-describedby` stays wired to whatever sentence remains, or is removed with it.** A dangling description is worse than none.
- **The sibling routes were swept, and only this one matches.** Every other route under the API that returns an included relation narrows it, or returns CSV rather than JSON. So this is one fix, not a class fix — but the shape is worth a note in the ticket so the next reviewer knows the sweep was done.

## Success criteria

- `GET /api/sessions/[id]` returns no `userId`, and no `holdExpiresAt` or `note` belonging to anyone but the requesting user.
- The viewer's own hold countdown still runs on the pay page, and the players card still renders every attendee's name, image and attendance chip.
- A test fails if a later change widens that response.
- On `/admin/sessions`, a row for an Activity with an icon draws the icon; a row for an Activity without one draws the initial. Verified against the two seeded Activities that have icons and the two that do not.
- The create Session form carries no sentence claiming an existing Payment or held Seat, in either locale; the edit form's conditional lock note is unchanged and still appears exactly when the lock is real.

## User Stories

1. As a member, I want my payment-hold state to stay between me and the Admin, so that another member cannot see that I have claimed a Seat and not yet paid.
2. As a member, I want the pay page's countdown to keep working, so that narrowing the response does not cost me the deadline I am watching.
3. As a member, I want to see who else is coming to a Session, so that the players card keeps the names and faces it was designed to show.
4. As a developer, I want a test that fails when the Session response widens, so that a future `include` cannot re-open this quietly.
5. As an Admin, I want the Sessions register to show each Activity's icon, so that a register scans the same way as every other surface that draws the tile.
6. As an Admin, I want an Activity with no icon to keep drawing its initial, so that the fallback stays the fallback rather than becoming an empty cell.
7. As an Admin creating a Session, I want to be told the truth about the fee field, so that I set the fee instead of believing it is locked.
8. As an Admin using a screen reader, I want the fee field's description to describe the fee field, so that the accessible path is not the misleading one.
9. As an Admin editing a Session that already has money behind it, I want the real lock note to keep appearing, so that fixing the create form does not cost me the warning that matters.
10. As an Indonesian-language Admin, I want whatever the fee field says to say it in Indonesian too, so that the fix is not English-only.

## Implementation Decisions

- The Session detail route gains an explicit `select` on the Attendance relation, listing only what the surfaces render, with the narrowed `user` kept as it is. The hold expiry is included for the requesting user's own row only; the decision of where that filtering happens — in the query or in the serialisation — belongs to the ticket, provided the response cannot carry another member's value.
- The Sessions register's Activity selection gains the icon, the row type carries it, and the register's Activity cell passes it to the shared badge. The shared badge itself is not changed: it already accepts the value and already falls back.
- The Applicants register also draws activity badges without passing an icon. Spec #145 does not name that surface, so it is left alone and noted rather than changed opportunistically.
- The create Session form's fee note is replaced with a forward-looking sentence on its own new dictionary key in both locales, or dropped entirely; either way the edit form's key and behaviour are untouched. One file, one line, plus the key.
- Every user-facing string goes through the dictionary in both `en` and `id`.

## Testing Decisions

- A good test here asserts the **response contract** and the **rendered cell**, not the Prisma call that produced either.
- The response-shape test is the durable part of the narrowing ticket: it enumerates the permitted keys of an Attendance entry and fails on any addition, so the assertion survives a refactor of the query.
- The register's icon case is a rendered assertion against a row whose Activity has an icon and a row whose Activity does not — both already exist in the seed.
- The form's copy is asserted through the dictionary, so the case does not depend on which sentence the ticket chose.
- The runtime walk of all three surfaces, in both locales and both themes, belongs to the run's single `TESTING.md` ticket.

## Out of Scope

- The Applicants register's activity badges.
- Adding, removing or reordering any column, sort or filter on the Sessions register.
- Any change to the export routes, which return CSV and were swept clean.
- Any change to how the pay page looks; only what it receives.
- Adding an Admin-role gate to any route.

## Further Notes

The API narrowing was found while reviewing a ticket that does not touch the route, the icon gap while writing a manual test suite for a spec that names the surface, and the fee note while driving the form through a browser. All three were filed rather than fixed under the run's rule that a defect in code a ticket did not touch becomes its own issue — which is why all three are still exactly as described, verified against `main` on 2026-09-02.
