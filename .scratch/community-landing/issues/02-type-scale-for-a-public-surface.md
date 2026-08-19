# The type scale for a public surface

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocked by: 01
Blocks: 07, 09

## Question

`DESIGN.md:197` caps display type at `3rem` with the stated reason "a board is
read, not shouted at", and `DESIGN.md:308` repeats it as a hard **Don't**. The
reference hero runs roughly `5rem` uppercase at weight 900 and dominates the
fold. The human wants that weight.

What type law governs a page that *is* meant to be shouted at?

Sub-questions:

- Amend the `3rem` cap, or carve a **separate marketing scale** that cannot leak
  into board surfaces? The cap's reason is scoped to boards — which argues the
  cap was never wrong, only mis-scoped. Say which.
- If a new role, what is it, at what clamp, and what stops it appearing on
  `(main)` and `(admin)` pages? A rule nothing enforces is a rule that leaks.
- Uppercase: the reference is set in caps. `DESIGN.md:196` reserves tracked caps
  and weight 900 for **Mark** — the community name on the rail. Does the hero
  collide with the one place 900 was allowed to live?
- The two-line cap decided by the superseded map (`landing-execution` 02/05,
  appended to `DESIGN.md:197`) was authored for a 3rem statement in a 40rem
  tile. Does it survive a full-bleed hero, or is it now wrong?
- Indonesian runs 15–30% longer (`PRODUCT.md:69`). At 5rem, what does the
  longer string do to the fold, and is that the constraint that sets the size?

## Answer

