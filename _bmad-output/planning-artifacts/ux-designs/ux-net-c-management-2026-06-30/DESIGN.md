---
name: Net-C Community Platform
description: Activity-agnostic community sports management platform. shadcn/ui on Next.js 16 + Tailwind v4 with dark mode (next-themes). This DESIGN.md specifies the brand-layer delta only — the chrome stays neutral so each Activity's own color carries the chroma.
status: final
updated: 2026-06-30
colors:
  # Brand-layer overrides on top of shadcn defaults. All unlisted tokens
  # (background, foreground, card, popover, muted, muted-foreground, border,
  # input, ring, destructive) inherit from shadcn. The platform chrome is
  # deliberately neutral; per-Activity color is the chromatic carrier.
  primary: '#0F766E'             # Deep Teal — locked platform accent
  primary-foreground: '#FFFFFF'
  primary-dark: '#2DD4BF'
  primary-foreground-dark: '#09090B'
  # Payment-state semantics (not in shadcn defaults; money handling needs them)
  success: '#16A34A'             # [ASSUMPTION] CONFIRMED
  success-foreground: '#FFFFFF'
  success-dark: '#4ADE80'
  success-foreground-dark: '#052E16'
  warning: '#B45309'             # [ASSUMPTION] PENDING / awaiting confirmation
  warning-foreground: '#FFFFFF'
  warning-dark: '#FBBF24'
  warning-foreground-dark: '#1A1208'
  # REJECTED reuses shadcn `destructive` — no custom token.
typography:
  # Inherits shadcn Geist Sans ramp wholesale. Only addition: a numeric role
  # for money/stat values so amounts align in tables and stat cards.
  numeric:
    fontFamily: 'Geist Sans'     # [ASSUMPTION] no type direction stated; keep shadcn default
    fontVariantNumeric: 'tabular-nums'
    fontWeight: '600'
rounded:
  # shadcn defaults inherited as-is (no override). Listed for reference only.
  note: 'Inherit shadcn radius scale (sm/md/lg). Activity color accents use a left border, not a pill, so no radius change needed.'
spacing:
  # shadcn / Tailwind 4-based scale inherited; no overrides.
  note: 'Inherit Tailwind spacing scale (4,8,12,16,20,24,32,40,48,64).'
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
  activity-badge:
    # Runtime-resolved: the Activity's own configured color/icon, NOT a static
    # token. Renders as a small icon chip + name. See Components section.
    accent: '{activity.color}'   # data-driven per Activity row
    foreground: 'derived for AA contrast on {activity.color}'
  activity-accent-bar:
    color: '{activity.color}'    # 3px left border on Session/Payment rows
  payment-status-pending:
    background: '{colors.warning}'
    foreground: '{colors.warning-foreground}'
  payment-status-confirmed:
    background: '{colors.success}'
    foreground: '{colors.success-foreground}'
  payment-status-rejected:
    background: 'shadcn:destructive'
    foreground: 'shadcn:destructive-foreground'
  stat-card:
    background: 'shadcn:card'
    value: '{typography.numeric}'
  unpaid-banner:
    background: '{colors.warning}'
    foreground: '{colors.warning-foreground}'
---

# Net-C Community Platform — Design Spine

> Drafted fast-path from `prd.md` + `addendum.md`. Every value tagged `[ASSUMPTION]`
> is a UX proposal filling a gap the PRD explicitly left to design — confirm or
> override. The PRD mandate is **refresh, not redesign**: keep shadcn/ui + Tailwind v4
> + dark mode; this spine specifies only the brand-layer delta and the Activity-identity
> system. Paired with `EXPERIENCE.md`. Spine wins on conflict with any mock.

## Brand & Style

Net-C is an **activity-agnostic community sports platform** — one deployment serves one Community that runs one or more Activities (badminton, futsal, basketball…). The defining brand constraint, stated by the PRD, is **neutrality**: there is no bundled logo, no sport-specific copy, and the Community names and brands *itself* at runtime. The product's job is to disappear behind whoever adopts it.

