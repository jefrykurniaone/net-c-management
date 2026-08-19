# The brand layer under a runtime white label

Type: grilling
Status: resolved
Parent: ../map.md
Blocks: 02, 03, 06, 07

## Question

The reference page's punch is ~80% brand: a fixed wordmark, near-black display
type, and one saturated green owned by the company. This repo has none of that —
`PRODUCT.md:86` says `XClub Community` is a placeholder with no logo, wordmark,
or palette, and `PRODUCT.md:88` makes community name and logo **runtime
configuration** that every surface must survive being absent.

So: what is the brand layer of a page whose identity is data?

Sub-questions this must settle:

- Is the accent colour **fixed in the design system** (one colour every
  deployment gets) or **per-community configuration** (a new `Settings` key,
  admin-picked)? Today the board palette is deliberately neutral, and
  `DESIGN.md:307` forbids coloured accent lines on neutral cells — does a
  marketing surface get an exemption, or does the accent live only in the CTA?
- If per-community, who guarantees contrast? `PRODUCT.md:115` holds WCAG 2.1 AA
  as a requirement, and an admin-picked hex can fail it. Is the picker
  constrained to a vetted set?
- What carries identity in the hero when `logoUrl` is empty — the community
  name set in type, as `CommunityIdentityMark` already does at small size?
- Does the marketing surface get its own typeface, or does it push the existing
  one harder? A second family is a payload and a decision, not a free win.
- Note `Activity.color` already exists per activity (`PRODUCT.md:55`). Is the
  page's accent derived from those rather than newly configured?

## Answer

**The brand layer is the design system itself, on a second material.** Identity is
data only where `PRODUCT.md:88` says it is — *name and logo*. Colour, typeface, and
material are code, fixed for every deployment. The landing's force comes from
changing **material**, not from adding brand.

### Premise corrections

Three of the ticket's five sub-questions were already answered by `DESIGN.md` and
are recorded closed, not decided here:

- **Typeface** — `DESIGN.md:207` (The One Hand Rule). No second family on the
  marketing surface. Archivo, harder, or nothing.
- **`Activity.color` as page accent** — `DESIGN.md:284` already ruled Activity
  livery colourless, for two reasons that apply identically at page scale: it
  competes with the identity green, and an arbitrary hex can't be trusted for
  contrast. A page accent derived from `Activity.color` is the same rejected move.
- **"The repo has no palette"** — false. `DESIGN.md:158` fixes Court Green
  `#17614A` as the identity and `:184` (The One Green Rule) makes it the only
  green. What the repo lacks is a **wordmark and a logo**, not an accent.

### Decisions

1. **Accent is fixed in the design system.** No new `Settings` key, no admin
   colour picker, no vetted set. Court Green `#17614A` / Court Green Lit
   `#4FBF8E` as already defined. Rationale: The One Green Rule, plus
   `PRODUCT.md:115` (WCAG 2.1 AA) — an admin-picked hex cannot be guaranteed
   against four grounds (enamel ground/tile, board ground/tile), so the
   contrast requirement would become unenforceable at build time. White-label
   covers name and logo; colour was never in that set.

2. **The hero stands on painted board.** Board Ground `#1B2621`, Chalk Ink
   lettering, Court Green Lit as the accent. This is what buys reference-grade
   punch: `#17614A` on Enamel Ground reads sober-institutional, and `#4FBF8E`
   is only legitimate on board material per `DESIGN.md:158`. A third,
   marketing-only green was rejected outright — it detonates The One Green Rule.
   Accepted cost: the public page looks unlike the light-mode surfaces a member
   sees after signing in. Judged correct — a pitch and a working board are
   different rooms.

3. **The hero material is fixed, not themed.** The band renders painted board
   regardless of the visitor's `.dark` state. A logged-out stranger has never
   set a preference, and letting the hero follow system preference would make
   the page's force a coin flip. Rejected forcing the whole route dark — that
   hides a working control and argues with a preference the user *did* set.
   **Consequence:** the landing hero is the one surface where board material is
   not the dark theme. Requires a `DESIGN.md` amendment (ticket 09).

