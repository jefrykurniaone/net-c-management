# `type-hero` fails twice, and both failures are measured

Type: grilling
Status: resolved
Assignee: jefrykurniaone
Parent: ../map.md
Blocked by: —
Blocks: 09

## Question

[02](02-type-scale-for-a-public-surface.md) defined the ninth type role,
**`type-hero`** — `clamp(2.5rem, 8vw, 5rem)` / 900 / lh `0.95` / `-0.03em` /
uppercase — and budgeted the pitch at **3 lines max at the cap, ≈54 characters
on `id`**, accepting mobile reflow to 4 lines.

[07](07-section-inventory-and-order.md) built the first real hero and measured
it. The role fails in two independent ways, and neither is marginal. What
changes — the character budget, the fold law, or the role itself?

### Failure 1 — the `id` budget breaks 03's fold law

[03](03-layout-law-marketing-versus-board.md) decision 7 made the fold testable:
**no band may push the next band's top edge below the fold at a 900px
viewport.** Measured at 1440×900 with the rail at 57px, hero height is a pure
function of pitch line count:

| pitch lines | hero band | next band's top edge | 03's law |
|---|---|---|---|
| 2 | 628px | 685px | ✅ |
| 3 | 704px | 761px | ✅ |
| 4 | 780px | 837px | ✅ |
| 5 | 856px | **913px** | ❌ |

The real ceiling is therefore **4 lines / 837px**, not 3 — 03's law is slightly
more generous than 02 assumed. But the character budget is far too generous:

- 59 characters of Indonesian → **5 lines** → **913px, past the fold**
- **45 characters → 4 lines** (the ceiling, 63px of margin left)
- ~28–30 characters → 3 lines

So **≈54 characters does not hold**. Indonesian compounds long words
(`MEMAINKANNYA`, `PERMAINAN`), and a 48rem measure at an 80px cap breaks far
earlier than a character count suggests.

### Failure 2 — the `2.5rem` floor overflows the band on a phone

Independent of the fold, and arguably worse, because `PRODUCT.md:13` puts the
audience on a phone and a stranger arriving from a WhatsApp link is on one.

At a 390px viewport the hero band offers **354px** of measure. The longest word
in the Indonesian pitch renders:

