# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two co-equal audiences, separated by device and by job:

- **Member** — mobile-first, on a phone. Real scene: at or heading to a sports venue, or reacting to a message in the community's WhatsApp group. Jobs: see what sessions are coming up, claim a seat before capacity fills, upload a bank-transfer screenshot, and check whether their dues are settled. Thumb-driven, often one-handed, frequently interrupted.
- **Admin / Owner** — desktop-first. Typically a volunteer organizer or treasurer, not staff. Jobs: schedule sessions, verify transfer proofs one by one, see who has paid / is pending / is overdue, manage activities and their fees, and manage the member roster. Needs density and scanability over expression.

Neither audience is secondary. The member surface (`src/app/(main)/`, `/onboarding`) is designed mobile-first; the admin surface (`src/app/(admin)/admin/*`) is designed desktop-first. Both must remain usable on the other form factor.

There is one reader who is not a user:

- **Prospect** — a stranger on the public page at `/`, most often on a phone, arriving from a WhatsApp link or a search result. Not a third co-equal audience: they see one route, they have no account, and their only job is to decide whether to ask to join. Everything a Prospect can see is published to the open internet, which is a hard boundary and not a design preference — see *Operating Context*.

## Product Purpose

Centralize the running of an amateur sports or hobby community — activities, recurring sessions, attendance, and dues — in one system of record, replacing chat announcements and manual spreadsheets.

The four failures it exists to remove:

1. **Scattered scheduling** — announcements live in chat, so RSVPs are uncountable and capacity is overshot.
2. **Manual attendance** — presence tracked on paper or ad-hoc sheets.
3. **Painful dues collection** — the treasurer chases members individually and eyeballs transfer proofs, with no shared view of who owes what; worse when some members pay monthly and others pay per session.
4. **No central member record** — member data, activity memberships, and payment history are fragmented.

Success: a member never has to ask "am I in, and do I owe anything?", and an organizer never has to reconstruct that answer by hand.

## Positioning

Two mechanisms a neighboring roster or scheduling tool could not truthfully claim:

- **Per-member payment mode, resolved by billing period.** An Activity may offer monthly dues, pay-per-session, or both. Each member's mode lives on their Membership and is resolved as a pure function of the billing period (`src/lib/payment-mode.ts`) — a mid-period switch is queued to the next period and can never rewrite what the current period owes. Mode is never inferred from payment history, and a both-offered Activity leaves the mode explicitly unselected rather than defaulting silently.
- **Multiple activities under one community, each independently governed.** Badminton, futsal, and yoga can coexist with their own fee, weekly recurring schedule, capacity, offered payment modes, and destination bank account, while sharing one member roster and one identity.

Cash-transfer reality is built in, not worked around: dues are settled by bank transfer plus an uploaded proof image and an explicit admin confirmation. There is no payment gateway, and the design must treat proof-review as a first-class workflow rather than a fallback.

## Operating Context

