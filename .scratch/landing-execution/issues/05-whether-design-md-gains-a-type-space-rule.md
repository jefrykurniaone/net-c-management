# Whether DESIGN.md gains a type-to-space rule

Type: grilling
Status: open
Blocked by: 03, 04
Parent: ../map.md

## Question

Tickets 02–04 will settle this page. This ticket decides whether anything learned
gets written back into the system, so the next surface using `type-display` does
not rediscover the same gap.

Ticket 01 established three silences in DESIGN.md:

1. No rule pairs type size with padding, and the spacing scale stops at 28px
   while display type reaches 48px.
2. `type-display` has no documented maximum line or character count.
3. Vertical placement is unaddressed entirely.

For each, decide: **amend DESIGN.md, or leave the silence deliberate?** A design
system that documents eight type roles and a four-step spacing rhythm to this
level of precision is unlikely to have left these out on purpose — but adding
rules has a cost, and an over-specified system is its own failure. It is a
legitimate answer that these stay judgement calls.

If any answer is "amend", this ticket also decides the wording, since DESIGN.md
is written in a distinct voice ("a board is read, not shouted at", "Nothing
floats, nothing glows") that a bolted-on rule would break.

Worth noting while deciding: `src/app/styles/board-materials.css:9-14, 96-102,
147-150` shows the established pattern for a sanctioned deviation — the override
sits in the token layer with the reason in a comment, rather than DESIGN.md being
rewritten. A one-off exception may belong there instead.

Blocked by 03 and 04 because there is nothing to generalise until the concrete
decisions exist.
