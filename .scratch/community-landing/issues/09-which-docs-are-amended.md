# Which documents are amended, and how

Type: grilling
Status: open
Parent: ../map.md
Blocked by: 02, 03, 06, 07

## Question

This map changes what `/` is for. That is a product fact, not only a visual one,
and it currently lives in no document — `PRODUCT.md` and `CONTEXT.md` never
mention the landing page, and the previous rationale survives only in the
`dd95ac5` commit body.

What gets written down, where, and in what words?

Candidate amendments, each to be ruled in or out with a reason:

- **PRODUCT.md — the public route exists and who it is for.** Previously ruled
  out of scope as a doc gap; this map's destination makes it a decision, so it
  is back in.
- **PRODUCT.md — the joining policy** authored by 05. Whether joining is
  self-serve, gated, or off-app is a durable constraint, not a page detail.
- **PRODUCT.md — what the public route may publish**, from 04. A no-list that
  lives only in a component will be broken by the next component.
- **DESIGN.md:197 / 308 — the display cap**, per 02: amended, scoped, or joined
  by a separate marketing role.
- **DESIGN.md:215 — the layout law**, per 03. Note that `215` was *already*
  amended by the superseded map to top-anchor `/`. Superseding text must be
  replaced, not layered on top of, or the doc contradicts itself.
- **DESIGN.md — the accent**, per 01. *Resolved by 01 as needing no amendment:*
  the accent stays Court Green, fixed in code, and no exemption from `180`/`307`
  was granted. What 01 *does* hand over is three other amendments:
  - **DESIGN.md — material is not mode.** The landing hero renders painted board
    regardless of the visitor's theme. Today board material and the dark theme
    are the same thing; this is the first surface where they part.
  - **DESIGN.md:196 — the Mark role gains a second home.** "The only place 900
    appears" (the rail mark) no longer holds: the hero wordmark is the second.
  - **DESIGN.md — `.dark` names a material, not a mode.** `board-materials.css`
    already describes painted board; the theme toggle is one caller of that class,
    not its definition. Wording only — no rename, ruled past the destination.
- Whether the superseded map's own decisions get a marker so a future reader
  doesn't apply a threshold-era rule to a marketing page.

A spec is not a changelog: record rules, not history. Anything that is merely
what-happened stays on this map.

## Answer

<!-- resolved by the session that takes this ticket -->
