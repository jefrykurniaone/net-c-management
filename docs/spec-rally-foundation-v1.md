# Spec: Rally foundation — tokens, type, chips, primitives, DESIGN.md rewrite

| | |
|---|---|
| Spec | [#142](https://github.com/jefrykurniaone/net-c-management/issues/142) — `spec:rally-foundation` |
| Run | `run:rally` |
| Execution map | filled in at Stage 4 of the pipeline |
| Tickets | filled in at Stage 3 of the pipeline |
| Version | v1 (2026-08-30) |
| Grilled from | the request to restyle the app after the Playbypoint case study (Afternow, Dribbble shot 26560263) |
| Depends on | nothing open; first spec of the run. Binding ADR: [0003](adr/0003-retire-papan-jadwal-for-rally.md) |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-08-30 from the request to restyle the app after the Playbypoint brand case study (Afternow, Dribbble shot 26560263). Depends on nothing open. First of five specs in run `rally`; every other spec in the run depends on this one.

Repo copy: `docs/spec-rally-foundation-v1.md`. Execution map and tickets are linked below once they exist.

## Problem Statement

The product looks like a hall notice board on purpose — square tiles, ruled lattice, one green, state carried by the shape of a mark. That system (Papan Jadwal) was built deliberately and shipped across every surface, and the owner has now decided it is not the product they want to show people. The reference they want is a contemporary sports-club SaaS identity: a near-black green and a pale lime as the brand pair, a bright green for actions, warm off-white grounds, rounded cards floating on soft shadows, condensed heavy uppercase headlines, thin-line patterns (grids, concentric rings, diagonal dashes), and photography with motion.

Nothing in the current token layer, type roles, mark components or shadcn primitives can express that look. Changing surfaces one at a time on top of the old tokens would produce a product that is two products for the duration of the change, and would leave every later surface re-deciding radius, shadow and colour on its own.

## Solution

Replace the design system at its foundation and let the surfaces inherit the change. The new system — internal name **Rally**, a name that never reaches user-facing copy — is defined in a rewritten `DESIGN.md` and implemented as a new token layer (colour for both themes, type roles on one variable font with its width axis, radius and shadow scales), a restyled set of shadcn primitives, a **status chip** component that replaces the six marks, and a small set of decorative pattern primitives. Because the current surfaces already consume tokens and shared primitives at roughly two hundred sites, most of the product changes appearance the moment this spec lands; the four surface specs that follow refine layout on top of it.

Papan Jadwal is retired in full: its rules, its marks, its metaphor. The rewritten `DESIGN.md` carries a short "retired rules" record so the reasoning is not lost and the decisions are not re-argued, and an ADR records why a shipped design system was replaced.

## Goals and success criteria

Goals:

- One token layer expresses the Playbypoint-derived look in both a light theme (off-white grounds) and a dark theme (Black Green ground), and every existing surface renders on it with no page edits beyond what tokens force.
- Every state the product shows (Payment, Session, Attendance, Membership) is a chip with a colour and a text label, in both locales, legible in both themes.
- Headlines and page titles set in condensed heavy uppercase from the same font family already loaded, with no second family.
- WCAG AA holds on every text-on-surface and chip-on-wash pair, measured and recorded.

Non-goals: any layout change to a specific surface (those are the four following specs), any new data, charts, photography assets, or navigation restructuring.

Success criteria — this spec is done when:

- `DESIGN.md` is rewritten for Rally, with a retired-rules section and no reference to board, tile, rail, lattice or mark as live rules; ADR 0003 records the replacement.
- The new `TC-DS-*` suite in `TESTING.md` has been executed and recorded, with every contrast case passing in both themes and both locales, and the old TC-DS, TC-MS and TC-AR visual cases marked superseded (not deleted).
- No surface renders a square 2px tile, a torn-edge or dashed mark, or a ruled lattice; a grep for the retired token names finds no consumers.
- The production build passes the repo gate (lint, type-check, Vitest, `next build`).

## User Stories

1. As a Member, I want the app to look like a modern club app rather than a notice board, so that I trust it with my money and recommend it to friends.
2. As a Member, I want every status (paid, pending, rejected, registered, present, opted out, no-show, cancelled, full) to be a labelled chip, so that I never have to decode a shape or a colour.
3. As a Member using a screen reader, I want every status announced as its label, so that colour-only state never hides information from me.
4. As a Member on a phone in the evening, I want a dark theme that is a real dark ground and not a dimmed light theme, so that the app is comfortable to read court-side.
5. As a Member, I want the primary action (join, pay, upload) to be unmistakable — bright green with dark text — so that I find it without hunting.
6. As a Member, I want links, focus rings and selected items to share one accent (purple) distinct from actions, so that I can tell "go somewhere" from "do something".
7. As an Admin reading forty rows, I want chips whose colour differences are large (green / orange / dark red / neutral), so that a scan of the queue works even before I read labels.
8. As an Admin, I want dense tables to keep tabular figures and aligned amounts under the new look, so that half an amount is never mistaken for a different number.
9. As an Owner, I want the community name and logo to sit in a header that reads as our brand, not the software's, so that the white-label promise holds.
10. As an Owner, I want the brand colours fixed by the product (not a Settings field), so that no Admin can pick a colour that fails contrast.
11. As a developer, I want radius, shadow, colour and type to come from tokens and shared primitives only, so that a later surface cannot invent its own card.
12. As a developer, I want the retired rules recorded with their reasons, so that I do not re-open the same argument in six months.
13. As a developer, I want the contrast numbers recorded in the test document, so that a nudged token fails on a number rather than an opinion.
14. As a visitor with reduced-motion preferences, I want transitions to respect `prefers-reduced-motion`, so that the new hover and focus transitions never move content against my settings.
15. As an Indonesian-locale user, I want every chip label translated, so that a state is never English-only.
16. As a keyboard user, I want a visible focus ring on every control in both themes, so that I can navigate without a pointer.

## Implementation Decisions

**Palette.** Sampled from the reference and then adjusted by contrast measurement, never the other way round. Roles:

- *Black Green* (near-black, green-leaning): dark theme ground; primary ink on light grounds; text on Lime and PBP Green.
- *Lime* (pale yellow-green): brand surfaces — the hero band's light variant, highlighted panels, active navigation item, the icon tile behind an Activity initial.
- *PBP Green* (bright green): the primary action ground and the "settled / confirmed / present" chip. Always carries Black Green text; white on this green fails AA and is banned.
- *White* and *Shells* (cream, beige, taupe): light theme grounds, card faces, borders, dividers, disabled states.
- *Purple*: links, focus ring, selected / active states, informational chip. As running text it is darkened until it clears 4.5:1 on the light ground; the reference value is kept for fills that carry white text at heading sizes and for decoration.
- *Orange*: the provisional chip (Pending Payment, Seat held on unverified money). Free for charts and decoration.
- *Dark Red*: the void / failed chip (Rejected Payment, cancelled Session, No-Show). Free for charts and decoration.

Colour is no longer bound one-to-one to meaning: a chip's label is the channel that carries meaning, colour reinforces it. The old One Green Rule and Mark-Not-Hue Rule are retired; the WCAG 1.4.1 obligation is met by the mandatory label, and the `TC-DS` suite asserts that no chip renders without one.

**Two themes.** Light = White / Shells grounds with Black Green ink. Dark = Black Green ground with off-white ink, card faces one step lighter than the ground, chip washes darkened and their inks lifted so every pair clears AA. The theme toggle stays; the public hero band renders dark regardless of theme (existing decision, kept). Both themes are computed as pairs and measured, not eyeballed.

**Typography.** One family, Archivo, loaded with its width axis (62–125) in addition to weight. Roles:

- *Display*: condensed width, heaviest weight, uppercase, tight leading — the hero pitch, page titles inside the app, section heads on the public page.
- *Statement*: regular width, medium-heavy weight, sentence case — large statements that are not headlines (the "unleash your club's full potential" register).
- *Title*, *Body*, *Caption*, *Label* (small tracked caps for column heads and chip text), *Figure* and *Figure Lead* (tabular numerals, regular width) — carried over in role, re-tuned in size and weight.

The ESLint rule that confined the hero role to the public route is removed; Display is a system-wide role. Figures never take the condensed width, because condensed numerals break tabular alignment.

**Shape and depth.** Radius scale: 8px controls (buttons, inputs, selects), 12px cards and dialogs, full pill for chips and avatars. Cards are white (light) or one step above ground (dark) with a soft, low, offset shadow and no border, on every ground. Shadow tokens: rest, hover (slightly lifted), pressed (none). Borders are reserved for inputs and dividers inside a card.

**Status chips.** One component replaces the six marks. Anatomy: pill, tinted wash, a small filled dot in the chip colour, and the label in Label type. Variants by semantic: settled (PBP Green), provisional (Orange), void (Dark Red), neutral (Shells — withdrawn / opted out / empty), info (Purple). The existing resolver that maps domain states to a mark kind is kept and re-targeted to chip variants and label keys, so every surface resolves state through one function and no call site picks a colour. Torn edges, dashed outlines and strike-throughs are gone; the "struck value beside a void chip recedes" behaviour is kept as plain de-emphasis.

**Pattern primitives.** Four decorative backgrounds as CSS or inline SVG, each a component with a size and a colour prop resolved from tokens: thin grid lines, concentric rings, diagonal dashed lines, a row of thin arrows. They render behind content only, are `aria-hidden`, and never carry information. No sport-specific shapes (the reference's ball outlines are replaced by rings) because the product must not name a sport.

**Primitives restyled.** Button (primary = PBP Green / Black Green text; secondary = Black Green / white text; ghost; destructive = Dark Red), Input, Select, Textarea, Checkbox, Dialog, Sheet, Tabs, Table, Badge (becomes the chip), Card, Avatar, Skeleton, Sonner toasts, Empty state, Stat card. The shadcn `components.json` stays as is; the primitives are edited in place.

**Motion.** Hover and focus transitions on interactive elements, 150–200 ms, honouring `prefers-reduced-motion`. No entrance or scroll animations.

**Documentation.** `DESIGN.md` rewritten from scratch for Rally: overview and north star, colours with measured pairs, typography, shape and depth, chips, patterns, components, do's and don'ts, and a *Retired rules* section listing each Papan Jadwal rule with the one-line reason it no longer applies. ADR 0003 "Retire Papan Jadwal for the Rally system" records the decision, the alternatives (re-skin only; keep marks; keep lattice), and the consequences. The internal metaphor rule survives in spirit: "Rally" and any design-document vocabulary stay out of user-facing copy.

**Out of the token layer.** The email shell keeps its inline colours in this spec (it cannot consume CSS tokens) and is restyled in the public spec. The OG image's two hardcoded colours are updated here to the new dark ground and ink, since they are brand, not layout.

## Testing Decisions

A good test here asserts an observable property — a measured contrast ratio, a rendered label, a class that must not exist — not the internal shape of a token file.

- **Vitest (pure logic):** the state-to-chip resolver returns a variant and a label key for every domain state, and every label key exists in both locales; the theme pairs table (if expressed as data) clears the AA thresholds for every declared pair. Prior art: the existing status-mark resolver tests and the dictionary-completeness style of the pitch-budget test.
- **Manual `TC-DS-*` suite (rewritten):** contrast of every text-on-surface pair in both themes; contrast of every chip ink on its wash in both themes; the banned pairing (white on PBP Green) never renders; every chip carries a visible label in both locales; focus ring visible on every control in both themes; reduced-motion honoured; no retired token or class name in the built CSS. Recorded with measured values, in the same format as the existing section 16.
- **Superseded cases:** the old `TC-DS-001..017`, and the visual cases in `TC-MS-*` and `TC-AR-*` that assert lattice, tile or mark geometry, are marked *superseded by Rally* with a pointer to the new case; behavioural cases in those suites stay live.
- **Gate:** lint, type-check, Vitest and `next build` on the merged result.

## Out of Scope

- Any per-surface layout change: week strip, card grids, tables-in-cards, sidebar restyle, dashboard composition (specs `rally-member`, `rally-admin`).
- Public page content, hero image, Admin-editable copy, email shell colours (spec `rally-public`).
- Charts and their data (spec `rally-insights`).
- `Activity.icon` (spec `rally-admin`).
- Any Settings-driven brand colour. Decided against: a member- or Admin-chosen hex can never be trusted to clear contrast on both themes, which is exactly why `Activity.color` was deleted.
- Photography assets bundled with the product.

## Further Notes

**Why replace rather than re-skin.** Four Papan Jadwal rules — square corners, no shadow, one green, form-carried marks — are the opposite of the reference. A re-skin that kept them would not read as the reference at all; a re-skin that broke them while keeping the document would leave a design system whose rules the product violates. Replacing the document is the honest option.

**Why the label is mandatory.** Dropping the form devices is legitimate only because every chip carries text. The test suite enforces this rather than convention.

**Why Archivo stays.** The reference uses a condensed heavy display face over a neutral grotesque. Archivo's variable width axis produces both from one family already in the bundle, avoiding a second font download and the two-family drift the old One Hand Rule guarded against.

**Mixed state on `main`.** The owner accepted that production carries partly restyled surfaces while the run lands. This spec is sequenced first precisely so that the mixed state is "new tokens everywhere, old layouts in places" rather than "two colour systems side by side".
