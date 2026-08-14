# Framing display type when the scale stops at 28px

Type: prototype
Status: open
Blocked by: 02
Parent: ../map.md

## Question

Ticket 01 established the gap: the spacing scale is `2 / 10 / 16 / 28` with
**`bay` (28px) the largest step and nothing above it**, while `type-display`
reaches **48px**. No documented rule connects type size to padding. The tile
currently frames its statement with `p-block` — **16px** — and the whole tile is
`max-w-[40rem]`.

Once ticket 02 has fixed which role carries the statement, decide how it is
framed. This is a prototype ticket because the answer is a judgement about
proportion that nobody can make reliably from numbers on a page — build it and
look at it.

Prototype the tile across the candidates and react:

- `p-block` (16px) as today, at whatever type size 02 landed on.
- `p-bay` (28px) — the largest existing step, requiring no system change.
- Something above 28px, which means **either a new spacing token or a documented
  one-off exception** — and therefore feeds ticket 05.
- Asymmetric framing, per the one directional rule that does exist:
  `DESIGN.md:213` "More space above a heading than below it."

Constraints to hold while prototyping: the tile stays `40rem`
(`DESIGN.md:215` — sign-in is a sanctioned single-task column); the internal
divider stays a neutral `border-rule` (01, finding 5); the tile takes **no**
shadow at rest and the action keeps its own (01, finding 6); density is
deliberately high — `DESIGN.md:215` "this is a board, and a board is full", so
generous padding must be argued for, not assumed.

Resolve with the chosen padding values and, if the answer exceeds 28px, an
explicit statement of whether that is a new token or an exception.