4. **Painted board extends to the hero band only.** One hard rule as the seam;
   every section below is enamel. One material change is a statement, three is
   a pattern, and a pattern stops reading as emphasis. It also keeps the
   real-data proof bands (ticket 04) on the same material members actually read
   data on — the proof band shows the real product, so it should look like it.
   This boundary is binding on tickets 03 and 07.

5. **Identity in the hero is the community name in type — no mark, ever.**
   `CommunityIdentityMark` is not scaled up. Its own contract
   (`identity-mark.tsx:4`) is that it is *never a placeholder graphic*, and a
   three-letter abbreviation token at hero scale is exactly that wearing a
   costume. Rejected also the branch where a real logo gets a hero slot and an
   absent one falls back to name-only: that ships two hero compositions to
   design, test, and maintain forever. **The community name is the wordmark.**
   Absent-logo becomes the default case rather than the degraded one, which is
   the only way `PRODUCT.md:88` is genuinely satisfied.

6. **A configured `logoUrl` appears in the header rail only.** The mark keeps
   its existing job as board furniture (`DESIGN.md:278`) and looks identical
   whether it carries a real logo or the abbreviation token. Accepted cost: a
   community that uploads a logo gains no extra force on the landing. That is
   the price of a hero that works when identity is absent.

7. **Two type roles are present in the hero: wordmark + display sentence.**
   A stranger needs *whose page is this* and *why would I join* — two jobs, and
   one line cannot hold both. The name takes the **Mark** role (900, tracked
   caps); the pitch takes the **Display** role. **This breaks `DESIGN.md:196`**
   ("the only place 900 appears" = the rail mark) and is therefore an
   amendment, not a free choice (ticket 09). Sizes, scale, and the `3rem`
   display cap are **ticket 02's** call — this ticket fixes only which roles
   are present and what each carries.

8. **The hero wordmark is Chalk Ink `#E7ECE9`, not green.** Green spent on the
   wordmark is green taken from the CTA, and the map's Notes name "one loud
   single action" as a wanted quality. Green appears exactly once above the
   fold. Consistent with `DESIGN.md:160`, which records the identity colour as
   deliberately *not* load-bearing — structure and lettering carry the work.

9. **No exemption from the Cell-Scale Rule** (`DESIGN.md:180`) or any other
   colour rule. The marketing surface gets none in advance. A full-fill green
   CTA tile is already compliant — that is colour filling a whole cell. If a
   section later genuinely cannot be built inside the rules, that is a new
   ticket with a concrete case.

### Facts established (no decision needed)

- **The loud CTA needs no new token.** `src/app/styles/board-materials.css:115-118`
  already inverts primary polarity for board material: `--primary: #4FBF8E`,
  `--primary-solid-foreground: #1B2621` — dark ink on lit green, ~8:1. The
  light-mode contract (`DESIGN.md:260`, Enamel Tile text on Court Green) would
  have failed here at ~2:1; the existing tokens already solve it.
- **The app has a real theme toggle**, class-based: `globals.css:12`
  (`@custom-variant dark (&:is(.dark *))`), `ThemeProvider.tsx`,
  `ThemeToggle.tsx`, persisted per user in `(main)/profile/account-settings.tsx`.
  Painted board *is* the dark theme today — which is precisely why decision 3
  needs writing down.

### Mechanism

The fixed-material hero is built by **wrapping the hero band in `.dark`**,
reusing the existing token block verbatim — no new CSS, no duplicated tokens.
This overloads the class, so the overload is made honest by recording it:
**`.dark` in this codebase names a material (painted board), and theme selection
is one caller of it, not its definition.** That reading is already true of
`board-materials.css`, which describes materials rather than modes. A rename to
a material-named variant is correct in principle but touches every surface in
the app — well past this map's destination, and not taken. Route the wording to
ticket 09.

### Amendments this ticket hands to ticket 09

1. `DESIGN.md` — the landing hero is fixed painted board regardless of theme;
   material is not mode.
2. `DESIGN.md:196` — the Mark role (900) gains a second location, the hero
   wordmark. "The only place 900 appears" no longer holds as written.
3. `DESIGN.md` — clarify that `.dark` names the painted-board material and the
   theme toggle is one caller of it.
