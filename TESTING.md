# Manual Testing Guide

Step-by-step guide to exercise every feature flow — happy paths **and** edge
cases — against the seeded local database. Covers the defects and observations
found in QA (BUG-01…04, OBS-01…07) and all seven email flows.

Areas, in order: prerequisites and fixtures (§1–§4), auth and onboarding (§5),
admin surfaces (§6–§11), member surfaces (§12–§13), email flows (§14), production
reset (§15), and **design-system verification — contrast, colourless state, rule
visibility, the landing threshold, locale and typography (§16, `TC-DS-*`)**. §16 is
the one area written as numbered test cases carrying measured numbers in their
expected results, and it reuses the §2 seed, the §3 accounts and the §4 sessions
rather than fixtures of its own.

**Member-surface verification (§17, `TC-MS-*`)** is the second such area, written
to the same conventions and inheriting §16.0 by reference. It covers what a
member can see and do on the board, the dashboard, a Session, the dues surfaces
and the mobile rail.

**Admin-register verification (§18, `TC-AR-*`)** is the third, written to the same
conventions and inheriting §16.0 by reference. It covers every admin surface —
the Payments queue, the Sessions register and its locks, the attendance register
and the fourth attendance value, Members and the Owner rules, Activities,
Applicants and Settings — together with the exports, both locales, the keyboard
and both widths. **§7–§11 below are retired into it**: their steps are the raw
material `TC-AR-*` was folded out of, and each section now points at the cases
that replaced it rather than restating them.

> The full test-case report (with screenshots) is generated as a DOCX under
> `docs/` — that folder is **git-ignored**, so it is a local artifact only.

---

## 1. Prerequisites

```bash
npm install
npx prisma generate          # after any schema change
npm run db:seed              # load the demo/test dataset (see §2)
npm run dev                  # http://localhost:3000
```

The dev server must be running for every test below.

Email flows additionally need `GMAIL_USER` / `GMAIL_APP_PASSWORD` in `.env.local`
(and `CRON_SECRET` for the day-reminder cron). See §14.

---

## 2. Reseed to a clean state

The seed is **idempotent and destructive-for-transactional-data**: it clears all
`Attendance`, `Payment` and `ActivitySession` rows and re-upserts users,
activities, memberships and settings. Run it any time to get back to a known
baseline.

```bash
npm run db:seed                               # anchor = real "today"
npm run db:seed -- --date=2026-08-15          # pretend today is 15 Aug 2026
npm run db:seed -- --date=2026-08-15 --from=2026-07-01 --to=2026-08-14
```

- `--date` — the day treated as "today"; every relative scenario shifts with it.
- `--from` / `--to` — the range past COMPLETED sessions are spread over.
- Env fallbacks: `SEED_DATE`, `SEED_FROM`, `SEED_TO`.

**Always reseed before an email round** (§14) and after it, so no test artifacts
linger.

---

## 3. Test accounts (dev login)

Local dev has an OAuth bypass at **`/auth/dev`** — click a user, or POST the
email to `/api/dev-login` (form field `email`). Never ships to production.

| Email | Role | Notes |
|-------|------|-------|
| `owner@xclub.local` | OWNER | full admin access |
| `admin@xclub.local`, `admin2@xclub.local` | ADMIN | admin access |
| `member@xclub.local` | MEMBER | **Adi Pratama** — Badminton monthly **UNPAID**; Basket/Futsal/Tennis paid |
| `eka.saputri@xclub.local` | MEMBER | **Eka** — Futsal `paymentMode = null` (must pick a mode) |
| `newbie@xclub.local` | MEMBER | **incomplete profile** → bounced to `/onboarding` |
| `sari.rahma@…`, `bima.wicaksono@…`, … | MEMBER | roster members |

All non-real addresses use the `@xclub.local` domain — **never send real email to
them** (see §14).

---

## 4. Seeded scenario sessions

Each maps to one or more test cases. Find them in the sessions list or by title.

| Session | Purpose / edge case |
|---------|---------------------|
| Weekly Rally Night, Morning Drills, Futsal Friday, Pickup Game, Singles Ladder | normal upcoming, paid |
| **Free Play (Maybe Test)** | fee 0 → Going/Maybe/Can't-make-it; Adi seeded MAYBE |
| **Hold Lab (Per-Session Test)** | confirmed + pending session payments, **live hold**, **expired hold** |
| **Full Court Challenge** | 6/6 full → register button disabled (OBS-04) |
| **Underbooked Friendly** | 2 going < min 4 → admin "Remind members" (§14) |
| **Rained Out (Cancelled)** | CANCELLED → no RSVP actions |
| **Live Pickup (Ongoing)** | ONGOING → "RSVP closed" |
| **Today Ladder (Reminder Test)** | SCHEDULED today (WIB) → day-reminder cron target (§14) |

---

## 5. Auth & onboarding

1. **Anonymous guard** — sign out, open `/admin` → redirected to `/auth/signin`.
2. **Member blocked from admin** — sign in as Adi, open `/admin` → redirected to
   `/dashboard`; the Admin nav entry is absent.
3. **Owner sees admin nav** — sign in as `owner@xclub.local` → `/dashboard` shows
   the **Admin** entry.
4. **Onboarding (incomplete profile)** — sign in as `newbie@xclub.local` → bounced
   to `/onboarding` with an empty form. Fill name + phone (`08…`) + pick an
   activity → **Save** → lands on `/dashboard`.