| font-size | `MEMAINKANNYA.` | fits in 354px? |
|---|---|---|
| 40px (`2.5rem`, 02's floor) | 371px | ❌ overflows by 17px |
| 38px | 353px | ⚠️ 1px of margin |
| **36px (`2.25rem`)** | **334px** | ✅ 20px of margin |

At 02's floor the statement bleeds past the band's padding to within **2px of
the screen edge** (`assets/07-B-real390-header.png`). Note it is the **floor**
that fails, not the cap — the clamp's lower bound is a fixed `2.5rem`, so it
never gets smaller no matter how narrow the viewport, while `8vw` is irrelevant
below 500px.

07's prototype runs a `2.25rem` floor and measures **0px of bleed on both
sides**, but changing the role is 02's call, not 07's.

## Sub-questions

- **Which gives — the budget, the law, or the role?** Three levers, not
  mutually exclusive: drop the `id` character budget to ~45; state the fold law
  as 4 lines explicitly (it already permits 837px); lower the floor to
  `2.25rem`; or cap `type-hero` lower on `id` specifically.
- **Is a character budget the right instrument at all?** It failed here because
  it measures the wrong thing — line count depends on the longest *word*, not
  the string length. Is the authoring rule "≤45 characters" or "no word longer
  than N characters at the cap", and can either be checked without a test? 08
  ruled out a test for `id` string parity on false-positive grounds; the same
  argument may or may not apply to a length lint.
- **Does the floor change ripple?** `2.5rem` was chosen so `type-hero`'s lower
  bound sits **above Display's `3rem` cap**… except it does not — `2.5rem` is
  already below `3rem`. Check whether 02's non-overlap claim survives at
  `2.25rem`, and whether the ESLint restriction keeping `type-hero` off
  `(main)`/`(admin)` is what actually enforces separation.
- **Does the English pitch have the same exposure?** 07's `en` pitch is 42
  characters and renders 3 lines at the cap and 2 at 390px, so `en` is
  comfortable. The rule has to be written for `id`, which is the binding case.

## Why this is not 07's to decide

07 needed *a* pitch to compose bands against, and it flagged both breaches with
numbers rather than patching 02 unilaterally. `DESIGN.md` has not been amended
yet, so nothing is wrong in the repo — but **09 must not write the ≈54-character
figure into `DESIGN.md`**, which is why this ticket blocks it.

## Answer

**All three levers give, and a fourth failure turned up that nobody had looked
for.** The floor drops to `2.25rem`; the `id` budget becomes **48 characters**;
the line cap becomes **4**; and the character budget gains a **second rule** —
no word longer than 12 characters — because length and word length were never
the same constraint. 03's fold law is not amended.

Re-measured from scratch in a real browser at 1440×900 and at a real 390×844
viewport, not in the `?w=phone` frame. **07's numbers reproduce exactly** — rail
57px, hero 856px, next band's top edge 913px on the 59-character pitch — so the
breach is confirmed independently before anything is decided on top of it.

### Decision 1 — the floor drops to `2.25rem`, and that number is not a nudge

```css
@utility type-hero {
  font-size: clamp(2.25rem, 8vw, 5rem);   /* was 2.5rem */
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  text-wrap: balance;                      /* see decision 9 */
}
```

Cap, weight, line-height, tracking and uppercase all stand. `2.25rem` is the
**unique floor at which the phone stops being a stricter constraint than the
desktop.** Measured by sweeping runs of capitals against the available measure —
343px at a 390px viewport, 768px at the `48rem` desktop measure:

| floor | longest word fitting at 390px | longest word fitting at the `5rem` cap | binding end |
|---|---|---|---|
| `2.5rem` (40px) | **11** caps — 12 caps = 359px in 343px | 12 caps | the phone |
| **`2.25rem` (36px)** | **12** caps — 323px in 343px | **12** caps — 718px in 768px | **neither: equal** |
| `2rem` (32px) | 14 caps | 12 caps | the desktop |

At `2.5rem` the phone allows **one fewer character than the desktop**, so an
author writing a word that is legal at the cap ships a phone bleed they cannot
see. That is exactly the defect 07 hit: `MEMAINKANNYA.` is 12 letters plus a
period, legal at the cap (743px in 768px), and at the floor it renders 371px in
343px — 2px from the screen edge. At `2.25rem` the same word renders **334px
with 35px of clearance and no horizontal page overflow**
(`assets/13-id-phone-floor-2_25rem.png`).

Below `2.25rem` the desktop cap becomes binding at 12 characters anyway, so
`2rem` buys **no** authoring headroom and spends 4px of mobile force for
nothing. **02 decision 11 was right to refuse a lower floor, for the wrong
reason** — see decision 6.

### Decision 2 — two authoring rules, because there are two independent failures

02 had one instrument, and that is why a single string broke two laws at once.
Measured separately, they govern different things and neither predicts the
other:

- **Total length drives line count**, hence the fold. Longest word is
  irrelevant: 54 characters whose longest word is 9 still renders 5 lines.
- **Longest word drives horizontal overflow**, at *both* ends of the clamp.
  Total length is irrelevant: `MENYELENGGARAKAN` (16 letters) renders **973px
  inside the 768px desktop measure** — a 205px bleed at the *cap*, which 07
  never found because it only tested the phone.

So the pitch carries two rules:

- **Rule A — ≤ 48 characters, measured on `id`.**
- **Rule B — no word longer than 12 characters, in either locale.**

### Decision 3 — the budget is 48, and ≈54 was wrong by exactly one character

Measured at 1440×900, `48rem` measure, rail 57px. Hero height is a pure
function of line count, as 07 found:

| `id` characters (longest word ≤ 9) | lines | hero | next band's top edge | 03's 900px law |
|---|---|---|---|---|
| 26 | 2 | 628px | 685px | ✅ |
| 36, 38 | 3 | 704px | 761px | ✅ |
| 45, 48, 51, 51, 51 | 4 | 780px | 837px | ✅ |
| **54**, 57, 59, 60 | 5 | 856px | **913px** | ❌ |

Four strings hold 4 lines, four break to 5. The wall sits between 51 and 54, so
**02's ≈54 is precisely the first failing value** — it did not overshoot wildly,
it landed one character past the edge. 48 is the budget: three under the last
confirmed pass, six under the first confirmed failure, and the margin is
deliberate because `text-balance` puts the exact break at the mercy of where the
words fall. **07's suggested "roughly 45" is over-conservative** by six
characters and would cost the pitch a word for nothing.

### Decision 4 — the line cap becomes 4, forced by 02's own criterion

02 decision 9 capped the pitch at 3 lines and rejected 2 because "two lines
would cap the copy near 36 Indonesian characters… too tight to tell a stranger
what this is". The measurement moves the whole scale down one line: **3 lines on
`id` is 36–38 characters** — which is what 02 believed *two* lines was, and
rejected on exactly those grounds. Applying 02's own test to the real numbers
yields 4. 03's fold law independently permits it, with 63px spare.

02's objection to 4 lines was visual — "the wall of type… only louder".
**Rendered, it is not one** (`assets/13-id-4lines-fold.png`). `text-balance` on
the centred `48rem` measure sets the four slabs as a tapering silhouette — wide,
wide, narrower, narrowest — that funnels the eye down into the pill instead of
stacking a block; and at 837px the enamel band's top edge shows below the hero,
so the material change that is 07 decision 3's whole answer to "two websites
stapled together" still does its work above the fold. 02 was arguing against
four *full-width* lines, which `text-balance` does not produce. Nobody had
looked at it; now someone has.

The phone passes too, unasked: at 390×844 the next band's top edge lands at
~672px, well above the phone fold.

### Decision 5 — 03's fold law is not amended, and not restated in lines

It stays a pixel law: *no band may push the next band's top edge below the fold
at a 900px viewport.* The 4-line ceiling is a **consequence** of this hero at
this composition — 06 already moved it once by ~60px — so writing "4 lines" into
`DESIGN.md` would freeze a number that the hero's other five elements control.
Pixels are the law, characters are what an author controls, lines are the bridge
between them and belong in the rationale only. **09 writes characters, never
lines.** 03's law was never wrong; it was more generous than 02 assumed, and 02's
number was the error.

### Decision 6 — the non-overlap property survives, but 02's stated reason is false

02 decision 4 claimed the floor "sits **above** Display's `3rem` cap". It does
not, and never did: `2.5rem` is 40px, `3rem` is 48px. The property 02 actually
wanted — Hero renders larger than Display at every viewport — is true, and
survives the new floor. Measured: **at 390px, Hero 36px against Display 28px; at
1440px, Hero 80px against Display 48px.** Display only reaches its `3rem` cap at
≥960px, where Hero is already 76.8px, so the two never meet. The minimum ratio
is **1.29×**, at viewports ≤450px where both roles sit on their floors.

At a `2rem` floor that ratio would be 1.14× (32px against 28px) — not a legible
hierarchy step. **That** is the real argument against going lower, and the
correct version of 02 decision 11's instinct.

Consequence, and it matters: the size gap was doing rhetorical work it cannot
do — 02 called it "what stops *just use `type-hero`* ever being arguable on a
board surface". It is a **property, not a guard**. The ESLint restriction from
02 decision 5 is the only thing that actually enforces separation. 09 records
the ratio as a property, names the lint as the enforcement, and **does not
repeat the "above the `3rem` cap" sentence.**

### Decision 7 — both rules are enforced by a test; 08's argument does not transfer

08 refused a test for `id` string parity because an untranslated string cannot
be detected without false positives — that judgement is unautomatable. Rules A
and B need no judgement: length is length, longest word is longest word, on one
known key (`landing.hero.pitch`) in two locales. A ~10-line Vitest case under
`src/lib/__tests__/` asserting both rules against both locales is pure logic
with no infrastructure — exactly what that directory already holds. This follows
02 decision 5's own principle that a rule nothing enforces is a rule that leaks.
Lint is the wrong instrument: this is a data property of a dictionary value, not
a syntax pattern.

### Decision 8 — the pitch also carries a hard overflow guarantee, under Rule B

Rule B is an authoring rule and authoring rules get broken. The `h1` takes the
same `min-w-0` + `break-words` treatment 07 gave the wordmark, for the reason 07
gave: a mid-word break is cosmetic, bleeding off the screen is functional. Order
of preference: **hold Rule B → break at spaces → break mid-word → never bleed.**
This is a floor under Rule B, not a replacement for it — a mid-word break in a
900-weight uppercase slab is a visible defect, so the guarantee exists to make a
violation degrade instead of breaking the page.

### Decision 9 — `text-wrap: balance` is part of the role's contract

Every number above was measured with it on, and it is what produces the taper
that answers 02's wall-of-type objection. It therefore belongs **inside the
`@utility`**, not sprinkled on the element: drop it and the budget in decision 3
is invalid and decision 4's visual verdict goes with it.

### Amendments handed to 09 — three of them overwrite 02's and 08's handoffs

1. **The role, at the corrected clamp** — `clamp(2.25rem, 8vw, 5rem)` plus
   `text-wrap: balance`. **Overwrites 02 handoff 1**, which specifies `2.5rem`.
2. **The character budget is 48 on `id`, not ≈54.** **Overwrites 08's handoff**
   ("a character budget on `type-hero`, per 02's ≈54 characters"). The ≈54
   figure is dead and must not reach `DESIGN.md` — this was the whole reason 13
   blocked 09.
3. **New: the 12-character word rule**, beside the length budget. No prior
   handoff carries it, because nobody knew the constraint existed.
4. **Replace 02's non-overlap sentence.** Do not write "the lower bound sits
   above Display's `3rem` cap". Write the per-viewport property (Hero ≥1.29×
   Display at every width, both roles on their floors below 450px) and name the
   ESLint restriction as what enforces the separation. **Corrects 02 handoff 4's
   neighbourhood and 02 decision 4's reasoning.**
