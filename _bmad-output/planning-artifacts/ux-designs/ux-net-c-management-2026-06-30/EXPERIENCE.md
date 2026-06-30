---
name: Net-C Community Platform
status: final
sources:
  - ../../prds/prd-net-c-management-2026-06-30/prd.md
  - ../../prds/prd-net-c-management-2026-06-30/addendum.md
updated: 2026-06-30
---

# Net-C Community Platform — Experience Spine

> Drafted fast-path from the PRD. Mode switching (switchable, effective next
> period) and per-session billing (**pre-pay on register**) were confirmed with
> the team. A11y floor (**WCAG 2.2 AA**), breakpoints (Tailwind defaults), and the
> primary accent (**Deep Teal `#0F766E`**) are now locked; the remaining open
> choice (proof-amount prefill) stays tagged `[ASSUMPTION]`. Visual identity
> lives in `DESIGN.md`; this spine references its tokens by name. Spine wins on
> conflict with any mock. Named protagonists below are **illustrative** — the PRD
> uses Jobs-To-Be-Done voice with no named personas.

## Foundation

Multi-surface responsive web on **Next.js 16 (App Router) + shadcn/ui + Tailwind v4**, dark mode via `next-themes`. The component library does the work; this is a **refresh, not a redesign** — the experience delta is consistency, full responsiveness, and the new payment-mode + Activity-identity behavior, not new interaction paradigms. `DESIGN.md` is the visual identity reference.

Single global Community per deployment (not multi-tenant), invite-only ("only registered members can sign in"). Two audiences, two shells:

- **Member shell** — phone-primary, single column, top bar + nav. Members see **only the Activities they belong to** — an Activity-scoped data boundary that is a **security invariant**, not a view preference (cross-Activity leakage = security regression, addendum §D).
- **Admin/Owner shell** — desktop-optimized, sidebar + wide content. `ADMIN` and `OWNER` both pass `isAdminRole`; treat them identically for UI. Owner is singled out only as the actor who brands the Community.

Auth is enforced twice (proxy + layout guard); until `isProfileComplete`, every protected route redirects to `/onboarding`.

## Information Architecture

### Member surfaces (must be fully usable on mobile)

| Surface | Reached from | Purpose |
|---|---|---|
| Dashboard | App open / nav | Greeting, upcoming sessions, attendance rate + count, unpaid banner, "view all" links |
| Sessions — list | Dashboard / nav | Upcoming sessions for my Activities; sign-up state |
| Session — detail | Sessions row | Date/time/location/capacity, status (Full/Completed/Cancelled), register/join. **Per-Session Activity: registering requires pre-paying that session's fee — upload proof to secure the slot.** |
| Payments — history | Dashboard / nav | Dues history, status per item. **Monthly:** unpaid banner + what I owe this period. **Per-Session:** the pre-pay charges made at registration, settled here. |
| Payments — upload proof | Unpaid banner / Payments | Pick image + amount → submit → "awaiting confirmation" |
| Activity view / join | Sessions / Activities | Join an Activity; **Payment-Mode selector** when both modes offered |
| Profile | Nav / avatar | Account info, language toggle, theme |
| Onboarding | First login (gated) | Profile completion; routes by role on finish |

### Admin/Owner surfaces (desktop-first)

| Surface | Reached from | Purpose |
|---|---|---|
| Admin Dashboard | App open / nav | 4 stat cards: Total Members, Active Members, Pending Payments, Confirmed (month) |
| Manage Members | Sidebar | Table: name/email, status, attendance; search + status filter; registered count |
| Manage Sessions | Sidebar | Create/edit/delete sessions, manual attendance |
| Manage Payments | Sidebar | Confirm/reject proofs (PENDING→CONFIRMED/REJECTED), rejection notes |
| Manage Activities | Sidebar | List + activate/deactivate; **Activity create/edit form** = the *only* place fees live: Monthly Fee, Session Fee, mode toggles (≥1) |
| General Settings | Sidebar | Community **identity only**: name, logo, default location, WhatsApp. **No fee field** (moved to Activities) |

