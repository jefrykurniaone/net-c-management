# Where the tile sits vertically

Type: grilling
Status: open
Blocked by: 03
Parent: ../map.md

## Question

The page is `flex min-h-dvh flex-col` with
`<main className='flex flex-1 items-center justify-center …'>`, so the tile is
centred both ways in the viewport. On a tall desktop window that leaves a large
empty field of `bg-background` above and below a hairline-bordered tile, which is
a substantial part of why the page reads as unfinished.

Two facts from ticket 01 make this a real decision rather than a preference:
DESIGN.md **does not address vertical placement at all**, and commit `dd95ac5`
lists "The centred hero" among the things it removed — yet `items-center
justify-center` is still on the `main`. Either the commit message overstated what
changed, or the centring survived by oversight. Establish which, then decide:

- **Anchor to the top**, below the identity rail, with a spacing step of clear
  air above it. Treats the tile as a plate pinned to a board — consistent with
  "this is a board, and a board is full" (`DESIGN.md:215`) — and removes the
  floating-in-a-void quality.
- **Keep it centred**, and accept the empty field as intentional calm for a page
  whose only job is one action.
- **Centre within a bounded band** rather than the full viewport height, so it
  stops drifting on very tall windows without pinning to the top.

Blocked by 03 because the tile's finished height determines how much empty field
there actually is — a taller, better-framed tile may make centring read fine.

Settle also: whether the footer should stay pinned to the bottom of the viewport
or follow the content, since it is currently stranded far from the tile by the
same centring.