> **PARTLY SUPERSEDED by [13](13-type-hero-fails-on-indonesian-and-on-phones.md),
> which measured this role in a browser.** The shape of the answer stands — a
> scoped ninth role, uppercase 900 at tight tracking, the pitch as the giant, the
> wordmark left at `type-mark`, lint as the enforcement. Four specifics do not:
>
> - **Decision 4's floor is `2.25rem`, not `2.5rem`**, and its stated reason is
>   false: `2.5rem` (40px) never sat above Display's `3rem` cap (48px). The
>   property that holds is Hero ≥1.29× Display at every viewport.
> - **The budget is 48 characters on `id`, not ≈54.** 54 is the first *failing*
>   value (5 lines → 913px, past 03's fold).
> - **Decision 9's 3-line cap becomes 4 lines**, forced by decision 9's own
>   criterion once the real character counts are known.
> - **Decision 11 was right to refuse a lower floor, for the wrong reason** — and
>   a second rule it never had now applies: **no word longer than 12 characters.**
>
> Read 13's numbers, not this ticket's, and do not carry decision 4's
> "above Display's `3rem` cap" sentence into `DESIGN.md`.

**The `3rem` cap was never wrong — it was mis-scoped.** It stays exactly as
written and keeps governing board surfaces. The public route gets a **ninth type
role, `type-hero`**, which exists on that route only and is kept there by lint,
not by convention. Resolved by grilling with the human.

### Decisions

1. **A scoped ninth role, not an amended cap.** `DESIGN.md:197`'s reason ("a
   board is read, not shouted at") literally names boards, so raising the cap
   would legalise `5rem` on every admin page by default and destroy the system's
   density argument. `type-hero` is one addition with one caller. Rejected also
   reusing `type-mark` at a larger size — the pitch would inherit tracked caps
   and become a second Mark.

2. **The pitch is the giant; the wordmark is not.** The reference's dominating
   object is the pitch, and that is the right transfer: a stranger's question is
   *why would I join*, not *whose page is this*. The community name cannot take
   that slot — `PRODUCT.md:88` makes it runtime config with no length cap, and
   the superseded map's 02 already rejected community-name-at-display for exactly
   that reason ("trades a fixable balance problem for an unfixable wrap
   problem"). Pitch is copy we author, so its length is ours to control.

3. **`type-hero` is uppercase at 900 with *negative* tracking.** This is the
   device that delivers the weight the human wants without dissolving the Mark
   role. Mark is `0.14em` **tracked-out** caps and reads as stencilled furniture;
   `type-hero` is `-0.03em` **tight** caps and reads as a shouted slab. Two
   different devices that both happen to be capitals. That distinction is not
   self-evident and must be written into `DESIGN.md`, or the next surface treats
   them as one thing. `DESIGN.md:209` (Tracked-Caps-Are-Structural) is therefore
   **not** breached — it governs tracked caps, and this is the opposite setting.

4. **Resolved spec:**

   ```css
   @utility type-hero {
     font-size: clamp(2.5rem, 8vw, 5rem);
     font-weight: 900;
     line-height: 0.95;
     letter-spacing: -0.03em;
     text-transform: uppercase;
   }
   ```

   - `5rem` is the reference's own measured size — force taken from evidence, not
     invented headroom.
   - `0.95` is legal to crowd **because the role is caps**: no descenders, so
     lines that would collide in sentence-case sit clean. The reason, not just
     the number, belongs in `DESIGN.md` — otherwise it reads as licence to
     tighten sentence-case display type.
   - `-0.03em` stays inside the `-0.04em` floor at `DESIGN.md:308` with margin,
     so that Don't is **not** amended.
   - The lower bound `2.5rem` sits **above** Display's `3rem` cap at no
     viewport — the two roles never overlap in size at any width. This is what
     stops "just use `type-hero`" ever being arguable on a board surface.

5. **Leak prevention is lint, not convention.** Tailwind v4 `@utility` is global,
   so file placement guarantees nothing. `type-hero` gets an ESLint
   `no-restricted-syntax` entry forbidding it under `src/app/(main)/**` and
   `src/app/(admin)/**`; `npm run lint` is already a pre-commit hook, so a leak
   fails the commit. This repo has no test suite, so lint is the only enforcement
   surface that exists. Rejected inlining the values on the hero element instead
   of naming a role: an unnamed hero cannot be referenced by `DESIGN.md`,
   reviewed, or found again, and would put magic numbers in `page.tsx` against
   the coding standards.

6. **The pitch sits on a narrow measure inside the wide gutter.** The hero band
   keeps the shared `72rem` gutter (`DESIGN.md:215`); the pitch **text block** is
   capped at `48rem`. This is a text measure, the same kind of thing
   `DESIGN.md:199`'s 65–75ch already is for Body — not a third container width.
   The narrow measure is the *mechanism* that makes big type stack as slabs
   rather than set as a wide sentence, which is the superseded 02's finding 2 and
   the superseded 03's finding that padding — not `line-height` — decides the
   break. At the full `72rem` the pitch would set as two 27-character lines: a
   wide sentence set large, the exact defect the prior map diagnosed. Rejected a
   `ch`-based cap — `ch` measures a lowercase zero and the role is caps, so it
   lies by roughly 25%.

7. **Indonesian sets the budget.** One clamp, one line count, measured on the
   longer string; English takes the slack. Authoring to `en` and letting `id`
   spill makes fold height locale-dependent, so a hero eyeballed in English
   silently overflows in the language a real deployment probably uses. A
   per-locale clamp was rejected outright — a new axis of variation in the type
   system to solve a copywriting problem.

8. **The hero wordmark stays at `type-mark`, unchanged from the rail.** No second
   Mark size. It costs nothing, keeps the name length-safe (the whole reason
   decision 2 exists), and the ~30% size gap *is* the hierarchy working: whose
   page is a label, why join is the statement. Dropping the hero wordmark
   entirely was rejected — it contradicts 01 decision 5 and leaves the fold with
   one line of type and a button.

9. **Three lines maximum at the cap.** Matches the reference's own structure
   (`THE / ALL-IN-ONE CLUB / MANAGEMENT PLATFORM` — 3 lines, 37 chars). Two lines
   would cap the copy near 36 Indonesian characters, leaving English about 28 —
   too tight to tell a stranger what this is. Four lines at `0.95` is the wall of
   type the superseded 02 rejected, only louder.

10. **The break is delivered by the measure, never a hardcoded `<br>`.** The two
    locales break at different words, so any manual break is correct in one
    language and wrong in the other. Same pattern `DESIGN.md:197` already
    established for Display: author to a length budget, let the container break.

11. **The 3-line cap binds at the desktop cap only.** At 390px the clamp floors
    at `2.5rem`, the measure becomes the page gutter (~358px), and the budgeted
    string sets to 3–4 lines. Four stacked slabs at that width still fill the
    fold and still read as a shout, so mobile reflow is accepted and is **not** a
    defect. Consistent with the superseded 03's "no step-down — the clamp does
    all the collapsing". Rejected lowering the mobile clamp bound to `2rem` to
    hold three lines everywhere: it trades the mobile hero's force away to
    satisfy a number, and would put `type-hero` *below* Display's clamp
    midrange, destroying the no-overlap property decision 4 bought.

12. **`DESIGN.md:197`'s two-line Display rule survives, scoped to Display.** It
    is still true of Display, which still exists on board surfaces whatever
    happens to the threshold. It is **not** generalised into one shared rule
    across both roles — the line caps differ (2 for Display, 3 for hero) because
    the sizes and measures differ, and a merged rule would have to state both
    numbers anyway. Caveat handed to ticket 09: the rule's wording describes a
    `3rem` statement in a `40rem` tile, and if ticket 06 moves sign-in off `/`
    that instance is gone. It remains a valid **role** rule with no current
    caller; 09 should copy-edit it so it stops reading as a description of a page
    that no longer exists.

### The character budget handed to tickets 07 and 08

At `48rem` (768px), `5rem` uppercase 900 at `-0.03em` runs **≈ 40px per
character** average, giving **≈ 18–19 characters per line**.

- **Pitch budget: ≈ 54 characters, measured on the `id` string, 3 lines max.**
- English is authored second and will land shorter; that is slack, not a target.
- `landing.purpose` as it stands (`Sesi, kursi, dan iuran.` — 23 chars) is far
  under budget and was authored for a threshold, not a pitch. Ticket 08 owns the
  rewrite; this ticket only fixes the budget it must hit.

### Facts established (no decision needed)

- Hero colour was closed by ticket 01: wordmark Chalk Ink `#E7ECE9`, green spent
  once on the CTA. This ticket adds no colour decision.
- `DESIGN.md:308`'s tracking floor (`-0.04em`) is untouched; only the `3rem`
  clause of that Don't needs rescoping to board surfaces.
- The role count changes: `type-roles.css:2` and `DESIGN.md`'s Hierarchy list
  both say **eight** roles. It becomes nine.

### Amendments this ticket hands to ticket 09

1. `DESIGN.md` Hierarchy — add the **Hero** role with the full spec from decision
   4, stating it is the public route's role and appears in exactly one place.
2. `DESIGN.md:308` — rescope the `3rem` Don't to board surfaces; leave the
   `-0.04em` tracking clause alone.
3. `DESIGN.md:209` — record that tight caps and tracked caps are two different
   devices, and that Hero is the tight one, so the Tracked-Caps-Are-Structural
   Rule is not weakened by it.
4. `DESIGN.md:196` — Mark keeps its size and tracking; only its *location* set
   grows (per 01's amendment 2). Hero is 900 as well, so "the only place 900
   appears" needs replacing with something that survives two callers.
5. `DESIGN.md` Typography — record the caps-have-no-descenders reason for a
   sub-1.0 line-height, so it does not read as licence for sentence-case display.
6. `DESIGN.md` Layout — record the hero pitch measure (`48rem` text block inside
   the `72rem` gutter) as a measure rule alongside Body's 65–75ch, and that the
   measure is what sets the break.
7. `DESIGN.md:197` — copy-edit per decision 12.
8. Role count: eight → nine, in `DESIGN.md` and `type-roles.css:2`.
9. The ESLint `no-restricted-syntax` entry from decision 5 (implementation, but
   09 records the rule it enforces).