### Auth

| Surface | Purpose |
|---|---|
| Sign-in | Google OAuth; "only registered members can sign in" |
| Auth error | Failure / not-registered messaging |

**Fee single-source rule (IA invariant):** fees live on the Activity, nowhere else. General Settings must not show a fee field; any UI implying a global default fee is a regression (FR-7/FR-15).

→ Composition references rendered at finalize into `mockups/`. Spine wins on conflict.

## Voice and Tone

Microcopy. Brand voice/aesthetic posture live in `DESIGN.md`. Plain, calm, money-honest. Every string is bilingual (`en`/`id`) via `dictionaries.ts` — **never hardcode** (FR). "Ekskul" surfaces as **Activity / Aktivitas**.

| Do | Don't |
|---|---|
| "You owe Rp 50.000 for Badminton this month." | "Outstanding balance detected." |
| "Payment proof uploaded — awaiting admin confirmation." | "Upload successful! ✅" |
| "Rejected: image was unreadable. Try again." | "Your payment was declined." |
| "3 sessions this week" | "You have 3 upcoming session(s)." |
| Money stated as an exact amount with currency | Vague "dues pending" without the number |
| Same plain tone to members and admins | Cutesy member voice vs corporate admin voice |

Money copy always names **the amount, the Activity, and the period/session** — a member must never wonder *what* they owe or *for what*.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components` (or shadcn defaults when inherited).

| Component | Use | Behavioral rules |
|---|---|---|
| Session row/card | Sessions list, Dashboard | Carries Activity accent bar + badge. Tap opens detail. Shows status and register CTA; full → CTA disabled with reason. **Per-Session Activity: CTA reads "Register & pay" — the slot is secured only after proof is uploaded (pre-pay on register).** |
| Activity badge | Anywhere an Activity is named | Icon chip + name in Activity color; the consistent cross-Activity identifier (FR-5). |
| Payment status badge | Payments, Manage Payments | PENDING/CONFIRMED/REJECTED — color **and** label always together. REJECTED reveals the admin note. |
| Unpaid banner | Member Dashboard, Payments | Appears when dues outstanding; states amount; primary CTA → upload proof. Clears only when paid+confirmed, not on dismiss. |
| Payment-mode selector | Activity join / Activity view | Shown only if Activity offers both modes; one-tap choice, persists, echoes back the selection. Auto-applies + states the mode if only one offered (UJ-3). **Changeable later from Activity view; the change takes effect next billing period — current period keeps the old mode (small history shown).** |
| Proof uploader | Upload-proof, Session register | Image picker (camera or library on phone) + amount field — prefilled with the owed amount (Monthly) or the session's fee (Per-Session pre-pay). Submit disabled until both present. Optimistic "uploading…" then "awaiting confirmation." |
| Confirm/reject action | Manage Payments | Confirm = one tap. Reject = requires a note (reason). Both write to the ledger (confirmedBy/At). Destructive styling on reject. |
| Members table | Manage Members | Search by name/email (debounced), status filter, paginated. Attendance column. Desktop table → mobile stacked cards. |
| Activity edit form | Manage Activities | Monthly Fee + Session Fee both **explicit required inputs** (no silent 0); mode toggles enforce ≥1 enabled; identity fields (name/icon/color/logo). |
| Stat card | Both dashboards | Label + `{typography.numeric}` value; links to the underlying list. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold load | Any list | shadcn `Skeleton` matching the row/card/table shape (FR-14 consistency). |
| Empty — no sessions | Sessions, Dashboard | "No upcoming sessions yet." Admin variant links to create. |
| Empty — no dues | Payments | "You're all paid up." No banner. |
| Empty — no Activities (member) | Dashboard | "You haven't joined an Activity yet." (Edge — invite-only, may be rare.) |
| Outstanding dues (Monthly) | Dashboard/Payments | Warning unpaid banner with amount + CTA to pay this period's dues. |
| Proof pending | Payments | PENDING badge; "awaiting admin confirmation"; no re-upload until resolved `[ASSUMPTION]`. |
| Proof rejected | Payments | Destructive badge + admin note + "upload again" CTA. |
| Per-Session register, unpaid | Session detail | Slot **not secured** until proof uploaded; CTA "Register & pay". |
| Per-Session registered, pending | Session detail / Payments | Slot held; proof PENDING badge; admin confirm settles it. Rejected → slot at-risk, re-upload prompt. |
| Session full | Session detail/list | Register CTA disabled, "Session full" label; capacity shown. |
| Permission denied | Member hitting admin route | Redirect by guard; no leak of admin surface (proxy + layout). |
| Cross-Activity boundary | All member lists | Query stays Activity-scoped; member never sees another Activity's sessions/payments (security, not UI). |
| Offline / submit fail | Proof upload, mutations | `sonner` toast (destructive): "Couldn't submit. Check your connection and retry." Form input retained. |
| Saving | Mutations | Optimistic where safe (attendance toggle); pending state on money actions (no false-confirm). |

## Interaction Primitives

**Touch-first on member surfaces, pointer-first on admin.** No keyboard-power-user layer (this is not a developer tool).

- Member: tap targets ≥44px; primary action reachable one-handed (bottom of viewport on phone); pull-to-refresh on lists `[ASSUMPTION]`; native camera/library for proof upload.
- Admin: hover row actions on desktop; tables support search + filter + pagination, **not** infinite scroll.
- Theme + language toggles available from Profile/avatar on every surface.
- `Esc` closes dialogs/sheets; tap-outside dismisses non-destructive sheets.

**Banned everywhere:** horizontal scroll on member surfaces, pinch-to-read, color-only state encoding, infinite scroll on admin tables, silent-0 fee inputs, hardcoded user-facing strings.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` (brand/Activity colors verified to AA, including auto-contrast foreground over runtime Activity color).

