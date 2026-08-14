# Which role carries the purpose sentence

Type: grilling
Status: open
Blocked by: 01
Parent: ../map.md

## Question

`landing.purpose` is currently a twelve-word sentence with a colon and three
comma clauses — "The board for this community: sessions posted, seats claimed,
dues settled." — set in `type-display`: weight 800, `clamp(1.75rem, 5vw, 3rem)`,
`line-height: 1.02`, `letter-spacing: -0.02em`, inside a `40rem` tile.

At the desktop cap that is 48px type at 1.02 line-height wrapping to four lines,
so consecutive lines very nearly touch. `type-display` is specified for
"page-owning statements" (`DESIGN.md:197`) while prose has its own role at
65–75ch (`DESIGN.md:199`), and ticket 01 established that **no maximum line or
character count for display is documented**.

So: is a twelve-word, three-clause sentence a "page-owning statement", or is it
prose wearing a display role? Decide which of these the page does — and the
answer sets the target length for any copy rewrite, which is why the copy itself
sits in the map's *Not yet specified* rather than here:

- **Split the roles.** Cut a genuinely short statement for `type-display` and
  demote the three-clause enumeration to `type-body`. Keeps a page-owning
  statement at full size and gives the detail a readable measure. Costs a copy
  rewrite in both locales, and adds a second text block inside the tile.
- **Demote wholesale.** Keep the sentence exactly as written and drop it to a
  smaller role (`type-title`, or display's lower clamp bound). No copy change,
  no new block — but the page then has no display-scale statement at all, which
  may be precisely the point given "a board is read, not shouted at".
- **Keep the role, loosen the setting.** Keep sentence and role, but raise
  `line-height` above 1.02 for this instance. Cheapest, and 1.02 at four lines is
  plausibly the whole defect — but it means overriding a type role locally, and
  the roles are meant to be used as defined.

Grill toward one of these. Things to settle while deciding: is four lines
acceptable at any line-height; should the display role gain a documented line
cap (feeds ticket 05); and does the colon survive a rewrite.