- **Settlement is manual and evidentiary.** Member transfers to the Activity's bank account (`bankName` / `bankAccountNumber` / `bankAccountHolder`, copy-to-clipboard on the payment pages), uploads a screenshot to Supabase Storage, and the payment sits `PENDING` until an admin marks it `CONFIRMED` or `REJECTED`. Amounts are always server-authoritative and never trusted from the client.
- **Seats are money-backed.** A seat is never held without money behind it: per-session members pre-pay on register in one atomic transaction; monthly members must have the period's dues uploaded or confirmed before they can hold a seat. Capacity (`maxPlayers`) is enforced under a row lock, and a paid month auto-registers the member into that month's open sessions.
- **WhatsApp is the incumbent channel and does not go away.** Admin WhatsApp numbers are stored per-community and per-Activity and surfaced as contact affordances. The app displaces coordination, not conversation.
- **Physical venues and weekly rhythm.** Sessions have a location, a start/end time as `"HH:MM"` strings, and are generated from an Activity's weekly recurring day. The community's operating cadence is a fixed weekday slot.
- **Google is the only way in, and an Admin decides who gets in.** Google OAuth via NextAuth v5 with database sessions is the only authentication — but authentication is not admission. First login creates the User; every protected route redirects to `/onboarding` until `isProfileComplete` is true, and then to the waiting room until an Admin has admitted them.
- **Joining is approval-gated.** A User who has signed in and completed their profile is an **Applicant** until an Admin **admits** them. Order is profile-then-admission, so the Admin judges a real name and phone number — which is the identity check a community run over WhatsApp actually has. Never-admitted and revoked are separate states on the User, because a queue of people waiting at the door has to be distinguishable from people who were turned away. Declining revokes rather than deletes: the record of who asked survives, and the same Google account can sign in again regardless, so deletion was never a gate. The gate is **disclosed before the click** — a page that converts a stranger into silence is worse than no page, and "an organizer will let you in" is what an amateur community *is*, not a warning label. Applicants wait on a page that shows the community name and the organizer's WhatsApp and **no community data at all**; admission is emailed, because an Applicant has closed the tab and has no other reason to return; and the Admin gets a queue badge rather than mail per signup, because per-signup mail is how a volunteer organizer learns to filter this app into a folder. Enforcement is three-layered — a middleware redirect, a layout guard on each route group, and one shared check at the API boundary — because the middleware matcher reaches API routes while its protected-path list does not, so a page-only gate would redirect an Applicant away from the sessions list while leaving the reserve endpoint open. The same check reads `isActive`, which closes a standing hole: the roster's deactivate control wrote a flag nothing enforced, so a revoked member still signed in and reached the dashboard.
- **What an unauthenticated route may publish is an allow-list, and it binds every such route.** Not a no-list, and not scoped to one page: the public landing page and the shareable session page are judged by the same list, card metadata and page body alike. A no-list that names one route is broken by the next route, which is exactly how the session page came to publish three things the landing page withholds. One server-only module owns every public read and hand-writes its `select` — never `include`, because an `Activity` row carries `bankName`, `bankAccountNumber`, `bankAccountHolder` and `adminWhatsapp` alongside the name and the fees, so a single careless `include` publishes all four. Three standing rules:
  1. **No aggregate people-count, ever.** Not members, not attendance, not "N reserved this week". A real count is truthful, but rendering it only when it flatters is evidence-shaped silence — the same lie the evidence ban exists to prevent. Counts of *activities* are structural, not social proof, and stay allowed.
  2. **An unauthenticated GET never mutates and never sends mail.** This bars the expired-holds sweep, which deletes rows and queues member email, and therefore bars every capacity figure — no seats-left, no Open/Full, no progress bar. Without the sweep the number is stale-high, so the page can advertise "full" when seats are free. Capacity truth stays behind auth, where the sweep legitimately runs.
  3. **No admin-authored free text.** `Activity.description`, `ActivitySession.title` and `ActivitySession.notes` are unvalidated prose written under an internal-tool assumption; an admin will eventually paste a phone number, a bank line, or a member's name into one. Every published field must be one an admin *could not* have mistaken for private — a name is a label, prose is not.

  Published: active Activities (name, icon, colour, weekly slot, standing venue, and fees **including a stored zero**, rendered through the dictionary as "Free" rather than "Rp 0" — the database cannot tell *unconfigured* from *genuinely free*, and both readings are honest about the stored value) plus the next three scheduled sessions. Withheld: bank details, WhatsApp numbers, every `User` / `Payment` / `Membership` / `Attendance` field, capacity, per-session `location` (which can be a one-off private address, where the standing venue cannot), and the free text above. `Activity.color` is published and then deliberately never rendered — livery is colourless by design law, and that is intended rather than an oversight.
- **`/` is indexable; every other route is not.** A single-community deployment wants its own front door findable and nothing else. Enforced twice, because `robots.txt` is advisory and the real exposure is counter-intuitive: an unauthenticated crawler hitting a protected route is redirected to the sign-in page, which is itself a 200 that would index perfectly well. The shareable session page stays out of the index even after the allow-list has trimmed it — a time and a place should not be searchable.
- **Money is Rupiah, stored as integers.** No decimal or multi-currency handling exists today.

## Capabilities and Constraints

**Confirmed capabilities**