That neutrality drives the entire aesthetic posture: **the platform chrome stays calm and uncolored so the Activity's own color can mean something.** Each Activity carries its own name, icon, and color; those are the chromatic events on every surface. If the platform itself shouted in a brand color, Activity color would stop reading as signal. So Net-C inherits shadcn/ui's neutral defaults wholesale and adds the smallest possible brand layer: one restrained primary accent for platform actions, payment-state semantics for money, and a single Activity-identity component pattern.

Where the PRD gives no value, this spine proposes shadcn-conservative defaults rather than inventing a strong identity — consistent with "refresh, not redesign." The primary accent (Deep Teal `#0F766E`) is now locked; type direction and corner radii remain shadcn defaults `[ASSUMPTION]`. The brand expression is **disciplined neutrality with data-driven color**, not a designed personality.

When the Community has not configured a logo, the identity falls back to **name + derived abbreviation** (`communityAbbr` — e.g. "Sports Community" → "SC"), set in the platform's own type, never a placeholder graphic.

## Colors

Two layers: a neutral chrome inherited from shadcn, and a thin brand/semantic layer added on top.

- **Primary — Deep Teal `#0F766E` light / `#2DD4BF` dark** — the single platform accent. Used on primary buttons, active nav, focus affordances, links. Replaces shadcn's default `primary`. Composed and premium; deliberately calm platform chrome, not a Community brand color. Sits beside the `success` green but stays clearly separable (teal vs green) so primary actions never read as "confirmed." Dark foreground is near-black `#09090B`; light foreground white. *If a future requirement lets the Community theme the chrome, this becomes the configurable token.* (Chosen from `.working/color-themes-1.html` option 2 of 5.)
- **Activity color (runtime, per-Activity)** — the real chromatic system. Each Activity stores its own color; it appears as a left accent bar, an icon chip, and a name badge on every Session and Payment row (FR-5). This is **data-driven, not a fixed token**. Cross-Activity rows must stay distinguishable, so the UI must guarantee an AA-contrast foreground over any Activity color (see Components).
- **Success `#16A34A` / `#4ADE80` dark** `[ASSUMPTION]` — payment **CONFIRMED** only. Not a general "good" color; reserved for settled money.
- **Warning `#B45309` / `#FBBF24` dark** `[ASSUMPTION]` — payment **PENDING / awaiting confirmation**, and the unpaid-dues banner. The "you owe / we're checking" color.
- **Destructive (shadcn default)** — payment **REJECTED** and all destructive actions (delete session, deactivate Activity). No custom red.
- **All other tokens** (`background`, `foreground`, `muted`, `muted-foreground`, `card`, `popover`, `border`, `input`, `ring`) inherit shadcn defaults in both light and dark.

Dark mode is **mandatory and verified on every screen** (FR-14, SM-5) via `next-themes`. Every brand/semantic token above ships a `-dark` pair tuned to keep AA contrast on shadcn's dark surface.

Avoid: a second platform brand color, gradients, decorative color on chrome, and — critically — **using `success`/`warning` for anything other than payment state.** Money colors must stay trustworthy by staying scarce.

## Typography

Inherits shadcn's **Geist Sans** ramp wholesale (body, label, heading, caption). No serif moment — this is a utility tool, not an editorial surface. `[ASSUMPTION]` (PRD states no type direction.)

One addition: a **`numeric`** role — `tabular-nums`, weight 600 — for every money amount, attendance count, capacity figure, and stat-card value. Amounts must align vertically in tables (Manage Payments, Payments history) and read as precise in stat cards. Currency amounts are money; they get monospaced figures even in a proportional typeface.

i18n note: all type must tolerate **Indonesian string length** (often longer than English). No fixed-width labels, no truncation that hides meaning; wrap or use `min-w-0` + ellipsis with a title attribute. (FR — en/id parity.)

## Layout & Spacing

shadcn / Tailwind 4-based spacing scale inherited as-is. The layout strategy is the PRD's deliberate reconciliation, **not** an ambiguity:

- **Desktop-first as the base layout** for the whole app; build at desktop width, adapt *downward* with `sm:`/`md:` (addendum §D). Counter-metric SM-C1: **do not degrade desktop density to serve mobile.**
- **Member surfaces are phone-primary in practice** and must be *fully usable* on mobile — not merely shrunk. No horizontal scroll, no pinch-zoom, tappable targets ≥44px.
- **Admin surfaces are desktop-optimized.** Dense tables (Manage Members/Sessions/Payments) get the desktop's width; on mobile they degrade to stacked cards rather than scrolling tables (see EXPERIENCE Responsive).