5. **The Vitest rule** from decision 7 — 09 records the rule, the test itself is
   build work.
6. **The pitch's overflow guarantee** from decision 8 — record it beside the
   Mark-role guarantee 07 already handed to 09; same mechanism, different role.
7. **03's layout law: no amendment.** Record explicitly that restating it in
   lines was considered and refused, so a later reader does not "tidy" the
   pixel law into a line count.

Unchanged and still 09's, exactly as 02 left them: the caps-have-no-descenders
reason for `line-height: 0.95`; the `48rem` measure rule (now with the note that
the measure **and** the floor together set the word budget); rescoping
`DESIGN.md:308`'s `3rem` Don't to board surfaces; `DESIGN.md:196`'s "only place
900 appears"; `DESIGN.md:197`'s copy-edit; and the role count eight → nine in
both `DESIGN.md` and `type-roles.css:2`.

### Assets

- `assets/13-id-4lines-fold.png` — the 4-line `id` hero at 1440×900, next band's
  top edge at 837px. The composition 02 rejected sight-unseen.
- `assets/13-id-phone-floor-2_25rem.png` — `MEMAINKANNYA.` at the `2.25rem`
  floor on a real 390×844 viewport, contained on both sides.

### Honest about

The prototype at `src/app/prototype/landing/parts.tsx:80` already runs the
`2.25rem` floor with a comment flagging it as a deviation handed back to 02 —
this ticket ratifies it and adds the word rule the prototype has no way to
express. **Nothing in `DESIGN.md`, `type-roles.css` or the dictionary was
touched**; this is a decision ticket and the amendments are 09's to write. The
48-character demonstration string (`Ada permainan setiap minggu, dan tempat
bermain.`) is **evidence that the budget is reachable, not a copy decision** —
the pitch belongs to 08.