5. **Edge — onboarding not reopenable (BUG-03)** — as Adi (complete profile) open
   `/onboarding` directly → redirected to `/dashboard` (the form never renders, so
   a resubmit can't overwrite the saved name/phone).
6. **Edge — admin APIs reject a member** — as Adi run in the browser console:
   `fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status)` → `403`.

## 6. Admin dashboard

1. `/admin` → KPI cards, "Needs attention" (pending proofs + under-booked), "This
   week", per-activity cards.
2. **Edge — dues collected (OBS-01)** — every activity card's "Dues collected"
   numerator is **≤** its member count (e.g. Badminton `14/21`, never `22/21`);
   only MONTHLY confirmed payments count.

## 7. Session management (admin) — retired into §18

**Retired.** These were plain numbered steps without case ids, written before
spec #30 rebuilt the admin side. Every one of them that still applies was folded
into a `TC-AR-*` case, which states its preconditions, its steps and its expected
result with an HTTP status where a route is involved. The section numbers stay so
that references from elsewhere in this file keep resolving; the steps themselves
are not re-run here.

| Was | Now |
|---|---|
| 1–2 list, search and filter | `TC-AR-001`, `TC-AR-036` |
| 3 filtered empty state (OBS-02) | `TC-AR-031` |
| 4–6 create: empty form, end before start (BUG-01), valid | `TC-AR-030` |
| 7 locked fields on edit | `TC-AR-003`, `TC-AR-004`, `TC-AR-005` |
| 8 update | `TC-AR-005` step 4, `TC-AR-003` step 4 |
| 9 manual attendance | `TC-AR-017`, `TC-AR-019` — attendance moved to its own register (`/admin/sessions/{id}/attendance`) and out of the edit form |
| 10 CSV headers localized (OBS-03) | `TC-AR-033` |
| 11 delete | `TC-AR-008` |

## 8. Payment review (admin — Manage Dues) — retired into §18

**Retired**, on the same terms as §7. The surface is a queue now, not a list, and
its ordering is the feature the cases test.

| Was | Now |
|---|---|
| 1–2 list, filters, awaiting count | `TC-AR-020`, `TC-AR-021` |
| 3 confirm a pending payment | `TC-AR-024` |
| 4 reject requires a reason | `TC-AR-025` — the reason is refused **in the dialog with a message**, not by a disabled button, and by the route |
| 5 reject with a reason | `TC-AR-025`, `TC-AR-026` |
| 6 CSV export (OBS-03) | `TC-AR-033` |

## 9. Activity management (admin) — retired into §18

**Retired**, on the same terms as §7.

| Was | Now |
|---|---|
| 1 list with counts, fees, status | `TC-AR-029`, `TC-AR-036` |
| 2–3 create: empty form, valid | `TC-AR-029` |
| 4 duplicate slug → `409` | `TC-AR-029` step 3 |
| 5 missing fields → `400` | `TC-AR-029` step 4 |
| 6 deactivate / activate | `TC-AR-029` step 5 |

## 10. Member management (admin) — retired into §18

**Retired**, on the same terms as §7.

| Was | Now |
|---|---|
| 1 directory, search, filter, pagination | `TC-AR-028`, `TC-AR-031` |
| 2–3 promote and demote | `TC-AR-028` step 3 |
| 4 incomplete profile badge | `TC-AR-028` |
| 5 member detail | `TC-AR-028` steps 4–5 |
| (new) Owner immutability and contact privacy | `TC-AR-007`, `TC-AR-027` |

## 11. Community settings (admin) — retired into §18

**Retired**, on the same terms as §7.

| Was | Now |
|---|---|
| 1 current values | `TC-AR-032` |
| 2 save a new Community Name | `TC-AR-032` step 4 |
| 3 empty name (BUG-02), and `PATCH /api/settings` → `400` | `TC-AR-032` steps 2–3 |

## 12. Member — dashboard & sessions

Sign in as **Adi** (`member@xclub.local`).

> **Partly superseded by spec #29.** Items 1 and 2 still describe the surfaces
> as they were before #57 and #59 rebuilt them on the Slot Cell: there are no
> RSVP pills on the dashboard and no "This week / Later" grouping on
> `/sessions`. The expected results below are left as written rather than
> guessed at; **§17's TC-MS-004, TC-MS-007, TC-MS-012 and TC-MS-013 are the
> current expectation** for those two items. Everything from item 3 down was
> re-run on 2026-08-20 and holds.

1. **Dashboard** — greeting, **"Badminton dues unpaid"** banner, stat tiles,
   per-activity cards with RSVP pills.
2. **Sessions list** `/sessions` — grouped This week / Later, quota badges, filters.
3. **Free session RSVP** — open **Free Play (Maybe Test)** → switch Maybe → Going
   → Can't-make-it (seat count updates, no payment).
4. **Per-session hold** — open **Hold Lab**, "Change payment mode" → Per session →
   "Register & pay" → redirected to the pay page; back on the session it shows
   "Reserved · pay within MM:SS" + Cancel. **Cancel** releases the seat.
5. **Edge — full session (OBS-04)** — open **Full Court Challenge** (6/6) → the CTA
   is the disabled **"Session Full"** button (never an enabled Register).
6. **Edge — cancelled** — **Rained Out (Cancelled)** → "Session Cancelled", no
   actions.
7. **Edge — ongoing** — **Live Pickup (Ongoing)** → "RSVP closed".
8. **Edge — server guards** — as Adi, `POST /api/sessions/{ongoingId}/attendance`
   → `403 "RSVP closed"`; the cancelled session → `400 "Session is cancelled"`;
   reserving a full session → `409`.
9. **Edge — pay page helper (OBS-06)** — the register-&-pay page shows **"Set by
   this session's fee"** (not the monthly-fee text).

## 13. Member — payments & profile

> **Two notes from the 2026-08-20 re-run.** Item 1's "July" is whichever month
> the seed anchors to — **August** on a default `npm run db:seed`, and the
> Badminton mark there now reads **Pending** rather than "Unpaid". Item 3 holds
> on every surface: the run found `/dashboard` and `/profile` reading `Pending`
> where `/payments` read `In review`, and the two states were given two words —
> **In review** once a Proof is sent, **Pending** while nothing has been — rather
> than the case being softened. See §17.10, defect 8.

1. **Edge — unpaid dues surfaced (BUG-04)** — `/payments` → the July section lists
   **Badminton = Unpaid** alongside Basket/Futsal/Tennis = Paid, matching the
   dashboard banner.
2. **Upload proof** — `/payments/upload`, select Badminton (amount locked) → attach
   an image → Submit → history shows "In review".
3. **Edge — in-review badge (OBS-05)** — after upload, the Badminton dues card and
   the dashboard activity card read **"In review"** (not "Unpaid"); the unpaid
   banner disappears.
4. **Edge — client file check (OBS-07)** — on the upload page, force a `.txt` onto
   the file input → instant toast "Unsupported file format…", input cleared,
   Submit stays disabled. (Server also returns `400`.)
5. **Payment mode dialog** — on a paid Badminton session, "Change payment mode" →
   Monthly ↔ Per session re-prices the button (applies immediately while unpaid).
6. **Edge — no mode chosen** — sign in as **Eka**, open **Futsal Friday** → plain
   "Register" (no price) → dialog forces Monthly vs Per session.
7. **Rejected payment** — `/payments?historyStatus=REJECTED` → shows reason +
   refund guidance + WhatsApp link.
8. **Profile** — edit name; phone `08123456789` normalizes to `628123456789`;
   language toggle switches EN↔ID; Sign Out ends the session.

---

## 14. Email flows (all seven) — safe procedure

The app sends real email via Gmail SMTP, and the seed roster uses fake
`@xclub.local` addresses. **Never trigger a flow that would mail those.** Route
every send to a real inbox you control.

Recipient by flow:

| Flow | Trigger | Recipient |
|------|---------|-----------|
| Reservation hold created (payment deadline) | reserve a paid seat | the reserving member |
| Payment approved / rejected | admin confirms/rejects a proof | the paying member |
| Hold expired (re-register) | a hold lapses, then any capacity read runs the sweep | the member who held it |
| Day-of attendance reminder | `GET /api/cron/day-reminders` | every REGISTERED attendee of today's SCHEDULED sessions |
| Under-booked "Remind members" | `POST /api/sessions/{id}/remind` (admin) | active activity members **not** registered |

### 14.1 Point a test member at your inbox

Use Prisma Studio (`npm run db:studio`) or a one-off script to set a member's
email to a real address, e.g. change one roster member to `you@example.com`.
Reseeding restores the original.

### 14.2 Per-member flows (hold-created, approved, rejected)

Safe by construction — they only mail the one acting member:

1. Set that member's email to your inbox (§14.1) and sign in as them.
2. Reserve a paid seat (e.g. **Singles Ladder**) → **hold-created** email.
3. Upload a proof for it → then sign in as owner and **Confirm** → **approved**
   email; or **Reject** with a note → **rejected** email.

### 14.3 Hold-expired

1. Set members A/B to real inboxes.
2. In Prisma Studio: delete any `Attendance` with a non-null `holdExpiresAt`
   (clears seeded holds), then create a REGISTERED attendance for A and B on any
   SCHEDULED session with `holdExpiresAt` in the **past**.
3. Load any capacity page (e.g. `/payments`) → the lazy sweep releases them and
   emails only A/B.

### 14.4 Day-of reminder (cron) — fan-out, isolate first

The seed provides **Today Ladder (Reminder Test)** (SCHEDULED, today WIB) but its
attendees are fake addresses. To test safely:

1. In Prisma Studio, set `dayReminderSentAt = now` on **every** today SCHEDULED
   session (so the cron skips them).
2. Delete that session's attendances; add REGISTERED attendances only for your
   real-inbox members; set its `dayReminderSentAt = null`.
3. Trigger:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/day-reminders
   ```
   Expect `{"sessions":1,"sent":2,"skipped":0}` — mail only to your inboxes.

### 14.5 Under-booked "Remind members" — fan-out, isolate first

The blast mails **all active activity members not registered** — with the seed
that is the whole fake roster. Do **not** run it on a seeded activity. Instead:

1. Create a throwaway activity whose only two members are your real inboxes, plus
   one SCHEDULED session in it (`lastReminderAt = null`).
2. As owner: `POST /api/sessions/{thatSessionId}/remind` → `{"sent":2,"skipped":0}`.

**After any email round, reseed (`npm run db:seed`) to remove the test data and
restore the fake addresses.**

---

## 15. Resetting **production** to a clean state

> ⚠️ **Destructive and irreversible.** These act on the real production database
> (`.env.prod`). Take a Supabase backup first. `npm run db:seed` /
> `npm run db:seed:prod` are **not** interchangeable — the plain `db:seed` loads
> the demo dataset and must **never** run against prod.

Prisma CLI targets prod only when `DATABASE_TARGET=prod` (see `prisma.config.ts`,
which then loads `.env.prod`). `npm run db:seed:prod` is **idempotent and
non-destructive** — it only upserts Settings, the two Activities, and promotes the
owner (only if that user already signed in with Google). It does **not** wipe
data.

### Option A — targeted cleanup (recommended)

Removes the transactional test data (sessions, payments, RSVPs) but keeps real
users, Google logins, memberships, activities and settings.

1. Open the prod DB — Supabase SQL editor, or `npm run db:studio:prod`.
2. Delete the transactional tables (order avoids FK issues):
   ```sql
   DELETE FROM "Attendance";
   DELETE FROM "Payment";
   DELETE FROM "ActivitySession";
   -- optional: also clear test memberships (members must rejoin afterwards)
   -- DELETE FROM "Membership";
   ```
3. Re-assert the catalog + owner:
   ```bash
   npm run db:seed:prod
   ```

### Option B — full wipe (true blank slate)

Drops **every** row (including real users and their Google account links) and
re-applies migrations.

```bash
# --skip-seed is REQUIRED: migrate reset would otherwise run the local DEMO
# seed (prisma.config.ts) and inject demo data into prod.
cross-env DATABASE_TARGET=prod npx prisma migrate reset --skip-seed --force

npm run db:seed:prod   # settings + activities (owner is promoted only after
                       # they sign in with Google again — see seed-prod.ts)
```

Notes:
- `migrate reset` needs a **direct** database connection, not the Supabase
  transaction pooler (port 6543). Point `.env.prod`'s `DATABASE_URL` (or
  `DIRECT_URL`) at the direct/session connection for the reset.
- After a full wipe the owner must sign in with Google once, then re-run
  `npm run db:seed:prod` (or `npm run db:promote:prod`) to regain the OWNER role.

---

## 16. Design-system verification (`TC-DS-*`)

The design system (`DESIGN.md`, *Papan Jadwal*) makes two promises that rot
silently: every text and mark pair clears WCAG AA in **both** board materials,
and every state survives having its colour removed. This area turns both into
cases that fail on a **number** or on a **screenshot**, not on an opinion, so a
nudged token is a failed case rather than a matter of taste.

Every case below is stated as something a person can see. Nothing asserts that a
component rendered with a class name — such a case passes forever while the
design breaks.

### 16.0 Conventions, vocabulary and shared preconditions

Each case carries an id (`TC-DS-NNN`), a priority (**P0** ships nothing broken,
**P1** ships with a known note, **P2** is cosmetic), a type (Positive / Negative /
Edge), its own preconditions, numbered steps, and an expected result. Where a
case touches an API the expected result names the **HTTP status**.

The two board materials are objects, not themes (`DESIGN.md`, *The
Material-Is-Not-Mode Rule*):

- **enamel** — the light material. `:root` in `src/app/styles/board-materials.css`.
- **painted board** — the dark green material. `.dark` in the same file. The
  public route's hero band renders it in **both** materials, deliberately.

Shared preconditions for every case in this area:

1. §1 prerequisites done and `npm run dev` running on `http://localhost:3000`.
2. §2 seed loaded (`npm run db:seed`) — these cases use the §3 accounts
   (`member@xclub.local` = Adi, `owner@xclub.local`), the four seeded activities
   (Badminton, Basket, Futsal, Tennis) and the §4 sessions. No fixture of their
   own, and no fixture invented in a case.
3. Material switched with the **theme toggle** in the header rail (or the OS
   colour scheme, which `system` follows).
4. Locale switched on `/profile` → Language, or by setting the `NEXT_LOCALE`
   cookie to `en` / `id`.
5. Viewport set with the browser's device toolbar: **390 × 844** (phone) and
   **1440 × 900** (desktop).

Contrast is read the same way in every case: inspect the element, and read the
ratio DevTools prints in the colour picker beside `color` — or compute it from
the two token values. Ratios below are the measured values of the shipped
tokens; a case fails when the measurement is **below its target**, not when it
differs from the value printed here.

### TC-DS-001 · P0 · Positive — Enamel text-on-surface pairs clear WCAG AA

**Preconditions:** signed in as Adi; material = enamel; locale = en.

**Steps:**
1. Open `/dashboard`, `/sessions`, `/payments` and `/profile`.
2. For each text role on a cell (tile) and on the page ground, read the contrast
   ratio of `color` against the surface behind it.

**Expected result:** every pair clears **4.5:1** (AA, body text; a role at
≥24px, or ≥18.66px and bold, only has to clear 3:1):

| Pair | Tokens | Target | Measured |
|---|---|---|---|
| Graphite Ink on tile | `--foreground` on `--card` | 4.5 | **16.10** |
| Graphite Ink on ground | `--foreground` on `--background` | 4.5 | **14.19** |
| Secondary Ink on tile | `--muted-foreground` on `--card` | 4.5 | **6.13** |
| Secondary Ink on ground | `--muted-foreground` on `--background` | 4.5 | **5.41** |
| Quiet Ink on tile | `--subtle-foreground` on `--card` | 4.5 | **4.74** |
| Court Green on tile | `--primary` on `--card` | 4.5 | **6.98** |
| Court Green on ground | `--primary` on `--background` | 4.5 | **6.15** |
| Primary action | `--primary-solid-foreground` on `--primary-solid` | 4.5 | **6.98** |

And one constraint that is part of the same case: **Quiet Ink on the enamel
ground measures 4.17:1 and does not clear AA.** No surface may put
`--subtle-foreground` text on `--background` or `--muted`; text sitting on the
ground takes Secondary Ink instead (5.41:1). A page where Quiet Ink lands on the
ground fails this case.

### TC-DS-002 · P0 · Positive — Painted-board text-on-surface pairs clear WCAG AA

**Preconditions:** signed in as Adi; material = painted board; locale = en.

**Steps:** as TC-DS-001, over the same four routes.

**Expected result:** every pair clears **4.5:1**:

| Pair | Tokens | Target | Measured |
|---|---|---|---|
| Chalk Ink on tile | `--foreground` on `--card` | 4.5 | **11.49** |
| Chalk Ink on ground | `--foreground` on `--background` | 4.5 | **13.06** |
| Chalk Secondary on tile | `--muted-foreground` on `--card` | 4.5 | **5.45** |
| Chalk Secondary on ground | `--muted-foreground` on `--background` | 4.5 | **6.19** |
| Chalk Quiet on tile | `--subtle-foreground` on `--card` | 4.5 | **4.70** |
| Chalk Quiet on ground | `--subtle-foreground` on `--background` | 4.5 | **5.35** |
| Court Green Lit on tile | `--primary` on `--card` | 4.5 | **6.00** |
| Court Green Lit on ground | `--primary` on `--background` | 4.5 | **6.82** |
| Primary action | `--primary-solid-foreground` on `--primary-solid` | 4.5 | **6.82** |

### TC-DS-003 · P0 · Positive — Mark-on-wash pairs clear AA, enamel

**Preconditions:** signed in as Adi; material = enamel. Marks with a live
producer: **Ink** (a Confirmed Payment on `/payments`), **Tape** (the pending
payment on **Hold Lab**, and the MAYBE RSVP on **Free Play**), **Strike** (the
rejected payment under `/payments?historyStatus=REJECTED`, and **Rained Out
(Cancelled)**), **Blank** (the RSVP-not-yet-given pill on `/dashboard`, and
`Unposted` on `/`).

**Steps:**
1. Open each surface above and find the mark.
2. Read the mark label's contrast against the wash it sits on.

**Expected result:** every mark clears **4.5:1** — worst case for a mark that can
sit on either surface is listed:

| Mark | Pair | Target | Measured |
|---|---|---|---|
| Ink | Court Green on ink wash | 4.5 | **6.31** |
| Tape | Tape Ochre on tape wash | 4.5 | **5.36** |
| Strike | Struck Red on strike wash | 4.5 | **5.97** |
| Erased | Secondary Ink on ground | 4.5 | **5.41** |
| Blank | Secondary Ink on ground (worst) / tile | 4.5 | **5.41** / 6.13 |
| Hollow | Struck Red on ground (worst) / tile | 4.5 | **5.73** / 6.50 |

### TC-DS-004 · P0 · Positive — Mark-on-wash pairs clear AA, painted board

**Preconditions:** as TC-DS-003, material = painted board.

**Expected result:** every mark clears **4.5:1**:

| Mark | Pair | Target | Measured |
|---|---|---|---|
| Ink | Court Green Lit on ink wash | 4.5 | **5.40** |
| Tape | Tape Ochre Lit on tape wash | 4.5 | **6.20** |
| Strike | Struck Red Lit on strike wash | 4.5 | **5.45** |
| Erased | Chalk Secondary on ground | 4.5 | **6.19** |
| Blank | Chalk Secondary on tile (worst) / ground | 4.5 | **5.45** / 6.19 |
| Hollow | Struck Red Lit on tile (worst) / ground | 4.5 | **5.04** / 5.73 |

### TC-DS-005 · P0 · Negative — The banned action pairing never renders

**Preconditions:** any material; `/` open (its hero band is painted board in both
materials).

**Steps:**
1. Inspect the hero's primary action.
2. Read its label colour and its ground.

**Expected result:** the label is **Board Ground ink on Court Green Lit**
(`--primary-solid-foreground` on `--primary-solid`) at **6.82:1**. Chalk Ink on
Court Green Lit measures **1.92:1** and is banned — if the label resolves to
`--foreground` on the lit green, the case fails. This is the one pairing on the
public route that can be got wrong by an override, and the token layer already
pairs it correctly, so the case is watching for exactly that override.

### TC-DS-006 · P0 · Positive — The six marks survive colour removal

**Preconditions:** signed in as Adi; run once per material.

**Steps:**
1. Open `/dashboard` and paste the following in the browser console — it renders
   the six marks together, using the shipped variant classes from
   `src/components/ui/mark.tsx`, at label size and again enlarged:
   ```js
   (() => {
     const B = 'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-[2px] px-2 py-[3px] type-label whitespace-nowrap';
     const K = [
       ['ink', 'border border-success-soft-border bg-success-soft text-success-soft-foreground', 'Confirmed'],
       ['tape', 'mark-torn pr-3.5 bg-warning-soft text-warning-soft-foreground', 'Pending'],
       ['strike', 'border border-destructive-soft-border bg-destructive-soft text-destructive line-through decoration-[1.5px]', 'Rejected'],
       ['erased', 'border border-transparent bg-board text-muted-foreground', 'Opted Out'],
       ['blank', 'border border-dashed border-rule text-muted-foreground', 'Unposted'],
       ['hollow', 'border-2 border-dashed border-destructive text-destructive', 'No-Show'],
     ];
     document.getElementById('mark-strip')?.remove();
     const h = document.createElement('div');
     h.id = 'mark-strip';
     h.className = 'bg-card';
     h.style = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;gap:28px;padding:28px;height:max-content;width:max-content';
     const row = () => { const r = document.createElement('div'); r.style = 'display:flex;gap:16px;align-items:center';
       K.forEach(([k, c, l]) => { const s = document.createElement('span'); s.className = `${B} ${c}`; s.dataset.mark = k; s.textContent = l; r.appendChild(s); }); return r; };
     h.appendChild(row());
     const big = document.createElement('div'); big.style = 'zoom:2.4'; big.appendChild(row()); h.appendChild(big);
     document.body.appendChild(h);
   })();
   ```
2. Screenshot the strip.
3. Remove the colour: `$('#mark-strip').style.filter = 'grayscale(1)'`, and
   screenshot again.
4. Compare the two screenshots.

**Expected result:** in the greyscale screenshot all six marks are still tellable
apart, by **form** alone:

- **Ink** — solid 1px border around a filled rectangle.
- **Tape** — filled rectangle whose right edge is three ink teeth. The teeth
  read at label size, which is the point: the prototype found a torn edge cut out
  of the *fill* nearly invisible there, so the tear is drawn **in ink** instead
  (`src/app/styles/mark-forms.css`). Provisional (Tape) versus settled (Ink)
  must be distinguishable, and this edge is what distinguishes them.
- **Strike** — bordered rectangle with a line through the label.
- **Erased** — flat, ground-coloured, **no** border.
- **Blank** — **1px** dashed outline, no fill.
- **Hollow** — **2px** dashed outline, no fill.

Blank and Hollow are never interchangeable, so the dash weight is load-bearing:
if the two are indistinguishable in greyscale the case fails.

### TC-DS-007 · P1 · Positive — Lattice rules stay visible, enamel

**Preconditions:** signed in as owner; material = enamel.

**Steps:**
1. Open `/admin` (KPI lattice), `/admin/sessions` (table rules) and `/` (the
   activities lattice below the seam).
2. Read each 1px rule against the cell it borders, including a rule bordering a
   **wash** cell (the marks' fills are the lightest cells a rule touches).

**Expected result:** every rule clears **3:1** against its cell:

| Rule against | Target | Measured |
|---|---|---|
| tile (`--rule` on `--card`) | 3 | **3.72** |
| ground (`--rule` on `--background`) | 3 | **3.28** |
| tape wash — lightest wash | 3 | **3.56** |
| strike wash | 3 | **3.42** |
| ink wash | 3 | **3.36** |

A wrapper painted the rule colour to open hairline gaps between its children
(`bg-border` with `gap-px`, as in `src/components/ui/stat-card.tsx`) is **not** a
failure: the edge a person sees there is the wrapper against the surface outside
it, which is the `--rule` on `--background` row above.

### TC-DS-008 · P1 · Positive — Lattice rules stay visible, painted board

**Preconditions:** as TC-DS-007, material = painted board.

**Expected result:** every rule clears **3:1**:

| Rule against | Target | Measured |
|---|---|---|
| tile | 3 | **3.74** |
| ground | 3 | **4.25** |
| ink wash — worst case on this material | 3 | **3.37** |
| tape wash | 3 | **3.62** |
| strike wash | 3 | **4.04** |

### TC-DS-009 · P0 · Positive — The landing action is reachable without scrolling on a phone

**Preconditions:** signed **out**; viewport 390 × 844; run once per locale and
once per material.

**Steps:**
1. Open `/`.
2. Without scrolling, find the primary action.
3. Measure the bottom edge of the action against the viewport height.

**Expected result:** the action reads `Ask to join this community` (en) /
`Minta gabung ke komunitas ini` (id) and its bottom edge lands at **415px**, well
inside the 844px viewport, in both locales and both materials. Any value above
844 fails the case.

### TC-DS-010 · P1 · Positive — The fold law holds at 1440 × 900

**Preconditions:** signed out; viewport 1440 × 900; both locales.

**Steps:**
1. Open `/`.
2. Measure the primary action's bottom edge, then the **top edge of the second
   band** (the activities band below the seam).

**Expected result:** the action's bottom edge is at **556px**, and the second
band's top edge is at **770px** — above the 900px fold, which is the law that
replaces any `min-height` on a band (`DESIGN.md`, *The fold law*). A band sized so
the next band's top edge falls below 900px fails the case. At 390 × 844 the same
edge lands at **596px** (en) / **620px** (id), which is the Indonesian copy
running longer, not a defect.

### TC-DS-011 · P0 · Positive — The landing is keyboard-reachable with a visible focus ring

**Preconditions:** signed out; `/` open; either material.

**Steps:**
1. Press `Tab` repeatedly from the top of the document.
2. Note each stop and whether it paints a visible ring.
3. On the primary action, wait for the transition to settle before judging the
   ring — the button carries `transition-all` at **150ms**, so a ring read in the
   first frames still measures transparent.

**Expected result:** the tab order is theme toggle → locale → **primary action**
→ `Already a member? Sign in` → the band's second `Ask to join` link, every stop
matching `:focus-visible`. The primary action paints a **2px Court Green Lit ring
(`--ring`) offset 2px** by a board-coloured gap, which measures **6.82:1** against
the hero's ground — comfortably past the 3:1 that a non-text indicator needs. A
stop with no visible indicator fails the case.

### TC-DS-012 · P0 · Positive — The account-creation statement is present in both locales

**Preconditions:** signed out; `/` open; run once per locale.

**Steps:**
1. Read the sentence beneath the primary action.
2. Inspect the action and check what it is described by.

**Expected result:** the sentence is present and says that signing in **creates
an account** and that an organizer decides:

- en — “Signing in with Google creates your account the first time you do it, and
  asks an organizer to let you in. They decide, and you get an email when they
  do.”
- id — “Masuk dengan Google membuatkan akunmu saat pertama kali, dan mengajukan
  permintaanmu ke pengelola. Mereka yang memutuskan, dan kamu akan dapat email
  begitu itu terjadi.”

It renders at **Body** in secondary ink — never Caption, never the muted step —
and the action carries `aria-describedby="landing-hero-disclosure"`, so a screen
reader hears the condition and not just the label. A disclosure that is absent,
smaller than Body, or untied from the control fails the case.

### TC-DS-013 · P1 · Positive — The hero band is painted board in both materials

**Preconditions:** signed out; `/` open.

**Steps:**
1. With the material set to enamel, look at the hero band and at the identity
   rail above it.
2. Switch to painted board and look again.

**Expected result:** the hero band renders **painted board in both cases** — a
logged-out stranger has set no preference, so the band does not depend on one —
while the rail above it stays themed. The rail's bottom rule is the band's top
edge (one rule, not two), and where painted board returns to enamel at the
band's bottom there is **no** rule: the material change is the boundary. A hero
that follows the theme fails the case, and so does a rule at the bottom seam.

### TC-DS-014 · P0 · Negative — The Activity colour column is gone, and nothing renders in its place

**Preconditions:** signed in as owner for the admin surfaces, Adi for the member
surfaces; either material.

**Steps:**
1. Open `/admin/activities`, `/admin/sessions`, `/admin`, `/dashboard`,
   `/sessions`, a session detail page, and `/` — every surface that once carried
   an Activity colour.
2. Look at each Activity's livery.
3. Confirm no element carries an inline `background-color` or `border-color`.
4. Send a stray colour to the API, as a stale client would:
   ```js
   await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ name: 'Colour Probe QA', slug: 'colour-probe-qa', minMembers: 2, maxPlayers: 8,
       sessionFee: 15000, monthlyFee: 50000, allowsMonthly: true, allowsPerSession: true, color: '#ff00ff' }) })
     .then(async (r) => [r.status, await r.json()]);
   ```
5. Delete the probe activity afterwards (`DELETE /api/activities/{id}` → `200`).

**Expected result:** every livery is a **magnet tile bearing the Activity's
initial** in ink — no coloured square, no edge stripe, and no broken, default or
placeholder swatch anywhere. No surface renders an inline background or border
colour. The create call returns **`201`** and the created row carries **no colour
field at all** (the column was dropped in
`prisma/migrations/20260819174507_drop_activity_color`), so a stray `color` is
silently ignored rather than stored. A swatch, an inline colour, or a `color` key
in the response fails the case.

### TC-DS-015 · P1 · Positive — No English leaks into the Indonesian build

**Preconditions:** locale = `id`; visit every surface this spec touched — `/`,
`/dashboard`, `/sessions`, a session detail page, `/payments`,
`/payments/upload`, `/profile`, `/admin`, `/admin/sessions`, `/admin/payments`,
`/admin/activities`, `/admin/members`.

**Steps:**
1. Read every visible string on each surface in `id`.
2. Compare against the same surface in `en`, and list the strings that are
   byte-identical in both.
3. For each identical string, check whether it is a dictionary entry
   (`src/lib/i18n/dictionaries.ts`) or a hardcoded literal.

**Expected result:** no user-facing string bypasses the dictionary. Strings that
are identical in both locales are only: the community name and other runtime
configuration, proper nouns (Activity names, session titles, member names,
venues, emails), numerals and Rupiah amounts, and the loanwords the Indonesian
dictionary deliberately keeps — `Dashboard`, `Status`, `Detail`, `Edit`,
`Filter`, `Slug`, `Export CSV`. Anything else identical across locales is a
hardcoded literal and fails the case. Mark labels in particular must switch:
`Unposted` → `Belum Dipasang`, `Confirmed` → `Lunas`, `Opted Out` → `Batal
Ikut`.

### TC-DS-016 · P1 · Positive — One lettering system, and tabular figures on every number that matters

**Preconditions:** both materials, both locales, across the surfaces listed in
TC-DS-015.

**Steps:**
1. On each surface, read the computed `font-family` of every text element.
2. Find every **time, count, capacity and Rupiah amount** — the day-of-month
   numeral in a session cell, `n/max` seat counts, session times, dues amounts,
   attendance percentages — and read its computed `font-variant-numeric`.

**Expected result:** exactly **one** family resolves everywhere —
`Archivo, "Archivo Fallback"` — with no serif, no second sans and no monospace
(`DESIGN.md`, *The One Hand Rule*). Every time, count, capacity and amount
carries `tabular-nums`. A phone number is none of those four and is out of scope
for this case.

### TC-DS-017 · P1 · Positive — The Inputs / Fields treatment on every shared field

**Preconditions:** both materials, both locales, 1440 × 900 and 390 × 844. Visit
a surface composing `Input` (`/onboarding`), `Textarea` (an admin Reject
dialog's reason field), and `Select` (`/admin/sessions/new`'s Activity
picker), plus a read-only field (`/payments/upload`'s server-set amount).

**Steps:**
1. At rest, read the computed background, border colour and border-radius of
   an `Input`, a `Textarea` and a `Select` trigger.
2. Tab to each field and read the computed border colour and outline/box-shadow
   ring, with its offset.
3. Submit a form with an invalid value on a field carrying `aria-invalid` and
   read its border and helper-text colour.
4. Load `ReadOnlyField` (`/payments/upload`'s amount) and read its background,
   with the field neither focused nor disabled.
5. Repeat steps 1–4 at 390 × 844.

**Expected result:** at rest, every field resolves Enamel Tile background
(`bg-tile`), a 1px Ruled Line border (`border-rule`) and a `2px` corner
(`DESIGN.md`, *Inputs / Fields*) — no rounded-pill corner, no transparent
ground, at either width or material. On focus, the border resolves Court Green
(`border-ring`) with a 2px ring offset 2px from the field edge. An
`aria-invalid` field resolves a Struck Red border, and its helper text names
the problem and the fix. `ReadOnlyField` resolves the Enamel Ground fill
(`bg-board`) with no caller class supplying it.

### 16.17 Recorded run — 2026-08-20

Executed once against the §2 seed on Next.js 16.2.6, 1440 × 900 and 390 × 844,
both materials, both locales, 14 routes plus `/`.

| Case | Result |
|---|---|
| TC-DS-001 | **Pass** — 8/8 pairs clear AA; the Quiet-Ink-on-ground constraint holds, no surface puts `--subtle-foreground` on the ground |
| TC-DS-002 | **Pass** — 9/9 pairs clear AA |
| TC-DS-003 | **Pass** — all six mark pairs clear AA |
| TC-DS-004 | **Pass** — all six mark pairs clear AA |
| TC-DS-005 | **Pass** — the hero action resolves to board ink on lit green, 6.82:1 |
| TC-DS-006 | **Pass** — six marks tellable apart in greyscale on both materials; Blank ≠ Hollow by dash weight, Tape ≠ Ink by its ink teeth |
| TC-DS-007 | **Pass** — 5/5 rules clear 3:1 |
| TC-DS-008 | **Pass** — 5/5 rules clear 3:1 |
| TC-DS-009 | **Pass** — action bottom edge 415px of 844, both locales, both materials |
| TC-DS-010 | **Pass** — action 556px, second band top 770px, inside the 900px fold |
| TC-DS-011 | **Pass** — five stops, all `:focus-visible`; the hero ring paints once its 150ms transition settles |
| TC-DS-012 | **Pass** — statement present in both locales, tied by `aria-describedby` |
| TC-DS-013 | **Pass** — hero painted in both materials; no rule at the bottom seam |
| TC-DS-014 | **Pass** — no swatch and no inline colour on any surface; `POST /api/activities` with a stray `color` → **201**, response carries no colour field; probe deleted → **200** |
| TC-DS-015 | **Pass** — no hardcoded literal found; every cross-locale match is configuration, a proper noun, a numeral, or a dictionary-authored loanword |
| TC-DS-016 | **Fail on first run, then fixed** — see below |

**Defects found and fixed in code.** TC-DS-016 failed on three surfaces: the
day-of-month numeral that anchors a session cell rendered without
`tabular-nums`, so dates jittered column-to-column as the digits changed width —
`src/app/(main)/dashboard/page.tsx`, `src/app/(main)/sessions/page.tsx` and
`src/app/(admin)/admin/page.tsx`. Fixed by giving each numeral `tabular-nums`;
the case then passed everywhere. Nothing was softened in the case.

**Documented numbers that turned out wrong.** Three ratios in `DESIGN.md` came
from the prototype and do not match the shipped tokens. The measured values are
recorded above and corrected in `DESIGN.md`:

- Quiet Ink on Enamel Ground: documented 4.20:1, measures **4.17:1**. Both fail
  AA, so the routing rule it justifies is unchanged — only the number was off.
- Chalk Ink on Court Green Lit: documented 2.29:1, measures **1.92:1**. Still
  banned; the pairing is worse than recorded, not better.
- Court Green Lit on board tile: documented 5.9:1, measures **6.00:1**.

The `board-materials.css` comments, by contrast, matched the measurement exactly
at every value (rule 3.72 / 3.28 / 3.56 enamel and 3.74 / 4.25 / 3.37 board;
Chalk Quiet 4.70 / 5.35), as did every ratio in the `mark.tsx` header.

> **Superseded in part, 2026-08-20.** `Erased` now has a live producer — the
> Slot Cell's Opted Out line on `/sessions` and on a Session's own header, added
> by #60 and measured in TC-MS-021 at **5.41** on enamel and **6.19** on the
> painted board. `Hollow` still has none. The paragraph below stands otherwise.

**Two marks ship with no producer.** `Erased` and `Hollow` have no live surface:
nothing records a No-Show yet, and the member session detail page filters
`ABSENT` rows out of the participant list, so Opted Out never reaches a mark
there. Both are covered above through the component (TC-DS-003, TC-DS-004,
TC-DS-006). When the admin spec wires up No-Show recording, TC-DS-003 and
TC-DS-004 gain a live surface for each and should name it.

---

## 17. Member surfaces (`TC-MS-*`)

Spec #29 rebuilt what a member sees: the Slot Cell and the sessions board, the
dashboard composed from the same cell, the payments history on the marks, the
Proof upload that used to dead-end on an empty select, the profile's payment
mode, the mobile rail. This area tests **what the member can see and do** on
those surfaces.

That is the line every case here is written to. "A member with no resolved
payment mode reaches the Proof upload and is given a route out" is a test. "The
uploader filters memberships by effective mode" is an implementation detail that
passes while the member is still stuck, so no case below asserts one.

Seat-holding is money-backed and transactional. Every case that claims,
withdraws or pays therefore asserts **capacity from the database**, before and
after, as numbers — not from what the screen happened to draw.

### 17.0 Conventions, surfaces and shared preconditions

This area inherits **§16.0 in full** and restates none of it: the same id /
priority / type / preconditions / numbered steps / expected-result shape, the
same P0-P1-P2 meanings, the same two board materials (enamel = `:root`, painted
board = `.dark`, both in `src/app/styles/board-materials.css`), the same theme
toggle and `NEXT_LOCALE` switches, the same two viewports (**390 × 844** and
**1440 × 900**), and the same rule that a contrast case fails when a measurement
falls **below its target**, not when it differs from the number printed here.
Ratios quoted below are §16's measured values for the same token pairs, reused
rather than recomputed.

**Surfaces in scope.** `/dashboard`, `/sessions`, `/sessions/{id}`,
`/sessions/{id}/pay`, `/payments`, `/payments/upload`, `/profile`, and the
member shell that carries them — the sticky top bar and the fixed mobile bottom
rail from `src/components/layout/member-nav.tsx`.

**Out of scope**, deliberately: every `/admin/*` surface (spec #30 owns those),
the public route `/` and onboarding (§16 and §5 own those), and No-Show, which
nothing in this product records — see TC-MS-021.

**Shared preconditions for every case in this area**, on top of §16.0's:

1. §1 prerequisites done, `npm run dev` running on `http://localhost:3000`, and
   the §2 seed freshly loaded (`npm run db:seed`).
2. The accounts are §3's, with no new fixture and no fixture invented in a case:
   - `member@xclub.local` — **Adi Pratama**. In all four seeded Activities;
     Badminton Dues **unpaid** this period, Basket / Futsal / Tennis
     **Confirmed**; Badminton mode MONTHLY.
   - `eka.saputri@xclub.local` — **Eka Saputri**. One Membership, Futsal, with
     `paymentMode = null`.
   - `yoga.saputra@xclub.local` — **Yoga Saputra**, a §3 roster member. One
     Membership, Badminton, at `PER_SESSION` (§2's `PER_SESSION_NAMES`); his
     Seats are funded by SESSION Payments, never by Dues.
   - `owner@xclub.local` — used only to Confirm or Reject, in TC-MS-017.
3. The Sessions are §4's. The three this area leans on most:
   - **Free Play (Maybe Test)** — Badminton, Saturday 10:00–12:00, `maxPlayers`
     **20**, fee **0**. Adi seeded `MAYBE` (which holds no Seat), Sari and Bima
     `REGISTERED`, Dewi `MAYBE` → `seatsHeld: 2`, `seatsFree: 18`.
   - **Futsal Friday** — Futsal, Friday 20:00–22:00, `maxPlayers` **12**, fee
     15 000. Adi plus six roster members `REGISTERED` → `seatsHeld: 7`,
     `seatsFree: 5`. Futsal's `minMembers` is **4**.
   - **Hold Lab (Per-Session Test)** — Badminton, 18:00–20:00, `maxPlayers`
     **8**, fee 25 000. Four `REGISTERED` rows as seeded, two of them on holds
     (one live, one already lapsed), so the first capacity-sensitive read drops
     it to three and an hour later to two.
4. **Capacity is read from the database, never from the screen.** The helper is
   `.claude/seat-audit.ts` in the main tree (git-ignored):

   ```bash
   npx tsx .claude/seat-audit.ts "<part of the Session title>" member@xclub.local
   ```

   It prints `seatsHeld`, `seatsFree`, `byStatus` (all four `AttendanceStatus`
   values), `mySeat` (`status` + `holdExpiresAt`) and `myPayment` (`status`,
   `amount`, `type`) for one Session. **It does not run the lazy hold sweep** —
   load the page under test once first, then run it, or a lapsed hold still
   counts here while the app has already let it go. Every "before" and "after"
   figure in a case below is that helper's output.
5. The RSVP window closes **24 hours** before a Session starts
   (`RSVP_CLOSE_HOURS_BEFORE`), and a Session that is not `SCHEDULED` or whose
   window has closed is offered no control at all. Cases needing a control
   therefore name a Session more than a day out.
6. `1rem = 16px`: the app sets no root font size, so the Slot Cell's
   `grid-cols-[5.5rem_…]` leading column is **88px** at every width.

**A note on the regression net.** §12 and §13 (member sessions, payments and
profile) and the attendance behaviour under §7 are the regression net for
everything this spec did not intend to change — capacity counting, seat release,
mode resolution, monthly against per-session billing. They are re-run, not
rewritten. One of them is stale rather than failing: **§12.2's expected wording
("grouped This week / Later", quota badges, filters) was invalidated by #57**,
which replaced that arrangement with a week read down the page. TC-MS-004 and
TC-MS-007 are the current expectation for that surface; §12.2 wants an edit from
whoever owns it, and is recorded under *Suspected defects* below rather than
softened here.

---

### 17.1 Eka — a Membership with no payment mode chosen

Sign in as **Eka** (`eka.saputri@xclub.local`). Enamel, `en`, 1440 × 900 unless
a step says otherwise.

#### TC-MS-001 · P0 · Negative — The Proof upload names the missing payment mode and gives a working route to choose one

**Preconditions:** signed in as Eka. Her only Membership is Futsal with
`paymentMode = null`; Futsal offers **both** ways to pay (`allowsMonthly` and
`allowsPerSession` are true in the §2 seed), so no mode auto-applies.

**Steps:**
1. Open `/payments`, then follow **Pay now** / the **Upload Proof** route to
   `/payments/upload`. Open `/payments/upload` directly as well.
2. Read the heading and the sentence beneath it.
3. Press the action beneath them and note where it lands.
4. In the browser console:
   `await fetch('/api/users/memberships').then(async r => [r.status, await r.json()])`
   and read the Futsal row.

**Expected result:** the screen renders **no select, no form and no empty
dropdown**. It renders, in the 40rem single-task column:

- A heading at **Display**: `You have not chosen how you pay yet` (en) /
  `Kamu belum memilih cara pembayaran` (id).
- A sentence at **Body** in Secondary Ink naming her own Activity and her own
  period: “You have not chosen how you pay for **Futsal**, so no monthly dues
  have been raised for **{Month} {Year}**. You pick monthly or per session when
  you claim a seat in a session.” A generic "your activities" fails the case.
- An action reading `Choose how you pay` / `Pilih cara pembayaran`. Because
  exactly **one** Activity is named, it links to
  `/sessions?activityId=<Futsal id>` — the sessions list already scoped to
  Futsal. A link to the bare `/sessions`, or no action at all, fails the case.
- A **Back to dues history** / **Kembali ke riwayat iuran** link above it, so
  the screen is never a cul-de-sac.

`GET /api/users/memberships` returns **200** and the Futsal row carries
`joined: true`, `allowsMonthly: true`, `effectiveMode: null` — the triple that
makes this `modeUnchosen` and not one of the other four causes. No other cause's
copy appears: `Nothing monthly to pay here` on this screen fails the case.

Following the action and opening **Futsal Friday** gives the plain `Register`
CTA with no price and the Monthly-vs-Per-session dialog (§13.6) — the route out
actually resolves the cause it named. Nothing is written by any of this: no
Payment row, no Membership change.

#### TC-MS-002 · P1 · Negative — The board withholds the claim on an Activity she has not joined

**Preconditions:** signed in as Eka; `/sessions`. She is in Futsal only, so
Badminton, Basket and Tennis are Activities she is browsing, not in.

**Steps:**
1. On `/sessions`, the view filter is **My activities** — read the board.
2. Switch the filter to **All activities** / **Semua aktivitas**.
3. Find a `SCHEDULED` Badminton row more than 24 hours out with free Seats — the
   §4 **Hold Lab (Per-Session Test)** row will do.
4. Read what the row offers, and press the row itself.

**Expected result:**

- Under **My activities** the board draws Futsal only, and still draws **all
  seven days** — the days with nothing on them take a Blank `None` / `Kosong`
  cell rather than being dropped.
- Under **All activities** the Badminton row appears with its free-Seat figure,
  and carries **no claim control at all**. Reserving joins the Activity, so a
  one-tap claim from a row that shows neither the price nor the word "join"
  would enrol her and open a bill in one tap; the offer is withheld and the row
  keeps its link instead.
- Pressing the row opens `/sessions/{id}`, where the price and the join are both
  stated. A `Claim a Seat` or `Claim & pay` control on an unjoined Activity's
  row fails the case (this is the third defect `dbc6a38` fixed, and the case
  exists to keep it fixed).
- Nothing is written: `npx tsx .claude/seat-audit.ts "Hold Lab" eka.saputri@xclub.local`
  reports `mySeat: null` and `myPayment: null` before and after.

---

### 17.2 Yoga — a Membership billed per Session only

Sign in as **Yoga Saputra** (`yoga.saputra@xclub.local`).

#### TC-MS-003 · P0 · Negative — The Proof upload tells a per-Session-only member where a Fee is actually paid

**Preconditions:** signed in as Yoga. His only Membership is Badminton at
`PER_SESSION` (§2's `PER_SESSION_NAMES`), and the seed has already funded his
Seats with **Confirmed** SESSION Payments.

**Steps:**
1. Open `/payments/upload`.
2. Read the heading, the sentence and the action.
3. Press the action and note where it lands.
4. In the console: `await fetch('/api/users/memberships').then(async r => [r.status, await r.json()])`.
5. Go back to `/payments` and read the history.

**Expected result:**

- Heading at **Display**: `Nothing monthly to pay here` /
  `Tidak ada iuran bulanan di sini`.
- Sentence at **Body** in Secondary Ink: “You are billed per session for
  **Badminton**, so there are no monthly dues for **{Month} {Year}**. A session
  fee is paid from the session itself, when you claim a seat.”
- Action `Go to sessions` / `Buka daftar sesi`, linking to
  `/sessions?activityId=<Badminton id>` because exactly one Activity is named.
- **The two causes are never confused.** `You have not chosen how you pay yet`
  appearing here fails the case, and so does the reverse in TC-MS-001: a
  confident wrong explanation is worse than none, which is the whole reason
  these two are separate P0s.
- `GET /api/users/memberships` returns **200**; the Badminton row carries
  `joined: true` and `effectiveMode: "PER_SESSION"`, and **no** row in the
  response has `effectiveMode: "MONTHLY"`.
- `/payments` still has content: his SESSION Payments render as **Ink** marks
  reading `Confirmed` / `Lunas` in the history, with `Fee` / `Biaya Sesi` and
  the Billing Period beside the amount. "Nothing monthly to pay" and "no money
  here at all" are different statements and the two screens must not agree.

---

### 17.3 Adi — the sessions board (`/sessions`)

Sign in as **Adi** (`member@xclub.local`). Enamel, `en`, 1440 × 900 unless a
step says otherwise. Run these in order: TC-MS-009 through TC-MS-011 write.

#### TC-MS-004 · P0 · Positive — Every day of the displayed week gets a cell, and the two silences read differently

**Preconditions:** Adi; `/sessions`; the default **My activities** view and the
current WIB week. Adi is in all four Activities, whose standing weekly slots are
Badminton Sunday 19:00–21:00, Basket Tuesday 19:30–21:30, Tennis Thursday
17:00–19:00, Futsal Friday 20:00–22:00 (§2 seed).

**Steps:**
1. Open `/sessions`.
2. Count the day bands from the top of the board to the bottom, and read each
   heading.
3. Find a day carrying a posted Session.
4. Find a day whose Activity has a standing weekly slot with nothing posted on
   it.
5. Find a day with neither.
6. Inspect the board's own container and the rules between cells.

**Expected result:**

- Exactly **seven** day bands, Monday-first, consecutive, none skipped — one
  `<h2>` per day reading `<Weekday> <d> <Month>` ("Monday 18 August" /
  "Senin 18 Agustus"), from the week's Monday to its Sunday. A week that renders
  six bands, or that skips a day because nothing is on it, fails the case.
- A day with a posted Session draws one Slot Cell per Session, linked to
  `/sessions/{id}`.
- A day carrying a **standing weekly slot with nothing posted** draws a Slot
  Cell whose title is the **Activity's own name**, whose `when` rail carries the
  Activity's recurring start and end times, whose standing column is a **Blank**
  mark reading `Unposted` / `Belum Dipasang`, and whose note under the venue
  reads `An Admin has not posted this session yet.` /
  `Admin belum mengumumkan sesi ini.` That row is **not** a link, takes no hover
  tint, and carries no control.
- A day with **neither** draws one cell carrying a **Blank** mark labelled
  `None` / `Kosong` beside `Nothing on this day.` /
  `Tidak ada apa pun di hari ini.` Labelling this day `Unposted` fails the case:
  one silence means an Admin owes the board a Session and the other means nobody
  was ever going to play, and telling a member the Admin is behind on a day
  nothing was planned for is a lie the board is not allowed to tell.
- The board is a **ruled lattice**, not a card list: one column of day rows,
  cells sharing 1px rules with their neighbours through `gap-px` over a
  rule-coloured ground, at 1440 **and** at 390. A missing rule, or a gap between
  floating cards, fails the case.
- No column heads, no horizontal scrolling, and
  `document.documentElement.scrollWidth === document.documentElement.clientWidth`
  at both widths.

#### TC-MS-005 · P1 · Edge — A week with no Sessions at all still draws seven ruled day rows

**Preconditions:** Adi; `/sessions`.

**Steps:**
1. Press **Next week** / `Minggu berikutnya` repeatedly until the week on screen
   carries no posted Session at all. The seed posts nothing beyond about a week
   out; recurring generation runs at month end, so step past any generated week
   in the following month rather than settling for it.
2. Read the week caption, the number of day bands, and every cell.
3. Confirm no notice strip has appeared above the board.

**Expected result:**

- The caption reads `{start} – {end}`, the far end carrying its year
  ("18 August – 24 August 2026").
- **Seven** day bands, still. Four of them carry an unposted standing-slot cell
  (Sunday Badminton, Tuesday Basket, Thursday Tennis, Friday Futsal), each with
  a **Blank** `Unposted` / `Belum Dipasang` mark and the "has not posted"
  sentence. The other three carry a **Blank** `None` / `Kosong` cell.
- **No Blank-marked notice strip above the board.** That strip answers "has this
  community ever had a Session", which is community-wide and unfiltered; the
  seed has Sessions, so a strip here would tell a member who merely paged
  forward that their community is new. TC-MS-006 is the case that earns it.
- Every rule is still drawn and the lattice never degrades into an unruled list.
- **Previous week** returns to the populated week unchanged.

#### TC-MS-006 · P1 · Edge — A community that has never had a Session keeps its board and says so

**Preconditions:** Adi. This case needs a reversible manipulation of the local
database and **must be followed immediately by `npm run db:seed`**. Never run it
against production.

**Steps:**
1. In Prisma Studio (`npm run db:studio`) or the local SQL console, delete the
   transactional tables in §15's order — `Attendance`, then `Payment`, then
   `ActivitySession` — so `ActivitySession` holds zero rows. Leave users,
   memberships, activities and settings alone.
2. Open `/sessions`.
3. Read what sits above the board, and then the board itself.
4. Run `npm run db:seed` and reload; confirm the strip is gone.

**Expected result:**

- A **Blank**-marked strip renders above the board: the mark reads `Unposted` /
  `Belum Dipasang`, and the sentence beside it reads `Sessions have not been
  posted yet. They appear here as soon as an Admin posts one.` / `Belum ada sesi
  yang diumumkan. Sesi akan muncul di sini begitu Admin mengumumkan satu.`
- **The board is not dropped.** Seven day bands still render beneath the strip,
  with unposted standing-slot cells on the four recurring weekdays and `None` /
  `Kosong` on the rest. An empty page, a dropped board, or a spinner that never
  resolves all fail the case: Blank means *expected but not yet placed*, which
  is the honest state of a community that has just been set up.
- After reseeding, the strip is gone and the board is TC-MS-004's again.

#### TC-MS-007 · P0 · Positive — The Slot Cell's three columns hold their positions at 1440 × 900 and 390 × 844

**Preconditions:** Adi; `/sessions`; a week carrying at least six rows; run at
both viewports and in both locales.

**Steps:**
1. At 1440 × 900, for **every** row of the week, read
   `getBoundingClientRect().left` of the start-time figure, `.left` of the
   Session title, and `.right` of the standing element (the mark, or the
   free-Seat figure).
2. Read the computed width of the `when` column.
3. Find a row carrying a claim or withdraw control and read the control's
   `.left`, plus whether its `<button>` is a descendant of the row's `<a>`.
4. Read `document.documentElement.scrollWidth` against `clientWidth`.
5. Repeat all of it at 390 × 844.

**Expected result:**

- The `when` rail is a fixed **5.5rem = 88px** track at both widths
  (`grid-cols-[5.5rem_minmax(0,1fr)_auto]`, root font size not overridden). It
  carries the start time as Figure with the end time as Caption beneath it and
  **nothing else** — no title, no venue, no mark, no control. On this surface it
  carries no date either: the day band above the rows owns that.
- Each of the three x-values holds **one** value down every row of the week, at
  each width. #57 recorded **388 / 486 / 1038** at 1440 × 900 and
  **27 / 125 / 333** at 390 × 844 across all eight of its rows; those are the
  reference, and the case fails on a row that differs from **its own column's**
  value, not on a difference from those figures.
- Where a row carries a control, the control sits on its **own row beneath** the
  three columns, on the same `grid-cols-[5.5rem_minmax(0,1fr)]` template, so its
  left edge equals the title's left edge to the pixel and the `when` rail stays
  a column of times beside it. In the DOM the `<button>` is a **sibling** of the
  `<a>`, never a descendant — `anchorEl.contains(buttonEl)` must be `false`.
- No cell reflows onto a second line at 390px, and
  `scrollWidth === clientWidth` on the document at both widths.
- The rows are the same three columns on both materials and in both locales; the
  Indonesian build is the binding one and is covered by TC-MS-008.

#### TC-MS-008 · P0 · Positive — The widest mark this product sets never collides with the seat figure

**Preconditions:** Adi; `/sessions`; locale **`id`** (the binding locale); run at
1440 × 900 and 390 × 844.

**Steps:**
1. Switch to Indonesian on `/profile` → Language.
2. Find a row whose standing column is the Blank mark `BELUM DIPASANG` — the
   widest mark in the product at **133.8px**, measured for #57 and kept on the
   record in `DESIGN.md`, and also the commonest, because every standing slot an
   Admin has not posted carries one.
3. Read that mark's bounding box against its cell's content box, and against the
   rows above and below.
4. Find a row whose standing column is the free-Seat figure `n/max` and read its
   right edge.
5. Read `markEl.scrollWidth` against `markEl.clientWidth`.
6. Repeat at 390 × 844.

**Expected result:**

- **#57's resolution is that the collision is dissolved, not paid for.** The
  week reads down the page as one column of ruled day rows at every width, so a
  mark and a seat figure are never inside the same fixed-width cell and never
  compete for the same 200px, whatever an Activity is named and whatever
  language it is read in. There is no `12.5rem` column floor, no horizontally
  scrolling rail and no `88rem` board measure on this surface — all three went
  with the seven-column lattice. Finding any of them fails the case.
- The `BELUM DIPASANG` mark does **not** wrap:
  `markEl.scrollWidth === markEl.clientWidth`, and its own height is one line.
- The mark's **right edge never crosses its cell's content box**: it is at or
  inside the cell's padding-box right minus the `10px` cell padding, at 390 and
  at 1440.
- The mark's right edge is the **same** value as the free-Seat figure's right
  edge on every other row — the shared standing edge TC-MS-007 records for
  column three. A mark that sits 6px past its cell's right edge, as the lattice
  did at an `11rem` floor, fails the case.
- No horizontal page overflow at either width.

#### TC-MS-009 · P0 · Positive — Claim a Seat from the row you are reading, and the capacity moves by exactly one

**Preconditions:** Adi; `/sessions`, on the week carrying **Free Play (Maybe
Test)** (Badminton, Saturday 10:00–12:00, `maxPlayers` **20**, fee **0**). Adi is
seeded `MAYBE` there, which holds no Seat. The Session is more than 24 hours out.

**Steps:**
1. Load `/sessions` once, so the lazy hold sweep has run, then read the truth
   from the database:
   `npx tsx .claude/seat-audit.ts "Free Play" member@xclub.local`.
   Record `seatsHeld`, `seatsFree`, `byStatus` and `mySeat`.
2. On the Free Play row, read the standing column and the control's label and
   accessible name.
3. Press the control. Watch the network tab.
4. Re-run the helper with the same arguments.

**Expected result:**

- **Before:** the standing column is a **Tape** mark reading `Maybe` /
  `Mungkin` — the reader's own tentative RSVP outranks the seat figure. The
  helper reports `seatsHeld: 2`, `seatsFree: 18`,
  `mySeat: { "status": "MAYBE", "holdExpiresAt": null }`, `byStatus.MAYBE: 2`,
  `myPayment: null`.
- The control reads `Claim a Seat` / `Ambil kursi` — **not** `Claim & pay`,
  because this Session's fee is 0 — and its accessible name is
  `Claim a Seat in Free Play (Maybe Test)` /
  `Ambil kursi di Free Play (Maybe Test)`, so a screen reader hears which
  Session the control belongs to.
- On pressing it, `POST /api/sessions/{id}/reserve` returns **201** with
  `{"payUrl": null}`, a toast reads `Seat claimed.` / `Kursi diambil.`, and the
  row re-renders **in place** — no navigation, because there is no bill.
- **After, on the row:** the standing column is an **Ink** mark reading
  `Registered` / `Terdaftar`, and the control has flipped to `Withdraw` /
  `Batal ikut`. The three columns have not moved (TC-MS-007's values still hold).
- **After, in the database** — this is the assertion, not the screen:
  `seatsHeld: 3`, `seatsFree: 17` — exactly one higher and one lower;
  `mySeat: { "status": "REGISTERED", "holdExpiresAt": null }` — a free Seat is
  permanent and is **never** held on a payment hold; `byStatus.MAYBE: 1`; and
  `myPayment: null`, because a fee-0 Session raises no Payment. A `holdExpiresAt`
  with a value here fails the case.

#### TC-MS-010 · P0 · Positive — Withdraw from the row; the Seat comes back and the row says Opted Out

**Preconditions:** Adi; `/sessions`, on the week carrying **Futsal Friday**
(Futsal, Friday 20:00–22:00, `maxPlayers` **12**, fee 15 000; use **Next week**
if it is not on the current board). Adi holds a Seat there and his Futsal Dues
for this period are **Confirmed** — which is exactly what makes the release a
forfeit rather than a deletion.

**Steps:**
1. Load `/sessions`, then
   `npx tsx .claude/seat-audit.ts "Futsal Friday" member@xclub.local`.
2. Read the row: standing column, the note under the venue, the control.
3. Press the control and read the toast.
4. Re-run the helper.
5. Reload `/sessions` and read the row again.

**Expected result:**

- **Before:** standing is an **Ink** mark reading `Registered` / `Terdaftar`.
  The note under the venue is the quota — an **Ink** mark reading `Quota met` /
  `Kuota terpenuhi` with `(7/4)` in tabular figures, Futsal's `minMembers` being
  4. The control reads `Withdraw` / `Batal ikut`, accessible name
  `Withdraw from Futsal Friday` / `Batal ikut Futsal Friday`. Helper:
  `seatsHeld: 7`, `seatsFree: 5`,
  `mySeat: { "status": "REGISTERED", "holdExpiresAt": null }`, `myPayment: null`.
- `DELETE /api/sessions/{id}/attendance` returns **200** with
  `{"success": true, "isForfeited": true}`, and the toast is the **forfeit**
  sentence, not the plain one: `Seat released. Your Dues cover the month, not
  this Session, so nothing is refunded.` / `Kursi dilepas. Iuranmu menanggung
  satu bulan, bukan sesi ini, jadi tidak ada pengembalian dana.` The plain
  `Seat released — somebody else can take it now.` here fails the case: Dues
  were paid, and leaving a member to expect money back is the thing this copy
  exists to prevent.
- **After, on the row:** the standing column is the free-Seat figure again —
  `Free` / `Sisa` over **6/12** in tabular figures, with the spoken form
  `6 of 12 seats free` / `6 dari 12 kursi tersisa` for a screen reader. It is
  **not** a mark: the member released that Seat, so the free-Seat figure is the
  fact they now need.
- Their withdrawal is said on the **Session's own line** instead: an **Erased**
  mark reading `Opted Out` / `Batal Ikut` beside `You released this Seat.` /
  `Kamu melepas kursi ini.`, in the note position under the venue, where it
  outranks the quota. The word **Absent** appearing anywhere on this row fails
  the case — the stored `ABSENT` is Opted Out to a member, always
  (`CONTEXT.md`).
- The control reads `Claim a Seat` / `Ambil kursi` again: a released Seat may be
  reclaimed.
- **After, in the database:** `seatsHeld: 6`, `seatsFree: 6`,
  `mySeat: { "status": "ABSENT", "holdExpiresAt": null }`, `byStatus.ABSENT: 1`.
  The row is **kept** as ABSENT rather than deleted — ABSENT holds no Seat, and
  the row is what stops the monthly attendance sync silently re-registering him
  on the next page load. A deleted row here fails the case.

#### TC-MS-011 · P0 · Positive — The board and the claim-a-Seat flow are reachable and operable from the keyboard

**Preconditions:** Adi; `/sessions`; either material; **Free Play (Maybe Test)**
on screen, with Adi holding the Seat TC-MS-009 claimed.

**Steps:**
1. From the top of the document, press `Tab` repeatedly and note every stop, in
   order, and whether each paints a visible ring.
2. Count the stops within one Slot Cell that has a control, one that has none,
   and one unposted cell.
3. Tab to the Free Play row's control and press `Enter`.
4. Run `npx tsx .claude/seat-audit.ts "Free Play" member@xclub.local`.
5. Tab back to the same control — now `Claim a Seat` — and press `Enter`.
6. Re-run the helper.

**Expected result:**

- Tab order is document order and matches reading order: the shell's controls,
  then the board's filters, then the week nav (`Previous week`, `This week`,
  `Next week`), then the board itself top to bottom, day band by day band.
- **Two** stops per posted cell that carries a control — the row anchor first,
  then its control — **one** stop for a posted cell with no control, and
  **zero** for an unposted standing slot or an empty day, which are not links.
  A control that cannot be reached, or one reached before the row it belongs to,
  fails the case.
- Every stop paints a visible `:focus-visible` indicator. The row anchor's ring
  is drawn **2px inside** the cell edge rather than offset outside it (an offset
  ring would be clipped by the lattice's own `overflow-hidden`) and is Court
  Green `--ring`, measuring **6.98:1** against the enamel tile and **6.00:1**
  against the painted-board tile — both far past the 3:1 a non-text indicator
  needs. The control carries the shared button ring. A stop with no visible
  indicator fails the case.
- `Enter` on the control does exactly what a press does. Releasing:
  `DELETE …/attendance` → **200**, `{"isForfeited": false}` (Adi's Badminton
  Dues are unpaid, so nothing covered this Session), toast `Seat released —
  somebody else can take it now.` / `Kursi dilepas — anggota lain bisa
  mengambilnya sekarang.` Helper after: `seatsHeld: 2`, `seatsFree: 18`,
  `mySeat: null` — the row is **deleted**, not kept, because no Dues covered it.
- Claiming again: `POST …/reserve` → **201**, `{"payUrl": null}`, toast `Seat
  claimed.`, helper `seatsHeld: 3`, `seatsFree: 17`,
  `mySeat: { "status": "REGISTERED", "holdExpiresAt": null }`.
- Focus is not lost to the top of the document after either write: the refresh
  re-renders the row without a navigation.

---

### 17.4 Adi — the dashboard (`/dashboard`)

#### TC-MS-012 · P1 · Positive — The dashboard draws every day of its own range, each cell carrying its own date

**Preconditions:** Adi; `/dashboard`; enamel; `en`; both viewports. The
dashboard's range is **today through the sixth day after it** — seven days, per
Activity.

**Steps:**
1. Open `/dashboard`.
2. For one Activity card, count the day cells and read the Figure Lead numeral
   and the short weekday label at the head of each.
3. Compare a Session row here against the same Session's row on `/sessions`.
4. Find a day in the range with nothing posted and nothing planned.
5. At 390 × 844, read the three summary tiles' labels in **`id`** and check each
   for clipping (`el.scrollWidth === el.clientWidth`).

**Expected result:**

- Each Activity card carries **at least seven** cells and skips no day: the day
  figures are seven consecutive calendar days beginning with today, and a day
  carrying two Sessions of one Activity contributes two cells rather than
  replacing one.
- Every cell carries its **own** date in the `when` rail — the short weekday as
  Label (`Sun`…`Sat` / `Min`…`Sab`) above the day-of-month as **Figure Lead** —
  because there is no day band above these rows to carry it. That is the one
  deliberate difference from the sessions board's cells; the three columns are
  otherwise identical, and a Session's title, venue, livery and standing read
  the same in both places.
- A day with neither a posted Session nor a standing slot takes a **Blank** mark
  labelled `None` / `Kosong` beside `Nothing on this day.` /
  `Tidak ada apa pun di hari ini.`, and still carries its date figure.
- Cells share 1px rules through `gap-px` over a rule-coloured ground; the
  dashboard's small boards are ruled lattices, not card lists, at both widths.
- At 390 × 844 in `id`, the three summary tiles stack one per row (below 640px)
  and none of the tracked-caps labels clips: `KEHADIRAN` **103px**,
  `MENDATANG` **109px**, `IURAN` **55px** as #59 recorded, each with
  `scrollWidth === clientWidth`. `KEHADIRA` or `MENDATAN` cut mid-word fails the
  case.

#### TC-MS-013 · P1 · Positive — The dashboard's cells carry no claim control, and its money mark comes from the resolver

**Preconditions:** Adi; `/dashboard`; run once per material.

**Steps:**
1. Read each Activity card's header: livery tile, name, and the mark hard right.
2. Read the Badminton card's mark, then the Basket, Futsal and Tennis cards'.
3. Look for any claim or withdraw control inside a day cell.
4. Press the Badminton header mark.

**Expected result:**

- Badminton, whose Dues are unpaid this period, carries a **Blank** mark reading
  `Pending` / `Pending` — Dues nobody has placed yet — and it is
  a link to `/payments/upload`.
- Basket, Futsal and Tennis, whose Dues are **Confirmed**, each carry an **Ink**
  mark reading `Confirmed` / `Lunas`, from the mark resolver and not from a
  surface-local colour.
- **No day cell on this surface carries a claim or withdraw control.** The
  dashboard composes the Slot Cell without opting into the action, which is
  exactly what the cell's optional `action` field is for; the claim lives on the
  sessions board and on the Session's own page. A control here is not a bug
  found — it is a change to a decided contract, and fails the case.
- Every cell is still a link to its Session, and the row-wide tap target works.
- No state on this surface is carried by colour alone: each mark's form (filled
  rectangle with a solid border for Ink, 1px dashed outline with no fill for
  Blank) identifies it with the colour removed.

---

### 17.5 Adi — a Session's own page (`/sessions/{id}`)

#### TC-MS-014 · P0 · Positive — The detail header is the same Slot Cell, and the page says one date

**Preconditions:** Adi; open **Hold Lab (Per-Session Test)** from the board; run
at both viewports.

**Steps:**
1. Read the header block at the top of the page: the `when` rail, the title, the
   standing column, the venue and livery line.
2. Read the facts card immediately beneath it.
3. Compare the date the header shows with the date the facts card shows.
4. Compare the header against the same Session's row on `/sessions`.

**Expected result:**

- The header is the **Slot Cell**, not a second arrangement: the same three
  columns in the same fixed positions, the same livery (a magnet tile bearing
  the Activity's initial, no colour, no swatch), the same standing precedence,
  the same marks. Two differences only, both deliberate: the `when` rail carries
  the **date** (full weekday as Label above the day-of-month as Figure Lead),
  because there is no day band here to carry it; and the cell is **not** a link
  and carries **no** control, because the member is already on this Session and
  the RSVP card below owns the claim.
- **The page says one date.** The header's weekday and day-of-month and the
  facts card's `<Weekday>, <d> <Month>` name the **same** calendar day. A header
  reading `SUNDAY 23` above a facts card reading `Monday, 24 August` fails the
  case — that was the second defect `dbc6a38` fixed, caused by the facts card
  formatting the same instant through the machine's zone, and this case exists
  to keep it fixed.
- The facts card repeats none of the header's facts: it carries the full date,
  the duration, the map link, the **Fee** and the Admin's notes, and never the
  times, the venue or the quota a second time.
- The participants list draws each Participant's standing through the mark
  resolver — `Registered` / `Terdaftar` as Ink, `Maybe` / `Mungkin` as Tape —
  with Adi's own row suffixed `(you)` / `(Kamu)`.

#### TC-MS-015 · P0 · Positive — Reserving a paid Seat holds it on money not yet sent, and capacity moves at once

**Preconditions:** Adi; **Hold Lab (Per-Session Test)** (Badminton, 18:00–20:00,
`maxPlayers` **8**, fee 25 000), more than 24 hours out. Adi's Badminton mode is
MONTHLY and this period's Dues are **unpaid**, so the Seat is claimed against
the Dues bill. The hold duration is the `holdDurationMinutes` setting, **60**
minutes in the seed.

**Steps:**
1. Load `/sessions/{holdLabId}` once so the sweep runs, then
   `npx tsx .claude/seat-audit.ts "Hold Lab" member@xclub.local` and record
   every field.
2. Read the RSVP card's CTA.
3. Press it and note where it lands.
4. Re-run the helper **without** loading another page first, then again after
   loading `/payments`.
5. Go back to `/sessions/{holdLabId}` and to `/sessions`, and read both.

**Expected result:**

- **Before:** the helper reports `mySeat: null` and `myPayment: null`. The seed
  gives Hold Lab four `REGISTERED` rows, two of them on holds — one lapsed
  before the anchor and one an hour after it — so after the first sweep
  `seatsHeld` is **3** (`seatsFree: 5`), and **2** (`seatsFree: 6`) once the
  live hold has also lapsed. Record whichever it is; the assertion below is a
  delta, not an absolute.
- The CTA reads `Register & pay` / the Indonesian equivalent followed by
  `· Rp 75.000` in tabular figures — the **monthly** fee, because Adi is billed
  monthly for Badminton and that is the bill behind this Seat. A per-Session
  price here would be the wrong bill.
- Pressing it: `POST /api/sessions/{id}/reserve` returns **201** with
  `{"payUrl": "/payments/upload"}` and the browser is taken straight there —
  claiming and paying are one flow, and the Seat is never held outside the hold
  window because the same response does both.
- **After, in the database:** `seatsHeld` is exactly **one higher** and
  `seatsFree` exactly one lower than the before figures;
  `mySeat.status === "REGISTERED"`; `mySeat.holdExpiresAt` is non-null and is
  **60 minutes** after the reservation instant; and `myPayment` is still
  `null` — the Seat is held on money that has not been sent yet, which is what
  makes it provisional.
- Back on `/sessions/{holdLabId}`: the RSVP card shows the countdown `Reserved ·
  pay within MM:SS` above a `Pay monthly first · Rp 75.000` button and a cancel
  control. On `/payments`, the Badminton dues card carries the same deadline as
  a countdown beside its **Blank** `Pending` mark.
- **Known gap, recorded rather than asserted as a pass:** on the `/sessions`
  board the Hold Lab row now offers `Withdraw` and says nothing about the
  deadline — the board's read carries no `holdExpiresAt`. #60 judged a third
  action kind out of scope and recorded it. The case records it here too; it is
  not softened into an expectation, and it is listed under *Suspected defects*.

---

### 17.6 Adi, then the owner — Monthly Dues (`/payments`, `/payments/upload`)

Run TC-MS-016 and TC-MS-017 in order: the second reviews what the first
submitted.

#### TC-MS-016 · P0 · Positive — Upload Proof and leave it pending: Tape everywhere, and a month of Seats made permanent

**Preconditions:** Adi; TC-MS-015 has run, so a Badminton Seat is held on a live
hold. Any JPEG/PNG/WebP under 5MB will do as the Proof image.

**Steps:**
1. Before uploading, record the Badminton picture:
   `npx tsx .claude/seat-audit.ts "Hold Lab" member@xclub.local` and
   `npx tsx .claude/seat-audit.ts "Weekly Rally" member@xclub.local`.
2. Open `/payments/upload`. Read the Activity select, the two locked fields and
   the bank details.
3. Attach the image and press `Submit for review` / `Kirim untuk ditinjau`.
4. Read the toast and where it lands.
5. Read `/payments`: the dues card, the banner, and the history's newest row.
6. Read `/dashboard`: the Badminton card's mark.
7. Re-run both helper calls from step 1.

**Expected result:**

- The uploader renders the **form**, not an explanation: Adi has a monthly
  Activity, so `resolveProofUploadCase` returns `monthly`. Badminton is offered
  in the select; **Period** and **Amount** are read-only (TC-MS-018 covers their
  treatment); the bank details for Badminton are shown beside the upload.
- `POST /api/payments/upload` returns **201**. A toast confirms, and the browser
  returns to `/payments`.
- **On every surface the state is Tape, and only Tape.** `/payments`: the
  Badminton dues card carries a **Tape** mark reading `In review` / `Ditinjau`,
  the unpaid banner is **gone**, and the newest history row carries a **Tape**
  mark reading `In review` / `Ditinjau` with `Dues · {Month} {Year}` /
  `Iuran · {Month} {Year}` above the amount. `/dashboard` and `/profile`: the
  Badminton mark is `In review` / `Ditinjau` too, no longer the Blank
  Blank `Pending`. **The two states never borrow each other's word.** `In review`
  means a Proof was sent and an Admin has not looked at it; `Pending` means
  nothing has been sent. A surface saying `In review` before a Proof exists, or
  `Pending` after one does, fails the case — and every surface but the dues card
  said `Pending` for both until the run of 2026-08-20.
  A card still reading `Unpaid` after a Proof was sent fails the case — the
  member has acted.
- The Tape mark's form survives colour removal: a filled rectangle whose right
  edge is three ink teeth (`mark-torn`, a 6px `::after` band clipped by the
  sawtooth path), which is what tells it from Ink at label size.
- **Capacity, from the database.** Paying a month buys availability for the
  month, so the upload does two things to Seats, and both are asserted:
  - On **Hold Lab**: `mySeat.holdExpiresAt` is now `null` — the Seat is
    permanent, the sweep can no longer take it — while `mySeat.status` stays
    `"REGISTERED"` and `seatsHeld` is **unchanged**.
  - On every other `SCHEDULED`/`ONGOING` paid Badminton Session in this calendar
    month that had room, Adi is now `REGISTERED` where he was not: on **Weekly
    Rally Night** `mySeat` was already `REGISTERED` and stays so, and any paid
    Badminton Session of the month he held no row in gains one, each lifting
    that Session's `seatsHeld` by exactly one. **Full Court Challenge** gains
    nothing — `seatsHeld: 6`, `seatsFree: 0` before and after — because the sync
    respects capacity. Record `seatsHeld` for each Badminton Session before and
    after; a Session whose `seatsHeld` rose by more than one, or which went over
    `maxPlayers`, fails the case.

#### TC-MS-017 · P0 · Positive — The owner Rejects the Proof: Strike, a named reason, a way back, and the Seats released

**Preconditions:** TC-MS-016 has run and left one PENDING Badminton MONTHLY
Payment. Sign in as `owner@xclub.local` for steps 1–2, then back as Adi.

Adi also holds three *historical* Attendance rows on Badminton Sessions dated
inside that same calendar month — one `PRESENT`, one `ABSENT` (Opted Out) and
one `NO_SHOW`, the last recorded by an Admin from that Session's own attendance
register (`/admin/sessions/{id}/attendance`, saved through
`POST /api/sessions/{id}/attendance/bulk`) — the Session edit form has carried no
attendance control since #67. Record their `Attendance.id` values before step 2;
the case asserts on them in step 7.

**Steps:**
1. As owner, open `/admin/payments`, filter Status = Pending, find Adi's
   Badminton row.
2. Press **Reject**, type the reason `wrong amount`, and confirm. Note the HTTP
   status.
3. Sign back in as Adi and open `/payments`, then
   `/payments?historyStatus=REJECTED`.
4. Read the rejected row: mark, amount, reason, and what follows it.
5. Read the Badminton dues card and the `/dashboard` Badminton mark.
6. Re-run the helper calls from TC-MS-016 step 1.
7. Re-read the three precondition Attendance rows by `Attendance.id`, straight
   from the database.

**Expected result:**

- `PATCH /api/payments/{id}` returns **200**. Rejecting an already-reviewed
  Payment would return **409**; rejecting with an empty reason is refused in the
  dialog with a message, and by the route with a **400** (`TC-AR-025`).
- The member's history row carries a **Strike** mark reading `Rejected` /
  `Ditolak` — a bordered rectangle with a real line through the label — and the
  **amount beside it is dimmed to Secondary Ink, not struck**: the mark carries
  the line, a second line through the value reads as damage to the row.
- Beneath it, in Secondary Ink and not in a surface-local status colour: the
  reason (`Reject reason: wrong amount` / the Indonesian equivalent), the refund
  guidance, and a WhatsApp link to the Admin. A rejected row with no reason, or
  with the reason in red, fails the case.
- The Badminton dues card is a **Blank** `Pending` mark again and
  is a link to `/payments/upload` — a rejected Proof leaves the member with
  something to do, and the way to do it. On `/dashboard` the Badminton card's
  mark is `Rejected` / `Ditolak`, still a link to the uploader.
- **Capacity, from the database.** Rejecting the Dues releases every Seat that
  Payment was holding this period: every `REGISTERED` row of Adi's across
  Badminton's Sessions in that calendar month is deleted, so each of those
  Sessions' `seatsHeld` **falls by exactly one**. It does not necessarily return
  to its TC-MS-016 "before" figure: where Adi already held an unfunded row on a
  Session before the upload, the upload added nothing there and the Reject still
  takes one away. *Falls by exactly one* is the rule that holds everywhere.
  `PRESENT`, `ABSENT` and `NO_SHOW` rows are untouched — a
  completed Session's history is never rewritten, and a No-Show is history in
  exactly the way the other two are. Assert this on **Hold Lab** and on
  **Weekly Rally Night**: `mySeat` is `null` on both afterwards.
- **History survives the Reject, from the database.** Re-read the three
  precondition rows by `Attendance.id`. All three still exist and all three
  still carry their original status — `PRESENT`, `ABSENT` and `NO_SHOW`. A
  missing `NO_SHOW` row, or one whose status changed, fails the case: the
  cleanup deletes on `status: 'REGISTERED'` and nothing else, and No-Show is
  preserved by that construction rather than by a rule of its own
  (`docs/adr/0001-no-show-attendance-value.md`).

#### TC-MS-018 · P0 · Positive — Money display: a column of amounts aligns, and a server-set amount is visibly not the member's to edit

**Preconditions:** Adi; run at both viewports and on both materials. The seed
plus TC-MS-016/017 give the history at least five rows with three different
Payment states.

**Steps:**
1. Open `/payments`. On the history, read every amount's
   `getBoundingClientRect().right` and its computed `font-variant-numeric`.
2. Read the amount format itself, and the label above it.
3. Open `/payments/upload`. Inspect the **Period** and **Amount** fields:
   computed `background-color`, the `readOnly` attribute, the lock affordance,
   the note beneath, and what the note is tied to.
4. Reserve a per-Session Seat and open `/sessions/{id}/pay`; inspect its
   **Amount** field the same way. (Use Hold Lab after switching Badminton to
   Per session, or simply open the pay page for an outstanding reservation from
   `/payments`.)
5. Try to type into every read-only field.

**Expected result:**

- Every amount in the history column carries `font-variant-numeric:
  tabular-nums` and every amount's **right edge is the same value** — #58
  recorded **1271.5** at 1440 × 900 and **342** at 390 × 844 across five rows.
  The case fails on two rows whose right edges differ by more than 0.5px, not on
  a difference from those figures.
- Amounts render as whole Rupiah with `id-ID` grouping and no subunits —
  `Rp 75.000`, `Rp 25.000` — **in both locales**, because a Rupiah amount is a
  Rupiah amount in English too. A `Rp 75,000` in the English build fails the
  case.
- Above each amount, in tracked caps, is which of Dues or a Fee it settles and
  which Billing Period, **with the year**: `Dues · August 2026` /
  `Iuran · Agustus 2026`, `Fee · August 2026` / `Biaya Sesi · Agustus 2026`. The
  stored `MONTHLY` / `SESSION` enum never appears to a member.
- On `/payments/upload`, **Period** and **Amount** are `readOnly`, take the
  **ground** fill (`--board`: `#E8EBEA` on enamel, `#1B2621` on painted board)
  rather than the tile fill of an editable field, carry a lock glyph, and each
  carries a note naming who set them — `The current period, set by the calendar`
  / `Periode berjalan, mengikuti kalender` and `Set by this activity's monthly
  fee` / `Ditetapkan dari iuran bulanan aktivitas ini` — tied to the input by
  `aria-describedby`, so a screen-reader user hears why the field will not
  accept typing. The **Amount** additionally takes the tabular Figure role.
  Typing changes nothing in either field.
- On `/sessions/{id}/pay`, the Amount field is `readOnly` and tabular, and its
  note reads `Set by this session's fee` / `Ditetapkan dari biaya sesi ini`
  (OBS-06). See *Suspected defects* — this field is expected to diverge from the
  treatment above on at least the lock glyph, and on the painted board possibly
  on the fill as well.
- The read-only state is carried by **form and words** — ground fill, lock,
  note — never by colour alone.

---

### 17.7 Adi — the mobile bottom navigation rail

#### TC-MS-019 · P0 · Positive — The rail's cells are equal, reachable, and the active one is a filled tile

**Preconditions:** Adi; viewport **390 × 844**; run once per material and once
per locale.

**Steps:**
1. Open `/dashboard`. The rail is `md:hidden`, so confirm it is present below
   768px and **absent** at 1440 × 900, where the top bar carries the nav
   instead.
2. Read each cell's computed width and the rules between them.
3. Tap each cell in turn and confirm the destination.
4. Read the active cell's background, its label colour and its `aria-current`.
5. Tab to each cell and read the focus indicator.
6. Read the labels in `id` and check each for clipping.

**Expected result:**

- The rail is a **fixed, full-bleed row of equal cells divided by 1px rules**,
  with a 1px rule along its top edge and no gaps — never floating pills. #53
  recorded **four cells at 97.75px each** in a 390px viewport and a rail
  **63px** tall; the assertion is that the four widths are **equal to within
  1px of each other**, which is what the `min-w-0` fix restored after they
  measured 95.2px to 100.4px.
- Four cells: `Dashboard` / `Dashboard` → `/dashboard`, `Sessions` / `Sesi` →
  `/sessions`, `Payments` / `Iuran` → `/payments`, `My Profile` / `Profil Saya`
  → `/profile`. Each is a real link, each reaches its surface in one tap, and
  each is at least 44px tall (`min-h-14`).
- The **active** cell is a filled Court Green identity tile —
  `--primary-solid` ground carrying `--primary-solid-foreground` ink — and
  carries `aria-current="page"`. Form, not colour alone, is what marks it: the
  filled rectangle is visible with the colour removed.
- Contrast, reusing §16's measured values for the same token pairs — every pair
  clears its target on **both** materials:

  | Pair | Tokens | Target | Measured (enamel / painted board) |
  |---|---|---|---|
  | active cell label | `--primary-solid-foreground` on `--primary-solid` | 4.5 | **6.98** / **6.82** |
  | inactive cell label | `--secondary-foreground` on `--tile` | 4.5 | **6.13** / **5.45** |
  | the rail's top rule and its dividers | `--rule` on `--tile` | 3 | **3.72** / **3.74** |
  | focus ring, inactive cell | `--ring` on `--tile` | 3 | **6.98** / **6.00** |
  | focus ring, active cell | `--primary-solid-foreground` on `--primary-solid` | 3 | **6.98** / **6.82** |

- In `id` no label clips: `scrollWidth === clientWidth` on each, which is what
  the short forms `Sesi` and `Iuran` exist for.

#### TC-MS-020 · P0 · Negative — The rail does not obscure the primary action on a short screen

**Preconditions:** Adi; viewport **390 × 640** — deliberately shorter than 844,
because a rail that clears the action on a tall phone can still sit on it on a
short one.

**Steps:**
1. Open `/dashboard` and scroll to the bottom.
2. Read the rail's `getBoundingClientRect().top` and the bottom edge of the last
   interactive element in `<main>`.
3. Read the computed `padding-bottom` of `<main>`.
4. Repeat on `/payments`, on `/payments/upload` (whose primary action is
   `Submit for review`), and on `/sessions/{id}` (whose primary action is the
   RSVP CTA).
5. Confirm the last action can be pressed without the rail intercepting the tap.

**Expected result:**

- **On every surface, the primary action's bottom edge sits above the rail's top
  edge.** #53 recorded the rail at **577–640** in a 390 × 640 viewport, **63px**
  tall, with the last action's bottom edge at **527** — 50px of clearance. The
  case fails on any surface where `action.bottom > rail.top`, whatever the
  figures.
- The clearance is reserved once, by the layout, not per page: `<main>` carries
  `padding-bottom` of **96px** (`pb-24`) below 768px and **24px** (`md:pb-6`)
  above it, so no surface has to remember. A page that reserves its own
  clearance instead is a second answer to one question and should be reported.

---

### 17.8 Adi — the marks in both board materials

#### TC-MS-021 · P0 · Positive — Every mark a member can reach, on every member surface that shows state, in both materials

**Preconditions:** Adi; run the whole case **twice**, once per material, at
1440 × 900. TC-MS-009, TC-MS-010, TC-MS-016 and TC-MS-017 have run, so the
Tape, Strike and Erased producers are live rather than stubbed.

**Steps:**
1. Visit each surface below and find every mark on it.
2. For each mark, read its label, its `data-mark` attribute, and the contrast of
   its label against the wash it sits on.
3. Switch material and repeat.
4. On one surface, apply `filter: grayscale(1)` to the page and confirm each
   mark is still tellable apart by form alone.

**Expected result:** five of the six marks have a live producer on a member
surface, and each is drawn through the one resolver — no surface picks its own
mark or its own status colour:

| Mark | Where a member reaches it | Label (en / id) |
|---|---|---|
| **Ink** | `/sessions` standing column on a Seat held (TC-MS-009); `/payments` dues card and history on a Confirmed Payment; `/dashboard` Activity mark on Confirmed Dues; `/sessions/{id}` participants list; `/sessions` quota line when met | `Registered` / `Terdaftar`, `Confirmed` / `Lunas`, `Quota met` / `Kuota terpenuhi` |
| **Tape** | `/sessions` standing column on a `MAYBE` row; `/payments` dues card and history on a Payment awaiting review; `/payments` outstanding-reservation row; `/dashboard` and `/profile` Activity mark; `/sessions` quota line when short | `Maybe` / `Mungkin`, `In review` / `Ditinjau`, `Needs {n} more` / `Butuh {n} lagi` |
| **Strike** | `/sessions` standing column on **Rained Out (Cancelled)**; `/payments` history on a Rejected Payment (TC-MS-017) | `Cancelled` / `Dibatalkan`, `Rejected` / `Ditolak` |
| **Erased** | `/sessions` and `/sessions/{id}` note line after a withdrawal that forfeited Dues (TC-MS-010) | `Opted Out` / `Batal Ikut` |
| **Blank** | `/sessions` unposted standing slot and empty day; `/sessions` standing column on **Full Court Challenge**; `/payments` dues card when unpaid; `/dashboard` Activity mark when no Payment exists; `/profile` Membership row for an unpaid period | `Unposted` / `Belum Dipasang`, `None` / `Kosong`, `Full` / `Penuh`, `Pending` (both locales — the loanword the Indonesian dictionary already keeps) |
| **Hollow** | Producer is an Admin-recorded `NO_SHOW` attendance value (#64, PR #75); the reader's own No-Show draws Hollow in the Slot Cell standing column (#78) | `No-Show` / `Tidak Hadir` |

- Every mark clears **4.5:1** against the wash it sits on, in both materials —
  the same pairs §16 measured: Ink **6.31** / **5.40**, Tape **5.36** / **6.20**,
  Strike **5.97** / **5.45**, Erased **5.41** / **6.19**, Blank **5.41** /
  **5.45** worst case, Hollow **5.73** / **5.04** worst case.
- In greyscale the five live marks are still tellable apart by **form**: Ink a
  solid 1px border around a filled rectangle; Tape a filled rectangle whose
  right edge is three ink teeth; Strike a bordered rectangle with a real line
  through the label; Erased flat, ground-coloured, with **no** border; Blank a
  **1px** dashed outline with no fill. Hollow's **2px** dashed outline is only
  reachable through the component strip in TC-DS-006, and Blank and Hollow are
  never interchangeable, so that dash weight stays load-bearing.
- **Erased now has a live surface**, which §16.17 recorded as not existing: the
  Slot Cell's Opted Out line produces it on `/sessions` and on the Session's own
  header. Hollow still has none. Whoever next edits §16.17 should say so.
- No mark label is ever the stored enum: `Absent` must not appear anywhere on a
  member surface.

---

### 17.9 Adi — the Indonesian build

#### TC-MS-022 · P1 · Positive — No English leaks into any member surface

**Preconditions:** Adi; locale `id`, set on `/profile` → Language or by setting
the `NEXT_LOCALE` cookie; visit `/dashboard`, `/sessions`, a Session's page,
`/sessions/{id}/pay`, `/payments`, `/payments/upload` and `/profile`, plus the
top bar and the bottom rail. Run at 390 × 844, where a longer Indonesian string
is most likely to break something as well as to be missing.

**Steps:**
1. Read every visible string on each surface in `id`.
2. Read the same surface in `en` and list the strings that are byte-identical in
   both.
3. For each identical string, check whether it is a dictionary entry
   (`src/lib/i18n/dictionaries.ts`) or a hardcoded literal.
4. Sign in as **Eka** and as **Yoga** and read their `/payments/upload` in `id`
   as well — the five dead-end explanations are the newest copy in the product.
5. On each surface, check no tracked-caps label clips.

**Expected result:** no user-facing string bypasses the dictionary. The strings
identical across locales are only the ones §16's TC-DS-015 already allows — the
community name and other runtime configuration, proper nouns (Activity names,
Session titles, member names, venues, emails), numerals and Rupiah amounts, and
the loanwords the Indonesian dictionary deliberately keeps. Anything else
identical is a hardcoded literal and fails the case. In particular:

- Mark labels switch: `Unposted` → `Belum Dipasang`, `None` → `Kosong`,
  `Confirmed` → `Lunas`, `In review` → `Ditinjau`, `Rejected` →
  `Ditolak`, `Registered` → `Terdaftar`, `Maybe` → `Mungkin`, `Opted Out` →
  `Batal Ikut`, `Full` → `Penuh`.
- The board's two silences switch: `Nothing on this day.` → `Tidak ada apa pun
  di hari ini.` and `An Admin has not posted this session yet.` → `Admin belum
  mengumumkan sesi ini.`
- The Seat controls switch: `Claim a Seat` → `Ambil kursi`, `Claim & pay` →
  `Ambil & bayar`, `Withdraw` → `Batal ikut`, and their accessible names with
  them.
- The forfeit sentence switches whole: `Seat released. Your Dues cover the
  month, not this Session, so nothing is refunded.` → `Kursi dilepas. Iuranmu
  menanggung satu bulan, bukan sesi ini, jadi tidak ada pengembalian dana.`
- The rail's short labels switch: `Sessions` → `Sesi`, `Payments` → `Iuran`.
- All five Proof-upload dead-end explanations switch — title, body and action.
- Rupiah amounts do **not** switch: `Rp 75.000` in both, by design.
- Nothing clips: every tracked-caps label has `scrollWidth === clientWidth` at
  390px.

---

### 17.10 Recorded run — 2026-08-20

Executed once against the §2 seed on Next.js 16, 1440 × 900 / 390 × 844 /
390 × 640, both materials, both locales, on a **UTC+8 host** — which is not WIB,
and is what exposed the first defect below. Every capacity figure quoted in a
case was read from the database with `.claude/seat-audit.ts`, before and after,
never from the screen.

| Case | Priority | Result |
|---|---|---|
| TC-MS-001 | P0 | **Pass** — no select, no form; heading at Display 48/800, body at 15px in Secondary Ink naming **Futsal** and **August 2026**; action → `/sessions?activityId=<Futsal>`; `GET /api/users/memberships` **200** with `joined: true`, `effectiveMode: null`; the other cause's copy absent |
| TC-MS-002 | P1 | **Pass** — under *My activities* Futsal only, all seven days drawn; under *All activities* exactly **two** controls on the page, both on her own Futsal, none on Badminton / Basket / Tennis; `mySeat: null` and `myPayment: null` before and after |
| TC-MS-003 | P0 | **Pass** — `Nothing monthly to pay here` naming **Badminton**; action → `/sessions?activityId=<Badminton>`; **200** with `effectiveMode: "PER_SESSION"` and no MONTHLY row; `/payments` still shows three Ink `Confirmed` rows reading `FEE · AUGUST 2026` |
| TC-MS-004 | P0 | **Pass** — seven bands Monday-first, none skipped; `UNPOSTED` + "An Admin has not posted this session yet." distinct from `NONE` + "Nothing on this day."; lattice is `gap-px` over `bg-rule` inside `border-rule`; `scrollWidth === clientWidth` at both widths |
| TC-MS-005 | P1 | **Pass** — "14 September – 20 September 2026", seven bands, exactly 4 Blank `UNPOSTED` + 3 Blank `NONE`, **no** notice strip |
| TC-MS-006 | P1 | **Pass** — with `ActivitySession` at zero rows the Blank strip renders with its exact sentence **and** the seven-band board is still drawn beneath it; restored by `npm run db:seed` |
| TC-MS-007 | P0 | **Pass** — `when` = **88px** at both widths; across all 12 rows one value per column: **387.5 / 485.5 / 1037.5** at 1440, **27 / 125 / 348** at 390; control rows on `88px 552px` with the button's left edge **485.5**, equal to the title's; `anchor.contains(button) === false`; no page overflow |
| TC-MS-008 | P0 | **Pass** — `BELUM DIPASANG` measures **133.8px** exactly, `scrollWidth === clientWidth`, right edge on the cell's content box (1037.5 at 1440, 348 at 390) and identical to every seat figure's; no `12.5rem` floor, no scrolling rail, no `88rem` measure — the only `overflow-x-auto` on the page is the Activity filter row, which contains no board row and does not scroll |
| TC-MS-009 | P0 | **Pass** — before Tape `MAYBE`, `seatsHeld: 2`, aria `Claim a Seat in Free Play (Maybe Test)`; **201** `{"payUrl": null}`, toast `Seat claimed.`, no navigation; after Ink `Registered`, control `Withdraw`, columns unmoved, `seatsHeld: 3` / `seatsFree: 17`, `holdExpiresAt: null`, `myPayment: null` |
| TC-MS-010 | P0 | **Fail → fixed → Pass** — every clause held (**200** `{"isForfeited": true}`, the forfeit sentence, Erased `Opted Out` + "You released this Seat.", seat figure back to 6/12, `seatsHeld` 7 → 6, row **kept** as `ABSENT`, no "Absent" anywhere) **except the control, which read `Claim & pay`**. See defect 3 |
| TC-MS-011 | P0 | **Fail → fixed → Pass** — order, stop counts (2 / 1 / 0) and rings all held: anchor ring solid **2px** `--ring` at **-2px** offset, control ring **3px** `--ring` box-shadow; `Enter` released (**200**, `isForfeited: false`, row deleted, 3 → 2) and reclaimed (**201**, 2 → 3). **Focus was lost to `<body>` after each write.** See defect 4 |
| TC-MS-012 | P1 | **Pass** — 8 / 7 / 7 / 7 cells per Activity card, seven consecutive days from today, the day carrying two Badminton Sessions contributing **two** cells; every cell carries its own date; ruled lattices; at 390 in `id` the tiles stack one per row and measure **Kehadiran 103px, Mendatang 109px, Iuran 55px**, none clipped |
| TC-MS-013 | P1 | **Pass** — Badminton Blank `PENDING`, dashed 1px, **no fill**, linked to `/payments/upload`; Basket / Futsal / Tennis Ink `CONFIRMED`, solid 1px over a fill; **zero** controls in any day cell |
| TC-MS-014 | P0 | **Pass** — header is the Slot Cell grid, **not** a link, **no** control; `when` carries `MONDAY 24`; facts card reads `Monday, 24 August` — **one date on the page**; participants through the resolver |
| TC-MS-015 | P0 | **Pass** — CTA `Register & pay · Rp 75.000` (the monthly bill); **201** `{"payUrl": "/payments/upload"}`; `seatsHeld` 3 → **4**, `seatsFree` 5 → 4, `holdExpiresAt` = **exactly 60 minutes** after the press (15:37:16.995Z → 16:37:17.374Z), `myPayment` still **null**; back on the Session `Reserved · pay within 59:32` above `Pay monthly dues first · Rp 75.000`; on `/payments` the Blank `PENDING` card carries `Pay within 59:13` |
| TC-MS-016 | P0 | **Pass, after defect 8** — **201**, toast, back to `/payments`; Tape on the dues card, banner gone, newest history row Tape under `DUES · AUGUST 2026`. On the first run the dues card read `IN REVIEW` while the history row beneath it, the dashboard and the profile all read `PENDING` — the same word those three used for Dues with *nothing* sent. The submitted state is now **`IN REVIEW`** / **`DITINJAU`** on all four, and the not-yet-paid state is **`PENDING`**, verified by watching Badminton cross from one to the other on all three surfaces. Capacity across all ten Badminton Sessions of the month: Hold Lab's hold **cleared to `null`** with `seatsHeld` unchanged at 4; Morning Drills **6 → 7**; Weekly Rally Night unchanged at 18; **Full Court Challenge 6 / free 0 before and after**; the CANCELLED and COMPLETED Sessions untouched. No Session rose by more than one |
| TC-MS-017 | P0 | **Pass** — Reject disabled until a reason is typed; `PATCH` **200** → `REJECTED`; Strike `REJECTED` with `line-through`, the amount **dimmed to `--muted-foreground` and not struck**; reason, refund guidance and WhatsApp link all in Secondary Ink, none in red; dues card back to Blank `UNPAID`. Every Badminton Seat released — Hold Lab 4 → 3, Weekly Rally 18 → 17, Morning Drills 7 → 6, `mySeat: null` on all three — while the three `PRESENT` rows on COMPLETED Sessions and the `MAYBE` on Free Play were untouched. **One sub-clause of the case is wrong as written**: Weekly Rally Night does not "return to its TC-MS-016 before figure", because Adi already held an unfunded row there before the upload. The rule that holds everywhere is *falls by exactly one* |
| TC-MS-018 | P0 | **Fail ×2 → fixed → Pass** — alignment held: six amounts, **one** right edge (1031.5), all `tabular-nums`, `Rp 75.000` id-ID grouping in the **English** build, `Dues · August 2026` with the year, no enum leak. Both read-only treatments failed. See defects 5 and 6 |
| TC-MS-019 | P0 | **Fail → fixed → Pass** — rail **63px** tall at 577–640, four cells **94/94/94/93px** (spread **1px**), each **56px** tall, active cell `--primary-solid` ground with board ink and `aria-current="page"`, `divide-x` + `border-t` in `--rule`. **Two labels were ellipsised.** See defect 7 |
| TC-MS-020 | P0 | **Pass** — at 390 × 640 on `/dashboard`, `/payments`, `/payments/upload` and `/sessions/{id}`: rail top **577**, content bottom **543.7–544.4** on every one, `<main>` carrying `padding-bottom: 96px` from the layout rather than per page, and no tap intercepted by the rail. The safe-area inset resolved to the **0.375rem floor** — no device reporting a non-zero inset was available |
| TC-MS-021 | P0 | **Pass** — five live producers, each through the one resolver. Measured against §16's own figures and matching them: painted board Ink **5.40**, Tape **6.20**, Strike **5.45**, Erased **6.19**, Blank **5.45**; enamel Ink **6.31**, Tape **5.36**, Strike **5.97**, Erased **5.41**, Blank **6.13**. Forms distinct with hue discarded — Ink solid border + fill, Blank dashed border + **no** fill, Tape 0px border + clip-path teeth + `::after`, Strike border + `line-through`, Erased **transparent border** over the ground fill. Hollow has no producer, as the case says. `Absent` appears nowhere |
| TC-MS-022 | P1 | **Pass** — board, dashboard, payments, upload and profile in `id` with no English leak; marks all switch (`BELUM DIPASANG`, `KOSONG`, `TERDAFTAR`, `MUNGKIN`, `DIBATALKAN`, `BATAL IKUT`, `PENUH`, `LUNAS`, `DITINJAU`, `DITOLAK`, `KUOTA TERPENUHI`, `BUTUH 2 LAGI`); controls and their accessible names switch; the forfeit sentence switches whole; `Sesi` / `Iuran` on the rail; Eka's dead-end fully Indonesian; `Rp 75.000` unchanged. The only cross-locale matches were the community name, proper nouns, numerals and the documented loanwords. Nothing clips — the single `scrollWidth > clientWidth` hit is an `sr-only` node, which is what `sr-only` is |

**Regression net — the existing cases re-run, not rewritten.**

| Area | Result |
|---|---|
| §12 Member — dashboard & sessions — 1–9 | **Re-run, pass**, with two wording notes. §12.3 free RSVP: Maybe → Going took `seatsHeld` 2 → 3 with `MAYBE` 2 → 1 and no hold; Can't-make-it took it back to 2 and **deleted** the row (fee 0, so no Dues to forfeit). §12.4 hold: mode dialog re-priced Rp 75.000 → Rp 25.000, reserve set a 60-minute hold with no Payment, `Reserved · pay within` showed, Cancel released it 4 → 3. §12.5 disabled `Session Full`, §12.6 `Session Cancelled`, §12.7 `RSVP closed`, §12.9 "Set by this session's fee" all as written. §12.8 guards exact: ongoing attendance **403** `RSVP closed`, cancelled attendance **400** `Session is cancelled`, full reserve **409** `Session Full`. **§12.1's "RSVP pills" and §12.2's "grouped This week / Later" are stale** — #59 and #57 replaced both with Slot Cells; documentation, not product |
| §13 Member — payments & profile — 1–8 | **Re-run, pass**, one wording note. §13.1 the unpaid Activity is surfaced beside the paid three (the section is **August**, not July — the seed anchors to the current month). §13.2 upload → PENDING row with the proof in Supabase. §13.4 a `.txt` forced onto the input → toast "Unsupported file format.", input cleared, Submit still disabled. §13.5 the dialog re-prices. §13.6 Eka gets a plain `Register`. §13.7 the rejected row carries reason, refund guidance and a WhatsApp link. §13.8 phone `08123456789` normalised to `628123456789`. **§13.3 caught defect 8**: it asks for `In review` on both the dues card and the dashboard, and only the dues card said it — the dashboard and profile said `Pending`. Fixed in code rather than softened; the case now holds as written |
| §7 Session management (admin) — 1–11 | **Not re-run.** Admin surfaces belong to spec #30 and are out of this area's scope (§17.0). Only §8.4's "Reject requires a reason" was exercised, as the tool TC-MS-017 needs, and it held |
| §16 Design system — TC-DS-001…016 | **Not re-executed as a suite.** Its mark ratios were independently re-measured by TC-MS-021 on both materials and matched every recorded figure, so nothing in §16 is known to have rotted; a full re-run is still owed |

**Defects found and fixed in code.** Nine. None was visible to `tsc`, ESLint,
the 93 tests or a clean production build.

1. **Every seeded Session was stored on the wrong day** — `prisma/seed/dates.ts`,
   `specs.ts`. The seed had two conventions for turning an instant into a day and
   used the wrong one for 24 of 25 Sessions: local `setHours(0,0,0,0)` instead of
   `wibDayStart`. On any host east of UTC — WIB included — that stores the
   previous day, and the board names its days by reading `getUTC*`. "Weekly Rally
   Night", logged by the seed as Sunday 23, was drawn on **Saturday 22** on both
   the board and the dashboard, and the ONGOING "happening right now" Session sat
   on **yesterday's** row. Found by the §12 regression net before any TC-MS case
   could run on a trustworthy fixture. The app was never wrong: the create route
   and the recurring generator both write UTC midnight. `startOfDay` is deleted
   rather than corrected, so the two conventions cannot drift apart again. From
   the **seed**, predating this spec.
2. **`Badminton Â· Rp 75.000` rendered to members** — `(main)/payments/page.tsx`.
   A double-encoded middle dot on the unpaid-dues banner and twice more on each
   outstanding-reservation line, on the surface whose job is telling a member
   what they owe. Twelve corrupted em-dashes in comments across the four member
   pages went with it. Found by §13.1.
3. **The board asked for money the member did not owe** — `slot-action.ts`,
   `sessions-board.ts`, `payments.ts`, `board-view.ts`. `isPaid` was `fee > 0`,
   a fact about the Session's price list rather than about this member's money. A
   MONTHLY member whose Dues are already Confirmed claims a fee-bearing Seat with
   no bill: the row said **Claim & pay** and the reserve route answered **201
   `{"payUrl": null}`** and charged nothing. `readFreeClaimPeriods` now resolves
   the same `isFreeRegisterAllowed` rule the route applies, batched over a week.
   Verified both directions: Futsal Friday and Underbooked Friendly (Dues
   Confirmed) now read `Claim a Seat`; Hold Lab and Morning Drills (Dues unpaid)
   still read `Claim & pay` and still route to `/payments/upload`. Caught by
   TC-MS-010. From **#60**.
4. **Focus was thrown to the top of the board on every claim and withdrawal** —
   `seat-action.tsx`. The control is `disabled` while the write is in flight and
   a disabled element cannot hold focus, so the browser dropped it to `<body>`; a
   keyboard member releasing a Seat from row nine tabbed back down a whole week
   to reach the row they were on. Focus is restored to the control once the write
   settles. Caught by TC-MS-011. From **#60**.
5. **A read-only field took a lighter fill than the tile it sits on** —
   `read-only-field.tsx`. `Input` ships `dark:bg-input/30`, whose `&:is(.dark *)`
   is one class more specific than `ReadOnlyField`'s `bg-board`, so on the painted
   board Period and Amount rendered `--input` at 30% — raised where the design
   says recessed, with the one affordance meaning "the server set this" pointing
   the wrong way. Now `#1b2621` against the `#243029` tile. Caught by TC-MS-018,
   and predicted by suspected defect 2 below. From **#54**.
6. **The per-Session pay page never got that treatment at all** —
   `(main)/sessions/[id]/pay/page.tsx`. It hand-rolled an `Input` with `bg-muted`,
   no lock, and the note "Set by this session's fee" on screen but tied to
   nothing, so a screen-reader member met an uneditable field and was told nothing
   about why. It now uses the same `ReadOnlyField` as the Dues uploader. Caught by
   TC-MS-018, and predicted by suspected defect 3 below. From **#54**.
7. **The bottom rail ellipsised its two longest labels** — `member-nav.tsx`. The
   label span carried `px-1` inside a cell that already had `px-1`, leaving 78px
   of the 86px available; `Dashboard` needs 82px and `Profil Saya` 84px, so a
   member at 390px read `Dashboar…` and `Profil Say…` — the two labels with no
   short form to fall back on. All four now fit in both locales, cells still equal
   to within 1px. Caught by TC-MS-019. From **#53**.
8. **Two different states shared one word, and one state had two** —
   `dictionaries.ts`, `money-mark.tsx`. There are two things a member can be told
   about this period's Dues, and the product was not telling them apart:

   | State | Before | After |
   |---|---|---|
   | Proof sent, Admin has not reviewed it | `/payments` card **In review**; history row, `/dashboard`, `/profile`, Admin queue **Pending** | **In review** / **Ditinjau** everywhere |
   | Nothing sent at all | **Unpaid** / **dues unpaid** / **Belum bayar** | **Pending**, both locales |

   The dues card read `payments.inReview` while everything else resolved through
   `marks.pending`, so a member who had already paid was told so on one card and
   left in the passive voice on the next, one tap apart — and the word used for
   them there was the same one now reserved for having paid nothing.
   `marks.pending` is the only label a Payment's PENDING status resolves to
   (`PAYMENT_MARKS`), so one line per locale moved all five surfaces;
   `paymentStatus` went with it so the Admin queue's filter matches its own rows.
   The unpaid Blank marks took `Pending` in their place. `dashboard` needed a new
   key for its mark — `duesUnpaidBanner` is prose the dues banner reads as
   "{Activity} dues unpaid", and sharing it would have produced "Badminton
   Pending". Verified by watching Badminton cross from one state to the other on
   `/payments` (card and row), `/dashboard` and `/profile`, in both locales, with
   the banner prose intact. Caught by §13.3; the two-word split is a **product
   decision**, not one I picked. From **#58/#59** jointly.
9. **The seed refused to run every WIB evening** — `prisma/seed/dates.ts`. A
   regression from defect 1's own fix, and caught only because the run crossed
   into the evening: `resolveRange` compared its derived `to` — UTC midnight of
   today's WIB day — against `now` as an instant. Those are different kinds of
   thing. From 17:00Z until midnight, UTC midnight of the *current* WIB day is
   still in the future, so `npm run db:seed` died on its own default with
   `--to must be on or before the anchor (--date)`. Now compared as days. Both
   the default and the `--date/--from/--to` path re-run clean. Mine, from this
   ticket.

**Not met.**

- **SonarLint has still been consulted on no ticket in this spec.**
  `mcp__ide__getDiagnostics` is not resolvable in this environment either, for the
  executor or the orchestrator, so the completion gate's editor-diagnostics clause
  is unverified across all ten tickets. `tsc --noEmit` plus ESLint stood in, as
  they did in every earlier wave. This is the one acceptance criterion of map #51
  that no wave has satisfied.
- **§7's admin cases were not re-run**, by scope: §17.0 puts every `/admin/*`
  surface in spec #30. §16's `TC-DS-*` were not re-executed as a suite either,
  though TC-MS-021 re-measured their mark ratios and matched all ten.
- **The safe-area inset was only observed at its `0.375rem` floor.** No device or
  emulator reporting a non-zero `env(safe-area-inset-bottom)` was available, so
  TC-MS-020's `(measure)` marker is answered with the floor rather than a real
  inset.
- **The run crossed a WIB date boundary**, from 20 to 21 August, between TC-MS-018
  and TC-MS-019. Nothing above depends on "today" after that point, but a re-run
  wanting the "today" fixtures should reseed first.
- **Two documentation edits are owed to §12 and §13** — §12.1, §12.2 and half of
  §13.3 describe surfaces that #57, #58 and #59 replaced. This ticket may not edit
  §1–§16, so they are recorded here and in *Suspected defects* rather than fixed.

### 17.11 Suspected defects, found by reading

Found while writing the cases above, not by running them. Each names the case
that should catch it, the ticket it came from, and how confident the reading is.

**Two of these were confirmed by the run and fixed** — 2 and 3, both read from
the source before a browser was opened, and both exactly as predicted. They are
kept below with the reading intact, marked **fixed**, because a suspicion that
proved out is worth more on the record than one quietly deleted. The rest stand.

1. **§12.2's expected wording is stale, not failing.** It expects `/sessions`
   "grouped This week / Later, quota badges, filters"; #57 replaced that with a
   week read down the page, and #57's own closing comment says so: "`TESTING.md`
   §12.2's expected wording … is invalidated by that change and wants updating
   by whoever owns that file." Caught by the regression-net row for §12 above,
   and by TC-MS-004. **Documentation, not code** — it must not be recorded as a
   product failure, and this ticket may not edit §1–§16. Confidence: certain.
2. **The read-only Amount on the painted board may not take the ground fill.**
   `ReadOnlyField` sets `bg-board`, but the shared `Input` also carries
   `dark:bg-input/30`, and `tailwind-merge` keeps both because they are
   different variants. Under `@custom-variant dark (&:is(.dark *))` the dark
   rule has the higher specificity (0,2,0 against 0,1,0), so on the painted
   board the field would render `--input` at 30% over the tile — **lighter**
   than its surroundings — where the design calls for the ground, which is
   **darker**. That reverses the signal the fill is carrying. Caught by
   TC-MS-018 step 3, on the painted board only. From #54. Confidence:
   high on the specificity, unverified on what it looks like.
   **Confirmed and fixed** — measured at `oklab(0.615459 …/0.3)` where `--board`
   is `#1b2621`; `dark:bg-board` added. Defect 5 in §17.10.
3. **`/sessions/{id}/pay`'s Amount field never got #54's read-only
   treatment.** It is a bare `Input` with `bg-muted` and no lock glyph, no
   Figure role and no `aria-describedby` tying its note to it, where
   `/payments/upload` has all four. Both are server-set amounts on the same
   product; two treatments for one state is the inconsistency #54 existed to
   remove, and this page was outside its scope. Caught by TC-MS-018 step 4.
   From #54 (scope), surfaced by #58's convention. Confidence: high — read
   directly from the source.
   **Confirmed and fixed** — the page now composes `ReadOnlyField`. Defect 6 in
   §17.10.
4. **The Erased mark disappears as a form when its cell is hovered.** Erased is
   `bg-board` with a transparent border; a Slot Cell with something to open
   takes `hover:bg-board`. On hover the mark's fill is exactly its cell's, so
   the chip stops being a chip. The words beside it (`You released this Seat.`)
   still carry the state, so this is not a WCAG failure, but "flat and
   ground-coloured" stops being a distinguishable form at the moment a pointer
   is on it. Caught by TC-MS-010 and TC-MS-021 if the tester hovers. From #60.
   Confidence: medium — the mechanism is certain, whether it reads as a defect
   is a judgement.
5. **The board offers `Withdraw` while an unpaid hold is live, and says nothing
   about the deadline.** The board's read carries no `holdExpiresAt`, so a
   member looking at the row cannot see that the Seat lapses in minutes; the
   Session's own page and `/payments` both show the countdown. Recorded by #60
   as out of scope and worth its own ticket. Caught by TC-MS-015's last bullet.
   Confidence: certain — it is recorded behaviour, not a suspicion.
6. **`isRsvpClosed` computes the RSVP window with `setHours`, in the server's
   zone.** On a UTC host that is about **seven hours** off for WIB, so the
   window opens and closes at the wrong time — which decides whether the board
   offers a control at all. Pre-existing and deliberately reused by #60, which
   recorded it. Caught indirectly by TC-MS-009 through TC-MS-011 if a control is
   missing or present when the stated window says otherwise, and only on a host
   whose zone is not WIB. Confidence: certain in the code, host-dependent in
   whether a case sees it.
7. **`/payments` and `/dashboard` are each half board and half floating
   panel.** The history is a ruled lattice (#58) but the dues card, the
   outstanding-reservations list and the Activity summary cards are still
   `bg-card rounded-xl` panels with gaps between them. Both #58 and #59 recorded
   this and left it for its own ticket. Visible in TC-MS-013, TC-MS-016 and
   TC-MS-018. Confidence: certain; scope, not a bug.
8. **`src/app/(main)/sessions/[id]/page.tsx` is 381 lines**, over the 300-line
   standard, recorded by #60. No case here catches it — it is a standards
   finding, not something a member can see. Listed so it is not lost.
9. **Ten `dashboard.*` dictionary keys are unreferenced** after #59, and
   `sessions.boardDaysShort` was left deliberately after #57 but is now read
   again by the dashboard's day cells. No case catches dead keys; a grep does.
   Confidence: certain, cosmetic.
10. **SonarLint has been consulted on none of the nine closed tickets under map
    #51**, because `mcp__ide__getDiagnostics` was unavailable in every wave. It
    is unavailable to this ticket too — not in the tool list and not resolvable
    through tool search — so the gate's editor-diagnostics clause remains
    unverified for the whole spec. One pass with the extension live is worth
    doing before #29 is called done. No case here can substitute for it.

---

## 18. Admin registers (`TC-AR-*`)

Spec #30 rebuilt the admin side: the Payments queue became a queue, No-Show
became a value an Admin can record, attendance got a register of its own, and
every admin surface became a ruled register composed from one shared component.
This area tests **what the Admin can see and decide** on those surfaces, and the
rules the surfaces only reflect.

That is the line every case here is written to. "Payments awaiting a decision
appear above decided ones" is a test. "The query orders by status" is an
implementation detail that passes while the queue is still unusable.

Two kinds of claim in this area are asserted **from the database**, never from
the screen, because they are the two the redesign could break silently: money,
and the fourth attendance value. Every case that records a No-Show, saves an
attendance list, or decides a Payment reads the affected rows before and after
and quotes the figures.

### 18.0 Conventions and shared preconditions

This area inherits **§16.0 in full** and restates none of it: the same id /
priority / type / preconditions / numbered steps / expected-result shape, the
same P0-P1-P2 meanings, the same two board materials (enamel = `:root`, painted
board = `.dark`), the same theme toggle and `NEXT_LOCALE` switches, and the same
two viewports (**390 × 844** and **1440 × 900**).

**Surfaces in scope.** `/admin`, `/admin/sessions`, `/admin/sessions/new`,
`/admin/sessions/{id}/edit`, `/admin/sessions/{id}/attendance`,
`/admin/payments`, `/admin/members`, `/admin/members/{id}`,
`/admin/activities`, `/admin/applicants`, `/admin/settings`, and the routes
those surfaces write through.

**Out of scope**, deliberately: every member surface (§17 owns those, and this
area reaches one only to check that a decision made here shows up there), the
design system's own tokens and marks (§16), and the public route.

**Shared preconditions for every case in this area**, on top of §16.0's:

1. §1 prerequisites done, `npm run dev` running on `http://localhost:3000`, and
   the §2 seed loaded.
2. The accounts are §3's: `admin@xclub.local` (**Admin Satu**) unless a case says
   otherwise, `owner@xclub.local` where the Owner's own view is what is being
   read, and `member@xclub.local` (**Adi Pratama**) where a member has to see the
   consequence of a decision.
3. The Sessions and Payments are §4's and §2's. **No case invents a fixture it
   does not also remove.** Where a case needs a state the seed has not got — a
   `NO_SHOW` row, a fortieth Proof, an Owner with money behind them — it says so
   in its preconditions, and the recorded run names the probe that added the
   rows and the probe that took them away again.
4. **The route is exercised directly** wherever a rule lives on the server:
   `PATCH`/`DELETE /api/sessions/{id}`, `POST /api/sessions/{id}/attendance/bulk`
   and `PATCH /api/payments/{id}`, each with a signed-in cookie and
   `Content-Type: application/json`. A control the form did or did not draw is a
   courtesy; the refusal is the rule, and a case that only reads the form passes
   while the server is wide open.
5. **Vocabulary**, from `CONTEXT.md`. **Opted Out** is stored `ABSENT` and
   renders **Erased**; **No-Show** is stored `NO_SHOW` and renders **Hollow**.
   The stored name `ABSENT` never surfaces to a user as "Absent". Confirm /
   Reject is what an Admin does to a Payment; Admit / Decline is what they do to
   an Applicant; the two vocabularies never cross.
6. **The refusal shape.** Every locking refusal on the Sessions routes is a
   **409** whose body carries both a translated `error` sentence and a stable
   `reason` code; the case fails on a 200, on a different status, or on a body
   missing either field. Every bulk-attendance refusal is a **400** carrying
   `error: "Invalid payload"` and a `reason` naming the fault.

### TC-AR-001 · P0 · Positive — Every Session row carries its eight facts, ruled, at both widths

**Preconditions:** admin on `/admin/sessions`, at least three Sessions listed.

**Steps:**
1. At 1440 × 900, read the `<thead>` and one row.
2. Read the computed `border` between two neighbouring rows and two neighbouring
   cells.
3. Resize to 390 × 844 and read the same row.
4. Read the capacity and floor cells with a screen reader.

**Expected result:**

- Eight columns, in this order: **Date** (date over the time range, tabular),
  **Session** (the title), **Activity** (initial tile plus name), **Location**,
  **Capacity** (`held/max`), **Floor** (`committed/needed`), **Status** (one mark),
  **Actions**.
- Rows are separated by a shared **1px** rule and the register is bounded by one
  frame. There are no cards and no coloured accent line at any width.
- At 390px the register **collapses by axis**: each row is still a ruled row, and
  each cell carries its column's own label above its value. The `<thead>` is
  hidden there and the inline labels are hidden at full width — nothing is
  announced twice.
- The capacity cell announces "*n* of *max* seats held" and the floor cell
  "*n* of *needed* members committed"; neither leaves a bare `6/16` to be
  interpreted.
- A Session whose Activity sets `minMembers = 0` draws **"No floor"**, never
  `0/0`. A Session below its floor carries the words **"Below floor"** beside the
  figure — the fact is never carried by colour alone.

### TC-AR-002 · P0 · Positive — A cancelled Session reads as struck, and its figures still hold

**Preconditions:** one Session cancelled from its row (see `TC-AR-006`).

**Steps:**
1. Find the cancelled Session's row and read the standing column.
2. Read the title cell's colour and text decoration.
3. Repeat with colour removed (grayscale), per §16.0.

**Expected result:**

- The standing column carries the **Strike** mark, whose own label is struck
  through, and the title recedes to Quiet Ink beside it. The strike is on the
  mark, not on the title: one line through two words reads as a stamp, a second
  through the value reads as damage to the row.
- With all colour removed the row is still identifiable as cancelled, by the
  struck label alone.
- The row offers no **Cancel session** control — the Session is already closed —
  while its attendance, edit, detail and CSV controls remain.

### TC-AR-003 · P0 · Negative — The fee of a Session with money behind it is refused

**Preconditions:** a **Scheduled** Session with at least one seat-holding
Attendance, or one live (`PENDING`/`CONFIRMED`) Payment naming it. Note its
stored `fee`.

**Steps:**
1. `PATCH /api/sessions/{id}` with `{ "fee": <stored fee + 1000> }`.
2. Re-read the Session and compare its `fee`.
3. Open `/admin/sessions/{id}/edit` and read the Fee field.
4. Repeat step 1 on a Session with **no** held Seat and **no** live Payment.

**Expected result:**

- **409**, with `reason: "FEE_LOCKED"` and a sentence naming both the reason and
  the fix ("…already has a payment or a held seat, so its fee cannot be changed.
  Post a new session at the new fee instead."), in the caller's own locale.
- The stored `fee` is **unchanged**. The old behaviour — the field silently
  dropped and a 200 returned — is a failure of this case.
- In the form the Fee input is **`readonly`**, not `disabled`: it is focusable,
  its value posts, it carries the Enamel Ground fill (`bg-board`, from the shared
  `Input`'s own `read-only:` variant), and a Body-size sentence beneath it is
  tied to it with `aria-describedby`.
- Step 4 returns **200** and the fee changes: a Session with no money behind it
  stays fully editable.

### TC-AR-004 · P0 · Negative — Capacity cannot go below the Seats already held

**Preconditions:** a Scheduled Session with **n ≥ 2** seat-holding Attendances.

**Steps:**
1. `PATCH` with `{ "maxPlayers": n - 1 }`.
2. `PATCH` with `{ "maxPlayers": n }`.
3. Let a reservation hold lapse (§14.3's hold, or set `holdExpiresAt` into the
   past) and repeat step 1 counting only the Seats that survive the sweep.

**Expected result:**

- Step 1 is **409** with `reason: "CAPACITY_BELOW_HELD"`, and the sentence names
  the figure: "Capacity cannot go below the *n* seats already held. Set it to *n*
  or higher, or release a seat first."
- Step 2 is **200**: capacity *equal* to the held Seats fits everyone who holds
  one and only refuses new claims.
- Step 3 succeeds against the lower count — the lazy hold sweep runs at the top
  of the write, so an expired hold neither floors capacity nor locks a fee.
- In the form the capacity input carries `min` equal to the held Seats and the
  same Body-size sentence, tied to it with `aria-describedby`. It is **not**
  read-only: raising capacity is still the Admin's to do.

### TC-AR-005 · P0 · Negative — A Completed or Cancelled Session accepts notes and nothing else

**Preconditions:** one Session stored as `COMPLETED` and one as `CANCELLED`.

**Steps:**
1. `PATCH` the Completed Session with `{ "title": "<a different title>" }`.
2. `PATCH` it with `{ "status": "SCHEDULED" }`.
3. `PATCH` it with `{ "notes": "Rain stopped play." }`.
4. Open its edit form, change **only** the notes, and Save — the form posts every
   field, each at its stored value.
5. Repeat steps 1 and 3 against the Cancelled Session.

**Expected result:**

- Steps 1 and 2 are **409** with `reason: "SESSION_CLOSED"`. `status` is locked
  like every other field: a closed Session is not reopened from here.
- Step 3 is **200** and the notes are stored. What happened is exactly what an
  Admin writes down afterwards.
- Step 4 **succeeds**: an unchanged field is not an edit, so a whole-payload save
  that changes only the notes is not refused.
- The form shows every field but the notes in the read-only treatment, with one
  Body-size sentence — "This session is completed or cancelled, so only its notes
  can be changed here." — that each of them points at with `aria-describedby`.
  The status control is drawn as its own label in that treatment rather than as a
  disabled `<select>`.

### TC-AR-006 · P1 · Positive — The register's jobs act from the row, and it is traversable by keyboard

**Preconditions:** admin on `/admin/sessions`, at least one Scheduled Session.

**Steps:**
1. Tab from the page heading through one row's controls and read the focus
   indicator on each.
2. Press Enter on **Take attendance**, then go back.
3. Press Enter on **Cancel session** and read the dialog, then confirm.
4. Read the register's head for the way to post a new Session.
5. Read `<tr>` for a `tabindex` attribute.

**Expected result:**

- Tab reaches each row's controls in DOM order — attendance, edit, detail, CSV,
  cancel — each with a visible focus ring, and Enter presses them.
- **Take attendance** lands on `/admin/sessions/{id}/attendance`; **Edit** on
  `/admin/sessions/{id}/edit`; **Detail** on `/sessions/{id}`; **CSV** downloads
  the export.
- Cancel asks first, names the Session in its title, and states what cancelling
  does before it is confirmed. Confirmed, the row's standing column becomes
  Strike without leaving the page.
- **New Session** sits in the register's head and lands on
  `/admin/sessions/new`.
- No `<tr>` carries a `tabindex`: the row's own controls are what focus travels
  through.
- At 390 × 844 the last row's controls are still reachable and pressable, and
  nothing overlays them. The admin shell carries **no fixed bottom rail** — that
  is the member shell's, and `TC-MS-019`/`TC-MS-020` own it. Two bullets about
  the rail's safe-area inset stood here until the run of 2026-08-29; they were
  pasted from `TC-MS-020` and asserted about a component this surface does not
  render.

### TC-AR-007 · P0 · Negative — An Owner's email stays withheld on the Payments queue, the attendance register and both payments routes

**Preconditions:** the Owner (`owner@xclub.local`) enrolled as a Participant on
one Session, with a seat-holding Attendance on it, and holding one Payment. An
admin account from §3.

**Steps:**
1. As the admin, open `/admin/payments` and find the Owner's row; open the
   Owner's Session's attendance register.
2. As the admin, `GET /api/payments?userId=<the Owner's id>` and
   `GET /api/payments/{the Owner's payment id}`.
3. As the admin, search the Payments queue by the Owner's email address.
4. Repeat steps 1 and 2 signed in as the Owner.

**Expected result:**

- The Payments queue's Member cell and the attendance register's Participant
  cell both draw **Withheld** where the Owner's email would sit, for the admin;
  neither cell's markup carries the address.
- Both routes in step 2 return **200** with `email: null` on the Owner's row;
  every other field on it, and its key set, is unchanged.
- Step 3 returns no rows: the Owner is not found by an email an Admin cannot
  see.
- Signed in as the Owner (step 4), all four surfaces show the Owner's own
  email intact: the queue, the attendance register, and both routes.

### TC-AR-008 · P0 · Negative — A Session with money behind it, or a Completed one, refuses deletion

**Preconditions:** four Sessions — one **Scheduled** with at least one
seat-holding Attendance, one **Scheduled** with no held Seat but one live
(`PENDING`/`CONFIRMED`) Payment naming it, one **`COMPLETED`** with neither, and
one **`CANCELLED`** with neither.

**Steps:**
1. `DELETE /api/sessions/{id}` on the Session with the held Seat.
2. `DELETE` on the Session the live Payment names.
3. `DELETE` on the Completed Session.
4. `DELETE` on the Cancelled Session, then re-read it.
5. Open `/admin/sessions/{id}/edit` for each of the four and read the buttons
   beneath the form.
6. In the form for the Session with the held Seat, if a Delete button is drawn at
   all, press it and read the toast.

**Expected result:**

- Steps 1 and 2 are **409** with `reason: "SESSION_HAS_MONEY"` and a sentence
  naming both the reason and the fix ("…has a payment or a held seat behind it,
  so it cannot be deleted. Cancel the session instead…"), in the caller's own
  locale. A **500** is the failure this case exists to catch: `Payment.session`
  is `onDelete: Restrict`, so the old route let Prisma throw where it should have
  been answering.
- Step 3 is **409** with `reason: "SESSION_CLOSED"` and its own sentence — the
  Session is part of the record, not "only its notes can be changed", which is
  the PATCH sentence and answers a question nobody asked here.
- Step 4 is **200** and the Session is gone. A cancelled Session with nothing
  behind it is a plan that was called off, not history; where cancelling was what
  was meant, `TC-AR-009` is the way back rather than this.
- Step 5: the **Delete session** button is absent on the first three forms and
  present only on the Cancelled one. Absent, not disabled — the same way the
  register draws no Cancel control on a Closed Session.
- Step 6 does not arise where step 5 passed; if it does, the toast carries the
  route's own sentence, not the generic "Failed to delete session".

### TC-AR-009 · P0 · Positive — A Cancelled Session is reopened while its day has not passed

**Preconditions:** three Sessions — one **`CANCELLED`** dated **today or later**
in WIB, one **`CANCELLED`** dated **before today** in WIB, and one
**`COMPLETED`**. Note that "today" is the **WIB** day: between 00:00 and 07:00
WIB the UTC date is still yesterday's, and a Session dated for the WIB today is
not past.

**Steps:**
1. On `/admin/sessions`, read the controls on each of the three rows.
2. Press **Reopen session** on the not-yet-past Cancelled Session, read the
   dialog, and confirm. Read the row's standing column afterwards.
3. `PATCH /api/sessions/{id}` with `{ "status": "SCHEDULED" }` on the past
   Cancelled Session.
4. The same `PATCH` on the Completed Session.
5. `PATCH` the reopened Session's twin — a Cancelled, not-yet-past Session — with
   `{ "status": "SCHEDULED", "title": "<a different title>" }`.
6. Open `/admin/sessions/{id}/edit` for a Cancelled Session and read the Status
   control.

**Expected result:**

- Step 1: only the not-yet-past Cancelled row offers **Reopen session**. The past
  Cancelled row and the Completed row offer neither Reopen nor Cancel — a Session
  the server will refuse gets no control rather than a disabled one.
- Step 2: the dialog names the Session, says the Session goes back to Scheduled
  and that Seats held when it was cancelled are still held, and confirming turns
  the standing column from **Strike** to Scheduled without leaving the page.
- Step 3 is **409** with `reason: "SESSION_PAST"` and a sentence saying the day
  has passed and to post a new session for the next date.
- Step 4 is **409** with `reason: "SESSION_CLOSED"`: a completed Session is never
  reopened.
- Step 5 is **409** with `reason: "SESSION_CLOSED"`. Reopening is a status-only
  write: a body that renames the Session in the same request is the edit the
  Closed rule refuses, not a reopening. The stored `title` and `status` are both
  **unchanged**.
- Step 6: the Status control is still drawn read-only, as its own label. The
  reopening lives on the register only — the form's job is the Session's facts,
  and one way to do a thing is what keeps two surfaces agreeing.

### TC-AR-010 · P0 · Negative — A capacity edit and a reservation cannot cross

**Preconditions:** a **Scheduled** Session with a fee, capacity `max`, and
**n = max − 1** seat-holding Attendances — exactly one free Seat. Two browsers:
an admin in one, and in the other a member who holds no Seat on this Session and
whose Membership on that Activity is billed **Per-Session**, so claiming a Seat
takes the hold path. The two presses have to overlap; where they cannot be made
to by hand, issue them as two `fetch` calls without awaiting the first —
`PATCH /api/sessions/{id}` with `{ "maxPlayers": n }` and
`POST /api/sessions/{id}/reserve`.

**Steps:**
1. Admin tab: open `/admin/sessions/{id}/edit` and set Max Participants to **n**,
   without saving yet.
2. Member tab: press the control that claims the last Seat, and press Save in the
   admin tab in the same moment.
3. Re-read the Session: its stored `maxPlayers`, and its count of seat-holding
   (`REGISTERED`/`PRESENT`) Attendances.
4. Repeat the whole case with the two presses in the other order, several times.

**Expected result:**

- **Every run ends with `held ≤ maxPlayers`.** `maxPlayers = n` stored beside
  `n + 1` held Seats is the failure this case exists to catch — it is the state
  the old two-statement PATCH could reach, and one this one cannot.
- **Exactly one of the two writes is refused**, and which one depends only on
  which committed first; both succeeding is a failure of this case.
  - Reservation first: capacity ends **unchanged** at `max`, the Seat is held,
    and the edit is **409** with `reason: "CAPACITY_BELOW_HELD"` naming `n + 1`
    seats — the figure the Admin has to be told, since it is one higher than the
    page they were reading said.
  - Edit first: capacity ends at **n**, held stays at **n**, and the member's
    claim is refused as full rather than seated over the new capacity.
- Neither write leaves a half-write behind: no Payment row without its
  Attendance, and no capacity written without the count it was decided against.

### TC-AR-011 · P2 · Edge — A Confirm by one Admin cannot duplicate or drop a row on another Admin's page

**Preconditions:** two Admin accounts signed in in two separate browsers, A and
B. At least 14 Payments match no filter, of which exactly **4** are awaiting a
decision — so page 1 holds all four awaiting rows followed by six decided ones
and the boundary between the two groups falls inside the page. A reads
`/admin/payments` with no filter and no sort applied: the queue's own order is
what this case is about, and an explicit column sort is a different read.

**Steps:**
1. On A, load page 1 and record the ten rows in order, by Payment id.
2. On B, Confirm the Payment sitting **fourth** on that page — the last of the
   awaiting rows, and so the one on the boundary.
3. On A, reload page 1 and record the ten ids again.
4. Repeat steps 2 and 3 with the next awaiting Payment each time, reloading on A
   **twenty** times across the run, recording the ids of every load, and pressing
   Confirm on B while A's reload is in flight rather than between reloads.
5. Compare the recorded lists, and read page 2 once at the end.

**Expected result:**

- Every load returns **exactly ten** rows while at least ten Payments match, and
  **no id appears twice within one load**.
- No Payment that matched the filter for the whole run is absent from every
  load: a row that moves does so by moving *down*, never by vanishing.
- On every load the **queue order** is awaiting first, then the decided newest
  first. What a row *draws* can be one decision newer than the position it was
  given: the page is an ordered read of the ids followed by a fetch of those
  ids, so a Confirm landing between the two renders a decided row in the
  position its awaiting standing earned it, for exactly one load. That is the
  same tolerance the counts get below, and it is **not** a failure of this case —
  the row set is. A load where a decided row sits above an awaiting one **and**
  the awaiting row is missing, duplicated, or on two pages at once is.
- A Payment Confirmed mid-run appears on the next load in the decided group, and
  on exactly one page — never on page 1 and page 2 at once, never on neither.
- The heading's awaiting count and the pagination total are read by two counts
  taken beside the page rather than as part of it, so either may be one decision
  behind for a single load. That is **not** a failure of this case; the row set
  is what this case tests.
- **The old boundary is closed.** The page used to be two reads over two bands
  (`status = PENDING`, then `status <> PENDING`) whose slices were worked out
  from a count taken before them, so a Confirm arriving between the count and a
  band read moved a row across the boundary and the page dropped it or drew it
  twice. It is now one ordered statement returning the page's ids, and a fetch
  of those ids — which can return fewer rows only if a Payment was deleted
  outright, and cannot reorder them at all.
- The Owner's email is still withheld from the Admin throughout, and still not
  searchable by them: `TC-AR-007` holds unchanged against this read, which now
  reaches the member through raw SQL rather than through Prisma.

### 18.1 The fourth attendance value

The four cases here are the ones the spec calls out as the only part of the
redesign that can lose data. Each reads the rows it is about from the database,
before and after.

### TC-AR-012 · P0 · Positive — Recording a No-Show leaves every capacity figure where it was

**Preconditions:** a census of every Session's `maxPlayers` and its count of
seat-holding (`REGISTERED`/`PRESENT`) Attendances, taken from the database
first. One **`COMPLETED`** Session carrying at least one `PRESENT` row and one
`ABSENT` (Opted Out) row, and one ended Session carrying `REGISTERED` rows.

**Steps:**
1. Take the census.
2. On the Completed Session, `POST /api/sessions/{id}/attendance/bulk` with
   `{ "rows": [{ "userId": "<the ABSENT member>", "status": "NO_SHOW" }] }`.
3. Retake the census and compare it, Session by Session.
4. On the ended Session, move one `REGISTERED` row to `NO_SHOW` the same way, and
   retake the census.
5. Read the Capacity cell of both Sessions on `/admin/sessions`.
6. Put both rows back to what they were.

**Expected result:**

- Step 2 is **200** with `{ "updated": 1 }`.
- After step 3 **every** Session's `maxPlayers` is unchanged and **every**
  Session's held count is unchanged, the edited one included. Opted Out and
  No-Show both sit outside the seat-holding pair, so moving a row between them
  moves no figure at all. This is the clause that proves capacity is unchanged
  *by definition* rather than by an adjustment somebody has to remember.
- After step 4 the edited Session's held count falls by **exactly one** and every
  other figure in the census — every `maxPlayers`, every other Session's held
  count — is unchanged. That fall is the same one a withdrawal produces, because
  `REGISTERED` holds a Seat and neither `ABSENT` nor `NO_SHOW` does; a No-Show
  that left the Seat held, or that moved a figure on any other Session, is the
  failure this case exists to catch.
- Step 5: the Capacity cell reads the new `held/max` with `max` unchanged, and
  the announced sentence is still "*n* of *max* seats held".

### TC-AR-013 · P0 · Negative — A No-Show record changes no amount, no Payment and no Seat

**Preconditions:** a Session that charges a Fee, with a Participant who holds a
seat-holding Attendance **and** a Payment against that Session. Note the Payment
row in full and the member's own dues state.

**Steps:**
1. Record the member's row as `NO_SHOW` through the bulk route.
2. Re-read that member's Payments: every field, `status` and `amount` included.
3. Re-read the Session's `fee`, and the member's `/payments` page as the member.
4. Re-read the Attendance rows of every other member on that Session.
5. Put the row back.

**Expected result:**

- The Payment is **byte-for-byte unchanged** — `status`, `amount`, `notes`,
  `confirmedBy`, `confirmedAt`, `updatedAt`. Recording that somebody did not turn
  up is not a billing decision, and there is no refund, credit or penalty
  anywhere in this path.
- The Session's `fee` is unchanged, and the member's dues state on `/payments`
  is the one it was before.
- No other member's Attendance row is touched — status or `updatedAt`.
- The member's own history shows the Session at the **Hollow** mark, not a money
  mark: what changed is the record of the day, and nothing else.

### TC-AR-014 · P0 · Negative — Rejecting a monthly Payment removes only Registered rows; No-Show, Present and Opted Out survive

**Preconditions:** one member with a **`PENDING`** `MONTHLY` Payment for an
Activity and Billing Period, and four Attendance rows of theirs on four Sessions
of **that Activity in that month**, one at each of `REGISTERED`, `NO_SHOW`,
`PRESENT` and `ABSENT`. Record all four row ids, their statuses and their
`updatedAt`. This is the fixture `TC-MS-017` documents from the member's side;
here it is read from the Admin's.

**Steps:**
1. As an admin, Reject the Payment from its row on `/admin/payments`, with a
   reason typed into the dialog.
2. Re-read all four Attendance rows from the database.
3. Re-read the member's Attendance rows on that Activity's Sessions **outside**
   that month, and on other Activities' Sessions inside it.
4. Re-read the Payment.
5. Reject the same Payment a second time.
6. Restore the fixture.

**Expected result:**

- Step 1 is **200**.
- Step 2: the `REGISTERED` row is **gone**. The `NO_SHOW`, `PRESENT` and `ABSENT`
  rows are all **present**, at their original statuses and their original
  `updatedAt` — untouched, not rewritten. The No-Show surviving is the one this
  case exists for: the cleanup filters on `status: 'REGISTERED'`, so the fourth
  value falls outside it by construction, and a change that "helpfully" widened
  that filter would delete history.
- Step 3: nothing outside the Activity-and-month window is touched.
- Step 4: the Payment is `REJECTED`, its `notes` carry the typed reason verbatim,
  and `confirmedBy` names the deciding admin.
- Step 5 is **409** — "This payment has already been reviewed." A decision is
  made once.

### TC-AR-015 · P0 · Positive — The dashboard's attendance aggregate counts three historical states

**Preconditions:** `/admin` as an admin. A count, from the database, of
Attendance rows at each of `PRESENT`, `ABSENT` and `NO_SHOW`.

**Steps:**
1. Read the dashboard's attendance figure and note it.
2. Record one more `NO_SHOW` through the bulk route.
3. Reload `/admin` and read the figure again.
4. Move that row to `ABSENT` and reload again.
5. Put the row back.

**Expected result:**

- The figure equals `PRESENT + ABSENT + NO_SHOW` — three states, not two. An
  aggregate still on the old pair is short by exactly the No-Show count, which is
  zero on a fresh seed and is why this case adds a row rather than trusting it.
- Step 3's figure is **one higher** than step 1's.
- Step 4's figure is the **same** as step 3's: all three are history, and moving
  a row between two of them moves no total.

### TC-AR-016 · P0 · Negative — No-Show is never derived; an ended Session with Registered rows stays Registered

**Preconditions:** a Session whose end time in WIB has **passed**, whose status is
not `CANCELLED`, carrying at least one Attendance row and **every** listed row
still `REGISTERED`.

**Steps:**
1. Read every Attendance row on that Session from the database.
2. Open `/admin/sessions/{id}/attendance` and read the notice above the register
   and the Recorded column on every row.
3. Leave the page without pressing Save, reload it, and re-read the rows from the
   database.
4. Press **Save attendance** with nothing changed and read what is sent.
5. Read the same Session's row in the member's own history.

**Expected result:**

- Step 1 and step 3 return the **same rows, at the same statuses, with the same
  `updatedAt`**. Nothing about opening the register writes anything.
- Step 2: every Recorded cell reads the **Ink Registered** mark, none reads
  Hollow, and the register carries the notice: *"This session has ended and no
  attendance has been recorded. Everyone here is still Registered — nobody
  becomes a No-Show until you record one."* The form points at it with
  `aria-describedby`.
- Step 4 sends nothing at all: the Save control is **disabled** while nothing has
  changed and the counter beside it reads "Nothing changed yet". A route call
  with `{ "rows": [] }` is **400** with `reason: "ROWS_EMPTY"`.
- Step 5: the member's own surfaces show the Session as Registered. Nobody has
  been branded a No-Show for an Admin's omission, which is the whole point of the
  state having a producer rather than an inference.

### 18.2 The attendance register

### TC-AR-017 · P0 · Positive — A bulk save writes only the rows the Admin touched

**Preconditions:** a Session with at least four Participants. Record every row's
`status` and `updatedAt` from the database.

**Steps:**
1. Open the attendance register, change **two** rows, and read the counter beside
   Save.
2. Press **Save attendance** and read the response.
3. Re-read every row from the database.
4. Press **Mark All Present**, then Save, then re-read.
5. Reopen the register and press Save without touching anything.
6. Restore every row.

**Expected result:**

- Step 1: the counter reads "2 changed"; Save is enabled only once something has.
- Step 2 is **200** with `{ "updated": 2 }` — the payload carried two rows and
  two rows only.
- Step 3: exactly those two rows carry the new statuses and a moved `updatedAt`.
  **Every other row's `status` and `updatedAt` are identical to step 0's.** A
  save that rewrote untouched rows would move their timestamps even where the
  status happened to match, and this is the assertion that catches it.
- Step 4: **Mark All Present** is a prefill — it moves only rows currently
  reading Registered, leaves rows already recorded as Opted Out or No-Show alone,
  and writes **nothing** until Save is pressed.
- Step 5 is refused by the disabled control, and `{ "rows": [] }` against the
  route is **400** `ROWS_EMPTY`. A save that changes nothing is not a save.

### TC-AR-018 · P0 · Negative — A payload with one invalid row writes nothing

**Preconditions:** a Session with at least two Participants. Record every row's
`status` and `updatedAt`.

**Steps:**
1. `POST /api/sessions/{id}/attendance/bulk` with two rows, the first a valid
   change and the second carrying `"status": "MAYBE"`.
2. Re-read every row.
3. Repeat with the second row naming a `userId` who holds no Seat on this
   Session; then with the same `userId` twice; then with `{ "rows": [] }`; then
   with no `rows` key at all.
4. Repeat step 1 against a Session id that does not exist, and again signed in as
   a member.

**Expected result:**

- Step 1 is **400** with `error: "Invalid payload"` and `reason: "ROW_INVALID"`.
  `MAYBE` is the member's own tentative RSVP and is never an Admin's judgement,
  so it is refused here exactly as it is on the single-row route.
- Step 2: **no row is written** — the valid first row included. The whole payload
  is validated before the transaction opens, so one bad row is all of nothing;
  a half-save is the failure this case exists to catch.
- Step 3 returns **400** with, in order, `reason: "USER_NOT_ON_SESSION"`,
  `"DUPLICATE_USER"`, `"ROWS_EMPTY"` and `"ROWS_MISSING"`, and nothing is written
  by any of them.
- Step 4 is **404** for the unknown Session and **403** for the member. Neither
  writes anything.

### TC-AR-019 · P0 · Positive — Opted Out and No-Show are distinct records and distinct marks, reached through real flows

**Preconditions:** two Participants on the same Session, one who will withdraw
themselves and one an Admin will record as a No-Show.

**Steps:**
1. As the first member, withdraw from the Session through the member surface.
2. As the admin, open the attendance register and record the second member as
   **No-Show**, then Save.
3. Read both rows from the database.
4. Read both rows' Recorded cells, in both materials and with colour removed.
5. Read the same two Sessions on each member's own history.
6. Restore both rows.

**Expected result:**

- Step 3: the withdrawal stored **`ABSENT`**, the Admin's record stored
  **`NO_SHOW`**. Two rows, two values — the distinction the glossary draws is in
  the data, not only in the copy.
- Step 4: `ABSENT` renders **Erased** and reads **"Opted Out"** / **"Batal
  Ikut"**; `NO_SHOW` renders **Hollow** and reads **"No-Show"** / **"Tidak
  Hadir"**. The two forms differ with hue discarded — Erased is a transparent
  border over the ground fill, Hollow is a dashed outline with no fill — so
  neither state is carried by colour. The word **"Absent"** appears on no
  surface: the stored name never becomes user-facing copy.
- Step 5: the member who withdrew sees their own decision; the member who did not
  turn up sees the Hollow record. Neither is told the other's word.

### 18.3 The Payments queue

### TC-AR-020 · P0 · Positive — Awaiting Payments are the top of the page, and the decided follow by recency

**Preconditions:** a set of Payments with mixed standings — at least three
`PENDING`, several `CONFIRMED` and at least one `REJECTED` — and no filter and no
column sort applied.

**Steps:**
1. Open `/admin/payments` and read the standing column down page 1, then page 2.
2. Read the heading above the register.
3. Read the whole set on one page (`?pageSize=all`) and check the order end to
   end.
4. Apply a status filter, then a column sort, and read the order again.
5. Press **Back to the queue order** and read it once more.

**Expected result:**

- Every `PENDING` row is **above** every decided row, on page 1 and across the
  whole set. Within each group the order is newest first, and the tie-break is
  stable, so two loads of the same data give the same list.
- The heading reads "*n* waiting for a decision" with *n* equal to the count of
  `PENDING` rows matching the current filter.
- A `REJECTED` row is decided, not awaiting: it sits with the Confirmed ones and
  carries the **Strike** mark with its amount struck through.
- Step 4: an explicit column sort **wins** — the Admin has said what order they
  want, and the queue's own order is not silently reimposed on top of it. No
  column head ever renders as "sorted by" the queue order, because the queue
  order is not a column.
- Step 5 returns to the queue's own order.

### TC-AR-021 · P1 · Edge — A queue with nothing awaiting a decision still reads as a queue

**Preconditions:** a filter that is **not** a standing filter and under which no
Payment is `PENDING` — an Activity whose Payments are all decided is the cheapest
— then the Confirmed **standing** filter, and then a filter matching no Payment
at all.

**Steps:**
1. Open `/admin/payments?activityId={an Activity with nothing awaiting}` and read
   the heading and the rows.
2. Read the standing column: nothing should be Tape.
3. Open `/admin/payments?status=CONFIRMED` and read the heading.
4. Open a filter that matches nothing at all and read the register's body.
5. Clear the filters and confirm the awaiting count comes back.

**Expected result:**

- Step 1: the heading says **"nothing is waiting for a decision"** — a sentence,
  not "0 waiting", and not a hidden heading. An empty queue is a fact worth
  stating, and the surface does not pretend the boundary is somewhere it is not.
- Step 2: every row is decided; the ordering rule is vacuously satisfied and the
  page is still the register, not a different layout.
- Step 3: the sentence is **absent**. Under an explicit standing filter the
  awaiting count is structurally zero — the filter is hiding the queue, not
  emptying it — and "nothing is waiting for a decision" would be a false sentence
  about Payments that are still waiting. A heading that says it there fails this
  case as surely as one that omits it in step 1.
- Step 4: the register draws its **empty row** — the register's own empty state,
  inside the same frame and the same rules, with its mark and its sentence. It is
  not a card, and it is not a bare table with no rows.

### TC-AR-022 · P0 · Positive — The Proof column's three cells: an image, no Proof, and a Proof that will not load

**Preconditions:** three Payments in the queue — one whose `proofUrl` is a real
image on the storage host, one with `proofUrl` null, and one whose `proofUrl` is
on a host the image optimiser is not configured for, or is a dead URL.

**Steps:**
1. Read all three cells at 1440 × 900.
2. Tab to the first cell's control and press Enter; read the dialog; close it and
   read where focus went.
3. Read the accessible name of the thumbnail control.
4. Read the second and third cells' text, and check neither draws a mark.
5. Reload the whole page and confirm it still renders.

**Expected result:**

- The first cell is a real `<button>` holding the thumbnail, reached by Tab in
  the row's own order, opened with **Enter** — no single-key shortcut anywhere
  near a money decision. Its accessible name names the member: "Open the Proof
  from {name}".
- The dialog shows the Proof full size with the Activity and Billing Period in
  its description, so an opened Proof still says which row it came from. Closing
  it returns focus to the same button.
- The second cell draws a **dashed box** the same size as the ones holding an
  image, captioned **"No Proof"** / **"Tidak ada bukti"**. It is not a broken
  image glyph and it is not empty.
- The third cell draws a **ruled** box — something is there — with the caption
  **"Failed to load"** / **"Gagal dimuat"**.
- Neither of those two cells uses a **mark**: every mark on this surface lands on
  the standing column's shared edge, and a second mark in this column would break
  that line.
- Step 5: the page renders. A single Payment carrying a Proof URL on an unlisted
  host must not blank the queue — that failure is issue #88, and this clause is
  its regression net.

### TC-AR-023 · P1 · Positive — A forty-row queue's image weight is the thumbnails, not the originals

**Preconditions:** a queue page showing **40 rows**, each with a Proof on the
storage host. Where the seed has fewer, add sentinel Payments carrying the same
Proof and remove them afterwards.

**Steps:**
1. Load `/admin/payments?pageSize=40` at 1440 × 900.
2. In the console, read `performance.getEntriesByType('resource')` and sum
   `transferSize` over the entries whose name contains `/_next/image`.
3. Read one entry's URL and note its `w=` parameter.
4. Note the size of the original Proof object for comparison.
5. Open one Proof full size and re-read the resource list.

**Expected result:**

- Every thumbnail is requested through the framework's optimiser at the fixed
  box — `/_next/image?url=…&w=96&q=75` on a 2× device, `w=48` at 1× — never as
  the original object.
- The summed thumbnail weight is a small fraction of forty originals. **(measure)**
  — record the sum, the per-thumbnail size and the original's size, and the ratio
  between them. The case fails if the page fetches originals at all, not on a
  particular number.
- Step 5: the full-size render is fetched **only when the dialog mounts**, so it
  is absent from the list until then — which is why the queue's own weight is
  unaffected by it.

### TC-AR-024 · P0 · Positive — Confirm goes through a dialog, and a low amount is pointed out without being blocked

**Preconditions:** two `PENDING` Payments: one whose `amount` equals the current
price for its mode, and one whose `amount` is **below** it — below the Activity's
Dues for a monthly Payment, or below the Session's Fee for a per-Session one.

**Steps:**
1. Press **Confirm** on the first and read the dialog before deciding.
2. Cancel, and confirm the Payment's stored status has not moved.
3. Press **Confirm** on the low one and read the dialog.
4. Read the `aria-describedby` on the dialog's Confirm button.
5. Confirm it, and re-read the Payment.
6. Restore both.

**Expected result:**

- A dialog opens on **every** Confirm. A money decision is never one mis-click
  away — "Confirm this payment?" with the amount, the Billing Period, the
  Activity and the bank account restated, so the Admin is comparing the row
  against the screenshot rather than against memory.
- Cancelling writes nothing.
- Step 3: the dialog carries the sentence **"This is less than the current Dues
  of {amount}. You can still Confirm."** (or the Fee wording for a per-Session
  Payment), at **Body** size in Secondary Ink — a disclosure, not fine print.
- Step 4: the Confirm button points at that sentence with `aria-describedby`, so
  it reaches a screen reader as part of the decision rather than as decoration.
- Step 5: the Confirm **succeeds** — **200**, status `CONFIRMED`. It warns; it
  never blocks. A dialog that refused a short amount would not stop an Admin
  accepting a partial transfer, it would teach them to type a figure that never
  arrived.

### TC-AR-025 · P0 · Negative — Reject refuses an empty reason and names the Seat consequence first

**Preconditions:** one `PENDING` **`MONTHLY`** Payment and one `PENDING`
**`SESSION`** Payment.

**Steps:**
1. Press **Reject** on the monthly one and press Reject in the dialog with the
   reason box empty.
2. Type only spaces and press Reject again.
3. Read the sentence above the dialog's Reject button, and its
   `aria-describedby`.
4. `PATCH /api/payments/{id}` with `{ "status": "REJECTED" }` and no `notes`, and
   again with `{ "notes": "   " }`.
5. Type a real reason and Reject. Re-read the Payment.
6. Open the Reject dialog on the per-Session Payment and read whether the Seat
   sentence is there.
7. Restore both.

**Expected result:**

- Steps 1 and 2 are refused **in the dialog**, with the message *"No reason
  given. Write why you are rejecting this payment — the member sees it."* carried
  by a live region. The control is **not** disabled: a dead button explains
  nothing, and the Admin is told what is missing.
- Step 3: for the monthly Payment the dialog states the consequence before the
  Admin commits — *"Every seat this member is Registered for in {activity}
  sessions in {period} is released. Seats they attended or opted out of are
  untouched."* — at Body size, with the Reject button pointing at it with
  `aria-describedby`.
- Step 4 is **400** both times, with `error: "REJECT_REASON_REQUIRED"`. The rule
  is the route's, not the dialog's; the dialog is the courtesy.
- Step 5 is **200**, `status` `REJECTED`, and `notes` carry the typed reason
  verbatim — it is what the member reads.
- Step 6: the Seat sentence is **absent** on a per-Session Payment. Rejecting one
  releases that Session's Seat only, and a sentence about a month of Seats would
  be false there. The rest of the dialog is unchanged.

### TC-AR-026 · P0 · Positive — The member's own view reflects the Admin's decision

**Preconditions:** one `PENDING` Payment belonging to a member who can be signed
in as.

**Steps:**
1. As the member, read `/payments` and note the Payment's mark and the dues card.
2. As the admin, Reject it with a reason.
3. As the member, reload `/payments` and read the row, the reason and the way
   back.
4. As the admin, restore and then Confirm a Payment for the same member.
5. As the member, reload and read the row again.
6. Restore.

**Expected result:**

- After the Reject the member's row carries the **Strike** mark, the Admin's
  reason verbatim, refund guidance and a route back to sending new Proof. The
  amount is dimmed, not struck: the money is a fact, the decision is what was
  struck.
- After the Confirm the row carries the **Ink** mark and the dues card for that
  period settles.
- Neither state is carried by colour alone, and the member is never shown the
  Admin's machine words — no `REJECTED`, no `PENDING` enum leaking through.

### 18.4 The Owner, the Activities form, and the exports

### TC-AR-027 · P0 · Negative — An Owner account is visibly immutable, as an Admin and as the Owner

**Preconditions:** the Owner (`owner@xclub.local`) and an admin from §3.

**Steps:**
1. As the admin, open `/admin/members` and find the Owner's row. Read the role
   treatment, the Contact cell, and every control on the row.
2. Read the sentence the row carries where other rows carry a promote or demote
   control.
3. Attempt the role change through the route the register would have used.
4. Open `/admin/members/{the Owner's id}` and read the same.
5. Repeat steps 1 and 4 signed in as the Owner.

**Expected result:**

- The Owner's row carries **no** promote, demote or edit control — absent, not
  disabled — and the sentence **"This account cannot be changed."** / **"Akun ini
  tidak bisa diubah."** in its place. The rule is visible in the product rather
  than discovered by a refused edit.
- The role is drawn as the tracked-caps **label**, not as a mark: a role is a
  standing property of a person, not a state of a thing. It reads as an
  immutability and privacy marker, and the register implies **no hierarchy of
  power** — the Owner carries no capability an Admin lacks.
- The Contact cell reads **Withheld** / **Dirahasiakan**, never a blank: a blank
  reads as an unfilled profile and sends the Admin looking for the number
  somewhere else.
- Step 3 is refused by the server, whatever the register drew.
- Step 5: the Owner sees their own contact details intact, and their own account
  still immutable — the rule is about the account, not about who is looking.

### TC-AR-028 · P1 · Positive — The Members register and a member's detail page answer a member's question in one read

**Preconditions:** admin on `/admin/members`. One member with a monthly
Membership whose Dues are Confirmed this period, one with nothing sent, one with
a Proof awaiting a decision, one on a per-Session Membership, and
`newbie@xclub.local` with an incomplete profile.

**Steps:**
1. Read the register's columns and one row of each of the five kinds.
2. Read the Standing column on the per-Session Membership.
3. Promote a member to Admin from the row, confirm the dialog, and read the row;
   then demote them back.
4. Open one member's detail page and read their Memberships, their attendance and
   their dues history.
5. Read the No-Show figure on the detail page, and look for one on the register.

**Expected result:**

- The register carries each member's Activities, payment mode and standing, so
  the common question is answered without opening four screens.
- **Standing is the current Billing Period's Dues state per monthly Membership**:
  **Ink** Confirmed, **Tape** awaiting a decision, **Blank** "Pending" where
  nothing has been sent or only a Rejected Payment stands. A **per-Session**
  Membership carries **no standing mark at all**, only its mode label — there is
  no monthly obligation for it to be in good or bad standing on.
- `newbie@xclub.local` carries the incomplete-profile marker.
- Step 3 asks first, and the role label flips both ways.
- Step 5: the **No-Show count is on the detail page** and **not** a register
  column. The register is already dense; the count serves a conversation, and the
  detail page is where that conversation is prepared.

### TC-AR-029 · P1 · Negative — The Activity form offers no colour and no icon, and nothing is drawn in their place

**Preconditions:** admin on `/admin/activities` and on the Activity create and
edit forms.

**Steps:**
1. Read every control on the create form and on the edit form.
2. Read one Activity's cell in the register, and the Activity cell on the
   Sessions register.
3. `POST /api/activities` with a slug an Activity already uses.
4. `POST /api/activities` without `minMembers` and without `maxPlayers`.
5. Deactivate an Activity from its row, then activate it again.

**Expected result:**

- There is **no colour control and no icon control** on either form — not
  disabled, not hidden behind a toggle: gone.
- Nothing is rendered in their place: **no swatch, no default colour chip, no
  accent line, no broken icon**. Each Activity is identified by its **initial on
  a tile**, so the register is scannable without colour.
- The register carries price, weekly slot, capacity and destination bank account
  together, so an Activity's setup is auditable in one read.
- Step 3 is **409** — "That slug is already in use".
- Step 4 is **400** with field-level details.
- Step 5 asks first, and the standing flips both ways.

### TC-AR-030 · P1 · Negative — Posting a Session refuses an empty form and an end before its start

**Preconditions:** admin on `/admin/sessions/new`.

**Steps:**
1. Submit the empty form.
2. Fill it validly but set Start `20:00` and End `18:00`; submit.
3. Set them equal; submit.
4. Fill it validly and submit.
5. Re-read the Sessions register after each of steps 1–3.

**Expected result:**

- Step 1 shows inline required-field errors and creates nothing.
- Steps 2 and 3 show the inline message **"End time must be after start time"**
  and create nothing — equal times are refused too.
- Step 4 creates the Session, which appears in the register as **Scheduled** at
  `0/max`.
- The register's row count is unchanged after each refusal. A refused post that
  wrote a row anyway is the failure this case exists to catch.

### TC-AR-031 · P1 · Edge — A search that matches nothing says so in the register's own words

**Preconditions:** admin on `/admin/sessions`, and on `/admin/payments` and
`/admin/members`.

**Steps:**
1. Search `zzzznonexistent` on each register.
2. Read the register's body and the sentence in it.
3. Clear the search and read the body again.

**Expected result:**

- Each register draws its **empty row** inside the same frame and the same rules
  — the register's own empty state, with its mark and its sentence, never a card
  and never a bare table.
- The sentence distinguishes **"nothing matches your search"** from **"there is
  nothing here yet"**: two different facts, and telling an Admin the wrong one
  sends them to create a row that already exists.
- Clearing the search restores the rows.

### TC-AR-032 · P1 · Negative — Community settings save, and an empty community name is refused

**Preconditions:** admin on `/admin/settings`. Note the stored community name
first, and restore it at the end.

**Steps:**
1. Read the page: the frame, the fieldsets, and the field treatment on each
   control.
2. Clear the Community Name and press Save.
3. `PATCH /api/settings` with `{ "communityName": "   " }`.
4. Save a new name and read the header and the browser title.
5. Restore the original name.

**Expected result:**

- The page is on the board's own treatment — one frame, ruled rows inside
  fieldsets, the shared field treatment on every control. It is not the one page
  left from the old product, and it renders **no card shell** at any width.
- Step 2 is blocked with **"Community name is required"** and the stored value is
  unchanged.
- Step 3 is **400**: the rule is the server's, and the form is the courtesy.
- Step 4 rebrands the app — header and title both.

### TC-AR-033 · P1 · Positive — The export routes are unchanged, localised, and carry all four attendance values

**Preconditions:** a Session carrying an Attendance row at **each** of
`REGISTERED`, `PRESENT`, `ABSENT` and `NO_SHOW`. An admin and the Owner.

**Steps:**
1. `GET /api/sessions/{id}/export` as the admin in `en`; read the header row and
   every status cell.
2. Switch the locale to `id` and re-export; read the header row.
3. `GET /api/payments/export?month=8&year=2026`; read the header row and the row
   count.
4. Repeat steps 1 and 3 signed in as the Owner, with the Owner holding a row on
   that Session.
5. Restore the fixture.

**Expected result:**

- The session export's header is
  `"No","Name","Email","WhatsApp","Status","Registered At"` in `en` and its
  Indonesian equivalent in `id` — the headers are localised, the data is not.
- Every status cell carries the **stored** value: `REGISTERED`, `PRESENT`,
  `ABSENT` and `NO_SHOW`, all four, spelled as the database spells them. The
  glossary rule that the stored `ABSENT` never surfaces as "Absent" is a rule
  about **user-facing copy**, not about a machine-readable export, and an export
  that translated its values would break whatever reads the file.
- The payments export's header and its row count are unchanged from before this
  spec.
- Step 4: for an **Admin**, the Owner's Email and WhatsApp cells are **empty**
  while the Owner's row is still written, with its status and timestamp
  unchanged. For the **Owner**, both cells carry their stored values.

### 18.5 Both locales, the keyboard, and both widths

### TC-AR-034 · P1 · Positive — No English leaks into any admin surface

**Preconditions:** `NEXT_LOCALE` set to `id`; every surface in §18.0's scope.

**Steps:**
1. Visit each surface in `id` and read every heading, column head, control,
   dialog, empty state, mark label and toast.
2. Read the accessible names of the controls, not only their visible text.
3. Compare each string against the `en` build and list every one that matches.
4. Read the four attendance marks and the Proof cells' captions in `id`.

**Expected result:**

- No English string anywhere. Column heads, the register captions, the empty
  rows, both payment dialogs, the untaken notice, the Owner's withheld cell, the
  reopen and cancel dialogs and every toast all switch.
- The marks switch: `No-Show` → **Tidak Hadir**, Opted Out → **Batal Ikut**,
  `Withheld` → **Dirahasiakan**, `No Proof` → **Tidak ada bukti**, `Failed to
  load` → **Gagal dimuat**.
- The only strings matching across locales are the community name, proper nouns,
  numerals, currency and the documented loanwords.
- No **metaphor word** from `CONTEXT.md` — board, tile, rail, lattice, register —
  appears in user-facing copy in either locale.

### TC-AR-035 · P1 · Positive — The queue is traversed and decided from the keyboard alone

**Preconditions:** admin on `/admin/payments`, at least three awaiting rows.

**Steps:**
1. Tab from the page heading into the register and record the order focus
   travels: filters, then each row's controls.
2. Read the focus indicator on each stop.
3. Open a Proof with Enter, close it with Escape, and read where focus went.
4. Reach a row's Confirm with Tab and press Enter; move through the dialog with
   Tab; cancel with Escape.
5. Press every single letter key over a focused row and read what happens.
6. Read `<tr>` for a `tabindex`.

**Expected result:**

- Focus travels in **plain DOM order**: the filter controls, then row by row, and
  within a row the Proof button, then Confirm, then Reject.
- Every stop carries a visible focus ring.
- Escape closes both the Proof dialog and a decision dialog, returning focus to
  the control that opened it.
- **No single-key shortcut does anything.** A one-key Confirm on a money row is a
  mis-press waiting to happen, and plain tab order already satisfies "no mouse".
- No `<tr>` carries a `tabindex`.

### TC-AR-036 · P0 · Positive — Every register is ruled at 1440 and collapses by axis at 390

**Preconditions:** each of `/admin/sessions`, `/admin/payments`,
`/admin/members`, `/admin/activities`, `/admin/applicants`,
`/admin/sessions/{id}/attendance` and `/admin/settings`.

**Steps:**
1. At **1440 × 900**, read each surface's frame, its row rules and its cell
   rules, and — on every register that carries a **standing column** — confirm
   its marks land on one shared edge. The Members register is the exception by
   design: its standing is one mark per monthly Membership inside the
   Memberships cell, so its marks are aligned to their own rows, not to a
   column edge.
2. Search each surface's markup for a card shell, a coloured swatch, an accent
   line and a `rounded-xl` container.
3. Resize to **390 × 844** and read the same surfaces: the `<thead>`, the inline
   cell labels, and `document.documentElement.scrollWidth`.
4. Read one row's controls at 390 and press one.
5. Read the Applicants surface's action vocabulary.

**Expected result:**

- At 1440 every register is one bounded frame of ruled rows — **1px** rules,
  tabular figures down the money columns, the standing mark in its own column on
  a shared edge, density rather than whitespace. Forty rows are readable without
  scrolling past furniture.
- **No admin surface renders a card shell, a coloured swatch or an accent line at
  any width.** The old mobile card shell and its field and empty-state companions
  are gone from the repository, not merely unused.
- At 390 each register **collapses by axis**: still ruled rows, each cell
  carrying its own column label above its value, the `<thead>` hidden, and
  `scrollWidth === 390` — the page never scrolls sideways.
- Every row control is reachable and pressable at 390.
- The Applicants surface says **Admit** and **Decline**, never Confirm or Reject.

### 18.6 Recorded run — 2026-08-29

Executed once against `main` at **`3370853`** (the merge of #98, the last register
ticket), on the §2 seed, on Next.js 16, at **1440 × 900** and **390 × 844**, in
**both locales**, and on **both board materials**. Every figure below is measured
— from the route's own response, from `getComputedStyle`, from
`performance.getEntriesByType('resource')`, or from the database — never from
what a screenshot looked like.

**The seed was left exactly as it was found.** Every fixture this run created was
removed and the state re-compared afterwards: 25 Sessions with **zero** diffs in
`maxPlayers`, seat-holding count or per-status breakdown; `Attendance` at
`REGISTERED 69 / PRESENT 38 / ABSENT 13 / MAYBE 3 / NO_SHOW 0`; `Payment` at
`PENDING 3 / CONFIRMED 40 / REJECTED 1`; the Owner holding no Attendance and no
Payment. The only residue is that rows the run touched carry a moved
`updatedAt` — a timestamp cannot be put back, and no case depends on one.

| Case | Priority | Result |
|---|---|---|
| TC-AR-001 | P0 | **Pass** — eight heads in order (`DATE, SESSION, ACTIVITY, LOCATION, CAPACITY, FLOOR, STATUS, ACTIONS`); cell rule **1px solid `rgb(119,131,127)`**; `scrollWidth === 1440`; capacity announced "7 of 24 seats held", floor "2 of 4 members committed · **Below floor**" and "**No floor**" where `minMembers = 0`; at 390 `<thead>` is `display: none`, every cell carries its own label, `scrollWidth === clientWidth === 390`; no `<tr>` carries `tabindex` |
| TC-AR-002 | P0 | **Pass** — Strike mark, `text-decoration: line-through` on the **mark's own label**; the title span recedes to `rgb(84,97,91)` against `rgb(21,30,27)` on a Scheduled row and carries **no** line-through; the cancelled row offers `Take attendance, Edit, Detail, CSV` and **no Cancel** |
| TC-AR-003 | P0 | **Pass** — Morning Drills `{ "fee": 26000 }` → **409** `FEE_LOCKED`, "This session already has a payment or a held seat, so its fee cannot be changed. Post a new session at the new fee instead."; stored `fee` unchanged at 25 000; the form's Fee input is `readOnly: true`, `disabled: false`, `bg rgb(232,235,234)` against the open fields' `rgb(247,249,248)`, `aria-describedby="session-fee-note"`; a clean sentinel Session took `{ "fee": 11000 }` at **200** |
| TC-AR-004 | P0 | **Pass** — `{ "maxPlayers": 6 }` against 7 held → **409** `CAPACITY_BELOW_HELD`, "Capacity cannot go below the 7 seats already held. Set it to 7 or higher, or release a seat first."; `{ "maxPlayers": 7 }` → **200**; the form's capacity input carries `min="7"`, `aria-describedby="session-capacity-note"` and is **not** read-only. **Step 3 (a lapsed hold lowering the floor) was not re-run** — carried from #69 and #94 |
| TC-AR-005 | P0 | **Pass** — on the Completed Friendly Match `{ "title" }` and `{ "status": "SCHEDULED" }` → **409** `SESSION_CLOSED`; `{ "notes" }` → **200**; a whole payload with every field at its stored value and only the notes changed → **200**; the form draws all eight fields `readOnly` with `aria-describedby="session-closed-note"` and the **status as an `<input readonly>` reading "Completed"**, never a disabled `<select>`; notes stays open |
| TC-AR-006 | P1 | **Pass** — Tab order `New Session → search → activity filter → Search → DATE/SESSION/LOCATION/STATUS heads → Take attendance, Edit, Detail, CSV, Cancel/Reopen`, each with a visible indicator; the Cancel dialog reads "Cancel Underbooked Friendly?" and states the consequence before it is confirmed; no `<tr>` `tabindex`. The two safe-area-inset bullets that stood here were a paste from `TC-MS-020` — the admin shell renders **no** fixed bottom rail (`0` elements at `position: fixed; bottom: 0`) — and were replaced |
| TC-AR-007 | P0 | **Pass** — Members register, Payments queue and attendance register all draw **Withheld** / **Dirahasiakan** to the Admin, and `row.innerHTML` carries the address on **none** of them; `GET /api/payments?userId=<owner>` and `GET /api/payments/{id}` both **200** with `email: null` and an unchanged key set; `?search=owner%40xclub.local` on the queue returns no row; as the Owner all four surfaces carry `owner@xclub.local` |
| TC-AR-008 | P0 | **Pass** — held Seat → **409** `SESSION_HAS_MONEY`; a live `PENDING` Payment on a Session with **no** held Seat → **409** `SESSION_HAS_MONEY`; a `COMPLETED` Session with nothing behind it → **409** `SESSION_CLOSED` with its **own** sentence, "This session is completed, so it is part of the record and cannot be deleted." (`id`: "Sesi ini sudah selesai, jadi sudah menjadi catatan dan tidak bisa dihapus.") — distinct from the PATCH sentence, as the case demands; a Cancelled Session with nothing behind it → **200** then **404**. No **500** anywhere. The **Delete Session** button is absent on the money-behind and Completed forms and present only on the Cancelled one |
| TC-AR-009 | P0 | **Pass** — a Cancelled Session dated 2026-08-31 offers **Reopen session**; Rained Out (Cancelled, 2026-08-24, past) and Friendly Match (Completed) offer neither Reopen nor Cancel; `{ "status": "SCHEDULED" }` on Rained Out → **409** `SESSION_PAST`; on the Completed Session → **409** `SESSION_CLOSED`; `{ "status": "SCHEDULED", "title": … }` → **409** `SESSION_CLOSED` and `{ "status": "SCHEDULED", "notes": "x" }` → **409** too; plain `{ "status": "SCHEDULED" }` → **200**; the Status control on a Cancelled Session's form is read-only, reading "Cancelled" |
| TC-AR-010 | P0 | **Pass** — **8 runs**, the two writes issued without awaiting the first, capacity reset to `n + 1 = 3` before each. `held ≤ maxPlayers` on **8 / 8**. Both orders were reached: runs 1–2 the reservation committed first → reserve **201**, capacity **unchanged at 3**, edit **409** `CAPACITY_BELOW_HELD`; runs 3–8 the edit committed first → edit **200**, capacity **2**, held **2**, the claim refused **409 "Session Full"** rather than seated over the new capacity. Exactly one write refused every run. No half-write: the reserving member ended the run with his three seeded Payments and no fourth — a hold creates no Payment row |
| TC-AR-011 | P2 | **Pass, with one assertion carried** — 20 loads of page 1 as Admin A with a Confirm by Admin B in flight on four Payments this run created. **Every load returned exactly 10 rows**; none short. The queue order held on 19 loads; on the one load where a Confirm committed between the id read and the row fetch, a row drew as decided in the position its awaiting standing had earned it — the tolerance the case now states, not a dropped or duplicated row. **The id-level "no id twice in one load" assertion could not be read from the page**: the register renders no row-identity attribute, so the only DOM key available (member + amount + standing) collides across the 40 identical seeded Payments. That assertion stands on #87's query-level verification |
| TC-AR-012 | P0 | **Pass** — census of all **25** Sessions before and after. `ABSENT → NO_SHOW` on a Completed Session: **200** `{"updated":1}` and **zero** change to any `maxPlayers` or any held count, anywhere. `REGISTERED → NO_SHOW` on Singles Ladder: that Session's held falls **5 → 4**, `max` unchanged at **8**, and **every other figure in the census is unchanged**. `NO_SHOW → ABSENT` back again: **zero** change — the two behave identically, which is the proof that `NO_SHOW` simply is not in the seat-holding pair rather than being adjusted out of it |
| TC-AR-013 | P0 | **Pass** — Yoga's Hold Lab row `REGISTERED → NO_SHOW`; his `SESSION` Payment `cmt1vyis4006m2kdfhvgin70f` came back **byte-identical**, `updatedAt` still `2026-08-20T19:00:42.772Z`, `status CONFIRMED`, `amount 25000`, `confirmedBy`/`confirmedAt` untouched; the Session's `fee` 25 000 and its own `updatedAt` unmoved; the other two rows on the Session unmoved; his own `/sessions` board draws **Hollow `NO-SHOW`** on Hold Lab and no money mark changed |
| TC-AR-014 | P0 | **Pass** — a `PENDING` `MONTHLY` Badminton August Payment for a member with four rows on four Badminton August Sessions, one at each value. Reject with no `notes` → **400** `REJECT_REASON_REQUIRED`; with `"   "` → **400**; the fixture unchanged after both. Reject with a reason → **200**. The `REGISTERED` row `cmte9njqm0000acdfyrqysll2` is **gone**; `NO_SHOW cmte9njr20001acdfumkml5u9`, `PRESENT cmte9njr50002acdfp3d9a6k1` and `ABSENT cmte9njr80003acdf1yzfzbf8` all survive at their original statuses **and their original `updatedAt`** (`…19.550 / .553 / .556`) — untouched, not rewritten. Payment `REJECTED`, `notes` verbatim, `confirmedBy` the deciding admin. A second Reject → **409** "This payment has already been reviewed." This is also the re-run of `TC-MS-017`'s database assertion, on a fixture this run owned |
| TC-AR-015 | P0 | **Pass** — the Tennis card's attendance rate, watched across four states. One `NO_SHOW` + one `ABSENT` in the month → **69 %** (9/13). The `ABSENT` row moved to `NO_SHOW` → **69 %**, unchanged. The other row moved back from `NO_SHOW` to `ABSENT` → **69 %**, unchanged. One row taken out of history altogether (back to `REGISTERED`) → **75 %** (9/12). A denominator on two states would have read 75 % throughout and moved on every flip; it read 69 % with a No-Show present and never moved between the three |
| TC-AR-016 | P0 | **Pass** — Singles Ladder, ended 2026-08-27, five rows all `REGISTERED`. Every Recorded cell reads Ink `REGISTERED`, none Hollow. The notice renders verbatim — "This session has ended and no attendance has been recorded. Everyone here is still Registered — nobody becomes a No-Show until you record one." — and the form points at it with `aria-describedby="attendance-untaken"`. Save is `disabled`, the counter reads "Nothing changed yet", and `{ "rows": [] }` against the route is **400** `ROWS_EMPTY`. Opening and reloading the register left all five rows at the same status **and the same `updatedAt`** |
| TC-AR-017 | P0 | **Pass** — two rows changed → **200** `{"updated":2}`; exactly those two moved status and `updatedAt`, and the other three kept theirs to the millisecond (`2026-08-20T19:00:42.685Z`, `.688Z`, and `2026-08-29T10:54:22.366Z`). All five rows resent at their stored values → **200** `{"updated":0}` and **no** timestamp moved. **Mark All Present** on a register holding 2 × `REGISTERED`, 1 × `PRESENT`, 1 × `NO_SHOW`, 1 × `ABSENT` moved **only the two Registered rows** — counter "2 changed" — and left the No-Show and Opted Out rows alone; on a register with no Registered row it moved nothing and Save stayed disabled. Neither prefill wrote anything |
| TC-AR-018 | P0 | **Pass** — a valid row followed by `"status": "MAYBE"` → **400** `{"error":"Invalid payload","reason":"ROW_INVALID"}` and **the valid row was not written either**. Then `USER_NOT_ON_SESSION`, `DUPLICATE_USER`, `ROWS_EMPTY`, `ROWS_MISSING`, each **400**; an unknown Session id **404**; the same payload as a member **403**. All five rows on the Session came back with their statuses **and `updatedAt` identical** after every one |
| TC-AR-019 | P0 | **Pass** — reached through real flows on one Session: a member claimed a Seat and withdrew (`DELETE /api/sessions/{id}/attendance` → **200** `{"isForfeited":true}`) storing **`ABSENT`**; an Admin recorded another member as **`NO_SHOW`** through the bulk route. Erased measured `border 1px solid rgba(0,0,0,0)` over `bg rgb(232,235,234)`, label **OPTED OUT / BATAL IKUT**; Hollow measured `border 2px dashed rgb(166,47,38)` over `bg rgba(0,0,0,0)`, label **NO-SHOW / TIDAK HADIR** — fill versus no fill, so the two differ with hue discarded. The word **"Absent" appears nowhere** on the surface in either locale |
| TC-AR-020 | P0 | **Pass** — page 1: three Tape `IN REVIEW` rows, then a Strike `REJECTED` row, then six Ink `CONFIRMED`; page 2 all decided. Heading "Confirm or reject payment proofs · **3 waiting for a decision**". A Rejected Payment sits with the decided group and carries Strike, not Tape. An explicit column sort wins and the register offers **Back to the queue order** to get out of it |
| TC-AR-021 | P1 | **Pass** — `?activityId=<Basket>`, 6 rows all Ink and none awaiting → heading "…· **nothing is waiting for a decision**". `?status=CONFIRMED` → the sentence is **absent**, which is correct and is now what the case asks for: under a standing filter the count is structurally zero and the sentence would be a lie about Payments that are still waiting. A filter matching nothing → the register's own empty row, Blank mark **EMPTY** |
| TC-AR-022 | P0 | **Pass** — three cells measured at 48 × 64px each. Image: a real `<button>`, `border 1px solid rgb(119,131,127)`, `bg rgb(232,235,234)`, `aria-label` "Open the Proof from Adi Pratama". No Proof: `border 1px **dashed**`, `bg rgba(0,0,0,0)` — no fill — caption "No Proof" in Secondary Ink. Failed to load: `border 1px **solid**`, `bg rgb(232,235,234)`, caption "Failed to load" in `rgb(166,47,38)`. **Zero `[data-mark]` in the Proof column** on all three. The page rendered with a Payment carrying an unlisted-host Proof URL present — #88's regression net holds |
| TC-AR-023 | P1 | **Pass on the mechanism; the ratio carried** — 40 rows each carrying a storage-hosted Proof. The browser requested **`/_next/image?url=…&w=48&q=75`**, `currentSrc` at `devicePixelRatio 1`, **transferSize 444 B / encodedBodySize 144 B**, and **not one request for the original object**. The 40 identical URLs deduplicate to a single request, so the queue's whole image weight at 40 rows was **444 B**. The `srcset` offers 32w…3840w and the browser picked 48w, which is the box. **The ratio against a realistic Proof was not re-measured**: the seed's only storage-hosted Proof is itself **144 B**, so there is nothing to shrink. Wave 2's purpose-uploaded **1,083,388 B** object measured **1,392 B at `w=48`** and **5,787 B at `w=96`** — 0.13 % and 0.53 % — and that is the figure this clause still rests on |
| TC-AR-024 | P0 | **Pass** — a `MONTHLY` Payment of Rp 60.000 against Badminton Dues of Rp 75.000. The dialog restates member, Activity, Billing Period and amount, and carries "**This is less than the current Dues of Rp 75.000. You can still Confirm.**" with the Confirm button pointing at it through `aria-describedby`. Confirm is **not** disabled. Escape closed the dialog and wrote nothing. Confirming anyway → **200**, `status CONFIRMED`: it warns, it never blocks |
| TC-AR-025 | P0 | **Pass** — Reject on the monthly Payment with an empty reason and then with `"   "` was refused **in the dialog**, with `role="alert"` carrying "No reason given. Write why you are rejecting this payment — the member sees it." and `aria-invalid="true"` on the textarea; the button stayed enabled both times. The Seat sentence reads "Every seat this member is Registered for in **Badminton** sessions in **August 2026** is released. Seats they attended or opted out of are untouched." and the Reject button points at it. On a **per-Session** Payment that sentence is **absent** and `aria-describedby` is null. At the route, `{ "status": "REJECTED" }` and `{ "notes": "   " }` are both **400** `REJECT_REASON_REQUIRED`; with a reason, **200** and `notes` stored verbatim |
| TC-AR-026 | P0 | **Pass** — after the Admin's Confirm the member's `/payments` reads Ink **PAID** on the dues card and Ink **CONFIRMED** on the history row. After the Reject it reads Blank **PENDING** with a **Pay now** route back, and the history row carries Strike **REJECTED**, "Rejection reason: amount short of the August dues", the refund guidance and the WhatsApp link |
| TC-AR-027 | P0 | **Pass** — the Owner's row carries **no** promote, demote or edit control (only the name link), the sentence "**This account cannot be changed.**", the role as the tracked-caps label `OWNER`, and Contact **Withheld**. `PATCH /api/users { role: "MEMBER" }` on the Owner as an Admin → **403** "Cannot modify an OWNER account"; `{ isActive: false }` → **403** likewise. As the Owner themselves the self-demotion guard answers first — **400** "Cannot demote yourself" — and the account is still not modified. As the Owner the same row shows `owner@xclub.local` and `6281200000000`, and is still immutable |
| TC-AR-028 | **P1** | **Fail — see [#102](https://github.com/jefrykurniaone/net-c-management/issues/102)**. Everything else held: columns `NAME, CONTACT, ROLE, MEMBERSHIPS, ACTIONS`; standing per monthly Membership as Ink `CONFIRMED`, Tape `IN REVIEW` and Blank `PENDING` (all three observed); a **per-Session** Membership carries **no standing mark at all**, only "Per session"; a Membership with no mode reads "Not chosen"; promote → **200** `ADMIN`, demote → **200** `MEMBER`; the detail page carries **PRESENT / OPTED OUT / NO-SHOW** count columns (Yoga 0 / 0 / **1**) and an attendance history row at the Hollow mark, and the register carries **no** No-Show column. **The failing clause is the incomplete profile**: `newbie@xclub.local` carries no marker, because `admin.profileIncomplete` stands in for a *missing name* rather than reporting `isProfileComplete` |
| TC-AR-029 | P1 | **Pass** — the New Activity and Edit Activity dialogs carry **0** `input[type=color]`, **0** fields named for a colour or an icon, **0** inline `background` styles and no mention of either word; the register draws the initial tile and no swatch. `POST /api/activities` with an existing slug → **409** "That slug is already in use"; without `minMembers` / `maxPlayers` → **400** with field-level details. The register carries Dues, Fee, Modes, Weekly slot, Capacity, Floor and Bank together |
| TC-AR-030 | P1 | **Pass** — empty body → **400** listing all eight missing fields; `20:00`→`18:00` → **400** "End time must be after start time"; equal times → the same **400**; a valid post → **201**, Scheduled at `0/8`. The register's row count was unchanged after each refusal |
| TC-AR-031 | **P1** | **Fail — see [#101](https://github.com/jefrykurniaone/net-c-management/issues/101)**. All three registers draw the register's own empty row with the Blank **EMPTY** mark inside the same frame, and clearing the search restores the rows. `/admin/sessions` distinguishes the two facts — "**No sessions match your search.**" — and `/admin/payments` ("No payments found.") and `/admin/members` ("No members found.") do not |
| TC-AR-032 | P1 | **Pass** — three `<fieldset>`s (BASIC INFO / ADMIN CONTACT / PAYMENT & FEES) on the shared field treatment: `border-radius 2px`, `border 1px solid rgb(119,131,127)`, `padding 10px`, `bg rgb(247,249,248)`. **Zero** `.rounded-xl` or `.bg-card` inside `<main>`, at 1440 and at 390, `scrollWidth === 390`. `PATCH /api/settings { "communityName": "" }` and `{ "   " }` → **400** "Community name is required". A rename took **200** and the sidebar rebranded to "T73 Rename Probe" with its own initials tile; restored to "XClub Community". The browser `<title>` on this route is the section name, "Community", not the community's — the header is what rebrands |
| TC-AR-033 | P1 | **Pass** — the session export carries `"No","Name","Email","WhatsApp","Status","Registered At"` in `en` and `"No","Nama","Email","WhatsApp","Status","Waktu Daftar"` in `id`, with the **data unchanged** between them; the five status cells read `REGISTERED`, `REGISTERED`, `NO_SHOW`, `PRESENT`, `ABSENT` — all four stored values, spelled as the database spells them. The payments export header is unchanged. On a Session the Owner holds a Seat on, the Admin's export writes the Owner's row with **empty** Email and WhatsApp cells and an unchanged status and timestamp; the Owner's own export carries both values |
| TC-AR-034 | P1 | **Pass** — all seven surfaces in `id`. Column heads (`TANGGAL, SESI, AKTIVITAS, LOKASI, KAPASITAS, BATAS MINIMUM, STATUS, AKSI`; `ANGGOTA, AKTIVITAS, BUKTI, JUMLAH, PERIODE TAGIHAN, STATUS, DIKIRIM, AKSI`; …), controls (`Buat Sesi, Catat kehadiran, Buka kembali sesi, Batalkan sesi, Konfirmasi, Tolak, Terima, Non-aktifkan, Jadikan Admin, Simpan Pengaturan`), marks (`DIBATALKAN, DITINJAU, LUNAS, TIDAK HADIR, BATAL IKUT, TERDAFTAR, HADIR`), the withheld cell (`Dirahasiakan`), the Proof cells (`Tidak ada bukti`, `Gagal dimuat`), the accessible names (`Buka bukti dari Adi Pratama`) and the routes' own refusal sentences all switch. The only cross-locale matches are the community name, seeded proper nouns, numerals, currency and three documented loanwords that are dictionary values in both blocks — `edit`, `filterBtn` and `status`. No metaphor word — board, tile, rail, lattice, register — appears in either locale. One vocabulary note, not a failure: Decline and Reject both render **Tolak**, where English keeps Decline and Reject apart |
| TC-AR-035 | P1 | **Pass** — focus travels `EXPORT CSV → search → month → year → status → activity → Filter → the four sortable heads → row 1's Confirm, Reject → row 2's Proof button`, i.e. plain DOM order with the Proof button first on any row that has one. Every stop carries an indicator (a `box-shadow` ring on the controls, the ring-coloured `outline` on the sort heads). Escape closes both the Proof dialog and a decision dialog. Pressing `c`, `r`, `y` and `n` over a focused row opened nothing and changed nothing. No `<tr>` `tabindex` |
| TC-AR-036 | P0 | **Pass** — swept at **1440 × 900** and **390 × 844**, in both locales and on both materials, across `/admin/sessions`, `/admin/payments`, `/admin/members`, `/admin/activities`, `/admin/applicants`, an attendance register and `/admin/settings`: **`rounded-xl` 0, `rounded-2xl` 0, `border-l-4` 0, `input[type=color]` 0** on every one. Cell rule 1px solid `rgb(119,131,127)` on enamel and `rgb(122,137,129)` on the painted board (`body` at `rgb(27,38,33)`). Standing marks share one edge where there is a standing column (Sessions 1059–1060, Payments 1048–1054). At 390 every `<thead>` is `display: none`, every cell carries its own label, `scrollWidth === 390`, and every row control is pressable. Applicants says **Terima / Tolak** — Admit / Decline, never Confirm / Reject. The `bg-card` matches inside `<main>` are the shared `Badge` and `Button` token variants, not shells |

**Summary.** 36 cases — 11 carried from waves 3 and 4, **25 written by this
ticket**. **36 executed, 34 Pass, 2 Fail, 0 Not run.** Both failures are **P1**
and both are filed: [#101](https://github.com/jefrykurniaone/net-c-management/issues/101)
and [#102](https://github.com/jefrykurniaone/net-c-management/issues/102).
**Every P0 case passes.** A third defect found by the sweep rather than by a case
is filed as [#103](https://github.com/jefrykurniaone/net-c-management/issues/103).

**The database assertions, and what proved them.**

| Claim | Proof |
|---|---|
| A No-Show leaves capacity alone | A census of all 25 Sessions' `maxPlayers` and seat-holding counts, taken before and after each write and diffed field by field. `ABSENT → NO_SHOW`: **0 diffs**. `NO_SHOW → ABSENT`: **0 diffs**. `REGISTERED → NO_SHOW`: exactly one Session, held **5 → 4**, `max` unchanged, every other row identical |
| A monthly Reject removes only Registered rows | Four rows on four Badminton August Sessions for one member, one at each value, read by id before and after. `REGISTERED` deleted; `NO_SHOW`, `PRESENT` and `ABSENT` present at their original statuses **and their original `updatedAt`** |
| A No-Show touches no money | The paired `SESSION` Payment re-read in full: every field including `updatedAt` identical. The Session's `fee` and `updatedAt` identical |
| A bulk save writes only touched rows | Every row's `status` and `updatedAt` before and after. Two changed rows moved; three did not, to the millisecond. A five-row payload at stored values returned `{"updated":0}` and moved nothing |
| Admin aggregates count three historical states | The Tennis attendance rate held at **69 %** across an `ABSENT ↔ NO_SHOW` flip and moved to **75 %** only when a row left history altogether |
| The queue's page is one snapshot | 20 loads, each exactly 10 rows, with a Confirm in flight on four of them |
| The seed is unchanged | 25 Sessions, 0 census diffs; `Attendance` 69 / 38 / 13 / 3 / **0 NO_SHOW**; `Payment` 3 / 40 / 1; Owner holds no Attendance and no Payment |

**Fixtures created and removed.** All of them, through
`.claude/scratch/t73-probe.ts` (git-ignored, alongside the harness the earlier
waves left): four sentinel Sessions (`T73 Sentinel A…E`), the Attendance rows on
them, one monthly Payment with four paired Attendance rows for the reject case,
four awaiting Payments for the snapshot case, forty Payments carrying one Proof
for the weight case, one Payment with a dead Proof URL, and the Owner fixture
from `probe-owner-seed.ts`. Every one removed, and the state re-compared above.

**Regression net — the existing suites, re-run.**

| Area | Result |
|---|---|
| §7 Session management (admin) — 1–11 | **Retired into `TC-AR-*` and re-run there in full.** Every item is executed above: list and filter (`TC-AR-001`, `TC-AR-036`), filtered empty state (`TC-AR-031`, which is where it failed), create validation (`TC-AR-030`), locked fields (`TC-AR-003`…`005`), attendance (`TC-AR-017`, `TC-AR-019` — now on its own register), localised CSV (`TC-AR-033`), delete (`TC-AR-008`) |
| §8 Payment review (admin) — 1–6 | **Retired into `TC-AR-*` and re-run there in full**: `TC-AR-020`, `TC-AR-021`, `TC-AR-024`, `TC-AR-025`, `TC-AR-026`, `TC-AR-033`. §8.4's "Reject button disabled until a reason is typed" is superseded: the reason is now refused **with a message** and the button stays enabled, which is the better answer and is what `TC-AR-025` asserts |
| §9–§11 Activities, Members, Settings | **Retired into `TC-AR-029`, `TC-AR-028` and `TC-AR-032`**, all executed above |
| §12 Member — dashboard & sessions | **Spot re-run, pass.** The guards are exact: attendance on the ONGOING Session → **403** "RSVP closed"; on the CANCELLED Session → **400** "Session is cancelled"; a member calling `POST /api/activities` → **403**. §12.5's full-Session refusal now answers **403 "RSVP closed"** rather than **409 "Session Full"**, because the seeded full Session's day has passed relative to real today and the window guard runs first — the capacity refusal itself was exercised live in `TC-AR-010` |
| §13 Member — payments & profile | **Spot re-run, pass.** `/payments` reads Tape `IN REVIEW` on Badminton, Ink `PAID` on Basket / Futsal / Tennis, Ink `CONFIRMED` and Strike `REJECTED` in the history, and no unpaid banner while a Proof is in review |
| §16 Design system — `TC-DS-*` | **Not re-executed as a suite.** `TC-AR-019`, `TC-AR-022` and `TC-AR-036` re-measured the mark forms and the field treatment on both materials and matched; a full re-run is still owed |
| §17 Member surfaces — `TC-MS-*` | **Not re-executed as a suite.** `TC-MS-017`'s database assertion was re-run as `TC-AR-014` on a fixture this ticket owned, and `TC-MS-021`'s Hollow producer was re-observed on the member board in `TC-AR-013` |

**Not met.**

- **`TC-AR-011`'s id-level assertion.** The register renders no row-identity
  attribute, so "no id appears twice within one load" cannot be read from the
  page. Row count, order and standing were all checked; the id assertion rests on
  #87's query-level verification. Worth an attribute on the row.
- **`TC-AR-023`'s weight ratio.** Re-measured as a mechanism and as an absolute
  (444 B for a 40-row queue, `w=48`), but not as a ratio: the seed's only
  storage-hosted Proof is a 144-byte placeholder. Wave 2's figure stands.
- **`TC-AR-004` step 3.** A capacity floor lowered by a lapsed hold was not
  re-run; #69 and #94 hold it.
- **SonarLint has still been consulted on no ticket in this spec.**
  `mcp__ide__getDiagnostics` is not resolvable in this environment, for this
  executor either. `tsc --noEmit` through `next build`, plus ESLint at zero
  warnings, stood in — as they did in every earlier wave. This remains the one
  acceptance criterion of the map that no wave has satisfied.
- **Two case texts were corrected during the run, not softened.** `TC-AR-021`
  now asks for the sentence to be **absent** under an explicit standing filter,
  because suppressing it there is right and the original precondition was wrong.
  `TC-AR-011` now states the one-load standing skew the two-read page design
  permits. `TC-AR-006` lost two bullets pasted from `TC-MS-020` about a bottom
  rail this shell does not render. Each is noted in place.

#### Addendum — 2026-08-29, after the follow-up map (#105)

The three defects the run filed — [#101](https://github.com/jefrykurniaone/net-c-management/issues/101),
[#102](https://github.com/jefrykurniaone/net-c-management/issues/102) and
[#103](https://github.com/jefrykurniaone/net-c-management/issues/103) — merged
into `main` as `17c65af`, `532f0f6` and `e1005bd` (PRs #118, #119, #120). The two
failing cases were re-run against `main` at **`e1005bd`**, as
`admin@xclub.local`, at **1440 × 900** and **390 × 844**, in **both locales**,
through Playwright against the dev server; the `TC-AR-036` sweep was extended to
the two Session forms and the dashboard, which the original sweep did not cover.
The seed was left as found: the one fixture (a seeded member's name set to null
to prove the two Members conditions independent) was restored and re-read.

| Case | Priority | Result |
|---|---|---|
| TC-AR-031 | P1 | **Pass** — `?search=zzzznonexistent` on `/admin/payments`, `/admin/members` and `/admin/activities` draws the register's own empty row with the Blank **EMPTY** mark and now says **"No payments match your search."**, **"No members match your search."**, **"No activities match your search."** (`id`: "Tidak ada pembayaran / anggota / aktivitas yang cocok dengan pencarian."); the "found" / "yet" sentence is absent on each. A status-plus-month filter on Payments and an Activity filter on Members also say "match". Sort and page-size parameters alone (`?sort=amount&dir=asc&pageSize=10`, `?sort=name&dir=desc`) render the rows and neither sentence. `/admin/sessions` unchanged; `/admin/applicants` keeps its single sentence, having no filter |
| TC-AR-028 | P1 | **Pass** — the incomplete-profile clause now holds. `newbie@xclub.local` carries **"Profile Incomplete" / "Profil Belum Lengkap"** beneath the name link as a tracked-caps label (`11px`, `letter-spacing 1.1px`, `uppercase`, weight 700, `rgb(84,97,91)`), with **zero** `[data-mark]` in the cell — a label, not one of the six marks; it is the only row of 30 that carries it. At 390 the label's box lies inside the row, `<thead>` is `display: none`, `scrollWidth === 390`. **Independence proved on a fixture:** with `member6@xclub.local`'s name set to null and `isProfileComplete` true, that row read **"(Not set)"** and **no** label while the `newbie` row read its name **and** the label; restored afterwards. Everything else in the case stands as recorded above |
| TC-AR-036 (extended) | P0 | **Pass on the surfaces this map named** — `/admin`, `/admin/sessions/new` and `/admin/sessions/{id}/edit` at both widths: every named shell measures `border-radius 2px`, `1px solid rgb(119,131,127)`, `rgb(247,249,248)`, and `padding 16px` on the panels that hold content directly (the three dashboard frames carry none, because their rows pad themselves); `scrollWidth` 390 and 1440; `blue-*` **0** on every one. The Post-a-Session locking notice is two `<p>` at `15px` in `rgb(84,97,91)` with no icon and no colour, each tied by `aria-describedby` to its control (the Activity `combobox` trigger, `input[name=fee]`) and sitting directly beneath it; Tab from the back link lands on the trigger with `:focus-visible`, a Court Green border and a 2px offset ring. The edit form's `session-capacity-note` and `session-fee-note` are unchanged. Source sweep of `src/app/(admin)/` for `rounded-(xl\|lg\|2xl)` and a Tailwind hue on a container: **0** on containers and notices; the one hit is `text-green-600` on a dashboard sub-line inside a shell, listed on #103. **Two shells outside the sweep's path still render the old idiom on admin surfaces:** the stat strip's container (`src/components/ui/stat-card.tsx:71`, excluded by the map) and the share-Session card the edit form composes (`src/components/sessions/share-session-card.tsx:48`), filed as [#121](https://github.com/jefrykurniaone/net-c-management/issues/121). Both render at `2px` today because the token layer remaps `--radius-xl` |

**Summary after the addendum.** 36 cases, **36 Pass, 0 Fail, 0 Not run.**
Every P0 and P1 case passes. The "Not met" list above is unchanged by this
addendum except that `TC-AR-036`'s sweep now covers the forms and the dashboard;
SonarLint has still been consulted on no ticket.
