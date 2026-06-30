# PRD UX Extract — Net-C Multi-Sport Community Platform

Source: `prd-net-c-management-2026-06-30/prd.md` + `addendum.md` (final, 2026-06-30).
Scope of this PRD: a **pre-launch productization pass** — three independent tracks: (1) activity-agnostic rebrand, (2) flexible payment modes, (3) UI/UX refresh + full responsiveness. It is **not** building multi-sport capability (already exists) and **not** a full redesign.

---

## 1. Product purpose & core value
A **community sports management platform**: one Community runs one or more **Activities** (badminton, futsal, basketball…), and for each it schedules Sessions, tracks attendance, collects dues, and manages members.
**Core value (one sentence):** Turn a single-club badminton app into a neutral, brandable platform any sport community can adopt and name as its own — with payment flexibility (monthly and/or per-session) and a screen experience that works cleanly from desktop down to phone.

## 2. User roles / personas
The PRD uses **Jobs-To-Be-Done voice**, not named personas. **No named protagonist** is used verbatim (the only proper name, "Jefry," is the PM/author, not an end-user persona).

- **Member** (`role MEMBER`) — sees only the Activities they belong to. Context: "on whatever device I have, **usually my phone**" — implied phone-in-hand, often at/around the court. JTBD: pick how they pay (flat monthly vs per-session), and check upcoming sessions + what they owe on mobile.
- **Admin / Owner** (`role ADMIN` or `OWNER`; both pass `isAdminRole`) — manage Activities, Sessions, Payments, Settings. Context [INFERRED]: desk/admin work — sets up community identity, configures per-Activity fees & payment modes, confirms payment proofs. Admin screens are explicitly **desktop-first / desktop-primary**.
- **Owner** — same admin authorization as Admin; PRD singles Owner out as the actor who **brands the Community** (sets name + logo) in UJ-1. No distinct screen set stated beyond Admin's. [INFERRED] Owner ≈ Admin for UI purposes.

> Note: CLAUDE.md still lists `Role` as MEMBER/ADMIN only; the PRD/prompt add **OWNER**. UX should treat admin surfaces as serving ADMIN+OWNER.

## 3. Surfaces / screens (grouped by route area)
Derived from FR-13's enumerated screen list + addendum §A surface inventory + new payment-mode flows.

**(main) — Member-facing (must be fully usable on mobile):**
- **Dashboard** — welcome greeting, upcoming sessions, attendance rate/count stats, "view all" links.
- **Sessions — list** — upcoming training sessions, sign-up.
- **Sessions — detail** — single session (date/time/location/capacity, status: Full/Completed/Cancelled), join/register.
- **Payments — list/history** — dues history, unpaid banner, status per item.
- **Payments — upload proof** — upload payment-proof image + amount, submit → "awaiting admin confirmation."
- **Profile** — account info.
- **[NEW] Activity view / join with Payment-Mode selector** — when an Activity offers both Monthly and Per-Session, Member chooses; selected mode shown. (FR-10)
- **[NEW] Per-session billing view** — per-Session amount owed + payment status (FR-12). [INFERRED] likely folded into Payments and/or Session detail.

**onboarding (member, first-login):**
- **Onboarding / profile completion** — gated until `isProfileComplete = true`; must be fully usable on mobile.

**(admin) — Admin/Owner-only (desktop-first / desktop-primary):**
- **Admin Dashboard** — stat cards: Total Members, Active Members, Pending Payments, Confirmed (this month).
- **Manage Members** — table (status, attendance cols), search by name/email, status filter, registered-member count.
- **Manage Sessions** — create/edit/delete sessions, manual attendance.
- **Manage Payments** — confirm/reject payment proofs (PENDING/CONFIRMED/REJECTED), rejection notes.
- **General Settings** — Community identity ONLY after IA cleanup: name, logo, default location, WhatsApp. **Fee field removed** (FR-7/FR-15).
- **Manage Activities (Ekskul)** — list/activate-deactivate; **[NEW/changed] Activity create/edit form** now exposes: Monthly Fee, Session Fee, and allowed-mode toggles (Monthly / Per-Session, ≥1 enabled). This is the **only** place fees live. (FR-8, FR-9, FR-15)

**auth:**
- **Sign-in page** — Google OAuth; note "only registered members can sign in."
- **Auth error page.**

