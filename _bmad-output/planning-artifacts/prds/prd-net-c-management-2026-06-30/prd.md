---
title: "Rebrand & UI/UX Improvement — Multi-Sport Community Platform"
status: final
created: 2026-06-30
updated: 2026-06-30
---

# PRD: Rebrand & UI/UX Improvement — Multi-Sport Community Platform
*Working title — confirm.*

## 0. Document Purpose

This PRD is for the PM (Jefry) and the downstream UX/architecture/implementation work. It scopes a **rebrand** (shed the badminton-only "PB Net-C" identity for an activity-agnostic, configurable one — in both user-facing copy and codebase naming), a **payment-model change** (each Activity can offer monthly and/or per-session payment, and members choose), and a **UI/UX improvement** (visual refresh, full responsiveness, and an information-architecture cleanup that ends the duplicated monthly-fee setting). The underlying multi-sport capability already exists in code (the `Ekskul`/Activity model and per-activity sessions/payments) and is **not** being built here — this document refreshes how that capability is named, presented, paid for, and laid out. Vocabulary is anchored in the Glossary (§3); features are grouped with globally-numbered FRs nested under them; inferred decisions carry inline `[ASSUMPTION: …]` tags indexed in §9. Technical mechanics (file inventory, fee migration, rename collision, payment-mode data model) live in the companion `addendum.md`, not here.

**Stakes:** pre-launch — the app is still in development with no live users, payments, or production data. Rigor is calibrated accordingly: decisions are firm, but several implementation forks are intentionally left to architecture.

## 1. Vision

The product is a **community sports management platform**. A community runs one or more **Activities** — badminton, futsal, basketball, whatever it offers — and for each Activity it schedules Sessions, tracks attendance, collects dues, and manages members. Today the app is dressed as a single badminton club ("PB Net-C"); the engine underneath is already multi-sport. This work closes that gap: the product should look and read like a neutral, brandable platform that any sport community can adopt and name as its own.

It also gives money handling the flexibility real communities need. Some members commit for the month; others just pay for the sessions they show up to. Each Activity decides which of those it offers, and the member picks what fits. Finally, the experience gets a focused quality pass: every screen works cleanly from desktop down to phone, the visual language is consistent, and confusing overlaps — most concretely, a monthly fee that can be set in two different places — are resolved so each setting has exactly one obvious home.

**Thesis:** this is a pre-launch *productization* pass — three tracks (activity-agnostic rebrand, flexible payment, UI/UX quality) that together turn a single-club badminton app into a platform any sport community can adopt before it goes live. The tracks are independent enough to ship and sequence separately (see §6).

## 2. Target User

### 2.1 Jobs To Be Done

- **Admin / Owner** — "Set up my community's identity and its Activities, then run sessions and collect dues, without the tool assuming we only play badminton."
- **Admin / Owner** — "Decide per Activity whether members pay monthly, per session, or either — and set both prices in one place."
- **Member** — "Pay the way that suits me — a flat monthly fee, or just for the sessions I actually attend."
- **Member** — "See the Activities I belong to, my upcoming sessions, and what I owe — on whatever device I have, usually my phone."

### 2.2 Key User Journeys
*Lightweight — existing flows being refreshed, plus the new payment-mode choice.*

- **UJ-1. Owner brands the community.** An Owner sets the community name and logo in Settings; the whole app reflects that identity — no leftover "PB Net-C" or "badminton" copy.
- **UJ-2. Admin configures an Activity's payment options.** An Admin opens the Futsal Activity, sets a monthly price and a per-session price, and chooses to offer both modes. That Activity's fees live only there.
- **UJ-3. Member picks a payment mode.** A Member joins Basketball, sees it offers both monthly and per-session, and chooses per-session. Each session they register for adds that session's fee to what they owe.
- **UJ-4. Member checks dues on a phone.** A Member opens the app on mobile, sees their Activities, their chosen mode, and their outstanding amount; every screen is usable without pinching or horizontal scrolling.

## 3. Glossary
*Downstream workflows and readers use these terms verbatim. No synonyms elsewhere in the PRD.*