Target **WCAG 2.2 AA** (locked):

- Every payment/session **state is conveyed by text + icon, never color alone** — critical for money in dark mode.
- All amounts, counts, and statuses are screen-reader legible ("Badminton, monthly dues, 50.000 rupiah, awaiting confirmation").
- Tap targets ≥44px on member surfaces; visible focus ring (shadcn `ring`) on all interactives.
- Forms (onboarding, proof upload, Activity edit) have labeled fields, inline validation, and error text tied to inputs via `aria-describedby`.
- Tables announce column headers; mobile card fallback preserves the same data and order.
- `en`/`id` content parity; `lang` attribute follows `NEXT_LOCALE`.
- Dark mode verified for contrast on every screen (SM-5).

## Responsive & Platform

| Breakpoint | Member | Admin |
|---|---|---|
| `< md` (phone, primary for members) | Single column, full-width cards, bottom nav/sheet, banner stacks above content | Tables collapse to **stacked cards** with the same fields; sidebar → sheet |
| `md`–`lg` (tablet) | Two-up cards where space allows | Condensed table, sidebar visible |
| `≥ lg` (desktop, primary for admin) | Centered `max-w-2xl` single column (don't stretch member reading) | Full-width tables, persistent sidebar, dense stat-card grid |

**SM-C1 counter-metric:** never sacrifice desktop density/clarity to serve mobile. Build desktop base, adapt downward. Member surfaces must be *fully usable* on phone (no horizontal scroll, no pinch) — not merely shrunk.

## Inspiration & Anti-patterns

- **Lifted from the existing app:** the PENDING→CONFIRMED/REJECTED proof ledger is reused, not reinvented — manual proof + admin confirm is the model (no payment gateway, by design).
- **Rejected — automated payment gateway:** out of scope; money moves out-of-band, the app tracks state and proof only.
- **Rejected — global/default fee anywhere:** fees live on the Activity, full stop. A "default fee" in Settings is the exact anti-pattern this work removes.
- **Rejected — degrading desktop for mobile parity:** SM-C1. Mobile gets a *fit*, not a *downgrade of desktop*.
- **Rejected — color-only money state:** trust requires text; a red dot is not a rejection notice.

## Key Flows

> Protagonists illustrative; flows mirror the PRD's UJ-1…UJ-4 + onboarding.

### Flow 1 — Dewi brands the Community (Owner, first setup, desktop)

1. Dewi opens **General Settings**.
2. Sets Community name ("Garuda Sports") and uploads a logo.
3. **★ Climax:** the entire app re-skins instantly — header, document title, the derived abbreviation fallback, favicon. She scrolls member and admin surfaces and finds **zero** "PB Net-C" or "badminton" copy. The platform now reads as *hers*.

Failure: no logo uploaded → identity falls back to "GS" abbreviation token in `{colors.primary}`, never a broken-image placeholder.

### Flow 2 — Dewi configures an Activity's payment options (Admin, desktop)

1. Dewi opens **Manage Activities → Futsal → edit**.
2. Enters **Monthly Fee** and **Session Fee** as explicit required values (the form refuses a silent 0).
3. Enables Monthly and Per-Session (must keep ≥1).
4. **★ Climax:** she saves, and that Activity's fees + modes become the **single source of truth**. She checks General Settings — no fee field exists there anymore. There is exactly one place a fee can be wrong, so exactly one place to get it right.

Failure: she disables both modes → form blocks save with "Enable at least one payment mode."

### Flow 3 — Rian picks a payment mode (Member, phone, joining)

1. Rian joins **Basketball**, which offers both modes.
2. **★ Climax:** he's prompted to choose **Monthly vs Per-Session** as two clear cards showing each fee. He picks Per-Session; the choice persists and the Activity view echoes "Per-Session — Rp 25.000 per session." He can change it later from the Activity view; the change takes effect next period.
3. From then, registering for a session **pre-pays** that session's fee — he uploads proof at register time and the slot is secured pending admin confirmation (see Flow 4).

Failure: Activity offers only one mode → no prompt; mode auto-applies and is stated plainly.

### Flow 4 — Rian registers and pre-pays on his phone (Member, Per-Session, phone, at the court)

1. Rian opens the app on his phone and taps Thursday's Basketball session.
2. Session detail shows the slot + a **"Register & pay Rp 25.000"** CTA (Per-Session = pre-pay to secure the slot).
3. He taps it; the proof uploader opens with the amount **prefilled to Rp 25.000**. He shoots his transfer receipt with the camera and submits.
4. **★ Climax:** "Payment proof uploaded — awaiting admin confirmation. Your slot is held." Every step worked one-handed, no pinch, no horizontal scroll — the phone was the primary surface, not an afterthought. The session row shows a PENDING badge; the slot is reserved, not yet confirmed.
5. Later, Dewi opens **Manage Payments**, sees Rian's proof with its Basketball accent bar, and confirms → his slot locks in and the badge flips to CONFIRMED.

(Monthly-mode members instead settle a period total from the **unpaid banner** on Dashboard/Payments — same uploader, amount prefilled to the period's dues.)

Failure: image unreadable → Dewi rejects with a note; Rian sees the destructive badge + reason + "upload again" — and his slot is flagged at-risk until he re-submits.

### Flow 5 — First login onboarding (new member, any device)

1. New member signs in with Google; NextAuth creates the user.
2. Guard redirects to `/onboarding` (profile incomplete) on every route attempt.
3. **★ Climax:** member completes the profile form (usable on phone) → `isProfileComplete = true` → routed by role to the member Dashboard (or admin shell for an admin), landing already inside the product, not on a generic success page.