- Google OAuth sign-in; three roles: `OWNER`, `ADMIN`, `MEMBER`.
- Onboarding: complete profile, pick activities. **Today this is self-serve, and that is a defect, not the policy** — see *Decided, not yet built*.
- Multi-activity community; per-Activity fee, weekly schedule, capacity, offered payment modes, bank account, WhatsApp, color, icon, logo.
- Membership per member per Activity, carrying payment mode plus a queued next-period switch.
- Sessions with capacity-limited RSVP; statuses `SCHEDULED` / `ONGOING` / `COMPLETED` / `CANCELLED`.
- Cost-sharing viability floor: `Activity.minMembers` is enforced and surfaced per session as a committed-vs-needed quota (`getSessionQuotas`, `src/lib/recurring-sessions.ts`).
- Attendance per member per session: `REGISTERED` / `PRESENT` / `ABSENT`.
- Payments in two shapes — one `MONTHLY` row per member/Activity/period, one `SESSION` row per member/session — with proof upload, `PENDING` / `CONFIRMED` / `REJECTED`, and confirming admin recorded.
- Member self-cancel that releases the seat and its charge together; a confirmed per-session payment is protected and routed to an admin.
- Admin panel: activities, sessions, attendance, payments, members, community settings.
- Runtime white-label: community name and logo from the `Settings` key-value table; neutral locale-resolved default when unset.
- English / Indonesian, switchable at runtime via the `NEXT_LOCALE` cookie.
- Metadata addressed to a stranger: the community name alone as the public `<title>`, a description that promises no inventory, and a link-preview card generated from the name. `/` is the one indexable route; every other route is `noindex`, enforced both by `robots.txt` and by the pages themselves.

**Durable constraints**

- Single community per deployment. No tenant switcher, no cross-community views. White-labeling exists so a second community could be onboarded without a code change — not so two run side by side.
- Every string **rendered in the app UI** goes through `src/lib/i18n/dictionaries.ts`, page metadata included — metadata resolves server-side per request and reads the dictionary like any other surface. Never hardcode copy. **`src/lib/email/` is the second copy home, and is not a violation of this rule:** every template there inlines its own `id`/`en` pair for subject lines, HTML bodies, row labels and locale-formatted dates, none of which the dictionary has a shape for. A new template follows its siblings rather than becoming the odd one out. Layouts must hold Indonesian strings, which typically run 15–30% longer than English.
- No payment gateway, no automated reconciliation. Proof review is human.
- **Email exists; SMS and push do not.** `src/lib/email/` ships Gmail SMTP via nodemailer, with a shared bilingual HTML shell and one file per template. Sends are best-effort by design — guarded by a configuration check, queued after the response, logged on failure, never thrown — so no user-facing flow may depend on delivery succeeding.
- Serverless database access is pool-constrained (1 connection per function in production); Supabase service-role storage access is server-only and must never reach the browser.
- **The automated net is narrow and deliberate.** Vitest runs on `npm test` over pure logic in `src/lib/__tests__/`; anything touching Prisma, Supabase, or the DOM is not covered, and `docs/test-cases/` holds 14 manual end-to-end cases and remains the only net for those. Choose the instrument by what is being checked: a data property of a value belongs in Vitest, a syntax pattern belongs in ESLint (which is already a pre-commit hook), and a rule with neither is a rule that leaks.
- Coding standards are enforced: 40-line functions, 300-line files, max 3 levels of nesting, no magic numbers.

**Decided, not yet built**

Binding decisions that the code does not yet implement. They are product truth and future work may not contradict them, but listing them above as confirmed capabilities would claim behaviour that does not exist — the same fabrication *Evidence on Hand* bans, one layer out.

- **A public landing page at `/`, addressed to Prospects**, replacing the sign-in threshold that page holds today. It sells one community to people who might join it — never the software to other communities. Two full-bleed bands and a footer: a pitch with one loud action on painted board, then one band of the community's real Activities on enamel, then the footer.

**Explicitly undecided**