## 4. Core user flows (numbered; climax marked ★)
**UJ-1 — Owner brands the Community**
1. Owner opens Settings (General).
2. Sets Community name + logo.
3. ★ Entire app instantly reflects new identity — header, title, derived abbreviation, favicon; **zero** "PB Net-C"/"badminton" copy remains.

**UJ-2 — Admin configures an Activity's payment options**
1. Admin opens an Activity (e.g. Futsal).
2. Sets Monthly Fee and Session Fee (fee should be an explicit required input, not silent 0).
3. Enables Monthly and/or Per-Session (≥1 required).
4. ★ That Activity's fees & modes are the single source of truth — no global/General fee anywhere else.

**UJ-3 — Member picks a Payment Mode**
1. Member joins an Activity (e.g. Basketball) offering both modes.
2. ★ Member is prompted to choose Monthly vs Per-Session (auto-applied if only one offered).
3. Per-Session: each Session registered/attended adds that Session's fee to what they owe.

**UJ-4 — Member checks dues / submits payment proof on a phone**
1. Member opens app on mobile → sees their Activities, chosen mode, outstanding amount.
2. Opens Payments → unpaid banner.
3. Taps Upload Payment Proof → selects image + amount → Submit.
4. ★ "Payment proof uploaded — awaiting admin confirmation"; every screen usable without pinch/horizontal scroll.
(Then Admin confirms/rejects via Manage Payments; reuses existing PENDING→CONFIRMED/REJECTED proof flow.)

**Onboarding flow (existing, refreshed)**
1. First Google login → NextAuth creates user.
2. Redirected to /onboarding until profile complete.
3. ★ Completes profile → routed by role to member or admin surface.

## 5. Form-factor signals
**Verdict: Multi-surface, desktop-first as a layout *strategy* — but member surfaces are phone-primary in practice and must be fully usable (not merely shrunk) on mobile.** This is a deliberate, stated reconciliation, not an ambiguity.
Evidence:
- "render and function across **desktop, tablet, and mobile** widths" (FR-13).
- "Members are **predominantly on phones**… member-facing screens fully usable on mobile, not merely shrunk; **Admin/Owner screens optimized desktop-first**" (FR-13 / SM-C1).
- "see… what I owe — on whatever device I have, **usually my phone**" (JTBD).
- Counter-metric SM-C1: do **not** degrade desktop density/clarity to serve mobile; **desktop is the primary surface**.
- Addendum §D: implement base desktop layout with `sm:`/`md:` adaptations downward.
- Breakpoints: standard Tailwind `sm/md/lg/xl` assumed; **exact values to finalize in UX** [ASSUMPTION].

## 6. Content density & data per surface
- **Member dashboard:** light — greeting, upcoming-sessions list, attendance rate + session count stats, links. Low volume.
- **Sessions list/detail:** session cards/rows (date/time/location/capacity/status), sign-up state. Moderate volume [INFERRED community-sized lists].
- **Payments (member):** payment history list, status badges, unpaid banner, upload form. Low–moderate.
- **Admin dashboard:** 4 stat cards (Total Members, Active Members, Pending Payments, Confirmed this month). Dense at-a-glance.
- **Manage Members:** **table** — name/email, status, attendance columns; search + status filter; registered count. Highest-density surface; pagination/filtering expected.
- **Manage Sessions / Payments:** tables with row actions (confirm/reject, edit/delete, manual attendance). Dense, action-oriented.
- **Activity edit:** form — Monthly Fee, Session Fee, mode toggles, identity (name/icon/color/logo).
- **Each Session/Payment row must visually carry its Activity identity** (name + color/icon) — FR-5. Cross-Activity rows must be distinguishable.
- Volume: single Community, community-scale (tens–low-hundreds of members) [INFERRED]; not enterprise scale.

## 7. Stated visual / brand direction
- **Refresh, NOT redesign.** Keep the **existing design system**: shadcn/ui + Tailwind v4, existing theme + **dark mode** (`next-themes`). No new UI dependency or design-system swap (FR-14, Non-Goal, addendum §D).
- **Goal = consistency/polish:** uniform spacing, typography, button/card/table usage, empty/loading states; reuse shared components instead of per-page bespoke ones; dark mode verified on every screen (FR-14, SM-5).
- **Brand is intentionally neutral & configurable:** no bundled default logo; un-configured Community falls back to **name + derived abbreviation** (`communityAbbr`, e.g. "Sports Community"→"SC"); **neutral/generic favicon**. Default name "Sports Community"/"Komunitas Olahraga".
- **Specific colors / typography / logo art / tone-of-voice / "vibe":** **none stated.** Per-Activity carries its own name/icon/**color**/logo, but no palette values are given. The PRD explicitly does not prescribe a visual identity — that is the UX designer's to define within shadcn/Tailwind.

