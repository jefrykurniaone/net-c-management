# Design rules governing the threshold

Type: research
Status: resolved
Parent: ../map.md

## Question

Before any execution decision can be made, what does the design system actually
mandate? Specifically: is there a rule pairing type size with padding; what is
`type-display` specified for; is there a spacing step larger than `bay`; is
vertical placement specified; and is an internal rule dividing one tile a
sanctioned pattern?

## Answer

Sources: `DESIGN.md`, `PRODUCT.md`, `CONTEXT.md`, `src/app/globals.css`,
`src/app/styles/*`, and git commit bodies. All findings quoted with citations.

**1. No type-size-to-padding rule exists.** DESIGN.md never states that larger
type needs more surrounding space. The only directional guidance is
`DESIGN.md:213`: "Spacing rhythm is `2 / 10 / 16 / 28` — hairline separation
inside a tile, `10px` inside a cell, `16px` between cell groups, `28px` between
bays. More space above a heading than below it." Component padding is fixed per
component, not derived from type size (`DESIGN.md:267` "**Padding:** `10px`,
rising to `16px` for a bay"; actions `12px 20px` at `DESIGN.md:259`).

**2. `bay` = 28px is the largest spacing step. Nothing above it is tokenized.**
Four steps total, in both `DESIGN.md:81-85` and `globals.css:88-92`.

**3. `type-display` is a heading role, not prose.** `DESIGN.md:197`: "**Display**
(800, `clamp(1.75rem, 5vw, 3rem)`, 1.02): page-owning statements. Capped at 3rem
— a board is read, not shouted at." Prose is a separate role — `DESIGN.md:199`
"**Body** (400, `0.9375rem`, 1.55): prose, at 65–75ch measure." A hard ceiling
exists at `DESIGN.md:308`: "**Don't** exceed `3rem` display type, or track
tighter than `-0.04em`." **Max line count and max character count for display:
not addressed.**

**4. Vertical placement: not addressed.** DESIGN.md contains no rule about
vertical centering, `min-h-screen`, or viewport anchoring. The only related
signal is from git rather than the doc — commit `dd95ac5` body lists what it
removed: "The centred hero, the sparkle badge and the four-up icon-card feature
grid go with it."

**5. An internal shared rule is sanctioned, provided it is neutral.**
`DESIGN.md:236` "Borders are the primary form device: 1px `Ruled Line` around
and between cells." Commit `dd95ac5` describes the intended form as "one tile
resting on the ground divided by a shared rule". The anti-pattern is the
opposite — `DESIGN.md:302` "**Don't** use gaps between floating panels where a
shared rule belongs." But colour is forbidden: `DESIGN.md:307` "**Don't** put a
coloured accent line on a neutral cell, in any direction, at any width." So the
current neutral `border-t border-rule` is correct as-is.

**6. `shadow-tile` is reserved for genuinely movable things** (`DESIGN.md:223`;
cells get "**Shadow:** none at rest", `DESIGN.md:267`). Already enforced on this
page by `44523b9`, which stripped the shadow from the container and left it only
on the action. Do not reintroduce it to the tile.

**7. The landing page's purpose is undocumented outside git.** PRODUCT.md and
CONTEXT.md do not mention a landing page or root route at all. The rationale
exists only in `dd95ac5`: "Nobody arrives at this page to be sold to: every
authenticated visitor is redirected away before it renders … The pitch is gone."
Related constraint: `PRODUCT.md:94` — "There is **no real-world evidence** …
no invented member counts, no 'trusted by N communities', no fabricated
screenshots".

**8. `src/app/auth/signin/page.tsx` is not deprecated.** No markdown says so;
`DESIGN.md:215` still names sign-in as a sanctioned 40rem single-task column,
and `44523b9` deliberately kept it: "The Google server action existed twice …
Extracted to `continueWithGoogle()` so **both doors in are the same code**." It
remains the middleware redirect target (`TESTING.md:88`) even though the landing
no longer links to it. Ruled out of scope on the map for that reason.

### Consequence for this map

Findings 1–3 together are the substantive discovery: **the spacing scale tops out
at 28px while the type scale reaches 48px, and no documented rule connects
them.** A 3rem statement framed by `p-block` (16px) is not violating any written
rule — the rule simply does not exist. That gap is what tickets 02, 03 and 05
exist to close.