- **Domain terminology is unresolved.** Known collisions and overloads, none yet adjudicated: "Session" means the auth session, the meetup (`ActivitySession`), and a per-meetup charge (`PaymentType.SESSION`); money is variously `monthlyFee`, `sessionFee`, `fee`, "dues", and "iuran"; "member" means a `Role`, a `User`, and an active `Membership`; `AttendanceStatus.ABSENT` is used to mean "opted out, forfeited" rather than "did not show up", leaving genuine no-shows unrecorded; and the functional difference between `OWNER` and `ADMIN` is undefined.
- **Cited decision records do not exist.** Code and test cases reference `AD-2`, `AD-4`–`AD-8`, `AD-10`, `AD-13`, `AD-14`, `AR-7`, `FR-4`, `FR-8`–`FR-10`, `NFR-3`, `NFR-8` across nine files. No document in the repository defines any of them. Their rationale is currently unretrievable.
- Whether a member with an unselected payment mode on a both-modes Activity has any path to choose it outside a session-registration flow. Today `/payments/upload` shows them a dead-end empty state.

## Brand Commitments

None are binding. Recorded so future work does not mistake sample data for identity:

- **`XClub Community` is a placeholder**, written by `prisma/seed.ts` and `prisma/seed-prod.ts`. It is not a real brand. There is no XClub logo, wordmark, or palette — `public/` holds only stock Next.js SVGs.
- The repository name `net-c-management` is historical, from the badminton community the project originally served. `PB Net-C` is retired and must not be reintroduced as identity.
- Community name and logo are runtime configuration, not code. Every surface must survive an unknown name and an absent logo; the fallback is the neutral, locale-resolved `Sports Community` / `Komunitas Olahraga`.
- **Voice:** bilingual, English authored first and Indonesian kept complete. `DEFAULT_LOCALE = 'en'` is intentional — English is the default face for reusability and mixed audiences. **One voice on every surface, the public page included: plain, second person, no superlatives, and no claims about size, popularity, or history.** That last clause is the evidence ban restated at the one point where a writer selling the community would otherwise reach past it. No admin writes marketing copy; what makes a page feel like *this* community is its data — the name, the logo, and the real Activities — never prose an organizer typed into a settings field.
- Nothing sport-specific may be baked into code, copy, or imagery.

## Evidence on Hand

There is **no real-world evidence**. The application is not live: no real members, no real payments, no adoption metrics, no testimonials, no press, no case studies. Future work must never imply otherwise — no invented member counts, no "trusted by N communities", no fabricated screenshots of real activity.

What does exist:

- `prisma/seed.ts` — sample members, activities, sessions, and confirmed payments. Everything visible in a running dev instance today comes from here.
- `prisma/seed-prod.ts` — settings and real Activity rows only; no sample members.
- `docs/test-cases/` — 14 manual end-to-end test-case documents across six areas (auth/onboarding, sessions/attendance, payments, activities/membership, admin/settings, cross-cutting).
- `color-themes-1.html` at the repository root — a prior accent-color exploration, titled for the retired Net-C brand. An artifact, not a commitment.

Because nothing is live, empty states are the default state, not an edge case, and populated states must be demonstrated with seed data rather than claimed. This binds the public page and its share card hardest, since both are read by someone with no other information: the image a link preview shows is **generated lettering on a colour field**, never a screenshot of activity that does not exist, and the page's own substance band renders its empty shape rather than disappearing — an empty band is honest, a page without one is a poster.

## Product Principles

1. **Money and seats move together.** No seat without money behind it, no charge without a seat, no half-written state. Any flow touching both must remain atomic and reversible in one step.
2. **Never guess what a member owes.** Amounts and payment modes are resolved server-side from the billing period, never inferred from history and never accepted from the client. A settled period is immutable.
3. **The unselected state is a real state.** Where a member genuinely has a choice to make, show the choice — do not paper over it with a silent default.
4. **Identity is configuration.** Community name, logo, activities, fees, and venues are data. Design must hold up when all of them are unknown, blank, or unexpectedly long.
5. **Two audiences, one system of record.** A member's phone and a treasurer's desktop see the same truth, shaped for different hands — never two divergent versions of the same fact.

## Accessibility & Inclusion

**WCAG 2.1 AA is a stated requirement**, not best-effort: contrast ratios, visible focus, keyboard operability, and correct semantics are held to AA across both the member and admin surfaces.

Additionally, i18n is an accessibility concern here — both dictionaries are authored to the same standard, and no layout may break on the longer Indonesian string.