## 8. i18n, accessibility, sensitive content
- **i18n:** Full **English (en) + Indonesian (id)** parity is mandatory; every user-facing string routes through `src/lib/i18n/dictionaries.ts` (no hardcoding). UI label "Ekskul" → "Activity"/"Aktivitas". Defaults bilingual. UX copy must exist in both languages and tolerate id text length differences [INFERRED].
- **Accessibility:** Not explicitly called out. Implied bars: usable interactive targets at mobile widths (FR-13); no horizontal scroll/clipping; dark mode contrast. [INFERRED] formal a11y (WCAG, focus, contrast ratios) is an open gap the UX designer should set.
- **Sensitive / regulated content — money handling:** Yes. Payments involve real dues, **uploaded payment-proof images**, amounts, and an Admin confirm/reject ledger (PENDING/CONFIRMED/REJECTED, confirmedBy/At, rejection notes). **No automated payment gateway** — manual proof + admin confirmation only (Non-Goal). Activity-scoped data visibility is a **security invariant**: a Member sees only their Activities; cross-Activity/cross-ekskul leakage is a security regression, not cosmetic (addendum §D). No PII/financial-compliance regime named.

## 9. Stakes classification
**Internal / pre-consumer tool with money-handling sensitivity — closest to "internal," trending toward "consumer" at launch.**
Reasoning:
- PRD states **"Stakes: pre-launch — no live users, payments, or production data,"** so rigor is deliberately calibrated; several forks left to architecture.
- Single global Community per deployment (**not multi-tenant**) and invite-only sign-in ("only registered members") → internal/club tool, not open consumer SaaS.
- **But** it handles **money** (dues, proof images, confirmation ledger) and is **member-facing on personal phones**, so it carries consumer-grade trust/clarity expectations around payment state and amounts — errors here have real financial meaning even if currently low-risk pre-launch.
- Not "regulated": no payment gateway, no compliance regime, no PII beyond basic profile/Google auth.
→ Treat as **internal community tool with consumer-grade money-handling UX care**.

## 10. Open questions / gaps for the UX designer
From PRD §8/§9 plus UX-specific gaps:
1. **Desktop-first vs phone-heavy members** — chosen desktop-first, but members are phone-primary; revisit before launch (Open Q1). UX must resolve how far member screens lean mobile-first while obeying SM-C1 (don't degrade desktop).
2. **Mode switching** — can a Member change Payment Mode month-to-month per Activity, or is it locked per period? (Assumed switchable, Open Q2/FR-10.) Affects whether the selector is a one-time choice or a recurring control + history.
3. **Per-session billing timing** — pay per Session individually vs batched (weekly/monthly settlement)? Pre-pay on register vs pay-after-attend? (Assumed per-Session via existing proof flow, Open Q3/FR-12.) Drives where the charge/CTA appears (Session detail vs Payments).
4. **Exact responsive breakpoints** — Tailwind sm/md/lg/xl assumed; **finalize values in UX** (FR-13 assumption).
5. **Mode selector placement & UX** — where does the Monthly-vs-Per-Session choice live (join flow, Activity view, Payments)? How is "owed" shown per-mode? Not specified.
6. **Activity identity rendering** — how exactly Activity name + color/icon attaches to Session/Payment rows (badge, colored accent, icon chip) is unspecified (FR-5).
7. **Empty/loading/error states & a11y baseline** — required to be "consistent" (FR-14) but specific patterns and accessibility targets are undefined.
8. **Settings IA target shape** — General (identity) vs Activity (fees) split is mandated, but the concrete navigation/layout of Activity config (where Monthly Fee, Session Fee, mode toggles sit) is for UX to lay out.
9. **Seed/dev data on fee migration** — any data relying on the removed global default fee (Open Q4); low risk, pre-launch.
10. **Abbreviation rendering** — `communityAbbr` must look acceptable for arbitrary single/multi-word names as a logo fallback; visual treatment of the name-only fallback is undesigned.