- **Platform** — the rebranded multi-sport community management application (formerly branded "PB Net-C").
- **Community** — the single organization/identity a deployment serves; configurable name and logo in Settings. Default name: "Sports Community" (en) / "Komunitas Olahraga" (id).
- **Activity** — a sport or program the Community offers (e.g. Badminton, Futsal, Basketball). User-facing label is **"Activity" (en) / "Aktivitas" (id)**; backed by the `Ekskul` model (model name unchanged). Carries its own identity (name/icon/color/logo), its **Monthly Fee**, its **Session Fee**, and its **allowed Payment Modes**.
- **Member** — a User with role `MEMBER`; sees only the Activities they belong to.
- **Admin / Owner** — a User with role `ADMIN` or `OWNER`; manages Activities, Sessions, Payments, and Settings. Both pass admin authorization (`isAdminRole`).
- **Session** — a scheduled instance of an Activity (date, time, location, capacity). Backed by the `ActivitySession` model (renamed from `BadmintonSession` — see FR-6).
- **Payment Mode** — how a Member pays for an Activity: **Monthly** (a flat fee covering all that month's Sessions) or **Per-Session** (the Session Fee for each Session the Member joins). Each Activity offers monthly-only, per-session-only, or both; the Member selects from what the Activity offers.
- **Monthly Fee** — the flat recurring dues for an Activity under Monthly mode. Defined per-Activity. (Single source of truth — the old global default is removed.)
- **Session Fee** — the price of a single Session under Per-Session mode. Defaults from the Activity's configured per-session price; may be overridden per Session.
- **Payment** — a Member's payment record for an Activity. Monthly payments are per month/year; per-session payments are per Session. Payment proof is uploaded and confirmed by an Admin (existing mechanism).
- **Settings** — Community-wide key-value configuration (name, logo, default location, WhatsApp, etc.).

## 4. Features

### 4.1 Activity-Agnostic Rebrand

**Description:** The Platform sheds all hardcoded badminton/PB Net-C identity — in user-facing copy *and* codebase naming — and presents as a neutral, configurable multi-sport platform. Realizes UJ-1. Applies to both English and Indonesian.

**Functional Requirements:**

#### FR-1: Sport-neutral default branding
The Platform ships with activity-agnostic default branding in place of badminton-specific defaults.
**Consequences (testable):**
- The default `communityName` is "Sports Community" (en) / "Komunitas Olahraga" (id), replacing "Xclub Badminton".
- A fresh deployment with no Settings configured shows no sport-specific words anywhere in chrome (header, title, metadata).

#### FR-2: No single-sport copy in user-facing strings
No user-facing string assumes the Community plays only badminton.
**Consequences (testable):**
- An audit of `src/lib/i18n/dictionaries.ts` (en + id) finds zero badminton-specific user-facing strings; generic wording or the Activity's own name is used instead.
- The user-facing label "Ekskul" is replaced by "Activity" (en) / "Aktivitas" (id) throughout the UI.
- en/id string parity is preserved; no user-facing string is hardcoded (all route through the dictionary).

#### FR-3: Platform identity, not "PB Net-C"
App/repo-level identity reflects the multi-sport Platform.
**Consequences (testable):**
- Browser tab title and metadata reflect the neutral Platform identity, not "PB Net-C".
- No "PB Net-C" / "Net-C" string is visible to an end user in any surface.
- No bundled default logo image ships; an un-configured Community falls back to its name + derived abbreviation (`communityAbbr`); the favicon is neutral/generic.

#### FR-4: Community identity stays configurable
Admin/Owner can set the Community name and logo, and the app renders that identity everywhere.
**Consequences (testable):**
- Setting a custom community name updates the header, title, and derived abbreviation across all pages.
- Abbreviation derivation produces a sensible result for arbitrary multi-word and single-word names.

#### FR-5: Per-Activity identity shown consistently
Each Activity's own name, icon, color, and logo are surfaced wherever its Sessions and Payments are listed.
**Consequences (testable):**
- A Session or Payment row visually identifies which Activity it belongs to (name + color/icon).
- Activity-scoped Member visibility is preserved (a Member only sees Activities they belong to).

#### FR-6: Activity-agnostic codebase naming
The codebase no longer encodes "badminton" in identifiers; the session model is renamed.
**Consequences (testable):**
- `BadmintonSession` is renamed to `ActivitySession` (a distinct name from NextAuth's existing `Session` model), with accessor (`prisma.activitySession`), relations (`Attendance`), API routes, and TypeScript types updated.
- No model, type, or route identifier contains "badminton".
- Build and lint pass; no behavioral regression.

**Notes:** Rename mechanics + NextAuth `Session` collision rationale + file inventory in `addendum.md` §A/§C.

### 4.2 Activity Fee & Payment-Mode Configuration (Admin)

**Description:** The Admin configures, per Activity, how members may pay. Each Activity has a Monthly Fee and a Session Fee, and an explicit choice of which Payment Modes it offers — monthly-only, per-session-only, or both. This is the only place fees are set; the legacy global default monthly fee is removed. Realizes UJ-2.

**Functional Requirements:**

#### FR-7: Monthly Fee is single source of truth (per Activity)
The Monthly Fee for an Activity is defined only on that Activity; the global default monthly fee is removed.
**Consequences (testable):**
- The global/General monthly-fee setting no longer exists in the data model or the UI.
- Every place that reads a Member's monthly dues reads it from the Activity.

#### FR-8: Per-session price per Activity
The Admin sets a Session Fee for an Activity; Sessions default to it and may override it.
**Consequences (testable):**
- The Activity create/edit form exposes a per-session price field.
- A new Session inherits the Activity's Session Fee by default; an Admin may set a different fee on an individual Session.

#### FR-9: Allowed Payment Modes per Activity
The Admin chooses which Payment Modes an Activity offers: monthly-only, per-session-only, or both.
**Consequences (testable):**
- The Activity edit screen lets the Admin enable/disable Monthly and Per-Session independently (at least one must be enabled).
- Members of that Activity can only select a mode the Activity offers.

**Notes:** Fee data-model changes (per-Activity monthly + session price, allowed-mode flags) are in `addendum.md` §B/§F.

### 4.3 Member Payment-Mode Selection & Billing

**Description:** A Member chooses, per Activity, how they pay — from the modes that Activity offers. Monthly means a flat fee covering all of that month's Sessions; Per-Session means they owe the Session Fee for each Session they register for/attend. Payment itself reuses the existing manual proof-upload + Admin-confirmation flow. Realizes UJ-3, UJ-4.

**Functional Requirements:**

#### FR-10: Member selects a Payment Mode from the offered set
A Member picks Monthly or Per-Session for an Activity, limited to what the Activity offers.
**Consequences (testable):**
- If an Activity offers both modes, the Member is prompted to choose; if it offers one, that mode applies automatically.
- The Member's selected mode is visible to the Member and to Admins. `[ASSUMPTION: a Member may change their mode month-to-month per Activity — confirm.]`

#### FR-11: Monthly-mode billing
Under Monthly mode, a Member owes a single flat Monthly Fee per month for the Activity, regardless of how many Sessions they attend.
**Consequences (testable):**
- The Member's monthly amount equals the Activity's current Monthly Fee.
- Monthly payment records remain keyed per Member per Activity per month/year (no regression to today's behavior).

#### FR-12: Per-session-mode billing
Under Per-Session mode, a Member owes the Session Fee for each Session they register for/attend.
**Consequences (testable):**
- Registering for / attending a Session creates a per-session charge equal to that Session's fee.
- A Member can see, per Session, what they owe and its payment status; Admins can confirm per-session payments via the existing proof flow. `[ASSUMPTION: per-session payment uses the same upload-proof + confirm mechanism, recorded per Session — confirm; data model in addendum §F.]`

### 4.4 UI/UX Refresh & Full Responsiveness

**Description:** A focused quality pass over the existing interface — **not** a redesign. The current component system (shadcn/ui, Tailwind, theme + dark mode) is kept; the work is consistency, polish, and making every screen render correctly from desktop down to mobile. Layout strategy is **desktop-first**. Folds in the Settings IA cleanup. Realizes UJ-4.

**Functional Requirements:**

#### FR-13: Every screen is responsive, desktop-first
All Member and Admin/Owner screens render and function across desktop, tablet, and mobile widths.
**Consequences (testable):**
- Dashboard, Sessions (list + detail), Payments (list + upload), Profile, Onboarding, and all Admin screens (members, sessions, payments, settings, activities) show no broken layout, clipped content, or horizontal scroll at representative desktop / tablet / phone widths.
- Member-facing screens (dashboard, sessions, payments, profile, onboarding) are **fully usable on mobile, not merely shrunk** — members are predominantly on phones — while Admin/Owner screens are optimized desktop-first. This reconciles the desktop-first strategy with the phone-primary member base (see SM-C1).
- Interactive targets remain usable at mobile widths. `[ASSUMPTION: standard Tailwind breakpoints (sm/md/lg/xl); finalize in UX.]`

#### FR-14: Consistent visual language (refresh, not redesign)
The refreshed UI applies the existing design system consistently across pages.
**Consequences (testable):**
- Spacing, typography, button/card/table usage, and empty/loading states are consistent across screens (shared components are reused rather than re-implemented per page).
- Dark mode and theming continue to work on every refreshed screen; no new heavyweight UI dependency or design system is introduced.

#### FR-15: Settings information architecture cleanup
Settings are organized so each setting has exactly one obvious home.
**Consequences (testable):**
- Community identity (name, logo, location, WhatsApp) lives under General settings; all fees and Payment-Mode config live under the Activity.
- No setting appears in two places; no orphaned/dead fields remain after the fee consolidation.

**Feature-specific NFRs:**
- Desktop-first must not degrade the desktop experience to serve mobile (see SM-C1).

## 5. Non-Goals (Explicit)

- **Not building multi-sport capability** — it already exists; this PRD refreshes naming/presentation/payment/layout only.
- **Not adding an automated payment gateway / online payments** — payment stays manual proof-upload + Admin confirmation; per-session billing reuses that mechanism.
- **Not a full visual redesign / new design system** — refresh within the current shadcn/Tailwind language.
- **Not adding product features** beyond rebrand, payment modes, and UI/UX improvement.
- **Not multi-tenant** — Settings is a single global Community identity per deployment.
- **Not changing auth, roles, or Activity-scoped data visibility** — existing security model preserved.

> Note: the `BadmintonSession → ActivitySession` rename, previously deferred, is now **in scope** (FR-6) at the user's request.

## 6. MVP Scope

### 6.1 In Scope
- Sport-neutral default branding + removal of all badminton/PB Net-C user-facing copy (en + id), incl. "Ekskul" → "Activity/Aktivitas".
- Platform-level identity (title, metadata, neutral favicon; no bundled default logo).
- `BadmintonSession → ActivitySession` codebase rename.
- Per-Activity fee config: Monthly Fee (single source of truth, global default removed) + Session Fee + allowed Payment Modes (monthly / per-session / both).
- Member Payment-Mode selection; monthly billing (flat/month) and per-session billing (per Session joined), reusing the existing proof-upload + confirm flow.
- Settings IA cleanup.
- Full responsiveness (desktop-first) and visual-consistency refresh across all screens.

**Suggested sequencing (for epic split):** the tracks carry different risk. The `ActivitySession` rename and the payment-mode data model (new `sessionFee`, allowed-mode flags, `Membership.paymentMode`, `Payment` per-session linkage) are the **high-risk** items and should be sequenced and tested deliberately. The rebrand copy/i18n and the responsive/consistency refresh are **low-risk** and can land independently. The rename should land before the payment-mode work, since the latter touches the same Session/Payment models.

### 6.2 Out of Scope for MVP
- Multi-tenant / multiple independent Communities per deployment.
- Automated/online payment processing.
- New design system or component-library swap.
- Mobile-first re-optimization. *Desktop-first chosen; see Open Question 1.* `[NOTE FOR PM]`

## 7. Success Metrics

**Primary**
- **SM-1**: Zero badminton-specific or "PB Net-C/Net-C" strings remain in user-facing UI, copy, *or* code identifiers (audit). Validates FR-1, FR-2, FR-3, FR-6.
- **SM-2**: The Monthly Fee is settable in exactly one place (per Activity); General settings exposes no fee field. Validates FR-7, FR-15.
- **SM-3**: Payment modes work end-to-end — a Member can only choose a mode their Activity offers; monthly bills a flat fee/month; per-session bills per Session joined. Validates FR-9, FR-10, FR-11, FR-12.
- **SM-4**: All key screens render without layout breakage at desktop, tablet, and mobile widths. Validates FR-13.

**Secondary**
- **SM-5**: Visual consistency — a component/style audit confirms shared components are reused (no duplicate bespoke implementations) on refreshed screens, and dark mode is verified on each. Validates FR-14.

**Counter-metrics (do not optimize)**
- **SM-C1**: Do not degrade desktop density/clarity in pursuit of mobile layouts — desktop is the primary surface. Counterbalances SM-4.
- **SM-C2**: No regression in existing flows (existing monthly Payments, Sessions, Attendance, memberships, Activity-scoped visibility, auth). The rename and new per-session billing must not break the working monthly path. Counterbalances SM-1…SM-5.

## 8. Open Questions

1. Desktop-first was chosen, but Members are likely phone-heavy — revisit before launch? `[NOTE FOR PM]`
2. Can a Member switch Payment Mode month-to-month per Activity, or is it locked once chosen for a period? (Assumed switchable.)
3. Per-session payment: paid per Session individually, or batched (e.g. weekly/monthly settlement)? Does registering require pre-payment, or pay-after-attend? (Assumed per-Session, pay via existing proof flow.)
4. Any existing seed/dev data relying on the global default fee to reconcile on migration? (Low risk — pre-launch.)

## 9. Assumptions Index
*Every `[ASSUMPTION]` surfaced for explicit confirmation:*

- §4.3 FR-10 — A Member may change their Payment Mode month-to-month per Activity (Open Question 2).
- §4.3 FR-12 — Per-session payment reuses the existing upload-proof + Admin-confirm mechanism, recorded per Session (Open Question 3; data model in addendum §F).
- §4.4 FR-13 — Responsive breakpoints follow the standard Tailwind scale (sm/md/lg/xl); exact values finalized in UX.