Breakpoints = standard Tailwind: `sm 640 · md 768 · lg 1024 · xl 1280` (locked). Member content max width `max-w-2xl` for single-column reading on phone; admin tables run full width inside the app shell.

Two shells: a **member shell** (top bar + bottom-or-sheet nav, single column) and an **admin shell** (sidebar nav + wide content), both built on shadcn primitives.

## Elevation & Depth

Inherited from shadcn — subtle shadow on cards, popovers, and the mobile nav sheet; no elevation as a hierarchy device. Stat cards and session cards sit on `card` with shadcn's default border, not a drop shadow. Nothing added on top.

## Shapes

Inherit shadcn's radius scale (`sm`/`md`/`lg`) unchanged `[ASSUMPTION]`. Activity identity is expressed with a **left accent bar and an icon chip**, deliberately *not* a pill or a tinted card fill — so Activity color reads as a consistent marker rather than restyling the component. Status badges use shadcn's badge radius. Avatars and the abbreviation fallback are circular.

## Components

Inherited from shadcn **as-is, do not customize:** `Button` (non-primary variants), `Card`, `Dialog`, `Sheet`, `Table`, `Tabs`, `DropdownMenu`, `Avatar`, `Badge`, `Toast` (sonner), `Skeleton`, `Input`, `Select`, `Switch`, `Separator`, `Pagination`.

Brand-layer / product-specific components:

| Component | Spec |
|---|---|
| **Button (primary)** | `{colors.primary}` fill, `{colors.primary-foreground}` text. All other variants inherit shadcn. |
| **Activity badge** | Icon chip (the Activity's `icon`) + Activity `name`, tinted with `{activity.color}`. Runtime-resolved per Activity. Foreground auto-selected (black/white) for **AA contrast** over the configured color. Appears wherever an Activity is named. |
| **Activity accent bar** | 3px left border in `{activity.color}` on every Session row and Payment row (FR-5). The cheap, consistent cross-Activity distinguisher; pairs with the badge. |
| **Payment status badge** | shadcn Badge in one of three semantics: PENDING → `{colors.warning}`, CONFIRMED → `{colors.success}`, REJECTED → `destructive`. Always paired with a text label (color is never the only signal — a11y). |
| **Unpaid banner** | Full-width `{colors.warning}` banner on member Dashboard/Payments when dues are outstanding. States the amount (`{typography.numeric}`) and a primary CTA to pay. Dismissible only by paying, not by closing. |
| **Stat card** | shadcn `card` + label + `{typography.numeric}` value. Admin Dashboard (Total/Active Members, Pending/Confirmed Payments) and member Dashboard (attendance rate, session count). |
| **Community identity mark** | Configured logo if set; else a circular **abbreviation token** (`communityAbbr`) in `{colors.primary}` on `muted`. Never a placeholder graphic. |
| **Payment-mode selector** | shadcn segmented control / radio cards: "Monthly" vs "Per-Session", shown only when an Activity offers both. Selected mode persists and is shown back. (FR-10) |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep platform chrome neutral; let Activity color carry chroma | Add a second platform brand color or theme the chrome in a brand hue |
| Use `success`/`warning` **only** for payment state | Reuse money colors for generic success/warning UI |
| Pair every status color with a text label | Encode payment state in color alone (a11y / dark-mode) |
| Render Activity badge **and** accent bar on every Session/Payment row | Let a cross-Activity list read as one undifferentiated stack (FR-5) |
| Verify every screen in dark mode | Ship a screen tested only in light mode (SM-5) |
| `tabular-nums` on all amounts and counts | Render money in proportional figures that misalign in tables |
| Inherit shadcn defaults for everything not in the brand layer | Restyle shadcn components "to make them ours" — it's a refresh, not a redesign |
| Tolerate longer Indonesian strings (wrap/min-w-0) | Fixed-width labels that clip `id` copy |
